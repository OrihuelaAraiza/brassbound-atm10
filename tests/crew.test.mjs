import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {crewApi} from '../server/crew-api.mjs';
import {players,emptyState,mergeProgress,progressSummary} from '../public/crew-model.js';
import catalog from '../public/data/progress-catalog.json' with {type:'json'};
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../drizzle/0000_lonely_winter_soldier.sql',import.meta.url),'utf8'));
 const db={prepare(query){return {bind(...args){return {first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:sql.prepare(query).run(...args)})};},all:async()=>({results:sql.prepare(query).all()}),first:async()=>sql.prepare(query).get()||null};},async batch(items){sql.exec('BEGIN');try{const result=[];for(const s of items)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(path,{user='red',method='GET',body,origin='https://test.site'}={})=>{const r=await crewApi(new Request('https://test.site/api/crew/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),db,user?{userId:user}:null);return {status:r.status,...await r.json()};};return {sql,call};
}
test('Roster preserves all seven requested names; anonymous visitors cannot claim, save or read group',async()=>{
 const {call}=setup();assert.deepEqual(players.map(p=>p.name),['Mayze','Shady','Rafunki','KelThzear','RedBone','Detectov','Bolsita']);assert.equal((await call('session',{user:null})).players.length,7);
 for(const [path,method] of [['claim','POST'],['state','PUT'],['group','GET'],['activity','POST']])assert.equal((await call(path,{user:null,method,body:method==='GET'?null:{}})).status,401);
});
test('A player belongs to one account and each account can claim only one player',async()=>{
 const {call}=setup();assert.equal((await call('claim',{method:'POST',body:{playerId:'redbone'}})).status,201);
 assert.equal((await call('claim',{user:'other',method:'POST',body:{playerId:'redbone'}})).status,409);
 assert.equal((await call('claim',{method:'POST',body:{playerId:'shady'}})).status,409);
 assert.equal((await call('claim',{user:'other',method:'POST',body:{playerId:'nobody'}})).status,400);
 assert.equal((await call('claim',{user:'other',method:'POST',body:{playerId:'mayze'},origin:'https://evil.site'})).status,403);
});
test('Progress and private notes are isolated; group exposes only summaries and activities',async()=>{
 const {call}=setup();await call('claim',{method:'POST',body:{playerId:'redbone'}});await call('claim',{user:'may',method:'POST',body:{playerId:'mayze'}});
 const s=emptyState();s.notes='Private coordinates';s.tasks['prepare:space']=true;s.inventory['minecraft:iron_ingot']=12;
 assert.equal((await call('state',{method:'PUT',body:{state:s,revision:0,mutationId:'write-0001',playerId:'redbone'}})).revision,1);
 assert.equal((await call('state',{method:'PUT',user:'may',body:{state:s,revision:0,mutationId:'write-wrong',playerId:'redbone'}})).status,403);
 assert.equal((await call('session',{user:'may'})).me.state.notes,'');assert.equal((await call('session')).me.state.notes,'Private coordinates');
 const group=await call('group',{user:'may'});assert.equal(group.players.find(p=>p.id==='redbone').done,1);assert.equal(group.players.find(p=>p.id==='mayze').done,0);assert.ok(!JSON.stringify(group).includes('Private coordinates'));assert.ok(!JSON.stringify(group).includes('owner_id'));assert.equal(group.activity[0].player_id,'redbone');
});
test('Stale revisions never overwrite data and repeated writes do not duplicate events',async()=>{
 const {call}=setup();await call('claim',{method:'POST',body:{playerId:'redbone'}});const s=emptyState();s.tasks['prepare:space']=true;
 const body={state:s,revision:0,mutationId:'write-0001',playerId:'redbone'};assert.equal((await call('state',{method:'PUT',body})).revision,1);assert.equal((await call('state',{method:'PUT',body})).revision,1);
 const stale=await call('state',{method:'PUT',body:{...body,state:emptyState(),mutationId:'write-0002'}});assert.equal(stale.status,409);assert.equal(stale.conflict,true);assert.equal((await call('group')).activity.length,1);assert.equal((await call('session')).me.state.tasks['prepare:space'],true);
 body.state.tasks['prepare:space']=false;body.revision=1;body.mutationId='write-0003';await call('state',{method:'PUT',body});assert.equal((await call('group')).players.find(p=>p.id==='redbone').done,0);
});
test('Journal author is assigned by server, retries deduplicate, and only the author can remove entries',async()=>{
 const {call}=setup();await call('claim',{method:'POST',body:{playerId:'redbone'}});await call('claim',{user:'may',method:'POST',body:{playerId:'mayze'}});
 const body={id:'journal-0001',text:'Monté la prensa.',playerId:'redbone'};await call('activity',{method:'POST',body});await call('activity',{method:'POST',body});const group=await call('group');assert.equal(group.activity.length,1);assert.equal(group.activity[0].player_id,'redbone');
 assert.equal((await call('activity',{method:'DELETE',user:'may',body:{id:body.id}})).status,403);assert.equal((await call('activity',{method:'DELETE',body:{id:body.id}})).status,200);
 assert.equal((await call('activity',{method:'POST',body:{id:'journal-0002',text:' '.repeat(4),playerId:'redbone'}})).status,400);
});
test('Migrating legacy progress preserves both notebooks, all objectives and the higher material count',()=>{
 const a=emptyState(),b=emptyState();a.tasks['prepare:space']=true;b.tasks['pack:mahou-inicio-0']=true;a.notes='Nube';b.notes='Anterior';a.inventory.iron=5;b.inventory.iron=8;a.plans=[{name:'Prensa',item:'create:mechanical_press',quantity:1}];b.plans=a.plans;
 const c=mergeProgress(a,b);assert.equal(c.inventory.iron,8);assert.equal(c.tasks['prepare:space'],true);assert.equal(c.tasks['pack:mahou-inicio-0'],true);assert.equal(c.plans.length,1);assert.match(c.notes,/Nube/);assert.match(c.notes,/Anterior/);assert.equal(progressSummary(c,catalog).done,2);assert.equal(a.inventory.iron,5);
});
