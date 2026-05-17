// ========================================
// 本地测试页 HTTP 服务器
// ========================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer(port) {
  return new Promise((resolve) => {
    const html = fs.readFileSync(path.join(__dirname, 'test-page.html'), 'utf-8');
    
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    server.listen(port, () => {
      console.log(`✅ 测试服务已启动: http://localhost:${port}`);
      resolve(server);
    });
  });
}
