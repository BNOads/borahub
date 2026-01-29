import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotePanelProps {
  content: string;
  onSave: (content: string) => void;
  isSaving: boolean;
}

export function NotePanel({ content, onSave, isSaving }: NotePanelProps) {
  const [localContent, setLocalContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with external content when it changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Debounced save
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      onSave(localContent);
      setHasChanges(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [localContent, hasChanges, onSave]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    setHasChanges(true);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Bloco de Notas</h3>
        <div className="flex items-center gap-1.5 text-xs">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Salvando...</span>
            </>
          ) : hasChanges ? (
            <span className="text-muted-foreground">Digitando...</span>
          ) : (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Salvo</span>
            </>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 py-3">
        <Textarea
          value={localContent}
          onChange={handleChange}
          placeholder="Escreva suas anotações rápidas aqui..."
          className={cn(
            "min-h-[200px] h-full resize-none border-0 p-0",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "bg-transparent text-sm leading-relaxed"
          )}
        />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {localContent.length} caracteres
        </p>
      </div>
    </div>
  );
}
