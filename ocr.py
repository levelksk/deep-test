"""ocr.py - 截图 OCR 识别，输出 JSON"""
import sys, json, os

# 添加必要的路径
sys.path.insert(0, os.path.expanduser(r'~\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\site-packages'))

import easyocr

def main():
    img_path = sys.argv[1] if len(sys.argv) > 1 else r'D:\projects\deep-test\mobile_screen.png'
    
    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False, verbose=False)
    results = reader.readtext(img_path)
    
    items = []
    for bbox, text, conf in results:
        if conf < 0.4:
            continue
        x1, y1 = bbox[0]
        x2, y2 = bbox[2]
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        items.append({
            'text': text.strip(),
            'x': int(cx),
            'y': int(cy),
            'conf': round(conf, 2)
        })
    
    # 按 Y 坐标排序
    items.sort(key=lambda i: i['y'])
    
    print(json.dumps(items, ensure_ascii=False))

if __name__ == '__main__':
    main()
