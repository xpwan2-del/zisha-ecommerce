#!/usr/bin/env python3
from PIL import Image
import sys

def remove_white_background(input_path, output_path, threshold=240):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    input_file = "/Users/davis/Desktop/IMAGE 2026-04-04 20:28:24.jpg"
    output_file = "/Users/davis/zisha-ecommerce/public/logo.png"
    remove_white_background(input_file, output_file)