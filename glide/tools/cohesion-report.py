#!/usr/bin/env python3
"""Build W8 native-density desktop/phone pairs and comparison boards.
python glide/tools/cohesion-report.py BEFORE AFTER OUT [--surface welcome]
No UI pixels are painted over. Thumbnails are labelled presentation-only.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
from PIL import Image, ImageDraw

BG=(12,12,10)

def pair(desktop,phone,out):
    canvas=Image.new('RGB',(1472,947),BG)
    draw=ImageDraw.Draw(canvas)
    draw.text((8,8),'HEADLESS · 1060 x 596 | 412 x 915 · synthetic fixture · native-density panels',fill=(236,232,223))
    for p,x in [(desktop,0),(phone,1060)]:
        if p and p.exists():
            image=Image.open(p).convert('RGB')
            # Existing taste phone output is DPR 2. Preserve the original separately.
            if image.width > (1060 if x == 0 else 412):
                image.thumbnail((1060 if x==0 else 412,915))
            canvas.paste(image,(x,32))
    canvas.save(out)

def inventory(root):
    result={}
    for folder in ['nodes','intel']:
        for p in sorted((root/folder/'archive').glob('*-desktop.png')):
            result[p.stem.removesuffix('-desktop')]=(p,p.with_name(p.name.replace('-desktop','-phone')))
    for p in sorted((root/'council/archive').glob('desktop-*.png')):
        result['popup-'+p.stem.removeprefix('desktop-')]=(p,p.with_name(p.name.replace('desktop-','phone-')))
    for p in sorted((root/'glass/archive').glob('desktop-*.png')):
        result['glass-'+p.stem.removeprefix('desktop-')]=(p,p.with_name(p.name.replace('desktop-','phone-')))
    for name,file,phone in [('lanes','lanes/lanes.png','lanes/lanes-phone.png'),('taste','taste/after-desktop.png','taste/after-phone.png'),('theme-dash','theme/dash.png',None),('theme-auto-dark','theme/theme-a.png',None),('theme-auto-light','theme/theme-b.png',None)]:
        p=root/file
        if p.exists():result[name]=(p,root/phone if phone else None)
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('before');p.add_argument('after');p.add_argument('out');p.add_argument('--surface')
    a=p.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    before,after=inventory(Path(a.before)),inventory(Path(a.after))
    names=[a.surface] if a.surface else sorted(before.keys() & after.keys())
    rows=[];receipt=[]
    for name in names:
        old,new=before[name],after[name]
        for phase,files in [('before',old),('after',new)]:pair(*files,out/(name+'-'+phase+'.png'))
        receipt.append({'name':name,'before':[str(v) if v else None for v in old],'after':[str(v) if v else None for v in new]})
        thumbs=[]
        for phase in ['before','after']:
            img=Image.open(out/(name+'-'+phase+'.png'));img.thumbnail((736,474));thumbs.append(img)
        row=Image.new('RGB',(1472,506),BG);d=ImageDraw.Draw(row);d.text((8,8),name+' · BEFORE | AFTER · presentation thumbnails',fill=(236,232,223))
        for i,img in enumerate(thumbs):row.paste(img,(i*736,32))
        rows.append(row)
    sheet=Image.new('RGB',(1472,max(1,len(rows))*506),BG)
    for i,row in enumerate(rows):sheet.paste(row,(0,i*506))
    sheet.save(out/'sheet.png')
    (out/'index.html').write_text('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>W8 comparisons</title><style>body{margin:24px;background:#0c0c0a;color:#ece8df;font:16px system-ui}section{margin:32px 0}.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:16px}img{width:100%;height:auto}a{color:#d7b986}</style><h1>W8 · HEADLESS comparisons</h1><p>Working previews, not native Tern qualification or owner approval.</p>'+''.join('<section><h2>'+html.escape(name)+'</h2><div class="pair">'+''.join(f'<figure><figcaption>{phase}</figcaption><a href="{name}-{phase}.png"><img src="{name}-{phase}.png"></a></figure>' for phase in ['before','after'])+'</div></section>' for name in names))
    (out/'receipt.json').write_text(json.dumps({'surfaces':receipt,'sheet_sha256':hashlib.sha256((out/'sheet.png').read_bytes()).hexdigest()},indent=2))
    print(json.dumps({'surfaces':len(names),'sheet':str((out/'sheet.png').resolve())}))

if __name__=='__main__':main()
