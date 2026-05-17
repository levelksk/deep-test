// 验证：点击"租户"展开子菜单 + 点击"医院管理"
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.locator('text=选择租户').click();
  await page.waitForTimeout(500);
  await page.locator('text=元骁健康').click();
  await page.waitForTimeout(300);
  await page.locator('[placeholder="请输入用户名"]').fill('xulingfeng');
  await page.locator('[placeholder="请输入密码"]').fill('123456');
  await page.locator('text=登 录').click();
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());

  // 看 "租户" 菜单项的状态
  const menuState = await page.evaluate(() => {
    const submenu = document.querySelector('.el-sub-menu');
    if (!submenu) return 'NO SUBMENU';
    return {
      expanded: submenu.getAttribute('aria-expanded'),
      titleText: submenu.querySelector('.el-sub-menu__title span')?.textContent,
      childUlDisplay: submenu.querySelector('ul')?.style.display,
      childCount: submenu.querySelectorAll('.el-menu-item').length,
    };
  });
  console.log('Before click:', JSON.stringify(menuState));

  // 点击 "租户" - 用 text selector
  const span = page.locator('.el-sub-menu__title:has-text("租户")').first();
  const count = await span.count();
  console.log('Found el-sub-menu__title:', count > 0);
  await span.click({ timeout: 5000 });
  await page.waitForTimeout(1000);

  const menuStateAfter = await page.evaluate(() => {
    const submenu = document.querySelector('.el-sub-menu');
    if (!submenu) return 'NO SUBMENU';
    return {
      expanded: submenu.getAttribute('aria-expanded'),
      childUlDisplay: submenu.querySelector('ul')?.style.display,
    };
  });
  console.log('After click:', JSON.stringify(menuStateAfter));

  // 看 "医院管理" 现在是否可见
  const hospitalLink = page.locator('.el-menu-item:has-text("医院管理")');
  const isVisible = await hospitalLink.first().isVisible();
  console.log('Hospital link visible:', isVisible);

  if (isVisible) {
    await hospitalLink.first().click();
    await page.waitForTimeout(3000);
    console.log('URL after clicking 医院管理:', page.url());
    
    console.log('\n=== Page content elements ===');
    const content = await page.evaluate(() => {
      const main = document.querySelector('.el-main, .app-container, [class*="content"], main') || document.body;
      return {
        buttons: Array.from(main.querySelectorAll('button, .el-button')).slice(0, 10).map(b => ({
          text: b.textContent?.trim().slice(0, 20),
          visible: !!b.offsetParent,
        })),
        inputs: Array.from(main.querySelectorAll('input, .el-input__inner')).slice(0, 10).map(i => ({
          placeholder: i.getAttribute('placeholder') || i.textContent?.trim().slice(0, 20),
          visible: !!i.offsetParent,
        })),
      };
    });
    console.log('Buttons:', content.buttons);
    console.log('Inputs:', content.inputs);
  }

  await browser.close();
}

main().catch(console.error);
