import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Trash2, Loader2, Wand2, ChevronDown, ChevronRight } from "lucide-react";
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

interface FunnelChecklistProps {
  funnelId: string;
}

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

const CATEGORIES = {
  diario: { label: "Atividades Diárias", color: "bg-blue-500" },
  carrinho: { label: "Carrinho de Vendas", color: "bg-emerald-500" },
  evento: { label: "Evento / Ao Vivo", color: "bg-purple-500" },
  captacao: { label: "Captação", color: "bg-amber-500" },
  custom: { label: "Personalizados", color: "bg-gray-500" },
};

export function FunnelChecklist({ funnelId }: FunnelChecklistProps) {
  const { data: items = [], isLoading, refetch } = useFunnelChecklist(funnelId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [newItem, setNewItem] = useState("");
  const [isAddingDefaults, setIsAddingDefaults] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["diario", "custom"]));

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
      const itemsToAdd = DEFAULT_CHECKLIST_ITEMS.filter(item => !existingTitles.has(item.title));

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

  const getItemCategory = (title: string): string => {
    if (title.includes("[Diário]")) return "diario";
    const item = DEFAULT_CHECKLIST_ITEMS.find(i => i.title === title);
    return item?.category || "custom";
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
