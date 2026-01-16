import { ArrowRight, Newspaper, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useBoraNewsList } from "@/hooks/useBoraNews";

export function BoraNewsWidget() {
  const { data: news, isLoading } = useBoraNewsList(true);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 h-[200px] flex items-center justify-center">
        <span className="text-muted-foreground">Carregando Bora News...</span>
      </div>
    );
  }

  const unreadCount = news?.filter((n) => !n.lido).length ?? 0;
  const displayNews = news?.slice(0, 5) ?? [];

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 animate-slide-up"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Newspaper className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold">Bora News</h2>
          <Badge className="bg-accent text-accent-foreground">
            {news?.length ?? 0}
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} {unreadCount === 1 ? "novo" : "novos"}
            </Badge>
          )}
        </div>
        <Link to="/bora-news">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-accent"
          >
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {displayNews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma noticia disponivel no momento.
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
          {displayNews.map((item) => {
            const resumo =
              item.resumo ||
              (item.conteudo ? item.conteudo.substring(0, 140) +
                (item.conteudo.length > 140 ? "..." : "") : "");

            return (
              <Link
                key={item.id}
                to={`/bora-news/${item.id}`}
                className={`block p-4 rounded-lg border transition-all hover:shadow-sm ${
                  item.lido
                    ? "border-border hover:border-muted-foreground/50 bg-card"
                    : "border-accent/50 hover:border-accent bg-accent/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">📰</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!item.lido && (
                        <Circle className="h-2 w-2 fill-accent text-accent flex-shrink-0" />
                      )}
                      <h3
                        className={`font-medium truncate ${
                          item.lido ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {item.titulo}
                      </h3>
                      {item.destaque && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500 flex-shrink-0">
                          Destaque
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resumo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(item.data_publicacao).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
