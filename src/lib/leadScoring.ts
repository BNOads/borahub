import type { StrategicLead } from "@/hooks/useStrategicSession";

interface ScoreBreakdown {
  faturamento: number;
  lucro: number;
  empreita: number;
}

export interface LeadScore {
  score: number;
  isQualified: boolean;
  breakdown: ScoreBreakdown;
  faturamentoQualifies: boolean;
  lucroQualifies: boolean;
}

// Maps text ranges to { points, qualifies }
function scoreFaturamento(text: string): { points: number; qualifies: boolean } {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return { points: 0, qualifies: false };

  // Check from highest to lowest
  if (t.includes("100.000") || t.includes("100000") || t.includes("acima de r$100") || t.includes("acima de 100")) return { points: 60, qualifies: true };
  if (t.includes("50.000") || t.includes("50000")) return { points: 45, qualifies: true };
  if (t.includes("30.000") || t.includes("30000")) return { points: 35, qualifies: true };
  if (t.includes("15.000") || t.includes("15000")) return { points: 25, qualifies: true };
  if (t.includes("10.000") || t.includes("10000")) return { points: 15, qualifies: false };
  if (t.includes("5.000") || t.includes("5000")) {
    // Distinguish "R$3k-R$5k" from "R$5k-R$10k"
    if (t.includes("3.000") || t.includes("3000")) return { points: 5, qualifies: false };
    return { points: 10, qualifies: false };
  }
  if (t.includes("3.000") || t.includes("3000")) return { points: 5, qualifies: false };
  if (t.includes("até") || t.includes("menos") || t.includes("abaixo")) return { points: 0, qualifies: false };
  return { points: 0, qualifies: false };
}

function scoreLucro(text: string): { points: number; qualifies: boolean } {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return { points: 0, qualifies: false };

  if (t.includes("100.000") || t.includes("100000") || t.includes("acima de r$100") || t.includes("acima de 100")) return { points: 60, qualifies: true };
  if (t.includes("50.000") || t.includes("50000")) return { points: 45, qualifies: true };
  if (t.includes("30.000") || t.includes("30000")) return { points: 35, qualifies: true };
  if (t.includes("15.000") || t.includes("15000")) return { points: 25, qualifies: true };
  if (t.includes("10.000") || t.includes("10000")) return { points: 20, qualifies: true };
  if (t.includes("5.000") || t.includes("5000")) {
    if (t.includes("3.000") || t.includes("3000")) return { points: 5, qualifies: false };
    return { points: 10, qualifies: false };
  }
  if (t.includes("3.000") || t.includes("3000")) return { points: 5, qualifies: false };
  if (t.includes("até") || t.includes("menos") || t.includes("abaixo")) return { points: 0, qualifies: false };
  return { points: 0, qualifies: false };
}

function scoreEmpreita(text: string): number {
  const t = (text || "").toLowerCase().trim();
  if (t === "não" || t === "nao") return 10;
  return 0;
}

export function computeLeadScore(lead: StrategicLead): LeadScore {
  const extra = (lead.extra_data || {}) as Record<string, string>;
  
  const fat = scoreFaturamento(extra.faturamento || extra.Faturamento || "");
  const luc = scoreLucro(extra.lucro || extra.Lucro || "");
  const emp = scoreEmpreita(extra.empreita || extra.Empreita || "");

  const score = fat.points + luc.points + emp;
  const isQualified = fat.qualifies && luc.qualifies;

  return {
    score,
    isQualified,
    breakdown: { faturamento: fat.points, lucro: luc.points, empreita: emp },
    faturamentoQualifies: fat.qualifies,
    lucroQualifies: luc.qualifies,
  };
}
