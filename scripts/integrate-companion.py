import json
from pathlib import Path
src=Path(__file__).resolve().parents[2]/'research-companion'
dest=Path(__file__).resolve().parents[1]/'dist'/'data'
scenes=json.loads((src/'animation-research.json').read_text())
if (src/'animation-addons.json').exists():
    scenes+=json.loads((src/'animation-addons.json').read_text())
titles={'create-waterwheel':'Rueda hidráulica','create-press':'Prensa mecánica','create-belt':'Correas y transporte','create-crushing':'Ruedas de trituración','create-assembly':'Mecanismo de precisión','ae2-autocrafting':'Autocrafteo de AE2','bees-production':'Colmenas y centrífuga','storage-controller':'Controlador de cajones'}
for scene in scenes:
    scene['title']=titles.get(scene['id'],scene['title'])
assert len({s['id'] for s in scenes})==len(scenes)
(dest/'animation-scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,separators=(',',':')))
(dest/'animation-evidence.json').write_text((src/'animation-evidence.json').read_text())
atlas=json.loads((src/'mod-atlas.json').read_text())
assert len(atlas)==491
# Prioritize beginner-friendly and detailed entries; the full inventory remains searchable.
priority=['create','jei','jade','ftbquests','functionalstorage','sophisticatedbackpacks','sophisticatedstorage','ae2','mekanism','powah','ars_nouveau','mysticalagriculture','productivebees']
atlas.sort(key=lambda m:(priority.index(m['id']) if m['id'] in priority else len(priority),m['detailLevel']!='guide',m['name'].lower()))
(dest/'mod-atlas.json').write_text(json.dumps(atlas,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'atlas':len(atlas),'detailedGuides':sum(m['detailLevel']=='guide' for m in atlas),'scenes':len(scenes),'sceneMods':len(set(s['modId'] for s in scenes))}))
