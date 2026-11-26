/** Extend existing Nemotron demo entities, preserving their IDs and all four representative products. */
export function extendDemoDataset(cities,pvzs,products,sellers){
 const specs={perm:{total:12,mesh:8},ekaterinburg:{total:6,mesh:5},kazan:{total:6,mesh:5}};
 for(const city of cities.values()){
  const spec=specs[city.id];let nodes=[...pvzs.values()].filter(p=>p.cityId===city.id&&p.type!=='hub');
  let mesh=nodes.filter(p=>p.type==='mesh').length;
  for(const p of nodes.filter(p=>p.type==='standard'))if(mesh<spec.mesh&&nodes.length>=spec.total-2){p.type='mesh';mesh++;}
  while(nodes.length<spec.total){
   const type=mesh<spec.mesh?'mesh':'standard',n=nodes.length+1,id=`pvz-${city.id}-demo-${n}`;
   const p={id,cityId:city.id,name:`${city.name} ${type==='mesh'?'Район':'Выдача'} ${n}`,type,capacity:type==='mesh'?400:150,occupiedCapacity:0,inventory:[],incoming:[],operationalSlots:20,coordinates:{x:city.coordinates.x+(n%3-1)*40,y:city.coordinates.y+Math.floor(n/3)*40}};
   pvzs.set(id,p);nodes.push(p);if(type==='mesh')mesh++;
  }
  // Exact Mesh count without dropping any original node.
  for(const p of nodes.filter(p=>p.type==='standard'))if(mesh<spec.mesh){p.type='mesh';mesh++;}
  city.meshPvzs=nodes.filter(p=>p.type==='mesh').map(p=>p.id);city.standardPvzs=nodes.filter(p=>p.type==='standard').map(p=>p.id);
  pvzs.get(city.hubId).capacity=20000;
 }
 const categories=['electronics','clothing','home','beauty','footwear','children','sport','accessories'];
 const labels=['Электроника','Одежда','Товары для дома','Косметика','Обувь','Детские товары','Спорт','Аксессуары'];
 const vendorIds=[...sellers.keys()];
 for(let n=5;n<=60;n++){
  const c=(n-5)%8,id=`prod-${n}`,sellerId=vendorIds[(n-5)%vendorIds.length],units=c===2?8:c===1||c===4?3:1,price=(500+n*75)*100;
  products.set(id,{id,sku:`DEMO-${String(n).padStart(4,'0')}`,name:`${labels[c]} · модель ${n}`,category:categories[c],price,purchaseCost:Math.round(price*.6),units,meshEligible:units<=3,dimensions:{width:10,height:10,depth:10},weight:500,returnRate:[.06,.30,.04,.05,.28,.08,.10,.07][c],sellerId});
  sellers.get(sellerId).productIds.push(id);
 }
}
