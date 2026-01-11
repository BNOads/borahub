import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Equipe from "./pages/Equipe";
import Links from "./pages/Links";
import AcessoRapido from "./pages/AcessoRapido";
import Tarefas from "./pages/Tarefas";
import TarefaDetalhe from "./pages/TarefaDetalhe";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import Senhas from "./pages/Senhas";

import TreinamentosView from "./pages/TreinamentosView";
import CursoDetalhes from "./pages/CursoDetalhes";
import AulaView from "./pages/AulaView";
import FunisView from "./pages/FunisView";
import FunnelDetails from "./pages/FunnelDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/acesso-rapido" element={<AcessoRapido />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/tarefas/:id" element={<TarefaDetalhe />} />
            <Route path="/treinamentos" element={<TreinamentosView />} />
            <Route path="/treinamentos/:courseId" element={<CursoDetalhes />} />
            <Route path="/treinamentos/:courseId/aula/:lessonId" element={<AulaView />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/guia" element={<Placeholder />} />
            <Route path="/links" element={<Links />} />
            <Route path="/senhas" element={<Senhas />} />
            <Route path="/conteudo" element={<Placeholder />} />
            <Route path="/reunioes" element={<Placeholder />} />
            <Route path="/funis" element={<FunisView />} />
            <Route path="/funis/:id" element={<FunnelDetails />} />
            <Route path="/metas" element={<Placeholder />} />
            <Route path="/desafio" element={<Placeholder />} />
            <Route path="/assistente" element={<Placeholder />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
