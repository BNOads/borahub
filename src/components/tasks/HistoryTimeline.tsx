import {
  Plus,
  Edit,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Clock,
} from "lucide-react";
import type { TaskHistory, TaskHistoryAction } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface HistoryTimelineProps {
  history: TaskHistory[];
}

const actionConfig: Record<
  TaskHistoryAction,
  { icon: typeof Plus; label: string; color: string }
> = {
  created: {
    icon: Plus,
    label: "Criada",
    color: "text-success bg-success/10",
  },
  updated: {
    icon: Edit,
    label: "Atualizada",
    color: "text-accent bg-accent/10",
  },
  completed: {
    icon: CheckCircle2,
    label: "Concluida",
    color: "text-success bg-success/10",
  },
  reopened: {
    icon: RotateCcw,
    label: "Reaberta",
    color: "text-warning bg-warning/10",
  },
  deleted: {
    icon: Trash2,
    label: "Excluida",
    color: "text-destructive bg-destructive/10",
  },
};

const fieldLabels: Record<string, string> = {
  title: "Titulo",
  description: "Descricao",
  priority: "Prioridade",
  category: "Categoria",
  assignee: "Responsavel",
  due_date: "Data de entrega",
  completed: "Status",
};

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatValue = (field: string | null, value: string | null) => {
    if (!value) return "vazio";
    if (field === "priority") {
      const priorities: Record<string, string> = {
        alta: "Alta",
        media: "Media",
        baixa: "Baixa",
      };
      return priorities[value] || value;
    }
    if (field === "completed") {
      return value === "true" ? "Concluida" : "Pendente";
    }
    return value;
  };

  const getActionDescription = (entry: TaskHistory) => {
    if (entry.action === "updated" && entry.field_changed) {
      const fieldLabel = fieldLabels[entry.field_changed] || entry.field_changed;
      return (
        <span>
          alterou <strong>{fieldLabel}</strong> de{" "}
          <span className="text-muted-foreground">
            "{formatValue(entry.field_changed, entry.old_value)}"
          </span>{" "}
          para{" "}
          <span className="font-medium">
            "{formatValue(entry.field_changed, entry.new_value)}"
          </span>
        </span>
      );
    }
    return actionConfig[entry.action]?.label || entry.action;
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2" />
        <p className="text-sm">Nenhuma alteracao registrada</p>
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedHistory.map((entry, index) => {
        const config = actionConfig[entry.action] || actionConfig.updated;
        const Icon = config.icon;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  config.color
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < sortedHistory.length - 1 && (
                <div className="w-px h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="text-sm">{getActionDescription(entry)}</div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {entry.changed_by && <span>{entry.changed_by}</span>}
                {entry.changed_by && <span>•</span>}
                <span>{formatDate(entry.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
