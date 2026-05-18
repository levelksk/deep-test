"""uia2.py - 用 uiautomator2 操作输入框"""
import uiautomator2 as u2
import sys, json

ADB_PATH = r'D:\Program Files\Netease\MuMu\nx_main\adb.exe'
SERIAL = '127.0.0.1:7555'

# 连接设备
d = u2.connect_usb(SERIAL)
d.adb_path = ADB_PATH

# 等待设备就绪
d.wait_timeout = 10
info = d.info
print(f"设备: {info.get('productName', 'unknown')}")

action = sys.argv[1] if len(sys.argv) > 1 else ''

if action == 'input':
    text = sys.argv[2] if len(sys.argv) > 2 else 'Hello'
    # 找输入框
    edit = d(text='请输入消息')
    if edit.exists:
        edit.click()
        import time
        time.sleep(1)
        edit.set_text(text)
        print(f'✅ set_text: {text}')
    else:
        # 按 EditText 找
        edits = d(className='android.widget.EditText')
        if edits.exists:
            e = edits[0]
            e.click()
            import time
            time.sleep(1)
            e.set_text(text)
            print(f'✅ EditText set_text: {text}')
        else:
            print('❌ 找不到输入框')
            sys.exit(1)

elif action == 'tap_send':
    # 尝试点击发送按钮位置（输入框右侧）
    d.click(1300, 2472)
    print('✅ 点击发送位置')

elif action == 'dump':
    # 输出当前界面的关键元素
    text_els = d(className='android.widget.TextView')
    print(f"\nTextView 共 {text_els.count} 个:")
    for i, el in enumerate(text_els):
        txt = el.get_text() or ''
        if txt.strip():
            bounds = el.info.get('visibleBounds', '')
            clickable = el.info.get('clickable', '')
            print(f"  [{i}] '{txt[:30]}' b={bounds} click={clickable}")

    edit_els = d(className='android.widget.EditText')
    print(f"\nEditText 共 {edit_els.count} 个:")
    for el in edit_els:
        bounds = el.info.get('visibleBounds', '')
        txt = el.get_text() or '(empty)'
        print(f"  EditText '{txt}' b={bounds}")

    btn_els = d(className='android.widget.Button')
    print(f"\nButton 共 {btn_els.count} 个:")
    for el in btn_els:
        txt = el.get_text() or ''
        bounds = el.info.get('visibleBounds', '')
        if txt.strip():
            print(f"  Button '{txt}' b={bounds}")

else:
    print(f"用法: python uia2.py input <text>")
    print(f"      python uia2.py tap_send")
    print(f"      python uia2.py dump")
