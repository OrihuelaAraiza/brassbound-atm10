// WebGL playback of Ponder scenes recorded by the Cretania wiki. Scene files, block states,
// item models and textures are read from their public API when a scene is opened; nothing is copied.
import * as THREE from './vendor/three.module.js';
import {PONDER_API,TICKS_PER_SECOND,resolveText,sceneLookup,needsRemoteText,expandFrames,viewAt,fpt,chapterFrames,chapterTarget,formatClock,affine,lightLevel,frameScale,blockBuffers,meshBuffer,itemBuffers,boxBuffer,fluidTexture,textureUrl,iconUrl,itemNameKeys,mouseLabel,streamBox,argb,withLocalBlocks,LOCAL_TEXTURES} from './ponder-format.js';

const requests=new Map();
export function ponderFetch(path){
 if(!requests.has(path))requests.set(path,fetch(PONDER_API+path).then(r=>{if(!r.ok)throw new Error(`${path}: ${r.status}`);return r.json();}).catch(e=>{requests.delete(path);throw e;}));
 return requests.get(path);
}
const shared=()=>Promise.all([ponderFetch('estados.json'),ponderFetch('texturas.json'),ponderFetch('objetos-de-escena.json').catch(()=>({}))]);

const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
const textures=new Map(),materials=new Map(),repaint=new Set();
const loaded=()=>{for(const f of repaint)f();};
const missing=()=>{const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d');g.fillStyle='#777';g.fillRect(0,0,1,1);return c;};
function texture(id){
 let t=textures.get(id);
 if(!t){t=id?loader.load(LOCAL_TEXTURES[id]||textureUrl(id),loaded,undefined,()=>{t.image=missing();t.needsUpdate=true;loaded();}):new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1,1);return c;})());t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.colorSpace=THREE.SRGBColorSpace;textures.set(id,t);}
 return t;
}
// Minecraft lights items and moving parts from two fixed directions; block faces carry baked shading instead.
const vertexShader=`attribute vec4 tint;uniform float lit;varying vec2 vUv;varying vec4 vTint;varying float vShade;
void main(){vUv=uv;vTint=tint;vShade=1.0;
 if(lit>0.5){vec3 n=normalize(mat3(modelMatrix)*normal);float d=max(dot(n,normalize(vec3(0.2,1.0,-0.7))),0.0)+max(dot(n,normalize(vec3(-0.2,1.0,0.7))),0.0);vShade=min(1.0,0.4+0.6*d);}
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader=`uniform sampler2D atlas;uniform float light;uniform float cutoff;varying vec2 vUv;varying vec4 vTint;varying float vShade;
void main(){vec4 c=texture2D(atlas,vUv)*vTint;if(c.a<cutoff)discard;gl_FragColor=vec4(c.rgb*vShade*light,c.a);
#include <colorspace_fragment>
}`;
// behind: overlay boxes that share a plane with blocks (base plate shadow) yield to the block.
function material(tex,mode,shading,level,behind=false){
 const key=`${tex}|${mode}|${shading}|${level??15}|${behind}`;let m=materials.get(key);if(m)return m;
 const blend=mode==='translucido'||mode==='brillo';
 m=new THREE.ShaderMaterial({uniforms:{atlas:{value:texture(tex)},light:{value:mode==='brillo'?1:lightLevel(level)},cutoff:{value:mode==='solido'?-1:blend?.004:.1},lit:{value:shading==='lit'&&mode!=='brillo'?1:0}},vertexShader,fragmentShader,transparent:blend,depthWrite:!blend,side:mode==='solido'||mode==='recorte_una_cara'?THREE.FrontSide:THREE.DoubleSide,blending:mode==='brillo'?THREE.AdditiveBlending:THREE.NormalBlending,polygonOffset:behind,polygonOffsetFactor:behind?1:0,polygonOffsetUnits:behind?4:0});
 materials.set(key,m);return m;
}
const columnMajor=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const rad=d=>d*Math.PI/180;

class PonderScene{
 constructor(canvas,data){
  this.data=data;this.scene=data.scene;this.frames=expandFrames(this.scene.fotogramas);this.marks=chapterFrames(this.scene);this.fpt=fpt(this.scene);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.world=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,-1000,1000);this.camera.matrixAutoUpdate=false;this.camera.matrixWorldAutoUpdate=false;
  this.objects=new Array(this.scene.cosas.length);this.visible=new Set();this.templates=new Map();this.geometries=[];this.owned=[];this.overlays=[];
  this.frame=0;this.userPitch=0;this.userYaw=0;this.zoom=1;this.width=1;this.height=1;
 }
 get total(){return this.frames.length;}
 seek(frame){
  this.frame=Math.max(0,Math.min(this.total-1,frame|0));
  const next=new Set(),overlays=[];
  for(const i of this.frames[this.frame]||[]){const e=this.scene.cosas[i];if(!e)continue;if(e[0]==='r'||e[0]==='k'||e[0]==='q'){overlays.push(e);continue;}let o=this.objects[i];if(o===undefined)o=this.objects[i]=this.create(e);if(o){o.visible=true;next.add(o);}}
  for(const o of this.visible)if(!next.has(o))o.visible=false;
  this.visible=next;this.overlays=overlays;
 }
 build(buffers,shading,behind=false){
  const g=new THREE.Group();
  for(const [key,b] of buffers){
   if(!b.triangles)continue;const [tex,mode]=key.split('|');const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(b.position,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normal,3));geo.setAttribute('tint',new THREE.Float32BufferAttribute(b.tint,4));geo.computeBoundingSphere();this.geometries.push(geo);
   const mesh=new THREE.Mesh(geo,material(tex,mode,shading,15,behind));mesh.userData.look={tex,mode,shading,behind};if(mode==='translucido'||mode==='brillo')mesh.renderOrder=2;g.add(mesh);
  }
  return g;
 }
 template(key,make){if(!this.templates.has(key))this.templates.set(key,make());return this.templates.get(key);}
 instance(template,matrix,level){
  if(!template)return null;const o=template.clone();o.matrixAutoUpdate=false;o.matrix.set(...affine(matrix));
  o.traverse(m=>{const l=m.userData.look;if(m.isMesh&&l)m.material=material(l.tex,l.mode,l.shading,level,l.behind);});
  this.world.add(o);return o;
 }
 create(e){
  const {states,textures,items}=this.data,s=this.scene;
  try{switch(e[0]){
   case 'g':return this.instance(this.template('g'+e[1],()=>{const g=s.grupos[e[1]],list=[];for(let i=0;i+3<g.length;i+=4)list.push([s.estados[g[i]],g[i+1],g[i+2],g[i+3]]);return this.build(blockBuffers(list,states,textures),'flat');}),e[2],e[3]);
   case 'b':return this.instance(this.template('b'+e[1],()=>this.build(blockBuffers([[s.estados[e[1]],0,0,0]],states,textures),'flat')),e[2],e[3]);
   case 'm':return this.instance(this.template('m'+e[1],()=>{const m=s.mallas[e[1]];return this.build(new Map([[`${m.t}|${m.m}`,meshBuffer(m,textures)]]),'lit');}),e[2],e[3]);
   case 'o':return this.instance(this.template(`o${e[1]}|${e[4]}`,()=>{const parts=items[e[1]];return parts?this.build(itemBuffers(parts[e[4]]||parts.SUELO,textures,columnMajor),'lit'):null;}),e[2],e[3]);
   case 'c':{const [,tex,mode,matrix,box,uv,faces,color,level]=e,o=this.instance(this.build(new Map([[`${tex}|${mode}`,boxBuffer(box,uv,faces,color,frameScale(textures[tex]))]]),'flat',true),matrix,level);if(o&&(mode==='translucido'||argb(color)[3]<1))o.traverse(m=>{if(m.isMesh)m.renderOrder=3;});return o;}
   case 'f':{const [,fluid,matrix,box,color,level,full]=e,tex=fluidTexture(fluid);return this.instance(this.build(new Map([[`${tex}|translucido`,boxBuffer(box,[0,0,1,1],full?63:62,color,frameScale(textures[tex]))]]),'flat'),matrix,level);}
   case 'h':{const [,fluid,matrix,dir,radius,yMax,yMin,,color,level]=e,tex=fluidTexture(fluid);if(Math.abs(yMax-yMin)<1e-4)return null;return this.instance(this.build(new Map([[`${tex}|translucido`,boxBuffer(streamBox(dir,radius,yMax,yMin),[0,0,1,1],63,color,frameScale(textures[tex]))]]),'flat'),matrix,level);}
   // 'e' (entities such as the parrot in train scenes) carries no model data; it is skipped.
   case 't':{const [,raw,matrix,color,flat]=e,o=new THREE.Group();o.matrixAutoUpdate=false;o.matrix.set(...affine(matrix));o.add(this.label(this.data.text(raw),color,flat));this.world.add(o);return o;}
   default:return null;
  }}catch(err){console.warn('Ponder: elemento omitido',e[0],err);return null;}
 }
 label(text,color,flat){
  const px=4,canvas=document.createElement('canvas'),g=canvas.getContext('2d'),font=`${9*px}px Minecraft, monospace`;g.font=font;
  const w=Math.max(1,Math.ceil(g.measureText(text).width/px));canvas.width=w*px;canvas.height=10*px;g.font=font;g.textBaseline='top';const [r,gr,b]=argb(color);g.fillStyle=`rgb(${r*255},${gr*255},${b*255})`;g.fillText(text,0,0);
  const map=new THREE.CanvasTexture(canvas);map.magFilter=THREE.NearestFilter;map.colorSpace=THREE.SRGBColorSpace;
  if(!flat){const mat=new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}),sprite=new THREE.Sprite(mat);this.owned.push(map,mat);sprite.scale.set(w,10,1);sprite.renderOrder=4;return sprite;}
  const geo=new THREE.PlaneGeometry(w,10),mat=new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide,depthWrite:false});geo.translate(w/2,-5,0);geo.scale(1,-1,1);this.owned.push(geo,map,mat);
  const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=4;return mesh;
 }
 view(){
  const v=viewAt(this.scene.camara,this.frame),[px,pz,size]=this.scene.placa||[0,0,5],m=new THREE.Matrix4().makeRotationX(rad(-(v.pitch+this.userPitch)));
  m.multiply(new THREE.Matrix4().makeRotationY(rad(v.yaw+this.userYaw)));m.multiply(new THREE.Matrix4().makeTranslation(-size/2-px,-1+(this.scene.alturaExtra||0),-size/2-pz));
  return {matrix:m,blocks:Math.max(6,(size||5)*1.9)/(v.scale*this.zoom)};
 }
 resize(w,h){this.width=Math.max(1,w);this.height=Math.max(1,h);this.renderer.setSize(this.width,this.height,false);}
 draw(){
  const {matrix,blocks}=this.view(),half=blocks/2,halfH=Math.max(half*this.height/this.width,half*.6),c=this.camera;
  c.left=-half;c.right=half;c.top=halfH;c.bottom=-halfH;c.updateProjectionMatrix();c.matrixWorldInverse.copy(matrix);c.matrixWorld.copy(matrix).invert();this.viewMatrix=matrix;
  this.renderer.render(this.world,c);
 }
 project(p){if(!this.viewMatrix||!p)return null;const v=new THREE.Vector3(p[0],p[1],p[2]).applyMatrix4(this.viewMatrix).applyMatrix4(this.camera.projectionMatrix);return [(v.x+1)/2*this.width,(1-v.y)/2*this.height];}
 // Shared materials and API textures stay cached for the next scene.
 dispose(){for(const g of this.geometries)g.dispose();for(const o of this.owned)o.dispose();this.renderer.dispose();this.renderer.forceContextLoss?.();}
}

const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// root: the [data-ponder-player] section rendered by tutorial-player.js.
export function mountPonderPlayer(root,{path,translate=()=>undefined,name=id=>id,icon=null,autoplay=true}){
 const $=s=>root.querySelector(s),stage=$('[data-pd-stage]'),canvas=$('[data-pd-canvas]'),overlay=$('[data-pd-overlay]'),status=$('[data-pd-status]'),slider=$('[data-pd-time]'),clock=$('[data-pd-clock]'),play=$('[data-pd-action=play]'),titleEl=$('[data-pd-title]');
 let dead=false,player=null,playing=false,speed=1,acc=0,last=performance.now(),raf=0,dirty=true,visible=true,overlayKey='',remote=null,pointers=new Map(),lastPinch=0;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const setStatus=(text,retry)=>{status.hidden=!text;status.innerHTML=text?`<span>${esc(text)}</span>${retry?'<button type="button" data-pd-action="retry">Reintentar</button>':''}`:'';};
 const setPlaying=v=>{playing=v&&Boolean(player);root.classList.toggle('playing',playing);if(play){play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',playing?'Pausar escena':'Reproducir escena');play.setAttribute('aria-pressed',String(playing));}last=performance.now();};
 const itemName=id=>id.startsWith('minecraft:')?name(id):itemNameKeys(id).map(k=>remote?.[k]).find(Boolean)||id.split(':')[1].replace(/_/g,' ');
 const itemIcon=id=>id.startsWith('minecraft:')&&icon?icon(id):`<img class="item-icon" src="${esc(iconUrl(id))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
 function paintOverlays(){
  if(!player)return;const items=player.overlays,key=JSON.stringify(items.map(e=>e.filter((v,i)=>!(e[0]==='r'&&i===6||e[0]==='k'&&i===10||e[0]==='q'&&i===3))));
  if(key!==overlayKey){overlayKey=key;
   overlay.innerHTML=`<svg class="pd-lines" aria-hidden="true"></svg>`+items.map((e,i)=>{
    if(e[0]==='r')return `<div class="pd-note" data-pd-o="${i}" style="--pd-accent:#${((e[5]>>>0)&0xffffff).toString(16).padStart(6,'0')}">${esc(player.data.text(e[1]))}</div>`;
    if(e[0]==='k'){const [,,,mouse,item,keyName,text]=e;return `<div class="pd-input" data-pd-o="${i}">${mouse&&mouse!=='NINGUNO'?`<span class="pd-mouse">${esc(mouseLabel(mouse))}</span>`:''}${keyName?`<span class="pd-key">${esc(player.data.lookup(keyName))}</span>`:''}${item?`<span title="${esc(itemName(item))}">${itemIcon(item)}</span>`:''}${!item&&!keyName&&text?`<span class="pd-key">${esc(text)}</span>`:''}</div>`;}
    if(e[0]==='q')return `<div class="pd-recipe" data-pd-o="${i}">${e[1].startsWith('minecraft:')?`<button type="button" data-ws-item="${esc(e[1])}" title="Ver en el atlas">`:'<span>'}${itemIcon(e[1])}<span>${esc(itemName(e[1]))}</span>${e[1].startsWith('minecraft:')?'</button>':'</span>'}</div>`;
    return '';
   }).join('');
  }
  const svg=overlay.querySelector('.pd-lines'),lines=[];let stack=0;
  items.forEach((e,i)=>{const el=overlay.querySelector(`[data-pd-o="${i}"]`);if(!el)return;
   if(e[0]==='r'){const anchor=player.project(e[2]),top=anchor?Math.max(56,Math.min(player.height-96,anchor[1]-30)):64+stack++*64+(e[3]||0);el.style.top=`${top}px`;el.style.opacity=e[6]??1;
    if(anchor){const left=el.offsetLeft;lines.push(`<line x1="${anchor[0].toFixed(1)}" y1="${anchor[1].toFixed(1)}" x2="${left}" y2="${top+14}" stroke="#${((e[5]>>>0)&0xffffff).toString(16).padStart(6,'0')}" stroke-width="1.5" opacity="${e[6]??1}"/>`);}}
   else if(e[0]==='k'){const p=player.project(e[1]);el.hidden=!p;if(p){el.style.left=`${p[0]}px`;el.style.top=`${p[1]}px`;}el.style.opacity=e[10]??1;}
   else if(e[0]==='q')el.style.opacity=e[3]??1;
  });
  svg.innerHTML=lines.join('');
 }
 function paint(){
  if(!player)return;player.draw();paintOverlays();
  const total=player.total-1,seconds=player.frame/player.fpt/TICKS_PER_SECOND,end=total/player.fpt/TICKS_PER_SECOND;
  if(document.activeElement!==slider)slider.value=player.frame;slider.max=total;clock.textContent=`${formatClock(seconds)} / ${formatClock(end)}`;root.style.setProperty('--pd-progress',`${player.frame/Math.max(1,total)*100}%`);
 }
 function loop(now){
  if(dead)return;const dt=Math.min(.1,(now-last)/1000);last=now;
  if(player&&playing&&visible&&!document.hidden){acc+=dt*TICKS_PER_SECOND*player.fpt*speed;const step=Math.floor(acc);if(step>0){acc-=step;player.seek(Math.min(player.total-1,player.frame+step));dirty=true;if(player.frame>=player.total-1)setPlaying(false);}}
  if(dirty&&visible){dirty=false;paint();}
  raf=requestAnimationFrame(loop);
 }
 const onTexture=()=>{dirty=true;};repaint.add(onTexture);
 const resize=()=>{if(!player)return;player.resize(stage.clientWidth,stage.clientHeight);dirty=true;};
 const observer=new ResizeObserver(resize),seen=new IntersectionObserver(es=>{visible=es[0]?.isIntersecting??true;if(visible)dirty=true;});observer.observe(stage);seen.observe(stage);
 async function load(){
  setStatus('Cargando escena desde la wiki de Cretania…');
  try{
   const [scene,[states,texMeta,items]]=await Promise.all([ponderFetch(`ponder/${path}.json`),shared(),document.fonts?.load?.('36px Minecraft').catch(()=>{})]);
   if(dead)return;
   const local={es:k=>translate(k,'es_es'),en:k=>translate(k,'en_us')};
   const wantsRemote=needsRemoteText(scene,local)||scene.cosas.some(e=>e[0]==='k'&&(e[5]||(e[4]||'').startsWith('cretania:'))||e[0]==='q'&&!e[1].startsWith('minecraft:'));
   if(wantsRemote)remote=await ponderFetch('idiomas/es_es.json').catch(()=>null);
   if(dead)return;
   const lookup=sceneLookup(scene,{...local,remote});
   try{player=new PonderScene(canvas,{scene,states:withLocalBlocks(states,scene.estados),textures:texMeta,items,lookup,text:raw=>resolveText(raw,lookup)});}catch{setStatus('Tu navegador no permite gráficos 3D (WebGL).');return;}
   if(titleEl)titleEl.textContent=player.data.text(scene.titulo)||titleEl.textContent;
   const marks=$('[data-pd-marks]');if(marks)marks.innerHTML=player.marks.map(m=>`<span style="left:${m/Math.max(1,player.total-1)*100}%"></span>`).join('');
   setStatus('');player.seek(0);resize();setPlaying(autoplay&&!reduced);
  }catch{if(!dead)setStatus('No se pudo cargar la escena desde la wiki de Cretania. Revisa tu conexión o inténtalo más tarde.',true);}
 }
 const chapter=dir=>{if(!player)return;player.seek(chapterTarget(player.marks,player.frame,dir,player.total,player.fpt));dirty=true;};
 const zoomBy=f=>{if(!player)return;player.zoom=Math.max(.5,Math.min(3,player.zoom*f));dirty=true;};
 const onClick=e=>{const b=e.target.closest('[data-pd-action]');if(!b)return;const a=b.dataset.pdAction;
  if(a==='play'){if(player&&player.frame>=player.total-1){player.seek(0);dirty=true;}setPlaying(!playing);}
  if(a==='prev')chapter(-1);if(a==='next')chapter(1);
  if(a==='restart'&&player){player.seek(0);setPlaying(false);dirty=true;}
  if(a==='view'&&player){player.userPitch=player.userYaw=0;player.zoom=1;dirty=true;}
  if(a==='zoom-in')zoomBy(1.2);if(a==='zoom-out')zoomBy(1/1.2);
  if(a==='fullscreen'){if(document.fullscreenElement)document.exitFullscreen?.();else root.requestFullscreen?.().catch(()=>{});}
  if(a==='retry')load();
 };
 const onInput=e=>{if(e.target===slider&&player){setPlaying(false);player.seek(Number(slider.value));dirty=true;}else if(e.target.dataset.pdSpeed!==undefined)speed=Number(e.target.value)||1;};
 const onKey=e=>{if(e.target!==stage&&e.target!==canvas)return;if(e.key===' '){e.preventDefault();onClick({target:play});}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();chapter(e.key==='ArrowLeft'?-1:1);}};
 const down=e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture?.(e.pointerId);lastPinch=0;};
 const move=e=>{const prev=pointers.get(e.pointerId);if(!prev||!player)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(lastPinch)zoomBy(d/lastPinch);lastPinch=d;return;}
  player.userYaw+=(e.clientX-prev[0])*.5;player.userPitch=Math.max(-55,Math.min(55,player.userPitch-(e.clientY-prev[1])*.5));dirty=true;};
 const up=e=>{pointers.delete(e.pointerId);lastPinch=0;};
 // Plain wheel keeps scrolling the page; Ctrl/⌘ + wheel and trackpad pinch zoom.
 const wheel=e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoomBy(e.deltaY<0?1.1:1/1.1);};
 root.addEventListener('click',onClick);root.addEventListener('input',onInput);root.addEventListener('change',onInput);stage.addEventListener('keydown',onKey);
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
 raf=requestAnimationFrame(loop);load();
 return {dispose(){dead=true;repaint.delete(onTexture);cancelAnimationFrame(raf);observer.disconnect();seen.disconnect();root.removeEventListener('click',onClick);root.removeEventListener('input',onInput);root.removeEventListener('change',onInput);stage.removeEventListener('keydown',onKey);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);player?.dispose();player=null;},get playing(){return playing;},get frame(){return player?.frame??0;}};
}
