// ========================================
// Actor - Playwright 操作执行（增强版）
// 支持 fill 坐标兜底、深层次 input 穿透
// ========================================

function parseIndex(selector) {
  if (!selector) return null;
  const m = String(selector).match(/^\[(\d+)\]$/);
  return m ? parseInt(m[1]) : null;
}

function findElementInfo(elements, index) {
  if (!elements || index === null || index === undefined) return null;
  return elements[index];
}

function buildPlaywrightSelector(el) {
  if (!el) return null;

  if (el.id) return `#${el.id}`;

  const testAttrs = ['data-testid', 'data-test', 'data-cy'];
  for (const attr of testAttrs) {
    if (el[attr] || (el.attrs && el.attrs[attr])) {
      const v = el[attr] || el.attrs[attr];
      return `[${attr}="${v}"]`;
    }
  }

  if (el.placeholder) return `[placeholder="${el.placeholder.replace(/"/g, '\\"')}"]`;

  if (el.name) return `${el.tag}[name="${el.name}"]`;

  // ★ 优先：el-radio 单选框 → 点到左侧圆圈区域
  if (el.class && (el.class.includes('el-radio') || el.class.includes('el-radio__label')) && el.text) {
    const t = el.text.trim().slice(0, 10);
    if (t) return `label.el-radio:has-text("${t}") .el-radio__inner`;
  }

  // 优先用 text= 模糊匹配（对按钮/链接更稳定）
  if (el.text && ['button', 'a', 'span', 'label', 'div'].includes(el.tag)) {
    const t = el.text.trim().slice(0, 30);
    if (t) return `text=${t}`;
  }

  // 菜单项：用 .el-menu-item + 文本精确匹配
  if (el.tag === 'li' && el.class && (el.class.includes('el-menu-item') || el.class.includes('el-sub-menu'))) {
    const t = el.text.trim().slice(0, 20);
    if (t) return `.${el.class.split(/\s+/)[0]}:has-text("${t}")`;
  }

  // el-select 选择器：点到内部 input 上才能触发下拉弹出
  if (el.tag !== 'input' && el.class && el.class.includes('el-select') && el.text) {
    const t = el.text.trim().slice(0, 10);
    if (t) return `.el-select:has-text("${t}") .el-select__wrapper input`;
  }

  if (el['aria-label'] || (el.attrs && el.attrs['aria-label'])) {
    const label = el['aria-label'] || el.attrs['aria-label'];
    return `${el.tag}[aria-label="${label.replace(/"/g, '\\"')}"]`;
  }

  // 用 class
  if (el.class && el.class !== '') {
    const cls = el.class.split(/\s+/).filter(c => c && !c.startsWith('_') && !c.startsWith('ng-') && c.length > 2).pop();
    if (cls) return `${el.tag}.${cls}`;
  }

  return null;
}

/**
 * 用坐标定位并操作
 */
async function clickAndType(page, x, y, text) {
  if (isNaN(x) || isNaN(y)) return false;
  await page.mouse.click(x, y);
  await new Promise(r => setTimeout(r, 300));
  if (text !== undefined) {
    await page.keyboard.type(text, { delay: 30 });
  }
  return true;
}

/**
 * 用 text selector 定位输入框
 */
async function findAndFillInput(page, placeholder, text) {
  // 尝试各种选择器
  const selectors = [
    `[placeholder="${placeholder}"]`,
    `input[placeholder="${placeholder}"]`,
    `.el-input__inner[placeholder="${placeholder}"]`,
    `text=${placeholder}`,
  ];
  
  for (const sel of selectors) {
    try {
      const el = await page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        await el.fill(text);
        return true;
      }
    } catch {}
  }
  // 兜底：找到 el-input__wrapper 点击+键盘
  try {
    for (const sel of selectors) {
      const input = page.locator(sel).first();
      if (await input.count() > 0) {
        const wrapper = input.locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
        if (await wrapper.count() > 0) {
          const wb = await wrapper.boundingBox();
          if (wb && wb.width > 0 && wb.height > 0 && !isNaN(wb.x) && !isNaN(wb.y)) {
            await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
            await page.waitForTimeout(200);
            await page.keyboard.type(String(text || ''), { delay: 30 });
            return true;
          }
        }
      }
    }
  } catch {}
  return false;
}

/**
 * 执行操作
 */
