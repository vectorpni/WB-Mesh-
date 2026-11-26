import {escapeHtml,chip,statusName} from './view-utils.js';
export function networkSvg(state,route=null,selectedId=null) {
 const cities=[...state.cities.values()],positions=new Map();
 let nodes='',edges='';
 for(let ci=0;ci<cities.length;ci++){
  const city=cities[ci],cx=175+ci*340;
  nodes+=`<text x="${cx}" y="25" text-anchor="middle" class="v-city-label">${escapeHtml(city.name)}</text>`;
  const ps=[...state.pvzs.values()].filter(p=>p.cityId===city.id);
  const hub=ps.find(p=>p.type==='hub');if(hub)positions.set(hub.id,{x:cx,y:80});
  let m=0;for(const p of ps.filter(p=>p.type!=='hub')){positions.set(p.id,{x:cx-78+(m%2)*156,y:170+Math.floor(m/2)*97});m++;}
  for(const p of ps){const pos=positions.get(p.id);if(!pos)continue;
   if(hub && p!==hub){const hp=positions.get(hub.id);edges+=`<path d="M${hp.x},${hp.y} L${pos.x},${pos.y}" class="v-edge"/>`;}
   const load=Math.min(1,p.occupiedCapacity/p.capacity),isSelected=p.id===selectedId;
   const color=p.status==='down'?'#c84156':p.type==='hub'?'#5421A8':'#CB11AB';
   nodes+=`<g class="v-network-node ${isSelected?'selected':''}" data-node="${p.id}" role="button" tabindex="0" aria-label="${escapeHtml(p.name)}: ${Math.round(load*100)}% загрузки"><circle cx="${pos.x}" cy="${pos.y}" r="${p.type==='hub'?24:19}" fill="white" stroke="${color}" stroke-width="${isSelected?5:2}"/><path d="M${pos.x-7},${pos.y-3} l7,-5 l7,5 v10 h-14 z" fill="none" stroke="${color}" stroke-width="1.6"/><text x="${pos.x}" y="${pos.y+38}" text-anchor="middle">${escapeHtml(p.name.replace('Хаб ',''))}</text><rect x="${pos.x-24}" y="${pos.y+45}" width="48" height="3" rx="2" fill="#e8e1ef"/><rect x="${pos.x-24}" y="${pos.y+45}" width="${load*48}" height="3" rx="2" fill="${color}"/></g>`;
  }
 }
 for(let i=0;i<cities.length-1;i++){const a=positions.get(cities[i].hubId),b=positions.get(cities[i+1].hubId);if(a&&b)edges+=`<path d="M${a.x+28},${a.y} L${b.x-28},${b.y}" class="v-trunk"/>`;}
 let highlight='';
 if(route?.sourcePvzId && route?.destinationPvzId){
  const from=positions.get(route.sourcePvzId),to=positions.get(route.destinationPvzId);
  if(from&&to) {
   const through=route.type==='C1'||route.type==='C2';
   let pts=[from];if(through){const sc=state.pvzs.get(route.sourcePvzId)?.cityId,dc=state.pvzs.get(route.destinationPvzId)?.cityId;pts.push(positions.get(state.cities.get(sc)?.hubId));if(sc!==dc)pts.push(positions.get(state.cities.get(dc)?.hubId));}pts.push(to);
   highlight=`<polyline points="${pts.filter(Boolean).map(p=>`${p.x},${p.y}`).join(' ')}" class="v-selected-edge"/>`;
  }
 }
 return `<svg class="v-network" viewBox="0 0 1030 400" role="img" aria-label="Схема логистической сети трёх городов"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#ded5e9"/></pattern></defs><rect width="1030" height="400" fill="url(#dots)"/>${edges}${highlight}${nodes}</svg>`;
}
