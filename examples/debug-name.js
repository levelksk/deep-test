// 深入调试：姓名输入框的真实结构
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // === 登录 ===
  await page.goto(URL);
  await page.waitForTimeout(1000);
  await page.locator('text=选择租户').click();
  await page.waitForTimeout(300);
  await page.locator('text=元骁健康').click();
  await page.waitForTimeout(200);
  await page.locator('[placeholder="请输入用户名"]').fill('xulingfeng');
  await page.locator('[placeholder="请输入密码"]').fill('123456');
  await page.locator('text=登 录').click();
  await page.waitForTimeout(5000);

  // === 菜单导航 ===
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);

  // === 点新增 ===
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // === 探测对话框内所有输入框的真实结构 ===
  console.log('=== 对话框内所有与 "姓名" "name" 相关的元素 ===');
  const nameRelated = await page.evaluate(() => {
    const dialog = document.querySelector('.el-overlay-dialog, [role="dialog"], .el-dialog');
    if (!dialog) return 'NO DIALOG';
    
    const results = [];
    
    // 所有含"姓名"文本的元素
    dialog.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.includes('姓名') && text.length < 20) {
        results.push({
          tag: el.tagName,
          text: text,
          class: el.className?.slice(0, 40),
          for: el.getAttribute('for') || '',
        });
      }
    });
    
    // 所有带 placeholder 或 .el-input__inner
    const inputs = dialog.querySelectorAll('input, .el-input__inner, .el-textarea__inner');
    results.push('--- INPUTS ---');
    inputs.forEach((el, i) => {
      results.push({
        idx: i,
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        id: el.id || '',
        class: el.className?.slice(0, 40),
        // 看看有没有 .el-input__wrapper 包裹
        wrapper: el.closest('.el-input__wrapper') ? el.closest('.el-input__wrapper').className?.slice(0, 40) : 'none',
        parentLabel: el.closest('.el-form-item')?.querySelector('.el-form-item__label')?.textContent?.trim() || 'none',
      });
    });
    
    return results;
  });
  
  console.log(JSON.stringify(nameRelated, null, 2));

  // === 试试所有方法填入姓名 ===
  console.log('\n=== Method A: placeholder 匹配 → fill ===');
  const nameByPlaceholder = page.locator('[placeholder="请输入姓名"]');
  console.log(`Found by placeholder: ${await nameByPlaceholder.count()}`);
  if (await nameByPlaceholder.count() > 0) {
    await nameByPlaceholder.first().fill('测试的');
    await page.waitForTimeout(500);
    let val = await nameByPlaceholder.first().inputValue().catch(() => 'READ_ERROR');
    console.log(`After fill(), value="${val}"`);
    // 清空
    await nameByPlaceholder.first().fill('');
  }

  console.log('\n=== Method B: .el-input__inner + fill ===');
  const nameInput = page.locator('.el-input__inner[placeholder="请输入姓名"]');
  if (await nameInput.count() > 0) {
    await nameInput.first().fill('测试的B');
    await page.waitForTimeout(500);
    let val = await nameInput.first().inputValue().catch(() => 'READ_ERROR');
    console.log(`After fill(), value="${val}"`);
    await nameInput.first().fill('');
  }

  console.log('\n=== Method C: 坐标点击+keyboard.type ===');
  const nameBox = await page.locator('[placeholder="请输入姓名"]').first().boundingBox();
  if (nameBox) {
    await page.mouse.click(nameBox.x + nameBox.w / 2, nameBox.y + nameBox.h / 2);
    await page.waitForTimeout(300);
    await page.keyboard.type('测试的C', { delay: 50 });
    await page.waitForTimeout(500);
    let val = await page.locator('[placeholder="请输入姓名"]').first().inputValue().catch(() => 'READ_ERROR');
    console.log(`After coord+type, value="${val}"`);
  }

  console.log('\n=== Method D: 在 el-input__wrapper 上 click, 然后 type ===');
  // el-input 的结构: el-input > el-input__wrapper > el-input__inner
  const wrapper = page.locator('.el-input__wrapper').filter({ has: page.locator('[placeholder="请输入姓名"]') }).first();
  if (await wrapper.count() > 0) {
    await wrapper.click();
    await page.waitForTimeout(300);
    // 清空后输入
    await page.keyboard.type('测试的D', { delay: 50 });
    await page.waitForTimeout(500);
    let val = await page.locator('[placeholder="请输入姓名"]').first().inputValue().catch(() => 'READ_ERROR');
    console.log(`After wrapper.click + type, value="${val}"`);
  }

  // 最终检查页面上显示的值
  const finalValue = await page.evaluate(() => {
    const input = document.querySelector('[placeholder="请输入姓名"]');
    return input ? input.value : 'NOT FOUND';
  });
  console.log(`\n最终页面上的值: "${finalValue}"`);

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