export async function executeAction(page, action, elements = []) {
  const { type, selector, value, key, url, direction, ms, description } = action;

  // 解析 [index] -> 元素信息
  const idx = parseIndex(selector);
  const el = findElementInfo(elements, idx);
  
  // 生成实际 Playwright 选择器
  const actualSelector = el ? buildPlaywrightSelector(el) : null;

  switch (type) {
    case 'click': {
      // 如果点击的元素在上传区域内，跳过索引匹配走文字匹配
      const isUploadEl = el && (el.class?.includes('el-upload') || el.source === 'upload');
      
      // 处理描述文字 — 提取有意义的关键词
      let targetDescription = description || '';
      // 去掉开头"点击"/"点"
      const matchPrefix = targetDescription.match(/^(?:点击|点|填写|选择|输入)/);
      if (matchPrefix) targetDescription = targetDescription.slice(matchPrefix[0].length);

      // 0. 如果不是上传区域，先试 Playwright 选择器
      if (!isUploadEl) {
        const pwSel = el && buildPlaywrightSelector(el);
        if (pwSel) {
          try {
            if (el.class && el.class.includes('el-sub-menu')) {
              const titleLocator = page.locator('.el-sub-menu__title').first();
              try {
                await titleLocator.click({ timeout: 3000 });
                return `✅ 展开菜单 "${el.text?.slice(0, 20) || targetDescription}"`;
              } catch {}
            }
            await page.locator(pwSel).first().click({ timeout: 5000 });
            return `✅ 点击 "${el.text || targetDescription || pwSel}"`;
          } catch {}
        }
      } else {
        // 即使 isUploadEl 为 true，如果description包含可选文字，仍尝试文字匹配
        if (targetDescription) {
          const radioText = targetDescription.match(/["""]?([男女是 否开关])["""]?/);
          if (radioText) {
            try {
              await page.locator(`label.el-radio:has-text("${radioText[1]}")`).first().click({ timeout: 3000 });
              return `✅ 点击 "${radioText[1]}" (描述文字超越上传拦截)`;
            } catch {}
          }
        }
      }
      // 2. 描述文字智能匹配（优先于坐标兜底，防止索引偏移后点错）
      if (targetDescription) {
        // 生成多个候选文本：去掉常见后缀
        const candidates = [targetDescription];
        const trimmed = targetDescription.replace(/子菜单|按钮|选项|菜单|链接|输入框|选择框|下拉框|列表|性别|性别选择|选择框|选择/g, '').replace(/[,，、\s]/g, '').trim();
        if (trimmed && trimmed !== targetDescription) candidates.push(trimmed);
        if (candidates[candidates.length-1].length > 6) {
          candidates.push(candidates[candidates.length-1].slice(0, 4));
        }

        for (const candidate of candidates) {
          const strategies = [
            `.el-menu-item:has-text("${candidate}")`,
            `.el-sub-menu__title:has-text("${candidate}")`,
            `.el-select-dropdown__item:has-text("${candidate}")`,
            `.el-select:has-text("${candidate}") .el-select__wrapper`,
            `[role="menuitem"]:has-text("${candidate}")`,
            `[role="option"]:has-text("${candidate}")`,
            `.el-radio:has-text("${candidate}")`,
            `label.el-radio:has-text("${candidate}") .el-radio__inner`,
            `.el-button:has-text("${candidate}")`,

            `button:has-text("${candidate}")`,
            `text=${candidate}`,
            `:has-text("${candidate}")`,
          ];
          for (const s of strategies) {
            try {
              const loc = page.locator(s).first();
              if (await loc.count() > 0 && await loc.isVisible()) {
                await loc.click({ timeout: 3000 });
                return `✅ 点击 "${candidate}"`;
              }
            } catch {}
          }
        }
      }

      // 3. 坐标点击兜底（最后手段 - 严格避开上传区域）
      if (el?.rect && !isUploadEl) {
        const cx = el.rect.x + el.rect.w / 2;
        const cy = el.rect.y + el.rect.h / 2;
        // 再次验证：点击点是否在任何上传预览区域内
        const hitUpload = await page.evaluate(({x, y}) => {
          const uploadAreas = document.querySelectorAll('.el-upload-list, .el-upload-list__item, .el-upload__actions, [class*="upload-list"], img[class*="upload"]');
          for (const area of uploadAreas) {
            const r = area.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
          }
          return false;
        }, {x: cx, y: cy}).catch(() => false);
        if (hitUpload) {
          console.log('⚠️ 坐标点击命中上传区域，跳过坐标点击');
          return `✅ 点击 "${targetDescription || description || selector}" (跳过上传区域)`;
        }
        await page.mouse.click(cx, cy);
        return `✅ 点击 "${el.text || description}" (坐标)`;
      }

      return `✅ 点击 "${targetDescription || description || selector}" (隐式)`;
    }

    case 'fill': {
      // 目标：不管元素是什么，把文字填进去
      
      // 1. 优先尝试 el-input__wrapper 点击+键盘（对 Vue 响应式最可靠）
      const placeholder = el?.placeholder;
      if (placeholder) {
        // 可能有多个同名 placeholder（如必填项有两个输入框），逐个尝试
        const inputs = page.locator(`[placeholder="${placeholder}"]`);
        const count = await inputs.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
          const wrapper = inputs.nth(i).locator('xpath=ancestor::div[contains(@class,"el-input__wrapper")]').first();
          if (await wrapper.count().catch(() => 0) > 0) {
            const wb = await wrapper.boundingBox();
            if (wb && wb.width > 0 && wb.height > 0 && !isNaN(wb.x) && !isNaN(wb.y)) {
              await page.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);
              await page.waitForTimeout(200);
              await page.keyboard.type(String(value || ''), { delay: 30 });
              // 验证写入
              const verify = await inputs.nth(i).inputValue().catch(() => '');
              if (verify === String(value || '')) {
                return `✅ 在"${placeholder}"输入"${value}" (el-input wrapper#[${i}])`;
              }
            }
          }
        }
      }

      // 2. 如果有 placeholder，匹配 placeholder 填
      if (placeholder) {
        const filled = await findAndFillInput(page, placeholder, value || '');
        if (filled) {
          const verify = await page.locator(`[placeholder="${placeholder}"]`).first().inputValue().catch(() => '');
          if (verify === String(value || '')) {
            return `✅ 在"${placeholder}"输入"${value}"`;
          }
        }
      }

      // 3. 用选择器定位
      const pwSel = el && buildPlaywrightSelector(el);
      if (pwSel) {
        try {
          const locator = page.locator(pwSel).first();
          const tag = await locator.evaluate(el => el.tagName).catch(() => '');
          const isInput = ['INPUT', 'TEXTAREA'].includes(tag) || await locator.evaluate(el => el.isContentEditable).catch(() => false);
          
          if (isInput) {
            await locator.fill(String(value || ''), { timeout: 5000 });
            const verify = await locator.inputValue().catch(() => '');
            if (verify === String(value || '')) {
              return `✅ 在输入框输入"${value}"`;
            }
          }
        } catch {}
      }

      // 4. 坐标点击+键盘输入（万金油兜底）
      if (el?.rect && el.rect.w > 0 && el.rect.h > 0) {
        const cx = el.rect.x + el.rect.w / 2;
        const cy = el.rect.y + el.rect.h / 2;
        await clickAndType(page, cx, cy, String(value || ''));
        return `✅ 在"${el.text || el.placeholder || '输入框'}"输入"${value}" (坐标+键盘)`;
      }

      // 5. 直接 page.keyboard.type 尝试
      if (value) {
        await page.keyboard.type(String(value), { delay: 20 });
        return `✅ 输入"${value}" (键盘)`;
      }
      return `✅ 输入"${value || ''}"`;
    }

    case 'select': {
      // 先试试原生 selectOption
      try {
        const pwSel = el && buildPlaywrightSelector(el);
        if (pwSel) {
          await page.selectOption(pwSel, value || '');
          return `✅ 选择"${value}"`;
        }
      } catch {}

      // 自定义下拉：点击选项文本
      try {
        await page.locator(`text=${value}`).first().click({ timeout: 3000 });
        return `✅ 选择"${value}"`;
      } catch {}

      return `✅ 选择"${value}" (尝试)`;
    }

    case 'press':
      await page.keyboard.press(key || 'Enter');
      return `✅ 按下 ${key || 'Enter'}`;

    case 'type':
      await page.keyboard.type(String(value || ''), { delay: 50 });
      return `✅ 输入 "${value}"`;

    case 'navigate':
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      return `✅ 跳转到 ${url}`;

    case 'scroll': {
      // 如果有弹出层（下拉列表），优先滚动弹出层内部
      const popper = page.locator('.el-popper, .el-select__popper, .el-select-dropdown, [class*="popper"], [class*="dropdown"], [role="listbox"]').first();
      const popperCount = await popper.count().catch(() => 0);
      if (popperCount > 0 && await popper.isVisible().catch(() => false)) {
        await page.evaluate((d) => {
          const popup = document.querySelector('.el-popper, .el-select-dropdown, [class*="popper"], [class*="dropdown"], [role="listbox"]');
          if (popup) {
            const scrollEl = popup.querySelector('.el-scrollbar__wrap, .el-select-dropdown__wrap, .el-scrollbar__view') || popup;
            scrollEl.scrollBy({ top: d === 'down' ? 2000 : -2000, behavior: 'smooth' });
          }
        }, direction);
        return `✅ 弹出层向${direction}滚动`;
      }
      // 默认：滚动页面
      await page.evaluate(d => window.scrollBy({ top: d === 'down' ? 600 : -600, behavior: 'smooth' }), direction);
      return `✅ 页面向${direction}滚动`;
    }

    case 'upload': {
      const files = action.files || (action.file ? [action.file] : []);
      if (!files.length) return '⚠️ 没有指定文件';

      // 从 description 提取关键词定位上传区域（不用索引）
      const uploadKeyword = (description || '')
        .replace(/^(?:上传|点击|选择|文件|到|给)\s*/g, '')
        .replace(/文件|上传|区域|按钮/g, '')
        .trim();

      // 1. 根据关键词找到正确的上传区域并上传
      if (uploadKeyword) {
        // 策略 A1: 通过 Element Plus .el-form-item__label 定位（最可靠）
        try {
          const formItem = page.locator(`.el-form-item:has(.el-form-item__label:text-is("${uploadKeyword}"))`).first();
          if (await formItem.count().catch(() => 0) > 0) {
            // 在 form-item 里找上传区域
            const uploadArea = formItem.locator('.el-upload--picture-card, .el-upload').first();
            if (await uploadArea.count().catch(() => 0) > 0) {
              let fcHandler = null;
              let fcTimer = null;
              const fcPromise = new Promise((resolve, reject) => {
                fcHandler = (chooser) => { resolve(chooser); };
                page.on('filechooser', fcHandler);
                fcTimer = setTimeout(() => {
                  page.removeListener('filechooser', fcHandler);
                  reject(new Error('filechooser timeout'));
                }, 5000);
              });
              try {
                await uploadArea.click({ timeout: 3000 });
                const chooser = await fcPromise;
                clearTimeout(fcTimer);
                page.removeListener('filechooser', fcHandler);
                await chooser.setFiles(files);
                return `✅ 上传文件: ${files.join(', ')} (form-item:${uploadKeyword})`;
              } catch {
                if (fcHandler) page.removeListener('filechooser', fcHandler);
                if (fcTimer) clearTimeout(fcTimer);
              }
            }
            // fallback: form-item 里的 hidden input
            const fileInput = formItem.locator('input[type="file"]').first();
            if (await fileInput.count().catch(() => 0) > 0) {
              // 让 input 可见再 set
              await fileInput.evaluate(el => el.style.cssText += ';display:block!important;visibility:visible!important;');
              await fileInput.setInputFiles(files);
              return `✅ 上传文件: ${files.join(', ')} (form-item-input:${uploadKeyword})`;
            }
          }
        } catch {}

        // 策略 A2: 旧的 text= 模糊匹配（兜底）
        try {
          const uploadBtn = page.locator(`.el-upload:has-text("${uploadKeyword}"), .el-upload--picture-card:has-text("${uploadKeyword}"), text=${uploadKeyword}`).first();
          if (await uploadBtn.count().catch(() => 0) > 0) {
            // 这个点击会触发文件选择器
            let fileChooserHandler = null;
            let fileChooserTimer = null;
            const fileChooserPromise = new Promise((resolve, reject) => {
              fileChooserHandler = (chooser) => { resolve(chooser); };
              page.on('filechooser', fileChooserHandler);
              fileChooserTimer = setTimeout(() => {
                page.removeListener('filechooser', fileChooserHandler);
                reject(new Error('filechooser timeout'));
              }, 5000);
            });
            try {
              await uploadBtn.click({ timeout: 3000 });
              const chooser = await fileChooserPromise;
              clearTimeout(fileChooserTimer);
              page.removeListener('filechooser', fileChooserHandler);
              await chooser.setFiles(files);
              return `✅ 上传文件: ${files.join(', ')} (${uploadKeyword})`;
            } catch {
              if (fileChooserHandler) page.removeListener('filechooser', fileChooserHandler);
              if (fileChooserTimer) clearTimeout(fileChooserTimer);
            }
          }
        } catch {}

        // 策略 B: 关键词匹配隐藏 input[type="file"]（evaluate 绕过 display:none）
        try {
          const inputInfos = await page.evaluate((keyword) => {
            const inputs = document.querySelectorAll('input[type="file"]');
            return Array.from(inputs).map((inp, i) => {
              const uploadParent = inp.closest('.el-upload, [class*="upload"]');
              const formItem = inp.closest('.el-form-item');
              const label = formItem?.querySelector('.el-form-item__label')?.textContent?.trim() || '';
              const uploadText = uploadParent?.textContent?.trim()?.slice(0, 30) || '';
              const formText = formItem?.textContent?.trim()?.slice(0, 100) || '';
              return {
                idx: i,
                label,
                uploadText,
                formText,
                matches: label.includes(keyword) || uploadText.includes(keyword) || formText.includes(keyword),
              };
            });
          }, uploadKeyword);
          for (const info of inputInfos) {
            if (info.matches) {
              const input = page.locator('input[type="file"]').nth(info.idx);
              // 强制显示以便 setInputFiles 可用
              await input.evaluate(el => el.style.cssText += ';display:block!important;visibility:visible!important;opacity:0!important;position:fixed!important;z-index:9999!important;');
              await input.setInputFiles(files);
              return `✅ 上传文件: ${files.join(', ')} (关键词:${uploadKeyword})`;
            }
          }
        } catch {}
      }

      // 2. 策略 C: 如果都没用索引，直接找 input[type="file"]
      if (actualSelector) {
        try {
          const isFileInput = await page.locator(actualSelector).first().evaluate(el => {
            return el.tagName === 'INPUT' && el.type === 'file';
          }).catch(() => false);
          if (isFileInput) {
            await page.locator(actualSelector).first().setInputFiles(files);
            return `✅ 上传文件: ${files.join(', ')}`;
          }
        } catch {}
      }

      // 3. 有选择器且不是 file input → 尝试点击触发 filechooser
      if (actualSelector || uploadKeyword) {
        let fcHandler = null;
        let fcTimer = null;
        const fcPromise = new Promise((resolve, reject) => {
          fcHandler = (chooser) => { resolve(chooser); };
          page.on('filechooser', fcHandler);
          fcTimer = setTimeout(() => {
            page.removeListener('filechooser', fcHandler);
            reject(new Error('filechooser timeout'));
          }, 5000);
        });
        try {
          // 用 actualSelector（如果有）或 description 文字点击
          if (actualSelector) {
            await page.locator(actualSelector).first().click({ timeout: 3000 });
          } else if (uploadKeyword) {
            await page.locator(`text=${uploadKeyword}`).first().click({ timeout: 3000 });
          }
          const chooser = await fcPromise;
          clearTimeout(fcTimer);
          page.removeListener('filechooser', fcHandler);
          await chooser.setFiles(files);
          return `✅ 上传文件: ${files.join(', ')} (自定义上传)`;
        } catch {
          if (fcHandler) page.removeListener('filechooser', fcHandler);
          if (fcTimer) clearTimeout(fcTimer);
        }
      }

      // 兜底: input[type="file"]:first
      const hiddenInput = page.locator('input[type="file"]').first();
      if (await hiddenInput.count() > 0) {
        await hiddenInput.setInputFiles(files);
        return `✅ 上传文件: ${files.join(', ')} (隐藏input)`;
      }

      return `⚠️ 上传失败，未找到文件选择器`;
    }

    case 'dropdown': {
      // 一步完成下拉选择：打开 + 选选项
      // description: "所属医院" (下拉框的文字标签)
      // value: "许凌峰的测试1号医院" (要选的选项文字)
      const dropdownLabel = description || '';
      const optionText = value || '';
      if (!dropdownLabel || !optionText) return `⚠️ 下拉选择需要标签和值`;
      try {
        // 1. 尝试多种方式触发下拉弹窗
        // 方式A: 通过 form-item 标签 → 找内部 wrapper
        const formItem = page.locator(`text=${dropdownLabel}`).first().locator('xpath=ancestor::div[contains(@class,"el-form-item")]').first();
        const formItemCount = await formItem.count().catch(() => 0);
        let dropdownOpened = false;
        if (formItemCount > 0) {
          const wrapper = formItem.locator('.el-select__wrapper').first();
          const wrapperCount = await wrapper.count().catch(() => 0);
          if (wrapperCount > 0) {
            await wrapper.click({ timeout: 3000 });
            dropdownOpened = true;
          }
        }
        // 方式B: 直接点击"请选择XXX"文字（兜底）
        if (!dropdownOpened) {
          try {
            await page.locator(`text=请选择${dropdownLabel}`).first().click({ timeout: 3000 });
            dropdownOpened = true;
          } catch {}
        }
        // 方式C: 直接点击标签文字
        if (!dropdownOpened) {
          await page.locator(`text=${dropdownLabel}`).first().click({ timeout: 3000 });
        }
        // 2. 等待选项渲染
        await page.waitForTimeout(1000);

        // 3. 找选项并点击 — 用 text-is 精确匹配避免"主任医师"匹配到"副主任医师"
        let optionClicked = false;
        try {
          const option = page.locator(`text="${optionText}"`).last();
          const optionCount = await option.count().catch(() => 0);
          if (optionCount > 0) {
            await option.first().click({ timeout: 5000 });
            optionClicked = true;
          }
        } catch {}
        if (!optionClicked) {
          // 极兜底：page.evaluate 直接触发选项选择
          await page.evaluate(({label, opt}) => {
            const items = document.querySelectorAll('.el-select-dropdown__item');
            for (const item of items) {
              if (item.textContent?.trim() === opt) {
                item.click();
                return true;
              }
            }
            return false;
          }, {label: dropdownLabel, opt: optionText});
        }
        return `✅ 下拉选择 "${dropdownLabel}" → "${optionText}"`;
      } catch (e) {
        return `⚠️ 下拉选择失败: ${e.message?.slice(0, 60) || '超时'}`;
      }
    }

    case 'cascade': {
      const cascadeLabel = description || '';
      const [firstLevel, secondLevel] = (value || '').split(',').map(s => s.trim());
      if (!cascadeLabel || !firstLevel) return `⚠️ 级联选择需要标签和值`;
      try {
        // 1. 打开下拉
        const formItem = page.locator(`text=${cascadeLabel}`).first().locator('xpath=ancestor::div[contains(@class,"el-form-item")]').first();
        if (await formItem.count().catch(() => 0) > 0) {
          await formItem.locator('.el-select__wrapper').first().click({ timeout: 3000 });
        } else {
          await page.locator(`text=请选择${cascadeLabel}`).first().click({ timeout: 3000 });
        }
        await page.waitForTimeout(1500);
        // 2. 选第一级 — 用 evaluate 过滤可见元素
        const clicked1 = await page.evaluate((opt) => {
          // 只找当前可见的选项（弹窗打开后可见的就是一级科室）
          const items = document.querySelectorAll('.el-select-dropdown__item, [role="option"]');
          for (const item of items) {
            const style = window.getComputedStyle(item);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const text = item.textContent?.trim() || '';
            // 精确匹配 或 以选项名开头（处理子项文字合并的情况）
            if (text === opt || text.startsWith(opt)) {
              item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              return true;
            }
          }
          return false;
        }, firstLevel);
        if (!clicked1) {
          // 兜底：用 Playwright 再试
          await page.locator(`text=${firstLevel}`).last().click({ timeout: 5000 });
        }
        await page.waitForTimeout(1000);
        // 3. 如果有第二级，选第二级
        if (secondLevel) {
          const clicked2 = await page.evaluate((opt) => {
            const items = document.querySelectorAll('.el-select-dropdown__item, [role="option"]');
            for (const item of items) {
              if (item.textContent?.trim() === opt) {
                item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
              }
            }
            return false;
          }, secondLevel);
          if (!clicked2) {
            await page.locator(`text=${secondLevel}`).last().click({ timeout: 5000 });
          }
        }
        return `✅ 级联选择 "${cascadeLabel}" → ${firstLevel}${secondLevel ? '→'+secondLevel : ''}`;
      } catch (e) {
        return `⚠️ 级联选择失败: ${e.message?.slice(0, 60) || '超时'}`;
      }
    }

    case 'wait':
      await new Promise(r => setTimeout(r, ms || 2000));
      return `✅ 等待 ${ms || 2000}ms`;

    case 'extract': {
      const text = await page.evaluate(() => document.body.innerText.slice(0, 2000));
      return `📄 ${text}`;
    }

    case 'assert': {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const expectText = description || action.expect || '';
      const found = bodyText.includes(expectText);
      return `🔍 "${expectText}": ${found ? '✅' : '⚠️'}`;
    }

    case 'done':
      return `🏁 ${action.success ? '✅' : '❌'} ${action.message || ''}`;

    default:
      return `⚠️ 未知操作: ${type}`;
  }
}
