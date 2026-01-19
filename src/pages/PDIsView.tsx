import { useState } from "react";
import { Plus, Target, Users, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPDIs, useTeamPDIs, PDI } from "@/hooks/usePDIs";
import { PDICard } from "@/components/pdi/PDICard";
import { CreatePDIModal } from "@/components/pdi/CreatePDIModal";

export default function PDIsView() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativo" | "finalizado" | "atrasado">("todos");
  const [activeTab, setActiveTab] = useState<"meus" | "equipe">("meus");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: meusPDIs = [], isLoading: loadingMeus } = useMyPDIs();
  const { data: teamPDIs = [], isLoading: loadingTeam } = useTeamPDIs();

  const filterPDIs = (pdis: PDI[]) => {
    return pdis.filter(pdi => {
      const matchesSearch = 
        pdi.titulo.toLowerCase().includes(search.toLowerCase()) ||
        pdi.colaborador?.full_name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = filterStatus === "todos" || pdi.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredMeusPDIs = filterPDIs(meusPDIs);
  const filteredTeamPDIs = filterPDIs(teamPDIs);

  const statusCounts = (pdis: PDI[]) => ({
    todos: pdis.length,
    ativo: pdis.filter(p => p.status === "ativo").length,
    atrasado: pdis.filter(p => p.status === "atrasado").length,
    finalizado: pdis.filter(p => p.status === "finalizado").length,
  });

  const meusStats = statusCounts(meusPDIs);
  const teamStats = statusCounts(teamPDIs);
  const currentStats = activeTab === "meus" ? meusStats : teamStats;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-accent" />
            Planos de Desenvolvimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe e gerencie os PDIs da equipe
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="rounded-xl bg-accent hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar PDI
          </Button>
        )}
      </div>

      {/* Tabs: Meus PDIs / PDIs da Equipe */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "meus" | "equipe")} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="meus" className="rounded-lg gap-2 data-[state=active]:bg-background">
              <Target className="h-4 w-4" />
              Meus PDIs
              {meusStats.todos > 0 && (
                <span className="ml-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  {meusStats.todos}
                </span>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="equipe" className="rounded-lg gap-2 data-[state=active]:bg-background">
                <Users className="h-4 w-4" />
                PDIs da Equipe
                {teamStats.todos > 0 && (
                  <span className="ml-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                    {teamStats.todos}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar PDIs..."
              className="pl-10 h-11 rounded-xl border-accent/20 focus-visible:ring-accent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "todos", label: "Todos", count: currentStats.todos },
            { value: "ativo", label: "Ativos", count: currentStats.ativo },
            { value: "atrasado", label: "Atrasados", count: currentStats.atrasado },
            { value: "finalizado", label: "Finalizados", count: currentStats.finalizado },
          ].map((status) => (
            <Button
              key={status.value}
              variant={filterStatus === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status.value as typeof filterStatus)}
              className={`rounded-full gap-1.5 ${
                filterStatus === status.value 
                  ? "bg-accent hover:bg-accent/90" 
                  : "hover:bg-accent/10"
              }`}
            >
              {status.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterStatus === status.value 
                  ? "bg-white/20" 
                  : "bg-muted"
              }`}>
                {status.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Meus PDIs */}
        <TabsContent value="meus" className="space-y-4 mt-0">
          {loadingMeus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-accent/5 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredMeusPDIs.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                {search || filterStatus !== "todos" 
                  ? "Nenhum PDI encontrado" 
                  : "Você não possui PDIs"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterStatus !== "todos" 
                  ? "Tente ajustar os filtros" 
                  : "Quando um PDI for atribuído a você, ele aparecerá aqui"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeusPDIs.map((pdi) => (
                <PDICard key={pdi.id} pdi={pdi} showColaborador={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* PDIs da Equipe */}
        <TabsContent value="equipe" className="space-y-4 mt-0">
          {loadingTeam ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-accent/5 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredTeamPDIs.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                {search || filterStatus !== "todos" 
                  ? "Nenhum PDI encontrado" 
                  : "Nenhum PDI cadastrado"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterStatus !== "todos" 
                  ? "Tente ajustar os filtros" 
                  : "Clique em 'Criar PDI' para começar"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeamPDIs.map((pdi) => (
                <PDICard key={pdi.id} pdi={pdi} showColaborador />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Criação */}
      <CreatePDIModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}
