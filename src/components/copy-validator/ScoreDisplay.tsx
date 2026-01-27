import { cn } from "@/lib/utils";
import { getScoreColor, getStatusColor, getStatusBgColor, ValidationResult } from "./types";
import { CheckCircle, AlertTriangle, AlertCircle, XCircle } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
  status: ValidationResult["status"];
}

const getStatusIcon = (status: ValidationResult["status"]) => {
  switch (status) {
    case "Aprovado":
      return CheckCircle;
    case "Ajustes Recomendados":
      return AlertTriangle;
    case "Necessita Revisão":
      return AlertCircle;
    case "Não Aprovado":
      return XCircle;
    default:
      return AlertCircle;
  }
};

export function ScoreDisplay({ score, status }: ScoreDisplayProps) {
  const Icon = getStatusIcon(status);
  const scoreColor = getScoreColor(score);
  const statusColor = getStatusColor(status);
  const statusBgColor = getStatusBgColor(status);

  // Calculate the stroke dasharray for the circular progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular Score */}
      <div className="relative w-44 h-44">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={cn("transition-all duration-1000 ease-out", scoreColor)}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-5xl font-black", scoreColor)}>{score}</span>
          <span className="text-sm text-muted-foreground font-medium">/100</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border",
        statusBgColor
      )}>
        <Icon className={cn("h-5 w-5", statusColor)} />
        <span className={cn("font-semibold", statusColor)}>{status}</span>
      </div>
    </div>
  );
}
