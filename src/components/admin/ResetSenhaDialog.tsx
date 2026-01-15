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
            // Envia email de reset de senha usando a API pública
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/troca-senha`,
            });

            if (error) throw error;

            toast({
                title: 'Email enviado!',
                description: (
                    <div>
                        <p>Um email de redefinição de senha foi enviado para <strong>{user.email}</strong></p>
                        <p className="text-sm mt-1">O usuário deve verificar a caixa de entrada.</p>
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

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Resetar senha de {user.full_name}?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Um email de redefinição de senha será enviado para <strong>{user.email}</strong>.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            O usuário receberá um link para criar uma nova senha.
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
                                Enviando...
                            </>
                        ) : (
                            'Enviar email de reset'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
