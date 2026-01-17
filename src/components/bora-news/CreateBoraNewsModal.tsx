import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateBoraNews, BoraNewsInsert } from "@/hooks/useBoraNews";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateNotification } from "@/hooks/useNotifications";

interface FormData {
  titulo: string;
  conteudo: string;
  resumo?: string;
  status_publicacao: 'publicado' | 'rascunho';
  destaque: boolean;
}

export function CreateBoraNewsModal() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const createNews = useCreateBoraNews();
  const createNotification = useCreateNotification();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      titulo: "",
      conteudo: "",
      resumo: "",
      status_publicacao: "rascunho",
      destaque: false,
    },
  });

  const destaque = watch("destaque");
  const status = watch("status_publicacao");

  const onSubmit = async (data: FormData) => {
    try {
      const autorNome = profile?.full_name || profile?.display_name || "Admin";
      const newsData: BoraNewsInsert = {
        titulo: data.titulo,
        conteudo: data.conteudo,
        resumo: data.resumo || undefined,
        autor_nome: autorNome,
        status_publicacao: data.status_publicacao,
        destaque: data.destaque,
        data_publicacao: new Date().toISOString(),
      };
      await createNews.mutateAsync(newsData);
      
      // Send notification to all users when news is published
      if (data.status_publicacao === 'publicado') {
        await createNotification.mutateAsync({
          title: "Nova notícia no Bora News",
          message: data.titulo,
          type: "info",
          recipient_id: null, // null means all users
        });
      }
      
      toast.success("Notícia criada com sucesso!");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("Erro ao criar notícia");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Noticia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Bora News</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input
              id="titulo"
              placeholder="Digite o titulo da noticia"
              {...register("titulo", { required: "Titulo e obrigatorio" })}
            />
            {errors.titulo && (
              <span className="text-sm text-destructive">{errors.titulo.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo (opcional)</Label>
            <Textarea
              id="resumo"
              placeholder="Resumo que aparecera na listagem"
              rows={2}
              {...register("resumo")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conteudo">Conteudo *</Label>
            <Textarea
              id="conteudo"
              placeholder="Digite o conteudo completo da noticia"
              rows={8}
              {...register("conteudo", { required: "Conteudo e obrigatorio" })}
            />
            {errors.conteudo && (
              <span className="text-sm text-destructive">{errors.conteudo.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status de Publicacao</Label>
            <Select
              value={status}
              onValueChange={(value: 'publicado' | 'rascunho') => setValue("status_publicacao", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="destaque">Destacar noticia</Label>
              <p className="text-sm text-muted-foreground">
                Noticias em destaque aparecem no topo da lista
              </p>
            </div>
            <Switch
              id="destaque"
              checked={destaque}
              onCheckedChange={(checked) => setValue("destaque", checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createNews.isPending}>
              {createNews.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Noticia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
