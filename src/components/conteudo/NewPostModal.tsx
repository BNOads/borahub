import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    profiles: any[];
    initialDate?: Date;
    initialProfileId?: string;
    initialStatus?: string;
}

const POST_TYPES = ['Reels', 'Carrossel', 'Imagem', 'Vídeo', 'Stories'];

export function NewPostModal({ isOpen, onClose, onSuccess, profiles, initialDate, initialProfileId, initialStatus }: NewPostModalProps) {
    const [loading, setLoading] = useState(false);
    const [profileId, setProfileId] = useState(initialProfileId || "");
    const [date, setDate] = useState<Date | undefined>(initialDate);
    const [postType, setPostType] = useState("Reels");
    const [theme, setTheme] = useState("");

    const handleCreate = async () => {
        if (!profileId || !date || !theme) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.from("social_posts").insert({
                profile_id: profileId,
                scheduled_date: format(date, 'yyyy-MM-dd'),
                post_type: postType,
                theme: theme,
                status: initialStatus || 'Planejado'
            });

            if (error) throw error;

            toast.success("Post criado com sucesso!");
            onSuccess();
            onClose();
            // Reset fields
            setTheme("");
        } catch (error: any) {
            toast.error("Erro ao criar post: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <Sparkles className="h-24 w-24" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tight mb-2">Novo Post</DialogTitle>
                        <p className="text-indigo-100/80 font-medium">Adicione um novo conteúdo manualmente à sua grade.</p>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6 bg-card">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Perfil Social</Label>
                        <Select value={profileId} onValueChange={setProfileId}>
                            <SelectTrigger className="rounded-2xl h-12 border-accent/10 bg-background/50">
                                <SelectValue placeholder="Selecione o perfil" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl z-[100]">
                                {profiles.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal rounded-2xl h-12 border-accent/10 bg-background/50",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Selecione</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-accent/10 z-[101]" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Formato</Label>
                            <Select value={postType} onValueChange={setPostType}>
                                <SelectTrigger className="rounded-2xl h-12 border-accent/10 bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl z-[100]">
                                    {POST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tema / Ideia</Label>
                        <Input
                            placeholder="Ex: 5 dicas para reforma..."
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="rounded-2xl h-12 border-accent/10 bg-background/50"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" className="flex-1 rounded-2xl h-12 font-bold" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-[2] rounded-2xl h-12 font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                            onClick={handleCreate}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Post"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
