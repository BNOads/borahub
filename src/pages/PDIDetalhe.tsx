import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Target,
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Edit,
  Trash2,
  ExternalLink,
  Play,
  Check,
  MoreVertical,
  Key,
  Plus,
  X,
  Search,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePDI, calcularProgresso, useFinalizePDI, useDeletePDI, useMarkAulaConcluida, useUpdatePDI, useLessonsForPDI } from "@/hooks/usePDIs";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PDIDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addAulaModalOpen, setAddAulaModalOpen] = useState(false);
  const [addAcessoModalOpen, setAddAcessoModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ titulo: "", descricao: "", data_limite: "" });
  const [externalAula, setExternalAula] = useState({ titulo: "", link: "", duracao: "" });
  const [newAcesso, setNewAcesso] = useState({ nome: "", categoria: "outros", link: "" });
  const [lessonSearch, setLessonSearch] = useState("");
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [acessoSearch, setAcessoSearch] = useState("");
  const [showAcessoExistente, setShowAcessoExistente] = useState(true);

  const { data: pdi, isLoading, refetch } = usePDI(id || "");
  const finalizePDI = useFinalizePDI();
  const deletePDI = useDeletePDI();
  const markAulaConcluida = useMarkAulaConcluida();
  const updatePDI = useUpdatePDI();
  const { data: lessonsData = [] } = useLessonsForPDI(lessonSearch);

  // Buscar acessos existentes (senhas úteis)
  const { data: acessosExistentes = [] } = useQuery({
    queryKey: ["acessos-logins", acessoSearch],
    queryFn: async () => {
      let query = supabase
        .from("acessos_logins")
        .select("id, nome_acesso, categoria, link_acesso")
        .eq("ativo", true)
        .order("nome_acesso");

      if (acessoSearch) {
        query = query.ilike("nome_acesso", `%${acessoSearch}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: addAcessoModalOpen && showAcessoExistente,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!pdi) {
    return (
      <div className="text-center py-16">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">PDI não encontrado</h2>
        <Button variant="link" onClick={() => navigate("/pdis")}>
          Voltar
        </Button>
      </div>
    );
  }

  const progresso = calcularProgresso(pdi.aulas || []);
  const aulasConcluidas = pdi.aulas?.filter((a) => a.status === "concluida").length || 0;
  const totalAulas = pdi.aulas?.length || 0;
  const dataLimite = new Date(pdi.data_limite);
  const hoje = new Date();
  const diasRestantes = differenceInDays(dataLimite, hoje);
  const estaAtrasado = pdi.status === "atrasado";
  const estaFinalizado = pdi.status === "finalizado";
  const isOwner = user?.id === pdi.colaborador_id;
  const canEdit = isAdmin;
  const canMarkComplete = isOwner || isAdmin;

  const getStatusConfig = () => {
    if (estaFinalizado) {
      return {
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
        label: "Finalizado",
      };
    }
    if (estaAtrasado) {
      return {
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        icon: AlertTriangle,
        label: `Atrasado há ${Math.abs(diasRestantes)} dias`,
      };
    }
    return {
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      icon: Clock,
      label: diasRestantes === 0 ? "Vence hoje" : `${diasRestantes} dias restantes`,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const handleFinalize = async () => {
    await finalizePDI.mutateAsync(pdi.id);
    setFinalizeDialogOpen(false);
  };

  const handleDelete = async () => {
    await deletePDI.mutateAsync(pdi.id);
    navigate("/pdis");
  };

  const handleMarkAula = async (aulaId: string) => {
    await markAulaConcluida.mutateAsync({ aulaId, pdiId: pdi.id });
  };

  const handleOpenEditModal = () => {
    setEditForm({
      titulo: pdi.titulo,
      descricao: pdi.descricao || "",
      data_limite: pdi.data_limite,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updatePDI.mutateAsync({
        id: pdi.id,
        titulo: editForm.titulo,
        descricao: editForm.descricao || null,
        data_limite: editForm.data_limite,
      });
      toast.success("PDI atualizado com sucesso!");
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar PDI");
    }
  };

  const handleAddExternalAula = async () => {
    if (!externalAula.titulo.trim()) {
      toast.error("Informe o título da aula");
      return;
    }

    let linkFinal = externalAula.link.trim();
    if (linkFinal && !linkFinal.startsWith("http://") && !linkFinal.startsWith("https://")) {
      linkFinal = "https://" + linkFinal;
    }

    try {
      const { error } = await supabase.from("pdi_aulas").insert({
        pdi_id: pdi.id,
        titulo: externalAula.titulo.trim(),
        origem: "externa",
        curso_origem: "Conteúdo Externo",
        lesson_id: null,
        link_externo: linkFinal || null,
        duracao_minutos: externalAula.duracao ? parseInt(externalAula.duracao) : null,
        ordem: (pdi.aulas?.length || 0),
        status: "nao_iniciada",
      });

      if (error) throw error;

      toast.success("Aula externa adicionada!");
      setExternalAula({ titulo: "", link: "", duracao: "" });
      setAddAulaModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar aula:", error);
      toast.error("Erro ao adicionar aula");
    }
  };

  const handleAddInternalAula = async (lesson: any) => {
    try {
      const courseTitle = (lesson.course as any)?.title || "Curso Interno";
      const { error } = await supabase.from("pdi_aulas").insert({
        pdi_id: pdi.id,
        titulo: lesson.title,
        origem: "interna",
        curso_origem: courseTitle,
        lesson_id: lesson.id,
        link_externo: null,
        duracao_minutos: lesson.duration || null,
        ordem: (pdi.aulas?.length || 0),
        status: "nao_iniciada",
      });

      if (error) throw error;

      toast.success("Aula interna adicionada!");
      setShowLessonPicker(false);
      setLessonSearch("");
      setAddAulaModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar aula:", error);
      toast.error("Erro ao adicionar aula");
    }
  };

  const handleDeleteAula = async (aulaId: string) => {
    try {
      const { error } = await supabase.from("pdi_aulas").delete().eq("id", aulaId);
      if (error) throw error;
      toast.success("Aula removida!");
      refetch();
    } catch (error) {
      console.error("Erro ao remover aula:", error);
      toast.error("Erro ao remover aula");
    }
  };

  const handleAddAcesso = async () => {
    if (!newAcesso.nome.trim()) {
      toast.error("Informe o nome do acesso");
      return;
    }

    let linkFinal = newAcesso.link.trim();
    if (linkFinal && !linkFinal.startsWith("http://") && !linkFinal.startsWith("https://")) {
      linkFinal = "https://" + linkFinal;
    }

    try {
      const { error } = await supabase.from("pdi_acessos").insert({
        pdi_id: pdi.id,
        nome: newAcesso.nome.trim(),
        categoria: newAcesso.categoria || "outros",
        link: linkFinal || null,
      });

      if (error) throw error;

      toast.success("Acesso adicionado!");
      setNewAcesso({ nome: "", categoria: "outros", link: "" });
      setAddAcessoModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar acesso:", error);
      toast.error("Erro ao adicionar acesso");
    }
  };

  const handleAddAcessoExistente = async (acesso: any) => {
    // Verificar se já existe no PDI
    const jaExiste = pdi.acessos?.some(a => a.nome === acesso.nome_acesso);
    if (jaExiste) {
      toast.error("Este acesso já foi adicionado ao PDI");
      return;
    }

    try {
      const { error } = await supabase.from("pdi_acessos").insert({
        pdi_id: pdi.id,
        nome: acesso.nome_acesso,
        categoria: acesso.categoria || "outros",
        link: acesso.link_acesso || null,
      });

      if (error) throw error;

      toast.success("Acesso adicionado!");
      setAcessoSearch("");
      setAddAcessoModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar acesso:", error);
      toast.error("Erro ao adicionar acesso");
    }
  };

  const handleDeleteAcesso = async (acessoId: string) => {
    try {
      const { error } = await supabase.from("pdi_acessos").delete().eq("id", acessoId);
      if (error) throw error;
      toast.success("Acesso removido!");
      refetch();
    } catch (error) {
      console.error("Erro ao remover acesso:", error);
      toast.error("Erro ao remover acesso");
    }
  };

  const categoriasAcesso: Record<string, string> = {
    ferramentas_ads: "Ferramentas de Ads",
    plataforma_cursos: "Plataforma de Cursos",
    redes_sociais: "Redes Sociais",
    analytics: "Analytics",
    outros: "Outros",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/pdis");
            }
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge className={statusConfig.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{pdi.titulo}</h1>
            {pdi.descricao && (
              <p className="text-muted-foreground mt-1">{pdi.descricao}</p>
            )}
          </div>
        </div>

        {canEdit && !estaFinalizado && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={handleOpenEditModal}>
                <Edit className="h-4 w-4 mr-2" />
                Editar PDI
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddAulaModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Aula
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFinalizeDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar PDI
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir PDI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Colaborador */}
        <Card className="rounded-2xl border-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={pdi.colaborador?.avatar_url || undefined} />
                <AvatarFallback className="bg-accent/10 text-accent">
                  {pdi.colaborador?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Colaborador</p>
                <p className="font-semibold">
                  {pdi.colaborador?.display_name || pdi.colaborador?.full_name}
                </p>
                {pdi.colaborador?.job_title && (
                  <p className="text-xs text-muted-foreground">{pdi.colaborador.job_title}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresso */}
        <Card className="rounded-2xl border-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="font-semibold">
                  {aulasConcluidas}/{totalAulas} aulas concluídas
                </p>
              </div>
            </div>
            <Progress value={progresso} className="h-2" />
            <p className="text-right text-sm font-medium text-accent mt-1">{progresso}%</p>
          </CardContent>
        </Card>

        {/* Prazo */}
        <Card className="rounded-2xl border-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  estaAtrasado ? "bg-red-500/10" : "bg-accent/10"
                }`}
              >
                <Calendar className={`h-5 w-5 ${estaAtrasado ? "text-red-500" : "text-accent"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Limite</p>
                <p className="font-semibold">
                  {format(dataLimite, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </p>
                {!estaFinalizado && (
                  <p
                    className={`text-xs ${
                      estaAtrasado ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {estaAtrasado
                      ? `Atrasado há ${Math.abs(diasRestantes)} dias`
                      : diasRestantes === 0
                      ? "Vence hoje"
                      : `${diasRestantes} dias restantes`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conteudo" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="conteudo" className="rounded-lg gap-2">
            <BookOpen className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="acessos" className="rounded-lg gap-2">
            <Key className="h-4 w-4" />
            Acessos {(pdi.acessos?.length || 0) > 0 && `(${pdi.acessos?.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Tab Conteúdo */}
        <TabsContent value="conteudo" className="space-y-4">
          <Card className="rounded-2xl border-accent/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Aulas do PDI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pdi.aulas?.map((aula, index) => {
                const concluida = aula.status === "concluida";
                const isExterno = aula.origem === "externa";
                return (
                  <div
                    key={aula.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      concluida
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : isExterno
                        ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                        : "bg-muted/30 border-transparent hover:border-accent/20"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        concluida
                          ? "bg-emerald-500 text-white"
                          : isExterno
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {concluida ? <Check className="h-4 w-4" /> : index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`font-medium ${concluida ? "line-through text-muted-foreground" : ""}`}>
                          {aula.titulo}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            isExterno 
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                              : ""
                          }`}
                        >
                          {aula.origem === "interna" ? "Interno" : "Externo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {aula.curso_origem}
                        {aula.duracao_minutos && ` • ${aula.duracao_minutos} min`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {aula.origem === "interna" && aula.lesson_id && aula.course_id ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/treinamentos/${aula.course_id}/aula/${aula.lesson_id}`}>
                            <Play className="h-4 w-4 mr-1" />
                            Ver Aula
                          </Link>
                        </Button>
                      ) : aula.link_externo ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={aula.link_externo} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Acessar
                          </a>
                        </Button>
                      ) : null}

                      {!concluida && canMarkComplete && !estaFinalizado && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAula(aula.id)}
                          disabled={markAulaConcluida.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                      )}

                      {canEdit && !estaFinalizado && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAula(aula.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Acessos */}
        <TabsContent value="acessos" className="space-y-4">
          <Card className="rounded-2xl border-accent/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-accent" />
                Acessos Necessários
              </CardTitle>
              {canEdit && !estaFinalizado && (
                <Button
                  size="sm"
                  onClick={() => setAddAcessoModalOpen(true)}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(pdi.acessos?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum acesso cadastrado</p>
                  {canEdit && !estaFinalizado && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddAcessoModalOpen(true)}
                      className="mt-3"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar primeiro acesso
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pdi.acessos?.map((acesso) => (
                    <div
                      key={acesso.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 group"
                    >
                      <div>
                        <p className="font-medium">{acesso.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoriasAcesso[acesso.categoria || "outros"]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {acesso.link && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={acesso.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {canEdit && !estaFinalizado && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAcesso(acesso.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Finalizar */}
      <AlertDialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar PDI?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar o PDI, ele será marcado como concluído independente do progresso atual.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700">
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir PDI?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O PDI e todas as suas aulas serão permanentemente
              excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Editar PDI */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar PDI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={editForm.titulo}
                onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                placeholder="Título do PDI"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Descrição do PDI"
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Limite *</Label>
              <Input
                type="date"
                value={editForm.data_limite}
                onChange={(e) => setEditForm({ ...editForm, data_limite: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={updatePDI.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                {updatePDI.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Aula */}
      <Dialog open={addAulaModalOpen} onOpenChange={(open) => {
        setAddAulaModalOpen(open);
        if (!open) {
          setShowLessonPicker(false);
          setLessonSearch("");
          setExternalAula({ titulo: "", link: "", duracao: "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button
                variant={showLessonPicker ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLessonPicker(true)}
                className="flex-1 gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Aula Interna
              </Button>
              <Button
                variant={!showLessonPicker ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLessonPicker(false)}
                className="flex-1 gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                Aula Externa
              </Button>
            </div>

            {showLessonPicker ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aula do catálogo..."
                    className="pl-10"
                    value={lessonSearch}
                    onChange={(e) => setLessonSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {lessonsData
                      .filter((lesson: any) => !pdi.aulas?.some(a => a.lesson_id === lesson.id))
                      .map((lesson: any) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleAddInternalAula(lesson)}
                          className="w-full text-left p-3 rounded-lg hover:bg-accent/10 transition-colors border"
                        >
                          <p className="font-medium text-sm">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(lesson.course as any)?.title}
                            {lesson.duration && ` • ${lesson.duration} min`}
                          </p>
                        </button>
                      ))}
                    {lessonsData.filter((lesson: any) => !pdi.aulas?.some(a => a.lesson_id === lesson.id)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {lessonSearch ? "Nenhuma aula encontrada" : "Digite para buscar aulas"}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Título da Aula *</Label>
                  <Input
                    placeholder="Ex: Curso de Marketing Digital"
                    value={externalAula.titulo}
                    onChange={(e) => setExternalAula({ ...externalAula, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link (opcional)</Label>
                  <Input
                    placeholder="https://..."
                    value={externalAula.link}
                    onChange={(e) => setExternalAula({ ...externalAula, link: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração em minutos (opcional)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 60"
                    value={externalAula.duracao}
                    onChange={(e) => setExternalAula({ ...externalAula, duracao: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddExternalAula} className="w-full bg-accent hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aula Externa
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Acesso */}
      <Dialog open={addAcessoModalOpen} onOpenChange={(open) => {
        setAddAcessoModalOpen(open);
        if (!open) {
          setNewAcesso({ nome: "", categoria: "outros", link: "" });
          setAcessoSearch("");
          setShowAcessoExistente(true);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button
                variant={showAcessoExistente ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAcessoExistente(true)}
                className="flex-1 gap-1.5"
              >
                <Database className="h-4 w-4" />
                Senhas Úteis
              </Button>
              <Button
                variant={!showAcessoExistente ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAcessoExistente(false)}
                className="flex-1 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Novo Acesso
              </Button>
            </div>

            {showAcessoExistente ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar em Senhas Úteis..."
                    className="pl-10"
                    value={acessoSearch}
                    onChange={(e) => setAcessoSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-52">
                  <div className="space-y-1">
                    {acessosExistentes
                      .filter((acesso: any) => !pdi.acessos?.some(a => a.nome === acesso.nome_acesso))
                      .map((acesso: any) => (
                        <button
                          key={acesso.id}
                          type="button"
                          onClick={() => handleAddAcessoExistente(acesso)}
                          className="w-full text-left p-3 rounded-lg hover:bg-accent/10 transition-colors border"
                        >
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-accent" />
                            <div>
                              <p className="font-medium text-sm">{acesso.nome_acesso}</p>
                              <p className="text-xs text-muted-foreground">
                                {categoriasAcesso[acesso.categoria] || acesso.categoria}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    {acessosExistentes.filter((acesso: any) => !pdi.acessos?.some(a => a.nome === acesso.nome_acesso)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {acessoSearch ? "Nenhum acesso encontrado" : "Digite para buscar ou selecione abaixo"}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome do Acesso *</Label>
                  <Input
                    placeholder="Ex: Facebook Ads Manager"
                    value={newAcesso.nome}
                    onChange={(e) => setNewAcesso({ ...newAcesso, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newAcesso.categoria}
                    onChange={(e) => setNewAcesso({ ...newAcesso, categoria: e.target.value })}
                  >
                    {Object.entries(categoriasAcesso).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Link (opcional)</Label>
                  <Input
                    placeholder="https://..."
                    value={newAcesso.link}
                    onChange={(e) => setNewAcesso({ ...newAcesso, link: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddAcesso} className="w-full bg-accent hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Acesso
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
