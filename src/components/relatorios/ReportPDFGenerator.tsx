import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Report, REPORT_TYPES, REPORT_SCOPES } from "@/hooks/useReports";

export async function generateReportPDF(report: Report): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const addPageIfNeeded = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // ======== CAPA ========
  // Background accent bar
  pdf.setFillColor(212, 175, 55); // Gold color
  pdf.rect(0, 0, pageWidth, 60, "F");

  // Logo placeholder
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("BORA Hub", margin, 35);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Relatórios Inteligentes", margin, 45);

  // Title
  yPosition = 90;
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");

  const titleLines = pdf.splitTextToSize(report.title, contentWidth);
  titleLines.forEach((line: string) => {
    pdf.text(line, margin, yPosition);
    yPosition += 12;
  });

  // Type badge
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(getReportTypeLabel(report.report_type), margin, yPosition);

  // Period
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(50, 50, 50);
  pdf.text("Período analisado:", margin, yPosition);
  yPosition += 8;
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `${format(new Date(report.period_start), "dd/MM/yyyy", { locale: ptBR })} - ${format(new Date(report.period_end), "dd/MM/yyyy", { locale: ptBR })}`,
    margin,
    yPosition
  );

  // Scope
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text("Dados incluídos:", margin, yPosition);
  yPosition += 8;
  pdf.setFontSize(11);
  const scopeLabels = report.scope
    .map((s) => REPORT_SCOPES.find((scope) => scope.value === s)?.label || s)
    .join(" • ");
  pdf.text(scopeLabels, margin, yPosition);

  // Generation info
  yPosition += 30;
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Gerado em ${format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin,
    yPosition
  );
  if (report.profiles?.full_name) {
    yPosition += 6;
    pdf.text(`Por: ${report.profiles.full_name}`, margin, yPosition);
  }

  // Footer on cover page
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Gerado pelo BORA Hub • Relatórios com IA", margin, pageHeight - 15);

  // ======== CONTENT PAGES ========
  pdf.addPage();
  yPosition = margin;

  // Parse markdown content into sections
  const content = report.content_markdown || "";
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      yPosition += 4;
      continue;
    }

    // H1 (# Heading)
    if (trimmedLine.startsWith("# ")) {
      addPageIfNeeded(20);
      yPosition += 10;
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      const heading = trimmedLine.substring(2);
      pdf.text(heading, margin, yPosition);
      yPosition += 12;
      continue;
    }

    // H2 (## Heading)
    if (trimmedLine.startsWith("## ")) {
      addPageIfNeeded(16);
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(50, 50, 50);
      const heading = trimmedLine.substring(3);
      pdf.text(heading, margin, yPosition);
      yPosition += 10;
      continue;
    }

    // H3 (### Heading)
    if (trimmedLine.startsWith("### ")) {
      addPageIfNeeded(14);
      yPosition += 6;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(70, 70, 70);
      const heading = trimmedLine.substring(4);
      pdf.text(heading, margin, yPosition);
      yPosition += 8;
      continue;
    }

    // Horizontal rule
    if (trimmedLine === "---" || trimmedLine === "***") {
      addPageIfNeeded(10);
      yPosition += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith("> ")) {
      addPageIfNeeded(12);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      pdf.setFillColor(245, 245, 245);
      const quoteText = trimmedLine.substring(2);
      const quoteLines = pdf.splitTextToSize(quoteText, contentWidth - 10);
      const blockHeight = quoteLines.length * 5 + 4;
      pdf.rect(margin, yPosition - 4, contentWidth, blockHeight, "F");
      pdf.setDrawColor(212, 175, 55);
      pdf.line(margin, yPosition - 4, margin, yPosition - 4 + blockHeight);
      quoteLines.forEach((qLine: string) => {
        pdf.text(qLine, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 4;
      continue;
    }

    // List items
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ") || /^\d+\.\s/.test(trimmedLine)) {
      addPageIfNeeded(8);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const bulletText = trimmedLine.replace(/^[-*]\s|^\d+\.\s/, "");
      const bulletLines = pdf.splitTextToSize(`• ${bulletText}`, contentWidth - 5);
      bulletLines.forEach((bLine: string, idx: number) => {
        addPageIfNeeded(6);
        pdf.text(idx === 0 ? bLine : `  ${bLine}`, margin + 3, yPosition);
        yPosition += 5;
      });
      continue;
    }

    // Regular paragraph with inline formatting
    addPageIfNeeded(8);
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    // Parse and render text with bold formatting
    const renderFormattedLine = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      let xPos = margin;
      
      parts.forEach((part) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          // Bold text
          const boldText = part.slice(2, -2);
          pdf.setFont("helvetica", "bold");
          pdf.text(boldText, xPos, yPosition);
          xPos += pdf.getTextWidth(boldText);
        } else if (part) {
          // Normal text
          pdf.setFont("helvetica", "normal");
          pdf.text(part, xPos, yPosition);
          xPos += pdf.getTextWidth(part);
        }
      });
    };

    // Check if line fits in one row or needs splitting
    const cleanForMeasure = trimmedLine.replace(/\*\*/g, "");
    if (pdf.getTextWidth(cleanForMeasure) <= contentWidth) {
      renderFormattedLine(trimmedLine);
      yPosition += 5;
    } else {
      // Split into multiple lines, preserving bold
      const words = trimmedLine.split(" ");
      let currentLine = "";
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testClean = testLine.replace(/\*\*/g, "");
        
        if (pdf.getTextWidth(testClean) <= contentWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            addPageIfNeeded(6);
            renderFormattedLine(currentLine);
            yPosition += 5;
          }
          currentLine = word;
        }
      }
      
      if (currentLine) {
        addPageIfNeeded(6);
        renderFormattedLine(currentLine);
        yPosition += 5;
      }
    }
    yPosition += 2;
  }

  // Footer on all content pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Página ${i - 1} de ${pageCount - 1}`, margin, pageHeight - 10);
    pdf.text("BORA Hub • Relatórios com IA", pageWidth - margin - 50, pageHeight - 10);
  }

  // Save the PDF
  const filename = `${report.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(filename);
}
