import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Rotas permitidas para convidados
const GUEST_ALLOWED_ROUTES = ['/', '/perfil', '/troca-senha', '/tarefas'];

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAdmin = false
}) => {
    const { user, profile, isLoading, isAdmin, isGuest } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Não autenticado - redireciona para login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Conta inativa - redireciona para página de conta desativada
    if (profile && !profile.is_active) {
        return <Navigate to="/conta-desativada" replace />;
    }

    // Convidado - só pode acessar rotas permitidas
    if (isGuest) {
        const isAllowed = GUEST_ALLOWED_ROUTES.some(route => 
            location.pathname === route || location.pathname.startsWith('/tarefas/')
        );
        if (!isAllowed) {
            return <Navigate to="/" replace />;
        }
    }

    // Requer admin mas não é admin
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
