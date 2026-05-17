// ========================================
// Agent - 核心 AI 循环
// ========================================
import { chromium } from 'playwright';
import { DeepSeekPlanner } from './planner.js';
import { executeAction } from './actor.js';
import { extractPageState, formatElementsForLLM } from './dom-extractor.js';

export class DeepTestAgent {
  constructor(config) {
    this.config = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      maxSteps: 50,
      stepDelay: 500,
      slowMo: 0,
      ...config,
    };
    this.planner = new DeepSeekPlanner({
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY,
      model: config.model || 'deepseek-chat',
      baseURL: config.baseURL,
    });
  }

  async run(task) {
    const startTime = Date.now();
    let browser;
    const history = [];
    const costs = { inputTokens: 0, outputTokens: 0, costUSD: 0, costCNY: 0 };
    let steps = 0;
    let consecutiveErrors = 0;
    let lastActionKey = '';
    let repeatCount = 0;
    let navigated = false;

    console.log(`🚀 deep-test | ${task.slice(0, 60)}...`);

    try {
      browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        channel: 'chrome',
      });
      const context = await browser.newContext({
        viewport: this.config.viewport,
      });
      const page = await context.newPage();

      while (steps < this.config.maxSteps) {
        steps++;
        console.log(`\n── Step ${steps} ──`);

        // 1. 获取页面状态
        const pageState = await extractPageState(page);
        const prevUrl = steps > 1 ? history[history.length-1]?.url : '';
        const currentUrl = pageState.url;
        const urlChanged = prevUrl && currentUrl !== prevUrl;
        // 给页面上添加 URL 变化提示
        if (urlChanged) {
          console.log(`🔗 URL: ${prevUrl} → ${currentUrl}`);
        }
        const formattedState = formatElementsForLLM(pageState);
        console.log(`📄 ${new URL(currentUrl).hostname}${new URL(currentUrl).pathname} (${pageState.elementCount} el)`);

        // 2. AI 决策
        let thought, action, usage, latency;
        try {
          ({ thought, action, usage, latencyMs: latency } = await this.planner.plan(
            task, formattedState, history
          ));
        } catch (e) {
          console.log(`❌ LLM error: ${e.message.slice(0, 100)}`);
          consecutiveErrors++;
          if (consecutiveErrors >= 3) break;
          continue;
        }

        // 累计成本
        if (usage) {
          const c = DeepSeekPlanner.calculateCost(usage);
          costs.inputTokens += c.inputTokens;
          costs.outputTokens += c.outputTokens;
          costs.costUSD += c.costUSD;
          costs.costCNY += c.costCNY;
        }

        console.log(`💭 ${(thought || '').slice(0, 100)}`);
        console.log(`🎯 ${action.type}${action.description ? ': ' + action.description : ''} ${action.selector ? 'sel='+action.selector : 'no-sel'} ${latency ? `(${(latency/1000).toFixed(1)}s)` : ''}`);

        // 3. 循环检测（wait 不重置计数器）
        const actionKey = `${action.type}:${action.description || action.selector || ''}`;
        if (actionKey === lastActionKey || (action.type === 'click' && lastActionKey.startsWith('click:'))) {
          repeatCount++;
          if (repeatCount >= 3 && action.type === 'click') {
            console.log('⚠️ upload 重复3次，打断循环，尝试其他操作');
            repeatCount = 0;
            // 强制切换：如果点不到上传按钮，直接找隐藏 input[type=file]
            lastActionKey = '';
            continue;
          }
          if (repeatCount >= 5) {
            console.log('⚠️ 检测到循环，终止');
            break;
          }
        } else {
          repeatCount = 0;
          lastActionKey = actionKey;
        }

        // 3.5 弹窗/表单已打开时，禁止再点击"新增"等打开类按钮
        if (action.type === 'click') {
          const desc = (action.description || '').toLowerCase();
          const selVal = action.selector || '';
          const isOpenBtn = desc.includes('新增') || desc.includes('新 增') || desc.includes('添加') || desc.includes('新建');
          const hasDialog = pageState.elementCount >= 68 && pageState.elements.some(e => 
            e.placeholder?.includes('请输入姓名') || e.placeholder?.includes('请输入手机号')
          );
          if (isOpenBtn && hasDialog) {
            console.log('⚠️ 表单已打开，跳过点击新增按钮');
            history.push({
              step: steps, action, description: action.description,
              result: '⚠️ 表单已打开，跳过。请继续填写表单项'
            });
            continue;
          }
        }

        // 4. 拦截重复 navigate
        if (action.type === 'navigate' && navigated && currentUrl !== 'about:blank') {
          console.log('⚠️ 已导航过，跳过重复 navigate');
          history.push({ step: steps, action, description: action.description, result: '⚠️ 跳过重复导航' });
          continue;
        }

        // 5. 执行操作
        try {
          const result = await executeAction(page, action, pageState.elements);
          console.log(`📌 ${result.slice(0, 80)}`);
          consecutiveErrors = 0;
          if (action.type === 'navigate') navigated = true;

          // 执行后截图（用于报告）
          const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70 }).catch(() => null);
          const screenshotBase64 = screenshotBuffer ? screenshotBuffer.toString('base64') : '';

          history.push({
            step: steps,
            action,
            type: action.type,
            description: action.description || action.type,
            result,
            url: currentUrl,
            thought: thought || '',
            screenshot: screenshotBase64,
          });
        } catch (err) {
          consecutiveErrors++;
          const msg = `❌ ${err.message.slice(0, 100)}`;
          console.log(msg);
          history.push({ step: steps, action, type: action.type, description: action.description, result: msg });
          if (consecutiveErrors >= 3) {
            console.log(`❌ 连续失败 ${consecutiveErrors} 次，终止`);
            break;
          }
          continue;
        }

        // 6. 检查任务完成
        if (action.type === 'done') {
          console.log(`\n🏁 ${action.success ? '✅ 通过' : '❌ 失败'}: ${action.message || ''}`);
          break;
        }

        // 操作后延迟
        if (this.config.stepDelay > 0) {
          await new Promise(r => setTimeout(r, this.config.stepDelay));
        }
      }

      if (steps >= this.config.maxSteps) {
        console.log(`\n⚠️ 达到最大步数 ${this.config.maxSteps}`);
      }
    } finally {
      if (browser) await browser.close();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`⏱️ ${elapsed}s | 🔄 ${steps}步 | 💵 ¥${costs.costCNY.toFixed(4)} | 📝 ${costs.inputTokens}→${costs.outputTokens}t`);

    return {
      success: history.some(h => h.action?.type === 'done' && h.action?.success !== false),
      steps, duration: elapsed, cost: costs, history,
    };
  }
}
