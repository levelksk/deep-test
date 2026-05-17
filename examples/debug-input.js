// 调试：姓名输入
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

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

  // 导航到医生管理
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // 看对话框里所有输入框
  const inputsInDialog = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], .el-dialog, .el-overlay-dialog');
    if (!dialog) return 'NO DIALOG';
    return Array.from(dialog.querySelectorAll('input, textarea, .el-input__inner')).map((el, i) => ({
      index: i,
      placeholder: el.getAttribute('placeholder') || '',
      class: el.className?.slice(0, 40),
      tag: el.tagName,
      id: el.id || 'none',
      name: el.getAttribute('name') || 'none',
    }));
  });
  console.log('Inputs in dialog:');
  inputsInDialog.forEach((inp, i) => {
    console.log(`  [${i}] <${inp.tag}> placeholder="${inp.placeholder}" class="${inp.class}" id=${inp.id}`);
  });

  // 方法A: Playwright fill
  const nameInput = page.locator('[placeholder="请输入姓名"]').first();
  console.log(`\nName input found: ${await nameInput.count() > 0}`);
  
  // 先填姓名 - 用fill
  await nameInput.fill('测试的');
  await page.waitForTimeout(500);
  let value = await nameInput.inputValue();
  console.log(`After fill: value="${value}"`);

  // 清空再来 - 用click+type
  await nameInput.fill('');
  await page.waitForTimeout(200);
  
  // 用坐标点击方式
  const box = await nameInput.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.w/2, box.y + box.h/2);
    await page.waitForTimeout(300);
    await page.keyboard.type('测试的', { delay: 50 });
    await page.waitForTimeout(500);
    value = await nameInput.inputValue();
    console.log(`After coord+keyboard: value="${value}"`);
  }

  // 方法C: JS直接设置
  await page.evaluate(() => {
    const input = document.querySelector('[placeholder="请输入姓名"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '测试的');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(500);
  value = await nameInput.inputValue();
  console.log(`After JS set: value="${value}"`);

  await browser.close();
}

main().catch(console.error);
