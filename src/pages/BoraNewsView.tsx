import { useState } from "react";
import {
  Newspaper,
  Circle,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useBoraNewsList,
  useToggleRead,
  useDeleteBoraNews,
  useUpdateBoraNews,
  BoraNewsWithLeitura,
} from "@/hooks/useBoraNews";
import { CreateBoraNewsModal } from "@/components/bora-news/CreateBoraNewsModal";
import { useAuth } from "@/contexts/AuthContext";

export default function BoraNewsView() {
  const [activeTab, setActiveTab] = useState("todas");
  const [editingNews, setEditingNews] = useState<BoraNewsWithLeitura | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  const { data: allNews, isLoading } = useBoraNewsList(!isAdmin);
  const toggleRead = useToggleRead();
  const deleteNews = useDeleteBoraNews();
  const updateNews = useUpdateBoraNews();

  const handleToggleRead = async (item: BoraNewsWithLeitura) => {
    try {
      await toggleRead.mutateAsync({ boraNewsId: item.id, lido: !item.lido });
      toast.success(item.lido ? "Marcado como nao lido" : "Marcado como lido");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNews.mutateAsync(id);
      toast.success("Noticia excluida com sucesso");
    } catch {
      toast.error("Erro ao excluir noticia");
    }
  };

  const handleTogglePublish = async (item: BoraNewsWithLeitura) => {
    const newStatus =
      item.status_publicacao === "publicado" ? "rascunho" : "publicado";
    try {
      await updateNews.mutateAsync({ id: item.id, status_publicacao: newStatus });
      toast.success(
        newStatus === "publicado" ? "Noticia publicada" : "Noticia despublicada"
      );
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleToggleDestaque = async (item: BoraNewsWithLeitura) => {
    try {
      await updateNews.mutateAsync({ id: item.id, destaque: !item.destaque });
      toast.success(item.destaque ? "Destaque removido" : "Destaque adicionado");
    } catch {
      toast.error("Erro ao atualizar destaque");
    }
  };

  const filteredNews = allNews?.filter((item) => {
    if (activeTab === "nao_lidas") return !item.lido;
    if (activeTab === "lidas") return item.lido;
    if (activeTab === "destaques") return item.destaque;
    return true;
  });

  const unreadCount = allNews?.filter((n) => !n.lido).length ?? 0;
  const readCount = allNews?.filter((n) => n.lido).length ?? 0;
  const highlightCount = allNews?.filter((n) => n.destaque).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <Newspaper className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bora News</h1>
            <p className="text-muted-foreground">
              Central de avisos e noticias internas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <CreateBoraNewsModal />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allNews?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nao Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{readCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Destaques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {highlightCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todas">
            Todas ({allNews?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="nao_lidas">
            Nao Lidas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="lidas">Lidas ({readCount})</TabsTrigger>
          <TabsTrigger value="destaques">
            Destaques ({highlightCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredNews?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma noticia encontrada nesta categoria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews?.map((item) => {
                const resumo =
                  item.resumo ||
                  item.conteudo.substring(0, 180) +
                    (item.conteudo.length > 180 ? "..." : "");

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border transition-all ${
                      item.lido
                        ? "border-border bg-card"
                        : "border-accent/50 bg-accent/5"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl flex-shrink-0">📰</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {!item.lido && (
                            <Circle className="h-2 w-2 fill-accent text-accent flex-shrink-0" />
                          )}
                          <Link
                            to={`/bora-news/${item.id}`}
                            className="hover:text-accent transition-colors"
                          >
                            <h3
                              className={`font-semibold text-lg ${
                                item.lido
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {item.titulo}
                            </h3>
                          </Link>
                          {item.destaque && (
                            <Badge
                              variant="outline"
                              className="border-yellow-500 text-yellow-500"
                            >
                              Destaque
                            </Badge>
                          )}
                          {isAdmin && item.status_publicacao === "rascunho" && (
                            <Badge variant="secondary">Rascunho</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{resumo}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {new Date(item.data_publicacao).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span>Por {item.autor_nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleRead(item)}
                              title={
                                item.lido
                                  ? "Marcar como nao lido"
                                  : "Marcar como lido"
                              }
                            >
                              {item.lido ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNews(item);
                                    setIsEditModalOpen(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleDestaque(item)}
                                  title={
                                    item.destaque
                                      ? "Remover destaque"
                                      : "Destacar"
                                  }
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      item.destaque
                                        ? "fill-yellow-500 text-yellow-500"
                                        : ""
                                    }`}
                                  />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTogglePublish(item)}
                                  title={
                                    item.status_publicacao === "publicado"
                                      ? "Despublicar"
                                      : "Publicar"
                                  }
                                >
                                  {item.status_publicacao === "publicado" ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Excluir noticia?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acao nao pode ser desfeita. A noticia
                                        sera permanentemente removida.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(item.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            <Link to={`/bora-news/${item.id}`}>
                              <Button variant="outline" size="sm">
                                Ler mais
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <CreateBoraNewsModal
        editData={editingNews}
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) setEditingNews(null);
        }}
      />
    </div>
  );
}
