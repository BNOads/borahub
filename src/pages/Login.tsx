import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, user, profile } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);

    const from = (location.state as any)?.from?.pathname || '/';

    // Redireciona se já estiver autenticado
    useEffect(() => {
        if (user && profile) {
            if (profile.must_change_password) {
                navigate('/troca-senha');
            } else if (!profile.is_active) {
                navigate('/conta-desativada');
            } else {
                navigate(from, { replace: true });
            }
        }
    }, [user, profile, navigate, from]);

    // Desbloqueio automático após 5 minutos
    useEffect(() => {
        if (isBlocked) {
            const timer = setTimeout(() => {
                setIsBlocked(false);
                setAttempts(0);
                setError('');
            }, 5 * 60 * 1000); // 5 minutos

            return () => clearTimeout(timer);
        }
    }, [isBlocked]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBlocked) {
            setError('Muitas tentativas. Aguarde alguns minutos.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            await signIn(email, password, rememberMe);
            // A navegação será feita pelo useEffect após o login
        } catch (err: any) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= 5) {
                setIsBlocked(true);
                setError('Muitas tentativas. Aguarde 5 minutos.');
            } else {
                setError(err.message || 'Email ou senha incorretos');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = email.trim() !== '' && password.length >= 8;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-white dark:text-black">B</span>
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold">BORAnaOBRA</CardTitle>
                        <CardDescription className="text-base mt-2">Hub Interno</CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu.email@boranaobra.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9"
                                    disabled={isBlocked || isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Digite sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9"
                                    disabled={isBlocked || isLoading}
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                disabled={isBlocked || isLoading}
                            />
                            <Label
                                htmlFor="remember"
                                className="text-sm font-normal cursor-pointer"
                            >
                                Lembrar-me por 30 dias
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            disabled={!isFormValid || isBlocked || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground mt-4">
                            Problemas para acessar? Fale com o administrador.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
