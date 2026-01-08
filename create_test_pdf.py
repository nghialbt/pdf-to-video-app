import fitz

def create_test_pdf():
    doc = fitz.open()
    colors = [(1, 0, 0), (0, 1, 0), (0, 0, 1)]  # Red, Green, Blue
    
    for color in colors:
        page = doc.new_page()
        # Draw a rectangle covering the whole page
        shape = page.new_shape()
        shape.draw_rect(page.rect)
        shape.finish(color=color, fill=color)
        shape.commit()
        
        # Add some text (to test that it gets removed/ignored by image extraction if it's not part of the image)
        # Wait, my logic extracts *embedded images*. Drawing shapes on a page is NOT an embedded image.
        # It's vector graphics. My current logic `page.get_images()` will returns NOTHING for this.
        # I need to INSERT actual images into the PDF.
    
    doc.save("test_vector.pdf")
    print("Created test_vector.pdf (Vector only - will fail image extraction)")

def create_image_pdf():
    # Create images first
    from PIL import Image
    import os
    
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
    image_files = []
    
    for i, color in enumerate(colors):
        img = Image.new('RGB', (100, 100), color)
        filename = f"temp_img_{i}.png"
        img.save(filename)
        image_files.append(filename)
        
    doc = fitz.open()
    for img_file in image_files:
        page = doc.new_page()
        # Insert image
        page.insert_image(page.rect, filename=img_file)
    
    doc.save("test_images.pdf")
    
    # Cleanup
    for img_file in image_files:
        os.remove(img_file)
        
    print("Created test_images.pdf (With embedded images)")

if __name__ == "__main__":
    create_image_pdf()
