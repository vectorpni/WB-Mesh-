import { publicFile } from './src/server-policy.js';
/**
 * WB Mesh Control System - Static File Server
 * Serves the application for development and demo
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.wasm': 'application/wasm'
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  try {
    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  }
}

const server = createServer((req,res) => {
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 WB Mesh Control System running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PUBLIC_DIR}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});