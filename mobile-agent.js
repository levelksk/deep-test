// ========================================
// mobile-agent - ADB + OCR + DeepSeek 手机自动化
// ========================================

import { createInterface } from 'readline';
import { execSync, exec } from 'child_process';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 加载 .env 中的 DEEPSEEK_API_KEY
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== 配置 =====
const ADB = 'D:/Program Files/Netease/MuMu/nx_main/adb.exe';
const SERIAL = '127.0.0.1:7555';
const SCREENSHOT_PATH = path.join(__dirname, 'mobile_screen.png');

// ===== OCR 核心 =====
async function _ocrOnce(imgPath) {
  const script = path.join(__dirname, 'ocr.py');
  const out = execSync(`python3 "${script}" "${imgPath}"`, {
    encoding: 'utf-8', timeout: 30000, shell: 'bash',
  });
  return JSON.parse(out.trim());
}

async function ocrScreen() {
  await captureScreen();
  return _ocrOnce(SCREENSHOT_PATH);
}

// ===== 双屏扫描 =====
async function ocrDoubleScreen() {
  // 第一屏
  await captureScreen();
  const first = await _ocrOnce(SCREENSHOT_PATH);

  // 下滑一次（屏幕高度的35%，避免滑太快）
  adbSwipe(720, 1800, 720, 600, 200);
  await new Promise(r => setTimeout(r, 600));

  // 第二屏
  await captureScreen();
  const second = await _ocrOnce(SCREENSHOT_PATH);

  // 滑回原位，保持页面状态一致
  adbSwipe(720, 600, 720, 1800, 200);
  await new Promise(r => setTimeout(r, 400));

  // 合并去重：相同文字、Y坐标差 < 50 视为同一元素，取 Y 较小的
  const merged = [...first];
  for (const s of second) {
    const dup = merged.find(m =>
      m.text === s.text && Math.abs(m.y - s.y) < 50
    );
    if (!dup) merged.push(s);
  }
  merged.sort((a, b) => a.y - b.y);

  return merged;
}

// ===== ADB 工具函数 =====
function adb(cmd) {
  try {
    const fullCmd = `MSYS2_ARG_CONV_EXCL='*' "${ADB}" -s ${SERIAL} ${cmd}`;
    const r = execSync(fullCmd, { encoding: 'utf-8', timeout: 15000, shell: 'bash' });
    return { ok: true, out: r.trim() };
  } catch (e) {
    return { ok: false, out: e.stderr?.trim() || e.message };
  }
}

function adbTap(x, y) {
  return adb(`shell input tap ${Math.round(x)} ${Math.round(y)}`);
}

