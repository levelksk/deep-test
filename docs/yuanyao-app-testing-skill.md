---
name: yuanyao-health-app-testing
description: 元骁健康医生端安卓App 黑盒自动化测试 — uiautomator2 + ADB 无root方案，含TUIKit聊天发送消息完整流程
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [android, appium, uiautomator2, adb, blackbox, tui-kit, qq]
    related_skills: [deep-test, mobile-testing-strategies]
---

# 元骁健康医生端 — Android App 黑盒自动化测试

## Overview

元骁健康医生端（`com.ybbhealth.medic`）是基于 Uni-app (DCloud) 框架开发的 Android App，核心业务页面为 WebView 渲染。本 skill 记录了一套**纯黑盒、不需 root、不需 App 源码**的自动化测试方案，涵盖登录、页面导航、TUIKit 聊天发送消息等关键场景。

**核心选型:** `uiautomator2`（Python 库）+ ADB + DeepSeek LLM 决策引擎
**核心突破:** 即便 TUIKit 聊天输入框是 WebView 内部的 `contenteditable` div，原生层仍有一个 `NAF=true` 的 `EditText` 覆盖层可被 uiautomator2 的 `send_keys()` 写入。

## When to Use

- 需要对任意 Android App 进行黑盒自动化测试（无源码、无 root）
- 测试目标为 Uni-app / Flutter / React Native 等混合框架 App
- 需要测试 App 内部 TUIKit / 腾讯云IM 聊天发送消息功能
- 场景：登录 → 导航到患者 → 进入聊天 → 输入文字 → 发送

**不要用于:**
- 已有源码的白盒测试（请用官方框架）
- iOS 测试（本方案仅 Android）

## 环境准备

### 工具安装

```bash
# 1. uiautomator2 (Python)
pip install uiautomator2

# 2. ADB (MuMu 模拟器自带)
D:/Program Files/Netease/MuMu/nx_main/adb.exe

# 3. 连接模拟器
MSYS2_ARG_CONV_EXCL='*' "D:/Program Files/Netease/MuMu/nx_main/adb.exe" connect 127.0.0.1:7555
```

### MuMu 模拟器连接

| 参数 | 值 |
|------|-----|
| ADB 路径 | `D:\Program Files\Netease\MuMu\nx_main\adb.exe` |
| 连接端口 | `127.0.0.1:7555` |
| MSYS2 路径转换 | 每个 ADB 命令前加 `MSYS2_ARG_CONV_EXCL='*'` |

### 初始化 uiautomator2

首次连接会自动在手机上安装 ATX agent APK（通过无障碍服务 AccessibilityService 工作，不需要 root）：

```python
import uiautomator2 as u2
d = u2.connect('127.0.0.1:7555')
print(d.info)  # 验证连接
```

## App 信息

| 字段 | 值 |
|------|-----|
| 包名 | `com.ybbhealth.medic` |
| 启动 Activity | `io.dcloud.PandoraEntry` |
| 框架 | Uni-app (DCloud) |
| 测试账号 | `15605885696`（白名单） |
| 测试环境 | v2.3.1 |
| 模拟器分辨率 | 1440×2560 |

### 启动 App

```python
# 通过 uiautomator2
d.app_start('com.ybbhealth.medic')

# 或通过 ADB
adb shell am start -n com.ybbhealth.medic/io.dcloud.PandoraEntry
```

## 页面结构识别

**核心发现:** Uni-app App 有两种页面类型，处理方式完全不同：

### 原生 UI 页面（登录页、弹窗）
- uiautomator dump 完美提取所有节点
- 含 `text`/`content-desc`/`bounds`/`clickable` 等属性
- 可用 `d(text='xxx').click()` 直接操作

**已验证的原生页面：**
- 隐私协议弹窗 → "同意并接受" / "暂不同意" 按钮
- 验证码登录页 → 手机号/验证码 EditText + 登录 Button
- 底部 Tab（工作台/患者/我的）
- 患者列表、快捷回复功能栏

### WebView 页面（业务页面）
- uiautomator dump 仅返回一个 `<WebView>` 空节点，内部 DOM 不可见
- 但底层可能有**原生 EditText 覆盖层**（NAF=true），可以被 uiautomator2 操作

