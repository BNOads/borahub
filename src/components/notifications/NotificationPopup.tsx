import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Bell,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUnreadNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const typeConfig = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  alert: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

export function NotificationPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data: notifications = [] } = useUnreadNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Filtrar notificacoes nao dispensadas nesta sessao
  const pendingNotifications = notifications.filter(
    (n) => !dismissed.includes(n.id)
  );

  // Abrir popup automaticamente quando houver notificacoes novas
  useEffect(() => {
    if (pendingNotifications.length > 0 && !open) {
      // Pequeno delay para nao abrir imediatamente ao carregar
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pendingNotifications.length]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    markAsRead.mutate(id);
  };

  const handleDismissAll = () => {
    markAllAsRead.mutate();
    setDismissed(notifications.map((n) => n.id));
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Extrai o título da tarefa da mensagem de notificação
  const extractTaskTitle = (message: string): string | null => {
    const match = message.match(/à tarefa: "(.+)"/);
    return match ? match[1] : null;
  };

  // Navega para a tarefa quando clica na notificação
  const handleNotificationClick = async (notification: Notification) => {
    // Verifica se é uma notificação de tarefa
    if (notification.title === "Nova tarefa atribuída") {
      const taskTitle = extractTaskTitle(notification.message);
      if (taskTitle) {
        // Busca a tarefa pelo título
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("title", taskTitle)
          .limit(1);

        if (tasks && tasks.length > 0) {
          handleDismiss(notification.id);
          setOpen(false);
          navigate(`/tarefas/${tasks[0].id}`);
          return;
        }
      }
    }
    // Para outras notificações, apenas dispensa
    handleDismiss(notification.id);
  };

  // Verifica se a notificação é clicável
  const isClickable = (notification: Notification): boolean => {
    return notification.title === "Nova tarefa atribuída";
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  if (pendingNotifications.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-accent" />
            Notificacoes ({pendingNotifications.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-2">
            {pendingNotifications.map((notification) => {
              const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "relative p-3 rounded-lg border bg-card transition-colors",
                    isClickable(notification) 
                      ? "cursor-pointer hover:bg-accent/10 hover:border-accent/30" 
                      : "hover:bg-accent/5"
                  )}
                  onClick={() => isClickable(notification) && handleNotificationClick(notification)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(notification.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                    title="Dispensar"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  <div className="flex gap-3 pr-6">
                    <div className={cn("p-2 rounded-full shrink-0", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm flex items-center gap-1">
                        {notification.title}
                        {isClickable(notification) && (
                          <ExternalLink className="h-3 w-3 text-accent" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatTime(notification.created_at)}
                        {notification.sender && (
                          <span>
                            {" "}
                            - {notification.sender.display_name || notification.sender.full_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground"
          >
            Fechar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDismissAll}
            className="gap-1"
          >
            Marcar todas como lidas
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
