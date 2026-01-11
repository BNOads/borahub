import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, Check, X, ShieldCheck, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface ProfileManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PRESET_COLORS = [
    '#D4AF37', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6',
    '#f1c40f', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d'
];

const PRESET_ICONS = ['🏗️', '👤', '📐', '🏢', '📸', '🎥', '✨', '🔥', '💎', '🚀'];

export function ProfileManagementModal({ isOpen, onClose, onSuccess }: ProfileManagementModalProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // New/Edit form state
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("👤");
    const [color, setColor] = useState("#D4AF37");
    const [isCreating, setIsCreating] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfiles();
        }
    }, [isOpen]);

    async function fetchProfiles() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from("social_profiles").select("*").order('name');
            if (error) throw error;
            setProfiles(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar perfis: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (id?: string) => {
        if (!name.trim()) {
            toast.error("Nome é obrigatório");
            return;
        }

        try {
            setLoading(true);
            const payload = { name, icon, color };

            if (id) {
                const { error } = await supabase.from("social_profiles").update(payload).eq('id', id);
                if (error) throw error;
                toast.success("Perfil atualizado!");
            } else {
                const { error } = await supabase.from("social_profiles").insert(payload);
                if (error) throw error;
                toast.success("Perfil criado!");
            }

            resetForm();
            fetchProfiles();
            onSuccess();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este perfil? Todos os posts associados serão perdidos.")) return;

        try {
            setLoading(true);
            const { error } = await supabase.from("social_profiles").delete().eq('id', id);
            if (error) throw error;
            toast.success("Perfil excluído!");
            fetchProfiles();
            onSuccess();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (profile: Profile) => {
        setEditingId(profile.id);
        setName(profile.name);
        setIcon(profile.icon);
        setColor(profile.color);
        setIsCreating(false);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('profile_icons')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profile_icons')
                .getPublicUrl(filePath);

            setIcon(publicUrl);
            toast.success("Ícone carregado!");
        } catch (error: any) {
            toast.error("Erro no upload: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setIcon("👤");
        setColor("#D4AF37");
        setEditingId(null);
        setIsCreating(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                        <ShieldCheck className="h-40 w-40" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
                            Gerenciar Perfis
                            {loading && <Loader2 className="h-6 w-6 animate-spin opacity-50" />}
                        </DialogTitle>
                        <p className="text-slate-400 font-medium text-lg mt-2">Personalize seus perfis sociais e identidades visuais.</p>
                    </DialogHeader>
                </div>

                <div className="p-10 space-y-8 bg-card max-h-[70vh] overflow-y-auto">
                    {/* Active Form for Create or Edit */}
                    {(isCreating || editingId) && (
                        <div className="bg-accent/5 p-8 rounded-[2rem] border border-accent/10 space-y-6 animate-in slide-in-from-top-4">
                            <h3 className="text-xl font-black">{editingId ? 'Editar Perfil' : 'Novo Perfil'}</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nome do Perfil</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Ex: Bora na Obra"
                                        className="h-14 rounded-2xl border-accent/10 focus-visible:ring-accent"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Ícone ou Imagem</Label>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_ICONS.map(i => (
                                                <button
                                                    key={i}
                                                    onClick={() => setIcon(i)}
                                                    className={cn(
                                                        "h-10 w-10 flex items-center justify-center rounded-xl transition-all",
                                                        icon === i ? "bg-accent text-accent-foreground scale-110 shadow-lg" : "bg-muted/50 hover:bg-muted"
                                                    )}
                                                >
                                                    {i}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="relative group/upload h-16 w-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed border-accent/20">
                                                {icon?.startsWith('http') ? (
                                                    <img src={icon} alt="Preview" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl">{icon}</span>
                                                )}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <Label htmlFor="icon-upload" className="cursor-pointer">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:opacity-80 transition-opacity">
                                                        <Upload className="h-3 w-3" /> Fazer Upload
                                                    </div>
                                                </Label>
                                                <Input
                                                    id="icon-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                />
                                                <p className="text-[9px] text-muted-foreground mt-1">PNG ou JPG até 2MB</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Cor de Identificação</Label>
                                <div className="flex flex-wrap gap-3">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={cn(
                                                "h-10 w-10 rounded-full transition-all border-4",
                                                color === c ? "border-white shadow-xl scale-110" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    className="flex-1 h-14 rounded-2xl font-black text-lg bg-accent hover:bg-accent/90 shadow-xl shadow-accent/20"
                                    onClick={() => handleSave(editingId || undefined)}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : editingId ? 'Salvar Alterações' : 'Criar Perfil'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-14 rounded-2xl px-8 font-bold"
                                    onClick={resetForm}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isCreating && !editingId && (
                        <>
                            <Button
                                className="w-full h-16 rounded-[1.5rem] border-2 border-dashed border-accent/20 bg-accent/5 hover:bg-accent/10 hover:border-accent/40 transition-all group flex items-center justify-center gap-4"
                                onClick={() => setIsCreating(true)}
                            >
                                <div className="p-2 bg-accent rounded-xl group-hover:scale-110 transition-transform">
                                    <Plus className="h-6 w-6 text-accent-foreground" />
                                </div>
                                <span className="font-black text-lg text-accent">Adicionar Novo Perfil</span>
                            </Button>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Perfis Existentes</Label>
                                <div className="grid grid-cols-1 gap-4">
                                    {profiles.map(profile => (
                                        <div
                                            key={profile.id}
                                            className="group flex items-center justify-between p-5 rounded-3xl bg-card border border-border/50 hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 transition-all"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div
                                                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0 overflow-hidden"
                                                    style={{ backgroundColor: profile.color + '20', color: profile.color }}
                                                >
                                                    {profile.icon?.startsWith('http') ? (
                                                        <img src={profile.icon} alt={profile.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        profile.icon
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xl tracking-tight">{profile.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="h-2 w-8 rounded-full" style={{ backgroundColor: profile.color }} />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{profile.color}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-2xl hover:bg-accent/10 text-accent"
                                                    onClick={() => startEdit(profile)}
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-12 w-12 rounded-2xl hover:bg-destructive/10 text-destructive"
                                                    onClick={() => handleDelete(profile.id)}
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {profiles.length === 0 && !loading && (
                                        <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-muted">
                                            <div className="h-20 w-20 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <X className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                            <p className="font-bold text-muted-foreground text-lg">Nenhum perfil encontrado.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog >
    );
}
