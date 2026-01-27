import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Trash2, Loader2, Wand2, ChevronDown, ChevronRight, ListTodo, Eraser } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  useFunnelChecklist, 
  useCreateChecklistItem, 
  useUpdateChecklistItem, 
  useDeleteChecklistItem 
} from "@/hooks/useFunnelExtras";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ConvertToTaskModal } from "./ConvertToTaskModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FunnelChecklistProps {
  funnelId: string;
  funnelCategory?: string;
}

// Itens padrão para lançamentos
const DEFAULT_CHECKLIST_ITEMS = [
  // Atividades diárias do estrategista
  { title: "[Diário] Monitorar o Dashboard de Tráfego", category: "diario" },
  { title: "[Diário] Monitorar os Disparos nos Grupos de WhatsApp", category: "diario" },
  { title: "[Diário] Monitorar e Responder os Comentários nas Redes Sociais", category: "diario" },
  { title: "[Diário] Monitorar as Campanhas e Automações de Email Marketing", category: "diario" },
  { title: "[Diário] Monitorar os Grupos de WhatsApp", category: "diario" },
  { title: "[Diário] Recuperação de Vendas 1 a 1", category: "diario" },
  { title: "[Diário] Monitorar o dashboard de captação", category: "diario" },
  
  // Pontuais - Carrinho
  { title: "[Pontual] Redirecionar as Páginas para as Páginas de Venda da Reabertura de Carrinho", category: "carrinho" },
  { title: "[Pontual] Redirecionar as Páginas para as Páginas de Venda", category: "carrinho" },
  { title: "[Pontual] Conferir QR Code", category: "carrinho" },
  { title: "[Pontual] Testar links das páginas de vendas e botões", category: "carrinho" },
  { title: "[Pontual] Conferir disparos de e-mails para Lista Antiga", category: "carrinho" },
  { title: "[Pontual] Conferir no Data Studio Trackeamento da UTM", category: "carrinho" },
  { title: "[Pontual] Configurar Erro 404 para Página de Vendas", category: "carrinho" },
  
  // Pontuais - Evento/Ao Vivo
  { title: "[Pontual] Pausa das Campanhas de Captação e Aquecimento", category: "evento" },
  { title: "[Pontual] Redirecionar as Páginas para as Páginas de Captação", category: "evento" },
  { title: "[Pontual] Conferir links da transmissão no Youtube", category: "evento" },
  { title: "[Pontual] Ativar chat do Youtube somente para inscritos", category: "evento" },
  { title: "[Pontual] Trocar link da BIO do Youtube", category: "evento" },
  { title: "[Pontual] Conferir o teste e-mails de AO VIVO", category: "evento" },
  { title: "[Pontual] Conferir os link de todos e-mails de AO VIVO", category: "evento" },
  { title: "[Pontual] Redirecionar todas páginas para Blog de Lançamento", category: "evento" },
  { title: "[Pontual] Analisar as fontes de leads por UTM no datastudio", category: "evento" },
  { title: "[Pontual] Documentar os erros encontrados no Pré-Lançamento", category: "evento" },
  
  // Pontuais - Captação
  { title: "[Pontual] Conferir o disparo teste de todos e-mails de convite", category: "captacao" },
  { title: "[Pontual] Conferir Links da campanha de Tráfego", category: "captacao" },
  { title: "[Pontual] Conferir todos links dos e-mails de convite", category: "captacao" },
  { title: "[Pontual] Testar Página de Captura (Desktop e Mobile)", category: "captacao" },
  { title: "[Pontual] Testar Página de Obrigado e Redirect Wpp (Desktop e Mobile)", category: "captacao" },
  { title: "[Pontual] Conferir todas UTMs no DataStudio (quente, frio, whatsapp, e-mail, stories)", category: "captacao" },
  { title: "[Pontual] Configurar Erro 404 para Página de Captura", category: "captacao" },
  { title: "[Pontual] Conferir legendas dos criativos tráfego", category: "captacao" },
];

