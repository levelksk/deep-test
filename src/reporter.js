// ========================================
// Reporter v2 — Midscene 风格双栏布局
// 左栏：步骤列表（状态+类型+耗时）
// 右栏：截图 + 决策详情
// 点击侧栏步骤切换查看
// ========================================

export function generateReport({ history, steps, duration, cost, success, task }) {
  const totalCost = cost?.costCNY || 0;
  const resultText = success ? '✅ 通过' : '❌ 失败';
  const resultClass = success ? 'pass' : 'fail';

  // 构建步骤数据
  const stepItems = history.map((h, i) => {
    const status = h.result?.includes('✅') ? 'ok' : h.result?.includes('⚠️') ? 'warn' : 'fail';
    const statusIcon = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'fail';
    const actionTime = h.duration || 0;
    return {
      index: i,
      step: h.step,
      status,
      statusIcon,
      type: h.action?.type || '?',
      desc: h.description || '',
      result: h.result || '',
      thought: h.thought || '',
      url: (h.url && h.url !== 'about:blank') ? h.url : '',
      screenshot: h.screenshot || null,
      time: actionTime > 0 ? `${actionTime.toFixed(1)}s` : '',
    };
  });

  // 统计
  const okCount = stepItems.filter(s => s.status === 'ok').length;
  const failCount = stepItems.filter(s => s.status === 'fail').length;
  const screenshotCount = stepItems.filter(s => s.screenshot).length;

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const stepListJson = JSON.stringify(stepItems);
  const firstScreenshot = stepItems.find(s => s.screenshot)?.index || 0;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepTest 报告 - ${resultText}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --bg: #1a1a2e; --bg2: #16213e; --bg3: #0f3460; --surface: #1e2a45; --border: #2a3a5c; --text: #e0e0e0; --text2: #8892a4; --accent: #4fc3f7; --ok: #52c41a; --warn: #faad14; --fail: #ff4d4f; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    /* ===== 顶部导航 ===== */
    .top-nav {
      display: flex; align-items: center; justify-content: space-between;
      height: 52px; padding: 0 20px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      position: relative;
      z-index: 10;
    }
    .top-nav-left { display: flex; align-items: center; gap: 12px; }
    .top-nav-left .logo {
      width: 28px; height: 28px; border-radius: 6px;
      background: linear-gradient(135deg, var(--accent), #7c4dff);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: bold; color: #fff;
    }
    .top-nav-left .title { font-size: 15px; font-weight: 600; }
    .top-nav-left .version {
      font-size: 11px; color: var(--text2);
      background: var(--surface); padding: 2px 8px; border-radius: 4px;
    }
    .top-nav-right { display: flex; align-items: center; gap: 16px; }
    .top-nav-right .summary {
      display: flex; align-items: center; gap: 16px;
      font-size: 12px; color: var(--text2);
    }
    .top-nav-right .summary .stat { display: flex; align-items: center; gap: 4px; }
    .top-nav-right .summary .stat strong { color: var(--text); font-weight: 600; }
    .result-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 12px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }
    .result-badge.pass { background: rgba(82, 196, 26, 0.2); color: var(--ok); }
    .result-badge.fail { background: rgba(255, 77, 79, 0.2); color: var(--fail); }
    .theme-btn {
      width: 30px; height: 30px; border-radius: 6px;
      border: 1px solid var(--border); background: transparent;
      color: var(--text2); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all 0.15s;
    }
    .theme-btn:hover { background: var(--surface); color: var(--text); }

    /* ===== 主布局 ===== */
    .main-layout {
      display: flex; height: calc(100vh - 52px);
    }

    /* ===== 左侧栏 ===== */
    .sidebar {
      width: 340px; min-width: 240px;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      flex-shrink: 0;
      position: relative;
    }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .sidebar-header h3 { font-size: 13px; font-weight: 600; }
    .sidebar-header .checkbox-label {
      font-size: 11px; color: var(--text2);
      cursor: pointer;
      display: flex; align-items: center; gap: 4px;
    }
    .sidebar-header .checkbox-label input { accent-color: var(--accent); }
    .steps-table-header {
      display: flex; align-items: center;
      padding: 6px 16px;
      font-size: 11px; color: var(--text2); text-transform: uppercase;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .steps-table-header .col-type { flex: 1; }
    .steps-table-header .col-time { width: 60px; text-align: right; }
    .steps-list {
      flex: 1; overflow-y: auto;
      padding: 4px 0;
    }
    .steps-list::-webkit-scrollbar { width: 4px; }
    .steps-list::-webkit-scrollbar-track { background: transparent; }
    .steps-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .step-item {
      display: flex; align-items: center;
      padding: 8px 16px; cursor: pointer;
      border-left: 3px solid transparent;
      transition: all 0.12s;
      gap: 8px;
    }
    .step-item:hover { background: rgba(255,255,255,0.04); }
    .step-item.active {
      background: rgba(79, 195, 247, 0.08);
      border-left-color: var(--accent);
    }
    .step-item .status-icon {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0;
    }
    .step-item .status-icon.ok { background: rgba(82, 196, 26, 0.15); color: var(--ok); }
    .step-item .status-icon.warn { background: rgba(250, 173, 20, 0.15); color: var(--warn); }
    .step-item .status-icon.fail { background: rgba(255, 77, 79, 0.15); color: var(--fail); }
    .step-item .status-icon.wait { background: rgba(79, 195, 247, 0.1); color: var(--accent); font-size: 14px; }
    .step-item .step-info { flex: 1; min-width: 0; }
    .step-item .step-info .step-type {
      font-size: 10px; color: var(--accent); text-transform: uppercase;
      font-weight: 600; letter-spacing: 0.3px;
    }
    .step-item .step-info .step-desc {
      font-size: 13px; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .step-item .step-time {
      font-size: 11px; color: var(--text2);
      text-align: right; flex-shrink: 0; width: 48px;
    }

    /* ===== 右侧内容区 ===== */
    .main-content {
      flex: 1; display: flex; flex-direction: column;
      background: var(--bg);
      min-width: 0;
    }
    .main-nav {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      padding: 8px 20px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .main-nav .nav-btn {
      width: 32px; height: 32px; border-radius: 6px;
      border: 1px solid var(--border); background: transparent;
      color: var(--text2); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all 0.15s;
    }
    .main-nav .nav-btn:hover { background: var(--surface); color: var(--text); border-color: var(--accent); }
    .main-nav .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .main-nav .nav-counter { font-size: 13px; color: var(--text2); min-width: 80px; text-align: center; }
    .main-nav .nav-counter strong { color: var(--text); }

    .preview-area {
      flex: 1; display: flex; flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* 截图区域 */
    .screenshot-wrapper {
      flex: 1; display: flex; align-items: center; justify-content: center;
      background: #0a0a1a;
      position: relative; overflow: hidden;
      min-height: 0;
    }
    .screenshot-wrapper img {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      cursor: zoom-in;
      transition: transform 0.2s;
    }
    .screenshot-wrapper img.zoomed {
      cursor: zoom-out;
      transform: scale(1.5);
      transform-origin: center;
    }
    .screenshot-wrapper .no-screenshot {
      color: var(--text2); font-size: 14px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .screenshot-wrapper .no-screenshot .icon { font-size: 40px; opacity: 0.3; }

    /* 底部详情栏 */
    .details-panel {
      background: var(--bg2);
      border-top: 1px solid var(--border);
      padding: 12px 20px;
      flex-shrink: 0;
      max-height: 200px;
      overflow-y: auto;
    }
    .details-panel::-webkit-scrollbar { width: 4px; }
    .details-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .detail-row {
      font-size: 13px; line-height: 1.6;
      padding: 3px 0;
    }
    .detail-row.ok { color: var(--ok); }
    .detail-row.warn { color: var(--warn); }
    .detail-row.fail { color: var(--fail); }
    .detail-row.thought {
      color: var(--text2); font-size: 12px;
      background: rgba(255,255,255,0.03);
      padding: 6px 10px; border-radius: 6px;
      margin: 4px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .detail-row.url {
      color: var(--accent); font-size: 12px;
      word-break: break-all;
    }
    .detail-row .label {
      color: var(--text2); font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-right: 6px;
    }

    .no-step-selected {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100%; color: var(--text2); gap: 12px;
    }
    .no-step-selected .icon { font-size: 48px; opacity: 0.2; }

    @media (max-width: 768px) {
      .sidebar { width: 200px; }
      .top-nav-right .summary { display: none; }
    }
  </style>
</head>
<body>

<div class="top-nav">
  <div class="top-nav-left">
    <div class="logo">D</div>
    <span class="title">DeepTest</span>
    <span class="version">v2.0</span>
  </div>
  <div class="top-nav-right">
    <div class="summary">
      <span class="stat">🔄 <strong>${steps}</strong> 步</span>
      <span class="stat">⏱ <strong>${duration}</strong>s</span>
      <span class="stat">📸 <strong>${screenshotCount}</strong> 截图</span>
      <span class="stat">💰 <strong>¥${totalCost.toFixed(4)}</strong></span>
      <span class="stat">📝 <strong>${cost?.inputTokens||0}</strong>→<strong>${cost?.outputTokens||0}</strong>t</span>
    </div>
    <span class="result-badge ${resultClass}">${resultText}</span>
  </div>
</div>

<div class="main-layout">
  <!-- 左侧栏 -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Execution</h3>
    </div>
    <div class="steps-table-header">
      <span class="col-type">Type</span>
      <span class="col-time">Time</span>
    </div>
    <div class="steps-list" id="stepsList">
      ${stepItems.map(s => `
      <div class="step-item" data-index="${s.index}" onclick="selectStep(${s.index})">
        <div class="status-icon ${s.status}">
          ${s.status === 'ok' ? '✓' : s.status === 'fail' ? '✗' : s.status === 'warn' ? '⚠' : '·'}
        </div>
        <div class="step-info">
          <div class="step-type">${escapeHtml(s.type)}</div>
          <div class="step-desc">${escapeHtml(s.desc || ('Step ' + s.step))}</div>
        </div>
        <div class="step-time">${s.time}</div>
      </div>`).join('\n      ')}
    </div>
  </div>

  <!-- 右侧内容 -->
  <div class="main-content">
    <div class="main-nav">
      <button class="nav-btn" onclick="prevStep()" id="prevBtn" disabled>◀</button>
      <span class="nav-counter">步骤 <strong id="stepCounter">1</strong> / ${stepItems.length}</span>
      <button class="nav-btn" onclick="nextStep()" id="nextBtn">▶</button>
    </div>
    <div class="preview-area" id="previewArea">
      <div class="screenshot-wrapper" id="screenshotWrapper">
        <div class="no-screenshot" id="noStepMsg">
          <div class="icon">◉</div>
          <div>点击左侧步骤查看详情</div>
        </div>
        <img id="screenshotImg" style="display:none" onclick="toggleZoom(this)" alt="步骤截图" />
      </div>
      <div class="details-panel" id="detailsPanel">
        <div id="detailResult" class="detail-row"></div>
        <div id="detailThought" class="detail-row thought"></div>
        <div id="detailUrl" class="detail-row url"></div>
      </div>
    </div>
  </div>
</div>

<script>
const steps = ${stepListJson};
let currentIndex = -1;

function selectStep(index) {
  // 更新选中状态
  document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
  const item = document.querySelector('.step-item[data-index="' + index + '"]');
  if (item) item.classList.add('active');

  currentIndex = index;
  const s = steps[index];
  if (!s) return;

  // 更新计数器
  document.getElementById('stepCounter').textContent = s.step || (index + 1);

  // 更新导航按钮
  document.getElementById('prevBtn').disabled = index === 0;
  document.getElementById('nextBtn').disabled = index >= steps.length - 1;

  // 截图
  const img = document.getElementById('screenshotImg');
  const noMsg = document.getElementById('noStepMsg');
  if (s.screenshot) {
    img.src = 'data:image/jpeg;base64,' + s.screenshot;
    img.style.display = 'block';
    img.classList.remove('zoomed');
    noMsg.style.display = 'none';
  } else {
    img.style.display = 'none';
    noMsg.style.display = 'flex';
    noMsg.innerHTML = '<div class="icon">◉</div><div>（无截图）</div>';
  }

  // 详情
  const resultEl = document.getElementById('detailResult');
  const thoughtEl = document.getElementById('detailThought');
  const urlEl = document.getElementById('detailUrl');

  resultEl.className = 'detail-row ' + s.status;
  resultEl.textContent = s.result || '';

  if (s.thought) {
    thoughtEl.style.display = 'block';
    thoughtEl.textContent = '💭 ' + s.thought;
  } else {
    thoughtEl.style.display = 'none';
  }

  if (s.url) {
    urlEl.style.display = 'block';
    urlEl.innerHTML = '<span class="label">URL</span>' + escapeHtml(s.url);
  } else {
    urlEl.style.display = 'none';
  }

  // 滚动步骤到可见区域
  if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function prevStep() {
  if (currentIndex > 0) selectStep(currentIndex - 1);
}
function nextStep() {
  if (currentIndex < steps.length - 1) selectStep(currentIndex + 1);
}

// 切换截图缩放
function toggleZoom(img) {
  img.classList.toggle('zoomed');
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault(); nextStep();
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault(); prevStep();
  }
});

// 自动选中第一个有截图的步骤
(function() {
  let idx = steps.findIndex(s => s.screenshot);
  if (idx === -1) idx = 0;
  selectStep(idx);
})();

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>
</body>
</html>`;

  return html;
}
