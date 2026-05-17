// 直观显示：分别填两个姓名框，看谁变了
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

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
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // 打印对话框完整HTML结构（前2000字符）
  const dialogHTML = await page.evaluate(() => {
    const dialog = document.querySelector('.el-overlay-dialog');
    if (!dialog) return 'NO DIALOG';
    const form = dialog.querySelector('form, .el-form');
    return (form || dialog).innerHTML.slice(0, 3000);
  });
  console.log('=== 对话框表单HTML ===');
  console.log(dialogHTML);

  // 看所有form-item的label
  const formItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.el-form-item')).map((item, i) => {
      const label = item.querySelector('.el-form-item__label')?.textContent?.trim() || '';
      const input = item.querySelector('input');
      return {
        index: i,
        label,
        placeholder: input?.getAttribute('placeholder') || '',
        id: input?.id || '',
        rect: input ? (() => { const r = input.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y)}; })() : null,
      };
    });
  });
  console.log('\n=== 所有表单字段 ===');
  formItems.forEach(f => console.log(`  [${f.index}] label="${f.label}" placeholder="${f.placeholder}" pos=(${f.rect?.x},${f.rect?.y}) id=${f.id}`));

  await page.waitForTimeout(60000);
  await browser.close();
}

main().catch(console.error);
