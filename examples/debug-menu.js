// ========================================
// 调试：检查首页侧边栏菜单结构
// ========================================
import { chromium } from 'playwright';

const LOGIN_URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 登录
  await page.goto(LOGIN_URL);
  await page.waitForTimeout(2000);

  // 选择租户
  console.log('=== DOM: Login page ===');
  await page.locator('text=选择租户').click();
  await page.waitForTimeout(500);
  await page.locator('text=元骁健康').click();
  await page.waitForTimeout(500);

  // 登录
  await page.locator('[placeholder="请输入用户名"]').fill('xulingfeng');
  await page.locator('[placeholder="请输入密码"]').fill('123456');
  await page.locator('text=登 录').click();
  await page.waitForTimeout(5000);

  console.log('\n=== Current URL:', page.url(), '===');

  // 检查侧边栏菜单
  const menuItems = await page.evaluate(() => {
    const items = [];
    // 检查所有可能的菜单元素
    document.querySelectorAll('.el-menu-item, .el-submenu__title, .el-submenu, [role="menuitem"], .sidebar, .aside, .el-aside, .el-menu, nav, [class*="sidebar"] a, [class*="menu"] a').forEach(el => {
      items.push({
        tag: el.tagName,
        class: el.className?.slice(0, 60),
        text: (el.textContent || '').trim().slice(0, 40),
        visible: !!el.offsetParent,
        rect: el.getBoundingClientRect(),
        href: el.getAttribute('href') || '',
        attrs: Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ').slice(0, 80),
      });
    });
    return items;
  });

  console.log('\n=== Sidebar Menu Items ===');
  menuItems.forEach((item, i) => {
    console.log(`[${i}] <${item.tag}> ${item.text} | ${item.class}`);
    console.log(`     visible:${item.visible} href:${item.href} rect:(${Math.round(item.rect.x)},${Math.round(item.rect.y)}) ${Math.round(item.rect.w)}x${Math.round(item.rect.h)}`);
  });

  // 检查完整的侧边栏结构
  console.log('\n=== Sidebar HTML (first 5000 chars) ===');
  const sidebarHTML = await page.evaluate(() => {
    const sidebar = document.querySelector('.el-aside, .sidebar, .el-menu, [class*="sidebar"], [class*="menu"]');
    if (!sidebar) return 'NO SIDEBAR FOUND';
    return sidebar.innerHTML.slice(0, 5000);
  });
  console.log(sidebarHTML);

  // 尝试点击"医院管理"
  console.log('\n=== Trying to click 医院管理 ===');
  const count = await page.locator('text=医院管理').count();
  console.log(`text=医院管理 matches: ${count} elements`);

  for (let i = 0; i < count; i++) {
    const el = page.locator('text=医院管理').nth(i);
    const visible = await el.isVisible();
    const tag = await el.evaluate(el => el.tagName);
    const text = await el.textContent();
    console.log(`  [${i}] <${tag}> visible=${visible} text="${text?.trim()}"`);
  }

  // 再检查 side menu 里的链接
  console.log('\n=== All sidebar links ===');
  const sidebarLinks = await page.evaluate(() => {
    const aside = document.querySelector('.el-aside');
    if (!aside) return [];
    return Array.from(aside.querySelectorAll('a, button, [role="button"], .el-menu-item, .el-submenu__title')).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim(),
      href: el.getAttribute('href') || '',
      class: el.className,
    }));
  });
  sidebarLinks.forEach((l, i) => console.log(`  [${i}] <${l.tag}> "${l.text}" href="${l.href}" class="${l.class}"`));

  await browser.close();
}

main().catch(console.error);
