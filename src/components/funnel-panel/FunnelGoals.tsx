import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Target, Percent } from "lucide-react";
import { FunnelData, formatCurrency } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelGoalsProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

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

  const totalPercent =
    formData.budget_captacao_percent +
    formData.budget_aquecimento_percent +
    formData.budget_evento_percent +
    formData.budget_venda_percent +
    formData.budget_lembrete_percent +
    formData.budget_impulsionamento_percent;

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
                ? "text-green-500"
                : totalPercent > 100
                ? "text-red-500"
                : "text-yellow-500"
            }`}>
              Total: {totalPercent}%
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Captação</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_captacao_percent || ""}
                  onChange={(e) => handlePercentChange("budget_captacao_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_captacao_percent))}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Aquecimento</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_aquecimento_percent || ""}
                  onChange={(e) => handlePercentChange("budget_aquecimento_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_aquecimento_percent))}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Evento</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_evento_percent || ""}
                  onChange={(e) => handlePercentChange("budget_evento_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_evento_percent))}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Venda</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_venda_percent || ""}
                  onChange={(e) => handlePercentChange("budget_venda_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_venda_percent))}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Lembrete</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_lembrete_percent || ""}
                  onChange={(e) => handlePercentChange("budget_lembrete_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_lembrete_percent))}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Impulsionamento</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.budget_impulsionamento_percent || ""}
                  onChange={(e) => handlePercentChange("budget_impulsionamento_percent", e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(getValueFromPercent(formData.budget_impulsionamento_percent))}
              </p>
            </div>
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
