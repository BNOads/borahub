import { Link } from "react-router-dom";
import { Target, ArrowRight, Clock, AlertTriangle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMyPDIs, calcularProgresso } from "@/hooks/usePDIs";
import { differenceInDays } from "date-fns";

export function PendingPDIs() {
  const { data: pdis = [], isLoading } = useMyPDIs();

  // Filtrar apenas PDIs ativos e atrasados
  const pendingPDIs = pdis.filter(pdi => pdi.status !== "finalizado").slice(0, 3);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-accent/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Meus PDIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingPDIs.length === 0) {
    return (
      <Card className="rounded-2xl border-accent/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Meus PDIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum PDI pendente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-accent/10">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Meus PDIs
          {pendingPDIs.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-accent/10 text-accent">
              {pendingPDIs.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent">
          <Link to="/pdis" className="gap-1">
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingPDIs.map(pdi => {
          const progresso = calcularProgresso(pdi.aulas || []);
          const aulasConcluidas = pdi.aulas?.filter(a => a.status === "concluida").length || 0;
          const totalAulas = pdi.aulas?.length || 0;
          const dataLimite = new Date(pdi.data_limite);
          const hoje = new Date();
          const diasRestantes = differenceInDays(dataLimite, hoje);
          const estaAtrasado = pdi.status === "atrasado";

          return (
            <Link
              key={pdi.id}
              to={`/pdis/${pdi.id}`}
              className="block p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">
                    {pdi.titulo}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {estaAtrasado ? (
                      <Badge variant="destructive" className="text-[10px] gap-1 py-0">
                        <AlertTriangle className="h-3 w-3" />
                        Atrasado há {Math.abs(diasRestantes)} dias
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {diasRestantes === 0 ? "Vence hoje" : `${diasRestantes} dias restantes`}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-accent">{progresso}%</span>
              </div>
              
              <div className="space-y-1.5">
                <Progress value={progresso} className="h-1.5" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {aulasConcluidas}/{totalAulas} aulas
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