## 登录流程

> 白名单账号，验证码随意输入即可

```python
import uiautomator2 as u2
d = u2.connect('127.0.0.1:7555')

# 1. 点击手机号输入框
d(text='手机号').click()
d.send_keys('15605885696')

# 2. 点击验证码输入框
d(text='验证码').click()
d.send_keys('1111')

# 3. 勾选协议
d.click(720, 1653)  # 协议勾选框坐标

# 4. 点击登录
d(text='登录').click()
```

## ⭐ 关键突破：TUIKit 聊天发送消息

### 问题
TUIKit 聊天输入框是 WebView 内部的 `<div contenteditable="true">`，常规方案全部无效：
- ❌ `adb shell input text` — 对 contenteditable 无效
- ❌ ADBKeyboard 广播注入 — 同样无效
- ❌ `uiautomator setText` — 触及不到 WebView 内部
- ❌ Appium WebView Context — 需要 `setWebContentsDebuggingEnabled(true)`，生产包不开

### 解决方案：利用原生 EditText 覆盖层

**关键发现:** TUIKit 在 WebView 输入框位置还有一个**原生 `EditText` 覆盖层**（`NAF=true`，Not Accessibility Friendly），uiautomator2 的 `send_keys()` 可以通过 AccessibilityService 路径写入文字。

### 完整发送消息流程

```python
import uiautomator2 as u2
d = u2.connect('127.0.0.1:7555')
import time

# 1. 点输入框聚焦（文字"请输入消息"的坐标位置）
d.click(700, 2472)
time.sleep(0.3)

# 2. 使用 send_keys 填入文字（注意：用 clear=True 清空已有内容）
d.send_keys('你好，今天感觉怎么样？', clear=True)
time.sleep(0.3)

# 3. 发送按钮出现在输入框右侧 [1200,2432][1328,2508]（TUIKit 在文字填入后自动将语音按钮切换为发送按钮）
d.click(1264, 2470)  # 发送按钮中心坐标

# 4. 确认发送成功
xml = d.dump_hierarchy()
if '请输入消息' in xml:  # 输入框清空回到占位文字状态
    print('✓ 消息发送成功')
```

### 关键要点

| 步骤 | 方法 | 说明 |
|------|------|------|
| 聚焦输入框 | `d.click(x, y)` 或 `d(text='请输入消息').click()` | 先点原生 EditText 获取焦点 |
| 填入文字 | `d.send_keys('内容', clear=True)` | **不要用 `set_text()`** — NAF 元素上 set_text 不可靠 |
| 发送 | `d.click(1264, 2470)` | 发送按钮在输入框右侧，填入文字后才出现 |
| 验证 | 检查 XML 中是否回到"请输入消息"状态 | 清空了 = 发出去了 |

### 为什么不使用 `set_text()`

首次测试时 `set_text()` 偶然成功过一次，但后续在同一 EditText 上不再可靠。`send_keys()` 通过模拟按键事件写入，对 NAF 元素更稳定。

## 已知页面元素坐标参考（1440×2560 分辨率）

| 元素 | 坐标 bounds | 说明 |
|------|-----------|------|
| 输入框 | `[232,2428][1172,2516]` | 初始，含占位文字"请输入消息" |
| 输入框（有文字后） | `[232,2428][1036,2516]` | 宽度缩小，右侧让给发送按钮 |
| 发送按钮 | `[1200,2432][1328,2508]` | 填入文字后才出现 |
| 语音按钮 | `[48,2424][144,2520]` | 快捷回复功能栏左侧 |
| 更多按钮 | `[1284,2424][1380,2520]` | 输入框右侧 |
| 快捷回复 | `[60,2196][456,2340]` | 输入框上方功能栏 |
| 预约沟通 | `[616,2236][836,2300]` | 同上 |
| 结束 | `[1216,2196][1440,2340]` | 结束当前沟通 |

## 完整测试脚本模板

