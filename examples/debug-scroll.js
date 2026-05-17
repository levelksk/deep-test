// 调试：城市下拉虚拟滚动结构
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

  // 点击城市下拉
  const cityWrapper = page.locator('.el-select:has-text("请选择城市") .el-select__wrapper');
  await cityWrapper.click();
  await page.waitForTimeout(2000);

  // 分析弹窗滚动结构
  const scrollInfo = await page.evaluate(() => {
    const drop = document.querySelectorAll('.el-select-dropdown');
    // 找第三个（城市）dropdown
    const cityDrop = drop[2];
    if (!cityDrop || !cityDrop.offsetParent) return 'City dropdown not visible';

    const wrap = cityDrop.querySelector('.el-scrollbar__wrap');
    const view = cityDrop.querySelector('.el-scrollbar__view');

    let scrollEl = wrap;
    let scrollHeight = 0;
    let clientHeight = 0;
    let scrollTop = 0;

    if (wrap) {
      scrollHeight = wrap.scrollHeight;
      clientHeight = wrap.clientHeight;
      scrollTop = wrap.scrollTop;
    }

    // 看前5个可见选项
    const visibleItems = Array.from(cityDrop.querySelectorAll('.el-select-dropdown__item'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const pr = wrap ? wrap.getBoundingClientRect() : null;
        if (pr && (r.bottom < pr.top || r.top > pr.bottom)) return false;
        return true;
      })
      .slice(0, 8)
      .map(el => ({
        text: el.textContent?.trim()?.slice(0, 15),
        indexInDOM: Array.from(cityDrop.querySelectorAll('.el-select-dropdown__item')).indexOf(el),
      }));

    return {
      scrollHeight,
      clientHeight,
      scrollTop,
      totalItems: cityDrop.querySelectorAll('.el-select-dropdown__item').length,
      visibleCount: visibleItems.length,
      items: visibleItems,
      transform: view?.style?.transform || 'none',
    };
  });
  console.log('Pre-scroll:', JSON.stringify(scrollInfo, null, 2));

  // 测试：scroll wrap 使用 native scrollBy
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const drop = document.querySelectorAll('.el-select-dropdown')[2];
      if (!drop) return;
      const wrap = drop.querySelector('.el-scrollbar__wrap');
      if (wrap) wrap.scrollBy({ top: 600, behavior: 'smooth' });
    });
    await page.waitForTimeout(1500);
    
    const after = await page.evaluate(() => {
      const drop = document.querySelectorAll('.el-select-dropdown')[2];
      if (!drop) return null;
      const wrap = drop.querySelector('.el-scrollbar__wrap');
      return { scrollTop: wrap?.scrollTop, scrollHeight: wrap?.scrollHeight };
    });
    console.log(`Scroll ${i+1}: scrollTop=${after?.scrollTop}, scrollHeight=${after?.scrollHeight}`);
  }

  // 检查滚动后的可见选项
  const afterScroll = await page.evaluate(() => {
    const drop = document.querySelectorAll('.el-select-dropdown')[2];
    if (!drop) return null;
    const wrap = drop.querySelector('.el-scrollbar__wrap');
    const visibleItems = Array.from(drop.querySelectorAll('.el-select-dropdown__item'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const pr = wrap ? wrap.getBoundingClientRect() : null;
        if (pr && (r.bottom < pr.top || r.top > pr.bottom)) return false;
        return true;
      })
      .slice(0, 20)
      .map(el => el.textContent?.trim()?.slice(0, 20));
    return { visibleItems, count: visibleItems.length };
  });
  console.log('After 3 scrolls:', JSON.stringify(afterScroll, null, 2));

  await browser.close();
}

main().catch(console.error);
