export function operationLoad(node,time,tariffs){
 const hour=time%24,peak=hour>=18&&hour<21;
 const limit=Math.min(node.operationalSlots ?? 20,peak?tariffs.peakOperationsPerHour:tariffs.normalOperationsPerHour);
 const used=(node.operationHistory || []).filter(e=>Math.floor(e.time)===Math.floor(time)).length;
 return {used,limit,peak,available:used<limit};
}
export function recordOperation(node,time,type){node.operationHistory ||= [];node.operationHistory.push({time,type});}
