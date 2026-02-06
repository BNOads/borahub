import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Target, Percent, Plus, Trash2, Loader2 } from "lucide-react";
import { FunnelData, formatCurrency } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useFunnelBudgetCategories,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from "@/hooks/useFunnelBudgetCategories";

interface FunnelGoalsProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

const COLOR_OPTIONS = [
  { value: "bg-gray-500", label: "Cinza" },
  { value: "bg-red-500", label: "Vermelho" },
  { value: "bg-orange-500", label: "Laranja" },
  { value: "bg-amber-500", label: "Âmbar" },
  { value: "bg-yellow-500", label: "Amarelo" },
  { value: "bg-lime-500", label: "Lima" },
  { value: "bg-green-500", label: "Verde" },
  { value: "bg-emerald-500", label: "Esmeralda" },
  { value: "bg-teal-500", label: "Teal" },
  { value: "bg-cyan-500", label: "Ciano" },
  { value: "bg-sky-500", label: "Céu" },
  { value: "bg-blue-500", label: "Azul" },
  { value: "bg-indigo-500", label: "Índigo" },
  { value: "bg-violet-500", label: "Violeta" },
  { value: "bg-purple-500", label: "Roxo" },
  { value: "bg-fuchsia-500", label: "Fúcsia" },
  { value: "bg-pink-500", label: "Rosa" },
  { value: "bg-rose-500", label: "Rosé" },
];

export function FunnelGoals({ funnel, onUpdate }: FunnelGoalsProps) {
  const [formData, setFormData] = useState({
    predicted_investment: funnel.predicted_investment || 0,
    ticket_medio: funnel.ticket_medio || 0,
    leads_goal: funnel.leads_goal || 0,
    cpl_goal: funnel.cpl_goal || 0,
    budget_captacao_percent: funnel.budget_captacao_percent || 0,
    budget_aquecimento_percent: funnel.budget_aquecimento_percent || 0,
    budget_evento_percent: funnel.budget_evento_percent || 0,
    budget_venda_percent: funnel.budget_venda_percent || 0,
    budget_lembrete_percent: funnel.budget_lembrete_percent || 0,
    budget_impulsionamento_percent: funnel.budget_impulsionamento_percent || 0,
  });

  const [displayValues, setDisplayValues] = useState({
    predicted_investment: formatCurrency(funnel.predicted_investment),
    ticket_medio: formatCurrency(funnel.ticket_medio),
    cpl_goal: formatCurrency(funnel.cpl_goal),
  });

  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // Custom budget categories
  const { data: customCategories = [] } = useFunnelBudgetCategories(funnel.id);
  const createCategory = useCreateBudgetCategory();
  const updateCategory = useUpdateBudgetCategory();
  const deleteCategory = useDeleteBudgetCategory();

  const handleCurrencyChange = (field: keyof typeof displayValues, rawValue: string) => {
    const numericStr = rawValue.replace(/\D/g, "");
    const numericValue = numericStr ? parseFloat(numericStr) / 100 : 0;

    setFormData({ ...formData, [field]: numericValue });
    setDisplayValues({
      ...displayValues,
      [field]: numericValue > 0 ? formatCurrency(numericValue) : "",
    });
  };

  const handlePercentChange = (field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const clampedValue = Math.min(100, Math.max(0, numericValue));
    setFormData({ ...formData, [field]: clampedValue });
  };

  const fixedPercent =
    formData.budget_captacao_percent +
    formData.budget_aquecimento_percent +
    formData.budget_evento_percent +
    formData.budget_venda_percent +
    formData.budget_lembrete_percent +
    formData.budget_impulsionamento_percent;

  const customPercent = customCategories.reduce((sum, c) => sum + (c.percent || 0), 0);
  const totalPercent = fixedPercent + customPercent;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("funnels")
        .update(formData)
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success("Metas salvas!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getValueFromPercent = (percent: number) => {
    return (formData.predicted_investment * percent) / 100;
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      await createCategory.mutateAsync({
        funnel_id: funnel.id,
        name,
        percent: 0,
        color: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].value,
        order_index: customCategories.length,
      });
      setNewCategoryName("");
      setAddingCategory(false);
      toast.success("Categoria criada!");
    } catch {
      toast.error("Erro ao criar categoria");
    }
  };

  const handleUpdateCategoryPercent = async (id: string, value: string) => {
    const numericValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
    try {
      await updateCategory.mutateAsync({
        id,
        funnelId: funnel.id,
        percent: numericValue,
      });
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleUpdateCategoryName = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await updateCategory.mutateAsync({
        id,
        funnelId: funnel.id,
        name: name.trim(),
      });
    } catch {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync({ id, funnelId: funnel.id });
      toast.success("Categoria removida!");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          Metas e Verba
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Verba Total</Label>
            <Input
              value={displayValues.predicted_investment}
              onChange={(e) => handleCurrencyChange("predicted_investment", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Ticket Médio</Label>
            <Input
              value={displayValues.ticket_medio}
              onChange={(e) => handleCurrencyChange("ticket_medio", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta de Leads</Label>
            <Input
              type="number"
              value={formData.leads_goal || ""}
              onChange={(e) => setFormData({ ...formData, leads_goal: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta CPL</Label>
            <Input
              value={displayValues.cpl_goal}
              onChange={(e) => handleCurrencyChange("cpl_goal", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Distribuição de Verba por Etapa (%)
            </Label>
            <span className={`text-sm font-bold ${
              totalPercent === 100
                ? "text-primary"
                : totalPercent > 100
                ? "text-destructive"
                : "text-muted-foreground"
            }`}>
              Total: {totalPercent}%
            </span>
          </div>

          {/* Categorias fixas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: "budget_captacao_percent", label: "Captação" },
              { key: "budget_aquecimento_percent", label: "Aquecimento" },
              { key: "budget_evento_percent", label: "Evento" },
              { key: "budget_venda_percent", label: "Venda" },
              { key: "budget_lembrete_percent", label: "Lembrete" },
              { key: "budget_impulsionamento_percent", label: "Impulsionamento" },
            ].map((item) => (
              <div key={item.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{item.label}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={(formData as any)[item.key] || ""}
                    onChange={(e) => handlePercentChange(item.key, e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(getValueFromPercent((formData as any)[item.key]))}
                </p>
              </div>
            ))}
          </div>

          {/* Categorias customizadas */}
          {customCategories.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs text-muted-foreground mb-3 block">Categorias Personalizadas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {customCategories.map((cat) => (
                  <div key={cat.id} className="space-y-1 group relative">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${cat.color} flex-shrink-0`} />
                      <Input
                        defaultValue={cat.name}
                        onBlur={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                        className="h-5 text-xs border-none p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={cat.percent || ""}
                        onBlur={(e) => handleUpdateCategoryPercent(cat.id, e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(getValueFromPercent(cat.percent || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar nova categoria */}
          <div className="mt-3">
            {addingCategory ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da categoria..."
                  className="h-8 text-sm max-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 gap-1"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || createCategory.isPending}
                >
                  {createCategory.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Criar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCategory(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Categoria de Gasto
              </Button>
            )}
          </div>

          {totalPercent !== 100 && formData.predicted_investment > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {totalPercent < 100
                ? `Faltam ${100 - totalPercent}% (${formatCurrency(getValueFromPercent(100 - totalPercent))}) para alocar`
                : `${totalPercent - 100}% (${formatCurrency(getValueFromPercent(totalPercent - 100))}) acima do orçamento`}
            </p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
