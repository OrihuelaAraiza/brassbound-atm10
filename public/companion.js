const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const atlasCategories = {all:'Todos',create:'Create y addons',tech:'Tecnología',magic:'Magia',storage:'Almacenamiento',resources:'Recursos',exploration:'Exploración',building:'Construcción',utility:'Utilidades',library:'Librerías',performance:'Rendimiento',shader:'Shaders'};
export const normalizeSearch = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterAtlas(atlas,{query='',category='all',scope='all',favorites={}}={}) {
 const q=normalizeSearch(query);
 return atlas.filter(m=>(category==='all'||m.category===category)&&(scope!=='saved'||favorites[m.id])&&(scope!=='guides'||m.detailLevel==='guide')&&(scope!=='play'||(m.detailLevel!=='support'&&!['library','performance','shader'].includes(m.category)))&&(!q||normalizeSearch([m.name,m.id,m.summary,m.category,...(m.related||[])].join(' ')).includes(q)));
}
const gears = (x,y,r=28,cls='spin')=>`<g transform="translate(${x} ${y})"><g class="${cls}"><circle r="${r}" fill="#c5a568" stroke="#f7dc9c" stroke-width="2"/><circle r="${r-8}" fill="#15364a" stroke="#e4c891"/>${Array.from({length:12},(_,i)=>`<path transform="rotate(${i*30})" d="M-5 -${r-3}v-9h10v9" fill="#c5a568" stroke="#f7dc9c"/>`).join('')}<path d="M-${r-9} 0H${r-9}M0 -${r-9}V${r-9}" stroke="#d6bd87" stroke-width="6"/><circle r="7" fill="#15364a" stroke="#e9d3a3" stroke-width="3"/></g></g>`;
const label=(x,y,text)=>{const words=String(text).split(' '),lines=[''];for(const word of words){if((lines.at(-1)+' '+word).length>23&&lines.at(-1))lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}return `<text class="diagram-label" x="${x}" y="${y}" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>`;};
const flow=(d,i=0)=>`<path d="${d}" class="connection"/><path d="${d}" class="scene-flow" style="animation-delay:-${i*.6}s" marker-end="url(#flow-arrow)"/>`;
export function sceneFigure(scene,icons={},names=id=>id.split(':').pop().replaceAll('_',' '),compact=false){
 const type=scene.id==='create-stress'?'workflow':scene.type||'workflow';
 const img=(id,x,y,size=62)=>icons[id]?`<image href="${esc(icons[id])}" x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" class="scene-item"/>`:`<rect x="${x-22}" y="${y-22}" width="44" height="44" rx="5" fill="#23495e" stroke="#a4bec3"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#c8d6d5" font-size="10">${esc(id?.split(':')[0]||'')}</text>`;
 const node=(id,x,y,n,title)=>`<g class="scene-node" data-reveal="${n}"><rect x="${x-45}" y="${y-41}" width="90" height="86" rx="5" class="node-frame"/>${img(id,x,y)}<circle cx="${x-40}" cy="${y-39}" r="11" fill="#dbc38b"/><text x="${x-40}" y="${y-35}" text-anchor="middle" fill="#213b46" font-size="10">${n+1}</text>${label(x,y+63,title||names(id))}</g>`;
 let drawing='';
 if(type==='waterwheel')drawing=`<path d="M32 70H125V228H218" stroke="#48bad4" stroke-width="25" opacity=".18" fill="none"/>${flow('M32 70H125V228H218')}<g transform="translate(170 155)"><g class="spin wheel"><circle r="59" fill="#7c674455" stroke="#d3ba85" stroke-width="8"/><circle r="38" fill="none" stroke="#d3ba85" stroke-width="4"/>${Array.from({length:8},(_,i)=>`<path transform="rotate(${i*45})" d="M0 -8V-63M-16 -54H16" stroke="#dbbd80" stroke-width="8"/>`).join('')}<circle r="10" fill="#e5c78c"/></g></g><path d="M180 155H350" stroke="#95bac3" stroke-width="12"/>${gears(270,155,23)}${node('create:mechanical_press',405,155,2,'Máquina conectada')}${label(85,48,'Agua en movimiento')}${label(170,255,'Rueda hidráulica')}${label(290,205,'Eje · giro')}`;
 else if(type==='gears')drawing=`<path d="M75 145H170M250 145H425" stroke="#8fb7c0" stroke-width="11"/>${gears(180,145,55)}${gears(270,145,28,'spin reverse fast')}${label(180,246,'Engranaje grande')}${label(322,246,'Engranaje pequeño')}${label(180,66,'Entrada')}${label(340,92,'Salida: giro inverso')}${flow('M390 180V212H435')}`;
 else if(['press','mixer','crushing','fan','belt','assembly'].includes(type)){
  const heated=scene.id==='create-brass';
  const left=type==='mixer'?(heated?'minecraft:copper_ingot':'minecraft:andesite'):type==='fan'?'minecraft:gravel':type==='crushing'?'minecraft:raw_iron':type==='assembly'?'create:golden_sheet':'minecraft:iron_ingot';
  const right=type==='belt'?'minecraft:iron_ingot':type==='mixer'?(heated?'create:brass_ingot':'create:andesite_alloy'):type==='fan'?'minecraft:iron_nugget':type==='crushing'?'create:crushed_raw_iron':type==='assembly'?'create:precision_mechanism':'create:iron_sheet';
  const inputs=type==='mixer'?`${img(left,75,156,43)}${img(heated?'create:zinc_ingot':'minecraft:iron_nugget',75,209,43)}`:img(left,65,185,47);
  drawing=`<path d="M70 246H450" stroke="#a5bcc2" stroke-width="4"/><path d="M104 214H406" stroke="#0f2635" stroke-width="25"/><path d="M104 214H406" stroke="#7d9ca5" stroke-width="2" stroke-dasharray="8 9" class="scene-flow"/>${flow('M100 180H205')}${flow('M310 180H407',1)}${inputs}${img(right,445,185,50)}`;
  if(type==='press')drawing+=`<path d="M220 82H290V127H220Z" fill="#536b6e" stroke="#c4d4cf" stroke-width="2"/><path d="M254 40V82" stroke="#c5b884" stroke-width="10"/>${gears(254,57,21)}<g class="press-motion"><path d="M250 123V164" stroke="#a9bfc0" stroke-width="11"/><path d="M229 161H279V178H229Z" fill="#b9c8bd" stroke="#eddfae"/></g><path d="M228 220H280V239H228Z" fill="#586c6a" stroke="#b6cac3"/>${img(left,255,207,33)}${label(255,273,'Prensa sobre depósito')}`;
  if(type==='mixer')drawing+=`<path d="M218 78H292V112H218Z" fill="#45616a" stroke="#b6cbd1"/><path d="M255 111V173" stroke="#e0d6a6" stroke-width="8"/><g transform="translate(255 171)"><g class="spin"><ellipse rx="23" ry="9" fill="none" stroke="#f2dfaa" stroke-width="5"/><path d="M-20 0H20M0-10V10" stroke="#f2dfaa" stroke-width="3"/></g></g><path d="M215 177L223 218H287L295 177Z" fill="#5c7780" stroke="#b3c9cb" stroke-width="2"/><path d="M222 184H288" stroke="#c6b66b" stroke-width="9"/>${heated?img('create:blaze_burner',255,251,55):''}${label(255,heated?296:263,heated?'Cubeta + calor para latón':'Cubeta · mezcla sin calor')}`;
  if(type==='crushing')drawing=`${img(left,265,39,40)}${flow('M265 61V112')}${flow('M265 181V222')}${img(right,265,251,43)}`;
  if(type==='crushing')drawing+=`${gears(225,135,35)}${gears(305,135,35,'spin reverse')}${label(395,148,'Giro hacia el centro')}${label(265,300,'Salida inferior')}`;
  if(type==='fan')drawing+=`${gears(210,158,30)}<path d="M261 124V202" stroke="#61cae8" stroke-width="18" opacity=".6"/>${flow('M250 149H355',2)}${flow('M250 165H355',3)}${label(218,86,'Ventilador')}${label(279,110,'Agua')}${label(315,274,'Lavado · resultado aleatorio')}`;
  if(type==='belt')drawing+=`${node('create:andesite_funnel',160,127,1,'Entrada')}${node('minecraft:chest',365,120,2,'Salida')}<g class="belt-parcel">${img('minecraft:iron_ingot',184,194,35)}</g>${gears(111,214,13)}${gears(405,214,13)}${label(260,278,'Correa y ejes alineados')}`;
  if(type==='assembly')drawing+=`${img('create:deployer',184,123,68)}${img('create:deployer',270,123,68)}${img('create:deployer',356,123,68)}<g class="belt-parcel">${img('create:golden_sheet',184,194,35)}</g>${label(270,77,'Desplegadores · repetir secuencia')}${label(270,278,'5 ciclos · salida aleatoria')}`;
 }else if(type==='steam')drawing=`${node('create:blaze_burner',90,215,0,'Calor')}${flow('M128 194L212 149')}${node('create:fluid_tank',259,134,1,'Caldera')}${node('create:mechanical_pump',90,70,1,'Agua continua')}${flow('M130 82L215 120',1)}${flow('M307 135H365',2)}${node('create:steam_engine',412,134,2,'Motor')}${gears(412,243,24)}`;
 else if(type==='train')drawing=`<path d="M50 211H474M50 233H474" stroke="#a7c0bb" stroke-width="5"/>${Array.from({length:18},(_,i)=>`<path d="M${60+i*23} 204V241" stroke="#99815c" stroke-width="5"/>`).join('')}<g class="train-motion"><path d="M148 155H278V207H148Z M169 155V118H231V155" fill="#6b7e73" stroke="#d6d5b3" stroke-width="2"/><path d="M181 130H218V155H181Z" fill="#24495b" stroke="#cccaab"/>${gears(175,207,16)}${gears(251,207,16)}</g>${img('create:track_station',405,156,65)}${label(255,280,'Vías · estación · ensamblaje')}`;
 else {
  const nodes=scene.diagram?.nodes||(scene.items||[]).slice(0,4).map(itemId=>({itemId,label:names(itemId)}));
  const connections=scene.diagram?.connections||nodes.slice(1).map((_,i)=>({from:i,to:i+1}));
  let positions=nodes.length===4?[[65,145],[192,145],[319,145],[446,145]]:[[85,145],[255,145],[425,145]];
  if(nodes.length===4&&connections.some(c=>c.from===3&&c.to===1))positions=[[70,95],[255,95],[440,95],[255,235]];
  if(scene.id==='ars-apparatus')positions=[[75,115],[255,115],[255,245],[435,115]];
  drawing=connections.map((c,i)=>{const a=positions[c.from],b=positions[c.to];if(!a||!b)return '';const vertical=a[0]===b[0];const sx=a[0]+(vertical?0:Math.sign(b[0]-a[0])*47),sy=a[1]+(vertical?Math.sign(b[1]-a[1])*45:0),tx=b[0]+(vertical?0:Math.sign(a[0]-b[0])*47),ty=b[1]+(vertical?Math.sign(a[1]-b[1])*45:0);return flow(`M${sx} ${sy}L${tx} ${ty}`,i);}).join('')+nodes.map((n,i)=>node(n.itemId,positions[i][0],positions[i][1],i,n.label)).join('');
  if(['ars','ma','powah'].includes(type))drawing+=`<ellipse cx="255" cy="145" rx="78" ry="75" stroke="#e5c685" fill="none" opacity=".25" stroke-dasharray="5 12" class="aura"/><circle cx="255" cy="145" r="67" stroke="#dcc68b" fill="none" opacity=".3" class="energy-pulse"/>`;

 }
 return `<svg viewBox="0 0 510 315" class="scene-diagram ${compact?'compact':''}" role="img" aria-label="Esquema animado: ${esc(scene.title)}"><defs><marker id="flow-${esc(scene.id)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m0 1 9 4-9 4" fill="none" stroke="#e9ce92" stroke-width="1.5"/></marker></defs>${drawing.replaceAll('url(#flow-arrow)',`url(#flow-${esc(scene.id)})`)}</svg>`;
}
export function mountScenePlayer(root,scene,{onStep=()=>{},onComplete=()=>{}}={}){
 if(!root?.querySelector)return ()=>{};
 let timer=null,playing=false,progress=0,speed=1,last=0,step=0,disposed=false;
 const stage=root.querySelector('.scene-stage'),slider=root.querySelector('[data-scene-timeline]'),play=root.querySelector('[data-scene-play]');
 const duration=Math.max(1,scene.steps.length)*6;
 function update(){
  step=Math.min(scene.steps.length-1,Math.floor(progress/6));stage.dataset.step=step;
  root.querySelectorAll('[data-lesson-step]').forEach(b=>{const active=Number(b.dataset.lessonStep)===step;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false');});
  root.querySelector('[data-step-title]').textContent=scene.steps[step]?.title||'';
  root.querySelector('[data-step-text]').textContent=scene.steps[step]?.text||'';
  root.querySelector('[data-step-counter]').textContent=`${step+1} / ${scene.steps.length}`;
  slider.value=progress;slider.max=duration;slider.setAttribute('aria-valuetext',`Paso ${step+1}: ${scene.steps[step]?.title}`);
  root.querySelector('[data-scene-clock]').textContent=`${Math.floor(progress)} / ${duration} s`;
  stage.style.setProperty('--scene-speed',`${3/speed}s`);onStep(step);
 }
 function setPlaying(value){playing=value;stage.classList.toggle('playing',playing);play.textContent=playing?'Ⅱ Pausar':'▶ Reproducir';play.setAttribute('aria-pressed',String(playing));}
 const click=e=>{const b=e.target.closest('button');if(!b||!root.contains(b))return;if(b.hasAttribute('data-scene-play')){if(progress>=duration)progress=0;setPlaying(!playing);}if(b.hasAttribute('data-scene-restart')){progress=0;setPlaying(false);}if(b.dataset.lessonStep!==undefined){progress=Number(b.dataset.lessonStep)*6;setPlaying(false);}if(b.dataset.sceneNext){progress=Math.min(duration-.01,Math.max(0,(step+Number(b.dataset.sceneNext))*6));setPlaying(false);}update();};
 const input=e=>{if(e.target===slider){progress=Number(slider.value);setPlaying(false);update();}if(e.target.matches('[data-scene-speed]')){speed=Number(e.target.value);update();}};
 const visibility=()=>{if(document.hidden)setPlaying(false);};
 root.addEventListener('click',click);root.addEventListener('input',input);document.addEventListener('visibilitychange',visibility);
 last=Date.now();timer=setInterval(()=>{const now=Date.now(),dt=Math.min(.5,(now-last)/1000);last=now;if(!playing||disposed)return;progress=Math.min(duration,progress+dt*speed);if(progress>=duration){setPlaying(false);onComplete();}update();},100);
 update();return ()=>{disposed=true;clearInterval(timer);root.removeEventListener('click',click);root.removeEventListener('input',input);document.removeEventListener('visibilitychange',visibility);};
}
