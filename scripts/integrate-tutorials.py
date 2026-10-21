import json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; R=ROOT.parent/'research-tutorials-v5';D=ROOT/'dist'
model=R/'models'
for p in (model/'data').rglob('*'):
 if p.is_file() and (p.name in ['model-index.json','model-attributions.json'] or 'model-chunks' in p.parts):
  out=D/p.relative_to(model);out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,out)
shutil.copytree(model/'textures',D/'textures',dirs_exist_ok=True)
tutorials=[]
for name in ['other-tutorials','create-tutorials']:
 tutorials+=json.loads((R/(name+'.json')).read_text())
# Reuse the already verified montage geometry where it demonstrates this machine.
w=json.loads((D/'data/workshop.json').read_text());bps={b['id']:b for b in w['blueprints']}
for t in tutorials:
 if t['id']=='use-mechanical-press':t['sceneBlocks']=bps['starter-workshop']['blocks']
 if t['id']=='use-mixer':t['sceneBlocks']=bps['brass-line']['blocks']
w['tutorials']=tutorials;w['tutorialModels']=json.loads((D/'data/model-index.json').read_text())
(D/'data/workshop.json').write_text(json.dumps(w,ensure_ascii=False,separators=(',',':')))
report={'tutorials':len(tutorials),'usageItems':len(set(i for t in tutorials for i in t['itemIds'])),'steps':sum(len(t['steps']) for t in tutorials),'mods':sorted(set(i.split(':')[0] for t in tutorials for i in t['itemIds'])),'modelEntries':len(w['tutorialModels']['items'])}
(ROOT/'evidence/tutorial-coverage-v5.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
