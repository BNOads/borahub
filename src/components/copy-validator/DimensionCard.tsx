import { cn } from "@/lib/utils";
import { ValidationDimension, getDimensionStatusColor, getProgressColor } from "./types";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { useState } from "react";

interface DimensionCardProps {
  dimension: ValidationDimension;
}

const getStatusIcon = (status: ValidationDimension["status"]) => {
  switch (status) {
    case "Ótimo":
      return CheckCircle;
    case "Atenção":
      return AlertTriangle;
    case "Crítico":
      return XCircle;
    case "N/A":
      return MinusCircle;
    default:
      return MinusCircle;
  }
};

export function DimensionCard({ dimension }: DimensionCardProps) {
  const [isOpen, setIsOpen] = useState(dimension.status === "Crítico" || dimension.status === "Atenção");
  const Icon = getStatusIcon(dimension.status);
  const statusColor = getDimensionStatusColor(dimension.status);
  const progressColor = getProgressColor(dimension.pontuacao);
  
  // Only show details if there are problems, or suggestions when score is not good (< 80)
  const showSuggestions = dimension.pontuacao < 80 && dimension.sugestoes.length > 0;
  const hasDetails = dimension.problemas.length > 0 || showSuggestions;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border bg-card overflow-hidden">
        <CollapsibleTrigger asChild disabled={!hasDetails}>
          <button 
            className={cn(
              "w-full p-4 text-left transition-colors",
              hasDetails && "hover:bg-muted/50 cursor-pointer"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", statusColor)} />
                <span className="font-semibold">{dimension.nome}</span>
                <span className="text-xs text-muted-foreground">({dimension.peso}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold text-lg", statusColor)}>
                  {dimension.status === "N/A" ? "N/A" : `${dimension.pontuacao}`}
                </span>
                {hasDetails && (
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )} />
                )}
              </div>
            </div>
            
            {dimension.status !== "N/A" && (
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500 rounded-full", progressColor)}
                  style={{ width: `${dimension.pontuacao}%` }}
                />
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {dimension.problemas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Problemas identificados
                </h4>
                <ul className="space-y-1">
                  {dimension.problemas.map((problema, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-destructive">
                      {problema}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showSuggestions && (
              <div>
                <h4 className="text-sm font-semibold text-emerald-500 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sugestões de melhoria
                </h4>
                <ul className="space-y-1">
                  {dimension.sugestoes.map((sugestao, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-emerald-500">
                      {sugestao}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
