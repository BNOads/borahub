import { Link } from "react-router-dom";
import { Clock, AlertTriangle, CheckCircle2, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PDI, calcularProgresso } from "@/hooks/usePDIs";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PDICardProps {
  pdi: PDI;
  showColaborador?: boolean;
}

export function PDICard({ pdi, showColaborador = false }: PDICardProps) {
  const progresso = calcularProgresso(pdi.aulas || []);
  const aulasConcluidas = pdi.aulas?.filter(a => a.status === "concluida").length || 0;
  const totalAulas = pdi.aulas?.length || 0;
  
  const dataLimite = new Date(pdi.data_limite);
  const hoje = new Date();
  const diasRestantes = differenceInDays(dataLimite, hoje);
  const estaAtrasado = pdi.status === "atrasado";
  const estaFinalizado = pdi.status === "finalizado";

  const getStatusConfig = () => {
    if (estaFinalizado) {
      return {
        variant: "default" as const,
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
        label: "Finalizado",
      };
    }
    if (estaAtrasado) {
      return {
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        icon: AlertTriangle,
        label: `Atrasado há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? "s" : ""}`,
      };
    }
    return {
      variant: "secondary" as const,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      icon: Clock,
      label: diasRestantes === 0 ? "Vence hoje" : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="group overflow-hidden rounded-2xl border-accent/10 hover:border-accent/40 transition-all hover:shadow-lg bg-card/50 backdrop-blur-sm">
      <CardContent className="p-5 space-y-4">
        {/* Header com Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Badge variant={statusConfig.variant} className={`${statusConfig.className} text-xs font-medium`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Título e Descrição */}
        <div className="space-y-1">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-accent transition-colors">
            {pdi.titulo}
          </h3>
          {pdi.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {pdi.descricao}
            </p>
          )}
        </div>

        {/* Colaborador */}
        {showColaborador && pdi.colaborador && (
          <div className="flex items-center gap-2 py-2 border-y border-border/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={pdi.colaborador.avatar_url || undefined} />
              <AvatarFallback className="bg-accent/10 text-accent text-xs">
                {pdi.colaborador.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {pdi.colaborador.display_name || pdi.colaborador.full_name}
              </p>
              {pdi.colaborador.job_title && (
                <p className="text-xs text-muted-foreground truncate">
                  {pdi.colaborador.job_title}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              {aulasConcluidas}/{totalAulas} aulas
            </span>
            <span className="font-semibold text-accent">{progresso}%</span>
          </div>
          <Progress value={progresso} className="h-2" />
        </div>

        {/* Prazo */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Prazo: {format(dataLimite, "dd 'de' MMM, yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Botão de Ação */}
        <Button 
          asChild 
          className="w-full rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground h-10 gap-2"
        >
          <Link to={`/pdis/${pdi.id}`}>
            {estaFinalizado ? "Ver Detalhes" : "Continuar Estudos"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
