import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Send,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  User,
} from "lucide-react";
import {
  useCreateNotification,
  CreateNotificationInput,
} from "@/hooks/useNotifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EnviarNotificacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const notificationTypes = [
  { value: "info", label: "Informacao", icon: Info, color: "text-blue-500" },
  { value: "success", label: "Sucesso", icon: CheckCircle2, color: "text-green-500" },
  { value: "warning", label: "Aviso", icon: AlertTriangle, color: "text-yellow-500" },
  { value: "alert", label: "Alerta", icon: AlertCircle, color: "text-red-500" },
];

export function EnviarNotificacaoModal({
  open,
  onOpenChange,
}: EnviarNotificacaoModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateNotificationInput>({
    title: "",
    message: "",
    type: "info",
    recipient_id: null,
  });

  const createNotification = useCreateNotification();

  const { data: users = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .eq("is_active", true)
        .order("full_name");

      if (error) return [];
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Campos obrigatorios",
        description: "Preencha o titulo e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNotification.mutateAsync(formData);
      toast({
        title: "Notificacao enviada!",
        description: formData.recipient_id
          ? "Enviada para o usuario selecionado."
          : "Enviada para todos os usuarios.",
      });
      setFormData({
        title: "",
        message: "",
        type: "info",
        recipient_id: null,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const selectedType = notificationTypes.find((t) => t.value === formData.type) || notificationTypes[0];
  const Icon = selectedType.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Notificacao
          </DialogTitle>
          <DialogDescription>
            Envie uma notificacao para usuarios do sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo *</Label>
            <Input
              id="title"
              placeholder="Ex: Atualizacao importante"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "info" | "success" | "warning" | "alert") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatario</Label>
              <Select
                value={formData.recipient_id || "all"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    recipient_id: value === "all" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Todos
                    </div>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.display_name || user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview compacto */}
          {(formData.title || formData.message) && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-start gap-2">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", selectedType.color)} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {formData.title || "Titulo"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {formData.message || "Mensagem..."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={createNotification.isPending}
            >
              {createNotification.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
