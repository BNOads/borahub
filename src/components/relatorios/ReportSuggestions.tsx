import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AISuggestion } from "@/hooks/useReports";

interface ReportSuggestionsProps {
  suggestions: AISuggestion[];
  onGenerate: (suggestion: { title: string; scope: string[] }) => void;
}

export function ReportSuggestions({ suggestions, onGenerate }: ReportSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Outros relatórios que podem ser gerados</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Com base nos dados disponíveis, a IA sugere esses relatórios adicionais:
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="group p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
              {suggestion.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {suggestion.description}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() =>
                onGenerate({
                  title: suggestion.title,
                  scope: suggestion.suggested_scope,
                })
              }
            >
              Gerar agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
