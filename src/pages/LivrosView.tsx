import { useState } from "react";
import { BookOpen, BarChart3, Columns3, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookDashboardTab } from "@/components/livros/BookDashboardTab";
import { BookKanbanTab } from "@/components/livros/BookKanbanTab";
import { BookConfigTab } from "@/components/livros/BookConfigTab";

export default function LivrosView() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gestão de Livros</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe vendas, envios e entregas de livros físicos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" />
            <span className="hidden sm:inline">CRM Envios</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <BookDashboardTab />
        </TabsContent>
        <TabsContent value="kanban">
          <BookKanbanTab />
        </TabsContent>
        <TabsContent value="config">
          <BookConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
