import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, CalendarDays } from "lucide-react";
import { FunnelData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelOperationalDatesProps {
  funnel: FunnelData;
  onUpdate: () => void;
}

export function FunnelOperationalDates({ funnel, onUpdate }: FunnelOperationalDatesProps) {
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
          {/* Captação */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Captação</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={formData.captacao_start}
                  onChange={(e) => setFormData({ ...formData, captacao_start: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={formData.captacao_end}
                  onChange={(e) => setFormData({ ...formData, captacao_end: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Aquecimento */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Aquecimento</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={formData.aquecimento_start}
                  onChange={(e) => setFormData({ ...formData, aquecimento_start: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={formData.aquecimento_end}
                  onChange={(e) => setFormData({ ...formData, aquecimento_end: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* CPL */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">CPL</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={formData.cpl_start}
                  onChange={(e) => setFormData({ ...formData, cpl_start: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={formData.cpl_end}
                  onChange={(e) => setFormData({ ...formData, cpl_end: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Lembrete */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Lembrete</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Início</Label>
              <Input
                type="date"
                value={formData.lembrete_start}
                onChange={(e) => setFormData({ ...formData, lembrete_start: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Carrinho */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Carrinho</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Início</Label>
              <Input
                type="date"
                value={formData.carrinho_start}
                onChange={(e) => setFormData({ ...formData, carrinho_start: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Fechamento */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fechamento</Label>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={formData.fechamento_date}
                onChange={(e) => setFormData({ ...formData, fechamento_date: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
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
