// 调试：姓名 vs 身份证号 输入框结构对比
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

  // === 菜单导航到医生管理 ===
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);

  // === 点新增 ===
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // === 对比两个输入框的结构 ===
  console.log('=== 姓名输入框 ===');
  const nameInfo = await page.evaluate(() => {
    const input = document.querySelector('[placeholder="请输入姓名"]');
    if (!input) return 'NOT FOUND';
    const wrapper = input.closest('.el-input__wrapper');
    const inputBox = input.closest('.el-input');
    const formItem = input.closest('.el-form-item');
    return {
      tag: input.tagName,
      type: input.getAttribute('type'),
      id: input.id,
      class: input.className?.slice(0, 40),
      placeholder: input.getAttribute('placeholder'),
      readonly: input.getAttribute('readonly'),
      // wrapper
      wrapperExists: !!wrapper,
      wrapperClass: wrapper?.className?.slice(0, 40),
      wrapperRect: wrapper ? (() => {
        const r = wrapper.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })() : null,
      // form item label
      label: formItem?.querySelector('.el-form-item__label')?.textContent?.trim(),
    };
  });
  console.log(JSON.stringify(nameInfo, null, 2));

  console.log('\n=== 身份证号输入框 ===');
  const idInfo = await page.evaluate(() => {
    const input = document.querySelector('[placeholder="请输入身份证号"]');
    if (!input) return 'NOT FOUND';
    const wrapper = input.closest('.el-input__wrapper');
    const inputBox = input.closest('.el-input');
    const formItem = input.closest('.el-form-item');
    return {
      tag: input.tagName,
      type: input.getAttribute('type'),
      id: input.id,
      class: input.className?.slice(0, 40),
      placeholder: input.getAttribute('placeholder'),
      readonly: input.getAttribute('readonly'),
      // wrapper
      wrapperExists: !!wrapper,
      wrapperClass: wrapper?.className?.slice(0, 40),
      wrapperRect: wrapper ? (() => {
        const r = wrapper.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })() : null,
      // form item label
      label: formItem?.querySelector('.el-form-item__label')?.textContent?.trim(),
    };
  });
  console.log(JSON.stringify(idInfo, null, 2));

  // === 测试 wrapper 点击+type ===
  console.log('\n=== 测试姓名输入 ===');
  const nameInput = page.locator('[placeholder="请输入姓名"]');
  const nameWrapper = nameInput.locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
  const nwCount = await nameWrapper.count();
  console.log(`Name wrapper count: ${nwCount}`);
  if (nwCount > 0) {
    const nwBox = await nameWrapper.boundingBox();
    console.log(`Name wrapper box: ${JSON.stringify(nwBox)}`);
    if (nwBox && nwBox.width > 0 && nwBox.height > 0) {
      await page.mouse.click(nwBox.x + nwBox.width / 2, nwBox.y + nwBox.height / 2);
      await page.waitForTimeout(300);
      await page.keyboard.type('测试名', { delay: 30 });
      await page.waitForTimeout(500);
      const val = await nameInput.inputValue();
      const displayText = await nameWrapper.textContent();
      console.log(`After type: inputValue="${val}", wrapperText="${displayText?.trim()}"`);
    }
  }

  console.log('\n=== 测试身份证号输入 ===');
  const idInput = page.locator('[placeholder="请输入身份证号"]');
  const idWrapper = idInput.locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
  const idwCount = await idWrapper.count();
  console.log(`ID wrapper count: ${idwCount}`);
  if (idwCount > 0) {
    const idwBox = await idWrapper.boundingBox();
    console.log(`ID wrapper box: ${JSON.stringify(idwBox)}`);
    if (idwBox && idwBox.width > 0 && idwBox.height > 0) {
      // 先清空
      await page.mouse.click(idwBox.x + idwBox.width / 2, idwBox.y + idwBox.height / 2);
      await page.waitForTimeout(300);
      await page.keyboard.type('110101199001011234', { delay: 30 });
      await page.waitForTimeout(500);
      const val = await idInput.inputValue();
      const displayText = await idWrapper.textContent();
      console.log(`After type: inputValue="${val}", wrapperText="${displayText?.trim()}"`);
    }
  }

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
