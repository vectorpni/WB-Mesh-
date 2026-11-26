import {resolve,extname,sep} from 'node:path';
export function publicFile(root,rawPath){
 let path;try{path=decodeURIComponent(new URL(rawPath,'http://localhost').pathname);}catch{return null;}
 if(path==='/' || path==='/index.html')return resolve(root,'index.html');
 if(path.includes('\\')||path.split('/').some(p=>p.startsWith('.')))return null;
 const allowed=path.startsWith('/src/')&&['.js','.mjs','.css'].includes(extname(path)) || path.startsWith('/assets/')&&['.svg','.png','.ico','.woff2','.woff','.ttf','.json'].includes(extname(path));
 if(!allowed)return null;
 const result=resolve(root,'.'+path);
 return result.startsWith(resolve(root)+sep)?result:null;
}
