// ========================================
// deep-test 完整演示 - 本地测试页
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
import { createServer } from './test-server.js';
dotenv.config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) {
  console.error('❌ 请设置 DEEPSEEK_API_KEY');
  process.exit(1);
}

const PORT = 5679;  // 避开 5173 和 3001

async function main() {
  // 启动本地测试页服务器
  const server = await createServer(PORT);
  const TEST_URL = `http://localhost:${PORT}`;
  console.log(`🌐 测试页面: ${TEST_URL}\n`);

  const agent = new DeepTestAgent({
    apiKey: API_KEY,
    headless: false,   // 可见模式，方便观察
    stepDelay: 800,
  });

  // ─── 测试用例 ───
  const testCases = [
    {
      name: '表单填写',
      task: `打开 ${TEST_URL}
在用户名字段输入"自动化测试工程师"
在邮箱字段输入"test@example.com"
在城市下拉框选择"上海"`,
    },
    {
      name: '按钮点击',
      task: `打开 ${TEST_URL}
点击"点击我"按钮
点击"+1"按钮三次
验证计数器显示为3`,
    },
    {
      name: '选项操作',
      task: `打开 ${TEST_URL}
勾选"阅读"和"运动"复选框
选择"选项B"单选按钮
然后点击"提交"按钮`,
    },
    {
      name: '完整流程',
      task: `打开 ${TEST_URL}
1. 用户名输入"deep-test用户"
2. 邮箱输入"demo@deep-test.com"
3. 城市选择"杭州"
4. 勾选"音乐"复选框
5. 选择"选项A"单选按钮
6. 点击"提交"按钮
7. 验证页面出现了"提交成功"的提示`,
    },
  ];

  let totalPass = 0;
  let totalFail = 0;
  let totalCost = 0;

  for (const tc of testCases) {
    console.log(`\n${'📌'.repeat(25)}`);
    console.log(`📋 测试: ${tc.name}`);
    console.log(`${'📌'.repeat(25)}\n`);

    const result = await agent.run(tc.task);
    
    if (result.success) {
      totalPass++;
    } else {
      totalFail++;
    }
    totalCost += result.cost.costCNY;

    console.log(`\n${'─'.repeat(40)}`);
    console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`步数: ${result.steps} | 耗时: ${result.duration}s`);
    console.log(`费用: ¥${result.cost.costCNY.toFixed(4)}`);
    console.log(`${'─'.repeat(40)}\n`);
  }

  // 总报告
  console.log(`\n${'📊'.repeat(15)}`);
  console.log('📊 完整测试报告');
  console.log(`${'📊'.repeat(15)}`);
  console.log(`总用例: ${testCases.length}`);
  console.log(`通过: ${totalPass} | 失败: ${totalFail}`);
  console.log(`成功率: ${(totalPass / testCases.length * 100).toFixed(0)}%`);
  console.log(`总费用: ¥${totalCost.toFixed(4)}`);
  console.log(`平均每个测试: ¥${(totalCost / testCases.length).toFixed(4)}`);

  server.close();
}

main().catch(console.error);
