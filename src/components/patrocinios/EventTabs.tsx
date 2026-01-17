import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SponsorEvent } from '@/hooks/useSponsors';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EventTabsProps {
  events: SponsorEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onCreateEvent: (data: { name: string; description?: string; color?: string }) => void;
}

const EVENT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export function EventTabs({ events, selectedEventId, onSelectEvent, onCreateEvent }: EventTabsProps) {
  const { isAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0]);

  const handleCreateEvent = () => {
    if (!newEventName.trim()) return;
    onCreateEvent({ name: newEventName, color: newEventColor });
    setNewEventName('');
    setNewEventColor(EVENT_COLORS[0]);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <Tabs value={selectedEventId || 'all'} onValueChange={(value) => onSelectEvent(value === 'all' ? null : value)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              Todos os patrocinadores
            </TabsTrigger>
            {events.map(event => (
              <TabsTrigger key={event.id} value={event.id} className="gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: event.color }}
                />
                {event.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Criar Evento de Patrocínio</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Nome do Evento</Label>
              <Input
                id="event-name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Ex: Feira da Construção 2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor do Evento</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewEventColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newEventColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="gold" onClick={handleCreateEvent} disabled={!newEventName.trim()}>
                Criar Evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
