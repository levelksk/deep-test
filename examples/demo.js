// ========================================
// deep-test 演示脚本
// 包装 Playwright + DeepSeek V4
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
dotenv.config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) {
  console.error('❌ 请设置 DEEPSEEK_API_KEY 环境变量');
  console.error('   echo "DEEPSEEK_API_KEY=sk-xxx" > .env');
  process.exit(1);
}

async function main() {
  const agent = new DeepTestAgent({
    apiKey: API_KEY,
    headless: false,     // 可见浏览器，方便观察
    stepDelay: 1000,     // 每步后等1秒
    // 如果要测试其他模型可以改这里
    // model: 'deepseek-reasoner',  // V4 推理模型
    // model: 'deepseek-chat',      // V4 通用模型（默认）
  });

  // ─── 测试用例 ───
  const testCases = [
    {
      name: 'GitHub 搜索',
      task: `1. 打开 https://github.com
2. 在搜索框输入 playwright
3. 按回车搜索
4. 验证搜索结果页出现了仓库列表`,
    },
  ];

  for (const tc of testCases) {
    console.log(`\n${'📌'.repeat(20)}`);
    console.log(`📋 测试: ${tc.name}`);
    console.log(`${'📌'.repeat(20)}\n`);

    const result = await agent.run(tc.task);
    
    console.log(`\n${'─'.repeat(45)}`);
    console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`步数: ${result.steps}`);
    console.log(`耗时: ${result.duration}s`);
    console.log(`费用: ¥${result.cost.costCNY.toFixed(4)}`);
    console.log(`${'─'.repeat(45)}\n`);
  }
}

main().catch(console.error);
