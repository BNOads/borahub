import { ArrowRight, Rocket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const launches = [
  {
    id: 1,
    title: "Lançamento Imersão Digital",
    status: "Ativo",
    priority: "Alta",
    value: "R$ 150.000",
    date: "15/01 - 22/01",
    owner: "Maria Santos",
    progress: 75,
  },
  {
    id: 2,
    title: "Mentoria Premium",
    status: "Em preparação",
    priority: "Média",
    value: "R$ 80.000",
    date: "01/02 - 08/02",
    owner: "Pedro Lima",
    progress: 30,
  },
];

export function ActiveLaunches() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Funis Ativos</h2>
          <Badge className="bg-accent text-accent-foreground">
            {launches.length}
          </Badge>
        </div>
        <Link to="/funis">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent">
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {launches.map((launch) => (
          <div
            key={launch.id}
            className="min-w-[280px] flex-shrink-0 p-4 rounded-lg border border-border hover:border-accent/50 transition-all hover:shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Rocket className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">{launch.title}</h3>
                  <p className="text-sm text-muted-foreground">{launch.date}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <Badge
                variant="outline"
                className={
                  launch.status === "Ativo"
                    ? "border-success text-success"
                    : "border-warning text-warning"
                }
              >
                {launch.status}
              </Badge>
              <Badge
                variant="outline"
                className={
                  launch.priority === "Alta"
                    ? "border-destructive text-destructive"
                    : "border-muted-foreground text-muted-foreground"
                }
              >
                {launch.priority}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-accent font-semibold">
                <TrendingUp className="h-4 w-4" />
                {launch.value}
              </div>
              <span className="text-sm text-muted-foreground">
                por {launch.owner}
              </span>
              
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${launch.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{launch.progress}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
