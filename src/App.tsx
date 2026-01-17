import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Equipe from "./pages/Equipe";
import Links from "./pages/Links";
import AcessoRapido from "./pages/AcessoRapido";
import Tarefas from "./pages/Tarefas";
import TarefaDetalhe from "./pages/TarefaDetalhe";
import Placeholder from "./pages/Placeholder";
import ConteudoView from "./pages/ConteudoView";
import NotFound from "./pages/NotFound";
import Senhas from "./pages/Senhas";
import TreinamentosView from "./pages/TreinamentosView";
import CursoDetalhes from "./pages/CursoDetalhes";
import AulaView from "./pages/AulaView";
import FunisView from "./pages/FunisView";
import FunnelPanel from "./pages/FunnelPanel";
import GuiaView from "./pages/GuiaView";
import PublicDocView from "./pages/PublicDocView";
import Agenda from "./pages/Agenda";
import UtmCreator from "./pages/UtmCreator";
import BoraNewsView from "./pages/BoraNewsView";
import BoraNewsDetail from "./pages/BoraNewsDetail";
import Login from "./pages/Login";
import TrocaSenha from "./pages/TrocaSenha";
import ContaDesativada from "./pages/ContaDesativada";
import Perfil from "./pages/Perfil";
import GestaoUsuarios from "./pages/admin/GestaoUsuarios";
import GestaoNotificacoes from "./pages/admin/GestaoNotificacoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/conta-desativada" element={<ContaDesativada />} />

            {/* Rota de troca obrigatória de senha */}
            <Route path="/troca-senha" element={
              <ProtectedRoute>
                <TrocaSenha />
              </ProtectedRoute>
            } />

            {/* Rotas protegidas */}
            <Route element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Index />} />
              <Route path="/acesso-rapido" element={<AcessoRapido />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/tarefas/:id" element={<TarefaDetalhe />} />
              <Route path="/treinamentos" element={<TreinamentosView />} />
              <Route path="/treinamentos/:courseId" element={<CursoDetalhes />} />
              <Route path="/treinamentos/:courseId/aula/:lessonId" element={<AulaView />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/guia" element={<GuiaView />} />
              <Route path="/links" element={<Links />} />
              <Route path="/senhas" element={<Senhas />} />
              <Route path="/conteudo" element={<ConteudoView />} />
              <Route path="/reunioes" element={<Placeholder />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/funis" element={<FunisView />} />
              <Route path="/funis/:id" element={<FunnelPanel />} />
              <Route path="/utm" element={<UtmCreator />} />
              <Route path="/bora-news" element={<BoraNewsView />} />
              <Route path="/bora-news/:id" element={<BoraNewsDetail />} />
              <Route path="/p/:slug" element={<PublicDocView />} />
              <Route path="/metas" element={<Placeholder />} />
              <Route path="/desafio" element={<Placeholder />} />
              <Route path="/assistente" element={<Placeholder />} />
              <Route path="/perfil" element={<Perfil />} />
              
              {/* Rotas admin */}
              <Route path="/admin/usuarios" element={
                <ProtectedRoute requireAdmin>
                  <GestaoUsuarios />
                </ProtectedRoute>
              } />
              <Route path="/admin/notificacoes" element={
                <ProtectedRoute requireAdmin>
                  <GestaoNotificacoes />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
