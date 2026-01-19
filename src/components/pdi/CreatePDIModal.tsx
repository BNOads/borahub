import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, X, ExternalLink, BookOpen, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreatePDI, useLessonsForPDI, PDIAula } from "@/hooks/usePDIs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  colaborador_id: z.string().min(1, "Selecione um colaborador"),
  data_limite: z.string().min(1, "Data limite é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface AulaItem {
  titulo: string;
  origem: "interna" | "externa";
  curso_origem: string | null;
  lesson_id: string | null;
  link_externo: string | null;
  duracao_minutos: number | null;
  status: "nao_iniciada";
  ordem: number;
}

interface AcessoItem {
  nome: string;
  categoria: string;
  link: string;
}

interface CreatePDIModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LoginOption {
  id: string;
  nome_acesso: string;
  categoria: string;
  link_acesso: string | null;
}

export function CreatePDIModal({ open, onOpenChange }: CreatePDIModalProps) {
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [aulas, setAulas] = useState<AulaItem[]>([]);
  const [acessos, setAcessos] = useState<AcessoItem[]>([]);
  const [lessonSearch, setLessonSearch] = useState("");
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalAula, setExternalAula] = useState({ titulo: "", link: "", duracao: "" });
  const [loginsDisponiveis, setLoginsDisponiveis] = useState<LoginOption[]>([]);
  const [selectedLoginId, setSelectedLoginId] = useState<string>("");

  const createPDI = useCreatePDI();
  const { data: lessonsData = [] } = useLessonsForPDI(lessonSearch);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      colaborador_id: "",
      data_limite: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchLogins();
    }
  }, [open]);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");

    if (!error && data) {
      setUsers(data);
    }
  }

  async function fetchLogins() {
    const { data, error } = await supabase
      .from("acessos_logins")
      .select("id, nome_acesso, categoria, link_acesso")
      .eq("ativo", true)
      .order("nome_acesso");

    if (!error && data) {
      setLoginsDisponiveis(data);
    }
  }

  const handleAddInternalLesson = (lesson: any) => {
    const courseTitle = (lesson.course as any)?.title || "Curso Interno";
    const novaAula: AulaItem = {
      titulo: lesson.title,
      origem: "interna",
      curso_origem: courseTitle,
      lesson_id: lesson.id,
      link_externo: null,
      duracao_minutos: lesson.duration || null,
      status: "nao_iniciada",
      ordem: aulas.length,
    };
    setAulas([...aulas, novaAula]);
    setShowLessonPicker(false);
    setLessonSearch("");
  };

  const handleAddExternalLesson = () => {
    if (!externalAula.titulo) {
      toast.error("Informe o título da aula");
      return;
    }
    const novaAula: AulaItem = {
      titulo: externalAula.titulo,
      origem: "externa",
      curso_origem: "Conteúdo Externo",
      lesson_id: null,
      link_externo: externalAula.link || null,
      duracao_minutos: externalAula.duracao ? parseInt(externalAula.duracao) : null,
      status: "nao_iniciada",
      ordem: aulas.length,
    };
    setAulas([...aulas, novaAula]);
    setExternalAula({ titulo: "", link: "", duracao: "" });
    setShowExternalForm(false);
  };

  const handleRemoveAula = (index: number) => {
    setAulas(aulas.filter((_, i) => i !== index));
  };

  const handleAddAcessoFromLogin = () => {
    if (!selectedLoginId) {
      toast.error("Selecione um acesso");
      return;
    }
    const login = loginsDisponiveis.find(l => l.id === selectedLoginId);
    if (!login) return;
    
    // Evita duplicados
    if (acessos.some(a => a.nome === login.nome_acesso)) {
      toast.error("Este acesso já foi adicionado");
      return;
    }
    
    setAcessos([...acessos, { 
      nome: login.nome_acesso, 
      categoria: login.categoria, 
      link: login.link_acesso || "" 
    }]);
    setSelectedLoginId("");
  };

  const handleRemoveAcesso = (index: number) => {
    setAcessos(acessos.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (aulas.length === 0) {
      toast.error("Adicione pelo menos uma aula ao PDI");
      return;
    }

    await createPDI.mutateAsync({
      titulo: values.titulo,
      descricao: values.descricao,
      colaborador_id: values.colaborador_id,
      data_limite: values.data_limite,
      aulas,
      acessos,
    });

    form.reset();
    setAulas([]);
    setAcessos([]);
    onOpenChange(false);
  };

  const categoriasAcesso = [
    { value: "ferramentas_ads", label: "Ferramentas de Ads" },
    { value: "plataforma_cursos", label: "Plataforma de Cursos" },
    { value: "redes_sociais", label: "Redes Sociais" },
    { value: "analytics", label: "Analytics" },
    { value: "outros", label: "Outros" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo PDI</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do PDI *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Capacitação em Tráfego Pago" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o objetivo deste PDI..." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="colaborador_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colaborador *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_limite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Limite *</FormLabel>
                        <FormControl>
                          <Input type="date" min={new Date().toISOString().split("T")[0]} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Aulas do PDI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Aulas do PDI</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLessonPicker(true)}
                      className="gap-1.5"
                    >
                      <BookOpen className="h-4 w-4" />
                      Aula Interna
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExternalForm(true)}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Aula Externa
                    </Button>
                  </div>
                </div>

                {/* Picker de Aulas Internas */}
                {showLessonPicker && (
                  <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label>Buscar Aula do Catálogo</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowLessonPicker(false);
                          setLessonSearch("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por título..."
                        className="pl-10"
                        value={lessonSearch}
                        onChange={(e) => setLessonSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="space-y-1">
                        {lessonsData.map((lesson: any) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => handleAddInternalLesson(lesson)}
                            className="w-full text-left p-2 rounded-lg hover:bg-accent/10 transition-colors"
                          >
                            <p className="font-medium text-sm">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {(lesson.course as any)?.title}
                            </p>
                          </button>
                        ))}
                        {lessonsData.length === 0 && lessonSearch && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma aula encontrada
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Form de Aula Externa */}
                {showExternalForm && (
                  <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label>Adicionar Aula Externa</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowExternalForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Título da aula *"
                      value={externalAula.titulo}
                      onChange={(e) => setExternalAula({ ...externalAula, titulo: e.target.value })}
                    />
                    <Input
                      placeholder="Link da aula (opcional)"
                      value={externalAula.link}
                      onChange={(e) => setExternalAula({ ...externalAula, link: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Duração (min)"
                        type="number"
                        className="w-32"
                        value={externalAula.duracao}
                        onChange={(e) => setExternalAula({ ...externalAula, duracao: e.target.value })}
                      />
                      <Button type="button" onClick={handleAddExternalLesson} className="flex-1">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de Aulas Adicionadas */}
                {aulas.length > 0 && (
                  <div className="space-y-2">
                    {aulas.map((aula, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{aula.titulo}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {aula.origem === "interna" ? "Interno" : "Externo"}
                            </Badge>
                            {aula.curso_origem}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAula(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {aulas.length === 0 && !showLessonPicker && !showExternalForm && (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    Nenhuma aula adicionada. Adicione pelo menos uma aula.
                  </p>
                )}
              </div>

              {/* Acessos Necessários */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Acessos Necessários (opcional)</Label>
                
                <div className="flex gap-2">
                  <Select
                    value={selectedLoginId}
                    onValueChange={setSelectedLoginId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um acesso de Senhas Úteis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loginsDisponiveis.map((login) => (
                        <SelectItem key={login.id} value={login.id}>
                          <span className="flex items-center gap-2">
                            {login.nome_acesso}
                            <span className="text-xs text-muted-foreground">
                              ({login.categoria})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                      {loginsDisponiveis.length === 0 && (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          Nenhum login cadastrado em Senhas Úteis
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={handleAddAcessoFromLogin}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {acessos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {acessos.map((acesso, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1.5 py-1.5 px-3"
                      >
                        {acesso.nome}
                        <button
                          type="button"
                          onClick={() => handleRemoveAcesso(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPDI.isPending}
                  className="bg-accent hover:bg-accent/90"
                >
                  {createPDI.isPending ? "Criando..." : "Criar PDI"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
