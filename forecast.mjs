// Reproducible synthetic daily counts on one corridor. No personal or marketplace data.
export function sampleSeries(){
  const profile=[3,6,7,10,13,16,4];
  return Array.from({length:84},(_,t)=>Math.max(0,profile[t%7]+((t*17+Math.floor(t/7)*11)%5)-2-(t===65||t===77?5:0)));
}
const seasonal=(x,t)=>{
  const prior=[];
  for(let i=t-7;i>=0&&prior.length<4;i-=7)prior.push(x[i]);
  return Math.round(prior.reduce((a,b)=>a+b,0)/prior.length);
};
export function evaluateForecast(values,threshold=5){
  if(!Array.isArray(values)||values.length!==84||values.some(x=>!Number.isSafeInteger(x)||x<0)||!Number.isSafeInteger(threshold)||threshold<1)throw Error('Expected 84 daily counts and a positive threshold');
  const residuals=[];
  for(let t=28;t<56;t++)residuals.push(values[t]-seasonal(values,t));
  residuals.sort((a,b)=>a-b);
  const shift=Math.min(0,residuals[Math.floor(.1*(residuals.length-1))]);
  const stats={naive:{ae:0,falseDispatch:0,missed:0},seasonal:{ae:0,falseDispatch:0,missed:0},guarded:{ae:0,falseDispatch:0,missed:0}};
  let covered=0;
  for(let t=56;t<84;t++){
    const point=seasonal(values,t);
    const low=Math.max(0,point+shift);
    if(values[t]>=low)covered++;
    for(const [key,estimate] of Object.entries({naive:values[t-1],seasonal:point,guarded:low})){
      const item=stats[key];item.ae+=Math.abs(estimate-values[t]);
      if(estimate>=threshold&&values[t]<threshold)item.falseDispatch++;
      if(estimate<threshold&&values[t]>=threshold)item.missed++;
    }
  }
  const point=seasonal(values,84);
  return {trainN:56,n:28,threshold,coverage:covered/28,next:{point,low:Math.max(0,point+shift)},mae:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,v.ae/28])),stats};
}