// Itens específicos para Evento Presencial
const EVENTO_PRESENCIAL_ITEMS = [
  // 1. Planejamento estratégico do evento
  { title: "Definir objetivo principal do evento (venda, relacionamento, autoridade, comunidade)", category: "planejamento" },
  { title: "Definir produto principal e produtos secundários a serem vendidos", category: "planejamento" },
  { title: "Definir meta de faturamento total", category: "planejamento" },
  { title: "Definir meta de participantes presenciais", category: "planejamento" },
  { title: "Definir ticket médio esperado", category: "planejamento" },
  { title: "Definir data oficial e possíveis datas alternativas", category: "planejamento" },
  { title: "Definir cidade e público prioritário", category: "planejamento" },
  { title: "Definir orçamento macro do evento", category: "planejamento" },
  { title: "Definir ROI mínimo aceitável", category: "planejamento" },
  { title: "Criar cronograma macro do evento (D-90, D-60, D-30, D-15, D-7, D-day, D+1)", category: "planejamento" },
  
  // 2. Estrutura comercial e vendas
  { title: "Criar oferta do evento (copy, promessa, bônus)", category: "comercial" },
  { title: "Definir política de descontos e cortesias", category: "comercial" },
  { title: "Configurar produto e checkout (Hotmart ou outro)", category: "comercial" },
  { title: "Criar página de vendas ou página de inscrição", category: "comercial" },
  { title: "Criar página de obrigado com próximos passos", category: "comercial" },
  { title: "Criar planilha ou dashboard de vendas", category: "comercial" },
  { title: "Definir metas semanais de vendas", category: "comercial" },
  { title: "Criar rotina semanal de acompanhamento: vendas x meta", category: "comercial" },
  { title: "Criar gatilhos de ação quando a meta semanal estiver abaixo do esperado", category: "comercial" },
  { title: "Definir responsáveis pelo comercial", category: "comercial" },
  { title: "Definir fluxo de cobrança, confirmação e pós-venda", category: "comercial" },
  { title: "Criar lista de convidados estratégicos", category: "comercial" },
  { title: "Criar processo de convite manual para convidados VIP", category: "comercial" },
  
  // 3. Captação e marketing
  { title: "Definir estratégia de tráfego pago", category: "marketing" },
  { title: "Definir orçamento de mídia", category: "marketing" },
  { title: "Criar criativos de captação", category: "marketing" },
  { title: "Criar criativos de remarketing", category: "marketing" },
  { title: "Criar campanha para público quente", category: "marketing" },
  { title: "Criar campanha para público frio", category: "marketing" },
  { title: "Criar rotina semanal de análise de métricas (CPL, CPA, conversão)", category: "marketing" },
  { title: "Criar calendário de conteúdos orgânicos", category: "marketing" },
  { title: "Criar calendário de stories de aquecimento", category: "marketing" },
  { title: "Criar mensagens de WhatsApp e e-mail marketing", category: "marketing" },
  { title: "Criar contagem regressiva para o evento", category: "marketing" },
  { title: "Criar comunicação de últimas vagas", category: "marketing" },
  { title: "Criar comunicação de virada de lote", category: "marketing" },
  
  // 4. Confirmação e check-in de participantes
  { title: "Criar formulário de confirmação de presença", category: "checkin" },
  { title: "Criar lista oficial de inscritos confirmados", category: "checkin" },
  { title: "Criar comunicação automática de confirmação", category: "checkin" },
  { title: "Criar comunicação de reforço semanal", category: "checkin" },
  { title: "Criar comunicação D-7, D-3 e D-1", category: "checkin" },
  { title: "Criar grupo de WhatsApp do evento", category: "checkin" },
  { title: "Definir responsável pelo check-in", category: "checkin" },
  { title: "Criar lista de check-in (QR code ou nome)", category: "checkin" },
  { title: "Definir política de atrasos e entradas", category: "checkin" },
  { title: "Criar plano de contingência para no-show", category: "checkin" },
  
  // 5. Local e infraestrutura
  { title: "Pesquisar locais possíveis", category: "local" },
  { title: "Visitar locais pré-selecionados", category: "local" },
  { title: "Analisar capacidade, acesso e estacionamento", category: "local" },
  { title: "Definir layout do evento", category: "local" },
  { title: "Definir necessidades de palco, cadeiras e mesas", category: "local" },
  { title: "Definir necessidades de audiovisual", category: "local" },
  { title: "Contratar fornecedor de audiovisual", category: "local" },
  { title: "Contratar internet dedicada", category: "local" },
  { title: "Definir iluminação", category: "local" },
  { title: "Definir climatização", category: "local" },
  { title: "Solicitar contrato do local", category: "local" },
  { title: "Validar formas de pagamento", category: "local" },
  { title: "Confirmar datas e horários de montagem", category: "local" },
  { title: "Confirmar datas e horários de desmontagem", category: "local" },
  
  // 6. Fornecedores e parceiros
  { title: "Definir fornecedores de A&B", category: "fornecedores" },
  { title: "Definir cardápio e quantidades", category: "fornecedores" },
  { title: "Definir horários de serviço", category: "fornecedores" },
  { title: "Validar restrições alimentares", category: "fornecedores" },
  { title: "Definir brindes do evento", category: "fornecedores" },
  { title: "Cotar brindes", category: "fornecedores" },
  { title: "Comprar brindes", category: "fornecedores" },
  { title: "Organizar personalização dos brindes", category: "fornecedores" },
  { title: "Definir fornecedores gráficos", category: "fornecedores" },
  { title: "Criar e imprimir materiais físicos", category: "fornecedores" },
  { title: "Criar crachás e sinalização", category: "fornecedores" },
  { title: "Definir fotógrafo e videomaker", category: "fornecedores" },
  { title: "Alinhar briefing com fornecedores", category: "fornecedores" },
  { title: "Confirmar presença de todos os fornecedores D-3", category: "fornecedores" },
  
  // 7. Patrocinadores
  { title: "Definir cotas de patrocínio", category: "patrocinadores" },
  { title: "Criar proposta comercial de patrocínio", category: "patrocinadores" },
  { title: "Criar lista de patrocinadores potenciais", category: "patrocinadores" },
  { title: "Iniciar prospecção ativa", category: "patrocinadores" },
  { title: "Criar formulário de indicação de patrocinadores", category: "patrocinadores" },
  { title: "Fazer follow-up semanal com patrocinadores", category: "patrocinadores" },
  { title: "Fechar contratos de patrocínio", category: "patrocinadores" },
  { title: "Receber materiais dos patrocinadores", category: "patrocinadores" },
  { title: "Garantir entregas prometidas (logo, fala, espaço)", category: "patrocinadores" },
  { title: "Alinhar presença dos patrocinadores no evento", category: "patrocinadores" },
  
  // 8. Time e operação no dia
  { title: "Definir líder geral do evento", category: "operacao" },
  { title: "Definir responsáveis por área (check-in, palco, A&B, bastidores)", category: "operacao" },
  { title: "Criar escala do time", category: "operacao" },
  { title: "Criar grupo operacional interno", category: "operacao" },
  { title: "Criar roteiro do evento minuto a minuto", category: "operacao" },
  { title: "Definir horários de chegada do time", category: "operacao" },
  { title: "Realizar reunião de alinhamento final", category: "operacao" },
  { title: "Criar plano de contingência (energia, internet, atrasos)", category: "operacao" },
  { title: "Definir ponto focal para resolução de problemas", category: "operacao" },
  
  // 9. Pós-evento
  { title: "Fazer fechamento financeiro", category: "pos_evento" },
  { title: "Analisar ROI do evento", category: "pos_evento" },
  { title: "Consolidar lista de presença real", category: "pos_evento" },
  { title: "Disparar pesquisa de satisfação", category: "pos_evento" },
  { title: "Organizar materiais gravados", category: "pos_evento" },
  { title: "Criar follow-up comercial pós-evento", category: "pos_evento" },
  { title: "Criar oferta pós-evento", category: "pos_evento" },
  { title: "Agradecer participantes", category: "pos_evento" },
  { title: "Agradecer patrocinadores", category: "pos_evento" },
  { title: "Registrar aprendizados e melhorias", category: "pos_evento" },
  { title: "Atualizar checklist para próximos eventos", category: "pos_evento" },
];

