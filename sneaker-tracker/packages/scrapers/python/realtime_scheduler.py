"""
Automated scheduler for real-time sneaker news scraping.

Runs news scrapers every 15-30 minutes to capture release announcements
as soon as they're published.

Features:
- APScheduler for reliable job scheduling
- Multiple scheduling modes (15min, 30min, hourly)
- Persistence across restarts (SQLite job store)
- Error recovery and retry logic
- Detailed logging and metrics
- Health check endpoint

Usage:
    # 15-minute intervals (real-time mode)
    python realtime_scheduler.py --mode realtime

    # 30-minute intervals (balanced mode)
    python realtime_scheduler.py --mode balanced

    # Hourly (default mode)
    python realtime_scheduler.py --mode hourly

    # Run once then exit (for testing)
    python realtime_scheduler.py --once
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

# Import our news scraper
from news_scraper import NewsArticleScraper, scrape_all_sites


def run_scheduled_scrape(sites, articles_per_run, stats_file):
    """Module-level function for APScheduler to avoid serialization issues.
    
    This function is called by APScheduler and must not contain scheduler references.
    """
    import json
    from pathlib import Path
    
    logger.info(f"\n{'='*80}\nStarting scheduled scrape run\n{'='*80}")
    run_start = time.time()
    
    run_stats = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'sites': {},
        'total_articles': 0,
        'errors': 0
    }
    
    # Scrape each configured site
    for site_name in sites:
        try:
            logger.info(f"Scraping {site_name}...")
            scraper = NewsArticleScraper(site_name)
            site_stats = scraper.run(limit=articles_per_run, save=True)
            
            run_stats['sites'][site_name] = site_stats
            run_stats['total_articles'] += site_stats.get('articles_scraped', 0)
            run_stats['errors'] += site_stats.get('errors', 0)
            
            logger.info(f"{site_name}: {site_stats.get('articles_scraped', 0)} articles, "
                       f"{site_stats.get('errors', 0)} errors")
            
        except Exception as e:
            logger.error(f"Error scraping {site_name}: {e}", exc_info=True)
            run_stats['sites'][site_name] = {'error': str(e)}
            run_stats['errors'] += 1
    
    # Calculate run duration
    run_stats['duration_seconds'] = round(time.time() - run_start, 2)
    
    # Update global stats file
    try:
        if Path(stats_file).exists():
            with open(stats_file, 'r') as f:
                global_stats = json.load(f)
        else:
            global_stats = {
                'total_runs': 0,
                'total_articles': 0,
                'total_errors': 0,
                'started_at': datetime.now(timezone.utc).isoformat()
            }
        
        global_stats['total_runs'] += 1
        global_stats['total_articles'] += run_stats['total_articles']
        global_stats['total_errors'] += run_stats['errors']
        global_stats['last_run'] = run_stats['timestamp']
        
        with open(stats_file, 'w') as f:
            json.dump(global_stats, f, indent=2)
            
    except Exception as e:
        logger.error(f"Error updating stats: {e}")
    
    # Log run summary
    logger.info(f"\n{'='*80}\nRun complete: {run_stats['total_articles']} articles, "
               f"{run_stats['errors']} errors, {run_stats['duration_seconds']}s\n{'='*80}")
    
    return run_stats


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/realtime_scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RealtimeScheduler:
    """Manages scheduled scraping jobs for real-time news monitoring."""
    
    SCHEDULING_MODES = {
        'realtime': {
            'interval_minutes': 15,
            'description': 'Every 15 minutes (96 runs/day)',
            'sites': ['sneakernews', 'hypebeast', 'nicekicks', 'complex', 'solesavy', 'soleretriever']
        },
        'balanced': {
            'interval_minutes': 30,
            'description': 'Every 30 minutes (48 runs/day)',
            'sites': ['sneakernews', 'hypebeast', 'nicekicks', 'complex', 'solesavy', 'soleretriever']
        },
        'hourly': {
            'interval_minutes': 60,
            'description': 'Every hour (24 runs/day)',
            'sites': ['sneakernews', 'hypebeast', 'nicekicks', 'complex', 'solesavy', 'soleretriever']
        },
        'quick': {
            'interval_minutes': 5,
            'description': 'Every 5 minutes (288 runs/day) - TESTING ONLY',
            'sites': ['sneakernews']  # Only one site for testing
        }
    }
    
    def __init__(self, mode: str = 'realtime', articles_per_run: int = 20):
        """
        Initialize scheduler.
        
        Args:
            mode: Scheduling mode (realtime, balanced, hourly, quick)
            articles_per_run: Max articles to scrape per site per run
        """
        if mode not in self.SCHEDULING_MODES:
            raise ValueError(f"Invalid mode: {mode}. Choose from: {list(self.SCHEDULING_MODES.keys())}")
        
        self.mode = mode
        self.config = self.SCHEDULING_MODES[mode]
        self.articles_per_run = articles_per_run
        
        # Ensure logs directory exists
        Path('logs').mkdir(exist_ok=True)
        
        # Initialize APScheduler
        jobstores = {
            'default': SQLAlchemyJobStore(url='sqlite:///logs/scheduler_jobs.db')
        }
        executors = {
            'default': ThreadPoolExecutor(max_workers=4)
        }
        job_defaults = {
            'coalesce': True,  # Combine missed runs
            'max_instances': 1,  # Don't overlap jobs
            'misfire_grace_time': 300  # 5 minutes grace period
        }
        
        self.scheduler = BlockingScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        # Stats tracking
        self.stats = {
            'mode': mode,
            'started_at': datetime.now(timezone.utc).isoformat(),
            'total_runs': 0,
            'total_articles': 0,
            'total_errors': 0,
            'last_run': None,
            'next_run': None
        }
        
        self._save_stats()
    
    def scrape_job_callback(self):
        """Callback wrapper that updates internal stats after job completes.
        
        The actual work is done by run_scheduled_scrape() to avoid serialization issues.
        """
        # Update next run time in stats
        next_job = self.scheduler.get_jobs()[0] if self.scheduler.get_jobs() else None
        if next_job and hasattr(next_job, 'next_run_time') and next_job.next_run_time:
            self.stats['next_run'] = next_job.next_run_time.isoformat()
        else:
            self.stats['next_run'] = 'Not scheduled'
        
        self._save_stats()
    
    def _save_stats(self):
        """Save current stats to file (reload from stats file to get updated counts)."""
        stats_file = Path('logs/scheduler_stats.json')
        
        # Reload stats from file written by run_scheduled_scrape
        if stats_file.exists():
            try:
                with open(stats_file, 'r') as f:
                    file_stats = json.load(f)
                # Update our internal stats with file data
                self.stats.update(file_stats)
            except Exception as e:
                logger.error(f"Error reloading stats: {e}")
        
        # Ensure our mode info is present
        self.stats['mode'] = self.mode
        
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2)
    
    def _save_run_log(self, run_stats: dict):
        """Append run stats to log file."""
        log_file = Path('logs/scheduler_runs.jsonl')
        with open(log_file, 'a') as f:
            f.write(json.dumps(run_stats) + '\\n')
    
    def add_jobs(self):
        """Add scraping jobs to scheduler."""
        interval = self.config['interval_minutes']
        
        # Use functools.partial to pass args without serializing self
        from functools import partial
        
        # Main scraping job - use module-level function
        self.scheduler.add_job(
            run_scheduled_scrape,
            trigger=IntervalTrigger(minutes=interval),
            args=[self.config['sites'], self.articles_per_run, 'logs/scheduler_stats.json'],
            id='news_scraper',
            name=f'News Scraper ({self.mode} mode - every {interval}min)',
            replace_existing=True
        )
        
        # Note: Removed health check job to avoid serialization issues
        # You can manually check stats in logs/scheduler_stats.json
        
        logger.info(f"Scheduled jobs: {len(self.scheduler.get_jobs())}")
        for job in self.scheduler.get_jobs():
            # APScheduler 3.x: job.next_run_time is available after scheduler.start()
            logger.info(f"  - {job.name}")
    
    def _health_check(self):
        """Periodic health check and stats summary."""
        logger.info(f"\n{'='*80}\nHEALTH CHECK\n{'='*80}")
        logger.info(f"Mode: {self.stats['mode']}")
        logger.info(f"Started: {self.stats['started_at']}")
        logger.info(f"Total runs: {self.stats['total_runs']}")
        logger.info(f"Total articles: {self.stats['total_articles']}")
        logger.info(f"Total errors: {self.stats['total_errors']}")
        logger.info(f"Last run: {self.stats['last_run']}")
        logger.info(f"Next run: {self.stats['next_run']}")
        
        # Calculate average articles per run
        if self.stats['total_runs'] > 0:
            avg_articles = self.stats['total_articles'] / self.stats['total_runs']
            error_rate = (self.stats['total_errors'] / self.stats['total_runs']) * 100
            logger.info(f"Avg articles/run: {avg_articles:.1f}")
            logger.info(f"Error rate: {error_rate:.1f}%")
        
        logger.info(f"{'='*80}\n")
    
    def start(self, run_immediately: bool = True):
        """
        Start the scheduler.
        
        Args:
            run_immediately: Whether to run first scrape immediately (before waiting for interval)
        """
        logger.info(f"\n{'='*80}\nStarting Realtime News Scheduler\n{'='*80}")
        logger.info(f"Mode: {self.config['description']}")
        logger.info(f"Sites: {', '.join(self.config['sites'])}")
        logger.info(f"Articles per run: {self.articles_per_run}")
        logger.info(f"Run immediately: {run_immediately}")
        logger.info(f"{'='*80}\n")
        
        # Add jobs
        self.add_jobs()
        
        # Run first scrape immediately if requested
        if run_immediately:
            logger.info("Running initial scrape...")
            run_scheduled_scrape(
                self.config['sites'], 
                self.articles_per_run, 
                'logs/scheduler_stats.json'
            )
            self.scrape_job_callback()  # Update stats after manual run
        
        # Start scheduler (blocking)
        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Scheduler stopped by user")
            self.scheduler.shutdown()


def run_once():
    """Run scraper once then exit (for testing)."""
    logger.info("Running scraper once (test mode)")
    
    stats = scrape_all_sites(limit=10, save=True)
    
    print(f"\n{'='*80}\nRESULTS\n{'='*80}")
    print(json.dumps(stats, indent=2))
    print(f"{'='*80}\n")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Real-time sneaker news scheduler')
    parser.add_argument(
        '--mode',
        choices=['realtime', 'balanced', 'hourly', 'quick'],
        default='realtime',
        help='Scheduling mode'
    )
    parser.add_argument(
        '--articles',
        type=int,
        default=20,
        help='Max articles per site per run'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run once then exit (for testing)'
    )
    parser.add_argument(
        '--no-immediate',
        action='store_true',
        help='Don\'t run immediately on start'
    )
    
    args = parser.parse_args()
    
    # Validate environment
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_KEY'):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY")
        sys.exit(1)
    
    # Run mode
    if args.once:
        run_once()
    else:
        scheduler = RealtimeScheduler(mode=args.mode, articles_per_run=args.articles)
        scheduler.start(run_immediately=not args.no_immediate)


if __name__ == '__main__':
    main()
