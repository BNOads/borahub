export interface ValidationDimension {
  nome: string;
  pontuacao: number;
  peso: number;
  status: "Ótimo" | "Atenção" | "Crítico" | "N/A";
  problemas: string[];
  sugestoes: string[];
  exemplo_bora?: string;
}

export interface ProblematicSection {
  trecho_original: string;
  problema: string;
  sugestao_reescrita: string;
}

export interface ValidationResult {
  pontuacao_geral: number;
  status: "Aprovado" | "Ajustes Recomendados" | "Necessita Revisão" | "Não Aprovado";
  dimensoes: ValidationDimension[];
  destaques_positivos: string[];
  trechos_problematicos: ProblematicSection[];
  resumo_executivo: string;
}

export const getStatusColor = (status: ValidationResult["status"]) => {
  switch (status) {
    case "Aprovado":
      return "text-emerald-500";
    case "Ajustes Recomendados":
      return "text-yellow-500";
    case "Necessita Revisão":
      return "text-orange-500";
    case "Não Aprovado":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

export const getStatusBgColor = (status: ValidationResult["status"]) => {
  switch (status) {
    case "Aprovado":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "Ajustes Recomendados":
      return "bg-yellow-500/10 border-yellow-500/20";
    case "Necessita Revisão":
      return "bg-orange-500/10 border-orange-500/20";
    case "Não Aprovado":
      return "bg-destructive/10 border-destructive/20";
    default:
      return "bg-muted";
  }
};

export const getDimensionStatusColor = (status: ValidationDimension["status"]) => {
  switch (status) {
    case "Ótimo":
      return "text-emerald-500";
    case "Atenção":
      return "text-yellow-500";
    case "Crítico":
      return "text-destructive";
    case "N/A":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
};

export const getScoreColor = (score: number) => {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-yellow-500";
  if (score >= 60) return "text-orange-500";
  return "text-destructive";
};

export const getProgressColor = (score: number) => {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-yellow-500";
  if (score >= 60) return "bg-orange-500";
  return "bg-destructive";
};
