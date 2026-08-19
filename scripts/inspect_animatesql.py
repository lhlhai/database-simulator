from pathlib import Path
import re
import requests
from bs4 import BeautifulSoup

base = 'https://animatesql.com'
html = Path('/home/ubuntu/browser_html/animatesql_com_page_1787170968995.html').read_text(encoding='utf-8', errors='ignore')
soup = BeautifulSoup(html, 'html.parser')
for tag in soup.find_all('script', src=True):
    url = base + tag['src']
    body = requests.get(url, timeout=30).text
    out = Path('/home/ubuntu/database-simulator/animatesql-main.js')
    out.write_text(body, encoding='utf-8')
    print('saved', url, len(body), 'bytes')
    for keyword in ['visualize', 'query', 'SELECT', 'animation', 'operator', 'join', 'WHERE', 'd3', 'cytoscape', 'monaco', 'ace']:
        hits = len(re.findall(re.escape(keyword), body, flags=re.I))
        if hits:
            print(keyword, hits)
for tag in soup.find_all('link', rel='stylesheet'):
    url = base + tag['href']
    body = requests.get(url, timeout=30).text
    Path('/home/ubuntu/database-simulator/animatesql-main.css').write_text(body, encoding='utf-8')
    print('saved', url, len(body), 'bytes')
