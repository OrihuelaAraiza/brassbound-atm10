export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const finite = (value, fallback=0, min=0, max=1e9) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeEntries = value => Object.entries(record(value)).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)).slice(0,2000);
export function cleanWorkspace(value={}) {
 const w=record(value);
 return {
  activeProject:typeof w.activeProject==='string'?w.activeProject.slice(0,120):'starter-workshop',
  projectStatus:Object.fromEntries(safeEntries(w.projectStatus).filter(([,v])=>['active','planned','complete'].includes(v))),
  projectNotes:Object.fromEntries(safeEntries(w.projectNotes).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,v.slice(0,10000)])),
  milestones:Object.fromEntries(safeEntries(w.milestones).map(([k,v])=>[k,v===true])),
  pins:Object.fromEntries(safeEntries(w.pins).filter(([k,v])=>['recipe','blueprint','project'].includes(k)&&typeof v==='string').map(([k,v])=>[k,v.slice(0,250)])),
  production:Object.fromEntries(safeEntries(w.production).filter(([,v])=>typeof v==='string'||(typeof v==='number'&&Number.isFinite(v))).map(([k,v])=>[k,typeof v==='string'?v.slice(0,250):v])),
  chapters:Object.fromEntries(safeEntries(w.chapters).map(([k,v])=>[k,Array.isArray(v)?v.filter(x=>x&&typeof x.title==='string'&&Number.isFinite(Number(x.start))).slice(0,50).map(x=>({title:x.title.slice(0,120),start:finite(x.start,0,0,86400)})):[]]))
 };
}
export function mergeWorkspace(oldValue,newValue) {
 const a=cleanWorkspace(oldValue),b=cleanWorkspace(newValue);
 return {...a,projectStatus:{...b.projectStatus,...a.projectStatus},projectNotes:{...b.projectNotes,...a.projectNotes},milestones:{...a.milestones,...Object.fromEntries(Object.entries(b.milestones).filter(([,v])=>v))},pins:{...b.pins,...a.pins},production:{...b.production,...a.production},chapters:{...b.chapters,...a.chapters}};
}
export const projectKey=(id,step)=>`project:${id}:${step}`;
export function projectProgress(project,tasks={}) {
 const total=project.steps.length, done=project.steps.filter(s=>tasks[projectKey(project.id,s.id)]).length;
 return {done,total,percent:total?Math.round(done/total*100):0,next:project.steps.find(s=>!tasks[projectKey(project.id,s.id)])};
}
export function milestoneState(node,nodes,state) {
 const done=n=>Boolean(state.workspace?.milestones[n.id]||(n.checks?.length&&n.checks.every(k=>state.tasks[k])));
 if(done(node))return 'complete';
 const missing=(node.requires||[]).filter(id=>{const parent=nodes.find(n=>n.id===id);return !parent||!done(parent);});
 return missing.length?'needs':'ready';
}
export function materialList(blueprint) {
 if(blueprint.materials?.length)return blueprint.materials;
 const out=new Map();for(const b of blueprint.blocks||[])if(b.id!=='minecraft:air'&&b.role!=='fluid')out.set(b.id,(out.get(b.id)||0)+1);
 return [...out].map(([id,count])=>({id,count}));
}
// Share stock and deterministic batch surplus across every component of a project.
export function projectProcurement(materials,engine,state) {
 const stock={...state.inventory},out=new Map(),warnings=new Set();
 for(const material of materials){
  const plan=engine.plan(material.id,material.count,{inventory:stock,preferences:state.preferences,selections:state.selections});
  for(const [id,count]of Object.entries(plan.used))stock[id]=Math.max(0,(stock[id]||0)-count);
  for(const [id,count]of Object.entries(plan.surplus))stock[id]=(stock[id]||0)+count;
  for(const leaf of plan.leaves){const key=(leaf.kind==='fluid'?'fluid:':'')+leaf.id;const old=out.get(key);out.set(key,{...leaf,count:leaf.count+(old?.count||0)});}
  for(const warning of plan.warnings)warnings.add(warning);
 }
 return {materials:[...out.values()],warnings:[...warnings]};
}
export function evaluateFormula(expression,variables) {
 if(typeof expression==='number')return expression;
 if(typeof expression==='string'){if(!Object.hasOwn(variables,expression))throw new Error('Variable de fórmula desconocida: '+expression);return variables[expression];}
 if(!expression||!Array.isArray(expression.args))throw new Error('Fórmula incompleta');
 const a=expression.args.map(x=>evaluateFormula(x,variables));
 switch(expression.op){case 'add':return a.reduce((x,y)=>x+y,0);case 'sub':return a[0]-a[1];case 'mul':return a.reduce((x,y)=>x*y,1);case 'div':return a[0]/a[1];case 'min':return Math.min(...a);case 'max':return Math.max(...a);case 'ceil':return Math.ceil(a[0]);case 'floor':return Math.floor(a[0]);case 'round':return Math.round(a[0]);case 'pow':return Math.pow(a[0],a[1]);case 'log2':return Math.log2(a[0]);default:throw new Error('Operación no admitida');}
}
export function estimateProduction(process,options={}) {
 const rpm=finite(options.rpm,32,0,256),tps=finite(options.tps,20,1,20),uptime=finite(options.uptime,90,1,100)/100,target=finite(options.target,60,.01,1e7);
 const batch=finite(options.batch,1,1,process.timing?.batchInputRange?.[1]||1);
 const manual=Boolean(options.manual||!process.formula);
 const cycleTicks=manual?finite(options.seconds,0,0,86400)*20:evaluateFormula(process.formula,{rpm,batch,ticks:process.timing?.recipeProcessingTime||100});
 const minRpm=process.timing?.minRpm||1;
 if((!manual&&rpm<minRpm)||!Number.isFinite(cycleTicks)||cycleTicks<=0)return {error:manual?'Introduce la duración de un lote medida a 20 TPS.':`Este proceso necesita al menos ${minRpm} RPM.`,manual};
 const output=process.outputs[0];
 const matching=process.outputs.filter(o=>o.id===output.id),yieldPerCycle=matching.reduce((n,o)=>n+o.count*(o.chance??1),0)*batch;
 const cyclesPerMinute=tps*60/cycleTicks*uptime,perMachine=cyclesPerMinute*yieldPerCycle,machines=Math.ceil(target/perMachine);
 const targetCycles=target/yieldPerCycle;
 const su=process.stress?machines*rpm*process.stress.suPerRpmPerMachine*process.stress.machineCount:null;
 const energyPerMinute=process.energy?.fePerBatch==null?null:targetCycles*process.energy.fePerBatch;
 return {manual,rpm,tps,uptime,batch,target,cycleTicks,seconds:cycleTicks/tps,perMachine,machines,capacity:perMachine*machines,su,energyPerMinute,probabilistic:matching.some(o=>(o.chance??1)<1),inputs:(process.inputs||[]).map(i=>({...i,perMinute:i.count*batch*targetCycles})),availableSU:finite(options.availableSU,0),overloaded:su!==null&&finite(options.availableSU,0)>0&&su>finite(options.availableSU,0)};
}
const palette={power:['#d9ba74','#b19250','#8c713b'],machine:['#a8c5c5','#728f95','#4b6b77'],storage:['#cba77c','#9b754e','#775a3f'],input:['#b1c89f','#77996e','#54724f'],output:['#dbc69b','#ae9360','#7d6c46'],structure:['#a0a49a','#70796f','#515b56'],fluid:['#71c4d8','#4e95b2','#356a87']};
export function blueprintSVG(blueprint,icons={},options={}) {
 const blocks=blueprint.blocks||[];if(!blocks.length)return '<p class="muted">Plano sin bloques.</p>';
 const rotation=((Number(options.rotation)||0)%4+4)%4,cut=options.layer??Infinity,exploded=options.exploded?1.45:1,zoom=finite(options.zoom,1,.6,1.7);
 const angle=rotation*Math.PI/2,cos=Math.round(Math.cos(angle)),sin=Math.round(Math.sin(angle));
 const project=(x,y,z)=>{const a=x*cos-z*sin,b=x*sin+z*cos;return [(a-b)*32,(a+b)*16-y*32*exploded];};
 const all=blocks.flatMap(b=>[[b.x,b.y,b.z],[b.x+1,b.y,b.z],[b.x,b.y+1,b.z],[b.x,b.y,b.z+1],[b.x+1,b.y+1,b.z+1]].map(p=>project(...p)));
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(660/Math.max(100,maxX-minX),360/Math.max(100,maxY-minY))*zoom,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const screen=(x,y,z)=>{const p=project(x,y,z);return [390+(p[0]-cx)*scale,235+(p[1]-cy)*scale];};
 const poly=pts=>pts.map(p=>screen(...p).map(x=>x.toFixed(2)).join(',')).join(' ');
 const minZ=Math.min(...blocks.map(b=>b.z)),maxZ=Math.max(...blocks.map(b=>b.z))+1,wx=Math.min(...blocks.map(b=>b.x)),ex=Math.max(...blocks.map(b=>b.x))+1;
 let grid='';for(let x=wx-1;x<=ex;x++)for(let z=minZ-1;z<=maxZ;z++)grid+=`<polygon points="${poly([[x,0,z],[x+1,0,z],[x+1,0,z+1],[x,0,z+1]])}" fill="none" stroke="#a3c5ce" stroke-opacity=".12" stroke-width=".8"/>`;
 const order=blocks.map((b,index)=>({...b,index})).filter(b=>b.y<=cut).sort((a,b)=>{const depth=p=>(p.x*cos-p.z*sin)+(p.x*sin+p.z*cos)+p.y*.05;return depth(a)-depth(b)||a.y-b.y;});
 const cubes=order.map(b=>{
  const {x,y,z}=b,c=palette[b.role]||palette.machine,top=[[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]];
  // Choose only the two faces visible from the current camera quadrant.
  const faces=[];const cameraX=cos+sin,cameraZ=cos-sin;
  faces.push(cameraX>=0?[[x+1,y,z],[x+1,y,z+1],[x+1,y+1,z+1],[x+1,y+1,z]]:[[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]]);
  faces.push(cameraZ>=0?[[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]]:[[x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z]]);
  const point=screen(x+.5,y+.75,z+.5),size=Math.min(39,31*scale),selected=Number(options.selected)===b.index;
  const axis=b.axis||(['east','west'].includes(b.facing)?'x':['north','south'].includes(b.facing)?'z':['up','down'].includes(b.facing)?'y':'');
  const direction={east:[1,0,0],west:[-1,0,0],north:[0,0,-1],south:[0,0,1],up:[0,1,0],down:[0,-1,0]}[b.facing];
  let axisLine='';if(axis){const delta=axis==='x'?[.6,0,0]:axis==='z'?[0,0,.6]:[0,.6,0],a=screen(x+.5-delta[0],y+.5-delta[1],z+.5-delta[2]),d=screen(x+.5+delta[0],y+.5+delta[1],z+.5+delta[2]);axisLine=`<path d="M${a.join(' ')}L${d.join(' ')}" stroke="#f7df8b" stroke-width="${Math.max(2,scale*2)}" opacity=".8"/>`;}
  if(direction){const a=screen(x+.5,y+1.15,z+.5),d=screen(x+.5+direction[0]*.7,y+1.15+direction[1]*.7,z+.5+direction[2]*.7);axisLine+=`<path d="M${a.join(' ')}L${d.join(' ')}" stroke="#fff2ac" stroke-width="2" marker-end="url(#blueprint-direction)"/>`;}
  return `<g tabindex="0" role="button" aria-label="${html(b.label||b.id)}; X ${x}, Y ${y}, Z ${z}${b.facing?', orientación '+b.facing:''}" data-ws-block="${b.index}" class="voxel ${selected?'selected':''}" opacity="${b.role==='fluid'?'.58':'1'}"><title>${html(b.label||b.id)} · ${x}, ${y}, ${z}</title><polygon points="${poly(faces[0])}" fill="${c[2]}"/><polygon points="${poly(faces[1])}" fill="${c[1]}"/><polygon points="${poly(top)}" fill="${c[0]}"/>${icons[b.id]?`<image href="${html(icons[b.id])}" x="${point[0]-size/2}" y="${point[1]-size/2}" width="${size}" height="${size}" pointer-events="none"/>`:''}${axisLine}</g>`;
 }).join('');
 const origin=screen(wx,0,minZ);return `<svg viewBox="0 0 780 480" class="blueprint-3d" aria-label="Plano tridimensional por capas: ${html(blueprint.title)}" role="group"><defs><marker id="blueprint-direction" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#fff2ac"/></marker></defs>${grid}${cubes}<text x="20" y="451" class="bp-axis">X este · Y altura · Z sur</text><text x="760" y="451" text-anchor="end" class="bp-axis">${rotation*90}° · ${Number.isFinite(cut)?'hasta Y '+cut:'todas las capas'}</text></svg>`;
}
