import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Department {
    id: string;
    name: string;
}

interface NovoUsuarioModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const NovoUsuarioModal: React.FC<NovoUsuarioModalProps> = ({
    open,
    onOpenChange,
    onSuccess,
}) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        display_name: '',
        department: '',
        job_title: '',
        role: 'collaborator' as 'admin' | 'collaborator',
    });

    // Carregar departamentos
    useEffect(() => {
        if (open) {
            loadDepartments();
        }
    }, [open]);

    const loadDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast({
                    title: 'Arquivo muito grande',
                    description: 'A imagem deve ter no máximo 2MB.',
                    variant: 'destructive',
                });
                return;
            }

            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadAvatar = async (userId: string): Promise<string | null> => {
        if (!avatarFile) return null;

        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            return null;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Get the current session for authorization
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Você precisa estar logado para criar usuários');
            }

            // Call the Edge Function to create the user
            const response = await supabase.functions.invoke('create-user', {
                body: {
                    email: formData.email,
                    full_name: formData.full_name,
                    display_name: formData.display_name || formData.full_name,
                    department: formData.department || null,
                    job_title: formData.job_title || null,
                    role: formData.role,
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (response.error) {
                if (response.data && response.data.error) {
                    throw new Error(response.data.error);
                }
                throw new Error(response.error.message || 'Erro ao criar usuário');
            }

            const result = response.data;

            if (!result || !result.success) {
                throw new Error(result?.error || 'Erro ao criar usuário');
            }

            // Upload avatar if provided
            if (avatarFile && result.user?.id) {
                const avatarUrl = await uploadAvatar(result.user.id);
                if (avatarUrl) {
                    // Update the profile with the avatar URL using admin-level access
                    await supabase
                        .from('profiles')
                        .update({ avatar_url: avatarUrl })
                        .eq('id', result.user.id);
                }
            }

            toast({
                title: 'Usuário criado!',
                description: (
                    <div>
                        <p>Senha inicial: <strong>{result.initial_password}</strong></p>
                        <p className="text-sm mt-1">O usuário deverá trocar no primeiro acesso.</p>
                    </div>
                ),
            });

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao criar o usuário.';
            console.error('Error creating user:', error);
            toast({
                title: 'Erro ao criar usuário',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            full_name: '',
            display_name: '',
            department: '',
            job_title: '',
            role: 'collaborator',
        });
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Adicionar Usuário</DialogTitle>
                        <DialogDescription>
                            Crie um novo usuário para acessar o sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <Avatar className="w-20 h-20">
                                    <AvatarImage src={avatarPreview || undefined} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                                        {formData.full_name ? getInitials(formData.full_name) : <User className="w-8 h-8" />}
                                    </AvatarFallback>
                                </Avatar>
                                {avatarPreview && (
                                    <button
                                        type="button"
                                        onClick={removeAvatar}
                                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@boranaobra.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                A senha inicial será a parte antes do @
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome completo *</Label>
                            <Input
                                id="full_name"
                                placeholder="João da Silva"
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
                                placeholder="João (opcional)"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Departamento</Label>
                            <Select
                                value={formData.department}
                                onValueChange={(value) => setFormData({ ...formData, department: value })}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
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
                                placeholder="Desenvolvedor, Analista, etc."
                                value={formData.job_title}
                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="role">Permissão de Administrador</Label>
                            <Switch
                                id="role"
                                checked={formData.role === 'admin'}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, role: checked ? 'admin' : 'collaborator' })
                                }
                                disabled={isLoading}
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
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar usuário'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
