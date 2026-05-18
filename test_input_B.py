"""方案🅱: 长按输入框 → 弹出粘贴按钮 → OCR点击粘贴"""
import uiautomator2 as u2
import time
import subprocess
import sys

ADB = r'D:\Program Files\Netease\MuMu\nx_main\adb.exe'
SERIAL = '127.0.0.1:7555'

def adb_shell(cmd):
    full = f'"{ADB}" -s {SERIAL} shell {cmd}'
    return subprocess.run(full, shell=True, capture_output=True, text=True)

d = u2.connect_usb(SERIAL)
d.adb_path = ADB
d.wait_timeout = 10

text_to_send = "你好，今天感觉怎么样？"

# Step 1: 先点击输入框区域聚焦
print("step 1: 点击输入框区域聚焦...")
input_x, input_y = 600, 2470
d.click(input_x, input_y)
time.sleep(1)

# Step 2: 剪贴板 - 用 adb shell service call 写剪贴板
# 不同 Android 版本命令不同, 先试试这个
print("step 2: 设置系统剪贴板...")

# 方法1: content insert (Android 8+ 可用)
result = adb_shell(f'content insert --uri content://settings/system --bind name:s:clipboard_text --bind value:s:"{text_to_send}" 2>&1')
print(f"  content insert: {result.stdout.strip()[:100]}")

# 方法2: 试试直接 input text (万一焦点已经在了)
print("\nstep 2b: 直接 input text 试试...")
result2 = adb_shell(f'input text "{text_to_send[:10]}" 2>&1')
print(f"  input text: {result2.stdout.strip()[:100]}")

# Step 3: 看看页面变化
time.sleep(2)
print("\nstep 3: 检查页面元素变化...")
# 看有没有新的TextView出现
texts = d(className='android.widget.TextView')
new_chat_items = []
for el in texts:
    t = el.get_text() or ''
    if t.strip() and '发送' not in t:
        pass
print(f"  TextView 总数: {texts.count}")

# 重点: 看输入框位置有没有变化
edit_els = d(className='android.widget.EditText')
print(f"  EditText 总数: {edit_els.count}")
for i, el in enumerate(edit_els):
    bounds = el.info.get('visibleBounds', {})
    txt = el.get_text() or '(empty)'
    print(f"    EditText[{i}]: '{txt[:30]}' bounds={bounds}")

# Step 4: 长按输入框位置800ms触发粘贴弹出
print("\nstep 4: 长按输入框触发粘贴弹出...")
adb_shell(f'input swipe {input_x} {input_y} {input_x} {input_y} 800')
time.sleep(2)

# Step 5: 截图OCR识别粘贴按钮
print("\nstep 5: 截图...")
screenshot_path = '/sdcard/paste_check.png'
adb_shell(f'screencap {screenshot_path}')
time.sleep(0.5)
local_path = 'paste_check.png'
subprocess.run(f'"{ADB}" -s {SERIAL} pull {screenshot_path} {local_path}', shell=True, capture_output=True)
print(f"  截图已保存: {local_path}")

# Step 6: 用uiautomator重新dump看是否有新的可点击元素
print("\nstep 6: 查找粘贴按钮...")
clickable = d(clickable=True)
for el in clickable:
    bounds = el.info.get('visibleBounds', {})
    txt = el.get_text() or ''
    # 显示在底部的可点击元素
    if bounds and bounds.get('top', 0) > 2000:
        print(f"  底部可点击: '{txt}' bounds={bounds}")

# 查找包含"粘贴"或"Paste"的元素
paste_targets = d(textContains='粘贴')
print(f"  包含'粘贴'的元素: {paste_targets.count}")
for el in paste_targets:
    bounds = el.info.get('visibleBounds', {})
    print(f"    '{el.get_text()}' bounds={bounds}")

paste_targets2 = d(textContains='Paste')
print(f"  包含'Paste'的元素: {paste_targets2.count}")
for el in paste_targets2:
    bounds = el.info.get('visibleBounds', {})
    print(f"    '{el.get_text()}' bounds={bounds}")

print("\n=== 检查是否有新建的消息气泡 ===")
# 如果粘贴成功，可能会有新消息
adb_shell(f'input keyevent 279')  # KEYCODE_PASTE 再试一次
time.sleep(1)

print("\n完成 - 请查看 paste_check.png 截图确认是否有粘贴弹出")
