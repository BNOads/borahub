
import { useState } from "react";
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
import { Calendar as CalendarIcon, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays } from "date-fns";

interface EditorialLineModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: any[];
    onSuccess: () => void;
}

const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const POST_TYPES = ["Reels", "Carrossel", "Imagem", "Vídeo", "Stories"];

export function EditorialLineModal({ isOpen, onClose, profiles, onSuccess }: EditorialLineModalProps) {
    const [profileId, setProfileId] = useState("");
    const [weekDate, setWeekDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    const [lines, setLines] = useState(DAYS_OF_WEEK.map(day => ({ day, intention: "", type: "Reels" })));
    const [loading, setLoading] = useState(false);

    async function handleGenerate() {
        if (!profileId) {
            toast.error("Selecione um perfil");
            return;
        }

        try {
            setLoading(true);

            const startOfTargetWeek = startOfWeek(new Date(weekDate + "T00:00:00"), { weekStartsOn: 1 });

            const newEditorialLines = lines
                .filter(l => l.intention.trim() !== "")
                .map(l => ({
                    week_start_date: format(startOfTargetWeek, 'yyyy-MM-dd'),
                    profile_id: profileId,
                    day_of_week: l.day,
                    intention: l.intention
                }));

            if (newEditorialLines.length === 0) {
                toast.error("Preencha ao menos uma intenção");
                return;
            }

            const { data: createdLines, error: lineError } = await supabase
                .from("editorial_lines")
                .insert(newEditorialLines)
                .select();

            if (lineError) throw lineError;

            // Now create the posts automatically
            const newPosts = createdLines.map((line: any) => {
                const dayIndex = DAYS_OF_WEEK.indexOf(line.day_of_week);
                const postDate = addDays(startOfTargetWeek, dayIndex);
                const postType = lines.find(l => l.day === line.day_of_week)?.type || "Reels";

                return {
                    profile_id: profileId,
                    scheduled_date: format(postDate, 'yyyy-MM-dd'),
                    day_of_week: line.day_of_week,
                    post_type: postType,
                    theme: line.intention,
                    status: 'Planejado',
                    editorial_line_id: line.id,
                    deadline: format(postDate, 'yyyy-MM-dd')
                };
            });

            const { error: postError } = await supabase
                .from("social_posts")
                .insert(newPosts);

            if (postError) throw postError;

            toast.success("Linha editorial e posts gerados com sucesso!");
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
            <DialogContent className="max-w-2xl rounded-3xl border-accent/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-center flex items-center justify-center gap-2">
                        <Wand2 className="h-6 w-6 text-gold fill-gold/20" />
                        Gerador de Estratégia Semanal
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
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

                    <div className="space-y-4">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Planejamento por Dia</Label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {lines.map((item, idx) => (
                                <div key={item.day} className="flex gap-2 items-center bg-accent/5 p-3 rounded-2xl border border-accent/5 hover:border-accent/10 transition-all">
                                    <div className="w-24 shrink-0">
                                        <span className="text-xs font-black">{item.day}</span>
                                    </div>
                                    <Select value={item.type} onValueChange={(val) => {
                                        const newLines = [...lines];
                                        newLines[idx].type = val;
                                        setLines(newLines);
                                    }}>
                                        <SelectTrigger className="w-32 h-9 rounded-xl border-accent/10 bg-background/50 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl z-[100]">
                                            {POST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Qual a intenção desse conteúdo?"
                                        className="flex-1 h-9 rounded-xl bg-background/50 border-accent/10 text-xs"
                                        value={item.intention}
                                        onChange={(e) => {
                                            const newLines = [...lines];
                                            newLines[idx].intention = e.target.value;
                                            setLines(newLines);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="rounded-xl h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
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