function adbText(text) {
  // 对特殊字符做转义
  const safe = text.replace(/'/g, "'\\''");
  return adb(`shell input text '${safe}'`);
}

function adbKeyEvent(key) {
  const map = { back: 4, home: 3, enter: 66, del: 67 };
  const code = map[key] || key;
  return adb(`shell input keyevent ${code}`);
}

function adbSwipe(x1, y1, x2, y2, ms = 300) {
  return adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
}

async function captureScreen() {
  const r = adb(`shell screencap /sdcard/screen.png`);
  if (!r.ok) throw new Error(`screencap failed: ${r.out}`);
  const r2 = adb(`pull /sdcard/screen.png "${SCREENSHOT_PATH}"`);
  if (!r2.ok) throw new Error(`pull failed: ${r2.out}`);
  return SCREENSHOT_PATH;
}

function formatOCRForLLM(items) {
  if (items.length === 0) return '(屏幕上未识别到文字)';
  
  // 按 Y 坐标分行，相近的 Y 放在同一行
  const lines = [];
  let currentLine = [];
  let lastY = -100;

  for (const item of items) {
    if (lastY > 0 && Math.abs(item.y - lastY) > 30) {
      lines.push(currentLine);
      currentLine = [];
    }
    currentLine.push(item);
    lastY = item.y;
  }
  if (currentLine.length > 0) lines.push(currentLine);

  return lines.map(line => {
    // 同一行按 X 排序
    line.sort((a, b) => a.x - b.x);
    return line.map((item, i) => {
      const idx = items.indexOf(item);
      return `[${idx}] ${item.text} (${item.x},${item.y})`;
    }).join(' | ');
  }).join('\n');
}

// ===== DeepSeek Planner =====
function buildSystemPrompt() {
  return `你是手机自动化测试的 AI 决策引擎。你通过 OCR 识别屏幕上的文字+坐标来决定下一步操作。用 JSON 格式输出操作。

## 屏幕信息格式
每行代表屏幕上一行内容：
  [序号] 文字内容 (X坐标,Y坐标)

示例：
  [0] 元骁健康 (210,185) | [1] 二维码名片 (896,181)
  [2] 张仲景 (510,514) | [3] 工作中 (1133,507)

## 动作列表（每次只输出 1 个）

1. 点击屏幕上的文字（推荐！通过文字匹配自动找到坐标）：
   {"type":"tap_text","text":"患者","description":"点击底部导航-患者"}

2. 点击精确坐标（仅当文字匹配不精确时）：
   {"type":"tap","x":720,"y":1500,"description":"点击某区域"}

3. 输入文字（先 tap 输入框，再 text）：
   {"type":"text","value":"15605885696","description":"输入手机号"}
   注意：手机号、验证码等先 tap 输入框，再执行 text 操作

4. 按返回键：
   {"type":"back","description":"返回上一页"}

5. 滑动屏幕：
   {"type":"swipe","x1":720,"y1":2000,"x2":720,"y2":500,"description":"向上滑动"}

6. 等待：
   {"type":"wait","ms":2000,"description":"等待加载"}

7. 任务完成：
   {"type":"done","success":true,"message":"任务完成"}

## 规则
- **优先用 tap_text**（通过文字匹配），不精确时用 tap 坐标
- 每次只输出 1 个动作
- 如果点击后屏幕变化，OCR 再识别新页面
- 连续 3 次相同操作没变化就换方法
- 用中文描述你的思考`;
}

function buildMessages(task, currentState, history) {
  const msgs = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: `## 任务\n${task}\n\n## 当前屏幕\n${currentState}` },
  ];

  if (history.length > 0) {
    const doneSteps = history
      .map((h, i) => `  ${i + 1}. [${h.action?.type}] ${h.description || ''} → ${h.result?.includes('✅') ? '✅成功' : h.result?.includes('⬆') ? '⬆等待' : '❌失败'}`)
      .join('\n');

    const last = history[history.length - 1];
    msgs.push({
      role: 'user',
      content: `## 历史\n${doneSteps}\n\n## 上一步\n操作: ${last.action?.type}「${last.description}」\n结果: ${last.result}`,
    });
  }

  return msgs;
}

async function deepseekPlan(client, task, currentState, history) {
  const messages = buildMessages(task, currentState, history);
  const start = Date.now();

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    temperature: 0.2,
    max_tokens: 512,
    response_format: { type: 'json_object' },
  });

  const elapsed = Date.now() - start;
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response');

  // 解析 JSON
  let clean = content.trim();
  const m = clean.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (m) clean = m[1].trim();
  clean = clean.replace(/<think>[\s\S]*?<\/think>/g, '');
  const fb = clean.indexOf('{'), lb = clean.lastIndexOf('}');
  if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const type = clean.match(/"type"\s*:\s*"([^"]+)"/)?.[1];
    if (!type) throw new Error(`Parse failed: ${clean.slice(0, 100)}`);
    parsed = { type };
    ['text', 'description', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'ms', 'value'].forEach(k => {
      const v = clean.match(new RegExp(`"${k}"\\s*:\\s*"?([^",}\\s]+)`))?.[1];
      if (v) parsed[k] = v;
    });
  }

  return {
    thought: parsed.thought || parsed.description || '',
    action: parsed,
    usage: response.usage,
    latencyMs: elapsed,
  };
}

// ===== 动作执行器 =====
async function executeAction(action) {
  switch (action.type) {
    case 'tap_text': {
      // 先 OCR 一次，找到文字对应的坐标
      const items = await ocrScreen();
      // 优先精确匹配，再包含匹配
      let target = items.find(i => i.text === action.text);
      if (!target) target = items.find(i => i.text.includes(action.text));
      if (!target) {
        return `❌ 找不到文字「${action.text}」`;
      }
      const r = adbTap(target.x, target.y);
      return r.ok ? `✅ 点击「${action.text}」(${target.x},${target.y})` : `❌ ${r.out}`;
    }

    case 'tap': {
      const x = parseInt(action.x), y = parseInt(action.y);
      const r = adbTap(x, y);
      return r.ok ? `✅ 点击 (${x},${y})` : `❌ ${r.out}`;
    }

    case 'text': {
      const r = adbText(action.value || '');
      return r.ok ? `✅ 输入「${action.value}」` : `❌ ${r.out}`;
    }

    case 'back':
      return adbKeyEvent('back').ok ? `✅ 返回` : `❌ 返回失败`;

    case 'swipe': {
      const r = adbSwipe(parseInt(action.x1), parseInt(action.y1), parseInt(action.x2), parseInt(action.y2), parseInt(action.ms) || 300);
      return r.ok ? `✅ 滑动` : `❌ ${r.out}`;
    }

    case 'wait': {
      await new Promise(r => setTimeout(r, parseInt(action.ms) || 2000));
      return `⬆ 等待 ${parseInt(action.ms) || 2000}ms`;
    }

    case 'done':
      return `🏁 完成`;

    default:
      return `❌ 未知动作: ${action.type}`;
  }
}

