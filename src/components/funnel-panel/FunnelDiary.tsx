import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Send, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFunnelDiary, useCreateDiaryEntry } from "@/hooks/useFunnelExtras";
import { useAuth } from "@/contexts/AuthContext";

interface FunnelDiaryProps {
  funnelId: string;
}

export function FunnelDiary({ funnelId }: FunnelDiaryProps) {
  const { profile } = useAuth();
  const { data: entries = [], isLoading } = useFunnelDiary(funnelId);
  const createEntry = useCreateDiaryEntry();

  const [newEntry, setNewEntry] = useState("");

  const handleSubmit = async () => {
    if (!newEntry.trim()) {
      toast.error("Digite algo para registrar");
      return;
    }

    try {
      await createEntry.mutateAsync({
        funnel_id: funnelId,
        content: newEntry.trim(),
        author_name: profile?.full_name || "Usuário",
        author_id: profile?.id || null,
      });
      toast.success("Registro adicionado!");
      setNewEntry("");
    } catch {
      toast.error("Erro ao adicionar registro");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          Deu Bom & Deu Mole
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-6">
          <Textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Registre otimizações, testes, ajustes ou decisões estratégicas..."
            className="min-h-[100px] resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={createEntry.isPending || !newEntry.trim()} 
              size="sm" 
              className="gap-2"
            >
              {createEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {createEntry.isPending ? "Enviando..." : "Registrar"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 border-t">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-t">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro no diário</p>
          </div>
        ) : (
          <div className="space-y-4 border-t pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Histórico ({entries.length} registros)
            </p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 rounded-lg border bg-card/50">
                  <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{entry.author_name}</span>
                    <span>•</span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
