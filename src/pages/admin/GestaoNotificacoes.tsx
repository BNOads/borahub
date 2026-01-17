import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Send,
  Bell,
  Loader2,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  User,
} from "lucide-react";
import {
  useNotifications,
  useCreateNotification,
  useDeleteNotification,
  CreateNotificationInput,
} from "@/hooks/useNotifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const notificationTypes = [
  { value: "info", label: "Informacao", icon: Info, color: "text-blue-500 bg-blue-500/10" },
  { value: "success", label: "Sucesso", icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
  { value: "warning", label: "Aviso", icon: AlertTriangle, color: "text-yellow-500 bg-yellow-500/10" },
  { value: "alert", label: "Alerta", icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
];

export default function GestaoNotificacoes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authReady, session } = useAuth();

  const [formData, setFormData] = useState<CreateNotificationInput>({
    title: "",
    message: "",
    type: "info",
    recipient_id: null,
  });

  const { data: notifications = [], isLoading } = useNotifications();
  const createNotification = useCreateNotification();
  const deleteNotification = useDeleteNotification();

  // Buscar lista de usuarios para selecionar destinatario
  const { data: users = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      console.log("🔥 loadData disparado GestaoNotificacoes(users)", session?.user?.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .eq("is_active", true)
        .order("full_name");

      if (error) return [];
      return data;
    },
    enabled: authReady && !!session,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Campos obrigatorios",
        description: "Preencha o titulo e a mensagem da notificacao.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNotification.mutateAsync(formData);
      toast({
        title: "Notificacao enviada",
        description: formData.recipient_id
          ? "Notificacao enviada para o usuario selecionado."
          : "Notificacao enviada para todos os usuarios.",
      });
      setFormData({
        title: "",
        message: "",
        type: "info",
        recipient_id: null,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Nao foi possivel enviar a notificacao.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification.mutateAsync(id);
      toast({ title: "Notificacao excluida" });
    } catch {
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    }
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

  const getTypeConfig = (type: string) => {
    return notificationTypes.find((t) => t.value === type) || notificationTypes[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Enviar Notificacoes</h1>
          <p className="text-muted-foreground">
            Envie notificacoes para usuarios do sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario de envio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Nova Notificacao
            </CardTitle>
            <CardDescription>
              Preencha os campos para enviar uma notificacao
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Digite a mensagem da notificacao..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                            <type.icon className={cn("h-4 w-4", type.color.split(" ")[0])} />
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
                          Todos os usuarios
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

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createNotification.isPending}
              >
                {createNotification.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar Notificacao
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              Visualize como a notificacao aparecera
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData.title || formData.message ? (
              <div className="rounded-lg border p-4 bg-accent/5">
                <div className="flex items-start gap-3">
                  {(() => {
                    const config = getTypeConfig(formData.type || "info");
                    const Icon = config.icon;
                    return (
                      <div className={cn("p-2 rounded-full", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <p className="font-medium">
                      {formData.title || "Titulo da notificacao"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.message || "Mensagem da notificacao..."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Agora mesmo
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Preencha os campos para ver o preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historico */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Notificacoes</CardTitle>
          <CardDescription>
            Ultimas notificacoes enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma notificacao enviada ainda</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead className="hidden md:table-cell">Destinatario</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.slice(0, 10).map((notification) => {
                    const config = getTypeConfig(notification.type);
                    const Icon = config.icon;

                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", config.color)}
                          >
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {notification.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {notification.recipient_id ? (
                            <Badge variant="secondary">
                              <User className="h-3 w-3 mr-1" />
                              Usuario
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              Todos
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
