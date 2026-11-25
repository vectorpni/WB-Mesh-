from PIL import Image
import os

# Load the 4 slide images
slide_files = [
    r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\slide_1.png",
    r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\slide_2.png",
    r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\slide_3.png",
    r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\slide_4.png",
]

slides = []
for f in slide_files:
    if os.path.exists(f):
        img = Image.open(f)
        slides.append(img)
        print(f"Loaded {f}: {img.size}")
    else:
        print(f"Missing: {f}")

if len(slides) != 4:
    print(f"Expected 4 slides, got {len(slides)}")
    exit(1)

# Create contact sheet: 2x2 grid
# Target size: each thumbnail ~800px wide, with padding
thumb_width = 800
padding = 20
label_height = 40

# Calculate thumbnail height maintaining aspect ratio
thumb_height = int(thumb_width * slides[0].height / slides[0].width)

# Contact sheet dimensions: 2 cols, 2 rows
sheet_width = 2 * thumb_width + 3 * padding
sheet_height = 2 * (thumb_height + label_height) + 3 * padding

# Create white background (WB style - light)
contact_sheet = Image.new('RGB', (sheet_width, sheet_height), '#FAFAFA')

# WB Purple for labels
wb_purple = (75, 0, 130)  # #4B0082

from PIL import ImageDraw, ImageFont

draw = ImageDraw.Draw(contact_sheet)

# Try to load a font
try:
    font = ImageFont.truetype("arial.ttf", 24)
    font_small = ImageFont.truetype("arial.ttf", 16)
except:
    font = ImageFont.load_default()
    font_small = ImageFont.load_default()

slide_titles = [
    "Слайд 1: Проблема и идея",
    "Слайд 2: Как работает WB Mesh",
    "Слайд 3: Экономика",
    "Слайд 4: Пилот, риски, команда"
]

for idx, (slide, title) in enumerate(zip(slides, slide_titles)):
    row = idx // 2
    col = idx % 2

    x = padding + col * (thumb_width + padding)
    y = padding + row * (thumb_height + label_height + padding)

    # Resize slide to thumbnail
    thumb = slide.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)

    # Paste thumbnail
    contact_sheet.paste(thumb, (x, y + label_height))

    # Draw label background
    draw.rectangle([x, y, x + thumb_width, y + label_height], fill=wb_purple)

    # Draw label text
    text_bbox = draw.textbbox((0, 0), title, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = x + (thumb_width - text_width) // 2
    text_y = y + (label_height - (text_bbox[3] - text_bbox[1])) // 2
    draw.text((text_x, text_y), title, fill='white', font=font)

# Save contact sheet
output_path = r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\WB-Mesh-Slides-Preview.png"
contact_sheet.save(output_path, "PNG", quality=95)
print(f"Contact sheet saved to {output_path}: {contact_sheet.size}")