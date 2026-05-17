# deep-test

> 包装 Playwright + DeepSeek V4，低成本的 AI 自动化测试框架

## 核心思路

```
┌─────────────────────────────────────────────┐
│  任务: "登录系统，搜索商品，加入购物车"        │
├─────────────────────────────────────────────┤
│  ① Playwright 提取 DOM 可交互元素列表         │
│     (不截图，不依赖视觉模型)                    │
├─────────────────────────────────────────────┤
│  ② DeepSeek V4 分析 DOM + 决策下一步          │
│     (~2000 tokens/步 × $0.14/M = $0.0003/步) │
├─────────────────────────────────────────────┤
│  ③ Playwright 执行操作 (click/fill/select)    │
├─────────────────────────────────────────────┤
│  ④ 回到①，直到任务完成                        │
└─────────────────────────────────────────────┘
```

## 成本优势

| 对比 | 每次调用 | 50步测试 |
|------|---------|---------|
| **deep-test (DeepSeek V4)** | ~$0.0003 | **~$0.015 (≈¥0.11)** |
| Midscene (Qwen-VL-Plus) | ~$0.08 | ~$4.00 (含图片token) |
| browser-use (Claude) | ~$0.10 | ~$5.00 |

**便宜 200-300 倍**，因为纯文本，没有截图 token 开销。

## 快速开始

```bash
# 1. 安装依赖
cd deep-test
npm install
npx playwright install chromium

# 2. 配置 API Key
echo "DEEPSEEK_API_KEY=sk-你的key" > .env

# 3. 运行示例
npm test
```

## 工作原理

AI 收到的页面信息长这样：

```
URL: https://github.com
Title: GitHub
Total interactive elements: 45

[0]<input placeholder="Search GitHub" name="q">
[1]<button>Sign in</button>
[2]<a>Sign up</a>
[3]<a> Pull requests </a>
...
```

纯结构化 DOM 数据，没有 base64 图片，所以 token 极少。

## 后续计划

- [ ] YAML 脚本支持（定义测试步骤）
- [ ] 多步骤任务编排
- [ ] 报告 HTML 生成
- [ ] 截图失败归档
- [ ] 元素自愈（AI 自动修正选择器）
- [ ] 并行执行
- [ ] CI 集成
