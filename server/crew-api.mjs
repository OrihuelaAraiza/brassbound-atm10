import {players,emptyState,progressSummary} from '../public/crew-model.js';
import {cleanState} from '../public/engine.js';
import catalog from '../public/data/progress-catalog.json' with {type:'json'};
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const playerFor=id=>players.find(p=>p.id===id);
async function bodyOf(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('Envía datos JSON.');
  const text=await request.text();if(text.length>600000)throw new Error('El registro es demasiado grande. Exporta un respaldo.');return JSON.parse(text);
}
export async function crewApi(request,db,user){
 try{
  const path=new URL(request.url).pathname.replace(/^\/api\/crew\/?/,'');
  if(!db)return json({error:'El guardado en línea no está disponible. Tu copia local se conserva.'},503);
  if(!['GET','POST','PUT','DELETE'].includes(request.method))return json({error:'Método no permitido.'},405);
  if(request.method!=='GET'){
   const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
   if(!user?.userId)return json({error:'Inicia sesión para guardar tu progreso.'},401);
  }
  const owned=user?.userId?await db.prepare('SELECT * FROM players WHERE owner_id = ?').bind(user.userId).first():null;
  if(path==='session'&&request.method==='GET'){
   const claimed=await db.prepare('SELECT id FROM players').all();
   return json({signedIn:Boolean(user?.userId),userId:user?.userId||null,me:owned?{...playerFor(owned.id),state:JSON.parse(owned.state),revision:owned.revision}:null,players:players.map(p=>({...p,claimed:claimed.results.some(x=>x.id===p.id)}))});
  }
  if(path==='claim'&&request.method==='POST'){
   const body=await bodyOf(request);const player=playerFor(body.playerId);if(!player)return json({error:'Selecciona uno de los siete jugadores.'},400);
   if(owned)return json({error:'Tu cuenta ya tiene un jugador asociado.'},409);
   try{await db.prepare('INSERT INTO players (id,owner_id,state,revision,updated_at) VALUES (?,?,?,0,?)').bind(player.id,user.userId,JSON.stringify(emptyState()),new Date().toISOString()).run();}
   catch(error){if(/UNIQUE|constraint/i.test(String(error)))return json({error:'Este jugador ya está vinculado. Actualiza la lista o entra con la cuenta con la que lo registraste.'},409);throw error;}
   return json({ok:true},201);
  }
  if(!owned)return json({error:user?.userId?'Elige tu jugador para entrar al grupo.':'Inicia sesión para ver el progreso del grupo.'},user?.userId?403:401);
  if(path==='group'&&request.method==='GET'){
   const rows=await db.prepare('SELECT id,state,updated_at FROM players').all();
   const feed=await db.prepare('SELECT id,player_id,kind,text,created_at FROM activity ORDER BY created_at DESC,id DESC LIMIT 150').all();
   return json({players:players.map(p=>{const row=rows.results.find(r=>r.id===p.id);return {...p,joined:Boolean(row),updatedAt:row?.updated_at||null,...progressSummary(row?JSON.parse(row.state):emptyState(),catalog)};}),activity:feed.results});
  }
  if(path==='state'&&request.method==='PUT'){
   const body=await bodyOf(request);
   if(body.playerId!==owned.id)return json({error:'Tu sesión cambió. Recarga para entrar con el jugador correcto.'},403);
   if(!Number.isSafeInteger(body.revision)||body.revision<0||!/^[-\w]{8,100}$/.test(body.mutationId||''))return json({error:'Versión de guardado inválida.'},400);
   if(owned.last_write===body.mutationId)return json({revision:owned.revision});
   if(body.revision!==owned.revision)return json({error:'Hay cambios guardados desde otra pestaña o dispositivo. Conservamos tu copia local para que puedas revisarla.',conflict:true},409);
   const state=cleanState(body.state);const old=JSON.parse(owned.state);const now=new Date().toISOString();
   const changed=Object.keys(catalog).filter(k=>Boolean(state.tasks[k])!==Boolean(old.tasks[k]));
   const events=changed.slice(0,20).map(k=>({kind:'objective',text:(state.tasks[k]?'Completó: ':'Reabrió: ')+catalog[k].title}));
   if(changed.length>20)events.push({kind:'objective',text:`Actualizó otros ${changed.length-20} objetivos.`});
   const statements=[db.prepare('UPDATE players SET state=?,revision=revision+1,last_write=?,updated_at=? WHERE id=? AND owner_id=? AND revision=?').bind(JSON.stringify(state),body.mutationId,now,owned.id,user.userId,body.revision),...events.map((e,i)=>db.prepare('INSERT OR IGNORE INTO activity (id,player_id,kind,text,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM players WHERE id=? AND last_write=?)').bind(body.mutationId+':'+i,owned.id,e.kind,e.text,now,owned.id,body.mutationId))];
   const result=await db.batch(statements);
   if(!result[0].meta.changes)return json({error:'Otro dispositivo guardó antes. Revisa tu copia local.',conflict:true},409);
   return json({revision:body.revision+1});
  }
  if(path==='activity'&&request.method==='POST'){
   const body=await bodyOf(request);if(body.playerId!==owned.id)return json({error:'Tu sesión cambió. Recarga para entrar con el jugador correcto.'},403);const text=typeof body.text==='string'?body.text.trim():'';
   if(!text||text.length>1500||!/^[-\w]{8,100}$/.test(body.id||''))return json({error:'Escribe entre 1 y 1,500 caracteres.'},400);
   await db.prepare('INSERT OR IGNORE INTO activity (id,player_id,kind,text,created_at) VALUES (?,?,?,?,?)').bind(body.id,owned.id,'entry',text,new Date().toISOString()).run();return json({ok:true},201);
  }
  if(path==='activity'&&request.method==='DELETE'){
   const body=await bodyOf(request);
   const result=await db.prepare("DELETE FROM activity WHERE id=? AND player_id=? AND kind='entry'").bind(body.id,owned.id).run();return result.meta.changes?json({ok:true}):json({error:'Solo puedes retirar tus propias entradas.'},403);
  }
  return json({error:'Ruta no disponible.'},404);
 }catch(error){if(error instanceof SyntaxError||/respaldo|JSON|registro es demasiado/i.test(error.message))return json({error:error.message},400);console.error('Crew API request failed',error.message);return json({error:'No se pudo guardar en línea. Tu copia local se conserva; vuelve a intentarlo.'},503);}
}
