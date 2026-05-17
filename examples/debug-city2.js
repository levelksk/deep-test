// 调试 v3: 找到城市下拉的正确选项
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

  // 找城市下拉对应的popper id
  const citySelectInfo = await page.evaluate(() => {
    const selects = document.querySelectorAll('.el-select');
    for (const sel of selects) {
      if (sel.textContent?.includes('城市')) {
        const popperId = sel.getAttribute('aria-controls');
        const popperEl = popperId ? document.getElementById(popperId) : null;
        return {
          popperId,
          popperExists: !!popperEl,
          popperClass: popperEl?.className?.slice(0, 50),
          popperItems: popperEl ? Array.from(popperEl.querySelectorAll('.el-select-dropdown__item,[class$="__item"]')).slice(0, 3).map(el => ({
            text: el.textContent?.trim()?.slice(0, 20),
          })) : [],
        };
      }
    }
    return 'NOT FOUND';
  });
  console.log('City select info:', JSON.stringify(citySelectInfo, null, 2));

  // 点击城市下拉
  const citySelectWrapper = page.locator('.el-select:has-text("请选择城市") .el-select__wrapper');
  await citySelectWrapper.click();
  await page.waitForTimeout(2000);

  // 现在找城市下拉的popper
  const afterOpen = await page.evaluate(() => {
    const selects = document.querySelectorAll('.el-select');
    for (const sel of selects) {
      if (sel.textContent?.includes('城市')) {
        const popperId = sel.getAttribute('aria-controls');
        const popperEl = popperId ? document.getElementById(popperId) : null;
        if (popperEl) {
          const items = Array.from(popperEl.querySelectorAll('.el-select-dropdown__item')).map(el => ({
            text: el.textContent?.trim()?.slice(0, 20),
            visible: !!el.offsetParent,
            rect: el.getBoundingClientRect(),
            selected: el.classList.contains('is-selected') || el.classList.contains('is-active'),
          }));
          // 找"杭州"
          const hangzhouItem = items.find(i => i.text.startsWith('杭州'));
          return {
            popperVisible: popperEl.style.display !== 'none',
            totalItems: items.length,
            first3: items.slice(0, 3),
            last3: items.slice(-3),
            hangzhou: hangzhouItem || 'NOT FOUND',
          };
        }
        return { popperEl: 'NULL' };
      }
    }
    return 'NOT FOUND';
  });
  console.log('After open:', JSON.stringify(afterOpen, null, 2));

  // 直接找 "杭州" 文本
  console.log('\n=== text=杭州 ===');
  const hzCount = await page.locator('text=杭州').count();
  console.log(`text=杭州 count: ${hzCount}`);
  for (let i = 0; i < Math.min(hzCount, 5); i++) {
    const el = page.locator('text=杭州').nth(i);
    const tag = await el.evaluate(el => el.tagName);
    const visible = await el.isVisible();
    const text = await el.textContent();
    const parentClass = await el.evaluate(el => el.closest('.el-select-dropdown') ? 'IN_DROPDOWN' : 'OTHER');
    console.log(`  [${i}] <${tag}> visible=${visible} text="${text?.trim().slice(0,20)}" parent=${parentClass}`);
  }

  console.log('\n=== .el-select-dropdowns ===');
  const allDrops = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.el-select-dropdown')).map((d, i) => ({
      idx: i,
      visible: d.style.display !== 'none' && !!d.offsetParent,
      text: d.textContent?.trim()?.slice(0, 50),
      itemCount: d.querySelectorAll('.el-select-dropdown__item').length,
    }));
  });
  console.log(JSON.stringify(allDrops, null, 2));

  await browser.close();
}

main().catch(console.error);
