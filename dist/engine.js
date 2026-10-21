import {cleanWorkspace} from './workshop-model.js';
// Calculations operate on the pinned static catalogue, never the server inventory.
export const clampCount = n => Math.min(1000000, Math.max(0, Math.floor(Number(n) || 0)));
export function createEngine(recipes, tags={}) {
 const byId=new Map(recipes.map(r=>[r.id,r]));
 const byOutput=new Map();
 for(const r of recipes){if(!r.output?.id || !r.ingredients?.length)continue;const key=r.output.id; if(!byOutput.has(key))byOutput.set(key,[]);byOutput.get(key).push(r);}
 function tagItems(tag,seen=new Set()){
  if(seen.has(tag))return [];const next=new Set(seen).add(tag);
  return [...new Set((tags[tag]||[]).flatMap(v=>{const id=typeof v==='string'?v:v.id;return id?.startsWith('#')?tagItems(id.slice(1),next):id?[id]:[];}))];
 }
 const conventional={
  'minecraft:planks':'minecraft:oak_planks','minecraft:logs':'minecraft:oak_log','minecraft:logs_that_burn':'minecraft:oak_log','minecraft:wooden_slabs':'minecraft:oak_slab','minecraft:wooden_fences':'minecraft:oak_fence',
  'c:stripped_logs':'minecraft:stripped_oak_log','c:stripped_woods':'minecraft:stripped_oak_wood','c:ingots/iron':'minecraft:iron_ingot','c:ingots/copper':'minecraft:copper_ingot','c:ingots/gold':'minecraft:gold_ingot','c:ingots/zinc':'create:zinc_ingot','c:ingots/brass':'create:brass_ingot',
  'c:nuggets/iron':'minecraft:iron_nugget','c:nuggets/gold':'minecraft:gold_nugget','c:nuggets/zinc':'create:zinc_nugget','c:nuggets/brass':'create:brass_nugget','c:plates/iron':'create:iron_sheet','c:plates/gold':'create:golden_sheet','c:plates/copper':'create:copper_sheet','c:plates/brass':'create:brass_sheet','c:storage_blocks/iron':'minecraft:iron_block','c:storage_blocks/copper':'minecraft:copper_block','c:storage_blocks/gold':'minecraft:gold_block','c:glass_blocks':'minecraft:glass','c:glass_blocks/colorless':'minecraft:glass','c:netherracks':'minecraft:netherrack','c:slimeballs':'minecraft:slime_ball','c:stones':'minecraft:stone','c:cobblestones':'minecraft:cobblestone','c:strings':'minecraft:string','c:leathers':'minecraft:leather','c:dusts/redstone':'minecraft:redstone','c:gems/quartz':'minecraft:quartz','c:rods/wooden':'minecraft:stick'
 };
 function choices(ingredient){
  if(ingredient.alternatives?.length)return ingredient.alternatives.map(a=>typeof a==='string'?{id:a,kind:'item'}:a);
  if(ingredient.kind==='tag')return tagItems(ingredient.id).map(id=>({id,kind:'item'}));
  return [];
 }
 function resolve(ing,selections={}){
  if(ing.kind==='tag') {const list=tagItems(ing.id);const wanted=selections[ing.id]||conventional[ing.id];const id=wanted&&(list.includes(wanted)||!list.length)?wanted:list.find(x=>x.startsWith('minecraft:'))||list.find(x=>x.startsWith('create:'))||list[0];return {id:id||'#'+ing.id,kind:'item',tag:ing.id,unresolved:!id};}
  if(ing.alternatives?.length){const options=choices(ing);const chosen=options.find(a=>a.id===selections['alt:'+ing.id])||options[0];return resolve({...chosen,count:ing.count},selections);}
  return {...ing};
 }
 function score(r){
  let s=0;
  if(r.certainty==='atm-override')s+=1000;
  if(r.type.startsWith('minecraft:crafting'))s+=50;
  if(r.type==='create:item_application')s+=60;
  if(r.type==='minecraft:smelting')s+=35;
  if(r.type==='create:pressing')s+=55;
  if(r.id.endsWith('/andesite_alloy'))s+=20;
  if(r.id.includes('from_block')||r.id.includes('from_nuggets')||r.id.includes('from_compacting')||r.id.includes('decompacting')||r.type.includes('stonecutting'))s-=90;
  if(r.id.includes('recycling')||r.type.includes('crushing')||r.type.includes('splashing')||r.type.includes('milling'))s-=50;
  if(r.id.includes('smelting')&&r.id.includes('raw_'))s+=80;
  if(r.id.includes('from_smelting_raw'))s+=80;
  if(r.output.chance<1)s-=60;
  if(r.ingredients.some(i=>i.id===r.output.id))s-=200;
  if(r.type==='create:sequenced_assembly')s+=20;
  return s;
 }
 function candidates(item){return [...(byOutput.get(item)||[])].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));}
 function choose(item,prefs={}){const chosen=byId.get(prefs[item]);return chosen?.output.id===item&&chosen.calculatorEligible!==false?chosen:candidates(item).find(r=>r.calculatorEligible!==false);}
 const naturalResources=new Set(['minecraft:andesite','minecraft:diorite','minecraft:granite','minecraft:cobblestone','minecraft:cobbled_deepslate','minecraft:dirt','minecraft:gravel','minecraft:sand','minecraft:red_sand','minecraft:netherrack','minecraft:obsidian','minecraft:quartz','minecraft:diamond','minecraft:emerald','minecraft:redstone','minecraft:lapis_lazuli','minecraft:coal','minecraft:raw_iron','minecraft:raw_gold','minecraft:raw_copper','create:raw_zinc','minecraft:clay_ball','minecraft:slime_ball','minecraft:leather','minecraft:string','minecraft:feather','minecraft:blaze_rod','minecraft:ender_pearl']);
 function plan(item,amount,{inventory={},preferences={},selections={},rootRecipe=null,maxDepth=12,expand=true}={}){
  const stock={...inventory},surplus={},leaves={},used={},machines=new Set(),warnings=new Set(),assumptions={},processes=[];let nodeCount=0;
  const addLeaf=(id,count,kind,reason)=>{const key=kind==='fluid'?'fluid:'+id:id;if(!leaves[key])leaves[key]={id,count:0,kind,reason};leaves[key].count+=count;};
  function walk(id,count,kind='item',chain=[],depth=0,forced=null){
   nodeCount++;count=Math.max(0,Number(count)||0);const node={id,count,kind,children:[]};
   const key=kind==='fluid'?'fluid:'+id:id;const available=Number(stock[key]||0);const take=Math.min(available,count);if(take){stock[key]-=take;count-=take;used[key]=(used[key]||0)+take;node.stock=take;}
   const spare=Math.min(surplus[key]||0,count);if(spare){surplus[key]-=spare;count-=spare;node.surplusUsed=spare;}
   if(count<=0){node.available=true;return node;}
   const recipe=forced||choose(id,preferences);
   if(recipe?.calculatorEligible===false)warnings.add('Una receta tiene condiciones especiales no calculables; se deja como insumo.');
   const stop=recipe?.calculatorEligible===false||(kind==='fluid'&&depth>0)||(depth>0&&naturalResources.has(id)&&!preferences[id])||id.startsWith('#')||!recipe||chain.includes(id)||depth>=maxDepth||nodeCount>500||(!expand&&depth>0);
   if(stop){node.raw=true;node.remaining=count;addLeaf(id,count,kind,chain.includes(id)?'Ciclo: se deja como insumo':!recipe?'Sin subreceta en catálogo':'Insumo de esta etapa');if(chain.includes(id))warnings.add('Se detuvo una conversión circular. Ese material queda como insumo que debes conseguir.');if(depth>=maxDepth||nodeCount>500)warnings.add('Desglose limitado para mantener el plano legible; los nodos restantes se listan como insumos.');return node;}
   const chance=Math.max(.00001,Math.min(1,recipe.output.chance??1));const batches=Math.ceil(count/(recipe.output.count*chance));node.recipe=recipe.id;node.batches=batches;node.chance=chance;node.output=recipe.output.count;node.type=recipe.type;
   if(chance<1){warnings.add('Hay resultados aleatorios. Las tandas se calculan por rendimiento medio; no garantizan el objetivo.');node.estimated=true;}
   else surplus[key]=(surplus[key]||0)+batches*recipe.output.count-count;
   (recipe.warnings||[]).forEach(w=>warnings.add(w));
   if(recipe.heat)warnings.add(recipe.heat==='superheated'?'Una operación necesita sobrecalentamiento.':'Una operación necesita una fuente de calor activa.');
   machines.add(recipe.type);processes.push({recipe,batches});
   for(const ing of recipe.ingredients){const resolved=resolve(ing,selections);if(resolved.tag)assumptions[resolved.tag]={id:resolved.id,options:tagItems(resolved.tag),unresolved:resolved.unresolved};const child=walk(resolved.id,ing.count*batches,resolved.kind||'item',[...chain,id],depth+1);if(resolved.tag)child.tag=resolved.tag;node.children.push(child);}
   return node;
  }
  const selectedRoot=rootRecipe?byId.get(rootRecipe):choose(item,preferences);
  const tree=walk(item,clampCount(amount),selectedRoot?.output.kind||'item',[],0,selectedRoot);
  return {tree,leaves:Object.values(leaves),used,surplus,machines:[...machines],warnings:[...warnings],assumptions,processes,nodeCount};
 }
 return {byId,byOutput,tagItems,resolve,candidates,choose,plan,choices};
}
export function cleanState(s){
 if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('Formato de respaldo inválido.');
 if(s.schema!==1)throw new Error('Este archivo no es un respaldo de Brassbound compatible.');
 const safeObject=(v,fn)=>Object.fromEntries(Object.entries(v&&typeof v==='object'&&!Array.isArray(v)?v:{}).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)).map(([k,val])=>[k,fn(val)]));
 return {schema:1,workspace:cleanWorkspace(s.workspace),tasks:safeObject(s.tasks,v=>v===true),inventory:safeObject(s.inventory,clampCount),mods:safeObject(s.mods,v=>v===true),notes:typeof s.notes==='string'?s.notes.slice(0,100000):'',plans:Array.isArray(s.plans)?s.plans.filter(p=>p&&typeof p.item==='string'&&typeof p.name==='string').slice(0,200).map(p=>({item:p.item,name:p.name.slice(0,120),quantity:Math.max(1,clampCount(p.quantity)),recipe:typeof p.recipe==='string'?p.recipe:undefined})):[],preferences:safeObject(s.preferences,v=>typeof v==='string'?v:''),selections:safeObject(s.selections,v=>typeof v==='string'?v:'')};
}
