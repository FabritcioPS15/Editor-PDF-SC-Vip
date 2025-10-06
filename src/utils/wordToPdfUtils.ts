import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface WordDocumentContent {
  title: string;
  content: string;
  metadata: {
    author: string;
    date: string;
    category: string;
  };
}

export async function convertWordContentToPDF(
  content: WordDocumentContent,
  imageDataUrl?: string
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Get page dimensions
  const { width: pageWidth, height: pageHeight } = page.getSize();
  
  // Margins
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  // Current Y position (start from top)
  let currentY = pageHeight - margin;
  
  // Add title
  page.drawText(content.title, {
    x: margin,
    y: currentY,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  currentY -= 30;
  
  // Add metadata
  page.drawText(`Autor: ${content.metadata.author}`, {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  currentY -= 15;
  
  page.drawText(`Fecha: ${content.metadata.date}`, {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  currentY -= 30;
  
  // Add image if provided
  if (imageDataUrl) {
    try {
      // Convert base64 image to bytes
      const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
      const image = await pdfDoc.embedJpg(imageBytes);
      
      // Image dimensions
      const imageWidth = 120;
      const imageHeight = 110;
      const imageX = pageWidth - imageWidth - margin;
      const imageY = currentY - imageHeight;
      
      // Draw image
      page.drawImage(image, {
        x: imageX,
        y: imageY,
        width: imageWidth,
        height: imageHeight,
      });
      
      // Add border around image
      page.drawRectangle({
        x: imageX - 1,
        y: imageY - 1,
        width: imageWidth + 2,
        height: imageHeight + 2,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      });
      
      // Adjust content width to avoid overlap with image
      const adjustedContentWidth = imageX - margin - 20;
      
      // Parse and add content
      await addFormattedContent(page, content.content, margin, currentY, adjustedContentWidth, font, boldFont);
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      // Continue without image
      await addFormattedContent(page, content.content, margin, currentY, contentWidth, font, boldFont);
    }
  } else {
    // Add content without image
    await addFormattedContent(page, content.content, margin, currentY, contentWidth, font, boldFont);
  }
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function addFormattedContent(
  page: any,
  content: string,
  startX: number,
  startY: number,
  maxWidth: number,
  font: any,
  boldFont: any
) {
  // Simple HTML to text conversion
  const textContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Split content into lines
  const lines = textContent.split('\n');
  let currentY = startY;
  const lineHeight = 14;
  const fontSize = 12;
  
  for (const line of lines) {
    if (currentY < 50) {
      // Add new page if needed
      const newPage = page.doc.addPage([595.28, 841.89]);
      currentY = 841.89 - 50; // Reset to top of new page
    }
    
    // Check if line is a heading (starts with #)
    const isHeading = line.trim().startsWith('#');
    const displayText = line.replace(/^#+\s*/, '').trim();
    
    if (displayText) {
      page.drawText(displayText, {
        x: startX,
        y: currentY,
        size: isHeading ? 14 : fontSize,
        font: isHeading ? boldFont : font,
        color: rgb(0, 0, 0),
        maxWidth: maxWidth,
      });
      
      currentY -= isHeading ? lineHeight + 5 : lineHeight;
    } else {
      currentY -= lineHeight / 2; // Empty line
    }
  }
}

export function parseWordContent(htmlContent: string, documentName: string): WordDocumentContent {
  // Extract text content from HTML
  const textContent = htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Replace placeholders with actual values
  const processedContent = textContent
    .replace(/\[Tu nombre aquí\]/g, '[NOMBRE]')
    .replace(/\[Fecha actual\]/g, new Date().toLocaleDateString())
    .replace(/\[Número de documento\]/g, '[DOCUMENTO]');
  
  return {
    title: documentName,
    content: processedContent,
    metadata: {
      author: 'Usuario',
      date: new Date().toLocaleDateString(),
      category: 'Documento personalizado'
    }
  };
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'documento.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
