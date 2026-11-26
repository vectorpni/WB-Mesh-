import {writeFileSync,mkdirSync} from 'node:fs';
import {CostEngine} from '../src/core/cost-engine.js';
import {StateManager} from '../src/core/app-state.js';
import {DemandForecast} from '../src/core/forecast-engine.js';
import {DEFAULT_TARIFFS} from '../src/core/types.js';
mkdirSync('deliverables',{recursive:true});
const e=new CostEngine(),s=new StateManager().state;
const forecast=DemandForecast.evaluate(s.salesHistory.get('prod-1'),14);
const result={tariffs:DEFAULT_TARIFFS,control:e.calculateOrder(),investment:e.calculateInvestment(),forecast,
 scenarios:[{name:'База',batchSize:40,days:10},{name:'Малый рейс',batchSize:10,days:10},{name:'Крупный рейс',batchSize:60,days:10},{name:'4 остановки',batchSize:40,days:10,stops:4},{name:'Простой 20 мин',batchSize:40,days:10,waitMinutes:20},{name:'40 суток',batchSize:40,days:40}].map(p=>({params:p,result:e.calculateOrder(p)}))};
writeFileSync('deliverables/financial-model.json',JSON.stringify(result,null,2));
console.log('Exported financial-model.json from the production CostEngine');
