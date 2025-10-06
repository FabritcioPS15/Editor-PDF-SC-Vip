import { PDFDocument, rgb } from 'pdf-lib';

export async function insertImageInPDF(
  pdfArrayBuffer: ArrayBuffer, 
  imageDataUrl: string
): Promise<Uint8Array> {
  // Load the existing PDF
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  
  // Get the first page
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  
  // Convert base64 image to bytes
  const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
  
  // Create a new canvas to crop the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  // Wait for image to load
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = imageDataUrl;
  });
  
  // Calculate crop dimensions (crop 5mm from each side)
  // Assuming 96 DPI (standard web DPI), 5mm ≈ 19 pixels
  const cropPixels = 80; // 5mm in pixels at 96 DPI
  const cropX = cropPixels;
  const cropY = 0; // No vertical cropping
  const cropWidth = img.width - (cropPixels * 2);
  const cropHeight = img.height;
  
  // Set canvas size to cropped dimensions
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  
  // Draw the cropped image
  ctx?.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  
  // Convert cropped canvas back to data URL
  const croppedImageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
  
  // Convert cropped image to bytes
  const croppedImageBytes = await fetch(croppedImageDataUrl).then(res => res.arrayBuffer());
  
  // Embed the cropped image
  const image = await pdfDoc.embedJpg(croppedImageBytes);
  
  // Get page dimensions
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  
  // Calculate new image dimensions based on the cropped image
  // Original target dimensions
  const originalTargetWidth = 120;
  const originalTargetHeight = 110;
  
  // Calculate the aspect ratio of the cropped image
  const croppedAspectRatio = cropWidth / cropHeight;
  const originalAspectRatio = originalTargetWidth / originalTargetHeight;
  
  // Adjust dimensions to maintain aspect ratio of cropped image
  let imageWidth, imageHeight;
  if (croppedAspectRatio > originalAspectRatio) {
    // Cropped image is wider, adjust height
    imageWidth = originalTargetWidth;
    imageHeight = originalTargetWidth / croppedAspectRatio;
  } else {
    // Cropped image is taller, adjust width
    imageHeight = originalTargetHeight;
    imageWidth = originalTargetHeight * croppedAspectRatio;
  }
  
  const xPosition = pageWidth - imageWidth - 90; // 50px margin from right
  const yPosition = pageHeight - imageHeight - 115; // 50px margin from top
  
  // Alternative: Center the image
  // const xPosition = (pageWidth - imageWidth) / 2;
  // const yPosition = (pageHeight - imageHeight) / 2;
  
  // Draw the image on the page
  firstPage.drawImage(image, {
    x: xPosition,
    y: yPosition,
    width: imageWidth,
    height: imageHeight,
    opacity: 1,
  });
  
  // Optional: Add a border around the image
  firstPage.drawRectangle({
    x: xPosition - 1,
    y: yPosition - 1,
    width: imageWidth + 2,
    height: imageHeight + 2,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
    color: undefined, // transparent fill
  });
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Alternative function for custom positioning
export async function insertImageAtCoordinates(
  pdfArrayBuffer: ArrayBuffer,
  imageDataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  
  const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
  const image = await pdfDoc.embedJpg(imageBytes);
  
  firstPage.drawImage(image, {
    x,
    y,
    width,
    height,
    opacity: 1,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Function to find and replace placeholder text with image (advanced feature)
export async function replaceTextWithImage(
  pdfArrayBuffer: ArrayBuffer,
  imageDataUrl: string,
  placeholderText: string = '[FOTO]'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  
  const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
  const image = await pdfDoc.embedJpg(imageBytes);
  
  // This is a simplified approach - in a real implementation,
  // you might need to parse the PDF content to find text positions
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  
  // Default positioning if placeholder not found
  const imageWidth = 150;
  const imageHeight = 200;
  const xPosition = pageWidth - imageWidth - 50;
  const yPosition = pageHeight - imageHeight - 50;
  
  firstPage.drawImage(image, {
    x: xPosition,
    y: yPosition,
    width: imageWidth,
    height: imageHeight,
    opacity: 1,
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}