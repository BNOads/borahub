import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/components/funnel-panel/types";

interface SellerPerformance {
  name: string;
  email: string;
  totalSales: number;
  totalRevenue: number;
  commissionReleased: number;
  commissionPending: number;
  commissionSuspended: number;
  paidInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  salesDetails: Array<{
    date: string;
    client: string;
    product: string;
    value: number;
    commission: number;
    status: string;
  }>;
}

interface CommissionDetail {
  sellerName: string;
  externalId: string;
  clientName: string;
  productName: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentValue: number;
  installmentStatus: string;
  commissionPercent: number;
  commissionValue: number;
  commissionStatus: string;
  competenceMonth: string;
}

interface PDFExportParams {
  sellerPerformance: SellerPerformance[];
  commissionsDetail: CommissionDetail[];
  totals: {
    totalSales: number;
    totalRevenue: number;
    commissionReleased: number;
    commissionPending: number;
    commissionSuspended: number;
  };
  revenueByStatus: { received: number; pending: number; overdue: number };
  dateRange: { start: string; end: string };
  platformFilter: string;
  sellerFilter: string;
  productFilter: string;
}

export function exportSalesReportPDF(params: PDFExportParams) {
  const { sellerPerformance, commissionsDetail, totals, revenueByStatus, dateRange, platformFilter, sellerFilter, productFilter } = params;

  const pdf = new jsPDF("p", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const m = 15; // margin
  const cw = pw - m * 2;
  let y = m;

  const checkPage = (need: number) => {
    if (y + need > ph - m) { pdf.addPage(); y = m; }
  };

  const drawLine = () => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(m, y, pw - m, y);
    y += 4;
  };

  // ===== COVER =====
  pdf.setFillColor(30, 30, 30);
  pdf.rect(0, 0, pw, 55, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Relatório de Vendas", m, 30);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("BORA Hub • Controle de Vendas", m, 42);

  y = 70;
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(11);
  pdf.text(`Período: ${format(parseISO(dateRange.start), "dd/MM/yyyy")} a ${format(parseISO(dateRange.end), "dd/MM/yyyy")}`, m, y);
  y += 7;
  if (platformFilter !== "all") { pdf.text(`Plataforma: ${platformFilter}`, m, y); y += 7; }
  if (productFilter !== "all") { pdf.text(`Produto: ${productFilter}`, m, y); y += 7; }
  if (sellerFilter !== "all") { pdf.text(`Vendedor filtrado`, m, y); y += 7; }
  pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, m, y);
  y += 15;

  // ===== KPI SUMMARY =====
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Resumo Geral", m, y);
  y += 8;

  const totalCommissions = totals.commissionReleased + totals.commissionPending + totals.commissionSuspended;

  const kpis = [
    ["Faturamento Bruto", formatCurrency(totals.totalRevenue)],
    ["Total de Vendas", String(totals.totalSales)],
    ["Recebido", formatCurrency(revenueByStatus.received)],
    ["Pendente", formatCurrency(revenueByStatus.pending)],
    ["Inadimplente", formatCurrency(revenueByStatus.overdue)],
    ["Total de Comissões", formatCurrency(totalCommissions)],
    ["Comissão Liberada", formatCurrency(totals.commissionReleased)],
    ["Comissão Pendente", formatCurrency(totals.commissionPending)],
    ["Comissão Suspensa", formatCurrency(totals.commissionSuspended)],
  ];

  pdf.setFontSize(9);
  kpis.forEach(([label, value]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, m, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(value, m + 50, y);
    y += 5.5;
  });
  y += 5;

  // ===== SELLER TABLE =====
  drawLine();
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("Desempenho por Vendedor", m, y);
  y += 8;

  // Table header
  const cols = [m, m + 45, m + 65, m + 95, m + 125, m + 155];
  const headers = ["Vendedor", "Vendas", "Faturamento", "Com. Liberada", "Com. Pendente", "Inadimp."];

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setFillColor(240, 240, 240);
  pdf.rect(m, y - 3.5, cw, 5, "F");
  headers.forEach((h, i) => pdf.text(h, cols[i], y));
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  sellerPerformance.forEach(s => {
    checkPage(6);
    pdf.text(s.name.substring(0, 22), cols[0], y);
    pdf.text(String(s.totalSales), cols[1], y);
    pdf.text(formatCurrency(s.totalRevenue), cols[2], y);
    pdf.text(formatCurrency(s.commissionReleased), cols[3], y);
    pdf.text(formatCurrency(s.commissionPending), cols[4], y);
    pdf.text(String(s.overdueInstallments), cols[5], y);
    y += 5;
  });
  y += 5;

  // ===== COMMISSIONS DETAIL =====
  checkPage(20);
  drawLine();
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("Detalhamento de Comissões", m, y);
  y += 8;

  const cCols = [m, m + 30, m + 60, m + 95, m + 115, m + 140, m + 160];
  const cHeaders = ["Vendedor", "Cliente", "Produto", "Parcela", "Valor", "Comissão", "Status"];

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setFillColor(240, 240, 240);
  pdf.rect(m, y - 3.5, cw, 5, "F");
  cHeaders.forEach((h, i) => pdf.text(h, cCols[i], y));
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);

  const statusLabels: Record<string, string> = {
    released: "Liberada",
    pending: "Pendente",
    suspended: "Suspensa",
  };

  commissionsDetail.slice(0, 200).forEach(c => {
    checkPage(5);
    pdf.text(c.sellerName.substring(0, 16), cCols[0], y);
    pdf.text(c.clientName.substring(0, 16), cCols[1], y);
    pdf.text(c.productName.substring(0, 18), cCols[2], y);
    pdf.text(`${c.installmentNumber}/${c.totalInstallments}`, cCols[3], y);
    pdf.text(formatCurrency(c.installmentValue), cCols[4], y);
    pdf.text(formatCurrency(c.commissionValue), cCols[5], y);
    pdf.text(statusLabels[c.commissionStatus] || c.commissionStatus, cCols[6], y);
    y += 4.5;
  });

  if (commissionsDetail.length > 200) {
    y += 3;
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`... e mais ${commissionsDetail.length - 200} registros (exportar Excel para completo)`, m, y);
  }

  // ===== FOOTER =====
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Página ${i} de ${pages}`, m, ph - 8);
    pdf.text("BORA Hub • Relatório de Vendas", pw - m - 55, ph - 8);
  }

  pdf.save(`relatorio-vendas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
