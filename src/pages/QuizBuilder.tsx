import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  FileText,
  MessageSquare,
  Award,
  Users,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Play,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useQuiz,
  useUpdateQuiz,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
  useCreateDiagnosis,
  useUpdateDiagnosis,
  useDeleteDiagnosis,
  QuizQuestion,
  QuizOption,
  QuizDiagnosis,
} from "@/hooks/useQuizzes";
import { cn } from "@/lib/utils";

const QUESTION_TYPES = [
  { value: "single_choice", label: "Escolha única", isQuestion: true },
  { value: "multiple_choice", label: "Múltipla escolha", isQuestion: true },
  { value: "scale", label: "Escala", isQuestion: true },
  { value: "text", label: "Texto", isQuestion: true },
  { value: "number", label: "Número", isQuestion: true },
  { value: "yes_no", label: "Sim / Não", isQuestion: true },
];

const CONTENT_BLOCK_TYPES = [
  { value: "content", label: "Bloco de Conteúdo", icon: "📝" },
  { value: "testimonial", label: "Depoimento", icon: "💬" },
  { value: "divider", label: "Divisória / Transição", icon: "➡️" },
];

const LEAD_FIELDS = [
  { value: "name", label: "Nome" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "company", label: "Empresa" },
  { value: "city", label: "Cidade" },
  { value: "state", label: "Estado" },
];

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function QuizBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: quiz, isLoading } = useQuiz(id);
  const updateQuiz = useUpdateQuiz(false); // Don't show toast for auto-save
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const createOption = useCreateOption();
  const updateOption = useUpdateOption();
  const deleteOption = useDeleteOption();
  const createDiagnosis = useCreateDiagnosis();
  const updateDiagnosisMutation = useUpdateDiagnosis();
  const deleteDiagnosis = useDeleteDiagnosis();

  const [activeTab, setActiveTab] = useState("intro");
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [linkCopied, setLinkCopied] = useState(false);
  const isInitialized = useRef(false);

  // Initialize form data from quiz
  useEffect(() => {
    if (quiz && !isInitialized.current) {
      setFormData({
        title: quiz.title,
        description: quiz.description || "",
        intro_title: quiz.intro_title || quiz.title,
        intro_subtitle: quiz.intro_subtitle || "",
        intro_text: quiz.intro_text || "",
        intro_image_url: quiz.intro_image_url || "",
        intro_cta_text: quiz.intro_cta_text || "Começar diagnóstico",
        show_progress_bar: quiz.show_progress_bar,
        privacy_text: quiz.privacy_text || "",
        lead_capture_enabled: quiz.lead_capture_enabled,
        lead_capture_position: quiz.lead_capture_position,
        lead_fields: quiz.lead_fields || ["name", "email", "whatsapp"],
        lead_required_fields: quiz.lead_required_fields || ["email"],
        lgpd_consent_text: quiz.lgpd_consent_text || "Concordo com a política de privacidade",
        primary_color: quiz.primary_color || "#6366f1",
        background_color: quiz.background_color || "#ffffff",
        diagnosis_type: quiz.diagnosis_type || "score",
        ai_prompt_template: quiz.ai_prompt_template || "",
        final_cta_text: quiz.final_cta_text || "Falar com especialista",
        final_cta_url: quiz.final_cta_url || "",
        // Result page customization
        result_title: (quiz as any).result_title || "Seu Diagnóstico Personalizado",
        result_subtitle: (quiz as any).result_subtitle || "",
        result_image_url: (quiz as any).result_image_url || "",
        result_video_url: (quiz as any).result_video_url || "",
        result_layout: (quiz as any).result_layout || "standard",
      });
      isInitialized.current = true;
    }
  }, [quiz]);

  // Debounced form data for auto-save
  const debouncedFormData = useDebounce(formData, 1000);

  // Auto-save when debounced form data changes
  useEffect(() => {
    if (id && isInitialized.current && Object.keys(debouncedFormData).length > 0) {
      updateQuiz.mutate({ id, ...debouncedFormData });
    }
  }, [debouncedFormData, id]);

  const handleSaveQuiz = async () => {
    if (!id) return;
    await updateQuiz.mutateAsync({ id, ...formData });
    toast({ title: "Quiz salvo!" });
  };

  const handlePublish = async () => {
    if (!id || !quiz) return;
    
    if (!quiz.questions || quiz.questions.length === 0) {
      toast({ title: "Adicione pelo menos uma pergunta", variant: "destructive" });
      return;
    }
    
    if (!quiz.diagnoses || quiz.diagnoses.length === 0) {
      toast({ title: "Adicione pelo menos um diagnóstico", variant: "destructive" });
      return;
    }

    await updateQuiz.mutateAsync({ id, status: "published" });
    toast({ title: "Quiz publicado com sucesso!" });
  };

  const handleAddQuestion = async () => {
    if (!id) return;
    const position = quiz?.questions?.length || 0;
    const question = await createQuestion.mutateAsync({
      quiz_id: id,
      question_text: "Nova pergunta",
      question_type: "single_choice",
      position,
      is_required: true,
    });
    setExpandedQuestions([...expandedQuestions, question.id]);
  };

  const handleAddContentBlock = async (blockType: string) => {
    if (!id) return;
    const position = quiz?.questions?.length || 0;
    const defaultTexts: Record<string, { text: string; title: string; body: string }> = {
      content: { text: "Bloco de Conteúdo", title: "Título do bloco", body: "Texto explicativo aqui..." },
      testimonial: { text: "Depoimento", title: "", body: "\"Seu depoimento aqui...\"" },
      divider: { text: "Próxima etapa", title: "Vamos para a próxima etapa!", body: "" },
    };
    const defaults = defaultTexts[blockType] || defaultTexts.content;
    
    const question = await createQuestion.mutateAsync({
      quiz_id: id,
      question_text: defaults.text,
      question_type: blockType as any,
      position,
      is_required: false,
      content_title: defaults.title,
      content_body: defaults.body,
    });
    setExpandedQuestions([...expandedQuestions, question.id]);
  };

  const handleAddOption = async (questionId: string) => {
    if (!id) return;
    const question = quiz?.questions?.find((q) => q.id === questionId);
    const position = question?.options?.length || 0;
    await createOption.mutateAsync({
      question_id: questionId,
      quiz_id: id,
      option_text: `Opção ${position + 1}`,
      position,
      points: 0,
    });
  };

  const handleAddDiagnosis = async () => {
    if (!id) return;
    await createDiagnosis.mutateAsync({
      quiz_id: id,
      title: "Novo Diagnóstico",
      min_score: 0,
      max_score: 100,
    });
  };

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6 text-center">
        <p>Quiz não encontrado</p>
        <Button onClick={() => navigate("/quizzes")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/q/${quiz.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/q/${quiz.slug}`;
    const shareData = {
      title: quiz.title,
      text: quiz.description || `Faça o quiz: ${quiz.title}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/quizzes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                placeholder="Título do Quiz"
              />
              <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                {quiz.status === "published" ? "Publicado" : quiz.status === "paused" ? "Pausado" : "Rascunho"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  {linkCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Link copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar link
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => window.open(`/q/${quiz.slug}`, "_blank")}>
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </Button>
            <Button variant="outline" onClick={handleSaveQuiz} disabled={updateQuiz.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={handlePublish} disabled={updateQuiz.isPending}>
              <Play className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="intro" className="gap-2">
              <FileText className="h-4 w-4" />
              Introdução
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Perguntas ({quiz.questions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="lead" className="gap-2">
              <Users className="h-4 w-4" />
              Captura
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="gap-2">
              <Award className="h-4 w-4" />
              Diagnósticos ({quiz.diagnoses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Intro Tab */}
          <TabsContent value="intro" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Página de Introdução</CardTitle>
                <CardDescription>Configure a página inicial do seu quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={formData.intro_title || ""}
                      onChange={(e) => setFormData({ ...formData, intro_title: e.target.value })}
                      placeholder="Título exibido na introdução"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Input
                      value={formData.intro_subtitle || ""}
                      onChange={(e) => setFormData({ ...formData, intro_subtitle: e.target.value })}
                      placeholder="Subtítulo opcional"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Texto de apoio</Label>
                  <Textarea
                    value={formData.intro_text || ""}
                    onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })}
                    placeholder="Explique o objetivo do quiz..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL da imagem (opcional)</Label>
                  <Input
                    value={formData.intro_image_url || ""}
                    onChange={(e) => setFormData({ ...formData, intro_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do botão CTA</Label>
                    <Input
                      value={formData.intro_cta_text || ""}
                      onChange={(e) => setFormData({ ...formData, intro_cta_text: e.target.value })}
                      placeholder="Começar diagnóstico"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Barra de progresso</Label>
                      <p className="text-sm text-muted-foreground">Mostrar progresso durante o quiz</p>
                    </div>
                    <Switch
                      checked={formData.show_progress_bar}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_progress_bar: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            {quiz.questions?.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                quizId={id!}
                isExpanded={expandedQuestions.includes(question.id)}
                onToggle={() => toggleQuestionExpanded(question.id)}
                onUpdate={(data) => updateQuestion.mutate({ ...data, id: question.id, quiz_id: id! })}
                onDelete={() => deleteQuestion.mutate({ id: question.id, quiz_id: id! })}
                onAddOption={() => handleAddOption(question.id)}
                onUpdateOption={(optionId, data) => updateOption.mutate({ ...data, id: optionId, quiz_id: id! })}
                onDeleteOption={(optionId) => deleteOption.mutate({ id: optionId, quiz_id: id! })}
              />
            ))}
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleAddQuestion} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pergunta
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Adicionar Bloco
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {CONTENT_BLOCK_TYPES.map((block) => (
                    <DropdownMenuItem 
                      key={block.value}
                      onClick={() => handleAddContentBlock(block.value)}
                    >
                      <span className="mr-2">{block.icon}</span>
                      {block.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TabsContent>

          {/* Lead Capture Tab */}
          <TabsContent value="lead" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Captura de Leads</CardTitle>
                <CardDescription>Configure quais dados serão coletados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Ativar captura de leads</Label>
                    <p className="text-sm text-muted-foreground">Coletar dados antes ou depois do resultado</p>
                  </div>
                  <Switch
                    checked={formData.lead_capture_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, lead_capture_enabled: checked })}
                  />
                </div>

                {formData.lead_capture_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Momento da captura</Label>
                      <Select
                        value={formData.lead_capture_position}
                        onValueChange={(value) => setFormData({ ...formData, lead_capture_position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_result">Antes do resultado</SelectItem>
                          <SelectItem value="after_result">Depois do resultado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Campos para coletar</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {LEAD_FIELDS.map((field) => (
                          <div
                            key={field.value}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-lg cursor-pointer",
                              formData.lead_fields?.includes(field.value) && "border-primary bg-primary/5"
                            )}
                            onClick={() => {
                              const fields = formData.lead_fields || [];
                              const newFields = fields.includes(field.value)
                                ? fields.filter((f: string) => f !== field.value)
                                : [...fields, field.value];
                              setFormData({ ...formData, lead_fields: newFields });
                            }}
                          >
                            <span>{field.label}</span>
                            <Switch checked={formData.lead_fields?.includes(field.value)} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Texto de consentimento LGPD</Label>
                      <Input
                        value={formData.lgpd_consent_text || ""}
                        onChange={(e) => setFormData({ ...formData, lgpd_consent_text: e.target.value })}
                        placeholder="Concordo com a política de privacidade"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.diagnosis_type}
                  onValueChange={(value) => setFormData({ ...formData, diagnosis_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Por faixa de pontuação</SelectItem>
                    <SelectItem value="tags">Por combinação de tags</SelectItem>
                    <SelectItem value="ai">Gerado por IA</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.diagnosis_type === "ai" && (
                  <div className="mt-4 space-y-2">
                    <Label>Prompt base para a IA</Label>
                    <Textarea
                      value={formData.ai_prompt_template || ""}
                      onChange={(e) => setFormData({ ...formData, ai_prompt_template: e.target.value })}
                      placeholder="Defina os critérios e instruções para a IA gerar o diagnóstico personalizado...

Exemplo:
- Avalie o nível de maturidade digital do respondente
- Classifique em: Iniciante, Intermediário ou Avançado
- Destaque 3 pontos fortes e 3 áreas de melhoria
- Sugira 3 ações práticas para evolução imediata"
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      Este prompt será usado como base para a IA gerar diagnósticos personalizados baseados nas respostas de cada usuário.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {quiz.diagnoses?.map((diagnosis) => (
              <DiagnosisEditor
                key={diagnosis.id}
                diagnosis={diagnosis}
                quizId={id!}
                diagnosisType={formData.diagnosis_type}
                onUpdate={(data) => updateDiagnosisMutation.mutate({ ...data, id: diagnosis.id, quiz_id: id! })}
                onDelete={() => deleteDiagnosis.mutate({ id: diagnosis.id, quiz_id: id! })}
              />
            ))}

            <Button onClick={handleAddDiagnosis} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Diagnóstico
            </Button>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor primária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de fundo</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <Input
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result Page Customization */}
            <Card>
              <CardHeader>
                <CardTitle>Página de Resultado</CardTitle>
                <CardDescription>Personalize a página de diagnóstico exibida após o quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título do resultado</Label>
                    <Input
                      value={formData.result_title || ""}
                      onChange={(e) => setFormData({ ...formData, result_title: e.target.value })}
                      placeholder="Seu Diagnóstico Personalizado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo (opcional)</Label>
                    <Input
                      value={formData.result_subtitle || ""}
                      onChange={(e) => setFormData({ ...formData, result_subtitle: e.target.value })}
                      placeholder="Confira seu resultado abaixo"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL da imagem do resultado (opcional)</Label>
                  <Input
                    value={formData.result_image_url || ""}
                    onChange={(e) => setFormData({ ...formData, result_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Imagem exibida no topo da página de resultado
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>URL do vídeo do resultado (opcional)</Label>
                  <Input
                    value={formData.result_video_url || ""}
                    onChange={(e) => setFormData({ ...formData, result_video_url: e.target.value })}
                    placeholder="https://youtube.com/embed/..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Use URL de embed do YouTube ou Vimeo (exibido se não houver imagem)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Layout da página</Label>
                  <Select
                    value={formData.result_layout || "standard"}
                    onValueChange={(value) => setFormData({ ...formData, result_layout: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Padrão</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                      <SelectItem value="detailed">Detalhado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CTA Final</CardTitle>
                <CardDescription>Botão de ação após o diagnóstico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto do botão</Label>
                  <Input
                    value={formData.final_cta_text || ""}
                    onChange={(e) => setFormData({ ...formData, final_cta_text: e.target.value })}
                    placeholder="Falar com especialista"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL de destino</Label>
                  <Input
                    value={formData.final_cta_url || ""}
                    onChange={(e) => setFormData({ ...formData, final_cta_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Question Editor Component with local state and debounce
function QuestionEditor({
  question,
  index,
  quizId,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  question: QuizQuestion;
  index: number;
  quizId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, data: Partial<QuizOption>) => void;
  onDeleteOption: (optionId: string) => void;
}) {
  const isContentBlock = ["content", "testimonial", "divider"].includes(question.question_type);
  
  // Local state for question fields
  const [localQuestion, setLocalQuestion] = useState({
    question_text: question.question_text,
    helper_text: question.helper_text || "",
    scale_min_label: question.scale_min_label || "",
    scale_max_label: question.scale_max_label || "",
    image_url: (question as any).image_url || "",
    video_url: (question as any).video_url || "",
    content_title: (question as any).content_title || "",
    content_body: (question as any).content_body || "",
    content_author_name: (question as any).content_author_name || "",
    content_author_role: (question as any).content_author_role || "",
    content_author_image: (question as any).content_author_image || "",
  });

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when question changes from outside
  useEffect(() => {
    setLocalQuestion({
      question_text: question.question_text,
      helper_text: question.helper_text || "",
      scale_min_label: question.scale_min_label || "",
      scale_max_label: question.scale_max_label || "",
      image_url: (question as any).image_url || "",
      video_url: (question as any).video_url || "",
      content_title: (question as any).content_title || "",
      content_body: (question as any).content_body || "",
      content_author_name: (question as any).content_author_name || "",
      content_author_role: (question as any).content_author_role || "",
      content_author_image: (question as any).content_author_image || "",
    });
  }, [question.id]);

  const handleLocalChange = (field: keyof typeof localQuestion, value: string) => {
    setLocalQuestion(prev => ({ ...prev, [field]: value }));
    
    // Debounce the update
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ [field]: value });
    }, 800);
  };

  const getTypeLabel = () => {
    const questionType = QUESTION_TYPES.find((t) => t.value === question.question_type);
    if (questionType) return questionType.label;
    const contentType = CONTENT_BLOCK_TYPES.find((t) => t.value === question.question_type);
    if (contentType) return `${contentType.icon} ${contentType.label}`;
    return question.question_type;
  };

  return (
    <Card className={isContentBlock ? "border-dashed border-primary/30" : ""}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <Badge variant={isContentBlock ? "secondary" : "outline"}>{index + 1}</Badge>
                <div>
                  <CardTitle className="text-base">
                    {isContentBlock ? (localQuestion.content_title || localQuestion.question_text) : localQuestion.question_text}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getTypeLabel()}
                    {!isContentBlock && question.is_required && " • Obrigatória"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            {/* Content Block Fields */}
            {isContentBlock && (
              <>
                {question.question_type === "testimonial" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Texto do depoimento</Label>
                      <Textarea
                        value={localQuestion.content_body}
                        onChange={(e) => handleLocalChange("content_body", e.target.value)}
                        placeholder="O depoimento do cliente vai aqui..."
                        rows={3}
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do autor</Label>
                        <Input
                          value={localQuestion.content_author_name}
                          onChange={(e) => handleLocalChange("content_author_name", e.target.value)}
                          placeholder="João Silva"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cargo / Descrição</Label>
                        <Input
                          value={localQuestion.content_author_role}
                          onChange={(e) => handleLocalChange("content_author_role", e.target.value)}
                          placeholder="CEO da Empresa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Foto do autor (URL)</Label>
                        <Input
                          value={localQuestion.content_author_image}
                          onChange={(e) => handleLocalChange("content_author_image", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Título do bloco</Label>
                      <Input
                        value={localQuestion.content_title}
                        onChange={(e) => handleLocalChange("content_title", e.target.value)}
                        placeholder="Título"
                      />
                    </div>
                    {question.question_type !== "divider" && (
                      <div className="space-y-2">
                        <Label>Conteúdo</Label>
                        <Textarea
                          value={localQuestion.content_body}
                          onChange={(e) => handleLocalChange("content_body", e.target.value)}
                          placeholder="Texto explicativo, informações importantes..."
                          rows={4}
                        />
                      </div>
                    )}
                  </>
                )}
                
                {/* Media for content blocks */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imagem (URL)</Label>
                    <Input
                      value={localQuestion.image_url}
                      onChange={(e) => handleLocalChange("image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vídeo (URL embed)</Label>
                    <Input
                      value={localQuestion.video_url}
                      onChange={(e) => handleLocalChange("video_url", e.target.value)}
                      placeholder="https://youtube.com/embed/..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Question Fields */}
            {!isContentBlock && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto da pergunta</Label>
                    <Input
                      value={localQuestion.question_text}
                      onChange={(e) => handleLocalChange("question_text", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de resposta</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(value) => onUpdate({ question_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Texto de apoio (opcional)</Label>
                  <Input
                    value={localQuestion.helper_text}
                    onChange={(e) => handleLocalChange("helper_text", e.target.value)}
                    placeholder="Explique a pergunta..."
                  />
                </div>

                {/* Media fields for questions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imagem da pergunta (URL)</Label>
                    <Input
                      value={localQuestion.image_url}
                      onChange={(e) => handleLocalChange("image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vídeo da pergunta (URL embed)</Label>
                    <Input
                      value={localQuestion.video_url}
                      onChange={(e) => handleLocalChange("video_url", e.target.value)}
                      placeholder="https://youtube.com/embed/..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={question.is_required}
                      onCheckedChange={(checked) => onUpdate({ is_required: checked })}
                    />
                    <Label>Obrigatória</Label>
                  </div>
                </div>

                {/* Options for choice-based questions */}
                {["single_choice", "multiple_choice", "yes_no"].includes(question.question_type) && (
                  <div className="space-y-3">
                    <Label>Opções de resposta</Label>
                    {question.options?.map((option, optIndex) => (
                      <OptionEditor
                        key={option.id}
                        option={option}
                        optIndex={optIndex}
                        onUpdateOption={onUpdateOption}
                        onDeleteOption={onDeleteOption}
                      />
                    ))}
                    <Button variant="outline" size="sm" onClick={onAddOption}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Opção
                    </Button>
                  </div>
                )}

                {/* Scale settings */}
                {question.question_type === "scale" && (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Mínimo</Label>
                      <Input
                        type="number"
                        value={question.scale_min}
                        onChange={(e) => onUpdate({ scale_min: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo</Label>
                      <Input
                        type="number"
                        value={question.scale_max}
                        onChange={(e) => onUpdate({ scale_max: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label mínimo</Label>
                      <Input
                        value={localQuestion.scale_min_label}
                        onChange={(e) => handleLocalChange("scale_min_label", e.target.value)}
                        placeholder="Discordo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label máximo</Label>
                      <Input
                        value={localQuestion.scale_max_label}
                        onChange={(e) => handleLocalChange("scale_max_label", e.target.value)}
                        placeholder="Concordo"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Option Editor with local state
function OptionEditor({
  option,
  optIndex,
  onUpdateOption,
  onDeleteOption,
}: {
  option: QuizOption;
  optIndex: number;
  onUpdateOption: (optionId: string, data: Partial<QuizOption>) => void;
  onDeleteOption: (optionId: string) => void;
}) {
  const [localText, setLocalText] = useState(option.option_text);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalText(option.option_text);
  }, [option.id]);

  const handleTextChange = (value: string) => {
    setLocalText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateOption(option.id, { option_text: value });
    }, 800);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={localText}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={`Opção ${optIndex + 1}`}
        className="flex-1"
      />
      <Input
        type="number"
        value={option.points}
        onChange={(e) => onUpdateOption(option.id, { points: parseInt(e.target.value) || 0 })}
        className="w-20"
        placeholder="Pts"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDeleteOption(option.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Diagnosis Editor Component with local state
function DiagnosisEditor({
  diagnosis,
  quizId,
  diagnosisType,
  onUpdate,
  onDelete,
}: {
  diagnosis: QuizDiagnosis;
  quizId: string;
  diagnosisType: string;
  onUpdate: (data: Partial<QuizDiagnosis>) => void;
  onDelete: () => void;
}) {
  const [localData, setLocalData] = useState({
    title: diagnosis.title,
    description: diagnosis.description || "",
    action_plan: diagnosis.action_plan || "",
    color: diagnosis.color,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalData({
      title: diagnosis.title,
      description: diagnosis.description || "",
      action_plan: diagnosis.action_plan || "",
      color: diagnosis.color,
    });
  }, [diagnosis.id]);

  const handleLocalChange = (field: keyof typeof localData, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ [field]: value });
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: localData.color }}
            />
            <Input
              value={localData.title}
              onChange={(e) => handleLocalChange("title", e.target.value)}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnosisType === "score" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pontuação mínima</Label>
              <Input
                type="number"
                value={diagnosis.min_score || 0}
                onChange={(e) => onUpdate({ min_score: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pontuação máxima</Label>
              <Input
                type="number"
                value={diagnosis.max_score || 100}
                onChange={(e) => onUpdate({ max_score: parseInt(e.target.value) })}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={localData.description}
            onChange={(e) => handleLocalChange("description", e.target.value)}
            placeholder="Descreva o diagnóstico..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Plano de ação</Label>
          <Textarea
            value={localData.action_plan}
            onChange={(e) => handleLocalChange("action_plan", e.target.value)}
            placeholder="Próximos passos recomendados..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Cor</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={localData.color}
              onChange={(e) => handleLocalChange("color", e.target.value)}
              className="h-10 w-16 rounded border cursor-pointer"
            />
            <Input
              value={localData.color}
              onChange={(e) => handleLocalChange("color", e.target.value)}
              className="w-32"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
