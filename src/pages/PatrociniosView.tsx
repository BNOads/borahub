import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useSponsors, Sponsor } from '@/hooks/useSponsors';
import { SponsorKanban } from '@/components/patrocinios/SponsorKanban';
import { SponsorModal } from '@/components/patrocinios/SponsorModal';
import { SponsorDetailsSheet } from '@/components/patrocinios/SponsorDetailsSheet';
import { SponsorFilters } from '@/components/patrocinios/SponsorFilters';
import { EventTabs } from '@/components/patrocinios/EventTabs';
import { Plus } from 'lucide-react';
import { isToday, isBefore, isAfter, addDays, startOfDay } from 'date-fns';

export default function PatrociniosView() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalStage, setCreateModalStage] = useState('possiveis_patrocinadores');
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    segment: '',
    state: '',
    stage: '',
    followup: '',
  });

  const {
    sponsors,
    sponsorEvents,
    isLoading,
    fetchStageHistory,
    createSponsor,
    updateSponsor,
    moveSponsor,
    deleteSponsor,
    createEvent,
    linkSponsorToEvent,
    unlinkSponsorFromEvent,
  } = useSponsors(selectedEventId);

  // Get unique segments for filter
  const segments = useMemo(() => {
    const uniqueSegments = [...new Set(sponsors.map(s => s.segment))];
    return uniqueSegments.sort();
  }, [sponsors]);

  // Filter sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter(sponsor => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          sponsor.name.toLowerCase().includes(searchLower) ||
          sponsor.contact_name?.toLowerCase().includes(searchLower) ||
          sponsor.contact_email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Segment filter
      if (filters.segment && sponsor.segment !== filters.segment) return false;

      // State filter
      if (filters.state && sponsor.state !== filters.state) return false;

      // Stage filter
      if (filters.stage && sponsor.stage !== filters.stage) return false;

      // Follow-up filter
      if (filters.followup) {
        const followupDate = sponsor.next_followup_date ? new Date(sponsor.next_followup_date) : null;
        const today = startOfDay(new Date());
        const next7Days = addDays(today, 7);

        switch (filters.followup) {
          case 'today':
            if (!followupDate || !isToday(followupDate)) return false;
            break;
          case 'overdue':
            if (!followupDate || !isBefore(followupDate, today)) return false;
            break;
          case 'next7days':
            if (!followupDate || isBefore(followupDate, today) || isAfter(followupDate, next7Days)) return false;
            break;
          case 'none':
            if (followupDate) return false;
            break;
        }
      }

      return true;
    });
  }, [sponsors, filters]);

  const handleAddSponsor = (stage: string) => {
    setCreateModalStage(stage);
    setShowCreateModal(true);
  };

  const handleMoveSponsor = (sponsorId: string, previousStage: string, newStage: string) => {
    moveSponsor.mutate({ sponsorId, previousStage, newStage });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Patrocínios</h1>
          <p className="text-muted-foreground">Gerencie seus patrocinadores em um quadro Kanban</p>
        </div>
        <Button variant="gold" onClick={() => handleAddSponsor('possiveis_patrocinadores')}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Patrocinador
        </Button>
      </div>

      {/* Event tabs */}
      <EventTabs
        events={sponsorEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={setSelectedEventId}
        onCreateEvent={(data) => createEvent.mutate(data)}
      />

      {/* Filters */}
      <SponsorFilters
        filters={filters}
        onFiltersChange={setFilters}
        segments={segments}
        events={sponsorEvents}
      />

      {/* Kanban board */}
      <SponsorKanban
        sponsors={filteredSponsors}
        isLoading={isLoading}
        onMoveSponsor={handleMoveSponsor}
        onAddSponsor={handleAddSponsor}
        onSelectSponsor={setSelectedSponsor}
      />

      {/* Create modal */}
      <SponsorModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSave={(data) => {
          createSponsor.mutate(data);
          setShowCreateModal(false);
        }}
        initialStage={createModalStage}
        eventId={selectedEventId}
        events={sponsorEvents}
        isLoading={createSponsor.isPending}
      />

      {/* Details sheet */}
      <SponsorDetailsSheet
        sponsor={selectedSponsor}
        open={!!selectedSponsor}
        onOpenChange={(open) => !open && setSelectedSponsor(null)}
        onUpdate={(id, data) => updateSponsor.mutate({ id, data })}
        onDelete={(id) => deleteSponsor.mutate(id)}
        onLinkEvent={(sponsorId, eventId) => linkSponsorToEvent.mutate({ sponsorId, eventId })}
        onUnlinkEvent={(sponsorId, eventId) => unlinkSponsorFromEvent.mutate({ sponsorId, eventId })}
        fetchHistory={fetchStageHistory}
        events={sponsorEvents}
      />
    </div>
  );
}
