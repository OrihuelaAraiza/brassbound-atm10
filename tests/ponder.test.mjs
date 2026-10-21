import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveText,sceneLookup,needsRemoteText,expandFrames,viewAt,chapterFrames,chapterTarget,blockBuffers,meshBuffer,boxBuffer,streamBox,chestState,withLocalBlocks,frameScale,argb,mouseLabel,itemNameKeys} from '../public/ponder-format.js';
import {createTutorialPlayer} from '../public/tutorial-player.js';
import {createEngine} from '../public/engine.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
const index=read('ponder-index'),translations=read('translations'),recipes=read('recipes'),icons=read('icons'),catalog=read('progress-catalog');

test('Ponder index maps ATM10 ids to recorded scenes, never Cretania ids',()=>{
 assert.equal(index.schema,1);assert.ok(index.source.url.startsWith('https://'));
 const scenes=Object.keys(index.scenes),items=Object.entries(index.items);
 assert.equal(scenes.length,180);assert.equal(items.length,258);
 assert.equal(scenes.filter(s=>index.scenes[s].mod==='create').length,165);
 assert.deepEqual(index.missing,['create/train_signal/signaling']);
 const known=new Set([...Object.keys(icons),...recipes.map(r=>r.output.id)]);
 for(const [id,paths] of items){
  assert.ok(!id.startsWith('cretania:'),id);assert.ok(paths.length,id);
  const [ns,path]=id.split(':');assert.ok(known.has(id)||translations.es_es[`item.${ns}.${path}`]||translations.es_es[`block.${ns}.${path}`],id);
  for(const p of paths)assert.ok(index.scenes[p],`${id} → ${p}`);
 }
 for(const s of Object.values(index.scenes)){assert.ok(s.title&&!s.title.includes('undefined'));assert.ok(s.note);}
 assert.deepEqual(index.items['create:shaft'],['create/shaft/relay','create/shaft/encasing']);
 assert.deepEqual(index.items['create:mechanical_press'],['create/mechanical_press/pressing','create/mechanical_press/compacting']);
 assert.deepEqual(index.items['create:red_valve_handle'],['create/valve_handle']);
 assert.deepEqual(index.items['minecraft:chest'],['cretania/vanilla/chest']);
 assert.equal(index.items['minecraft:pale_oak_door'],undefined);
 assert.equal(index.scenes['create/shaft/relay'].title,translations.es_es['create.ponder.shaft.header']);
});

test('Every recorded scene can be marked as learned and reaches the group activity catalog',()=>{
 for(const [path,s] of Object.entries(index.scenes)){const entry=catalog['tutorial:ponder:'+path];assert.ok(entry,path);assert.equal(entry.group,'Tutoriales 3D');assert.ok(entry.title.endsWith(s.title));}
 assert.equal(Object.keys(catalog).filter(k=>k.startsWith('tutorial:ponder:')).length,180);
});

test('Scene text uses our Spanish string only when the recorded English matches',()=>{
 const scene={defecto:{'create.ponder.a.text_1':'Shafts relay rotation','create.ponder.a.text_2':'Changed by the server'}};
 const es={'create.ponder.a.text_1':'Los ejes transmiten','create.ponder.a.text_2':'Texto local'},en={'create.ponder.a.text_1':'Shafts relay rotation','create.ponder.a.text_2':'Original text'};
 const local={es:k=>es[k],en:k=>en[k]};
 const lookup=sceneLookup(scene,{...local,remote:{'create.ponder.a.text_2':'Texto remoto'}});
 assert.equal(lookup('create.ponder.a.text_1'),'Los ejes transmiten');
 assert.equal(lookup('create.ponder.a.text_2'),'Texto remoto');
 assert.equal(sceneLookup(scene,local)('create.ponder.a.text_2'),'Changed by the server');
 assert.equal(needsRemoteText(scene,local),true);
 assert.equal(needsRemoteText({defecto:{'create.ponder.a.text_1':'Shafts relay rotation'}},local),false);
 assert.equal(resolveText('\u0001k\u0002Ctrl\u0002 3\u0001 · §6listo',k=>k==='k'?'Pulsa %s y %2$s':k),'Pulsa Ctrl y  3 · listo');
 assert.equal(resolveText('sin claves',()=>'x'),'sin claves');
 assert.equal(resolveText('\u0001roto',()=>'x'),'\u0001roto');
 assert.equal(mouseLabel('CLIC_DERECHO'),'Clic derecho');assert.equal(mouseLabel('OTRO_BOTON'),'Otro boton');
 assert.deepEqual(itemNameKeys('cretania:llave_inglesa'),['item.cretania.llave_inglesa','block.cretania.llave_inglesa']);
});

test('Frames repeat on zero, cameras step by frame and chapter jumps match Ponder',()=>{
 assert.deepEqual(expandFrames([[1,2],0,0,[3]]),[[1,2],[1,2],[1,2],[3]]);
 assert.deepEqual(expandFrames([0,[4]]),[[],[4]]);
 const cams=[[0,-35,145,1],[79,-35,147.33,1],[80,-35,149.67,1.2]];
 assert.deepEqual(viewAt(cams,50),{pitch:-35,yaw:145,scale:1});assert.deepEqual(viewAt(cams,80),{pitch:-35,yaw:149.67,scale:1.2});assert.deepEqual(viewAt([],3),{pitch:-35,yaw:145,scale:1});
 const marks=chapterFrames({marcas:[47,312],fpt:3});assert.deepEqual(marks,[141,936]);
 assert.equal(chapterTarget(marks,0,1,1416,3),141);assert.equal(chapterTarget(marks,141,1,1416,3),936);assert.equal(chapterTarget(marks,936,1,1416,3),1415);
 assert.equal(chapterTarget(marks,1000,-1,1416,3),936);assert.equal(chapterTarget(marks,950,-1,1416,3),141);assert.equal(chapterTarget(marks,100,-1,1416,3),0);
});

