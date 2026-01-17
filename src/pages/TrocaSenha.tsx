import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrocaSenha() {
    const navigate = useNavigate();
    const { updatePassword } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Validação simples - apenas senhas coincidem
    const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
    const hasMinLength = newPassword.length >= 1;

    const isFormValid = hasMinLength && passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) return;

        setIsLoading(true);

        try {
            // Para troca obrigatória, não precisamos validar senha atual
            // pois o usuário acabou de receber a senha resetada
            await updatePassword('', newPassword);
            navigate('/');
        } catch (err) {
            console.error('Error updating password:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold">Atualize sua senha</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Por segurança, você precisa criar uma nova senha
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nova senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Digite sua nova senha"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-9"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirme sua nova senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-9"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Validação visual */}
                        {confirmPassword && (
                            <div className="p-4 bg-muted rounded-lg">
                                <ValidationItem
                                    isValid={passwordsMatch}
                                    label="As senhas coincidem"
                                />
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            disabled={!isFormValid || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                'Atualizar senha'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

interface ValidationItemProps {
    isValid: boolean;
    label: string;
}

const ValidationItem: React.FC<ValidationItemProps> = ({ isValid, label }) => (
    <div className="flex items-center gap-2">
        {isValid ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
            <X className="w-4 h-4 text-muted-foreground" />
        )}
        <span className={cn(
            "text-sm",
            isValid ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
        )}>
            {label}
        </span>
    </div>
);
