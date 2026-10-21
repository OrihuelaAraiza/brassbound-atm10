import json, pathlib, shutil
root=pathlib.Path(__file__).resolve().parents[1]; src=root.parent/'research-workshop-v4'; out=root/'dist/data'
def read(n): return json.loads((src/(n+'.json')).read_text())
process=read('production-processes')
data={'schema':1,'projects':read('projects'),'blueprints':read('blueprints')['blueprints'],'processes':process['processes'],'productionAssumptions':process['assumptions'],'diagnostics':read('diagnostics')['diagnostics'],'media':read('media')}
(out/'workshop.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
atlas=json.loads((out/'mod-atlas.json').read_text()); extras={m['id']:m for m in read('extra-guides')}; enrichment=read('guide-enrichments')
for m in atlas:
 if m['id'] in extras:m.update(extras[m['id']])
 if m['id'] in enrichment:m.update(enrichment[m['id']])
(out/'mod-atlas.json').write_text(json.dumps(atlas,ensure_ascii=False,separators=(',',':')))
shutil.copyfile(src/'block-models.json',out/'block-models.json')
shutil.copytree(src/'model-textures/textures',root/'dist/textures',dirs_exist_ok=True)
licenses=root/'dist/licenses/workshop';licenses.mkdir(exist_ok=True)
for name in ['README-block-models.md','README-workshop-data.md','README.md','validation-block-models.json','workshop-data-validation.json']:
 shutil.copyfile(src/name,licenses/name)
print({'projects':len(data['projects']),'blueprints':len(data['blueprints']),'processes':len(data['processes']),'guides':sum(m['detailLevel']=='guide' for m in atlas),'enriched':sum(bool(m.get('requirements')) for m in atlas)})
