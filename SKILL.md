---
name: deep-test
description: DeepSeek V4 + Playwright AI自动化测试框架 — 纯文本DOM交互，低成本 (¥0.07/29步全流程)
category: software-development
metadata:
  hermes:
    tags: [automation, testing, playwright, deepseek, android]
    related_skills: [yuanyao-health-app-testing]
---

# DeepTest — AI 自动化测试框架

## 项目信息
- **GitHub**: https://github.com/levelksk/deep-test
- **路径**: `D:\projects\deep-test`
- **栈**: Node.js (ESM) + Playwright + DeepSeek API
- **成本**: ~¥0.07/29步全流程 | DeepSeek V4 Flash | ¥0.002/步

## 核心架构

```
planner.js (任务拆解)
  → agent.js (主循环: 提取DOM→LLM决策→执行→检查→循环)
    → dom-extractor.js (提取页面可交互元素列表，不截图)
    → actor.js (执行具体操作)
    → reporter.js (生成Midscene风格双栏HTML报告)
```

## 快速命令

```bash
cd /d/projects/deep-test
node examples/doctor-full-test.js  # 完整医生新增测试
```

## 支持的动作类型

| 动作 | 适用场景 |
|------|---------|
| `navigate` | 页面跳转 |
| `click` | 按钮/链接/菜单/单选框(文字"男"自动匹配radio圆圈) |
| `fill` | 输入框(Vue el-input 通过 wrapper点击+keyboard.type) |
| `upload` | 文件上传(5策略定位: form-item文字→hidden input→触发按钮→坐标) |
| `dropdown` | el-select下拉(自动搜索+点击选项) |
| `cascade` | 级联选择(省市区/科室逐级展开) |
| `type` | filterable下拉搜索(如城市选择) |
| `extract` | 提取页面内容验证 |
| `wait` | 等待加载 |
| `done` | 完成任务 |

## 已知问题与修复

### 单选框(el-radio)点击
- **症状**: 点击"男"文本可能点到无关元素
- **原因**: 通用文本匹配(`text=男`)先于radio特定选择器
- **修复**: radio检查移到通用匹配前，用 `label.el-radio:has-text("男") .el-radio__inner`
- **文件**: `actor.js` → `buildPlaywrightSelector()`

### 上传区域误点击
- **症状**: 上传后预览图被当可点击元素
- **修复**: DOM提取器跳过upload区域 + actor中6层预览过滤 + 上传元素跳过索引/坐标
- **文件**: `dom-extractor.js` + `actor.js`

### Vue el-input 不生效
- **症状**: fill() 写入后Vue不更新
- **修复**: 优先点击`.el-input__wrapper`再用`page.keyboard.type()`
- **文件**: `actor.js` → fill动作

### el-select下拉打不开
- **症状**: 点到label未触发展开
- **修复**: 选择器定位到`.el-select__wrapper input`
- **文件**: `actor.js` → `buildPlaywrightSelector()`

## 动作优先级策略

```
索引匹配(elements[index]) → 文字匹配 → 坐标点击 → 隐式
```

- 文字匹配优先于坐标点击(防DOM索引偏移误点)
- 上传区域自动跳过索引/坐标匹配
- 单选框优先于通用文本匹配

## 测试场景模板

测试脚本在 `examples/doctor-full-test.js`，以下是已验证通过的完整场景模式：

### 医生新增场景 (29步, ~¥0.07)

```
1. navigate → 登录页
2. click "选择租户" → click "元骁健康"  
3. fill 用户名/密码
4. click 登录
5. 导航菜单: click "租户" → click "医生管理"
6. click "新 增"
7. fill 姓名 → upload 头像
8. click "男"(性别) → fill 年龄/手机号/身份证
9. upload 身份证正反面
10. click "医生"(类型) → fill 执业年限
11. dropdown 所属医院
12. upload 执业证书
13. cascade 科室(内科→呼吸内科专业)
14. dropdown 职称(主任医师)
15. click "确认" → 验证返回列表页
```

### 场景 Skill 编写原则

遵循 "技能 vs 记忆" 划分：

- **场景描述**（放入测试脚本注释）："登录后进入医生管理，新增一名医生，填写全部必填字段"
- **验收标准**（放入测试脚本断言）："提交成功后返回列表页，能看到新增的医生"
- **测试数据**（脚本自动生成）：随机姓名/手机号/身份证号

