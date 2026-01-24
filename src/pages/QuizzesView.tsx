import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Plus, 
  MoreVertical, 
  Eye, 
  Play, 
  CheckCircle2, 
  Users,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Pause,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuizzes, useCreateQuiz, useDeleteQuiz, useUpdateQuiz, Quiz } from "@/hooks/useQuizzes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizzesView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: quizzes, isLoading } = useQuizzes();
  const createQuiz = useCreateQuiz();
  const deleteQuiz = useDeleteQuiz();
  const updateQuiz = useUpdateQuiz();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizDescription, setNewQuizDescription] = useState("");

  const handleCreateQuiz = async () => {
    if (!newQuizTitle.trim()) {
      toast({ title: "Digite um título para o quiz", variant: "destructive" });
      return;
    }

    const quiz = await createQuiz.mutateAsync({
      title: newQuizTitle,
      description: newQuizDescription || undefined,
    });

    setShowCreateModal(false);
    setNewQuizTitle("");
    setNewQuizDescription("");
    navigate(`/quizzes/${quiz.id}/edit`);
  };

  const handleToggleStatus = async (quiz: Quiz) => {
    const newStatus = quiz.status === "published" ? "paused" : "published";
    await updateQuiz.mutateAsync({ id: quiz.id, status: newStatus });
  };

  const handleCopyLink = (quiz: Quiz) => {
    const url = `${window.location.origin}/q/${quiz.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Publicado</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pausado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  const getConversionRate = (quiz: Quiz) => {
    if (!quiz.starts_count) return 0;
    return Math.round((quiz.completions_count / quiz.starts_count) * 100);
  };

  const getOptInRate = (quiz: Quiz) => {
    if (!quiz.completions_count) return 0;
    return Math.round((quiz.leads_count / quiz.completions_count) * 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quizzes Interativos</h1>
          <p className="text-muted-foreground mt-1">
            Crie diagnósticos e capture leads qualificados
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Quiz
        </Button>
      </div>

      {/* Stats Cards */}
      {quizzes && quizzes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {quizzes.reduce((acc, q) => acc + q.views_count, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Visualizações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Play className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {quizzes.reduce((acc, q) => acc + q.starts_count, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Iniciados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {quizzes.reduce((acc, q) => acc + q.completions_count, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Users className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {quizzes.reduce((acc, q) => acc + q.leads_count, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quiz List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${quiz.primary_color}20` }}
                    >
                      <FileText className="h-6 w-6" style={{ color: quiz.primary_color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{quiz.title}</h3>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Metrics */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{quiz.views_count.toLocaleString()}</p>
                        <p className="text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{quiz.starts_count.toLocaleString()}</p>
                        <p className="text-muted-foreground">Inícios</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{getConversionRate(quiz)}%</p>
                        <p className="text-muted-foreground">Conclusão</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{quiz.leads_count.toLocaleString()}</p>
                        <p className="text-muted-foreground">Leads</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/quizzes/${quiz.id}/analytics`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Analytics
                        </DropdownMenuItem>
                        {quiz.status === "published" && (
                          <DropdownMenuItem onClick={() => window.open(`/q/${quiz.slug}`, "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Quiz
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleCopyLink(quiz)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(quiz)}>
                          {quiz.status === "published" ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Publicar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setQuizToDelete(quiz)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum quiz criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro quiz interativo para captar leads qualificados
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Quiz</DialogTitle>
            <DialogDescription>
              Dê um nome para seu quiz interativo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Quiz</Label>
              <Input
                id="title"
                placeholder="Ex: Diagnóstico de Maturidade Digital"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo do quiz..."
                value={newQuizDescription}
                onChange={(e) => setNewQuizDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateQuiz} disabled={createQuiz.isPending}>
              {createQuiz.isPending ? "Criando..." : "Criar Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!quizToDelete} onOpenChange={() => setQuizToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{quizToDelete?.title}"? 
              Esta ação não pode ser desfeita e todos os dados de respostas serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (quizToDelete) {
                  deleteQuiz.mutate(quizToDelete.id);
                  setQuizToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
