import { useState, useEffect } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
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
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    display_name: formData.display_name || null,
                    job_title: formData.job_title || null,
                    department_id: formData.department_id || null,
                    phone: formData.phone || null,
                    bio: formData.bio || null,
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
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
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
