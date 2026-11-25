from pdf2image import convert_from_path

images = convert_from_path(
    r"C:\Sites\RWB-Mesh\Checkpoint-1-Final\WB-Mesh-Checkpoint-Final.pdf",
    dpi=200,
    output_folder=r"C:\Sites\RWB-Mesh\Checkpoint-1-Final",
    fmt="png",
    output_file="slide",
    poppler_path=r"C:\Sites\RWB-Mesh\poppler\poppler-24.08.0\Library\bin"
)
for i, img in enumerate(images):
    img.save(f"C:\\Sites\\RWB-Mesh\\Checkpoint-1-Final\\slide_{i+1}.png", "PNG")
print(f"Converted {len(images)} pages to PNG")