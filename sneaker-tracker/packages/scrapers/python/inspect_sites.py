"""
Site Inspector - Analyze HTML structure of target websites
Helps identify correct CSS selectors for scrapers
"""

import requests
from bs4 import BeautifulSoup
import asyncio
from playwright.async_api import async_playwright

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async def inspect_with_playwright(url, name):
    """Inspect JavaScript-rendered site with Playwright"""
    print(f"\n{'='*60}")
    print(f"Inspecting {name} with Playwright...")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({'User-Agent': USER_AGENT})
        
        await page.goto(url, timeout=30000, wait_until='networkidle')
        await page.wait_for_timeout(2000)
        
        content = await page.content()
        await browser.close()
        
        soup = BeautifulSoup(content, 'lxml')
        
        # Find potential article/product containers
        containers = []
        for tag in ['article', 'div', 'section', 'a']:
            for cls in ['card', 'post', 'product', 'item', 'release']:
                elements = soup.find_all(tag, class_=lambda x: x and cls in str(x).lower())
                if elements:
                    containers.extend(elements[:3])
        
        print(f"Found {len(containers)} potential containers")
        
        for i, container in enumerate(containers[:5], 1):
            print(f"\n--- Container {i} ---")
            print(f"Tag: {container.name}")
            print(f"Classes: {container.get('class', [])}")
            
            # Find title
            title = container.find(['h1', 'h2', 'h3', 'h4'])
            if title:
                print(f"Title: {title.get_text(strip=True)[:80]}")
            
            # Find link
            link = container.find('a')
            if link:
                print(f"Link: {link.get('href', 'N/A')[:80]}")
            
            # Find image
            img = container.find('img')
            if img:
                print(f"Image: {img.get('src', img.get('data-src', 'N/A'))[:80]}")

def inspect_static(url, name):
    """Inspect static HTML site"""
    print(f"\n{'='*60}")
    print(f"Inspecting {name} (Static HTML)...")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        r = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=10)
        print(f"Status: {r.status_code}")
        
        soup = BeautifulSoup(r.content, 'lxml')
        
        # Check for links to sneaker pages
        sneaker_links = soup.find_all('a', href=lambda x: x and any(
            keyword in x.lower() for keyword in ['sneaker', 'release', 'product', 'jordan', 'nike']
        ))
        
        print(f"Found {len(sneaker_links)} sneaker-related links")
        
        # Analyze first few links
        for i, link in enumerate(sneaker_links[:5], 1):
            print(f"\n--- Link {i} ---")
            print(f"Classes: {link.get('class', [])}")
            print(f"Href: {link.get('href', 'N/A')[:80]}")
            
            # Check parent container
            parent = link.parent
            while parent and parent.name in ['span', 'strong', 'em']:
                parent = parent.parent
            
            if parent:
                print(f"Parent: <{parent.name}> with classes {parent.get('class', [])}")
                
                # Find siblings for context
                title = parent.find(['h1', 'h2', 'h3', 'h4'])
                if title:
                    print(f"Title: {title.get_text(strip=True)[:80]}")
                
                img = parent.find('img')
                if img:
                    print(f"Image: {img.get('src', img.get('data-src', 'N/A'))[:50]}")
        
    except Exception as e:
        print(f"Error: {e}")

async def main():
    """Inspect all target sites"""
    
    sites = [
        # JavaScript-rendered (need Playwright)
        {'url': 'https://sneakernews.com/release-dates/', 'name': 'Sneaker News', 'method': 'playwright'},
        {'url': 'https://hypebeast.com/footwear', 'name': 'Hypebeast', 'method': 'playwright'},
        
        # Static HTML (BeautifulSoup OK)
        {'url': 'https://www.soleretriever.com/sneaker-release-dates', 'name': 'Sole Retriever', 'method': 'static'},
        {'url': 'https://solesavy.com/news', 'name': 'SoleSavy', 'method': 'static'},
    ]
    
    for site in sites:
        if site['method'] == 'playwright':
            await inspect_with_playwright(site['url'], site['name'])
        else:
            inspect_static(site['url'], site['name'])
        
        await asyncio.sleep(2)  # Rate limiting

if __name__ == '__main__':
    asyncio.run(main())
