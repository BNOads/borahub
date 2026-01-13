import { useState, useEffect } from "react";
import {
    Bot,
    Plus,
    Edit3,
    Trash2,
    Sparkles,
    Lightbulb,
    MoreVertical,
    Save,
    Loader2,
    Zap,
    PenTool,
    Image as ImageIcon,
    Video,
    Hash,
    ExternalLink,
    Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AGENT_TYPES = {
    'Copywriter': { icon: PenTool, color: 'bg-purple-500', description: 'Criação de textos e legendas' },
    'Ideação': { icon: Lightbulb, color: 'bg-amber-500', description: 'Geração de ideias e conceitos' },
    'Visual': { icon: ImageIcon, color: 'bg-blue-500', description: 'Direção visual e design' },
    'Vídeo': { icon: Video, color: 'bg-rose-500', description: 'Roteiros e produção de vídeo' },
    'Hashtags': { icon: Hash, color: 'bg-emerald-500', description: 'Pesquisa e sugestão de hashtags' },
    'Estratégia': { icon: Zap, color: 'bg-indigo-500', description: 'Planejamento estratégico' },
    'Outro': { icon: Sparkles, color: 'bg-slate-500', description: 'Outros tipos de assistência' },
};

interface IAAgent {
    id: string;
    name: string;
    type: string;
    description: string;
    link: string;
    created_at: string;
    updated_at: string;
}

interface AgentesIAViewProps {
    className?: string;
}

export function AgentesIAView({ className }: AgentesIAViewProps) {
    const [agents, setAgents] = useState<IAAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<IAAgent | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'Copywriter',
        description: '',
        link: ''
    });

    useEffect(() => {
        fetchAgents();
    }, []);

    async function fetchAgents() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("ia_agents")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAgents(data || []);
        } catch (error: any) {
            console.error("Erro ao carregar agentes:", error.message);
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(agent?: IAAgent) {
        if (agent) {
            setEditingAgent(agent);
            setFormData({
                name: agent.name,
                type: agent.type,
                description: agent.description,
                link: agent.link
            });
        } else {
            setEditingAgent(null);
            setFormData({
                name: '',
                type: 'Copywriter',
                description: '',
                link: ''
            });
        }
        setIsModalOpen(true);
    }

    function handleCloseModal() {
        setIsModalOpen(false);
        setEditingAgent(null);
        setFormData({
            name: '',
            type: 'Copywriter',
            description: '',
            link: ''
        });
    }

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Nome do agente é obrigatório");
            return;
        }
        if (!formData.link.trim()) {
            toast.error("Link do agente é obrigatório");
            return;
        }

        try {
            setSaving(true);

            if (editingAgent) {
                const { error } = await supabase
                    .from("ia_agents")
                    .update({
                        name: formData.name,
                        type: formData.type,
                        description: formData.description,
                        link: formData.link,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", editingAgent.id);

                if (error) throw error;
                toast.success("Agente atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("ia_agents")
                    .insert({
                        name: formData.name,
                        type: formData.type,
                        description: formData.description,
                        link: formData.link
                    });

                if (error) throw error;
                toast.success("Agente criado com sucesso!");
            }

            handleCloseModal();
            fetchAgents();
        } catch (error: any) {
            toast.error("Erro ao salvar agente: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(agent: IAAgent) {
        if (!confirm(`Tem certeza que deseja excluir o agente "${agent.name}"?`)) return;

        try {
            const { error } = await supabase
                .from("ia_agents")
                .delete()
                .eq("id", agent.id);

            if (error) throw error;
            toast.success("Agente excluído com sucesso!");
            fetchAgents();
        } catch (error: any) {
            toast.error("Erro ao excluir agente: " + error.message);
        }
    }

    function handleOpenLink(link: string) {
        window.open(link, '_blank', 'noopener,noreferrer');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Agentes de IA</h2>
                        <p className="text-sm text-muted-foreground">Assistentes inteligentes para criação de conteúdo</p>
                    </div>
                </div>
                <Button
                    variant="gold"
                    className="rounded-2xl gap-2 font-black"
                    onClick={() => handleOpenModal()}
                >
                    <Plus className="h-4 w-4" />
                    Novo Agente
                </Button>
            </div>

            {/* Agents Grid */}
            {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] bg-card/30 rounded-[2rem] border border-border">
                    <div className="p-4 bg-accent/10 rounded-3xl mb-4">
                        <Bot className="h-12 w-12 text-accent/50" />
                    </div>
                    <h3 className="text-lg font-black text-muted-foreground mb-2">Nenhum agente criado</h3>
                    <p className="text-sm text-muted-foreground/60 mb-6">Crie seu primeiro agente de IA para auxiliar na criação de conteúdo</p>
                    <Button
                        variant="gold"
                        className="rounded-2xl gap-2 font-black"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus className="h-4 w-4" />
                        Criar Primeiro Agente
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => {
                        const typeInfo = AGENT_TYPES[agent.type as keyof typeof AGENT_TYPES] || AGENT_TYPES['Outro'];
                        const TypeIcon = typeInfo.icon;

                        return (
                            <div
                                key={agent.id}
                                className="group bg-card/50 rounded-3xl border border-border p-5 hover:shadow-xl hover:border-accent/20 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2.5 rounded-xl text-white", typeInfo.color)}>
                                            <TypeIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-sm tracking-tight">{agent.name}</h3>
                                            <Badge variant="outline" className="text-[9px] font-bold mt-1 border-accent/20">
                                                {agent.type}
                                            </Badge>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <DropdownMenuItem onClick={() => handleOpenLink(agent.link)} className="gap-2">
                                                <ExternalLink className="h-4 w-4" />
                                                Acessar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenModal(agent)} className="gap-2">
                                                <Edit3 className="h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(agent)}
                                                className="gap-2 text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                                    {agent.description || "Sem descrição"}
                                </p>

                                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <LinkIcon className="h-3 w-3 text-accent" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Link</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/80 truncate">
                                        {agent.link}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 mt-4">
                                    <Button
                                        variant="gold"
                                        size="sm"
                                        className="flex-1 rounded-xl h-9 text-xs font-bold gap-1.5"
                                        onClick={() => handleOpenLink(agent.link)}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Acessar Agente
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-xl h-9 w-9 p-0 hover:bg-accent/5"
                                        onClick={() => handleOpenModal(agent)}
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-3xl border-accent/10 p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
                        <DialogHeader>
                            <DialogTitle className="text-white font-black text-xl flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    {editingAgent ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </div>
                                {editingAgent ? 'Editar Agente' : 'Novo Agente de IA'}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    Nome do Agente
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Gerador de Legendas"
                                    className="rounded-xl h-11 border-accent/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    Tipo
                                </label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                                >
                                    <SelectTrigger className="rounded-xl h-11 border-accent/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.entries(AGENT_TYPES).map(([key, { icon: Icon, color, description }]) => (
                                            <SelectItem key={key} value={key} className="rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-1 rounded text-white", color)}>
                                                        <Icon className="h-3 w-3" />
                                                    </div>
                                                    <span className="font-bold">{key}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Descrição
                            </label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descreva o que este agente faz..."
                                className="rounded-xl h-11 border-accent/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Link do Agente
                            </label>
                            <Input
                                value={formData.link}
                                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                                placeholder="https://exemplo.com/agente"
                                className="rounded-xl h-11 border-accent/10"
                            />
                            <p className="text-[10px] text-muted-foreground/60">
                                Cole o link da ferramenta onde o agente de IA está hospedado.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-accent/10">
                            <Button
                                variant="ghost"
                                className="flex-1 rounded-xl h-11"
                                onClick={handleCloseModal}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="gold"
                                className="flex-1 rounded-xl h-11 font-black gap-2"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {editingAgent ? 'Salvar Alterações' : 'Criar Agente'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