// ===== 主循环 =====
export async function runMobileTest(task, config = {}) {
  const startTime = Date.now();
  const planner = new OpenAI({
    baseURL: config.baseURL || 'https://api.deepseek.com/v1',
    apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY,
    timeout: 60000,
  });

  const maxSteps = config.maxSteps || 30;
  const history = [];
  let steps = 0;
  let consecutiveErrors = 0;
  let lastActionKey = '';
  let repeatCount = 0;
  const costs = { inputTokens: 0, outputTokens: 0, costUSD: 0, costCNY: 0 };

  console.log(`\n🤖 mobile-agent | ${task.slice(0, 60)}...`);
  console.log(`📱 ${ADB} | ${SERIAL}`);

  while (steps < maxSteps) {
    steps++;
    console.log(`\n── Step ${steps} ──`);

    // 1. OCR 识别屏幕
    let items;
    try {
      items = await ocrDoubleScreen();
    } catch (e) {
      console.log(`📸 OCR 失败: ${e.message.slice(0, 80)}`);
      consecutiveErrors++;
      if (consecutiveErrors >= 3) break;
      continue;
    }

    const currentState = formatOCRForLLM(items);
    console.log(`📸 OCR ${items.length} 项`);
    console.log(currentState.slice(0, 300) + (currentState.length > 300 ? '...' : ''));

    // 2. DeepSeek 决策
    let thought, action, usage, latency;
    try {
      ({ thought, action, usage, latencyMs: latency } = await deepseekPlan(planner, task, currentState, history));
    } catch (e) {
      console.log(`🤖 LLM 失败: ${e.message.slice(0, 100)}`);
      consecutiveErrors++;
      if (consecutiveErrors >= 3) break;
      continue;
    }
    consecutiveErrors = 0;

    // 累计成本
    if (usage) {
      costs.inputTokens += usage.prompt_tokens || 0;
      costs.outputTokens += usage.completion_tokens || 0;
      const iUSD = (usage.prompt_tokens || 0) * 0.14 / 1_000_000;
      const oUSD = (usage.completion_tokens || 0) * 0.42 / 1_000_000;
      costs.costUSD += iUSD + oUSD;
      costs.costCNY += (iUSD + oUSD) * 7.3;
    }

    // 重复检测
    const actionKey = `${action.type}:${action.text || action.value || action.x || ''}`;
    if (actionKey === lastActionKey) {
      repeatCount++;
      if (repeatCount >= 3) {
        console.log(`⚠️ 重复操作 ${repeatCount} 次，终止`);
        break;
      }
    } else {
      repeatCount = 0;
      lastActionKey = actionKey;
    }

    console.log(`🤖 ${thought.slice(0, 120)}`);
    console.log(`🎬 ${action.type}${action.description ? ' - ' + action.description : ''} | ${latency}ms`);

    // 3. 执行动作
    const result = await executeAction(action);
    console.log(`📋 ${result}`);

    // 记录历史
    history.push({ step: steps, action, description: action.description || thought.slice(0, 60), result, items: items.length });

    // 4. 检查完成
    if (action.type === 'done') {
      console.log(`\n🎉 任务完成！`);
      break;
    }

    // 每次操作后等一会儿
    await new Promise(r => setTimeout(r, 1000));
  }

  // 总结
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n═══════════════════════════════`);
  console.log(`📊 总计: ${steps}步 | ${totalTime}s | ¥${costs.costCNY.toFixed(4)}`);
  console.log(`📊 Token: ${costs.inputTokens}→${costs.outputTokens}`);
  console.log(`═══════════════════════════════`);

  return { steps, history, totalTime, costs };
}

// ===== CLI 入口 =====
const task = process.argv[2];
if (task) {
  runMobileTest(task).catch(e => {
    console.error(`💥 ${e.message}`);
    process.exit(1);
  });
} else {
  console.log(`
用法: node mobile-agent.js "你的任务描述"

示例:
  node mobile-agent.js "点击患者，查看患者列表"
  node mobile-agent.js "点击排班设置"
  node mobile-agent.js "点击我的，进入个人中心"
`);
}
