// 调试：城市下拉框 DOM 结构
import { chromium } from 'playwright';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // 快速登录+导航
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

  // 展开租户菜单 -> 医院管理
  await page.locator('.el-sub-menu__title:has-text("租户")').click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医院管理")').click();
  await page.waitForTimeout(3000);

  // 点新增医院
  await page.locator('text=新增医院').click();
  await page.waitForTimeout(1000);

  // 点城市下拉框
  const citySelect = page.locator('.el-select').filter({ hasText: '请选择城市' });
  await citySelect.locator('.el-select__wrapper').click();
  await page.waitForTimeout(1500);

  // 看看el-select-dropdown的结构
  console.log('=== 城市下拉弹窗结构 ===');
  const popupInfo = await page.evaluate(() => {
    const drop = document.querySelector('.el-select-dropdown');
    if (!drop) return 'NO DROPDOWN';
    return {
      class: drop.className?.slice(0, 60),
      scrollWrap: !!drop.querySelector('.el-scrollbar__wrap'),
      filterInput: !!drop.querySelector('input'),
      innerHeight: drop.querySelector('.el-scrollbar__view')?.scrollHeight || 0,
      visibleItems: Array.from(drop.querySelectorAll('.el-select-dropdown__item, [class*="item"]')).slice(0, 5).map(el => ({
        text: el.textContent?.trim()?.slice(0, 15),
        visible: !!el.offsetParent,
        rect: el.getBoundingClientRect(),
      })),
      searchBox: !!document.querySelector('.el-select__input, .el-select-dropdown input, .el-select__popper input'),
    };
  });
  console.log(JSON.stringify(popupInfo, null, 2));

  // 看el-select的trigger里有没有input
  console.log('\n=== City select trigger structure ===');
  const triggerInfo = await page.evaluate(() => {
    const selects = document.querySelectorAll('.el-select');
    for (const sel of selects) {
      if (sel.textContent?.includes('城市')) {
        return {
          inputCount: sel.querySelectorAll('input').length,
          inputs: Array.from(sel.querySelectorAll('input')).map(i => ({
            placeholder: i.getAttribute('placeholder') || '',
            className: i.className?.slice(0, 40),
            type: i.getAttribute('type'),
          })),
          filterable: sel.classList.contains('is-filterable') || !!sel.querySelector('.el-select__input'),
        };
      }
    }
    return 'NOT FOUND';
  });
  console.log(JSON.stringify(triggerInfo, null, 2));

  // 测试键盘输入
  console.log('\n=== Testing keyboard input ===');
  // 先输入"杭"看看
  await page.keyboard.type('杭');
  await page.waitForTimeout(1000);
  
  const afterType = await page.evaluate(() => {
    const drop = document.querySelector('.el-select-dropdown');
    if (!drop) return 'DROPDOWN CLOSED';
    return {
      visibleCount: Array.from(drop.querySelectorAll('.el-select-dropdown__item')).filter(el => !!el.offsetParent).length,
      firstText: drop.querySelector('.el-select-dropdown__item')?.textContent?.trim()?.slice(0, 20),
      items: Array.from(drop.querySelectorAll('.el-select-dropdown__item')).slice(0, 5).map(el => ({
        text: el.textContent?.trim()?.slice(0, 20),
        visible: !!el.offsetParent,
      })),
    };
  });
  console.log(JSON.stringify(afterType, null, 2));

  await browser.close();
}

main().catch(console.error);
