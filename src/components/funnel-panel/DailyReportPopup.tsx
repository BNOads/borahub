import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, X } from "lucide-react";
import { usePendingDailyReports, useCreateDailyReport } from "@/hooks/useFunnelDailyReports";
import { useAuth } from "@/contexts/AuthContext";

export function DailyReportPopup() {
  const { user } = useAuth();
  const { data: pendingFunnels, isLoading } = usePendingDailyReports();
  const createReport = useCreateDailyReport();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [formData, setFormData] = useState({
    contacts: 0,
    followups: 0,
    reschedules: 0,
    meetings_scheduled: 0,
    meetings_held: 0,
    no_shows: 0,
    sales: 0,
    summary: "",
  });

  // Check if there are pending reports and show popup
  useEffect(() => {
    if (!isLoading && pendingFunnels && pendingFunnels.length > 0 && !dismissed) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [pendingFunnels, isLoading, dismissed]);

  // Reset form when changing funnel
  useEffect(() => {
    setFormData({
      contacts: 0,
      followups: 0,
      reschedules: 0,
      meetings_scheduled: 0,
      meetings_held: 0,
      no_shows: 0,
      sales: 0,
      summary: "",
    });
  }, [currentIndex]);

  if (!user || isLoading || !pendingFunnels || pendingFunnels.length === 0) {
    return null;
  }

  const currentFunnel = pendingFunnels[currentIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createReport.mutateAsync({
      funnel_id: currentFunnel.id,
      funnel_name: currentFunnel.name,
      report_date: new Date().toISOString().split("T")[0],
      ...formData,
    });

    // Move to next funnel or close
    if (currentIndex < pendingFunnels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Relatório Diário - {currentFunnel.name}
          </DialogTitle>
          <DialogDescription>
            Preencha o relatório do dia para este funil High Ticket.
            {pendingFunnels.length > 1 && (
              <span className="block mt-1 text-sm">
                Funil {currentIndex + 1} de {pendingFunnels.length}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="popup-contacts">Contatos</Label>
              <Input
                id="popup-contacts"
                type="number"
                min="0"
                value={formData.contacts}
                onChange={(e) => setFormData({ ...formData, contacts: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-followups">Follow-ups</Label>
              <Input
                id="popup-followups"
                type="number"
                min="0"
                value={formData.followups}
                onChange={(e) => setFormData({ ...formData, followups: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-reschedules">Reagendamentos</Label>
              <Input
                id="popup-reschedules"
                type="number"
                min="0"
                value={formData.reschedules}
                onChange={(e) => setFormData({ ...formData, reschedules: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-meetings_scheduled">Reuniões Agend.</Label>
              <Input
                id="popup-meetings_scheduled"
                type="number"
                min="0"
                value={formData.meetings_scheduled}
                onChange={(e) => setFormData({ ...formData, meetings_scheduled: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-meetings_held">Reuniões Real.</Label>
              <Input
                id="popup-meetings_held"
                type="number"
                min="0"
                value={formData.meetings_held}
                onChange={(e) => setFormData({ ...formData, meetings_held: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-no_shows">No-shows</Label>
              <Input
                id="popup-no_shows"
                type="number"
                min="0"
                value={formData.no_shows}
                onChange={(e) => setFormData({ ...formData, no_shows: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-sales">Vendas</Label>
              <Input
                id="popup-sales"
                type="number"
                min="0"
                value={formData.sales}
                onChange={(e) => setFormData({ ...formData, sales: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="popup-summary">Resumo do Dia</Label>
            <Textarea
              id="popup-summary"
              placeholder="Descreva as principais atividades e observações do dia..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleDismiss}>
              <X className="h-4 w-4 mr-2" />
              Preencher depois
            </Button>
            <Button type="submit" disabled={createReport.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Relatório
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
