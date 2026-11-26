import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFile} from '../server-policy.js';
test('Сервер выдаёт только публичные исходники и ресурсы',()=>{
 const root='C:\\Sites\\RWB-Mesh';assert.ok(publicFile(root,'/src/ui/main.js'));assert.ok(publicFile(root,'/assets/favicon.svg'));
 for(const path of ['/.git/config','/package-lock.json','/WB_MESH_V8_TASK.md','/evidence/sources/file.txt','/node_modules/playwright/package.json','/%zz','/src/..%5c..%5csecret.js'])assert.equal(publicFile(root,path),null,path);
});
