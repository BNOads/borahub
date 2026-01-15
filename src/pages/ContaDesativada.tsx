import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX } from 'lucide-react';
import { useEffect } from 'react';

export default function ContaDesativada() {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    useEffect(() => {
        // Garante que o usuário seja deslogado ao acessar esta página
        signOut();
    }, [signOut]);

    const handleBackToLogin = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <UserX className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold">Conta desativada</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Sua conta está temporariamente desativada
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <p className="text-center text-muted-foreground">
                        Sua conta foi desativada. Entre em contato com o administrador para mais informações.
                    </p>

                    <Button
                        onClick={handleBackToLogin}
                        className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        Voltar ao login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
