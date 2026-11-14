#!/usr/bin/env python3
"""Run the W8 headless inventory serially, preserving real fixture HTML.

python glide/tools/cohesion-sweep.py OUT_DIR [--only nodes,council,...]
Requires Bun, frontend dependencies, esbuild, Python Playwright and Chrome.
This is fixture evidence, never a replacement for final native Tern stills.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]

def memory():
    for line in Path('/proc/meminfo').read_text().splitlines():
        if line.startswith('MemAvailable:'):
            return int(line.split()[1])
    raise RuntimeError('No MemAvailable value')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('out')
    parser.add_argument('--only', default='nodes,council,glass,intel,lanes,taste,theme')
    args=parser.parse_args()
    out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
    env=dict(os.environ)
    bin_dir=out/'bin';bin_dir.mkdir(exist_ok=True)
    chrome=bin_dir/'chromium'
    chrome.write_text('#!/bin/sh\nexec "'+os.sys.executable+'" "'+str(ROOT/'glide/tools/cohesion-browser.py')+'" "$@"\n')
    chrome.chmod(0o755)
    env['PATH']=str(bin_dir)+':'+env['PATH']
    env['GLIDE_CHROMIUM']=env.get('GLIDE_CHROMIUM','/usr/bin/google-chrome-stable')
    results=[]
    def run(cmd, name):
        deadline=time.monotonic()+45*60
        while memory()<4*1024*1024:
            if time.monotonic()>deadline:
                raise RuntimeError('Memory stayed below 4 GiB for 45 minutes')
            print('waiting for memory',memory(),flush=True);time.sleep(60)
        print(name,flush=True)
        log=out/(name+'.log')
        with log.open('w') as f:
            p=subprocess.run(cmd,cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT)
        results.append({'name':name,'command':cmd,'exit':p.returncode})
        (out/'commands.json').write_text(json.dumps(results,indent=2))
        if p.returncode:
            raise RuntimeError(f'{name} exit {p.returncode}: '+log.read_text()[-4000:])
    with open('/tmp/glide-studio-heavy.lock','w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        for name in args.only.split(','):
            folder=out/name;folder.mkdir(exist_ok=True)
            env['GLIDE_SHOT_ARCHIVE']=str(folder/'archive')
            if name=='nodes':
                options={'entryPoints':['glide/tools/cohesion-nodes.mjs'],'outfile':'frontend/dist/cohesion-nodes.mjs','bundle':True,'platform':'node','format':'esm','jsx':'automatic','jsxImportSource':'@stencil-hq/tern','nodePaths':['frontend/node_modules'],'banner':{'js':'import { createRequire } from "node:module"; const require=createRequire(import.meta.url);'}}
                build='import {build} from "./frontend/node_modules/esbuild/lib/main.js"; await build('+json.dumps(options)+')'
                run(['node','--input-type=module','-e',build], 'nodes-build')
                run(['node','frontend/dist/cohesion-nodes.mjs',str(folder)], 'nodes-html')
                for html in sorted(folder.glob('*.html')):
                    for size,w,h in [('desktop',1060,596),('phone',412,915)]:
                        run([str(chrome),f'--window-size={w},{h}',f'--screenshot={folder/(html.stem+"-"+size+".png")}',html.as_uri()],html.stem+'-'+size)
            else:
                script={'glass':'glass-demo'}.get(name,name)+'-shots.mts'
                destination=str(folder/(name+'.png')) if name=='lanes' else str(folder)
                run(['bun','glide/tools/'+script,destination],name)
                if name=='lanes':
                    source=folder/'archive/lanes.html'
                    run([str(chrome),'--window-size=412,915',f'--screenshot={folder/"lanes-phone.png"}',source.as_uri()],'lanes-phone')
    files=[]
    for image in sorted(out.glob('*/archive/*.png')):
        files.append({'path':str(image.relative_to(out)),'sha256':hashlib.sha256(image.read_bytes()).hexdigest()})
    sources={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for pattern in ['glide/frontend/*.ts','frontend/src/view/*.tsx','frontend/src/voice/cleanFocus.tsx','frontend/src/glideui/*.tsx'] for p in ROOT.glob(pattern)}
    (out/'receipt.json').write_text(json.dumps({'kind':'HEADLESS','synthetic':True,'native':False,'source_revision':env.get('GLIDE_SOURCE_SHA'),'sources':sources,'captures':files,'commands':results},indent=2))
    print(json.dumps({'captures':len(files),'out':str(out)}),flush=True)

if __name__=='__main__':
    main()
