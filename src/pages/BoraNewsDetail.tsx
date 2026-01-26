import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, Check, EyeOff, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useBoraNewsDetail,
  useMarkAsRead,
  useToggleRead,
} from "@/hooks/useBoraNews";

export default function BoraNewsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: news, isLoading, error } = useBoraNewsDetail(id || "");
  const markAsRead = useMarkAsRead();
  const toggleRead = useToggleRead();

  useEffect(() => {
    if (news && id) {
      markAsRead.mutate(id);
    }
  }, [news, id]);

  const handleToggleRead = async (lido: boolean) => {
    if (!id) return;
    try {
      await toggleRead.mutateAsync({ boraNewsId: id, lido });
      toast.success(lido ? "Marcado como lido" : "Marcado como nao lido");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-muted-foreground">Noticia nao encontrada</span>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <article className="bg-card border border-border rounded-xl p-6 md:p-8">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📰</span>
            {news.destaque && (
              <Badge
                variant="outline"
                className="border-yellow-500 text-yellow-500"
              >
                <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                Destaque
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{news.titulo}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(news.data_publicacao).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{news.autor_nome}</span>
            </div>
          </div>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {news.conteudo}
          </div>
        </div>

        <footer className="pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Voce visualizou esta noticia
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleRead(true)}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar como lido
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleRead(false)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Marcar como nao lido
              </Button>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
