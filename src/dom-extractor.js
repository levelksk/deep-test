// ========================================
// DOM 提取器 - 增强版
// 支持 Element Plus / Ant Design 深度 input
// ========================================

const INPUT_SELECTORS = [
  'input', 'textarea', '[contenteditable]',
  '.el-input__inner', '.ant-input',
  '[role="textbox"]', '[role="combobox"]', '[role="searchbox"]',
];

/**
 * 获取完整页面可交互元素
 */
export async function extractPageState(page) {
  const state = await page.evaluate(() => {
    const INPUT_SELECTORS = [
      'input', 'textarea', '[contenteditable]',
      '.el-input__inner', '.ant-input',
      '[role="textbox"]', '[role="combobox"]', '[role="searchbox"]',
      'input[type="file"]', '.el-upload', '.el-upload__input',
    ];
    const elements = [];
    const visited = new Set();

    // 是否为可见的交互元素
    function isVisible(el) {
      // ⚠️ 跳过所有上传预览图区域（防止索引偏移）
      // 1. 标准 Element Plus 上传列表结构
      if (el.closest('.el-upload-list, .el-upload-list__item, .el-upload-list__item-info')) return false;
      // 2. 缩略图 class
      if (el.classList?.contains('el-upload-list__item-thumbnail')) return false;
      // 3. 任何 img 标签在上传组件内 → 一定是预览图（重点：有些版本渲染在 .el-upload 内部而非 upload-list）
      if (el.tagName === 'IMG' && el.closest('[class*="upload"]')) return false;
      // 4. 上传操作按钮面板（放大/删除）
      if (el.closest('.el-upload__actions, [class*="upload__actions"], .el-upload__preview')) return false;
      // 5. 上传放大/删除图标
      if ((el.classList?.contains('el-icon-zoom-in') || el.classList?.contains('el-icon-delete')) && el.closest('[class*="upload"]')) return false;
      // 6. 上传预览弹窗内的任何 img
      if (el.tagName === 'IMG' && el.closest('.el-dialog, [class*="preview"], [class*="dialog"]')) return false;

      if (!el.offsetParent && !['HTML','BODY'].includes(el.tagName)) {
        // 绝对定位/固定定位的元素 offsetParent 可能为 null，但实际可见
        const pos = window.getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'absolute') return false;
      }
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      // 虚拟滚动/下拉列表：检查元素是否在父级滚动容器的可见区域内
      const scrollParent = el.closest('.el-scrollbar__wrap, .el-select-dropdown__wrap, [overflow="auto"], [overflow-y="auto"]');
      if (scrollParent) {
        const pr = scrollParent.getBoundingClientRect();
        // 元素下边缘在滚动容器上边缘之上 → 不可见（在上面）
        // 元素上边缘在滚动容器下边缘之下 → 不可见（在下面）
        if (rect.bottom < pr.top || rect.top > pr.bottom) return false;
      } else if (rect.y + rect.h < 0 || rect.y > window.innerHeight) {
        // 没有滚动父容器：检查窗口视口
        return false;
      }
      return true;
    }

    // 获取输入框真实值
    function getInputValue(el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
      if (el.isContentEditable) return el.textContent || '';
      return '';
    }

    function addElement(el, source) {
      if (visited.has(el)) return;
      visited.add(el);
      if (!isVisible(el)) return;

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().slice(0, 50);
      
      elements.push({
        index: elements.length,
        tag,
        text: text,
        label: el.getAttribute('aria-label') || el.getAttribute('placeholder') || text,
        role: el.getAttribute('role') || tag,
        value: getInputValue(el),
        selector: buildSelector(el),
        rect: rect(el),
        inputType: el.getAttribute('type') || undefined,
        placeholder: el.getAttribute('placeholder') || undefined,
        name: el.getAttribute('name') || undefined,
        id: el.id || undefined,
        class: el.className?.slice(0, 40) || undefined,
        source: source || 'dom',
      });
    }

    function rect(el) {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }

    function buildSelector(el) {
      if (el.id) return `#${el.id}`;
      const testAttrs = ['data-testid', 'data-test', 'data-cy'];
      for (const a of testAttrs) {
        const v = el.getAttribute(a);
        if (v) return `[${a}="${v}"]`;
      }
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
      const text = (el.textContent || '').trim().slice(0, 30);
      if (text && ['button','a','span','label'].includes(el.tagName.toLowerCase())) {
        return `text=${text}`;
      }
      const placeholder = el.getAttribute('placeholder');
      if (placeholder) return `[placeholder="${placeholder}"]`;
      const name = el.getAttribute('name');
      if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
      return null;
    }

    // === 第一遍：找所有原生输入框 (包括 el-input__inner) ===
    document.querySelectorAll(INPUT_SELECTORS.join(',')).forEach(el => {
      if (isVisible(el)) addElement(el, 'input');
    });

    // === 第二遍：找所有按钮/链接 ===
    document.querySelectorAll('button, a[href], [role="button"], .el-button, .ant-btn').forEach(el => {
      if (isVisible(el)) addElement(el, 'button');
    });

    // === 第三遍：找所有 el-select / ant-select 类似的选择器 ===
    document.querySelectorAll('.el-select, .ant-select, [role="listbox"], [role="combobox"]').forEach(el => {
      if (isVisible(el)) addElement(el, 'select');
    });

    // === 第四遍：找 el-dropdown__popper 里的选项（Element Plus 下拉） ===
    document.querySelectorAll('.el-dropdown__popper [tabindex], .el-select-dropdown__item, [role="option"], .el-dropdown-menu__item').forEach(el => {
      if (isVisible(el) && el.textContent?.trim()) addElement(el, 'option');
    });

    // === 第五遍：找侧边栏/导航菜单项（Element Plus / Ant Design / 通用） ===
    document.querySelectorAll('.el-menu-item, .el-sub-menu__title, .ant-menu-item, .ant-menu-submenu-title, [role=\"menuitem\"], [role=\"menubar\"] [role=\"menuitem\"], .sidebar a, .sidebar button, .el-menu a, nav a, nav button, .menu-item, [class*=\"menu\"] a, [class*=\"sidebar\"] a').forEach(el => {
      if (isVisible(el) && el.textContent?.trim()) addElement(el, 'menu');
    });
    // 子菜单里的所有可见项（先展开再抓取）
    document.querySelectorAll('.el-sub-menu .el-menu-item, .ant-menu-submenu .ant-menu-item, [role=\"menu\"] [role=\"menuitem\"]').forEach(el => {
      if (isVisible(el) && el.textContent?.trim()) addElement(el, 'submenu');
    });

    // === 第六遍：找弹窗/下拉/单选框选项 ===
    document.querySelectorAll('.el-popper, [class*="dropdown"], [class*="popover"], .el-radio, .el-radio__label, .el-checkbox, .el-checkbox__label').forEach(popper => {
      if (isVisible(popper)) {
        popper.querySelectorAll('[tabindex], a, button, div[class*="item"], [role="option"], [role="menuitem"]').forEach(el => {
          if (isVisible(el) && el.textContent?.trim()) addElement(el, 'popper-item');
        });
      }
    });

    // === 第七遍：找单选框/复选框文字标签（.el-radio__label / .el-checkbox__label，如"男""女"） ===
    document.querySelectorAll('.el-radio__label, .el-checkbox__label').forEach(el => {
      if (isVisible(el) && el.textContent?.trim()) addElement(el, 'radio');
    });

    return {
      url: location.href,
      title: document.title,
      elements,
      elementCount: elements.length,
    };
  });

  return state;
}

/**
 * 格式化为 LLM 友好的文本
 */
export function formatElementsForLLM(state, max = 60) {
  const lines = [`URL: ${state.url}`, `Title: ${state.title}`, `Elements: ${state.elementCount}`, ''];

  state.elements.slice(0, max).forEach(el => {
    const parts = [`[${el.index}]`];
    parts.push(`<${el.tag}>`);
    if (el.inputType) parts.push(`type="${el.inputType}"`);
    if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
    if (el.value) parts.push(`value="${el.value}"`);
    if (el.text) parts.push(`"${el.text}"`);
    if (el.name) parts.push(`name="${el.name}"`);
    if (el.id) parts.push(`id="${el.id}"`);
    if (el.source) parts.push(`[${el.source}]`);
    lines.push(parts.join(' '));
  });

  if (state.elementCount > max) {
    lines.push(`... 还有 ${state.elementCount - max} 个元素`);
  }
  return lines.join('\n');
}