const CATEGORIES: Record<string, { label: string; color: string }> = {
  // Categorias padrão
  diario: { label: "Atividades Diárias", color: "bg-blue-500" },
  carrinho: { label: "Carrinho de Vendas", color: "bg-emerald-500" },
  evento: { label: "Evento / Ao Vivo", color: "bg-purple-500" },
  captacao: { label: "Captação", color: "bg-amber-500" },
  custom: { label: "Personalizados", color: "bg-gray-500" },
  // Categorias de Evento Presencial
  planejamento: { label: "1. Planejamento Estratégico", color: "bg-indigo-500" },
  comercial: { label: "2. Estrutura Comercial e Vendas", color: "bg-emerald-500" },
  marketing: { label: "3. Captação e Marketing", color: "bg-orange-500" },
  checkin: { label: "4. Confirmação e Check-in", color: "bg-cyan-500" },
  local: { label: "5. Local e Infraestrutura", color: "bg-violet-500" },
  fornecedores: { label: "6. Fornecedores e Parceiros", color: "bg-pink-500" },
  patrocinadores: { label: "7. Patrocinadores", color: "bg-yellow-500" },
  operacao: { label: "8. Time e Operação no Dia", color: "bg-red-500" },
  pos_evento: { label: "9. Pós-Evento", color: "bg-teal-500" },
};

