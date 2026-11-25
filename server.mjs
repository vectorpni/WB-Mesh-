import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files={'/':['index.html','text/html'],'/ui.mjs':['ui.mjs','text/javascript'],'/mesh.mjs':['mesh.mjs','text/javascript'],'/forecast.mjs':['forecast.mjs','text/javascript'],'/style.css':['style.css','text/css'],'/pitch.html':['pitch.html','text/html'],'/final.html':['final.html','text/html'],'/slides.css':['slides.css','text/css']};
const port=Number(process.env.PORT??4175);
http.createServer(async(req,res)=>{
  const asset=Object.hasOwn(files,req.url)?files[req.url]:null;
  if(!asset || req.method!=='GET'){res.writeHead(404);res.end();return;}
  try{const bytes=await readFile(new URL(asset[0],import.meta.url));
    res.writeHead(200,{'Content-Type':asset[1]+'; charset=utf-8','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(500);res.end();}
}).listen(port,'127.0.0.1',()=>console.log('Mesh Gate: http://127.0.0.1:'+port));
