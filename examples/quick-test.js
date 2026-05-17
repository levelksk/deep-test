// ========================================
// deep-test 快速验证
// 测试本地页面，验证循环检测等修复
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
import { createServer } from './test-server.js';
dotenv.config();

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ 请设置 DEEPSEEK_API_KEY');
  process.exit(1);
}

const PORT = 5680;

async function main() {
  const server = await createServer(PORT);
  const base = `http://localhost:${PORT}`;

  const agent = new DeepTestAgent({
    apiKey: process.env.DEEPSEEK_API_KEY,
    headless: false,
    stepDelay: 500,
  });

  // 只跑一个简单测试
  const result = await agent.run(`打开 ${base}，在用户名字段输入"test"`);

  console.log(`\n✅ ${result.success ? '通过' : '失败'} | ${result.steps}步 | ${result.duration}s | ¥${result.cost.costCNY.toFixed(4)}`);
  
  server.close();
}

main().catch(console.error);
