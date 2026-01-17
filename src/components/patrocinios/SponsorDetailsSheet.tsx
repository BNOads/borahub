import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sponsor, SponsorEvent, SponsorStageHistory, SPONSOR_STAGES, BRAZILIAN_STATES, UpdateSponsorData } from '@/hooks/useSponsors';
import { MapPin, Phone, Mail, User, Calendar, Clock, ArrowRight, Trash2, Link2, Unlink, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface SponsorDetailsSheetProps {
  sponsor: Sponsor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: UpdateSponsorData) => void;
  onDelete: (id: string) => void;
  onLinkEvent: (sponsorId: string, eventId: string) => void;
  onUnlinkEvent: (sponsorId: string, eventId: string) => void;
  fetchHistory: (sponsorId: string) => Promise<SponsorStageHistory[]>;
  events: SponsorEvent[];
}

export function SponsorDetailsSheet({
  sponsor,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onLinkEvent,
  onUnlinkEvent,
  fetchHistory,
  events,
}: SponsorDetailsSheetProps) {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<SponsorStageHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editData, setEditData] = useState<UpdateSponsorData>({});

  useEffect(() => {
    if (sponsor && open) {
      setLoadingHistory(true);
      fetchHistory(sponsor.id)
        .then(setHistory)
        .finally(() => setLoadingHistory(false));
      setEditData({
        name: sponsor.name,
        contact_name: sponsor.contact_name || '',
        contact_phone: sponsor.contact_phone || '',
        contact_email: sponsor.contact_email || '',
        city: sponsor.city,
        state: sponsor.state,
        segment: sponsor.segment,
        additional_info: sponsor.additional_info || '',
        last_contact_date: sponsor.last_contact_date || '',
        last_contact_notes: sponsor.last_contact_notes || '',
        next_action: sponsor.next_action || '',
        next_followup_date: sponsor.next_followup_date || '',
      });
    }
  }, [sponsor, open, fetchHistory]);

  if (!sponsor) return null;

  const stage = SPONSOR_STAGES.find(s => s.id === sponsor.stage);
  const linkedEventIds = sponsor.events?.map(e => e.id) || [];
  const availableEvents = events.filter(e => !linkedEventIds.includes(e.id));

  const handleSave = () => {
    onUpdate(sponsor.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: sponsor.name,
      contact_name: sponsor.contact_name || '',
      contact_phone: sponsor.contact_phone || '',
      contact_email: sponsor.contact_email || '',
      city: sponsor.city,
      state: sponsor.state,
      segment: sponsor.segment,
      additional_info: sponsor.additional_info || '',
      last_contact_date: sponsor.last_contact_date || '',
      last_contact_notes: sponsor.last_contact_notes || '',
      next_action: sponsor.next_action || '',
      next_followup_date: sponsor.next_followup_date || '',
    });
    setIsEditing(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{sponsor.name}</SheetTitle>
              <Badge className={stage?.color}>{stage?.name}</Badge>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="icon" variant="ghost" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="gold" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Dados cadastrais */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dados Cadastrais
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={editData.city || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select
                        value={editData.state}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, state: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Segmento</Label>
                    <Input
                      value={editData.segment || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, segment: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Nome do Contato</Label>
                    <Input
                      value={editData.contact_name || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, contact_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={editData.contact_phone || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        value={editData.contact_email || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Informações Adicionais</Label>
                    <Textarea
                      value={editData.additional_info || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, additional_info: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{sponsor.city}/{sponsor.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{sponsor.segment}</Badge>
                  </div>
                  {sponsor.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{sponsor.contact_name}</span>
                    </div>
                  )}
                  {sponsor.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{sponsor.contact_phone}</span>
                    </div>
                  )}
                  {sponsor.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{sponsor.contact_email}</span>
                    </div>
                  )}
                  {sponsor.additional_info && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {sponsor.additional_info}
                    </p>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* Último contato e próxima ação */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Acompanhamento
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data Último Contato</Label>
                      <Input
                        type="date"
                        value={editData.last_contact_date || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, last_contact_date: e.target.value || null }))}
                      />
                    </div>
                    <div>
                      <Label>Próximo Follow-up</Label>
                      <Input
                        type="date"
                        value={editData.next_followup_date || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, next_followup_date: e.target.value || null }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notas do Último Contato</Label>
                    <Textarea
                      value={editData.last_contact_notes || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, last_contact_notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Próxima Ação</Label>
                    <Input
                      value={editData.next_action || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, next_action: e.target.value }))}
                      placeholder="Ex: Enviar proposta comercial"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sponsor.last_contact_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Último contato</p>
                      <p className="text-sm">
                        {format(new Date(sponsor.last_contact_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      {sponsor.last_contact_notes && (
                        <p className="text-sm text-muted-foreground mt-1">{sponsor.last_contact_notes}</p>
                      )}
                    </div>
                  )}
                  {sponsor.next_followup_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Próximo follow-up</p>
                      <p className="text-sm font-medium">
                        {format(new Date(sponsor.next_followup_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {sponsor.next_action && (
                    <div>
                      <p className="text-xs text-muted-foreground">Próxima ação</p>
                      <p className="text-sm">{sponsor.next_action}</p>
                    </div>
                  )}
                  {!sponsor.last_contact_date && !sponsor.next_followup_date && !sponsor.next_action && (
                    <p className="text-sm text-muted-foreground">Nenhum acompanhamento registrado</p>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* Eventos vinculados */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Eventos Vinculados
              </h3>
              
              <div className="space-y-2">
                {sponsor.events && sponsor.events.length > 0 ? (
                  sponsor.events.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: event.color }}
                        />
                        <span className="text-sm">{event.name}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onUnlinkEvent(sponsor.id, event.id)}
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum evento vinculado</p>
                )}
                
                {availableEvents.length > 0 && (
                  <Select onValueChange={(eventId) => onLinkEvent(sponsor.id, eventId)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Vincular a evento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvents.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: event.color }}
                            />
                            {event.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </section>

            <Separator />

            {/* Histórico de movimentações */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Histórico de Movimentações
              </h3>
              
              {loadingHistory ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item) => {
                    const prevStage = SPONSOR_STAGES.find(s => s.id === item.previous_stage);
                    const newStage = SPONSOR_STAGES.find(s => s.id === item.new_stage);
                    
                    return (
                      <div key={item.id} className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.previous_stage ? (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  {prevStage?.name || item.previous_stage}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            ) : null}
                            <Badge className={`text-xs ${newStage?.color}`}>
                              {newStage?.name || item.new_stage}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.changed_by_name} • {format(new Date(item.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
              )}
            </section>

            {/* Ações */}
            {isAdmin && (
              <>
                <Separator />
                <section>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Patrocinador
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir patrocinador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O patrocinador "{sponsor.name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDelete(sponsor.id);
                            onOpenChange(false);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
