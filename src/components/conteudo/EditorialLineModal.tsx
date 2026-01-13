
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wand2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface EditorialLineModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: any[];
    onSuccess: () => void;
}

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const POST_TYPES = ["Reels", "Carrossel", "Imagem", "Vídeo", "Stories"];

// Diretrizes por perfil - mapeamento por nome
const DIRETRIZES_POR_PERFIL: Record<string, string[]> = {
    'BORAnaOBRA': ['TEMA PROJETO', 'CONTEÚDO TÉCNICO', 'TEMA OBRA', 'AUTORIDADE', 'TEMA GESTÃO', 'MEME', 'HISTÓRIA DE ALUNO', 'CONEXÃO'],
    'RAFABRASILEIRO': ['PORTFÓLIO', 'OPINIÃO', 'LO-FI', 'DEPOIMENTO'],
    'ALEXBRASILEIRO': ['PORTFÓLIO', 'OPINIÃO', 'LO-FI', 'DEPOIMENTO', 'DIÁRIO DE OBRA', 'AUTORIDADE'],
    'BORA.ARQ': ['PORTFÓLIO'],
    'CONSTRUTORA': ['PORTFÓLIO'],
};

// Função para encontrar diretrizes pelo nome do perfil (case insensitive, parcial)
function getDiretrizesForProfile(profileName: string): string[] {
    const normalizedName = profileName.toUpperCase().replace(/[.\s]/g, '');

    for (const [key, value] of Object.entries(DIRETRIZES_POR_PERFIL)) {
        const normalizedKey = key.toUpperCase().replace(/[.\s]/g, '');
        if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
            return value;
        }
    }

    // Retorna diretrizes padrão se não encontrar
    return ['CONTEÚDO', 'PROMOÇÃO', 'ENGAJAMENTO', 'EDUCATIVO', 'ENTRETENIMENTO'];
}

interface DayPost {
    id: string;
    type: string;
    intention: string;
    diretriz: string;
}

interface DayLine {
    day: string;
    posts: DayPost[];
}

