// Walkthroughs are derived from the pinned recipe, never from a second recipe database.
export const STEP_SECONDS=7;
export const machineFor={
 'minecraft:crafting_shaped':'minecraft:crafting_table','minecraft:crafting_shapeless':'minecraft:crafting_table',
 'minecraft:smelting':'minecraft:furnace','minecraft:blasting':'minecraft:blast_furnace','minecraft:smoking':'minecraft:smoker','minecraft:campfire_cooking':'minecraft:campfire','minecraft:stonecutting':'minecraft:stonecutter','minecraft:smithing_transform':'minecraft:smithing_table',
 'create:pressing':'create:mechanical_press','create:compacting':'create:mechanical_press','create:mixing':'create:mechanical_mixer','create:crushing':'create:crushing_wheel','create:milling':'create:millstone','create:cutting':'create:mechanical_saw','create:deploying':'create:deployer','create:filling':'create:spout','create:emptying':'create:item_drain','create:splashing':'create:encased_fan','create:haunting':'create:encased_fan','create:mechanical_crafting':'create:mechanical_crafter','create:sandpaper_polishing':'create:sand_paper','createaddition:rolling':'createaddition:rolling_mill',
 'mekanism:metallurgic_infusing':'mekanism:metallurgic_infuser','mekanism:enriching':'mekanism:enrichment_chamber','mekanism:crushing':'mekanism:crusher','mekanism:compressing':'mekanism:osmium_compressor','mekanism:purifying':'mekanism:purification_chamber','mekanism:injecting':'mekanism:chemical_injection_chamber','mekanism:sawing':'mekanism:precision_sawmill','mekanism:combining':'mekanism:combiner',
 'ae2:charger':'ae2:charger','ae2:inscriber':'ae2:inscriber','powah:energizing':'powah:energizing_orb','mysticalagriculture:infusion':'mysticalagriculture:infusion_altar','ars_nouveau:imbuement':'ars_nouveau:imbuement_chamber','ars_nouveau:enchanting_apparatus':'ars_nouveau:enchanting_apparatus','industrialforegoing:dissolution_chamber':'industrialforegoing:dissolution_chamber','productivebees:centrifuge':'productivebees:centrifuge'
};
export const canWalkRecipe=r=>Boolean(r?.output?.id&&r.calculatorEligible!==false&&r.ingredients?.length&&r.ingredients.every(i=>Number.isFinite(i.count)&&i.count>0));
export function tutorialIndex(tutorials){const index=new Map();for(const t of tutorials)for(const id of t.itemIds||[])if(!index.has(id))index.set(id,t);return index;}
export function rawIngredient(raw,resolve){if(!raw)return null;if(Array.isArray(raw))return rawIngredient(raw[0],resolve);if(typeof raw==='string'){const i={id:raw.replace(/^#/,''),kind:raw.startsWith('#')?'tag':'item',count:1};return {...i,...resolve(i)};}const id=raw.item||raw.id||raw.tag||raw.fluid;if(!id)return null;const i={id,kind:raw.tag?'tag':raw.fluid?'fluid':'item',count:raw.count||1};return {...i,...resolve(i)};}
export function recipeSlots(recipe,resolve){const pattern=recipe.raw?.pattern;if(!Array.isArray(pattern))return null;const cols=Math.max(...pattern.map(row=>row.length));return {cols,rows:pattern.length,slots:pattern.flatMap(row=>Array.from({length:cols},(_,i)=>rawIngredient(recipe.raw.key?.[row[i]],resolve)))};}
const count=(i,name)=>`${i.count}${i.kind==='fluid'?' mB':' ×'} ${name(i.id)}`;
export function recipeWalkthrough(r,{resolve,name,process}){
 if(!canWalkRecipe(r))return null;
 const inputs=r.ingredients.map(i=>({...i,...resolve(i),count:i.count}));const outputs=(r.outputs?.length?r.outputs:[r.output]).map(i=>({...i,chance:i.chance??1}));
 const slots=recipeSlots(r,resolve),machine=machineFor[r.type],steps=[];
 steps.push({title:'Reúne los ingredientes',text:inputs.map(i=>count(i,name)).join(' · ')+'.',items:inputs,phase:'ingredients'});
 if(r.sequence?.length){
  steps.push({title:'Prepara la pieza inicial',text:`Empieza con ${name(rawIngredient(r.raw.ingredient,resolve)?.id||inputs[0].id)}. Mantén la pieza incompleta entre operaciones.`,items:[rawIngredient(r.raw.ingredient,resolve)||inputs[0]],phase:'process'});
  for(const [i,s]of r.sequence.entries())steps.push({title:`${i+1}. ${process(s.type)}`,text:`${s.ingredients.map(x=>count({...x,...resolve(x)},name)).join(' · ')||'Procesa la pieza incompleta'}. Conserva este orden en cada vuelta.`,items:s.ingredients.map(x=>({...x,...resolve(x)})),phase:'process',machine:machineFor[s.type]});
  steps.push({title:`Repite ${r.loops||r.raw.loops||1} vueltas completas`,text:`Repite la secuencia entera ${r.loops||r.raw.loops||1} veces. La lista inicial ya incluye los ingredientes de todas las vueltas de un intento.`,items:inputs,phase:'process'});
 }else{
  const text=slots?`Coloca los ingredientes como en la cuadrícula de ${slots.cols} × ${slots.rows}. Las casillas vacías se dejan libres.`:r.type==='minecraft:crafting_shapeless'?'Coloca estos ingredientes en la mesa. La posición no importa.':`Usa ${process(r.type)} con las entradas de esta receta.`;
  steps.push({title:slots?'Coloca cada ingrediente':process(r.type),text,items:inputs,phase:'process',machine});
 }
 const conditions=[];
 if(r.heat)conditions.push(r.heat==='superheated'?'Necesita un quemador sobrecalentado.':'Necesita un quemador calentado; una llama pasiva no basta.');
 const cooking=r.cookingTime??r.raw.cookingtime;if(cooking)conditions.push(`${cooking} ticks de cocción (${cooking/20} s a 20 TPS).`);
 if(r.raw.energy)conditions.push(`${Number(r.raw.energy).toLocaleString('es-MX')} unidades de energía indicadas en la receta.`);
 if(r.raw.keepHeldItem)conditions.push('La herramienta sostenida se conserva.');
 if(r.ingredients.some(i=>i.kind==='tag'||i.alternatives?.length))conditions.push('Los iconos muestran una alternativa válida. Abre los detalles para cambiar materiales compatibles.');
 if(conditions.length)steps.push({title:'Comprueba las condiciones',text:conditions.join(' '),items:machine?[{id:machine,count:1}]:inputs.slice(0,3),phase:'conditions'});
 steps.push({title:r.output.chance<1?'Resultado con probabilidad':'Recoge el resultado',text:outputs.map(o=>`${count(o,name)}${o.chance<1?` · ${(o.chance*100).toLocaleString('es-MX',{maximumFractionDigits:2})}%`:''}`).join(' / ')+(r.type==='create:sequenced_assembly'?'. Los resultados son alternativas, no se obtienen todos juntos.':outputs.some(o=>o.chance<1)?'. Cada salida conserva la probabilidad indicada en la receta.':'.'),items:outputs,phase:'result'});
 return {id:'recipe:'+r.id,itemIds:[r.output.id],title:`Fabricar ${name(r.output.id)}`,category:'fabricación',recipe:r,steps,inputs,outputs,slots,machine,sources:r.source?.url?[{label:`${r.source.modId} ${r.source.version||''} · ${r.source.path||r.id}`,url:r.source.url}]:[]};
}
export function stepAt(time,length){return Math.max(0,Math.min(length-1,Math.floor(Math.max(0,time)/STEP_SECONDS)));}
export function tutorialCoverage(recipes,tutorials){const animated=new Set(recipes.filter(canWalkRecipe).map(r=>r.output.id)),usage=new Set(tutorials.flatMap(t=>t.itemIds));return {recipes:recipes.filter(canWalkRecipe).length,recipeItems:animated.size,usageItems:usage.size,usageTutorials:tutorials.length,totalItems:new Set([...animated,...usage]).size};}
