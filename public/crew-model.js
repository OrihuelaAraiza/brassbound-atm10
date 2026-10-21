import {cleanState} from './engine.js';
import {mergeWorkspace} from './workshop-model.js';
export const players = [
  {id:'mayze',name:'Mayze',color:'#abc795'},
  {id:'shady',name:'Shady',color:'#91b8ca'},
  {id:'rafunki',name:'Rafunki',color:'#c8a4d5'},
  {id:'kelthzear',name:'KelThzear',color:'#dbbe7c'},
  {id:'redbone',name:'RedBone',color:'#dc9e91'},
  {id:'detectov',name:'Detectov',color:'#8dc8b7'},
  {id:'bolsita',name:'Bolsita',color:'#c5c78b'},
];
export const emptyState = () => cleanState({schema:1});
export function mergeProgress(a,b){
  a=cleanState(a);b=cleanState(b);
  return cleanState({...a,tasks:{...a.tasks,...Object.fromEntries(Object.entries(b.tasks).filter(([,v])=>v))},mods:{...a.mods,...Object.fromEntries(Object.entries(b.mods).filter(([,v])=>v))},inventory:Object.fromEntries([...new Set([...Object.keys(a.inventory),...Object.keys(b.inventory)])].map(k=>[k,Math.max(a.inventory[k]||0,b.inventory[k]||0)])),notes:a.notes===b.notes?a.notes:[a.notes,b.notes].filter(Boolean).join('\n\n--- Notas importadas ---\n\n'),plans:[...a.plans,...b.plans.filter(p=>!a.plans.some(q=>JSON.stringify(q)===JSON.stringify(p)))],workspace:mergeWorkspace(a.workspace,b.workspace),preferences:{...a.preferences,...b.preferences},selections:{...a.selections,...b.selections}});
}
export function hasProgress(s){return Boolean(Object.values(s.tasks||{}).some(Boolean)||s.notes||s.plans?.length||Object.keys(s.inventory||{}).length||Object.values(s.mods||{}).some(Boolean)||JSON.stringify(s.workspace)!==JSON.stringify(emptyState().workspace));}
export function progressSummary(s,catalog){
  const routes=[...new Set(Object.values(catalog).map(t=>t.group))].map(group=>{const keys=Object.keys(catalog).filter(k=>catalog[k].group===group);return {name:group,done:keys.filter(k=>s.tasks?.[k]).length,total:keys.length};});
  return {done:routes.reduce((n,r)=>n+r.done,0),total:routes.reduce((n,r)=>n+r.total,0),routes:routes.filter(r=>r.done),materials:Object.keys(s.inventory||{}).length,plans:s.plans?.length||0};
}
