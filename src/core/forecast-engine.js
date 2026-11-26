/** Reproducible one-step rolling-origin validation. No observation at t or later enters prediction t. */
export class DemandForecast {
  static naive(h) {return h.at(-1) ?? 0;}
  static ewma(h,alpha=.3) {return h.length ? h.slice(1).reduce((p,y)=>alpha*y+(1-alpha)*p,h[0]) : 0;}
  static movingAverage(h,window=7) {const v=h.slice(-window);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}
  static seasonalNaive(h,seasonality=7) {return h.length>=seasonality?h[h.length-seasonality]:this.naive(h);}
  static seasonalAverage(h,seasonality=7,periods=4) {
    const v=[];for(let p=1;p<=periods;p++)if(h.length-p*seasonality>=0)v.push(h[h.length-p*seasonality]);
    return v.length?v.reduce((a,b)=>a+b,0)/v.length:this.naive(h);
  }
  static methods(h) {return {naive:this.naive(h),movingAverage:this.movingAverage(h),ewma:this.ewma(h),seasonalNaive:this.seasonalNaive(h),seasonalAverage:this.seasonalAverage(h)};}
  static evaluate(history,holdout=14) {
    if(!Number.isInteger(holdout)||holdout<1||history.length<=holdout)return {};
    if(history.some(x=>!Number.isFinite(x)||x<0))throw new RangeError('Некорректная история спроса');
    const start=history.length-holdout,actuals=history.slice(start),results={};
    const predictions={naive:[],movingAverage:[],ewma:[],seasonalNaive:[],seasonalAverage:[]};
    for(let t=start;t<history.length;t++)for(const [name,value] of Object.entries(this.methods(history.slice(0,t))))predictions[name].push(value);
    for(const [name,values] of Object.entries(predictions)) {
      const errors=values.map((v,i)=>v-actuals[i]),abs=errors.map(Math.abs),den=actuals.reduce((a,b)=>a+b,0);
      results[name]={mae:abs.reduce((a,b)=>a+b,0)/holdout,bias:errors.reduce((a,b)=>a+b,0)/holdout,
        wape:den?abs.reduce((a,b)=>a+b,0)/den:null,rmse:Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/holdout),
        hitRate:errors.filter(e=>Math.abs(e)<=2).length/holdout,falseDispatch:errors.filter(e=>e>2).length,
        missed:errors.filter(e=>e< -2).length,predictions:values,actuals,errors,trainDays:start,testDays:holdout,protocol:'rolling-origin / один день вперёд'};
    }
    return results;
  }
  static forecastNextDay(history,seasonality=7) {
    const evaluation=this.evaluate(history,Math.min(7,Math.max(1,Math.floor(history.length/4))));
    const allMethods=this.methods(history);
    const method=Object.keys(evaluation).sort((a,b)=>evaluation[a].mae-evaluation[b].mae)[0] || 'naive';
    const mae=evaluation[method]?.mae ?? 0,forecast=allMethods[method];
    return {method,nextDayForecast:Math.round(forecast),conservativeEstimate:Math.max(0,Math.floor(forecast-mae)),
      mae,bias:evaluation[method]?.bias ?? 0,wape:evaluation[method]?.wape ?? null,hitRate:evaluation[method]?.hitRate ?? 0,allMethods,evaluation};
  }
  static recommend(history,available,inTransit=0,capacity=400) {
    const f=this.forecastNextDay(history),lambda=f.nextDayForecast;
    const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:0;};
    const recent=history.slice(-14),center=median(recent),sigma=1.4826*median(recent.map(v=>Math.abs(v-center)));
    const target=Math.ceil(lambda*2+1.28*sigma*Math.sqrt(2));
    const deficit=Math.max(0,target-available-inTransit),surplus=Math.max(0,available-target-3*lambda);
    return {...f,lambda,sigma,target,deficit,surplus,quantity:Math.max(0,Math.min(deficit,capacity-available-inTransit)),
      expectedDays:lambda?available/lambda:null,formula:'T = ceil(2λ + 1,28 × 1,4826 × MAD × √2); D = max(0,T−A−T_in)'};
  }
}
