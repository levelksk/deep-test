# deep-test

> 包装 Playwright + DeepSeek V4，低成本的 AI 自动化测试框架
> **同时支持 Web 页面和 Android App 黑盒测试**

## 核心思路

```
┌─────────────────────────────────────────────┐
│  任务: "登录系统，搜索商品，加入购物车"        │
├─────────────────────────────────────────────┤
│  ① 提取页面可交互元素 (DOM / uiautomator)     │
│     (不截图，不依赖视觉模型)                    │
├─────────────────────────────────────────────┤
│  ② DeepSeek V4 分析结构 + 决策下一步          │
│     (~2000 tokens/步 × ¥0.14/M = ¥0.0003/步) │
├─────────────────────────────────────────────┤
│  ③ 执行操作 (Playwright / ADB)              │
├─────────────────────────────────────────────┤
│  ④ 回到①，直到任务完成                        │
└─────────────────────────────────────────────┘
```

## 双端架构

| | Web 测试 | Android App 测试 |
|------|---------|-----------------|
| **DOM 提取** | Playwright (`dom-extractor.js`) | uiautomator2 (`uia2.py`) + adb shell dump |
| **决策引擎** | DeepSeek V4 | DeepSeek V4 (复用) |
| **执行层** | Playwright click/fill | adb shell input tap/send_keys |
| **报告** | reporter.js (HTML 回放报告) | 可复用 reporter.js |
| **成本** | ~¥0.073/29步全流程 | 同级别 |

## 成本优势

| 对比 | 每次调用 | 50步测试 |
|------|---------|---------|
| **deep-test (DeepSeek V4)** | ~¥0.001 | **~¥0.07 (≈¥0.07)** |
| Midscene (Qwen-VL-Plus) | ~¥0.08 | ~¥4.00 (含图片token) |
| browser-use (Claude) | ~$0.10 | ~$5.00 |

**便宜 200-300 倍**，因为纯文本，没有截图 token 开销。

## Web 测试快速开始

```bash
# 1. 安装依赖
cd deep-test
npm install
npx playwright install chromium

# 2. 配置 API Key
echo "DEEPSEEK_API_KEY=sk-你的key" > .env

# 3. 运行示例（医院管理系统 - 新增医生完整流程）
node examples/doctor-full-test.js
```

## Android App 测试快速开始

```bash
# 1. 安装 Python 依赖
pip install uiautomator2

# 2. 连接模拟器 (MuMu)
MSYS2_ARG_CONV_EXCL='*' "D:/Program Files/Netease/MuMu/nx_main/adb.exe" connect 127.0.0.1:7555

# 3. 初始化 uiautomator2 (自动推 ATX agent 到设备)
python -m uiautomator2 init

# 4. 运行测试脚本
python test_input_A.py   # TUIKit 聊天发送消息测试
python uia2.py           # uiautomator2 连接测试
```

> 📖 **详细文档:** [docs/yuanyao-app-testing-skill.md](docs/yuanyao-app-testing-skill.md)
> 包含：环境配置、登录流程、TUIKit 聊天发送方案、坐标参考、常见坑

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

纯结构化数据，没有 base64 图片，所以 token 极少。

## 验证通过的端到端测试

- ✅ **Web: 医院管理系统新增医生** — 29步 / 81.8秒 / ¥0.073 (2026-05-17)
- ✅ **Android: 元骁健康医生端登录** — 白名单账号 + 验证码 (2026-05-17)
- ✅ **Android: TUIKit 聊天发送消息** — send_keys + 点击发送 (2026-05-18)

## 项目文件

| 文件 | 说明 |
|------|------|
| `src/agent.js` | 主循环: DOM/UI提取 → LLM决策 → 执行 |
| `src/planner.js` | 任务拆解器 |
| `src/dom-extractor.js` | Playwright DOM 提取器 |
| `src/actor.js` | 动作执行器 (click/fill/upload/dropdown...) |
| `src/reporter.js` | HTML 双栏报告生成器 |
| `mobile-agent.js` | 移动端 AI Agent (OCR + DeepSeek + ADB) |
| `uia2.py` | uiautomator2 连接与页面元素提取 |
| `ocr.py` | EasyOCR 截图文字识别 |
| `docs/yuanyao-app-testing-skill.md` | Android App 黑盒测试完整文档 |
| `test_input_A.py` | TUIKit 聊天输入 send_keys 方案 |

## 验证通过的测试场景

- `examples/doctor-full-test.js` — 医生新增完整流程 (29步)
- `examples/hospital-full-test.js` — 医院管理流程
- `examples/debug-menu.js` — 菜单导航调试
- `examples/debug-input.js` — 表单输入调试
- `test_input_A.py` — TUIKit 聊天发送消息

## 后续计划

- [x] HTML 报告生成 (Midscene 风格双栏)
- [x] Android App 黑盒自动化测试
- [x] TUIKit 聊天发送消息突破
- [ ] 移动端 agent.js 完整集成
- [ ] YAML 脚本支持（定义测试步骤）
- [ ] CI 集成
