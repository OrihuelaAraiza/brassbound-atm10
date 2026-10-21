import {players,mergeProgress,hasProgress} from './crew-model.js';
import {cleanState} from './engine.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
const signIn='<a class="btn btn-primary" href="/signin-with-chatgpt?return_to=%2F%23crew" target="_top">Entrar con ChatGPT →</a>';
export function createCrew({getState,setState,render,navigate,toast,download,legacyKey}){
 let session=null,group=null,selected='all',status='Conectando…',error='',revision=0,dirty=false,conflict=false,saving=false,timer,cacheKey='',draft='',entryId=crypto.randomUUID(),legacy=null,busy=false,ready=false;
 try{const raw=localStorage.getItem(legacyKey);if(raw)legacy=cleanState(JSON.parse(raw));}catch{}
 async function api(path,method='GET',body){const r=await fetch('/api/crew/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});let data;try{data=await r.json();}catch{throw new Error('No se pudo conectar al guardado en línea.');}if(!r.ok){const e=new Error(data.error||'No se pudo completar la acción.');e.conflict=data.conflict;throw e;}return data;}
 function cache(){try{localStorage.setItem(cacheKey,JSON.stringify({state:getState(),revision,dirty}));return true;}catch{status='Copia local no disponible';toast('No se pudo guardar una copia local. Exporta tu respaldo.');return false;}}
 function chrome(){
  const player=session?.me;const account=document.getElementById('player-account');if(account){account.textContent=player?player.name:'Elegir jugador';account.title=player?'Abrir mi jugador y el grupo':'Elegir mi jugador';}
  const label=document.getElementById('player-save-status');if(label)label.textContent=player?`${player.name} · ${status}`:status;
  document.querySelectorAll('[data-crew-status]').forEach(el=>el.textContent=status);
 }
 function changed(){chrome();if(location.hash==='#crew')render();}
 async function refreshGroup(){if(!session?.me)return;try{group=await api('group');if(!dirty)error='';changed();}catch(e){error=e.message;changed();}}
 async function boot(){
  ready=false;
  try{
   session=await api('session');error='';
   if(session.me){
    cacheKey=legacyKey+':account:'+session.userId;revision=session.me.revision;let cached=null;
    try{if(localStorage.getItem(cacheKey+':legacy-imported'))legacy=null;draft=sessionStorage.getItem('brassbound:entry:'+session.userId)||'';}catch{}
    try{cached=JSON.parse(localStorage.getItem(cacheKey));}catch{}
    dirty=Boolean(cached?.dirty);conflict=dirty&&cached.revision!==revision;
    if(dirty){setState(cleanState(cached.state));revision=cached.revision;status=conflict?'Cambios pendientes de revisar':'Guardado pendiente';}
    else{setState(cleanState(session.me.state));status='Guardado en línea';cache();}
    ready=true;render();chrome();await refreshGroup();if(dirty&&!conflict)await flush();
   }else{ready=true;status=session.signedIn?'Elige tu jugador':'Solo en este navegador';chrome();changed();}
  }catch(e){error=e.message;status='Sin conexión · copia local';ready=true;chrome();changed();}
 }
 function save(){
  if(!session?.me){try{localStorage.setItem(legacyKey,JSON.stringify(getState()));legacy=cleanState(getState());}catch{toast('No se pudo guardar. Exporta un respaldo.');return false;}chrome();return true;}
  dirty=true;status=conflict?'Cambios pendientes de revisar':'Guardando…';const saved=cache();chrome();clearTimeout(timer);timer=setTimeout(flush,600);return saved;
 }
 async function flush(){
  if(!session?.me||!dirty||saving||conflict)return;
  saving=true;const state=structuredClone(getState());const serial=JSON.stringify(state);const mutationId=crypto.randomUUID();
  try{
   const data=await api('state','PUT',{state,revision,mutationId,playerId:session.me.id});revision=data.revision;
   dirty=JSON.stringify(getState())!==serial;status=dirty?'Guardando…':'Guardado en línea';error='';cache();
  }catch(e){conflict=Boolean(e.conflict);error=e.message;status=conflict?'Cambios pendientes de revisar':'Sin conexión · cambios pendientes';cache();}
  finally{saving=false;chrome();if(location.hash==='#crew')render();}
  if(dirty&&!error)timer=setTimeout(flush,200);
 }
 function restoreLegacy(){setState(mergeProgress(getState(),legacy));save();try{localStorage.setItem(cacheKey+':legacy-imported','1');}catch{}legacy=null;render();toast('Progreso anterior añadido a tu jugador. El respaldo original se conserva.');}
 function view(){
  const me=session?.me;
  const intro=`<div class="crew-heading"><div><span class="eyebrow">NUESTRO SERVIDOR · ATM10</span><h1>El taller de todos</h1><p>Cada quien a su ritmo. Un lugar para ver lo que construimos juntos.</p></div><span class="crew-count">7 jugadores</span></div>`;
  const problem=error?`<div class="crew-alert" role="status">${esc(error)} <button class="btn btn-small" data-crew-action="retry">Reintentar</button></div>`:'';
  if(!me)return intro+problem+`<section class="crew-welcome panel"><div class="panel-body"><h2>${session?.signedIn?'¿Quién eres en el servidor?':'Tu nombre. Tus avances. Tu taller.'}</h2><p>Vincula tu cuenta de ChatGPT con tu nombre de Minecraft. Podrás continuar desde otro dispositivo y compartir tus logros con el grupo.</p>${session?.signedIn?`<p class="server-note">Elige únicamente tu nombre: quedará asociado a esta cuenta. Si ya lo registraste, entra con la misma cuenta.</p><form id="crew-claim-form"><div class="crew-choices">${(session.players||players).map(p=>`<label class="crew-choice ${p.claimed?'claimed':''}"><input required type="radio" name="player" value="${p.id}" ${p.claimed?'disabled':''}><span class="crew-avatar" style="--player:${p.color}">${p.name.slice(0,2).toUpperCase()}</span><strong>${p.name}</strong><small>${p.claimed?'Ya vinculado':'Disponible'}</small></label>`).join('')}</div><button class="btn btn-primary" ${busy?'disabled':''}>${busy?'Vinculando…':'Vincular mi jugador'}</button></form><a class="btn btn-text mt" href="/signout-with-chatgpt?return_to=%2F%23crew" target="_top">Entrar con otra cuenta</a>`:`<div class="crew-members">${players.map(p=>`<span style="--player:${p.color}">${p.name}</span>`).join('')}</div>${signIn}<p class="server-note">Las guías siguen abiertas sin cuenta. El guardado en línea y la actividad del grupo requieren entrar.</p>`}</div></section><div class="crew-explainer"><span>✓ Progreso por jugador</span><span>✓ Bitácora compartida</span><span>✓ Notas y materiales personales</span></div>`;
  const list=group?.players||players;
  const feed=(group?.activity||[]).filter(a=>selected==='all'||a.player_id===selected);
  return intro+`<section class="crew-session"><div class="crew-avatar" style="--player:${me.color}">${me.name.slice(0,2).toUpperCase()}</div><div><strong>${me.name}</strong><span data-crew-status>${esc(status)}</span></div><button class="btn btn-secondary" data-view="routes">Continuar mis objetivos →</button><a class="btn btn-text" href="/signout-with-chatgpt?return_to=%2F%23crew" target="_top" data-crew-signout>Salir</a></section>`+problem+(conflict?`<div class="crew-alert"><strong>Hay dos versiones de tu progreso.</strong><p>Descarga tu copia pendiente antes de cargar la versión en línea. Después puedes importar el respaldo para combinarlo.</p><button class="btn" data-crew-action="resolve">Respaldar mi copia y cargar la versión en línea</button></div>`:'')+(me.id==='redbone'&&legacy&&hasProgress(legacy)?`<div class="crew-legacy"><div><strong>Encontramos tu progreso anterior en este navegador.</strong><p>Pásalo a RedBone para conservar objetivos, materiales, notas y planos.</p></div><button class="btn btn-secondary" data-crew-action="legacy">Añadir mi progreso anterior</button></div>`:'')+`<div class="section-heading mt"><h2>La cuadrilla</h2><button class="btn btn-text" data-crew-action="refresh">↻ Actualizar</button></div><div class="crew-grid">${list.map(p=>`<button class="crew-card ${selected===p.id?'selected':''}" data-crew-filter="${p.id}" aria-pressed="${selected===p.id}"><div class="crew-card-top"><span class="crew-avatar" style="--player:${p.color}">${p.name.slice(0,2).toUpperCase()}</span><div><h3>${p.name}${p.id===me.id?'<small> · tú</small>':''}</h3><small>${p.joined?'En el taller':'Aún no se une'}</small></div></div><div class="crew-score"><strong>${p.done||0}</strong><span> / ${p.total||0} objetivos</span></div><progress max="${p.total||1}" value="${p.done||0}"></progress><div class="crew-card-foot"><span>${p.plans||0} planos</span><span>${p.updatedAt?date(p.updatedAt):'Esperando su primer paso'}</span></div></button>`).join('')}</div><div class="crew-columns"><section class="panel"><div class="panel-header"><div><h2>Bitácora del servidor</h2><p>${selected==='all'?'Lo que va haciendo la cuadrilla':'Actividad de '+players.find(p=>p.id===selected)?.name}</p></div>${selected!=='all'?'<button class="btn btn-small" data-crew-filter="all">Ver todos</button>':''}</div><div class="crew-feed">${feed.length?feed.map(a=>{const p=players.find(p=>p.id===a.player_id);return `<article class="crew-event"><span class="crew-event-dot" style="--player:${p.color}">${a.kind==='entry'?'✎':'✓'}</span><div><div class="crew-event-meta"><strong>${p.name}</strong><time datetime="${a.created_at}">${date(a.created_at)}</time></div><p>${esc(a.text)}</p>${a.kind==='entry'&&a.player_id===me.id?`<button class="btn btn-text" data-crew-delete="${esc(a.id)}">Retirar mi entrada</button>`:''}</div></article>`;}).join(''):`<div class="crew-empty"><span>⌁</span><h3>Todo empieza con el primer bloque.</h3><p>${group?'Los objetivos que completes y las entradas que publiques aparecerán aquí.':'Cargando la actividad del grupo…'}</p></div>`}</div></section><aside><section class="panel"><div class="panel-header"><h2>¿Qué hiciste hoy?</h2></div><form class="panel-body" id="crew-entry-form"><label for="crew-entry">Publicar como ${me.name}</label><textarea id="crew-entry" maxlength="1500" required placeholder="Terminé la granja de hierro, conecté el almacén con AE2…">${esc(draft)}</textarea><p class="server-note">Visible para los jugadores del grupo. Tus notas personales siguen en Mi bitácora.</p><button class="btn btn-primary mt" ${busy?'disabled':''}>${busy?'Publicando…':'Publicar en la bitácora'}</button></form></section><section class="crew-help"><h3>Tu avance, a mano</h3><p>Marca objetivos en las rutas, guías y proyectos. Se guardan en tu perfil y aparecen en la actividad del grupo.</p><p>La web no lee el servidor de Minecraft. Ustedes registran lo que han hecho.</p><button class="btn btn-text" data-view="notes">Mis notas y respaldos →</button></section></aside></div>`;
 }
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-crew-action],[data-crew-filter],[data-crew-delete],[data-crew-signout]');if(!b)return;
  if(b.hasAttribute('data-crew-signout')&&dirty){e.preventDefault();await flush();if(dirty){toast('Hay cambios pendientes. Expórtalos desde Mi bitácora antes de salir.');return;}location.href=b.href;return;}
  if(b.dataset.crewFilter){selected=b.dataset.crewFilter;render();return;}
  try{
   if(b.dataset.crewDelete){b.disabled=true;await api('activity','DELETE',{id:b.dataset.crewDelete});await refreshGroup();return;}
   switch(b.dataset.crewAction){
    case 'legacy':restoreLegacy();break;
    case 'refresh':await refreshGroup();break;
    case 'retry':if(session?.me){await flush();await refreshGroup();}else await boot();break;
    case 'resolve':{const cloud=await api('session');if(cloud.me?.id!==session.me.id)throw new Error('La sesión cambió. Recarga la página.');localStorage.setItem(cacheKey+':conflict-backup',JSON.stringify(getState()));download('brassbound-'+session.me.name+'-pendiente.json',JSON.stringify(getState(),null,2));setState(cleanState(cloud.me.state));revision=cloud.me.revision;dirty=false;conflict=false;error='';status='Guardado en línea';cache();render();chrome();break;}
   }
  }catch(e){error=e.message;toast(error);changed();}
 });
 document.addEventListener('input',e=>{if(e.target.id==='crew-entry'){draft=e.target.value;try{sessionStorage.setItem('brassbound:entry:'+session?.userId,draft);}catch{}}});
 document.addEventListener('submit',async e=>{
  if(!['crew-claim-form','crew-entry-form'].includes(e.target.id))return;e.preventDefault();if(busy)return;busy=true;
  const form=e.target,button=form.querySelector('button');button.disabled=true;button.textContent=form.id==='crew-entry-form'?'Publicando…':'Vinculando…';
  try{
   if(form.id==='crew-claim-form'){await api('claim','POST',{playerId:new FormData(form).get('player')});await boot();toast('Tu jugador está listo.');}
   else{await api('activity','POST',{id:entryId,text:draft,playerId:session.me.id});draft='';entryId=crypto.randomUUID();try{sessionStorage.removeItem('brassbound:entry:'+session?.userId);}catch{}await refreshGroup();toast('Entrada publicada.');}
  }catch(e){error=e.message;toast(error);}finally{busy=false;changed();}
 });
 window.addEventListener('online',()=>{if(session?.me)flush();else boot();});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 window.addEventListener('storage',e=>{if(e.key===cacheKey&&e.newValue){if(dirty){conflict=true;status='Cambios pendientes de revisar';chrome();}else boot();}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&ready&&!dirty&&!saving)boot();});
 setInterval(()=>{if(document.visibilityState==='visible'&&location.hash==='#crew'&&!draft&&!busy)refreshGroup();if(dirty&&!conflict)flush();},30000);
 return {boot,save,view,chrome,status:()=>status};
}