## 报告生成 (v2 — Midscene 风)

`reporter.js` 生成自包含 HTML 报告，**无需外部依赖**：

```
reports/deep-test-report-{timestamp}.html
```

### 双栏布局

```
┌──────────────────────┬────────────────────────────┐
│ 左栏 ~340px          │ 右栏 (弹性)                 │
│                      │                            │
│ Execution            │  ◀ 步骤 N / M ▶            │
│ TYPE        TIME     │ ┌────────────────────────┐ │
│ ✓ navigate           │ │                        │ │
│ ✓ click              │ │    📸 步骤截图           │ │
│ ✓ fill               │ │    (object-fit: contain) │ │
│ ✓ upload             │ │                        │ │
│ ...                  │ └────────────────────────┘ │
│ ✓ done               │ ┌────────────────────────┐ │
│                      │ │ 💭 AI 决策日志           │ │
│                      │ │ ✅ 操作结果 (带状态色)    │ │
│                      │ │ 🔗 URL                  │ │
│                      │ └────────────────────────┘ │
└──────────────────────┴────────────────────────────┘
```

### 交互功能
- **点击左侧步骤** → 右侧展示对应截图 + 决策详情
- **键盘 ← → / ↑ ↓** 切换步骤
- **截图点击** 缩放 toggle
- **深色主题** (#1a1a2e 配色系，与 Midscene 一致)
- **数据内联** — 截图 base64 嵌入 HTML，单文件即开即看

### 依赖
无。纯内联 CSS + JS，不加载任何外部资源。

## Windows Git Bash / MSYS2 注意事项 (ADB)

在 Windows Git Bash 中执行 `adb pull` / `adb shell uiautomator dump` 时，MSYS 会自动转换 POSIX 路径为 Windows 路径，导致 ADB 远程路径 `/sdcard/ui.xml` 被转成 `C:/Program Files/Git/sdcard/ui.xml` 而失败。

**解决方案:** 设置环境变量 `MSYS2_ARG_CONV_EXCL='*'` 禁用所有路径转换：

```bash
MSYS2_ARG_CONV_EXCL='*' adb -s 127.0.0.1:7555 shell uiautomator dump /sdcard/ui.xml
MSYS2_ARG_CONV_EXCL='*' adb -s 127.0.0.1:7555 pull /sdcard/ui.xml D:/projects/deep-test/ui.xml
```

这个环境变量必须加在**每个** ADB 命令前，包括 `shell` 和 `pull`/`push` 操作。

## MuMu 模拟器 ADB

- **ADB 路径**: `D:\Program Files\Netease\MuMu\nx_main\adb.exe`
- **连接端口**: `127.0.0.1:7555` (MuMu 专用 ADB 端口，非标准 5554)
- **替代端口**: `emulator-5554` 也同时可用

```bash
'/d/Program Files/Netease/MuMu/nx_main/adb.exe' connect 127.0.0.1:7555
```

## 移动端APP测试 (已验证)

> 详细文档: `docs/yuanyao-app-testing-skill.md`
> 脚本: `mobile-agent.js` — 移动端 AI Agent
> 脚本: `uia2.py` — uiautomator2 连接与页面提取
> 脚本: `ocr.py` — EasyOCR 截图识别
> 脚本: `test_input_A.py` — TUIKit 聊天发送消息方案

### 设计原则 — 黑盒优先

即使 App 源码可用，也**优先走黑盒测试路线**（`uiautomator2` / 截图 + OCR/VLM）：

```
白盒（开发者视角）: CSS 选择器 → page.$('.phone-input').input('138...')
黑盒（测试工程师视角）: XML[Dump] → AI 看到"手机号输入框" → tap + input text
```

**原因:**
- 测试工程师关注的是**用户行为验证**，不是代码结构验证
- 黑盒更抗 UI 变化 — CSS 类名改了白盒崩，黑盒按文字匹配继续工作
- **一套 Agent 测所有 App** — 不管 Uni-app / 原生 / Flutter / RN，统一方案
- 白盒测试的定位精度优势，在 DeepSeek V4 + 坐标偏移补偿下差距不大

### ⚠️ 核心限制: Uni-app WebView 页面

**关键发现** (2026-05-17 实测):
- 元骁健康登录前（隐私弹窗、登录页）: ✅ **原生 UI**, uiautomator 完美提取
- 元骁健康登录后（业务页面）: ❌ **WebView 渲染**, uiautomator 仅返回 `<WebView/>` 空节点
- 生产包未开启 `setWebContentsDebuggingEnabled(true)`, Chrome DevTools 连不上
- Appium WebView Context 切换同样依赖调试模式 → **也不行**

**唯一可行方案:** 截图 + VLM (视觉语言模型) 或利用原生覆盖层

### 💡 关键突破: TUIKit 聊天输入框 (2026-05-18 实测)

TUIKit 的聊天输入框是 contenteditable div 在 WebView 内部, 但原生层有一个 `NAF=true` 的 EditText 覆盖层。

**参考:** `docs/yuanyao-app-testing-skill.md` — 完整的技术原理 + 代码模板 + 坐标适配

### Ubuntu / Linux 注意事项

在公司 Linux 环境下运行 ADB:
- Linux 不需要 MSYS2_ARG_CONV_EXCL 环境变量（这是 Windows Git Bash 特有的）
- ADB 路径默认为系统 PATH 中的 `adb`（Linux: `/usr/bin/adb`）
- MuMu 模拟器仅在 Windows 可用，Linux 下需使用 Android Studio 模拟器或真机
- ADB 连接真机: `adb connect <设备IP>:5555`（需开启 USB/无线调试）

### 架构演进: VLM 补全移动端能力

```
阶段1 (当前 — 纯XML):    uiautomator dump → LLM(DeepSeek) → ADB
                                   ❌ WebView 看不见

阶段2 (推荐 — 混合):     uiautomator dump (原生)    → LLM
                         adb screencap  (WebView) → VLM  → ADB

阶段3 (统一):            adb screencap → VLM → ADB
                         对所有页面一致，纯视觉驱动
```

### Uni-app 官方白盒测试框架 vs 我们的黑盒方案

| 维度 | Uni-app 官方框架 | 我们的黑盒方案 |
|------|----------------|--------------|
| 类型 | **白盒** — 需要源项目代码 | **黑盒** — 任意 APK |
| 选择器 | CSS 选择器 / data-testid | bounds 坐标 / text / content-desc |
| 底层 | Jest + `@dcloudio/hbuilderx-cli` | `adb shell uiautomator dump` |
| 运行 | `npm run test:app-android` | `adb shell input tap/text` |
| 断言 | Jest expect() | DeepSeek 决策 + 验证 |
| 定位精度 | ✅ 元素级 | 🟡 坐标级 |
| **能测元骁健康?** | ❌ 没有源码，不行 | ✅ 已验证可行 |

**关键推论：** 对于无源码的第三方 App，官方框架不可用，uiautomator dump 是唯一选择。

### 已验证的架构 (deep-test 移动端继承)

```
deep-test (Web)           mobile-test (App)
     ⬇                         ⬇
Playwright 提取 DOM  →  adb shell uiautomator dump
     ⬇                         ⬇
DeepSeek 决策           →  复用同一套 LLM + planner.js
     ⬇                         ⬇
Playwright click/fill   →  adb shell input tap/text
     ⬇                         ⬇
reporter.js             →  复用 reporter.js (adb screencap)
```

**关键:** `agent.js` 主循环和 `planner.js` 完全不用改，只需替换 DOM 提取和动作执行层。

### 已知登录页结构 (元骁健康医生端 1440×2560)

```
[View] content-desc="欢迎来到元骁健康"
[View] content-desc="验证码登录"
[EditText] text="手机号" bounds=[107,981][1333,1194]
[EditText] text="验证码" bounds=[107,1316][699,1529]
[View] content-desc="发送短信验证码" clickable
[View] 勾选"我已阅读并同意" clickable
[View] content-desc="《用户协议》" clickable
[View] content-desc="《隐私政策》" clickable
[View] content-desc="登录" bounds=[667,2009][771,2077] clickable
```

## Verified Production Run (2026-05-17)

```bash
cd /d/projects/deep-test
node examples/doctor-full-test.js
# → ✅ 29/29 steps | 81.8s | ¥0.0731 | Report: 1.8MB
```

All techniques in this skill (radio `.el-radio__inner`, label-based upload targeting, cascade select visibility filtering, random data generation) validated against a real production system. This is the benchmark for all future runs.
