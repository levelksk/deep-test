// ========================================
// 完整流程测试 v8 — 搜索输入城市
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
dotenv.config();

const TEST_URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const agent = new DeepTestAgent({
    apiKey: process.env.DEEPSEEK_API_KEY,
    headless: false,
    stepDelay: 800,
    maxSteps: 30,
  });

  const result = await agent.run(`请按顺序执行以下全部步骤：

## 阶段一：登录
1. 打开页面 ${TEST_URL}
2. 点击 "选择租户" 按钮，选择 "元骁健康"
3. 在 "请输入用户名" 输入框输入 "xulingfeng"
4. 在 "请输入密码" 输入框输入 "123456"
5. 点击 "登 录" 按钮，等待3秒跳转到首页

## 阶段二：左侧菜单
6. 在左侧菜单中，点击 "租户" 展开子菜单，等待2秒
7. 点击 "医院管理"，确认 URL 含 /membership/hospital-manage/

## 阶段三：新增医院（城市用搜索！）
8. 点击 "新增医院" 按钮
9. 点击 "请选择归属租户" 下拉框，选择 "元骁健康"
10. 在 "请输入医院名称" 输入框输入 "deep测试医院"
11. 点击 "请选择城市" 下拉框打开城市列表
12. **城市下拉框支持搜索过滤。使用 type 动作输入"杭州"两个字，下拉列表会过滤到只剩"杭州市"**
13. **点击过滤后出现的"杭州市"选项**
14. 点击 "请选择医院等级" 下拉框，选择 "三甲医院"
15. 点击 "保 存" 按钮
16. 确认保存成功`);

  console.log(`\n${'='.repeat(45)}`);
  console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`步数: ${result.steps} | 耗时: ${result.duration}s | 费用: ¥${result.cost.costCNY.toFixed(4)}`);
  console.log(`${'='.repeat(45)}`);
  result.history.forEach(h => {
    const ok = h.result && h.result.includes("✅");
    console.log(`  ${ok ? "✅" : "❌"} Step ${h.step}: [${h.action?.type}] ${(h.description || '').slice(0, 50)} → ${(h.result || '').slice(0, 60)} ${h.url && h.url !== 'about:blank' ? `| ${h.url.slice(0, 60)}` : ''}`);
  });
}

main().catch(console.error);
