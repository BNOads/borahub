import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, X } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/useDepartments';

interface EditarUsuarioModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: Profile;
    onSuccess: () => void;
}

export const EditarUsuarioModal: React.FC<EditarUsuarioModalProps> = ({
    open,
    onOpenChange,
    user,
    onSuccess,
}) => {
    const { toast } = useToast();
    const { departments } = useDepartments();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: user.full_name,
        display_name: user.display_name || '',
        job_title: user.job_title || '',
        department_id: user.department_id || '',
        phone: user.phone || '',
        bio: user.bio || '',
    });

    // Atualizar form quando o usuário mudar
    useEffect(() => {
        setFormData({
            full_name: user.full_name,
            display_name: user.display_name || '',
            job_title: user.job_title || '',
            department_id: user.department_id || '',
            phone: user.phone || '',
            bio: user.bio || '',
        });
        setAvatarUrl(user.avatar_url || '');
        setAvatarPreview(null);
        setSelectedFile(null);
    }, [user]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Arquivo inválido',
                description: 'Por favor, selecione uma imagem.',
                variant: 'destructive',
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Arquivo muito grande',
                description: 'O tamanho máximo é 5MB.',
                variant: 'destructive',
            });
            return;
        }

        setSelectedFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        setSelectedFile(null);
        setAvatarPreview(null);
        setAvatarUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadAvatar = async (): Promise<string | null> => {
        if (!selectedFile) return avatarUrl || null;

        setIsUploadingAvatar(true);
        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Delete old avatar if exists
            if (user.avatar_url) {
                const oldPath = user.avatar_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage.from('avatars').remove([oldPath]);
                }
            }

            // Upload new avatar
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast({
                title: 'Erro ao enviar foto',
                description: error.message || 'Não foi possível enviar a foto.',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Upload avatar if selected
            let newAvatarUrl = avatarUrl;
            if (selectedFile) {
                const uploadedUrl = await uploadAvatar();
                if (uploadedUrl) {
                    newAvatarUrl = uploadedUrl;
                }
            } else if (!avatarUrl && user.avatar_url) {
                // Avatar was removed
                const oldPath = user.avatar_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage.from('avatars').remove([oldPath]);
                }
                newAvatarUrl = '';
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    display_name: formData.display_name || null,
                    job_title: formData.job_title || null,
                    department_id: formData.department_id || null,
                    phone: formData.phone || null,
                    bio: formData.bio || null,
                    avatar_url: newAvatarUrl || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: 'Perfil atualizado!',
                description: 'As informações do usuário foram atualizadas com sucesso.',
            });

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating user:', error);
            toast({
                title: 'Erro ao atualizar perfil',
                description: error.message || 'Ocorreu um erro ao atualizar o perfil.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const displayAvatar = avatarPreview || avatarUrl;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Atualize as informações de {user.full_name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={displayAvatar} />
                                    <AvatarFallback className="text-2xl">
                                        {getInitials(formData.full_name || user.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                
                                {displayAvatar && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                                        onClick={handleRemoveAvatar}
                                        disabled={isLoading}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading || isUploadingAvatar}
                                >
                                    <Camera className="h-4 w-4 mr-2" />
                                    {displayAvatar ? 'Trocar foto' : 'Adicionar foto'}
                                </Button>
                            </div>
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome completo *</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Nome de exibição</Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department_id">Departamento</Label>
                            <Select
                                value={formData.department_id || "__none__"}
                                onValueChange={(value) => setFormData({ ...formData, department_id: value === "__none__" ? "" : value })}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Nenhum</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="job_title">Cargo</Label>
                            <Input
                                id="job_title"
                                value={formData.job_title}
                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="(00) 00000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                placeholder="Breve descrição sobre o usuário..."
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                disabled={isLoading}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading || isUploadingAvatar}>
                            {isLoading || isUploadingAvatar ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isUploadingAvatar ? 'Enviando foto...' : 'Salvando...'}
                                </>
                            ) : (
                                'Salvar alterações'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
