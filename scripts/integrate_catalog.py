import json,pathlib,shutil,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'research-create';EX=ROOT.parent/'research-expanded';IC=ROOT.parent/'research-icons';DIST=ROOT/'public';D=DIST/'data'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')))
base=read(BASE/'recipes.json');extra=read(EX/'recipes.json')
recipes={r['id']:r for r in base};recipes.update({r['id']:r for r in extra})
write(D/'recipes.json',list(recipes.values()))
tr=read(BASE/'translations.json')
for lang,entries in read(EX/'translations.json').items():tr.setdefault(lang,{}).update(entries)
write(D/'translations.json',tr)
tags=read(BASE/'tags.json')
for tag,items in read(EX/'tags.json').items():
 tags.setdefault(tag,[])
 for item in items:
  if item not in tags[tag]:tags[tag].append(item)
write(D/'tags.json',tags)
icons=read(BASE/'icons.json');icons.update(read(EX/'icons.json'))
for p in (EX/'textures').rglob('*'):
 if p.is_file():dst=DIST/'textures'/p.relative_to(EX/'textures');dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
# Keep only model icons referenced by recipe items, tag alternatives or explicitly curated UI items.
used=set()
for r in recipes.values():
 used.add(r['output']['id'])
 for key in ['ingredients','outputs','catalysts']:
  for i in r.get(key,[]):
   if i.get('kind')!='tag':used.add(i['id'])
for items in tags.values():
 for i in items:
  value=i if isinstance(i,str) else i.get('id','')
  if ':' in value and not value.startswith('#'):used.add(value)
for f in ['app.js','guide.js']:
 used.update(re.findall(r"[a-z0-9_]+:[a-z0-9_/]+",(DIST/f).read_text()))
new=read(IC/'icons.json');added=0
for item,path in new.items():
 if item not in used:continue
 src=IC/path;dst=DIST/path;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst);icons[item]=path;added+=1
write(D/'icons.json',icons)
for src,target in [(EX/'mods-catalog.json',D/'mods-catalog.json'),(EX/'catalog-metadata.json',D/'expanded-catalog-metadata.json'),(IC/'attributions.json',D/'icon-attributions.json')]:shutil.copy2(src,target)
for src,dest in [(EX/'licenses',DIST/'licenses'),(IC/'attributions',DIST/'licenses'/'icon-rendering')]:
 if src.exists():shutil.copytree(src,dest,dirs_exist_ok=True)
# Keep the detailed per-model reason report local; publish useful counts, not auxiliary model lists.
coverage=read(IC/'coverage.json');published={'rendererModelCount':coverage['rendered'],'referencedRenderedIcons':added,'totalIconMappings':len(icons),'unavailableBehavior':'Explicit unavailable-icon marker. Custom Java renderers and runtime tints are not approximated.','attributions':'data/icon-attributions.json'}
write(D/'icon-coverage.json',published)
write(D/'release-data.json',{'version':'8.1','normalizedRecipes':len(recipes),'additionalMods':len(read(D/'mods-catalog.json')),'iconMappings':len(icons),'referencedRenderedIcons':added})
print(json.dumps({'recipes':len(recipes),'extra':len(extra),'renderedIconMappings':added,'allIconMappings':len(icons),'mods':len(read(D/'mods-catalog.json'))}))
