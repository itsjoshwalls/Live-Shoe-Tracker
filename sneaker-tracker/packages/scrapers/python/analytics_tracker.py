"""
Google Analytics Event Tracker for Python Scrapers

Sends scraper events to Google Analytics 4 (GA4) for monitoring and analysis.
Features:
- Event tracking (scraper runs, errors, product counts)
- Session tracking
- Custom dimensions for source/brand filtering
- Batch event sending

Usage:
    from analytics_tracker import AnalyticsTracker
    
    tracker = AnalyticsTracker(measurement_id='G-XXXXXXXXXX', api_secret='your-secret')
    tracker.track_scraper_run(
        source='soleretriever',
        products_scraped=20,
        errors=0,
        duration_seconds=5.2
    )
"""

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logging.warning("requests library not available")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AnalyticsTracker:
    """Google Analytics 4 event tracker for Python scrapers."""
    
    # GA4 Measurement Protocol endpoint
    GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect"
    GA4_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect"
    
    def __init__(self, measurement_id: str = None, api_secret: str = None, 
                 client_id: str = None, debug: bool = False):
        """
        Initialize Analytics Tracker.
        
        Args:
            measurement_id: GA4 Measurement ID (format: G-XXXXXXXXXX)
            api_secret: GA4 Measurement Protocol API Secret
            client_id: Unique client identifier (defaults to machine-generated UUID)
            debug: Use debug endpoint for validation
        """
        if not REQUESTS_AVAILABLE:
            raise ImportError("requests library not installed")
        
        self.measurement_id = measurement_id or os.getenv('GA_MEASUREMENT_ID')
        self.api_secret = api_secret or os.getenv('GA_API_SECRET')
        self.debug = debug
        
        if not self.measurement_id or not self.api_secret:
            raise ValueError("measurement_id and api_secret required (or set GA_MEASUREMENT_ID and GA_API_SECRET env vars)")
        
        # Generate or load client ID (persistent identifier for this scraper instance)
        if client_id:
            self.client_id = client_id
        else:
            # Try to load from file, or generate new
            client_id_file = os.path.join(os.path.dirname(__file__), '.analytics_client_id')
            if os.path.exists(client_id_file):
                with open(client_id_file, 'r') as f:
                    self.client_id = f.read().strip()
            else:
                self.client_id = str(uuid.uuid4())
                try:
                    with open(client_id_file, 'w') as f:
                        f.write(self.client_id)
                except:
                    pass  # File write failed, not critical
        
        # Session tracking
        self.session_id = str(int(time.time() * 1000))  # Unix timestamp in milliseconds
        
        logger.info(f"Analytics initialized: {self.measurement_id} (client: {self.client_id[:8]}...)")
    
    def _send_event(self, event_name: str, event_params: Dict = None) -> bool:
        """
        Send event to GA4 via Measurement Protocol.
        
        Args:
            event_name: Event name (e.g., 'scraper_run', 'scraper_error')
            event_params: Event parameters dictionary
            
        Returns:
            True if successful, False otherwise
        """
        endpoint = self.GA4_DEBUG_ENDPOINT if self.debug else self.GA4_ENDPOINT
        
        # Build payload
        payload = {
            "client_id": self.client_id,
            "events": [
                {
                    "name": event_name,
                    "params": {
                        "session_id": self.session_id,
                        "engagement_time_msec": "100",  # Required for session tracking
                        **(event_params or {})
                    }
                }
            ]
        }
        
        # Add user properties (optional)
        payload["user_properties"] = {
            "scraper_environment": {
                "value": os.getenv('ENV', 'production')
            }
        }
        
        try:
            response = requests.post(
                endpoint,
                params={
                    "measurement_id": self.measurement_id,
                    "api_secret": self.api_secret
                },
                json=payload,
                timeout=10
            )
            
            if self.debug:
                # Debug endpoint returns validation messages
                debug_response = response.json()
                if debug_response.get('validationMessages'):
                    logger.warning(f"GA4 validation messages: {debug_response['validationMessages']}")
                else:
                    logger.debug("GA4 event validated successfully")
            
            if response.status_code == 204 or response.status_code == 200:
                logger.debug(f"Sent GA4 event: {event_name}")
                return True
            else:
                logger.error(f"GA4 event failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending GA4 event: {e}")
            return False
    
    def track_scraper_run(self, source: str, products_scraped: int = 0, 
                         errors: int = 0, duration_seconds: float = 0,
                         status: str = 'success', **kwargs) -> bool:
        """
        Track scraper run event.
        
        Args:
            source: Scraper source (e.g., 'soleretriever', 'sneakernews')
            products_scraped: Number of products successfully scraped
            errors: Number of errors encountered
            duration_seconds: Time taken to complete scrape
            status: Run status ('success', 'failed', 'partial')
            **kwargs: Additional custom parameters
            
        Returns:
            True if event sent successfully
        """
        event_params = {
            "source": source,
            "products_scraped": products_scraped,
            "errors": errors,
            "duration_seconds": round(duration_seconds, 2),
            "status": status,
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        
        return self._send_event("scraper_run", event_params)
    
    def track_scraper_error(self, source: str, error_type: str, 
                           error_message: str = None, **kwargs) -> bool:
        """
        Track scraper error event.
        
        Args:
            source: Scraper source
            error_type: Error type (e.g., 'network', 'parsing', 'database')
            error_message: Error message (truncated to 100 chars)
            **kwargs: Additional custom parameters
            
        Returns:
            True if event sent successfully
        """
        event_params = {
            "source": source,
            "error_type": error_type,
            "error_message": (error_message or '')[:100],  # Truncate for GA4 limits
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        
        return self._send_event("scraper_error", event_params)
    
    def track_product_saved(self, source: str, product_title: str = None,
                           brand: str = None, price: str = None, **kwargs) -> bool:
        """
        Track individual product saved event.
        
        Args:
            source: Scraper source
            product_title: Product title (truncated to 100 chars)
            brand: Product brand
            price: Product price
            **kwargs: Additional custom parameters
            
        Returns:
            True if event sent successfully
        """
        event_params = {
            "source": source,
            "product_title": (product_title or '')[:100],
            "brand": brand,
            "price": price,
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        
        return self._send_event("product_saved", event_params)
    
    def track_robots_blocked(self, source: str, url: str, **kwargs) -> bool:
        """
        Track robots.txt block event.
        
        Args:
            source: Scraper source
            url: Blocked URL
            **kwargs: Additional custom parameters
            
        Returns:
            True if event sent successfully
        """
        event_params = {
            "source": source,
            "url": url[:200],  # Truncate long URLs
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        
        return self._send_event("robots_blocked", event_params)
    
    def track_custom_event(self, event_name: str, **kwargs) -> bool:
        """
        Track custom event with arbitrary parameters.
        
        Args:
            event_name: Custom event name
            **kwargs: Event parameters
            
        Returns:
            True if event sent successfully
        """
        return self._send_event(event_name, kwargs)
    
    def send_batch_events(self, events: List[Dict[str, Any]]) -> bool:
        """
        Send multiple events in one request (up to 25 events per batch).
        
        Args:
            events: List of event dictionaries with 'name' and 'params' keys
            
        Returns:
            True if batch sent successfully
        """
        if len(events) > 25:
            logger.warning("GA4 allows max 25 events per batch, truncating")
            events = events[:25]
        
        endpoint = self.GA4_DEBUG_ENDPOINT if self.debug else self.GA4_ENDPOINT
        
        # Build batch payload
        formatted_events = []
        for event in events:
            formatted_events.append({
                "name": event.get('name', 'custom_event'),
                "params": {
                    "session_id": self.session_id,
                    "engagement_time_msec": "100",
                    **(event.get('params', {}))
                }
            })
        
        payload = {
            "client_id": self.client_id,
            "events": formatted_events
        }
        
        try:
            response = requests.post(
                endpoint,
                params={
                    "measurement_id": self.measurement_id,
                    "api_secret": self.api_secret
                },
                json=payload,
                timeout=10
            )
            
            if response.status_code == 204 or response.status_code == 200:
                logger.debug(f"Sent {len(formatted_events)} GA4 events in batch")
                return True
            else:
                logger.error(f"GA4 batch failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending GA4 batch: {e}")
            return False


class ScraperRunContext:
    """Context manager for tracking complete scraper runs."""
    
    def __init__(self, tracker: AnalyticsTracker, source: str, **kwargs):
        """
        Initialize run context.
        
        Args:
            tracker: AnalyticsTracker instance
            source: Scraper source name
            **kwargs: Additional event parameters
        """
        self.tracker = tracker
        self.source = source
        self.extra_params = kwargs
        self.start_time = None
        self.products_scraped = 0
        self.errors = 0
    
    def __enter__(self):
        """Start tracking run."""
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Send run completion event."""
        duration = time.time() - self.start_time
        status = 'success' if exc_type is None else 'failed'
        
        self.tracker.track_scraper_run(
            source=self.source,
            products_scraped=self.products_scraped,
            errors=self.errors,
            duration_seconds=duration,
            status=status,
            **self.extra_params
        )
        
        return False  # Don't suppress exceptions
    
    def increment_products(self, count: int = 1):
        """Increment products scraped counter."""
        self.products_scraped += count
    
    def increment_errors(self, count: int = 1):
        """Increment errors counter."""
        self.errors += count


if __name__ == '__main__':
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description='Analytics Tracker Test')
    parser.add_argument('--measurement-id', help='GA4 Measurement ID')
    parser.add_argument('--api-secret', help='GA4 API Secret')
    parser.add_argument('--debug', action='store_true', help='Use debug endpoint')
    parser.add_argument('--test-event', action='store_true', help='Send test event')
    parser.add_argument('--test-batch', action='store_true', help='Send test batch')
    
    args = parser.parse_args()
    
    # Initialize tracker
    tracker = AnalyticsTracker(
        measurement_id=args.measurement_id,
        api_secret=args.api_secret,
        debug=args.debug
    )
    
    if args.test_event:
        # Send test scraper run event
        success = tracker.track_scraper_run(
            source='test_scraper',
            products_scraped=42,
            errors=0,
            duration_seconds=5.2,
            status='success',
            collection='jordan'
        )
        print(f"Event sent: {success}")
    
    if args.test_batch:
        # Send batch of test events
        events = [
            {
                'name': 'scraper_run',
                'params': {'source': 'test1', 'products_scraped': 10}
            },
            {
                'name': 'scraper_run',
                'params': {'source': 'test2', 'products_scraped': 20}
            },
            {
                'name': 'scraper_error',
                'params': {'source': 'test3', 'error_type': 'network'}
            }
        ]
        success = tracker.send_batch_events(events)
        print(f"Batch sent: {success}")
    
    # Example with context manager
    print("\nExample with context manager:")
    with ScraperRunContext(tracker, 'example_scraper', collection='nike') as ctx:
        # Simulate scraping
        for i in range(5):
            ctx.increment_products()
            time.sleep(0.1)
        print("Scraping complete - event will be sent on exit")
