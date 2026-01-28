import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, History, Send, CheckCircle2, Clock, User, AlertTriangle, FileText, Calendar, Check, Trash2, Edit3, Monitor, Video, Layers, Smartphone, Image as ImageIcon, Lightbulb, Link as LinkIcon, Plus, X, Save, Film, Mic } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VideoEmbed } from "./VideoEmbed";
import { TranscribeFromPostModal } from "./TranscribeFromPostModal";
// Youtube Icon Component
const YoutubeIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>;
const POST_TYPES = {
  'Reels': {
    icon: Video,
    color: 'text-purple-500'
  },
  'Carrossel': {
    icon: Layers,
    color: 'text-blue-500'
  },
  'Imagem': {
    icon: ImageIcon,
    color: 'text-emerald-500'
  },
  'Vídeo': {
    icon: Monitor,
    color: 'text-rose-500'
  },
  'Stories': {
    icon: Smartphone,
    color: 'text-orange-500'
  },
  'Youtube': {
    icon: YoutubeIcon,
    color: 'text-red-600'
  }
};
interface PostDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  onUpdate: () => void;
}

// Team members colors for visual differentiation
const TEAM_COLORS = ["#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#34495e", "#16a085", "#d35400"];
const STATUS_PIPELINE = ['Planejado', 'Em desenvolvimento de ideia', 'Em produção visual ou vídeo', 'Em revisão', 'Ajustes solicitados', 'Aprovado', 'Agendado', 'Publicado'];
interface CampoExtra {
  label: string;
  value: string;
}
interface TeamMember {
  id: string;
  name: string;
  job_title: string | null;
}
export function PostDetailsModal({
  isOpen,
  onClose,
  post,
  onUpdate
}: PostDetailsModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isAdjustment, setIsAdjustment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [editedTheme, setEditedTheme] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Novos campos de conteúdo
  const [roteiro, setRoteiro] = useState("");
  const [arquivosLink, setArquivosLink] = useState("");
  const [bigIdea, setBigIdea] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [camposExtras, setCamposExtras] = useState<CampoExtra[]>([]);
  const [novoCampoLabel, setNovoCampoLabel] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const [showTranscribeModal, setShowTranscribeModal] = useState(false);

  // Fetch team members from profiles
  useEffect(() => {
    async function fetchTeamMembers() {
      const {
        data
      } = await supabase.from("profiles").select("id, full_name, job_title").eq("is_active", true).order("full_name");
      if (data) {
        setTeamMembers(data.map(p => ({
          id: p.id,
          name: p.full_name,
          job_title: p.job_title
        })));
      }
    }
    fetchTeamMembers();
  }, []);
  useEffect(() => {
    if (post && isOpen) {
      setEditedTheme(post.theme || "");
      setRoteiro(post.roteiro || "");
      setArquivosLink(post.arquivos_link || "");
      setBigIdea(post.big_idea || "");
      setVideoUrl(post.video_url || "");
      // Garantir que campos_extras seja sempre um array válido
      const extras = post.campos_extras;
      setCamposExtras(Array.isArray(extras) ? extras : []);
      fetchComments();
      fetchHistory();
    }
  }, [post?.id, isOpen]);
  async function fetchComments() {
    const {
      data
    } = await supabase.from("post_comments").select("*").eq("post_id", post.id).order("created_at", {
      ascending: true
    });
    setComments(data || []);
  }
  async function fetchHistory() {
    const {
      data
    } = await supabase.from("post_history").select("*").eq("post_id", post.id).order("created_at", {
      ascending: false
    });
    setHistory(data || []);
  }
  const getTeamMemberColor = (index: number) => {
    return TEAM_COLORS[index % TEAM_COLORS.length];
  };
  async function handleUpdateAssignee(newAssigneeId: string) {
    try {
      const {
        error
      } = await supabase.from("social_posts").update({
        current_assignee_id: newAssigneeId
      }).eq("id", post.id);
      if (error) throw error;
      const oldMember = teamMembers.find(m => m.id === post.current_assignee_id);
      const newMember = teamMembers.find(m => m.id === newAssigneeId);
      await supabase.from("post_history").insert({
        post_id: post.id,
        action: "Responsável alterado",
        field_changed: "current_assignee_id",
        old_value: oldMember?.name || post.current_assignee_id,
        new_value: newMember?.name || newAssigneeId
      });
      toast.success("Responsável atualizado!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar responsável: " + error.message);
    }
  }
  async function handleUpdateStatus(newStatus: string) {
    try {
      const {
        error
      } = await supabase.from("social_posts").update({
        status: newStatus
      }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("post_history").insert({
        post_id: post.id,
        action: "Status alterado",
        field_changed: "status",
        old_value: post.status,
        new_value: newStatus
      });
      toast.success("Status atualizado!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  }
  async function handleUpdateDate(newDate: string) {
    try {
      const {
        error
      } = await supabase.from("social_posts").update({
        scheduled_date: newDate
      }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("post_history").insert({
        post_id: post.id,
        action: "Data alterada",
        field_changed: "scheduled_date",
        old_value: post.scheduled_date,
        new_value: newDate
      });
      toast.success("Data atualizada!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar data: " + error.message);
    }
  }
  async function handleUpdateTheme() {
    if (!editedTheme.trim() || editedTheme === post.theme) {
      setIsEditingTheme(false);
      return;
    }
    try {
      const {
        error
      } = await supabase.from("social_posts").update({
        theme: editedTheme
      }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("post_history").insert({
        post_id: post.id,
        action: "Tema alterado",
        field_changed: "theme",
        old_value: post.theme,
        new_value: editedTheme
      });
      toast.success("Tema atualizado!");
      setIsEditingTheme(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar tema: " + error.message);
    }
  }
  async function handleUpdateType(newType: string) {
    try {
      const {
        error
      } = await supabase.from("social_posts").update({
        post_type: newType
      }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("post_history").insert({
        post_id: post.id,
        action: "Tipo alterado",
        field_changed: "post_type",
        old_value: post.post_type,
        new_value: newType
      });
      toast.success("Tipo de post atualizado!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao atualizar tipo: " + error.message);
    }
  }
  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.")) return;
    try {
      const {
        error
      } = await supabase.from("social_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Post excluído com sucesso!");
      onClose();
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao excluir post: " + error.message);
    }
  }
  async function handleSendComment() {
    if (!newComment.trim()) return;
    try {
      const {
        error
      } = await supabase.from("post_comments").insert({
        post_id: post.id,
        content: newComment,
        is_adjustment: isAdjustment
      });
      if (error) throw error;
      setNewComment("");
      setIsAdjustment(false);
      fetchComments();
    } catch (error: any) {
      toast.error("Erro ao comentar: " + error.message);
    }
  }
  const autoSaveContent = useCallback(async (fields: { video_url?: string; roteiro?: string; big_idea?: string; arquivos_link?: string }) => {
    if (!post?.id) return;
    try {
      setSavingContent(true);
      const { error } = await supabase.from("social_posts").update(fields).eq("id", post.id);
      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      console.error("Auto-save error:", error.message);
    } finally {
      setSavingContent(false);
    }
  }, [post?.id, onUpdate]);

  // Auto-save with debounce for content fields
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Skip auto-save on initial load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveContent({
        video_url: videoUrl,
        roteiro: roteiro,
        big_idea: bigIdea,
        arquivos_link: arquivosLink
      });
    }, 1000); // 1 second debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [videoUrl, roteiro, bigIdea, arquivosLink, autoSaveContent]);

  // Reset initial load flag when post changes
  useEffect(() => {
    initialLoadRef.current = true;
  }, [post?.id]);

  async function handleSaveContentFields() {
    try {
      setSavingContent(true);
      const { error } = await supabase.from("social_posts").update({
        video_url: videoUrl,
        roteiro: roteiro,
        big_idea: bigIdea,
        arquivos_link: arquivosLink
      }).eq("id", post.id);
      if (error) throw error;
      toast.success("Conteúdo salvo com sucesso!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSavingContent(false);
    }
  }
  function handleAddCampoExtra() {
    if (!novoCampoLabel.trim()) return;
    setCamposExtras([...camposExtras, {
      label: novoCampoLabel,
      value: ""
    }]);
    setNovoCampoLabel("");
  }
  function handleRemoveCampoExtra(index: number) {
    setCamposExtras(camposExtras.filter((_, i) => i !== index));
  }
  function handleUpdateCampoExtra(index: number, value: string) {
    const newCampos = [...camposExtras];
    newCampos[index].value = value;
    setCamposExtras(newCampos);
  }

  function handleTranscriptionComplete(text: string) {
    setRoteiro(prevRoteiro => 
      prevRoteiro ? `${prevRoteiro}\n\n--- Transcrição ---\n${text}` : text
    );
    setShowTranscribeModal(false);
    toast.success("Transcrição adicionada ao roteiro!");
  }
  if (!post) return null;
  return <>
      <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-accent/10 border-8 bg-background shadow-2xl">
                <div className="flex flex-1 overflow-hidden">
                    {/* Main Info */}
                    <div className="flex-1 p-10 flex flex-col gap-8 overflow-y-auto border-r border-border bg-card/10 backdrop-blur-3xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Select defaultValue={post.post_type} onValueChange={handleUpdateType}>
                                    <SelectTrigger className="w-fit h-7 rounded-full bg-accent/5 text-accent border-accent/20 px-3 py-1 font-black uppercase text-[10px] tracking-widest border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-accent/10 z-[100]">
                                        {Object.keys(POST_TYPES).map(type => <SelectItem key={type} value={type} className="font-bold text-[10px] uppercase">{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Badge variant="outline" className="rounded-full bg-blue-500/5 text-blue-500 border-blue-500/20 px-3 py-1 font-black uppercase text-[10px] tracking-widest">
                                    {post.profiles?.name}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter opacity-30">ID: {post.id.slice(0, 8)}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="group/theme relative">
                            {isEditingTheme ? <Input autoFocus value={editedTheme} onChange={e => setEditedTheme(e.target.value)} onBlur={handleUpdateTheme} onKeyDown={e => e.key === 'Enter' && handleUpdateTheme()} className="text-4xl font-black tracking-tighter leading-[1.1] h-auto p-0 border-none bg-transparent focus-visible:ring-0" /> : <h2 className="text-4xl font-black tracking-tighter leading-[1.1] cursor-pointer hover:text-accent transition-colors flex items-center gap-3" onClick={() => setIsEditingTheme(true)}>
                                    {post.theme}
                                    <Edit3 className="h-6 w-6 opacity-0 group-hover/theme:opacity-100 transition-opacity" />
                                </h2>}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-background/80 p-5 rounded-3xl border border-border shadow-inner">
                                <span className="text-[10px] uppercase font-black text-accent block mb-3 tracking-[0.2em] pl-1">Etapa do Pipeline</span>
                                <Select defaultValue={post.status} onValueChange={handleUpdateStatus}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-black shadow-md">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-accent/10 z-[100]">
                                        {STATUS_PIPELINE.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-background/80 p-5 rounded-3xl border border-border shadow-inner">
                                <span className="text-[10px] uppercase font-black text-accent block mb-3 tracking-[0.2em] pl-1">Responsável</span>
                                <Select value={post.current_assignee_id || ""} onValueChange={handleUpdateAssignee}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-black shadow-md">
                                        <SelectValue placeholder="Selecione o responsável" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-accent/10 z-[100]">
                                        {teamMembers.map((m, index) => <SelectItem key={m.id} value={m.id} className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{
                        backgroundColor: getTeamMemberColor(index)
                      }} />
                                                    {m.name}
                                                </div>
                                            </SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-background/80 p-5 rounded-3xl border border-border shadow-inner">
                                <span className="text-[10px] uppercase font-black text-accent block mb-3 tracking-[0.2em] pl-1">Data Prevista</span>
                                <div className="relative group">
                                    <Input type="date" defaultValue={post.scheduled_date} onChange={e => handleUpdateDate(e.target.value)} className="h-12 rounded-2xl bg-muted/30 border-none font-black shadow-md pl-12 pr-4 peer" />
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent pointer-events-none" />
                                </div>
                            </div>

                            <div className="bg-background/80 p-5 rounded-3xl border border-border shadow-inner">
                                <span className="text-[10px] uppercase font-black text-accent block mb-3 tracking-[0.2em] pl-1">Prazo de Segurança</span>
                                <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-muted/30 font-black">
                                    <Clock className="h-5 w-5 text-destructive" />
                                    <span className="text-sm">
                                        {post.deadline ? format(parseISO(post.deadline), "dd/MM/yyyy") : "Não definido"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Campos de Conteúdo */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black text-accent tracking-[0.2em]">Conteúdo do Post</span>
                                <Button variant="gold" size="sm" className="h-8 rounded-xl text-[10px] font-black gap-1.5" onClick={handleSaveContentFields} disabled={savingContent}>
                                    <Save className="h-3 w-3" />
                                    {savingContent ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>

                            {/* BIG Idea */}
                            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 rounded-2xl border border-amber-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest">BIG Idea</span>
                                </div>
                                <Textarea value={bigIdea} onChange={e => setBigIdea(e.target.value)} placeholder="Qual a grande ideia por trás deste post?" className="min-h-[60px] bg-background/50 border-amber-500/20 rounded-xl text-sm resize-none" />
                            </div>

                            {/* Roteiro */}
                            <div className="bg-background/80 p-4 rounded-2xl border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-accent" />
                                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Roteiro</span>
                                </div>
                                <Textarea value={roteiro} onChange={e => setRoteiro(e.target.value)} placeholder="Escreva o roteiro ou script do post aqui..." className="min-h-[100px] bg-muted/30 border-none rounded-xl text-sm resize-none" />
                            </div>

                            {/* Vídeo do Post */}
                            <div className="bg-background/80 p-4 rounded-2xl border border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Film className="h-4 w-4 text-purple-500" />
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">MIDIA DO POST</span>
                                    </div>
                                    {videoUrl && !videoUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 rounded-lg text-[10px] font-bold gap-1.5"
                                            onClick={() => setShowTranscribeModal(true)}
                                        >
                                            <Mic className="h-3 w-3" />
                                            Transcrever
                                        </Button>
                                    )}
                                </div>
                                <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Cole o link do Google Drive, YouTube ou Vimeo..." className="h-10 bg-muted/30 border-none rounded-xl text-sm mb-3" />
                                {videoUrl && <VideoEmbed url={videoUrl} className="mt-2" />}
                            </div>

                            {/* Arquivos/Link */}
                            <div className="bg-background/80 p-4 rounded-2xl border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon className="h-4 w-4 text-blue-500" />
                                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Link de Arquivos</span>
                                </div>
                                <Input value={arquivosLink} onChange={e => setArquivosLink(e.target.value)} placeholder="https://drive.google.com/... ou link para arquivos" className="h-10 bg-muted/30 border-none rounded-xl text-sm" />
                            </div>

                            {/* Campos Extras */}
                            {camposExtras.map((campo, index) => <div key={index} className="bg-background/80 p-4 rounded-2xl border border-border group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{campo.label}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveCampoExtra(index)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea value={campo.value} onChange={e => handleUpdateCampoExtra(index, e.target.value)} placeholder={`Preencha ${campo.label.toLowerCase()}...`} className="min-h-[60px] bg-muted/30 border-none rounded-xl text-sm resize-none" />
                                </div>)}

                            {/* Adicionar Campo Extra */}
                            <div className="flex gap-2">
                                <Input value={novoCampoLabel} onChange={e => setNovoCampoLabel(e.target.value)} placeholder="Nome do novo campo..." className="h-9 bg-muted/30 border-accent/10 rounded-xl text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleAddCampoExtra()} />
                                <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] font-black gap-1 border-accent/10 hover:bg-accent/5" onClick={handleAddCampoExtra}>
                                    <Plus className="h-3 w-3" />
                                    Adicionar Campo
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Chat & History Sidebar */}
                    <div className="w-96 flex flex-col bg-muted/30 border-l border-border backdrop-blur-xl">
                        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 lg:h-14 bg-card/50 border-b border-border p-0">
                                <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent font-black uppercase text-[10px] tracking-widest">
                                    <MessageSquare className="h-4 w-4 mr-2" /> Feedbacks
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent font-black uppercase text-[10px] tracking-widest">
                                    <History className="h-4 w-4 mr-2" /> Rastros
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
                                <ScrollArea className="flex-1 pt-6 px-6">
                                    <div className="space-y-6 pb-6">
                                        {comments.map((comment, i) => <div key={i} className={cn("flex flex-col gap-2 p-4 rounded-[2rem] text-xs shadow-sm", comment.is_adjustment ? "bg-destructive text-white" : "bg-card border border-border")}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-lg bg-background/20 flex items-center justify-center font-bold text-[8px]">CB</div>
                                                        <span className="font-black text-[9px] uppercase">Usuário</span>
                                                    </div>
                                                    <span className="text-[9px] opacity-60">{format(new Date(comment.created_at), "HH:mm")}</span>
                                                </div>
                                                <p className="leading-relaxed font-bold">{comment.content}</p>
                                                {comment.is_adjustment && <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-white/20">
                                                        <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center">
                                                            <Check className="h-2 w-2 text-destructive" />
                                                        </div>
                                                        <span className="font-black text-[8px] uppercase tracking-widest">Confirmar Ajuste</span>
                                                    </div>}
                                            </div>)}
                                    </div>
                                </ScrollArea>
                                <div className="p-6 border-t border-border bg-background/50 backdrop-blur-md">
                                    <div className="flex flex-col gap-3">
                                        <div className="relative">
                                            <Input placeholder="Deixe um comentário brilhante..." className="rounded-2xl h-14 pl-12 shadow-inner border-none bg-muted/50 font-bold" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendComment()} />
                                            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => setIsAdjustment(!isAdjustment)} className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest h-9 px-4 rounded-xl transition-all border shadow-sm", isAdjustment ? "bg-destructive text-white border-destructive" : "text-muted-foreground border-accent/10 hover:bg-accent/5")}>
                                                <AlertTriangle className="h-3.5 w-3.5" /> Gera Ajuste
                                            </button>
                                            <Button size="icon" className="h-10 w-10 rounded-2xl bg-accent hover:bg-accent/90 shadow-xl shadow-accent/20" onClick={handleSendComment}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 m-0 overflow-hidden bg-card/10">
                                <ScrollArea className="h-full p-8">
                                    <div className="space-y-8">
                                        {history.map((h, i) => <div key={i} className="flex gap-4 relative pb-6 last:pb-0">
                                                {i !== history.length - 1 && <div className="absolute left-[17px] top-8 bottom-0 w-[2px] bg-accent/10" />}
                                                <div className="h-9 w-9 rounded-2xl bg-accent shadow-lg shadow-accent/20 flex items-center justify-center text-accent-foreground relative z-10 shrink-0 border-2 border-background">
                                                    <History className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em] mb-1">{h.action}</p>
                                                    <div className="flex items-center gap-2 mb-2 p-2 bg-background/50 rounded-xl border border-border/50">
                                                        <span className="text-[10px] font-black text-muted-foreground line-through opacity-50">{h.old_value}</span>
                                                        <ArrowRight className="h-3 w-3 text-accent" />
                                                        <span className="text-[10px] font-bold">{h.new_value}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        <span className="text-[9px] font-black">{format(new Date(h.created_at), "dd MMM 'às' HH:mm", {
                            locale: ptBR
                          })}</span>
                                                    </div>
                                                </div>
                                            </div>)}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <TranscribeFromPostModal
            isOpen={showTranscribeModal}
            onClose={() => setShowTranscribeModal(false)}
            onTranscriptionComplete={handleTranscriptionComplete}
            postId={post?.id}
            videoUrl={videoUrl}
        />
    </>;
}
const ArrowRight = ({
  className
}: {
  className?: string;
}) => <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;