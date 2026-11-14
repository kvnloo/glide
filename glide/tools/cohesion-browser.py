#!/usr/bin/env python3
"""Chromium CLI adapter for exact-size, headless W8 fixture captures.

Place a symlink named chromium to this file first on PATH. Existing shot
scripts remain the fixture producers. GLIDE_SHOT_ARCHIVE retains their HTML,
PNG and measured bounds even when the producer removes its temporary files.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright

MEASURE = """() => {
 const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height} };
 const leaves=[...document.querySelectorAll('body *')].filter(e => !['STYLE','SCRIPT'].includes(e.tagName) && [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
 return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},scrollWidth:document.documentElement.scrollWidth,
 texts:leaves.map(e=>{const s=getComputedStyle(e);return {text:e.textContent.trim().slice(0,160),role:e.dataset.role,rect:rect(e),ink:s.color,font:s.fontSize,background:s.backgroundColor,opacity:s.opacity,clipped:e.scrollWidth>e.clientWidth+1}}),
 boxes:[...document.querySelectorAll('main,[data-eui],.eu-card,[data-role],.tern-overlay')].map(e=>{const s=getComputedStyle(e);return {role:e.dataset.role,cls:e.className,rect:rect(e),background:s.backgroundColor,border:s.borderTopWidth+' '+s.borderTopColor,radius:s.borderRadius,shadow:s.boxShadow}})};
}"""

def main(args):
    url = next((a for a in args if a.startswith(('file://', 'http://127.0.0.1:'))), None)
    if url is None:
        raise ValueError('Expected a local fixture URL')
    def option(name, default):
        return next((a.split('=', 1)[1] for a in args if a.startswith(name+'=')), default)
    width, height = map(int, option('--window-size', '1060,596').split(','))
    if width == 1440:
        width, height = 1060, 596
    scale = float(option('--force-device-scale-factor', '1'))
    shot = option('--screenshot', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('GLIDE_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'])
        try:
            page = browser.new_page(viewport={'width':width,'height':height},device_scale_factor=scale)
            errors=[]
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url, wait_until='load')
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(1200)
            archive = os.environ.get('GLIDE_SHOT_ARCHIVE')
            if shot:
                page.screenshot(path=shot)
            if archive:
                out=Path(archive);out.mkdir(parents=True,exist_ok=True)
                key=Path(shot).stem if shot else Path(url).stem+'-metrics'
                # Keep relative URLs intact by retaining the source URL in the receipt.
                (out/(key+'.html')).write_text(page.content())
                receipt=page.evaluate(MEASURE)
                receipt.update({'source_url':url,'headless':True,'errors':errors})
                if shot:
                    data=Path(shot).read_bytes()
                    (out/(key+'.png')).write_bytes(data)
                    receipt['sha256']=hashlib.sha256(data).hexdigest()
                (out/(key+'.layout.json')).write_text(json.dumps(receipt,indent=2))
            if '--dump-dom' in args:
                print(page.content())
            if errors:
                raise RuntimeError('; '.join(errors))
        finally:
            browser.close()

if __name__ == '__main__':
    main(sys.argv[1:])
