import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, CalendarDays, Pencil, Check, X } from "lucide-react";
import { FunnelData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelOperationalDatesProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

const DATE_SECTIONS = [
  { groupKey: "captacao", defaultLabel: "Captação", fields: [
    { key: "captacao_start", subLabel: "Início" },
    { key: "captacao_end", subLabel: "Fim" },
  ]},
  { groupKey: "aquecimento", defaultLabel: "Aquecimento", fields: [
    { key: "aquecimento_start", subLabel: "Início" },
    { key: "aquecimento_end", subLabel: "Fim" },
  ]},
  { groupKey: "cpl", defaultLabel: "CPL", fields: [
    { key: "cpl_start", subLabel: "Início" },
    { key: "cpl_end", subLabel: "Fim" },
  ]},
  { groupKey: "lembrete", defaultLabel: "Lembrete", fields: [
    { key: "lembrete_start", subLabel: "Início" },
  ]},
  { groupKey: "carrinho", defaultLabel: "Carrinho", fields: [
    { key: "carrinho_start", subLabel: "Início" },
  ]},
  { groupKey: "fechamento", defaultLabel: "Fechamento", fields: [
    { key: "fechamento_date", subLabel: "Data" },
  ]},
];

export function FunnelOperationalDates({ funnel, onUpdate }: FunnelOperationalDatesProps) {
  const dateLabels: Record<string, string> = (funnel as any).date_labels || {};

  const [formData, setFormData] = useState({
    captacao_start: funnel.captacao_start || "",
    captacao_end: funnel.captacao_end || "",
    aquecimento_start: funnel.aquecimento_start || "",
    aquecimento_end: funnel.aquecimento_end || "",
    cpl_start: funnel.cpl_start || "",
    cpl_end: funnel.cpl_end || "",
    lembrete_start: funnel.lembrete_start || "",
    carrinho_start: funnel.carrinho_start || "",
    fechamento_date: funnel.fechamento_date || "",
  });
  const [saving, setSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");

  const getLabel = (groupKey: string, defaultLabel: string) => dateLabels[`op_${groupKey}`] || defaultLabel;

  const handleSaveLabel = async (groupKey: string) => {
    const newLabel = editLabelValue.trim();
    if (!newLabel) { setEditingGroup(null); return; }

    try {
      const updatedLabels = { ...dateLabels, [`op_${groupKey}`]: newLabel };
      const { error } = await supabase
        .from("funnels")
        .update({ date_labels: updatedLabels })
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success("Nome atualizado!");
      setEditingGroup(null);
      onUpdate();
    } catch {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value || null])
      );

      const { error } = await supabase
        .from("funnels")
        .update(dataToSave)
        .eq("id", funnel.id);

      if (error) throw error;
      toast.success("Datas salvas!");
      onUpdate();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          Datas Operacionais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DATE_SECTIONS.map((section) => (
            <div key={section.groupKey} className="space-y-3">
              <div className="flex items-center gap-1.5 group">
                {editingGroup === section.groupKey ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      value={editLabelValue}
                      onChange={(e) => setEditLabelValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveLabel(section.groupKey);
                        if (e.key === "Escape") setEditingGroup(null);
                      }}
                      className="h-6 text-sm font-medium px-1 py-0 w-32"
                    />
                    <button onClick={() => handleSaveLabel(section.groupKey)} className="text-emerald-500 hover:text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingGroup(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Label className="text-sm font-medium">
                      {getLabel(section.groupKey, section.defaultLabel)}
                    </Label>
                    <button
                      onClick={() => {
                        setEditingGroup(section.groupKey);
                        setEditLabelValue(getLabel(section.groupKey, section.defaultLabel));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      title="Renomear"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
              <div className={`grid grid-cols-${section.fields.length > 1 ? 2 : 1} gap-2`}>
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.subLabel}</Label>
                    <Input
                      type="date"
                      value={(formData as any)[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
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