import jsPDF from "jspdf";
import type { TranscriptSegment } from "@/hooks/useTranscriptions";

/**
 * Formata segundos para formato HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formata duração em segundos para texto legível
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Gera texto formatado da transcrição
 */
export function generateTranscriptTXT(
  segments: TranscriptSegment[],
  title?: string
): string {
  let content = "";

  if (title) {
    content += `TRANSCRIÇÃO: ${title}\n`;
    content += "=".repeat(50) + "\n\n";
  }

  for (const segment of segments) {
    const startTime = formatTimestamp(segment.start);
    const endTime = formatTimestamp(segment.end);
    content += `${segment.speaker} [${startTime} - ${endTime}]\n`;
    content += `${segment.text}\n\n`;
  }

  return content;
}

/**
 * Gera PDF da transcrição com timestamps
 */
export function generateTranscriptPDF(
  segments: TranscriptSegment[],
  title?: string,
  includeTimestamps: boolean = true
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Título
  if (title) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 15;
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Segmentos
  for (const segment of segments) {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 20;
    }

    // Speaker header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text(`${segment.speaker}`, margin, y);
    
    if (includeTimestamps) {
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text(`[${startTime} - ${endTime}]`, margin + 40, y);
    }
    y += 6;

    // Text content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const lines = doc.splitTextToSize(segment.text, maxWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    }

    y += 8;
  }

  return doc;
}

/**
 * Download do conteúdo como arquivo
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copia texto para a área de transferência
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
}

/**
 * Cores para diferentes speakers
 */
export const speakerColors = [
  "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
  "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
  "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400",
  "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
];

/**
 * Retorna a cor para um speaker específico
 */
export function getSpeakerColor(speaker: string, speakerList: string[]): string {
  const index = speakerList.indexOf(speaker);
  return speakerColors[index % speakerColors.length];
}

/**
 * Extrai lista única de speakers
 */
export function getUniqueSpeakers(segments: TranscriptSegment[]): string[] {
  const speakers = new Set<string>();
  for (const segment of segments) {
    speakers.add(segment.speaker);
  }
  return Array.from(speakers);
}
