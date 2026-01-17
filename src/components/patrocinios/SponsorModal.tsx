import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRAZILIAN_STATES, SPONSOR_STAGES, CreateSponsorData, SponsorEvent } from '@/hooks/useSponsors';

interface SponsorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateSponsorData) => void;
  initialStage?: string;
  eventId?: string | null;
  events?: SponsorEvent[];
  isLoading?: boolean;
}

const COMMON_SEGMENTS = [
  'Construção Civil',
  'Materiais de Construção',
  'Ferramentas',
  'Equipamentos',
  'Decoração',
  'Imobiliário',
  'Financeiro',
  'Tecnologia',
  'Serviços',
  'Varejo',
  'Outro',
];

export function SponsorModal({
  open,
  onOpenChange,
  onSave,
  initialStage = 'possiveis_patrocinadores',
  eventId,
  events = [],
  isLoading = false,
}: SponsorModalProps) {
  const [formData, setFormData] = useState<CreateSponsorData>({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    additional_info: '',
    city: '',
    state: '',
    segment: '',
    stage: initialStage,
    event_id: eventId || undefined,
  });

  const [customSegment, setCustomSegment] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      stage: initialStage,
      event_id: eventId || undefined,
    }));
  }, [initialStage, eventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.state || !formData.segment) {
      return;
    }
    onSave(formData);
    // Reset form
    setFormData({
      name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      additional_info: '',
      city: '',
      state: '',
      segment: '',
      stage: initialStage,
      event_id: eventId || undefined,
    });
    setCustomSegment(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      additional_info: '',
      city: '',
      state: '',
      segment: '',
      stage: initialStage,
      event_id: eventId || undefined,
    });
    setCustomSegment(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Patrocinador</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do patrocinador */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Patrocinador *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Empresa ABC Ltda"
              required
            />
          </div>

          {/* Contato Principal */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Contato Principal</Label>
            <div className="grid grid-cols-1 gap-3">
              <Input
                placeholder="Nome do contato"
                value={formData.contact_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Telefone"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: São Paulo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Segmento */}
          <div className="space-y-2">
            <Label htmlFor="segment">Segmento *</Label>
            {customSegment ? (
              <div className="flex gap-2">
                <Input
                  value={formData.segment}
                  onChange={(e) => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                  placeholder="Digite o segmento"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomSegment(false);
                    setFormData(prev => ({ ...prev, segment: '' }));
                  }}
                >
                  Lista
                </Button>
              </div>
            ) : (
              <Select
                value={formData.segment}
                onValueChange={(value) => {
                  if (value === 'Outro') {
                    setCustomSegment(true);
                    setFormData(prev => ({ ...prev, segment: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, segment: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SEGMENTS.map(segment => (
                    <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Coluna inicial */}
          <div className="space-y-2">
            <Label htmlFor="stage">Coluna Inicial</Label>
            <Select
              value={formData.stage}
              onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPONSOR_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Evento */}
          {events.length > 0 && !eventId && (
            <div className="space-y-2">
              <Label htmlFor="event">Vincular a Evento (opcional)</Label>
              <Select
                value={formData.event_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  event_id: value === 'none' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum evento</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Informações adicionais */}
          <div className="space-y-2">
            <Label htmlFor="additional_info">Informações Adicionais</Label>
            <Textarea
              id="additional_info"
              value={formData.additional_info || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, additional_info: e.target.value }))}
              placeholder="Observações, histórico, potencial..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} variant="gold">
              {isLoading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
