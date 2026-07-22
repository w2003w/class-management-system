const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '.');

const PAGES = ['dashboard', 'attendance', 'exam', 'vote', 'profile', 'users', 'settings', 'grading', 'participate', 'chat', 'check-actual-users', 'check-localstorage', 'check_localstorage', 'debug-attendance', 'install-guide', 'participate', 'test-attendance', 'test-complete-flow', 'test-localstorage', 'test-supabase-connection', 'test_user_fix', 'test-connection', 'test-login'];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath, statusCode = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>404 Not Found</h1></body></html>');
      return;
    }
    
    res.writeHead(statusCode, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  const pathname = filePath;
  const pageName = pathname.substring(1).split('?')[0].split('#')[0];
  
  if (PAGES.includes(pageName) && !pathname.includes('.')) {
    filePath = '/' + pageName + '.html';
  }
  
  const fullPath = path.join(PUBLIC_DIR, filePath);
  
  fs.exists(fullPath, (exists) => {
    if (exists) {
      fs.stat(fullPath, (err, stats) => {
        if (err) {
          serveFile(res, fullPath, 500);
          return;
        }
        
        if (stats.isDirectory()) {
          serveFile(res, path.join(fullPath, 'index.html'));
        } else {
          serveFile(res, fullPath);
        }
      });
    } else {
      serveFile(res, path.join(PUBLIC_DIR, '404.html'), 404);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});