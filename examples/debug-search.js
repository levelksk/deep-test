// 调试 v5: wrapper聚焦后键盘输入
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

  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医院管理")').click();
  await page.waitForTimeout(3000);
  await page.locator('text=新增医院').click();
  await page.waitForTimeout(1000);

  // 点击城市wrapper打开下拉
  const cityWrapper = page.locator('.el-select:has-text("请选择城市") .el-select__wrapper');
  await cityWrapper.click();
  await page.waitForTimeout(1500);

  // 现在wrapper是 focused + filterable，直接键盘输入"杭州"
  await page.keyboard.type('杭州', { delay: 100 });
  await page.waitForTimeout(2000);

  // 看过滤后结果
  const result = await page.evaluate(() => {
    // 找到可见的城市下拉
    const drops = Array.from(document.querySelectorAll('.el-select-dropdown'))
      .filter(d => d.offsetParent);
    const cityDrop = drops.find(d => d.querySelectorAll('.el-select-dropdown__item').length > 10);
    if (!cityDrop) return { msg: 'NO CITY DROPDOWN', allDrops: drops.map(d => ({ text: d.textContent?.slice(0, 40) })) };
    
    const wrap = cityDrop.querySelector('.el-scrollbar__wrap');
    const items = Array.from(cityDrop.querySelectorAll('.el-select-dropdown__item'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        if (wrap) {
          const pr = wrap.getBoundingClientRect();
          if (r.bottom < pr.top || r.top > pr.bottom) return false;
        }
        return true;
      })
      .map(el => el.textContent?.trim());
    return { items, count: items.length };
  });
  console.log('Filtered:', JSON.stringify(result, null, 2));

  // 点击杭州市
  const hz = page.locator('.el-select-dropdown__item:has-text("杭州")').first();
  const hzCount = await hz.count();
  if (hzCount > 0) {
    await hz.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const selected = await cityWrapper.textContent();
    console.log(`Selected: "${selected?.trim()}"`);
  }

  await browser.close();
}

main().catch(console.error);
