// ========================================
// 测试文件上传功能
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
import { createServer } from './test-server.js';
dotenv.config();

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ 请设置 DEEPSEEK_API_KEY');
  process.exit(1);
}

const PORT = 5681;

async function main() {
  const server = await createServer(PORT);
  const base = `http://localhost:${PORT}`;
  const filePath = 'D:\\projects\\deep-test\\test.jpeg';

  const agent = new DeepTestAgent({
    apiKey: process.env.DEEPSEEK_API_KEY,
    headless: false,
    stepDelay: 500,
  });

  // 测试1: 原生 input[type=file] 上传
  console.log('📋 测试1: 原生 input 上传');
  let r = await agent.run(`打开 ${base}，找到文件上传的原生 input，上传文件 ${filePath}`);
  console.log(`结果: ${r.success ? '✅' : '❌'} | ${r.steps}步 | ¥${r.cost.costCNY.toFixed(4)}`);

  // 测试2: 自定义按钮上传（Element Plus 风格）
  console.log('\n📋 测试2: 自定义上传按钮');
  r = await agent.run(`打开 ${base}，点击"点击上传文件"文字，上传文件 ${filePath}`);
  console.log(`结果: ${r.success ? '✅' : '❌'} | ${r.steps}步 | ¥${r.cost.costCNY.toFixed(4)}`);

  server.close();
}

main().catch(console.error);
