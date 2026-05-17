// 直观调试：打开医生新增页面，逐个测试姓名输入框
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // === 登录 ===
  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.locator('text=选择租户').click();
  await page.waitForTimeout(500);
  await page.locator('text=元骁健康').click();
  await page.waitForTimeout(300);
  await page.locator('[placeholder="请输入用户名"]').fill('xulingfeng');
  await page.locator('[placeholder="请输入密码"]').fill('123456');
  await page.locator('text=登 录').click();
  await page.waitForTimeout(6000);

  // === 菜单导航到医生管理 ===
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);

  // === 点新增 ===
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // === 查看所有含"姓名"的输入框 ===
  const allNameInputs = await page.evaluate(() => {
    const inputs = document.querySelectorAll('[placeholder="请输入姓名"]');
    return Array.from(inputs).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const wrapper = el.closest('.el-input__wrapper');
      const formItem = el.closest('.el-form-item');
      const label = formItem?.querySelector('.el-form-item__label')?.textContent?.trim() || '无标签';
      return {
        index: i,
        id: el.id,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        visible: rect.width > 0 && rect.height > 0,
        wrapperRect: wrapper ? (() => {
          const r = wrapper.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        })() : null,
        label,
      };
    });
  });
  console.log('所有"请输入姓名"输入框:');
  allNameInputs.forEach((n, i) => console.log(`  [${i}] id=${n.id} label="${n.label}" rect=(${n.rect.x},${n.rect.y}) ${n.rect.w}x${n.rect.h} wrapper=${JSON.stringify(n.wrapperRect)}`));

  // === 逐个测试每个输入框 ===
  for (let i = 0; i < allNameInputs.length; i++) {
    console.log(`\n--- 测试输入框 [${i}] ---`);
    const wrapper = page.locator(`#${allNameInputs[i].id}`).locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
    const wb = await wrapper.boundingBox();
    console.log(`Wrapper box: ${JSON.stringify(wb)}`);
    
    if (wb && wb.width > 0) {
      await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
      await page.waitForTimeout(500);
      console.log(`Clicked at (${wb.x + wb.width/2}, ${wb.y + wb.height/2})`);
      
      // 输入前先清空
      await page.keyboard.type('测试名' + i, { delay: 50 });
      await page.waitForTimeout(500);
      
      const val = await page.locator(`#${allNameInputs[i].id}`).inputValue();
      const wrapperText = await wrapper.textContent();
      console.log(`After type: inputValue="${val}" wrapper显示="${wrapperText?.trim()}"`);

      // 清空以便下一个测试
      await page.locator(`#${allNameInputs[i].id}`).fill('');
    }
  }

  console.log('\n=== 对话框保持打开，你看一下界面上哪个输入框有文字 ===');
  await page.waitForTimeout(30000); // 等30秒让你看

  await browser.close();
}

main().catch(console.error);
