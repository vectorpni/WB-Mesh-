import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const path='src/core/cost-engine.js',source=readFileSync(path,'utf8');
const token='savings >= t.minimumSavings';
if(!source.includes(token))throw new Error('Mutation target missing');
let mutation;
try{
 writeFileSync(path,source.replace(token,'savings < t.minimumSavings'));
 mutation=spawnSync(process.execPath,['--test','src/core/v8-workflow.test.mjs'],{encoding:'utf8'});
 writeFileSync('evidence/mutation-failure.txt',mutation.stdout+mutation.stderr);
 if(mutation.status===0)throw new Error('Guard inversion survived');
}finally{writeFileSync(path,source);}
const clean=spawnSync(process.execPath,['--test','src/core/v8-workflow.test.mjs'],{encoding:'utf8'});
writeFileSync('evidence/mutation-check.json',JSON.stringify({target:path,condition:token,mutation:'>= replaced by <',mutatedExit:mutation.status,restoredExit:clean.status,sourceRestored:readFileSync(path,'utf8')===source},null,2));
console.log('Mutation killed:',mutation.status,'restored:',clean.status);
if(clean.status!==0)throw new Error(clean.stdout+clean.stderr);
