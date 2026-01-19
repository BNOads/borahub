import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { usePDI, calcularProgresso, useFinalizePDI, useDeletePDI, useMarkAulaConcluida } from "@/hooks/usePDIs";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function PDIDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

  const { data: pdi, isLoading } = usePDI(id || "");
  const finalizePDI = useFinalizePDI();
  const deletePDI = useDeletePDI();
  const markAulaConcluida = useMarkAulaConcluida();

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
          Voltar para PDIs
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/pdis")}>
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
            <DropdownMenuContent align="end">
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
          {(pdi.acessos?.length || 0) > 0 && (
            <TabsTrigger value="acessos" className="rounded-lg gap-2">
              <Key className="h-4 w-4" />
              Acessos ({pdi.acessos?.length})
            </TabsTrigger>
          )}
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
                return (
                  <div
                    key={aula.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      concluida
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30 border-transparent hover:border-accent/20"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        concluida
                          ? "bg-emerald-500 text-white"
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
                        <Badge variant="outline" className="text-[10px]">
                          {aula.origem === "interna" ? "Interno" : "Externo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {aula.curso_origem}
                        {aula.duracao_minutos && ` • ${aula.duracao_minutos} min`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {aula.origem === "interna" && aula.lesson_id ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/treinamentos/aula/${aula.lesson_id}`}>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-accent" />
                Acessos Necessários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pdi.acessos?.map((acesso) => (
                  <div
                    key={acesso.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{acesso.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoriasAcesso[acesso.categoria || "outros"]}
                      </p>
                    </div>
                    {acesso.link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={acesso.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
    </div>
  );
}