export function EditorialLineModal({ isOpen, onClose, profiles, onSuccess }: EditorialLineModalProps) {
    const [profileId, setProfileId] = useState("");
    const [weekDate, setWeekDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    const [lines, setLines] = useState<DayLine[]>(
        DAYS_OF_WEEK.map(day => ({
            day,
            posts: [{ id: crypto.randomUUID(), type: "Reels", intention: "", diretriz: "" }]
        }))
    );
    const [loading, setLoading] = useState(false);
    const [availableDiretrizes, setAvailableDiretrizes] = useState<string[]>([]);

    // Atualiza as diretrizes disponíveis quando o perfil muda
    useEffect(() => {
        if (profileId) {
            const selectedProfile = profiles.find(p => p.id === profileId);
            if (selectedProfile) {
                const diretrizes = getDiretrizesForProfile(selectedProfile.name);
                setAvailableDiretrizes(diretrizes);
            }
        } else {
            setAvailableDiretrizes([]);
        }
    }, [profileId, profiles]);

    function handleAddPost(dayIndex: number) {
        const newLines = [...lines];
        newLines[dayIndex].posts.push({
            id: crypto.randomUUID(),
            type: "Reels",
            intention: "",
            diretriz: ""
        });
        setLines(newLines);
    }

    function handleRemovePost(dayIndex: number, postId: string) {
        const newLines = [...lines];
        if (newLines[dayIndex].posts.length > 1) {
            newLines[dayIndex].posts = newLines[dayIndex].posts.filter(p => p.id !== postId);
            setLines(newLines);
        }
    }

    function handlePostChange(dayIndex: number, postId: string, field: keyof DayPost, value: string) {
        const newLines = [...lines];
        const postIndex = newLines[dayIndex].posts.findIndex(p => p.id === postId);
        if (postIndex !== -1) {
            newLines[dayIndex].posts[postIndex] = {
                ...newLines[dayIndex].posts[postIndex],
                [field]: value
            };
            setLines(newLines);
        }
    }

    async function handleGenerate() {
        if (!profileId) {
            toast.error("Selecione um perfil");
            return;
        }

        try {
            setLoading(true);

            const startOfTargetWeek = startOfWeek(new Date(weekDate + "T00:00:00"), { weekStartsOn: 1 });

            // Coletar todos os posts válidos
            const allPosts: { day: string; post: DayPost; dayIndex: number }[] = [];
            lines.forEach((dayLine, dayIndex) => {
                dayLine.posts.forEach(post => {
                    if (post.intention.trim() !== "") {
                        allPosts.push({ day: dayLine.day, post, dayIndex });
                    }
                });
            });

            if (allPosts.length === 0) {
                toast.error("Preencha ao menos uma intenção");
                return;
            }

            // Criar linhas editoriais
            const newEditorialLines = allPosts.map(({ day, post }) => ({
                week_start_date: format(startOfTargetWeek, 'yyyy-MM-dd'),
                profile_id: profileId,
                day_of_week: day,
                intention: post.intention
            }));

            const { data: createdLines, error: lineError } = await supabase
                .from("editorial_lines")
                .insert(newEditorialLines)
                .select();

            if (lineError) throw lineError;

            // Criar posts automaticamente
            const newPosts = createdLines.map((line: any, index: number) => {
                const dayIndex = DAYS_OF_WEEK.indexOf(line.day_of_week);
                const postDate = addDays(startOfTargetWeek, dayIndex);
                const originalPost = allPosts[index].post;

                // Monta o tema com a diretriz se existir
                const themeWithDiretriz = originalPost.diretriz
                    ? `[${originalPost.diretriz}] ${line.intention}`
                    : line.intention;

                return {
                    profile_id: profileId,
                    scheduled_date: format(postDate, 'yyyy-MM-dd'),
                    day_of_week: line.day_of_week,
                    post_type: originalPost.type,
                    theme: themeWithDiretriz,
                    status: 'Planejado',
                    editorial_line_id: line.id,
                    deadline: format(postDate, 'yyyy-MM-dd')
                };
            });

            const { error: postError } = await supabase
                .from("social_posts")
                .insert(newPosts);

            if (postError) throw postError;

            toast.success(`${newPosts.length} posts gerados com sucesso!`);

            // Reset form
            setLines(DAYS_OF_WEEK.map(day => ({
                day,
                posts: [{ id: crypto.randomUUID(), type: "Reels", intention: "", diretriz: "" }]
            })));

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao gerar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl rounded-3xl border-accent/10 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-center flex items-center justify-center gap-2">
                        <Wand2 className="h-6 w-6 text-gold fill-gold/20" />
                        Gerador de Estratégia Semanal
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4 flex-1 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Perfil</Label>
                            <Select value={profileId} onValueChange={setProfileId}>
                                <SelectTrigger className="rounded-xl h-11 border-accent/10">
                                    <SelectValue placeholder="Selecione o perfil" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl z-[100]">
                                    {profiles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Início da Semana</Label>
                            <Input
                                type="date"
                                value={weekDate}
                                onChange={(e) => setWeekDate(e.target.value)}
                                className="rounded-xl h-11 border-accent/10 pr-4"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">
                            Planejamento por Dia
                            {profileId && (
                                <span className="ml-2 text-accent normal-case">
                                    • {availableDiretrizes.length} diretrizes disponíveis
                                </span>
                            )}
                        </Label>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {lines.map((dayLine, dayIndex) => (
                                <div key={dayLine.day} className="bg-accent/5 p-3 rounded-2xl border border-accent/5 hover:border-accent/10 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-accent">{dayLine.day}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] gap-1 rounded-lg hover:bg-accent/10"
                                            onClick={() => handleAddPost(dayIndex)}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Adicionar Post
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {dayLine.posts.map((post, postIndex) => (
                                            <div key={post.id} className="flex gap-2 items-center">
                                                {dayLine.posts.length > 1 && (
                                                    <span className="text-[9px] font-bold text-muted-foreground w-4">{postIndex + 1}.</span>
                                                )}
                                                <Select
                                                    value={post.type}
                                                    onValueChange={(val) => handlePostChange(dayIndex, post.id, 'type', val)}
                                                >
                                                    <SelectTrigger className="w-28 h-8 rounded-lg border-accent/10 bg-background/50 text-[10px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl z-[100]">
                                                        {POST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    value={post.diretriz}
                                                    onValueChange={(val) => handlePostChange(dayIndex, post.id, 'diretriz', val)}
                                                    disabled={!profileId}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "w-36 h-8 rounded-lg border-accent/10 bg-background/50 text-[10px]",
                                                        !profileId && "opacity-50"
                                                    )}>
                                                        <SelectValue placeholder="Diretriz" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl z-[100]">
                                                        {availableDiretrizes.map(d => (
                                                            <SelectItem key={d} value={d} className="text-[11px]">{d}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    placeholder="Qual a intenção desse conteúdo?"
                                                    className="flex-1 h-8 rounded-lg bg-background/50 border-accent/10 text-[10px]"
                                                    value={post.intention}
                                                    onChange={(e) => handlePostChange(dayIndex, post.id, 'intention', e.target.value)}
                                                />
                                                {dayLine.posts.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => handleRemovePost(dayIndex, post.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-accent/10">
                    <Button variant="outline" className="rounded-xl h-11 w-full sm:w-auto" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="gold"
                        className="rounded-xl h-11 w-full sm:w-auto font-bold shadow-lg shadow-gold/10"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? "Gerando..." : "Gerar Todos os Posts"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
