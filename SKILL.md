# DeepTest — AI 自动化测试框架

> DeepSeek V4 + Playwright，纯文本 DOM 交互，成本仅 Midscene 的 1/200

## 核心架构

```
用户输入自然语言
    │
    ▼
┌─────────────────────────┐
│    planner.js            │
│  LLM 将任务拆解为步骤序列 │
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│    agent.js              │
│  主循环：提取DOM→LLM决策→ │
│  执行→检查→循环          │
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│  dom-extractor.js        │
│  提取页面可交互元素列表    │
│  (不截图，无视觉模型)      │
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│    actor.js              │
│  执行具体操作(click/fill/ │
│  upload/dropdown/cascade)│
└─────────────────────────┘
```

## 成本优势

| 对比 | 每次调用 | 50步测试 |
|------|---------|---------|
| **deep-test (DeepSeek V4)** | ~$0.0003 | **~$0.015 (≈¥0.11)** |
| Midscene (Qwen-VL-Plus) | ~$0.08 | ~$4.00 |
| browser-use (Claude) | ~$0.10 | ~$5.00 |

## 项目结构

```
deep-test/
├── src/
│   ├── agent.js          # 主循环 + 动作分发
│   ├── actor.js          # Playwright 操作执行
│   ├── dom-extractor.js  # DOM 结构化提取
│   ├── planner.js        # LLM 任务规划
│   ├── reporter.js       # HTML 报告生成 (Midscene 风格)
│   ├── types.js          # 类型定义
│   └── index.js          # 入口
├── examples/
│   ├── doctor-full-test.js # 新增医生完整流程测试
│   └── ...                # 调试脚本
└── SKILL.md              # ← 本文档
```

## 支持的动作类型

| 动作 | 描述 | 适用场景 |
|------|------|---------|
| `navigate` | 跳转 URL | 页面导航 |
| `click` | 点击元素 | 按钮、链接、菜单、单选框 |
| `fill` | 填写输入框 | 文本框 (Vue el-input 支持) |
| `upload` | 上传文件 | 文件上传 (5策略定位) |
| `dropdown` | 下拉选择 | el-select 组件 |
| `cascade` | 级联选择 | 省市区/科室级联 |
| `type` | 键盘输入 | filterable 下拉搜索 |
| `select` | 原生 select | 原生下拉 |
| `extract` | 提取页面内容 | 验证结果 |
| `wait` | 等待 | 等待页面加载 |
| `done` | 完成任务 | 结束信号 |

## 已知问题和修复

### 📌 单选框 (el-radio) 点击
- **问题**：`buildPlaywrightSelector` 中通用文本匹配 (`text=男`) 优先于 radio 特定选择器执行，导致点到错误的页面元素
- **修复**：将 el-radio 检查移到通用文本匹配之前，优先使用 `label.el-radio:has-text("男") .el-radio__inner`
- **文件**：`actor.js` 的 `buildPlaywrightSelector()` 函数

### 📌 上传区域误点击
- **问题**：上传后预览图 (.el-upload--picture-card) 被误当作可点击元素
- **修复**：DOM 提取器中跳过 upload 区域 + actor 中 6 层预览过滤 + 上传元素跳过索引/坐标匹配
- **文件**：`dom-extractor.js` + `actor.js`

### 📌 Vue el-input 填入不生效
- **问题**：Playwright 的 `fill()` 对 Vue 响应式绑定的 input 不触发更新
- **修复**：优先点击 `.el-input__wrapper` 区域再 `keyboard.type()`
- **文件**：`actor.js` 的 `fill` 动作处理

### 📌 el-select 下拉打不开
- **问题**：点击到 label 或外部容器，未点到内部 input 触发器
- **修复**：选择器定位到 `.el-select__wrapper input`
- **文件**：`actor.js` 的 `buildPlaywrightSelector()`

### 📌 级联选择 (el-cascader)
- **问题**：级联面板层级嵌套，选项可见性判断复杂
- **修复**：`cascade` 动作逐级展开，使用 `.el-cascader-node__label` 文字匹配
- **文件**：`actor.js` 的 cascade 处理函数

## 动作优先级策略

```
索引匹配（elements[index]）→ 文字匹配 → 坐标点击 → 隐式
```

- **文字匹配优先于坐标点击**：防止 DOM 索引偏移后点错元素
- **上传区域自动跳过**：upload 后的元素不走索引/坐标点击
- **单选框优先**：先于通用文本匹配

## 环境要求

- Node.js ≥ 18
- Playwright (chromium)
- DeepSeek API Key (或其他 OpenAI 兼容 API)
- Ollama (可选，本地模型支持)

## 快速开始

```bash
npm install
npx playwright install chromium
echo "DEEPSEEK_API_KEY=sk-xxx" > .env
node examples/doctor-full-test.js
```
