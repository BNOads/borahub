import { ValidationResult } from "./types";
import { ScoreDisplay } from "./ScoreDisplay";
import { DimensionCard } from "./DimensionCard";
import { ProblemHighlight } from "./ProblemHighlight";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, CheckCircle, Sparkles, Wand2, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ValidationResultsProps {
  result: ValidationResult;
  originalText: string;
  onReset: () => void;
  onNewCopy?: (newCopy: string) => void;
}

export function ValidationResults({ result, originalText, onReset, onNewCopy }: ValidationResultsProps) {
  const [showPositives, setShowPositives] = useState(false);
  const [showProblems, setShowProblems] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopyFeedback = async () => {
    const feedback = generateFeedbackText(result);
    await navigator.clipboard.writeText(feedback);
    toast.success("Feedback copiado para a área de transferência!");
  };

  const handleGenerateNewCopy = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-copy", {
        body: { 
          texto: originalText,
          problemas: result.trechos_problematicos,
          sugestoes: result.dimensoes.flatMap(d => d.sugestoes)
        },
      });

      if (error) {
        console.error("Rewrite error:", error);
        toast.error(error.message || "Erro ao gerar nova copy");
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.nova_copy && onNewCopy) {
        onNewCopy(data.nova_copy);
        toast.success("Nova copy gerada! Validando automaticamente...");
      }
    } catch (error) {
      console.error("Error generating new copy:", error);
      toast.error("Erro ao conectar com o serviço de IA");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Score */}
      <div className="flex flex-col lg:flex-row items-center gap-8 p-6 rounded-2xl bg-card border">
        <ScoreDisplay score={result.pontuacao_geral} status={result.status} />
        
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Resumo Executivo</h3>
            <p className="text-muted-foreground">{result.resumo_executivo}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCopyFeedback} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Feedback
            </Button>
            <Button 
              onClick={handleGenerateNewCopy} 
              variant="gold" 
              className="gap-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando nova copy...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar Copy Corrigida
                </>
              )}
            </Button>
            <Button onClick={onReset} variant="ghost" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Nova Validação
            </Button>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Avaliação por Dimensão</h3>
        <div className="grid gap-3">
          {result.dimensoes.map((dimension, i) => (
            <DimensionCard key={i} dimension={dimension} />
          ))}
        </div>
      </div>

      {/* Problematic Sections - Visible by default */}
      {result.trechos_problematicos.length > 0 && (
        <Collapsible open={showProblems} onOpenChange={setShowProblems}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-lg font-semibold hover:text-accent transition-colors w-full text-left">
              <span className="text-destructive">⚠️</span>
              Trechos que Precisam de Ajuste ({result.trechos_problematicos.length})
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showProblems && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="space-y-4">
              {result.trechos_problematicos.map((problem, i) => (
                <ProblemHighlight key={i} problem={problem} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Positive Highlights - Collapsed by default */}
      {result.destaques_positivos.length > 0 && (
        <Collapsible open={showPositives} onOpenChange={setShowPositives}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-lg font-semibold hover:text-accent transition-colors w-full text-left">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Pontos Positivos ({result.destaques_positivos.length})
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showPositives && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="space-y-2">
              {result.destaques_positivos.map((destaque, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm">{destaque}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function generateFeedbackText(result: ValidationResult): string {
  let text = `📊 VALIDAÇÃO DE COPY BORAnaOBRA\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `📈 Pontuação: ${result.pontuacao_geral}/100 - ${result.status}\n\n`;
  text += `📝 Resumo: ${result.resumo_executivo}\n\n`;
  
  text += `📊 DIMENSÕES:\n`;
  result.dimensoes.forEach(d => {
    const icon = d.status === "Ótimo" ? "✅" : d.status === "Atenção" ? "⚠️" : d.status === "Crítico" ? "❌" : "➖";
    text += `${icon} ${d.nome}: ${d.status === "N/A" ? "N/A" : `${d.pontuacao}/100`}\n`;
  });
  
  if (result.destaques_positivos.length > 0) {
    text += `\n✨ DESTAQUES POSITIVOS:\n`;
    result.destaques_positivos.forEach(d => {
      text += `• ${d}\n`;
    });
  }
  
  if (result.trechos_problematicos.length > 0) {
    text += `\n⚠️ TRECHOS A REVISAR:\n`;
    result.trechos_problematicos.forEach(p => {
      text += `\n❌ "${p.trecho_original}"\n`;
      text += `   Problema: ${p.problema}\n`;
      text += `   💡 Sugestão: "${p.sugestao_reescrita}"\n`;
    });
  }
  
  return text;
}
