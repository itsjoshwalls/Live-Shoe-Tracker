#!/usr/bin/env python3
"""Test feedparser RSS feeds"""
import feedparser

feeds = [
    ('Sole Collector', 'https://solecollector.com/feed'),
    ('Hypebeast Sneakers', 'https://hypebeast.com/feed'),
    ('SneakerNews', 'https://sneakernews.com/feed/'),
]

for name, url in feeds:
    print(f"\nTesting {name}: {url}")
    feed = feedparser.parse(url)
    print(f"  Status: {feed.get('status', 'N/A')}")
    print(f"  Bozo: {feed.get('bozo', False)}")
    print(f"  Entries: {len(feed.get('entries', []))}")
    if hasattr(feed, 'feed') and hasattr(feed.feed, 'title'):
        print(f"  Title: {feed.feed.title}")
    if feed.get('entries'):
        print(f"  First entry: {feed.entries[0].get('title', 'N/A')[:60]}")
