// 零依赖静态文件服务器，仅用 Node.js 内置模块，供打包版启动脚本调用，
// 用来在本地把前端页面用 http:// 方式打开（而不是 file://），
// 这样"系统设置 → 系统信息"里连接后端数据库时的 fetch 请求才能正常工作。
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.STATIC_PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/智能业务管理系统.html';

  const filePath = path.normalize(path.join(ROOT, reqPath));
  // 防止路径穿越到 ROOT 目录之外
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`前端页面已启动: http://localhost:${PORT}/`);
  console.log('保持此窗口开启，关闭窗口即停止服务。按 Ctrl+C 可手动停止。');
});
