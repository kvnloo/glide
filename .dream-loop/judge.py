#!/usr/bin/env python3
"""Fresh subscription-lane, swapped image reviews. No API keys or paid API.
python .dream-loop/judge.py TARGET PARENT CANDIDATE OUTPUT_DIR [--calibration]
Each invocation preserves immutable anonymous images and binds verdicts to hashes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

PREFERENCES = '''Copy the omp GRAMMAR (layout, rhythm, restraint), keep Dash "Living Night" palette (black #0c0c0a, cream ink, ONE gold = the one action). Do not copy omp's light theme.
One card grammar: hairline 1px box, 8px radius, l1 fill, no shadow. Head row icon, verb in medium cream, muted argument. Content-sized bodies, no dead voids. Hanken and Plex Mono inside cards. Cormorant only for giant timer numerals and the end card. Gold only for one recommended action, never seat identity or decorative status. Focus and council read-aloud share a centered orb/caption stage. Glow only on the focus timer ring.
The owner rejected the oversized welcome portrait in a full-width card. The owner asked for omp's compact unboxed lockup and quiet tip. Keep the Hermes identity. Synthetic labels and host-owned chrome are not defects. Target palette may differ. Judge layout grammar, not palette copying.'''
CRITERIA = {'glanceable':20,'actionable':15,'density':15,'dash':15,'glass':10,'cohesion':10,'vocabulary':5,'motion':5,'phone':5}

def main():
    parser=argparse.ArgumentParser()
    for name in ['target','parent','candidate','out']:
        parser.add_argument(name)
    parser.add_argument('--calibration',action='store_true')
    parser.add_argument('--scope',default='Judge only the feature shown. The composer, window chrome, and controls outside this isolated fixture are host-owned and intentionally absent.')
    a=parser.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=False)
    target,parent,candidate=map(Path,[a.target,a.parent,a.candidate])
    hashes={k:hashlib.sha256(p.read_bytes()).hexdigest() for k,p in [('target',target),('parent',parent),('candidate',candidate)]}
    verdicts=[]
    for index,pair in enumerate([(parent,candidate),(candidate,parent)],1):
        trial=out/str(index);trial.mkdir()
        paths=[]
        for name,path in zip(['target','A','B'],[target,*pair]):
            local=(trial/(name+'.png')).resolve();shutil.copyfile(path,local);paths.append(local)
        prompt=f'''Do not use tools or read local files. Read only the three attached images in order TARGET, A, B. You are an independent harsh UI designer. The sides have no implied ranking.
{PREFERENCES}
Scope: {a.scope}
A static fixture can satisfy quiet motion by remaining quiet. Do not score intentionally absent animation as zero. Welcome is an unboxed identity and tip, not a tool card. Card radius, card footer and a gold button do not apply to welcome or a clean full-screen stage. A single clear invitation to ask or use slash commands is actionable for welcome. Typography and restraint can be judged, but do not claim interaction verification from pixels.
Score A and B on each weighted criterion, 0 to 5. Weights: {json.dumps(CRITERIA)}. Compute the weighted percentage as sum(score*weight)/5. Do not infer interactions or unreadable small text. For a contact sheet evaluate every labelled surface and flag the worst panels. Reject clipping, decorative color, inconsistent headings, and unrelated left edges. Report actual image dimensions when available. If A and B are identical, choose tie. If one is better on the target grammar without regression, choose it. Otherwise choose tie. This is not owner approval.
Return ONLY JSON: {{"winner":"A|B|tie","A":{{"scores":{{criterion:score}},"weighted":number}},"B":{{"scores":{{criterion:score}},"weighted":number}},"image_grounding":[three specific visible details],"defects_A":[strings],"defects_B":[strings],"cohesion":"one product|inconsistent|unverified","reason":"specific explanation"}}.'''
        (trial/'prompt.txt').write_text(prompt)
        cmd=['fx','ask','--model','gpt-6.1-sol','--effort','medium','--no-save']
        for image in paths:cmd+=['--image',str(image)]
        cmd+=['--',prompt]
        with (trial/'stdout.txt').open('w') as stdout,(trial/'stderr.txt').open('w') as stderr:
            p=subprocess.run(cmd,stdout=stdout,stderr=stderr,cwd=trial)
        raw=(trial/'stdout.txt').read_text().strip()
        data=None
        try:
            data=json.loads(raw.removeprefix('```json').removesuffix('```').strip())
        except ValueError:
            pass
        if p.returncode or not isinstance(data,dict) or data.get('winner') not in ['A','B','tie']:
            (trial/'receipt.json').write_text(json.dumps({'exit':p.returncode,'parsed':data,'hashes':hashes},indent=2))
            raise RuntimeError(f'Judge {index} failed or returned no valid verdict. Inspect {trial}')
        for side in ['A','B']:
            scores=data[side]['scores']
            if set(scores) != set(CRITERIA) or any(type(v) not in (int,float) or not 0 <= v <= 5 for v in scores.values()):
                raise RuntimeError(f'Invalid criterion scores in {trial}')
            data[side]['calculated_weighted']=sum(scores[k]*w for k,w in CRITERIA.items())/5
        winner=data['winner']
        selected='tie' if winner=='tie' else ('parent' if (winner=='A')==(index==1) else 'candidate')
        verdicts.append({'trial':index,'exit':p.returncode,'selected':selected,'data':data,'hashes':hashes})
        (trial/'receipt.json').write_text(json.dumps(verdicts[-1],indent=2))
    selected=verdicts[0]['selected'] if verdicts[0]['selected']==verdicts[1]['selected'] else 'tie'
    result={'status':'judged','selected':selected,'hashes':hashes,'verdicts':verdicts,'owner_approval':False,'calibration':a.calibration}
    (out/'verdict.json').write_text(json.dumps(result,indent=2))
    print(json.dumps({'out':str(out),'selected':selected}),flush=True)

if __name__=='__main__':main()
