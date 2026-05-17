// 测试不同选择器点击"医院管理"的效果
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // Login
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

  console.log('1. URL after login:', page.url());

  // Expand submenu
  const submenuTitle = page.locator('.el-sub-menu__title:has-text("租户")').first();
  await submenuTitle.click();
  await page.waitForTimeout(2000);
  console.log('2. After expand, URL:', page.url());

  // Test 1: text=医院管理
  console.log('\n--- Test A: text=医院管理 ---');
  const textMatchCount = await page.locator('text=医院管理').count();
  console.log(`text=医院管理 count: ${textMatchCount}`);
  for (let i = 0; i < textMatchCount; i++) {
    const el = page.locator('text=医院管理').nth(i);
    const tag = await el.evaluate(el => el.tagName);
    const visible = await el.isVisible();
    const tagName = await el.evaluate(el => el.tagName);
    const parentTag = await el.evaluate(el => el.parentElement?.tagName);
    const parentClass = await el.evaluate(el => el.parentElement?.className?.slice(0,40));
    console.log(`  [${i}] <${tagName}> visible=${visible} parent=<${parentTag}>.${parentClass}`);
  }

  // Test 2: .el-menu-item:has-text("医院管理")
  console.log('\n--- Test B: .el-menu-item:has-text("医院管理") ---');
  const itemCount = await page.locator('.el-menu-item:has-text("医院管理")').count();
  console.log(`count: ${itemCount}`);
  for (let i = 0; i < itemCount; i++) {
    const el = page.locator('.el-menu-item:has-text("医院管理")').nth(i);
    const visible = await el.isVisible();
    const parentClass = await el.evaluate(el => el.parentElement?.parentElement?.className?.slice(0,30));
    console.log(`  [${i}] visible=${visible} parentUl.parent=${parentClass}`);
  }

  // Test 3: Click with .el-menu-item:has-text specifically
  console.log('\n--- Test C: Click .el-menu-item:has-text("医院管理") ---');
  const menuItem = page.locator('.el-menu-item:has-text("医院管理")').first();
  await menuItem.click({ timeout: 5000 });
  await page.waitForTimeout(3000);
  console.log('3. URL after clicking sidebar item:', page.url());
  console.log('Navigated?', !page.url().includes('/home'));

  await browser.close();
}

main().catch(console.error);
