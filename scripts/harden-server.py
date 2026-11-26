from pathlib import Path
p=Path('server.js');s=p.read_text(encoding='utf-8')
s="import { publicFile } from './src/server-policy.js';\n"+s
a=s.index('const server = createServer');b=s.index('\nserver.listen',a)
s=s[:a]+'''const server = createServer((req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-cache');
  if(!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method Not Allowed');return;
  }
  const filePath=publicFile(PUBLIC_DIR,req.url);
  if(!filePath) {res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'});res.end('Forbidden');return;}
  if(!existsSync(filePath)||!statSync(filePath).isFile()) {res.writeHead(404);res.end('Not Found');return;}
  if(req.method==='HEAD') {res.writeHead(200,{'Content-Type':getMimeType(filePath)});res.end();return;}
  serveFile(filePath,res);
});
'''+s[b:]
s=s.replace('server.listen(PORT, () => {',"server.listen(PORT, '127.0.0.1', () => {")
p.write_text(s,encoding='utf-8')
