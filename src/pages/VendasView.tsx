import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesDashboard } from "@/components/vendas/SalesDashboard";
import { SalesManagement } from "@/components/vendas/SalesManagement";
import { InstallmentsManagement } from "@/components/vendas/InstallmentsManagement";
import { CsvImport } from "@/components/vendas/CsvImport";
import { HotmartSync } from "@/components/vendas/HotmartSync";
import { ProductsManagement } from "@/components/vendas/ProductsManagement";
import { SalesReports } from "@/components/vendas/SalesReports";
import { DollarSign, FileSpreadsheet, Package, BarChart3, Receipt, Upload, RefreshCw } from "lucide-react";

export default function VendasView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Check if user is admin or manager (Financeiro)
  const isAdmin = profile?.id ? true : false; // We'll check role in components
  const isFinance = true; // For now, allow access - RLS will handle permissions
  
  return (
    <div className="container mx-auto py-4 px-4 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/10">
          <DollarSign className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Controle de Vendas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie vendas, parcelas e comissões
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto gap-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="vendas" className="flex items-center gap-2 py-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
          </TabsTrigger>
          <TabsTrigger value="parcelas" className="flex items-center gap-2 py-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Parcelas</span>
          </TabsTrigger>
          <TabsTrigger value="hotmart" className="flex items-center gap-2 py-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Hotmart</span>
          </TabsTrigger>
          <TabsTrigger value="importar" className="flex items-center gap-2 py-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex items-center gap-2 py-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2 py-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <SalesDashboard />
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <SalesManagement />
        </TabsContent>

        <TabsContent value="parcelas" className="space-y-4">
          <InstallmentsManagement />
        </TabsContent>

        <TabsContent value="hotmart" className="space-y-4">
          <HotmartSync />
        </TabsContent>

        <TabsContent value="importar" className="space-y-4">
          <CsvImport />
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <ProductsManagement />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <SalesReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
