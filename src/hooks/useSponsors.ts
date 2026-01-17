import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const SPONSOR_STAGES = [
  { id: 'possiveis_patrocinadores', name: 'Possíveis patrocinadores', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'primeiro_contato', name: 'Primeiro contato', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'followup', name: 'Follow-up', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'agendamento', name: 'Agendamento', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'ultimo_contato', name: 'Último contato', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'contrato_fechamento', name: 'Contrato e fechamento', color: 'bg-green-100 text-green-700 border-green-300' },
] as const;

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
] as const;

export interface Sponsor {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  additional_info: string | null;
  city: string;
  state: string;
  segment: string;
  stage: string;
  last_contact_date: string | null;
  last_contact_notes: string | null;
  next_action: string | null;
  next_followup_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  events?: SponsorEvent[];
}

export interface SponsorEvent {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SponsorStageHistory {
  id: string;
  sponsor_id: string;
  previous_stage: string | null;
  new_stage: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface CreateSponsorData {
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  additional_info?: string;
  city: string;
  state: string;
  segment: string;
  stage?: string;
  event_id?: string;
}

export interface UpdateSponsorData extends Partial<CreateSponsorData> {
  last_contact_date?: string | null;
  last_contact_notes?: string | null;
  next_action?: string | null;
  next_followup_date?: string | null;
}

export function useSponsors(eventId?: string | null) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Fetch all sponsors with their linked events
  const { data: sponsors = [], isLoading, refetch } = useQuery({
    queryKey: ['sponsors', eventId],
    queryFn: async () => {
      let query = supabase
        .from('sponsors')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: sponsorsData, error } = await query;
      if (error) throw error;

      // Fetch event links for all sponsors
      const sponsorIds = sponsorsData?.map(s => s.id) || [];
      if (sponsorIds.length === 0) return [];

      const { data: links } = await supabase
        .from('sponsor_event_links')
        .select('sponsor_id, event_id')
        .in('sponsor_id', sponsorIds);

      const { data: events } = await supabase
        .from('sponsor_events')
        .select('*');

      // Map events to sponsors
      const sponsorsWithEvents = sponsorsData?.map(sponsor => {
        const sponsorLinks = links?.filter(l => l.sponsor_id === sponsor.id) || [];
        const sponsorEvents = sponsorLinks.map(l => 
          events?.find(e => e.id === l.event_id)
        ).filter(Boolean) as SponsorEvent[];
        return { ...sponsor, events: sponsorEvents };
      }) || [];

      // Filter by event if specified
      if (eventId) {
        return sponsorsWithEvents.filter(s => 
          s.events?.some(e => e.id === eventId)
        );
      }

      return sponsorsWithEvents;
    },
  });

  // Fetch sponsor events
  const { data: sponsorEvents = [] } = useQuery({
    queryKey: ['sponsor-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsor_events')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as SponsorEvent[];
    },
  });

  // Fetch stage history for a sponsor
  const fetchStageHistory = async (sponsorId: string): Promise<SponsorStageHistory[]> => {
    const { data, error } = await supabase
      .from('sponsor_stage_history')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('changed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  // Create sponsor
  const createSponsor = useMutation({
    mutationFn: async (data: CreateSponsorData) => {
      const { event_id, ...sponsorData } = data;
      
      const { data: newSponsor, error } = await supabase
        .from('sponsors')
        .insert({
          ...sponsorData,
          created_by: profile?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Record initial stage in history
      await supabase.from('sponsor_stage_history').insert({
        sponsor_id: newSponsor.id,
        previous_stage: null,
        new_stage: sponsorData.stage || 'possiveis_patrocinadores',
        changed_by: profile?.id,
        changed_by_name: profile?.full_name || 'Sistema',
      });

      // Link to event if provided
      if (event_id) {
        await supabase.from('sponsor_event_links').insert({
          sponsor_id: newSponsor.id,
          event_id: event_id,
        });
      }

      return newSponsor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Patrocinador criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating sponsor:', error);
      toast.error('Erro ao criar patrocinador');
    },
  });

  // Update sponsor
  const updateSponsor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSponsorData }) => {
      const { error } = await supabase
        .from('sponsors')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Patrocinador atualizado!');
    },
    onError: (error) => {
      console.error('Error updating sponsor:', error);
      toast.error('Erro ao atualizar patrocinador');
    },
  });

  // Move sponsor to new stage
  const moveSponsor = useMutation({
    mutationFn: async ({ sponsorId, previousStage, newStage }: { 
      sponsorId: string; 
      previousStage: string; 
      newStage: string 
    }) => {
      // Update sponsor stage
      const { error: updateError } = await supabase
        .from('sponsors')
        .update({ stage: newStage })
        .eq('id', sponsorId);
      
      if (updateError) throw updateError;

      // Record history
      const { error: historyError } = await supabase
        .from('sponsor_stage_history')
        .insert({
          sponsor_id: sponsorId,
          previous_stage: previousStage,
          new_stage: newStage,
          changed_by: profile?.id,
          changed_by_name: profile?.full_name || 'Sistema',
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    },
    onError: (error) => {
      console.error('Error moving sponsor:', error);
      toast.error('Erro ao mover patrocinador');
    },
  });

  // Delete sponsor
  const deleteSponsor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Patrocinador excluído');
    },
    onError: (error) => {
      console.error('Error deleting sponsor:', error);
      toast.error('Erro ao excluir patrocinador');
    },
  });

  // Create event
  const createEvent = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      const { data: newEvent, error } = await supabase
        .from('sponsor_events')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsor-events'] });
      toast.success('Evento criado!');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
    },
  });

  // Link sponsor to event
  const linkSponsorToEvent = useMutation({
    mutationFn: async ({ sponsorId, eventId }: { sponsorId: string; eventId: string }) => {
      const { error } = await supabase
        .from('sponsor_event_links')
        .insert({ sponsor_id: sponsorId, event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Patrocinador vinculado ao evento!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Patrocinador já está vinculado a este evento');
      } else {
        toast.error('Erro ao vincular patrocinador');
      }
    },
  });

  // Unlink sponsor from event
  const unlinkSponsorFromEvent = useMutation({
    mutationFn: async ({ sponsorId, eventId }: { sponsorId: string; eventId: string }) => {
      const { error } = await supabase
        .from('sponsor_event_links')
        .delete()
        .eq('sponsor_id', sponsorId)
        .eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success('Vínculo removido');
    },
  });

  return {
    sponsors,
    sponsorEvents,
    isLoading,
    refetch,
    fetchStageHistory,
    createSponsor,
    updateSponsor,
    moveSponsor,
    deleteSponsor,
    createEvent,
    linkSponsorToEvent,
    unlinkSponsorFromEvent,
  };
}
