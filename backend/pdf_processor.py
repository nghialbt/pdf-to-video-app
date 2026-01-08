# pdf_processor.py
import fitz  # PyMuPDF
import os
import io
from PIL import Image

def extract_images_from_pdf(pdf_path, output_folder, resize=True):
    """
    Extracts images from a PDF file.
    Returns a list of paths to the extracted images.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    doc = fitz.open(pdf_path)
    image_paths = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        image_list = page.get_images()

        for image_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            # Create a filename
            image_filename = f"page_{page_index+1}_img_{image_index+1}.{image_ext}"
            image_path = os.path.join(output_folder, image_filename)

            # Save the image
            # Resize image to save memory (Max 1920px) if resize is True
            if resize:
                try:
                    img_pil = Image.open(io.BytesIO(image_bytes))
                    img_pil.thumbnail((1920, 1920)) 
                    img_pil.save(image_path)
                except Exception as e:
                    # Fallback to direct write if PIL fails
                    print(f"PIL resize failed: {e}")
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
            else:
                # High quality - keep original
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
            
            image_paths.append(image_path)
            
    return image_paths
