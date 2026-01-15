import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';

interface ResetSenhaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: Profile;
    onSuccess: () => void;
}

export const ResetSenhaDialog: React.FC<ResetSenhaDialogProps> = ({
    open,
    onOpenChange,
    user,
    onSuccess,
}) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        setIsLoading(true);

        try {
            // Extrai senha do email
            const newPassword = user.email.split('@')[0];

            // Chama função do Supabase para resetar senha
            const { data, error } = await supabase.rpc('reset_user_password', {
                p_user_id: user.id,
            });

            if (error) throw error;

            // Também precisa usar a API admin para alterar a senha
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                { password: newPassword }
            );

            if (updateError) throw updateError;

            toast({
                title: 'Senha resetada!',
                description: (
                    <div>
                        <p>Nova senha: <strong>{newPassword}</strong></p>
                        <p className="text-sm mt-1">O usuário deverá trocar no próximo acesso.</p>
                    </div>
                ),
            });

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error resetting password:', error);
            toast({
                title: 'Erro ao resetar senha',
                description: error.message || 'Ocorreu um erro ao resetar a senha.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const newPassword = user.email.split('@')[0];

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Resetar senha de {user.full_name}?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            A senha será alterada para <strong>"{newPassword}"</strong> e o usuário
                            precisará criar uma nova senha no próximo acesso.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Esta ação não pode ser desfeita. Certifique-se de comunicar a nova senha ao usuário.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleReset}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetando...
                            </>
                        ) : (
                            'Resetar senha'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
