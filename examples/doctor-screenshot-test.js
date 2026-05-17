import { chromium } from 'playwright';
import path from 'path';

const URL = 'https://hospital-test.ybbhealth.com/login?redirect=/home&params={}';
const SCREENSHOT_DIR = 'D:\\projects\\deep-test\\screenshots';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 确保截图目录存在
  const fs = await import('fs');
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // === 登录 ===
  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.locator('text=选择租户').click();
  await page.waitForTimeout(400);
  await page.locator('text=元骁健康').click();
  await page.waitForTimeout(200);
  await page.locator('[placeholder="请输入用户名"]').fill('xulingfeng');
  await page.locator('[placeholder="请输入密码"]').fill('123456');
  await page.locator('text=登 录').click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-首页.png') });
  console.log('✅ 截图1: 首页');

  // === 菜单导航到医生管理 ===
  // 展开租户菜单
  const submenuTitle = page.locator('.el-sub-menu__title:has-text("租户")');
  await submenuTitle.click();
  await page.waitForTimeout(1500);
  await page.locator('.el-menu-item:has-text("医生管理")').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-医生管理列表.png') });
  console.log('✅ 截图2: 医生管理列表');

  // === 点新增 ===
  await page.locator('text=新 增').click();
  await page.waitForTimeout(2000);

  // === 填姓名（用框架已修复的 wrapper 点击+键盘方式）===
  // 手动实现：找到真正可输入的姓名框 → 点击 wrapper → 键盘输入
  const nameInputs = page.locator('[placeholder="请输入姓名"]');
  const nameCount = await nameInputs.count();
  console.log(`找到 ${nameCount} 个姓名输入框`);

  for (let i = 0; i < nameCount; i++) {
    const wrapper = nameInputs.nth(i).locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
    const wb = await wrapper.boundingBox();
    if (wb && wb.width > 0 && wb.height > 0) {
      await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
      await page.waitForTimeout(200);
      await page.keyboard.type('测试的', { delay: 50 });
      await page.waitForTimeout(300);
      const val = await nameInputs.nth(i).inputValue().catch(() => '');
      if (val === '测试的') {
        console.log(`  姓名框[${i}] 写入成功: "${val}"`);
        break;
      }
      console.log(`  姓名框[${i}] 写入失败 (值="${val}")`);
      // 清空再试下一个
      await nameInputs.nth(i).fill('');
    }
  }

  // === 填身份证号 ===
  const idInput = page.locator('[placeholder="请输入身份证号"]').first();
  const idWrapper = idInput.locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
  const idWb = await idWrapper.boundingBox();
  if (idWb) {
    await page.mouse.click(idWb.x + idWb.width / 2, idWb.y + idWb.height / 2);
    await page.waitForTimeout(200);
    await page.keyboard.type('110101198510210061', { delay: 30 });
    await page.waitForTimeout(300);
  }
  console.log('✅ 身份证号写入完成');

  // === 截取表单全貌 ===
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-新增医生表单.png') });
  console.log('✅ 截图3: 新增医生表单（含姓名和身份证号）');

  // 只截取对话框区域
  const dialog = page.locator('.el-overlay-dialog').first();
  if (await dialog.count() > 0) {
    await dialog.screenshot({ path: path.join(SCREENSHOT_DIR, '04-对话框截图.png') });
    console.log('✅ 截图4: 对话框区域截图');
  }

  // === 截图上传头像后 ===
  // 点击上传头像
  const uploadArea = page.locator('.el-upload, [class*="upload"], [class*="avatar"]').first();
  if (await uploadArea.count() > 0) {
    // 用 filechooser 上传
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
      uploadArea.click().catch(() => {}),
    ]);
    if (fileChooser) {
      await fileChooser.setFiles('D:\\projects\\deep-test\\test.jpeg');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-上传头像后.png') });
      console.log('✅ 截图5: 头像上传后');
    } else {
      // 直接用隐藏 input
      const hiddenInput = page.locator('input[type="file"]').first();
      if (await hiddenInput.count() > 0) {
        await hiddenInput.setInputFiles('D:\\projects\\deep-test\\test.jpeg');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-上传头像后.png') });
        console.log('✅ 截图5: 头像上传后 (隐藏input)');
      }
    }
  }

  // === 点击确认 ===
  await page.locator('button:has-text("确认"), button:has-text("保 存"), .el-button--primary:has-text("确认")').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-保存后.png') });
  console.log('✅ 截图6: 保存后');

  console.log(`\n📸 所有截图已保存到: ${SCREENSHOT_DIR}`);
  console.log('   ' + ['01-首页','02-医生管理列表','03-新增医生表单','04-对话框截图','05-上传头像后','06-保存后'].map(f => f+'.png').join('\n   '));

  // 保持浏览器打开10秒让你看
  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch(console.error);
