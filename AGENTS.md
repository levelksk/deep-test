# Deep-Test 项目 — AI Agent 指南

> 本文件由 AI Agent 在进入项目目录时自动读取，用于了解项目结构和测试场景。

## 📋 项目概述

低成本的 AI 自动化测试框架，支持 **Web 页面**（Playwright）和 **Android App**（uiautomator2）黑盒测试。决策引擎使用 DeepSeek V4，纯文本 DOM/UI 树交互，一张截图都不用。

## 🎯 可用测试场景

| 场景名称 | 平台 | 执行命令 | 说明 |
|----------|------|---------|------|
| 新增医生 | Web | `node examples/doctor-full-test.js` | 登录医院管理系统 → 新增医生全流程 (29步) |
| 医院管理 | Web | `node examples/hospital-full-test.js` | 医院管理流程 |
| 菜单导航 | Web | `node examples/debug-menu.js` | 调试菜单导航 |
| 表单输入 | Web | `node examples/debug-input.js` | 调试表单输入 |
| 聊天发送 | Android | `python test_input_A.py` | TUIKit 聊天发送消息测试 |
| UI2连接测试 | Android | `python uia2.py` | uiautomator2 设备连接检测 |

## 🧩 项目文件结构

```
deep-test/
├── src/                    # 核心框架代码
│   ├── agent.js            # 主循环: DOM提取→LLM决策→执行
│   ├── planner.js          # 任务拆解
│   ├── dom-extractor.js    # Playwright DOM 提取器
│   ├── actor.js            # 动作执行器
│   └── reporter.js         # HTML 报告
├── examples/               # Web 测试示例
│   ├── doctor-full-test.js # 新增医生完整流程
│   ├── hospital-full-test.js
│   └── ...
├── mobile-agent.js         # 移动端 AI Agent
├── uia2.py                 # uiautomator2 工具
├── ocr.py                  # OCR 工具
├── test_input_A.py         # TUIKit 发送测试
├── docs/
│   └── yuanyao-app-testing-skill.md  # App 测试详细文档
├── config/                 # (可选) 环境配置文件
│   ├── local.yaml          # 本地环境配置
│   └── company.yaml        # 公司环境配置
├── SKILL.md                # Hermes 技能定义 (Web+移动端完整方案)
└── AGENTS.md               # ← 你正在看的这份指南
```

## 🔧 运行前置

**Web 测试：**
```bash
cd /path/to/deep-test
npm install                        # 首次
npx playwright install chromium    # 首次
echo "DEEPSEEK_API_KEY=sk-xxx" > .env
node examples/doctor-full-test.js  # 跑新增医生
```

**Android 测试：**
```bash
pip install uiautomator2
python -m uiautomator2 init
python test_input_A.py
```

## ⚙️ 变量/配置说明

如需替换测试账号或输入值，编辑对应的示例脚本文件（如 `examples/doctor-full-test.js`），搜索 `LOGIN_ACCOUNT`、`DOCTOR_NAME` 等变量进行替换。

也可参考 `config/` 目录下的 YAML 配置文件实现参数化。

## 🚨 注意事项

1. **不要提交 `.env` 文件** — 已在 `.gitignore` 中排除
2. **ADB 连接 MuMu** — 需 `MSYS2_ARG_CONV_EXCL='*'` 前缀
3. **TUIKit 输入** — 必须使用 `send_keys()`，`set_text()` 不稳定
4. **运行前确保** — 模拟器/手机已连接（`python -m uiautomator2 init` 验证）