export function FunnelChecklist({ funnelId, funnelCategory }: FunnelChecklistProps) {
  const { data: items = [], isLoading, refetch } = useFunnelChecklist(funnelId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [newItem, setNewItem] = useState("");
  const [isAddingDefaults, setIsAddingDefaults] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string } | null>(null);
  
  // Expandir categorias padrão baseado no tipo de funil
  const defaultExpanded = funnelCategory === "Evento presencial" 
    ? new Set(["planejamento", "custom"]) 
    : new Set(["diario", "custom"]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(defaultExpanded);

  // Determina os itens padrão baseado na categoria
  const getDefaultItemsForCategory = () => {
    if (funnelCategory === "Evento presencial") {
      return EVENTO_PRESENCIAL_ITEMS;
    }
    return DEFAULT_CHECKLIST_ITEMS;
  };

  // Auto-adicionar itens padrão quando o checklist estiver vazio
  useEffect(() => {
    const autoAddItems = async () => {
      if (!isLoading && items.length === 0 && !isAddingDefaults) {
        await addDefaultItemsSilent();
      }
    };
    autoAddItems();
  }, [isLoading, items.length]);

  // Versão silenciosa sem toast de sucesso para auto-add
  const addDefaultItemsSilent = async () => {
    setIsAddingDefaults(true);
    try {
      const defaultItems = getDefaultItemsForCategory();
      const { error } = await supabase
        .from("funnel_checklist")
        .insert(
          defaultItems.map((item, index) => ({
            funnel_id: funnelId,
            title: item.title,
            description: item.category,
            order_index: index,
          }))
        );

      if (error) throw error;
      refetch();
    } catch (error: any) {
      console.error("Erro ao adicionar itens padrão:", error.message);
    } finally {
      setIsAddingDefaults(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleItem = async (item: { id: string; is_completed: boolean | null }) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        funnelId,
        is_completed: !item.is_completed,
      });
    } catch {
      toast.error("Erro ao atualizar item");
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index || 0)) : -1;
      await createItem.mutateAsync({
        funnel_id: funnelId,
        title: newItem.trim(),
        order_index: maxOrder + 1,
      });
      setNewItem("");
      toast.success("Item adicionado!");
    } catch {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ id, funnelId });
      toast.success("Item removido!");
    } catch {
      toast.error("Erro ao remover item");
    }
  };

  const addDefaultItems = async () => {
    setIsAddingDefaults(true);
    try {
      const existingTitles = new Set(items.map(i => i.title));
      const defaultItems = getDefaultItemsForCategory();
      const itemsToAdd = defaultItems.filter(item => !existingTitles.has(item.title));

      if (itemsToAdd.length === 0) {
        toast.info("Todos os itens padrão já foram adicionados!");
        setIsAddingDefaults(false);
        return;
      }

      const { error } = await supabase
        .from("funnel_checklist")
        .insert(
          itemsToAdd.map((item, index) => ({
            funnel_id: funnelId,
            title: item.title,
            description: item.category,
            order_index: items.length + index,
          }))
        );

      if (error) throw error;
      toast.success(`${itemsToAdd.length} itens adicionados!`);
      refetch();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setIsAddingDefaults(false);
    }
  };

  const deleteAllItems = async () => {
    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from("funnel_checklist")
        .delete()
        .eq("funnel_id", funnelId);

      if (error) throw error;
      toast.success("Checklist limpo!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao limpar checklist: " + error.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openConvertModal = (item: { id: string; title: string }) => {
    setSelectedItem(item);
    setConvertModalOpen(true);
  };

  const getItemCategory = (title: string): string => {
    if (title.includes("[Diário]")) return "diario";
    // Primeiro verifica nos itens de evento presencial
    const eventoItem = EVENTO_PRESENCIAL_ITEMS.find(i => i.title === title);
    if (eventoItem) return eventoItem.category;
    // Depois nos itens padrão
    const defaultItem = DEFAULT_CHECKLIST_ITEMS.find(i => i.title === title);
    return defaultItem?.category || "custom";
  };

  const groupedItems = items.reduce((acc, item) => {
    const category = getItemCategory(item.title);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-accent" />
            Checklist Operacional
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length}
            </span>
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={isDeletingAll}
                  >
                    {isDeletingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eraser className="h-3.5 w-3.5" />
                    )}
                    Limpar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar checklist?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover todos os {items.length} itens do checklist.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAllItems} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={addDefaultItems}
              disabled={isAddingDefaults}
              className="gap-1.5"
            >
              {isAddingDefaults ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              Adicionar Padrões
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar item personalizado..."
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Button 
            size="icon" 
            onClick={addItem} 
            disabled={!newItem.trim() || createItem.isPending}
          >
            {createItem.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="mb-3">Checklist vazio</p>
            <Button variant="outline" onClick={addDefaultItems} disabled={isAddingDefaults} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Adicionar itens padrão
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(CATEGORIES).map(([categoryKey, categoryInfo]) => {
              const categoryItems = groupedItems[categoryKey] || [];
              if (categoryItems.length === 0) return null;

              const completedInCategory = categoryItems.filter(i => i.is_completed).length;

              return (
                <Collapsible
                  key={categoryKey}
                  open={expandedCategories.has(categoryKey)}
                  onOpenChange={() => toggleCategory(categoryKey)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent/5 transition-colors">
                    {expandedCategories.has(categoryKey) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Badge className={cn("text-white text-[10px]", categoryInfo.color)}>
                      {categoryInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {completedInCategory}/{categoryItems.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1 ml-4">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/5 transition-colors group border border-transparent hover:border-border"
                      >
                        <Checkbox
                          checked={item.is_completed || false}
                          onCheckedChange={() => toggleItem(item)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-sm",
                            item.is_completed && "line-through text-muted-foreground"
                          )}>
                            {item.title.replace(/^\[(Diário|Pontual)\]\s*/i, "")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary"
                            onClick={() => openConvertModal({ id: item.id, title: item.title })}
                            title="Converter em tarefa"
                          >
                            <ListTodo className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Excluir item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      <ConvertToTaskModal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        checklistItem={selectedItem}
        funnelId={funnelId}
        onSuccess={refetch}
      />
    </Card>
  );
}
