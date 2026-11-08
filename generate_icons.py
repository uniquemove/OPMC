import os
import shutil
from PIL import Image

SOURCE = r"C:\Users\annc1\.gemini\antigravity\brain\095d5eda-db33-4042-a8e0-332f5ea87b1c\.user_uploaded\media_1792316846307_488e303f.png"
RES_DIR = r"d:\doan_EPU\One Punch Man Challenge\frontend\android\app\src\main\res"
PUBLIC_DIR = r"d:\doan_EPU\One Punch Man Challenge\frontend\public"

def main():
    img = Image.open(SOURCE).convert("RGBA")
    print(f"Loaded source image: {img.size}")

    # 1. Save to frontend/public
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    logo_web_path = os.path.join(PUBLIC_DIR, "logo.png")
    img.save(logo_web_path, "PNG")
    print(f"Saved: {logo_web_path}")

    favicon_path = os.path.join(PUBLIC_DIR, "favicon.png")
    fav = img.resize((64, 64), Image.Resampling.LANCZOS)
    fav.save(favicon_path, "PNG")
    print(f"Saved: {favicon_path}")

    # 2. Standard Launcher Icons (48, 72, 96, 144, 192)
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    for folder, (icon_sz, fg_sz) in densities.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon
        icon = img.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        icon.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        # Foreground for adaptive icon (108dp with 72dp safe area => ~72% scale)
        fg_canvas = Image.new("RGBA", (fg_sz, fg_sz), (0, 0, 0, 0))
        logo_sz = int(fg_sz * 0.72)
        logo_resized = img.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
        offset = ((fg_sz - logo_sz) // 2, (fg_sz - logo_sz) // 2)
        fg_canvas.paste(logo_resized, offset, logo_resized)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated {folder}: icon {icon_sz}x{icon_sz}, fg {fg_sz}x{fg_sz}")

    # 3. Update Splash Screens
    splash_dirs = [
        "drawable",
        "drawable-land-mdpi", "drawable-land-hdpi", "drawable-land-xhdpi", "drawable-land-xxhdpi", "drawable-land-xxxhdpi",
        "drawable-port-mdpi", "drawable-port-hdpi", "drawable-port-xhdpi", "drawable-port-xxhdpi", "drawable-port-xxxhdpi"
    ]

    for s_dir in splash_dirs:
        dir_path = os.path.join(RES_DIR, s_dir)
        splash_file = os.path.join(dir_path, "splash.png")
        if os.path.exists(splash_file):
            try:
                with Image.open(splash_file) as old_splash:
                    w, h = old_splash.size
                
                # Create dark background #0d0f17 matching app theme
                splash_bg = Image.new("RGBA", (w, h), (13, 15, 23, 255))
                # Scale logo to ~35% of smaller dimension
                target_logo_sz = int(min(w, h) * 0.40)
                scaled_logo = img.resize((target_logo_sz, target_logo_sz), Image.Resampling.LANCZOS)
                paste_x = (w - target_logo_sz) // 2
                paste_y = (h - target_logo_sz) // 2
                splash_bg.paste(scaled_logo, (paste_x, paste_y), scaled_logo)
                splash_bg.save(splash_file, "PNG")
                print(f"Updated splash: {s_dir}/splash.png ({w}x{h})")
            except Exception as e:
                print(f"Error processing {splash_file}: {e}")

    # 4. Update ic_launcher_background color
    bg_xml_path = os.path.join(RES_DIR, "values", "ic_launcher_background.xml")
    if os.path.exists(bg_xml_path):
        with open(bg_xml_path, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D0F17</color>\n</resources>\n')
        print("Updated ic_launcher_background color to #0D0F17")

    print("ALL ICONS SUCCESSFULLY GENERATED!")

if __name__ == "__main__":
    main()
