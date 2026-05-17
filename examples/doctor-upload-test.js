// ========================================
// 测试：医生管理 + 头像上传
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
    maxSteps: 35,
  });

  // 生成随机身份证号（符合格式的假号）
  const fakeId = generateFakeId();

  const result = await agent.run(`请按顺序执行以下全部步骤：

## 阶段一：登录
1. 打开页面 ${TEST_URL}
2. 点击 "选择租户" 按钮，选择 "元骁健康"
3. 在 "请输入用户名" 输入框输入 "xulingfeng"
4. 在 "请输入密码" 输入框输入 "123456"
5. 点击 "登 录" 按钮，等待3秒跳转首页

## 阶段二：左侧菜单 → 医生管理
6. 在左侧菜单中，点击 "租户" 展开子菜单，等待2秒
7. 点击 "医生管理" 子菜单项
8. 确认页面跳转到医生管理列表页

## 阶段三：新增医生 + 上传头像
9. 点击 "新增" 或 "新增医生" 按钮
10. 在弹出的对话框中：
    - 在 "姓名" 输入框输入 "测试的"
    - 在 "身份证号" 输入框输入 "${fakeId}"
    - **找到头像上传区域或上传按钮，使用upload动作上传文件 "D:\\projects\\deep-test\\test.jpeg"**
11. 点击 "保 存" 或 "确定" 按钮
12. 等待保存成功提示`);

  console.log(`\n${'='.repeat(45)}`);
  console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`步数: ${result.steps} | 耗时: ${result.duration}s | 费用: ¥${result.cost.costCNY.toFixed(4)}`);
  console.log(`${'='.repeat(45)}`);
  result.history.forEach(h => {
    const ok = h.result && h.result.includes("✅");
    console.log(`  ${ok ? "✅" : "❌"} Step ${h.step}: [${h.action?.type}] ${(h.description || '').slice(0, 50)} → ${(h.result || '').slice(0, 60)} ${h.url && h.url !== 'about:blank' ? `| ${h.url.slice(0, 60)}` : ''}`);
  });
}

function generateFakeId() {
  // 生成符合18位身份证格式的假号
  const area = '110101'; // 北京市东城区
  const birth = `1985${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const base = area + birth + seq;
  // 加权因子
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(base[i]) * weights[i];
  return base + codes[sum % 11];
}

main().catch(console.error);
