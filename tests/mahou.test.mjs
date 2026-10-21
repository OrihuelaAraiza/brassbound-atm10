import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMahou,filterSpells,morganBudget,catalystBudget} from '../dist/mahou.js';
import {cleanState,createEngine} from '../dist/engine.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const data=read('mahou'),rituals=read('mahou-rituals'),recipes=read('recipes');
test('Every published spell matches exact JAR catalysts and preparation, with unique IDs and sources',()=>{
 assert.equal(data.spells.length,53);assert.equal(new Set(data.spells.map(s=>s.id)).size,53);
 for(const s of data.spells){const r=rituals.find(r=>r.circleId===s.circleId);assert.ok(r,s.id);assert.deepEqual(s.catalysts.flatMap(c=>Array(c.count).fill(c.id)).sort(),[...r.powders].sort(),s.id);assert.equal(s.cloth,r.cloth==='ground-only'?'forbidden':r.cloth,s.id);assert.ok(s.sourceUrl.startsWith('https://mahoutsukai.stepsword.com/spells/'));assert.equal(s.steps.length,3);assert.ok(s.pitfalls.length);}
});
test('Morgan estimates use ATM increments and reject unreachable or invalid goals',()=>{
 assert.deepEqual(morganBudget({current:30,target:60,cap:60},data.values),{kills:300,mana:120000,gain:.1,ceiling:60});
 assert.equal(morganBudget({current:30,target:60,cap:60,kind:'child'},data.values).kills,60);
 assert.equal(morganBudget({current:59.9,target:60,cap:60},data.values).kills,1);
 assert.equal(morganBudget({current:60,target:60,cap:60},data.values).kills,0);
 for(const input of [{current:30,target:60,cap:35},{current:61,target:61,cap:70},{current:40,target:30,cap:60},{current:'x',target:30,cap:60}])assert.ok(morganBudget(input,data.values).error);
});
test('Catalyst batches aggregate duplicates, respect cloth, preserve surplus and never multiply tools',()=>{
 const alarm=data.spells.find(s=>s.id==='alarm-boundary');const r=catalystBudget(alarm,3,'mortar',true);
 assert.equal(r.cloth,3);assert.deepEqual(r.powders.map(x=>[x.count,x.raw,x.surplus]),[[6,3,0],[3,2,1]]);
 assert.equal(catalystBudget(alarm,3,'hammer',false).cloth,0);
 const ground=data.spells.find(s=>s.cloth==='forbidden'),scroll=data.spells.find(s=>s.cloth==='required');
 assert.ok(catalystBudget(ground,1,'mortar',true).error);assert.equal(catalystBudget(scroll,1,'mortar',false).cloth,1);
 for(const n of [0,-1,1.5,10001,NaN])assert.ok(catalystBudget(alarm,n).error);
});
test('Every guide, spell and section renders with stable shared progress and no missing values',()=>{
 const state=cleanState({schema:1,tasks:{'prepare:space':true,'pack:mahou-inicio-0':true},notes:'Mi mundo'});
 const c=createMahou({data,icon:()=>'',name:id=>id,state:()=>state,navigate(){}});
 for(const path of ['overview','roadmap','guides','spells','tools','settings',...data.chapters.map(x=>'guides/'+x.id),...data.spells.map(x=>'spells/'+x.id)]){c.route(path);const html=c.view();assert.ok(html.length>700,path);assert.ok(!/undefined|\[object Object\]/.test(html),path);}
 assert.equal(c.progress().done,1);assert.equal(c.progress().total,37);
 const restored=cleanState(JSON.parse(JSON.stringify(state)));assert.equal(restored.tasks['pack:mahou-inicio-0'],true);assert.equal(restored.tasks['prepare:space'],true);assert.equal(restored.notes,'Mi mundo');
 const pack=read('pack-guide').routes.find(r=>r.id==='mahou-tsukai');assert.deepEqual(pack.steps.map(s=>'pack:'+s.id),data.roadmap.flatMap(s=>s.checks));
 for(const g of data.chapters)for(const id of g.spells)assert.ok(data.spells.some(s=>s.id===id),id);
});
test('Spell search supports Spanish accents, English names, catalysts and independent filters',()=>{
 assert.equal(filterSpells(data.spells,{query:'proyeccion del tesoro'})[0].id,'treasury-projection');
 assert.equal(filterSpells(data.spells,{query:'drain life'})[0].id,'drain-life-boundary');
 assert.ok(filterSpells(data.spells,{query:'powdered_diamond'}).length>0);
 assert.ok(filterSpells(data.spells,{form:'forbidden'}).every(s=>s.cloth==='forbidden'));
 assert.equal(filterSpells(data.spells,{query:'no existe este hechizo'}).length,0);
});
test('Pinned settings and recipe counts do not substitute latest wiki defaults',()=>{
 assert.equal(data.config.length,458);assert.equal(data.config.filter(r=>r.changed).length,61);
 assert.equal(data.values.POWER_CONSOLIDATION_LAKE_THRESHHOLD,150);assert.equal(data.values.MAX_MANA_CAP,20000);
 assert.equal(data.values.MORGAN_ADULT_INCREASE,.1);assert.equal(data.values.MORGAN_CHILD_INCREASE,.5);
 assert.equal(data.config.find(r=>r.key==='DRAIN_LIFE_MANA_REGEN').changed,false);
 const mahou=recipes.filter(r=>r.source.modId==='mahoutsukai');assert.equal(mahou.length,32);
 const engine=createEngine(recipes);assert.equal(engine.choose('mahoutsukai:powdered_iron'),undefined);
 assert.equal(mahou.find(r=>r.id==='mahoutsukai:mystic_code').type,'minecraft:crafting_shaped');
 const icons=read('icons');for(const [id,path]of Object.entries(icons).filter(([id])=>id.startsWith('mahoutsukai:')))assert.ok(fs.existsSync(new URL('../dist/'+path,import.meta.url)),id);
});
