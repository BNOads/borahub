import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

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

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        display_name: '',
        job_title: '',
        role: 'collaborator' as 'admin' | 'collaborator',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Extrai parte do email antes do @ para usar como senha inicial
            const initialPassword = formData.email.split('@')[0];

            // Cria usuário usando signUp normal (a tabela profiles não existe no banco externo)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: initialPassword,
                options: {
                    data: {
                        full_name: formData.full_name,
                        display_name: formData.display_name || formData.full_name,
                        role: formData.role,
                    },
                },
            });

            if (authError) throw authError;

            toast({
                title: 'Usuário criado!',
                description: (
                    <div>
                        <p>Senha inicial: <strong>{initialPassword}</strong></p>
                        <p className="text-sm mt-1">O usuário deverá trocar no primeiro acesso.</p>
                    </div>
                ),
            });

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            console.error('Error creating user:', error);
            toast({
                title: 'Erro ao criar usuário',
                description: error.message || 'Ocorreu um erro ao criar o usuário.',
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
            job_title: '',
            role: 'collaborator',
        });
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
