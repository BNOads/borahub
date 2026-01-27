import { ProblematicSection } from "./types";
import { XCircle, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface ProblemHighlightProps {
  problem: ProblematicSection;
}

export function ProblemHighlight({ problem }: ProblemHighlightProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(problem.sugestao_reescrita);
    setCopied(true);
    toast.success("Sugestão copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Original problematic text */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Trecho problemático</span>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm italic">"{problem.trecho_original}"</p>
          </div>
        </div>

        {/* Problem explanation */}
        <div className="flex items-start gap-2">
          <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Problema:</span> {problem.problema}
          </p>
        </div>

        {/* Suggested rewrite */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-500">✨ Sugestão de reescrita</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-sm italic">"{problem.sugestao_reescrita}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
