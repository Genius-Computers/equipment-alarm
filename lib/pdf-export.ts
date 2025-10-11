import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export const exportToPDF = async (
  elementId: string, 
  options: PDFExportOptions = {}
): Promise<void> => {
  const {
    filename = 'monthly-report.pdf',
    title = 'Monthly Maintenance Report',
    subtitle = '',
    pageSize = 'A4',
    orientation = 'portrait'
  } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Create a temporary container for PDF-specific styling
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '12px';
    tempContainer.style.lineHeight = '1.4';
    
    // Clone the element content
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Apply PDF-specific styles
    clonedElement.style.backgroundColor = 'white';
    clonedElement.style.color = 'black';
    clonedElement.style.fontFamily = 'Arial, sans-serif';
    clonedElement.style.fontSize = '12px';
    clonedElement.style.lineHeight = '1.4';
    clonedElement.style.padding = '20px';
    clonedElement.style.margin = '0';
    clonedElement.style.width = '100%';
    clonedElement.style.boxSizing = 'border-box';
    
    // Hide elements that shouldn't be in PDF
    const elementsToHide = clonedElement.querySelectorAll('.print\\:hidden, .no-print');
    elementsToHide.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Show elements that should only appear in print
    const elementsToShow = clonedElement.querySelectorAll('.print\\:block');
    elementsToShow.forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Generate canvas from the element
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight,
    });

    // Clean up temporary container
    document.body.removeChild(tempContainer);

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize.toLowerCase() as any,
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add title page if specified
    if (title) {
      pdf.setFontSize(20);
      pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
      
      if (subtitle) {
        pdf.setFontSize(14);
        pdf.text(subtitle, pdf.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
      }
      
      pdf.addPage();
    }

    // Add content pages
    const imgData = canvas.toDataURL('image/png');
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      
      if (heightLeft >= 0) {
        pdf.addPage();
      }
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const exportMonthlyReportToPDF = async (
  elementId: string,
  month: string,
  year: number
): Promise<void> => {
  await exportToPDF(elementId, {
    filename: `monthly-report-${year}-${month.padStart(2, '0')}.pdf`,
    title: `Monthly Maintenance Report`,
    subtitle: `${month} ${year}`,
    pageSize: 'A4',
    orientation: 'portrait'
  });
};


