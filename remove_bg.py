#!/usr/bin/env python3
from PIL import Image, ImageOps

def process_logo(input_path, output_path, scale=0.49, threshold=240):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    bbox = img.getbbox()

    if bbox:
        cropped = img.crop(bbox)

        border_size = max(2, int(min(cropped.width, cropped.height) * 0.02))
        bordered = ImageOps.expand(cropped, border=border_size, fill='white')

        w = int((bbox[2] - bbox[0]) * scale)
        h = int((bbox[3] - bbox[1]) * scale)
        resized = bordered.resize((w, h), Image.LANCZOS)
        resized.save(output_path, "PNG")
        print(f"Scaled {scale*100:.0f}%, with white border {border_size}px, final size {w}x{h}")
    else:
        img.save(output_path, "PNG")

if __name__ == "__main__":
    process_logo(
        "/Users/davis/Desktop/IMAGE 2026-04-04 20:28:24.jpg",
        "/Users/davis/zisha-ecommerce/public/logo.png"
    )