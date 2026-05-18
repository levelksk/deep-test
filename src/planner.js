// ========================================
// Planner - DeepSeek V4 交互层
// ========================================
import OpenAI from 'openai';

export class DeepSeekPlanner {
  constructor(config) {
    this.client = new OpenAI({
      baseURL: config.baseURL || 'https://api.deepseek.com/v1',
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    });
    this.model = config.model || 'deepseek-chat';
    this.maxSteps = config.maxSteps || 50;
    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
     return `你是 deep-test 自动化测试框架的 AI 决策引擎。用 JSON 格式输出操作。

## 规则
0. **必须输出纯 JSON 对象，不要用 \\\`\\\`\\\`json markdown 包裹**，直接输出 {\"type\":...} 格式
1. 每次只能输出 **1 个**操作。不要输出多个操作。
2. 使用元素前面的 [数字] 引用元素，例如第3个元素用 "[3]"
3. 如果当前URL已经是目标页面，就不要再 navigate
4. 仔细看页面状态，根据实际元素决定操作
5. 如果某个操作连续失败3次，尝试不同方法
6. 任务完成时输出 type: "done"
7. 使用中文描述你的思考
8. **历史 URL 监控**: 看历史记录里每个步骤的 URL。如果点击菜单后 URL 变了，说明已成功进入新页面，不要再重复点击同一菜单项。
9. **重要：每次点击/填写必须使用 [索引号] 选择器**。例如点击第5个元素用 "selector":"[5]"。不要只用 description 来描述。
10. **大量元素时的策略**: 如果页面上有100+个元素（如下拉列表），说明有很多选项需要选择。先看元素的 text 内容找到你要的文字（如"杭州"），再找到对应的 [索引号]。不要随便点第一个可见选项。
11. **下拉列表滚动**: 如果下拉列表有很多项（如城市选择），连续向下滚动（scroll action）多次，每次滚动后重新提取页面元素，直到看到你要选的那个选项出现，再点击它。

## 可用操作

{"type":"click","selector":"[3]","description":"点击登录按钮"}
{"type":"fill","selector":"[3]","value":"内容","description":"填写用户名"}
{"type":"select","selector":"[3]","value":"选项","description":"选择城市"}
{"type":"press","key":"Enter","description":"按下回车"}
{"type":"type","value":"搜索文字","description":"在当前聚焦元素输入文字（用于可搜索下拉框）"}
{"type":"navigate","url":"https://...","description":"跳转到..."}
{"type":"scroll","direction":"down","description":"向下滚动"}
{"type":"upload","files":["D:/test.jpeg"],"description":"上传到头像"}
{"type":"upload","files":["D:/test.jpeg"],"description":"上传身份证正面"}
{"type":"upload","files":["D:/test.jpeg"],"description":"上传身份证反面"}
{"type":"upload","files":["D:/test.jpeg"],"description":"上传执业证书"}
{"type":"dropdown","value":"要选的选项","description":"所属医院"}
{"type":"cascade","value":"内科,呼吸内科专业","description":"所属科室"}
{"type":"dropdown","value":"主任医师","description":"职称"}
{"type":"wait","ms":2000,"description":"等待加载"}
{"type":"extract","description":"提取页面数据"}
{"type":"done","success":true,"message":"任务完成"}
`;
  }

  _buildMessages(task, currentState, history) {
    const msgs = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `## 任务\n${task}\n\n## 当前页面状态\n${currentState}` },
    ];

    // 构建历史摘要：完成的步骤列表
    if (history.length > 0) {
      const doneSteps = history
        .filter(h => h.type !== 'navigate' || h.step <= 1)
        .map((h, i) => `  ${i+1}. [${h.action?.type}] ${h.description || ''} → ${h.result?.includes('✅') ? '✅成功' : '❌失败'}${h.url && h.url !== 'about:blank' ? ' | ' + h.url : ''}`)
        .join('\n');

      const lastAction = history[history.length - 1];

      msgs.push({
        role: 'user',
        content: `## 历史操作\n已完成步骤:\n${doneSteps || '  无'}\n\n## 上一步结果\n操作: ${lastAction.action?.type} "${lastAction.description}"\n结果: ${lastAction.result}`,
      });
    }

    return msgs;
  }

  async plan(task, currentState, history) {
    const messages = this._buildMessages(task, currentState, history);
    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.2,
      max_tokens: 512,
    });

    const elapsed = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from DeepSeek');

    // 解析 JSON（支持被 markdown 包裹）
    let clean = content.trim();
    const m = clean.match(/```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
    if (m) clean = m[1].trim();
    clean = clean.replace(/<think>[\s\S]*?<\/think>/g, '');
    const fb = clean.indexOf('{');
    const lb = clean.lastIndexOf('}');
    if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      // fallback: 正则提取
      const type = clean.match(/"type"\s*:\s*"([^"]+)"/)?.[1];
      if (type) {
        parsed = { type };
        ['selector','value','url','key','direction','description'].forEach(k => {
          const v = clean.match(new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`))?.[1];
          if (v) parsed[k] = v;
        });
        // 处理 files 数组
        const filesMatch = clean.match(/"files"\s*:\s*\[([^\]]+)\]/);
        if (filesMatch) {
          const files = filesMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
          if (files.length) parsed.files = files;
        }
        if (parsed.value === undefined) {
          const v2 = clean.match(/"value"\s*:\s*(\d+)/)?.[1];
          if (v2) parsed.value = v2;
        }
      } else {
        throw e;
      }
    }

    return {
      thought: parsed.thought || parsed.description || '',
      action: parsed,
      usage: response.usage,
      latencyMs: elapsed,
    };
  }

  static calculateCost(usage) {
    const i = (usage?.prompt_tokens || 0) * 0.14 / 1_000_000;
    const o = (usage?.completion_tokens || 0) * 0.42 / 1_000_000;
    return {
      inputTokens: usage?.prompt_tokens || 0,
      outputTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      costUSD: i + o,
      costCNY: (i + o) * 7.3,
    };
  }

  static formatCost(usage) {
    const c = DeepSeekPlanner.calculateCost(usage);
    return `$${c.costUSD.toFixed(6)} ¥${c.costCNY.toFixed(4)} | ${c.inputTokens}→${c.outputTokens}t`;
  }
}
