import { ValidationResult } from "./types";
import { ScoreDisplay } from "./ScoreDisplay";
import { DimensionCard } from "./DimensionCard";
import { ProblemHighlight } from "./ProblemHighlight";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Sparkles, Wand2, Loader2, ChevronDown, ArrowRight, Target, AlertTriangle, Pencil } from "lucide-react";
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
  const [showAlerts, setShowAlerts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(originalText);
    toast.success("Copy copiada para a área de transferência!");
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

  const hasAlerts = result.sinais_alerta && result.sinais_alerta.length > 0;
  const hasExampleRewrite = result.exemplo_reescrito?.original && result.exemplo_reescrito?.reescrito;

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
            <Button onClick={handleCopyText} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Copy
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
              <ArrowRight className="h-4 w-4" />
              Nova Validação
            </Button>
          </div>
        </div>
      </div>

      {/* Priority Adjustment Card */}
      {result.ajuste_prioritario && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/20 rounded-lg shrink-0">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-accent mb-1">🎯 Ajuste Prioritário</h3>
              <p className="text-sm text-foreground">{result.ajuste_prioritario}</p>
            </div>
          </div>
        </div>
      )}

      {/* Example Rewrite Card */}
      {hasExampleRewrite && (
        <div className="p-5 rounded-xl bg-muted/50 border">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">✏️ Exemplo de Correção</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-medium text-destructive mb-2 uppercase tracking-wide">Original</p>
              <p className="text-sm italic">"{result.exemplo_reescrito!.original}"</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs font-medium text-emerald-600 mb-2 uppercase tracking-wide">Tom BORAnaOBRA</p>
              <p className="text-sm">"{result.exemplo_reescrito!.reescrito}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Signs */}
      {hasAlerts && (
        <Collapsible open={showAlerts} onOpenChange={setShowAlerts}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-lg font-semibold hover:text-accent transition-colors w-full text-left">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Sinais de Alerta ({result.sinais_alerta!.length})
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showAlerts && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <p className="text-sm text-muted-foreground mb-3">
                Estes sinais indicam que o texto NÃO está no padrão BORAnaOBRA:
              </p>
              <div className="space-y-2">
                {result.sinais_alerta!.map((alerta, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-sm">{alerta}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

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
