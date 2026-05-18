"""方案🅰: 剪贴板 + KEYCODE_PASTE
逻辑: 
1. 聚焦输入框区域
2. 设置系统剪贴板
3. 发送 KEYCODE_PASTE (279)
"""
import uiautomator2 as u2
import time
import subprocess
import sys

ADB = r'D:\Program Files\Netease\MuMu\nx_main\adb.exe'
SERIAL = '127.0.0.1:7555'

def adb(cmd):
    full = f'"{ADB}" -s {SERIAL} {cmd}'
    subprocess.run(full, shell=True, capture_output=True)

d = u2.connect_usb(SERIAL)
d.adb_path = ADB
d.wait_timeout = 10

# Step 1: 先看看聊天输入框区域在哪
# 发送按钮在 1200~1328 x, 2432~2508 y
# 输入框应该在发送按钮左边
print("=== 当前页面布局 ===")

# 找到所有可点击的元素看输入框
screenshot = d.screenshot()
print(f"截图: {screenshot.size}")

# Step 2: 点击输入框区域（发送按钮左边大片区域）
input_x, input_y = 600, 2470  # 猜测输入框位置
print(f"点击输入框区域 ({input_x}, {input_y})")
d.click(input_x, input_y)
time.sleep(1)

# Step 3: 设置剪贴板
text = "你好，今天感觉怎么样？"
d.set_clipboard(text)
print(f"✅ 剪贴板已设置: '{text}'")

# Step 4: KEYCODE_PASTE
print("发送 KEYCODE_PASTE (279)...")
adb("shell input keyevent 279")
time.sleep(1)

# Step 5: 检查效果 - 重新dump看页面有无变化
print("\n=== 粘贴后页面状态 ===")
text_els = d(className='android.widget.TextView')
new_texts = []
for el in text_els:
    txt = el.get_text() or ''
    if txt.strip():
        new_texts.append(txt[:50])
        print(f"  '{txt[:50]}'")

# Step 6: 试试点击发送按钮
print("\n尝试点击发送...")
send_btn = d(text='发送')
if send_btn.exists:
    send_btn.click()
    print("✅ 点击了发送按钮")
    time.sleep(2)
else:
    d.click(1264, 2470)  # 发送按钮坐标
    print("✅ 坐标点击发送位置")

# 看发送后页面变化
time.sleep(2)
text_els2 = d(className='android.widget.TextView')
print("\n=== 发送后 ===")
for el in text_els2:
    txt = el.get_text() or ''
    if txt.strip() and '发送' not in txt[:10]:
        print(f"  '{txt[:60]}'")