```python
import uiautomator2 as u2
import time

d = u2.connect('127.0.0.1:7555')

def send_chat_message(text):
    """在 TUIKit 聊天页面发送文字消息"""
    # 1. 聚焦输入框
    input_area_x, input_area_y = 700, 2472
    d.click(input_area_x, input_area_y)
    time.sleep(0.3)
    
    # 2. 填入文字
    d.send_keys(text, clear=True)
    time.sleep(0.3)
    
    # 3. 点击发送按钮
    send_btn_x, send_btn_y = 1264, 2470
    d.click(send_btn_x, send_btn_y)
    time.sleep(1)
    
    # 4. 验证
    xml = d.dump_hierarchy()
    if '请输入消息' in xml:
        return True
    return False

# 使用
send_chat_message('您好，请问有什么可以帮您？')
```

## 架构建议

### 混合页面策略

```
原生页面 → uiautomator2 dump → LLM 决策 → ADB click/send_keys
WebView  → 截图 + OCR (PaddleOCR/EasyOCR) → LLM → ADB tap (坐标)
TUIKit输入 → 原生EditText覆盖层 → uiautomator2 send_keys
```

### 与 deep-test 框架集成

deep-test 的 `agent.js` 主循环和 `planner.js` 可以直接复用，只需替换：
- DOM 提取层: Playwright → `uiautomator2 dump_hierarchy()`
- 动作执行层: Playwright click/fill → `adb shell input tap/text`

## 技术路线对比

| 方案 | 原生页 | TUIKit输入 | WebView文字 | 需root | 需源码 |
|------|--------|------------|-------------|--------|--------|
| **uiautomator2 (本方案)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| Appium WebView Context | ✅ | ✅ | ✅ | ❌ | ❌ |
| ADB + uiautomator dump | ✅ | ❌ | ❌ | ❌ | ❌ |
| Frida Hook | ✅ | ✅ | ✅ | ✅ | ❌ |
| Airtest | ✅ | ❌ | ❌ | ❌ | ❌ |
| Uni-app 官方测试 | ✅ | ✅ | ✅ | ❌ | ✅ |

## Common Pitfalls

1. **`set_text()` 在 NAF EditText 上不可靠**
   - 首次可能成功，后续不再工作
   - **修复:** 始终使用 `send_keys(text, clear=True)`

2. **发送按钮位置依赖文字填入**
   - 如果输入框为空，右侧显示的是「语音」按钮而非「发送」
   - **修复:** 确保 `send_keys` 成功后，发送按钮会自然出现；通常需要 200-500ms 延迟

3. **发送后输入框可能出现 "请输入消息" 或完全空状态**
   - 两种状态都表示发送成功
   - **检查逻辑:** `'请输入消息' in xml` 而不是 `not old_text in xml`

4. **坐标因分辨率不同可能失效**
   - MuMu 模拟器分辨率 1440×2560（竖屏），坐标值据此
   - **修复:** 优先用 `d(text='xxx')` 语义定位，坐标作为兜底

5. **输入法冲突**
   - 系统输入法可能拦截 `send_keys` 按键事件
   - **修复:** 确保 ATX agent 的服务权优先（uiautomator2 初始化时自动处理）

6. **WebView 调试模式未开启**
   - 生产包 `ro.debuggable=0`，Chrome DevTools 连不上
   - **接受现实:** 走截图+OCR 方案，或者利用 EditText 覆盖层

7. **MSYS2 路径转换**
   - 在 Git Bash 中执行 ADB 命令时，POSIX 路径会被 MSYS 自动转换
   - **修复:** 每个 ADB 命令前加 `MSYS2_ARG_CONV_EXCL='*'`

## Verification Checklist

- [ ] `pip install uiautomator2` 已安装
- [ ] MuMu 模拟器 ADB 连接正常 (`adb devices` 显示 `127.0.0.1:7555 device`)
- [ ] uiautomator2 初始化成功 (`u2.connect('127.0.0.1:7555')` 不报错)
- [ ] 登录流程可跑通（白名单账号)
- [ ] TUIKit 输入框可被 `send_keys()` 写入文字
- [ ] 发送按钮点击后输入框清空
- [ ] 患者端确认收到消息（端到端验证）
