import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterAtlas,sceneFigure,mountScenePlayer} from '../dist/companion.js';
const scenes=JSON.parse(fs.readFileSync(new URL('../dist/data/animation-scenes.json',import.meta.url)));
const icons=JSON.parse(fs.readFileSync(new URL('../dist/data/icons.json',import.meta.url)));
test('Every lesson has traceable steps, materials and valid diagram edges',()=>{
 assert.equal(new Set(scenes.map(s=>s.id)).size,scenes.length);
 for(const s of scenes){assert.ok(s.steps.length>=3);assert.ok(s.items.length);assert.ok(s.sourceUrl.startsWith('https://'));assert.ok(s.checklist.length);assert.ok(s.pitfalls.length);for(const e of s.diagram.connections){assert.ok(s.diagram.nodes[e.from]);assert.ok(s.diagram.nodes[e.to]);}const markup=sceneFigure(s,icons);assert.ok(markup.includes('role="img"'));assert.ok(!markup.includes('undefined'));assert.ok(markup.includes(`id="flow-${s.id}"`));}
});
test('Displayed processing examples agree with cold/hot mixing and the ATM infuser override',()=>{
 const cold=sceneFigure(scenes.find(s=>s.id==='create-mixer'),icons);
 const hot=sceneFigure(scenes.find(s=>s.id==='create-brass'),icons);
 const mek=sceneFigure(scenes.find(s=>s.id==='mekanism-infuser'),icons);
 assert.ok(cold.includes(icons['create:andesite_alloy']));assert.ok(!cold.includes('Cubeta + calor para latón'));
 assert.ok(hot.includes(icons['create:brass_ingot']));assert.ok(hot.includes(icons['create:blaze_burner']));
 assert.ok(mek.includes(icons['minecraft:copper_ingot']));
});
test('Atlas search supports accents, categories and favorites independently',()=>{
 const data=[{id:'a',name:'Energía',summary:'Turbina',category:'tech',detailLevel:'guide'},{id:'b',name:'Base',summary:'Librería',category:'library',detailLevel:'support'}];
 assert.equal(filterAtlas(data,{query:'energia'})[0].id,'a');assert.equal(filterAtlas(data,{scope:'play'}).length,1);assert.equal(filterAtlas(data,{scope:'saved',favorites:{b:true}})[0].id,'b');assert.equal(filterAtlas(data,{category:'magic'}).length,0);
});
class El {
 constructor(data={}){this.dataset=data;this.value='0';this.textContent='';this.attrs={};this.style={setProperty(){}};this.classes=new Set();this.classList={toggle:(key,val)=>val?this.classes.add(key):this.classes.delete(key)};}
 setAttribute(k,v){this.attrs[k]=v;}hasAttribute(k){return this.attrs[k]!==undefined;}closest(){return this;}matches(q){return q==='[data-scene-speed]'&&this.dataset.sceneSpeed!==undefined;}
}
test('Playback supports start, pause, seeking and teardown without background timers',async()=>{
 const elements=new Map();for(const s of ['.scene-stage','[data-scene-timeline]','[data-scene-play]','[data-step-title]','[data-step-text]','[data-step-counter]','[data-scene-clock]'])elements.set(s,new El());
 const play=elements.get('[data-scene-play]');play.attrs['data-scene-play']='';
 const steps=scenes[0].steps.map((_,i)=>new El({lessonStep:String(i)}));
 const events=new Map(),documentEvents=new Map();const oldDoc=globalThis.document;
 globalThis.document={hidden:false,addEventListener:(k,f)=>documentEvents.set(k,f),removeEventListener:k=>documentEvents.delete(k)};
 const root={querySelector:s=>elements.get(s),querySelectorAll:()=>steps,contains:()=>true,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const stop=mountScenePlayer(root,scenes[0]);
 try{
  assert.equal(elements.get('[data-step-title]').textContent,scenes[0].steps[0].title);
  events.get('click')({target:play});assert.ok(elements.get('.scene-stage').classes.has('playing'));
  await new Promise(r=>setTimeout(r,160));assert.ok(elements.get('[data-scene-timeline]').value>0);
  events.get('click')({target:play});const paused=elements.get('[data-scene-timeline]').value;
  await new Promise(r=>setTimeout(r,160));assert.equal(elements.get('[data-scene-timeline]').value,paused);
  events.get('click')({target:steps[2]});assert.equal(elements.get('[data-step-title]').textContent,scenes[0].steps[2].title);assert.equal(elements.get('.scene-stage').dataset.step,2);
  stop();assert.equal(events.size,0);assert.equal(documentEvents.size,0);
 }finally{stop();globalThis.document=oldDoc;}
});
