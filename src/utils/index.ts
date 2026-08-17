export const money=(value:number)=>new Intl.NumberFormat('fr-GN',{style:'currency',currency:'GNF',maximumFractionDigits:0}).format(value)
export const slugify=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export const uid=(prefix='id')=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
