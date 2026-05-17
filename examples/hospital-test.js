// ========================================
// 测试医院后管登录 v2
// 修复: 输入框探测 + 坐标输入兜底
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
dotenv.config();

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ 请设置 DEEPSEEK_API_KEY');
  process.exit(1);
}

const TEST_URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const agent = new DeepTestAgent({
    apiKey: process.env.DEEPSEEK_API_KEY,
    headless: false,
    stepDelay: 1000,
    maxSteps: 20,
  });

  const result = await agent.run(`打开 ${TEST_URL} 登录页面
1. 点击"选择租户"文字
2. 从弹出的租户列表中点击选择"元骁健康"
3. 在 placeholder="请输入用户名" 的输入框输入 "xulingfeng"
4. 在 placeholder="请输入密码" 的输入框输入 "123456"
5. 点击文本为"登 录"的按钮
6. 等待页面跳转，验证登录成功`);

  console.log(`\n${'='.repeat(45)}`);
  console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`步数: ${result.steps} | 耗时: ${result.duration}s | 费用: ¥${result.cost.costCNY.toFixed(4)}`);
  console.log(`${'='.repeat(45)}`);
  result.history.forEach(h => {
    const ok = h.result && h.result.includes("\u2705");
    console.log(`  ${ok ? "\u2705" : "\u274c"} Step ${h.step}: [${h.action?.type}] ${(h.description || '').slice(0, 40)} → ${(h.result || '').slice(0, 60)}`);
  });
}

main().catch(console.error);