test('Block faces against opaque neighbours are culled and animated strips show one frame',()=>{
 const quad=(cull,y)=>[cull,'minecraft:block/stone',0,-1,0,y,0,0,0,0,y,1,0,1,1,y,1,1,1,1,y,0,1,0];
 const states={stone:{op:true,q:[quad(1,1),quad(0,0)]},glass:{op:false,q:[quad(1,1)]}};
 const count=list=>[...blockBuffers(list,states).values()].reduce((n,b)=>n+b.triangles,0);
 assert.equal(count([['stone',0,0,0]]),4);
 assert.equal(count([['stone',0,0,0],['stone',0,1,0]]),4);
 assert.equal(count([['stone',0,0,0],['glass',0,1,0]]),6);
 const top=blockBuffers([['stone',0,0,0]],states).get('minecraft:block/stone|solido');assert.deepEqual(top.tint.slice(0,4),[1,1,1,1]);
 assert.equal(frameScale([16,512,16]),1/32);assert.equal(frameScale(undefined),1);
 assert.deepEqual(argb(0x80ff0000),[1,0,0,128/255]);assert.deepEqual(argb(-1),[1,1,1,1]);
 const mesh=meshBuffer({t:'a',v:[0,0,0,0,0,0,1,0, 1,0,0,1,0,0,1,0, 1,0,1,1,1,0,1,0, 0,0,1,0,1,0,1,0]});assert.equal(mesh.triangles,2);assert.deepEqual(mesh.normal.slice(0,3),[0,1,0]);
});

test('Overlay boxes and pipe streams face outward and grow from the pipe centre',()=>{
 const box=boxBuffer([0,0,0,1,1,1],[0,0,1,1],63,-1);assert.equal(box.triangles,12);
 for(let t=0;t<box.triangles;t++){const p=box.position.slice(t*9,t*9+9),n=box.normal.slice(t*9,t*9+3),u=[p[3]-p[0],p[4]-p[1],p[5]-p[2]],v=[p[6]-p[0],p[7]-p[1],p[8]-p[2]],c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(c[0]*n[0]+c[1]*n[1]+c[2]*n[2]>0,'triangle '+t);}
 assert.equal(boxBuffer([0,0,0,1,1,1],null,4|8,-1).triangles,4);
 assert.deepEqual(streamBox('ESTE',.1875,.5,.25),[.5,.3125,.3125,.75,.6875,.6875]);
 assert.deepEqual(streamBox('ABAJO',.25,.5,0),[.25,0,.25,.75,.5,.75]);
});

test('Chests recorded without faces get a local model that joins double chests',()=>{
 assert.equal(chestState('minecraft:ender_chest[facing=north]'),null);
 const single=chestState('minecraft:chest[facing=south,type=single,waterlogged=false]'),xs=single.q.flatMap(q=>[q[4],q[9],q[14],q[19]]);
 assert.equal(single.q.length,18);assert.equal(Math.min(...xs),1/16);assert.equal(Math.max(...xs),15/16);
 const left=chestState('minecraft:chest[facing=south,type=left,waterlogged=false]'),right=chestState('minecraft:chest[facing=south,type=right,waterlogged=false]');
 assert.equal(Math.min(...left.q.flatMap(q=>[q[4],q[9],q[14],q[19]])),0);assert.equal(Math.max(...right.q.flatMap(q=>[q[4],q[9],q[14],q[19]])),1);
 const east=chestState('minecraft:chest[facing=east,type=single,waterlogged=false]'),latch=east.q.slice(12);
 assert.ok(latch.every(q=>[q[4],q[9],q[14],q[19]].every(x=>x>=15/16-1e-9)),'latch faces east');
 const states=withLocalBlocks({'minecraft:stone':{op:true,q:[]}},['minecraft:chest[facing=north,type=single,waterlogged=false]','minecraft:stone']);
 assert.equal(states['minecraft:chest[facing=north,type=single,waterlogged=false]'].q.length,18);assert.equal(states['minecraft:stone'].q.length,0);
});

test('Items with recorded scenes open the 3D tutorial first and keep the other modes',()=>{
 const engine=createEngine(recipes,read('tags')),data={...read('workshop'),ponder:index};
 const context={data,recipes,engine,icons,icon:id=>`<img alt="${id}">`,name:id=>id,process:id=>id,state:()=>({tasks:{'tutorial:ponder:create/mechanical_press/compacting':true},selections:{}})};
 const player=createTutorialPlayer(context);
 const press=player.render('create:mechanical_press');
 assert.ok(press.includes('data-ponder-player'));assert.ok(press.includes('data-ponder-path="create/mechanical_press/pressing"'));
 assert.ok(press.includes('data-ponder-scene="create/mechanical_press/compacting"'));assert.ok(press.includes('data-tut-mode="use"'));assert.ok(press.includes('data-tut-mode="recipe"'));
 assert.ok(press.includes('Wiki de Cretania'));assert.ok(press.includes('title="Aprendido">✓'));assert.ok(!press.includes('undefined'));
 for(const id of Object.keys(index.items)){const html=player.render(id);assert.ok(html.includes('data-ponder-player'),id);assert.ok(!html.includes('undefined'),id);}
 assert.ok(player.extraIds().includes('create:creative_motor'));
 assert.ok(player.badge('create:shaft').includes('Tutorial 3D'));
 assert.ok(player.filterView().includes('data-tut-filter="ponder"'));
 const plain=createTutorialPlayer({...context,data:read('workshop')});assert.ok(!plain.render('create:mechanical_press').includes('data-ponder-player'));
});
