import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Send, User } from "lucide-react";
import { FunnelDiaryEntry } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelDiaryProps {
  funnelId: string;
}

export function FunnelDiary({ funnelId }: FunnelDiaryProps) {
  const [entries, setEntries] = useState<FunnelDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("funnel_diary")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching diary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [funnelId]);

  const handleSubmit = async () => {
    if (!newEntry.trim()) {
      toast.error("Digite algo para registrar");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("funnel_diary").insert({
        funnel_id: funnelId,
        content: newEntry.trim(),
        author_id: user?.id || null,
        author_name: user?.email?.split("@")[0] || "Usuário",
      });

      if (error) throw error;
      toast.success("Registro adicionado!");
      setNewEntry("");
      fetchEntries();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSubmitting(false);
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
        {/* Input */}
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
              disabled={submitting || !newEntry.trim()}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Enviando..." : "Registrar"}
            </Button>
          </div>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-t">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro no diário</p>
            <p className="text-xs mt-1">Comece documentando as ações do funil</p>
          </div>
        ) : (
          <div className="space-y-4 border-t pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Histórico ({entries.length} registros)
            </p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border bg-card/50"
                >
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
