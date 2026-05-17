// ========================================
// 新增医生 v17 — 带 HTML 报告生成
// ========================================
import dotenv from 'dotenv';
import { DeepTestAgent } from '../src/agent.js';
import { generateReport } from '../src/reporter.js';
import fs from 'fs';
import path from 'path';
dotenv.config();

const TEST_URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';
const IMG = 'D:\\projects\\deep-test\\test.jpeg';

async function main() {
  const agent = new DeepTestAgent({
    apiKey: process.env.DEEPSEEK_API_KEY,
    headless: false,
    stepDelay: 1000,
    maxSteps: 35,
  });

  const fakeName = '测试医' + Date.now().toString().slice(-4);
  const fakeId = generateFakeId();
  const fakePhone = '144' + String(Math.floor(10000000 + Math.random() * 90000000));

  const result = await agent.run(`严格按顺序执行每一步，不能跳过，全部做完最后才点确认。

## 登录
1. navigate ${TEST_URL}
2. click "选择租户" → click "元骁健康"
3. fill "请输入用户名" = xulingfeng
4. fill "请输入密码" = 123456
5. click "登 录" → wait 3秒

## 菜单导航
6. click "租户"左侧菜单 → click "医生管理"

## 填写表单（按顺序执行每步）
7. click "新 增"
8. fill "请输入姓名" = ${fakeName}
9. upload 头像: files=["${IMG}"]
10. click "男"（选择性别）
11. fill "请输入年龄" = 30
12. fill "请输入手机号" = ${fakePhone}
13. fill "请输入身份证号" = ${fakeId}
14. upload 身份证正面: files=["${IMG}"]
15. upload 身份证反面: files=["${IMG}"]
16. click 文字"医生"（选择医生类型）
17. fill "年" = 10（执业年限）
18. **使用 dropdown 动作** 选择所属医院: description="所属医院" value="许凌峰的测试1号医院"
19. fill "请输入执业证书号" = 123456
20. upload 执业证书: files=["${IMG}"]
21. **使用 cascade 动作** 选择所属科室（级联两级）: description="所属科室" value="内科,呼吸内科专业"
22. **使用 dropdown 动作** 选择职称: description="职称" value="主任医师"

## 提交
24. click "确认"
25. wait 2秒
26. extract 看是否有错误提示
27. type="done" success=true message="完成"`);

  console.log(`\n${'='.repeat(45)}`);
  console.log(`结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`步数: ${result.steps} | 耗时: ${result.duration}s | 费用: ¥${result.cost.costCNY.toFixed(4)}`);
  console.log(`${'='.repeat(45)}`);
  result.history.forEach(h => {
    const ok = h.result && h.result.includes("✅");
    console.log(`  ${ok ? "✅" : "❌"} Step ${h.step}: [${h.action?.type}] ${(h.description || '').slice(0, 45)} → ${(h.result || '').slice(0, 55)} ${h.url && h.url !== 'about:blank' ? `| ${h.url.slice(0, 50)}` : ''}`);
  });

  // 生成 HTML 报告
  const reportHtml = generateReport(result);
  const reportName = `deep-test-report-${Date.now()}.html`;
  const reportPath = path.join('D:\\projects\\deep-test\\reports', reportName);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportHtml, 'utf-8');
  console.log(`\n📊 报告已生成: ${reportPath}`);
  console.log(`   大小: ${(fs.statSync(reportPath).size / 1024 / 1024).toFixed(1)}MB`);
}

function generateFakeId() {
  const area = '110101';
  const birth = `1985${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const base = area + birth + seq;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(base[i]) * weights[i];
  return base + codes[sum % 11];
}

main().catch(console.error);
