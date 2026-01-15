import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';

interface Department {
    id: string;
    name: string;
}

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
    const [isLoading, setIsLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [formData, setFormData] = useState({
        full_name: user.full_name,
        display_name: user.display_name || '',
        department: user.department || '',
        job_title: user.job_title || '',
        phone: user.phone || '',
        birth_date: user.birth_date || '',
        hire_date: user.hire_date || '',
        bio: user.bio || '',
    });

    // Carregar departamentos
    useEffect(() => {
        if (open) {
            loadDepartments();
        }
    }, [open]);

    // Atualizar form quando o usuário mudar
    useEffect(() => {
        setFormData({
            full_name: user.full_name,
            display_name: user.display_name || '',
            department: user.department || '',
            job_title: user.job_title || '',
            phone: user.phone || '',
            birth_date: user.birth_date || '',
            hire_date: user.hire_date || '',
            bio: user.bio || '',
        });
    }, [user]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    display_name: formData.display_name || null,
                    department: formData.department || null,
                    job_title: formData.job_title || null,
                    phone: formData.phone || null,
                    birth_date: formData.birth_date || null,
                    hire_date: formData.hire_date || null,
                    bio: formData.bio || null,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Registra atividade
            await supabase.rpc('log_activity', {
                p_action: 'user_updated',
                p_entity_type: 'user',
                p_entity_id: user.id,
                p_details: { updated_fields: Object.keys(formData) },
            });

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
                                    <SelectItem value="">Nenhum</SelectItem>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">Data de nascimento</Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hire_date">Data de admissão</Label>
                                <Input
                                    id="hire_date"
                                    type="date"
                                    value={formData.hire_date}
                                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                    disabled={isLoading}
                                />
                            </div>
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
