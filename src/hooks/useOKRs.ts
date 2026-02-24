import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types (since tables are new and types.ts not yet updated)
export interface OKRCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OKRObjective {
  id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  color: string;
  owner_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  key_results?: OKRKeyResult[];
}

export interface OKRKeyResult {
  id: string;
  objective_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  owner_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export function useCycles() {
  return useQuery({
    queryKey: ['okr-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_cycles' as any)
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OKRCycle[];
    },
  });
}

export function useObjectives(cycleId: string | null) {
  return useQuery({
    queryKey: ['okr-objectives', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_objectives' as any)
        .select('*')
        .eq('cycle_id', cycleId!)
        .order('order_index');
      if (error) throw error;
      return (data || []) as unknown as OKRObjective[];
    },
  });
}

export function useKeyResults(objectiveId: string | null) {
  return useQuery({
    queryKey: ['okr-key-results', objectiveId],
    enabled: !!objectiveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_key_results' as any)
        .select('*')
        .eq('objective_id', objectiveId!)
        .order('order_index');
      if (error) throw error;
      return (data || []) as unknown as OKRKeyResult[];
    },
  });
}

export function useAllKeyResultsForCycle(cycleId: string | null) {
  return useQuery({
    queryKey: ['okr-all-key-results', cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      // Get all objectives for cycle first
      const { data: objectives, error: objError } = await supabase
        .from('okr_objectives' as any)
        .select('id')
        .eq('cycle_id', cycleId!);
      if (objError) throw objError;
      if (!objectives || objectives.length === 0) return [] as OKRKeyResult[];

      const objectiveIds = (objectives as any[]).map((o: any) => o.id);
      const { data, error } = await supabase
        .from('okr_key_results' as any)
        .select('*')
        .in('objective_id', objectiveIds);
      if (error) throw error;
      return (data || []) as unknown as OKRKeyResult[];
    },
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cycle: { name: string; start_date: string; end_date: string; created_by: string }) => {
      const { data, error } = await supabase.from('okr_cycles' as any).insert(cycle as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-cycles'] }),
  });
}

export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (obj: { cycle_id: string; title: string; description?: string; color?: string; owner_id?: string }) => {
      const { data, error } = await supabase.from('okr_objectives' as any).insert(obj as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-objectives'] });
    },
  });
}

export function useUpdateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; color?: string; owner_id?: string }) => {
      const { error } = await supabase.from('okr_objectives' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-objectives'] }),
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_objectives' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-objectives'] });
      qc.invalidateQueries({ queryKey: ['okr-all-key-results'] });
    },
  });
}

export function useCreateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kr: { objective_id: string; title: string; target_value: number; current_value?: number; unit?: string; owner_id?: string }) => {
      const { data, error } = await supabase.from('okr_key_results' as any).insert(kr as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-key-results'] });
      qc.invalidateQueries({ queryKey: ['okr-all-key-results'] });
    },
  });
}

export function useUpdateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; target_value?: number; current_value?: number; unit?: string }) => {
      const { error } = await supabase.from('okr_key_results' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-key-results'] });
      qc.invalidateQueries({ queryKey: ['okr-all-key-results'] });
    },
  });
}

export function useDeleteKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_key_results' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-key-results'] });
      qc.invalidateQueries({ queryKey: ['okr-all-key-results'] });
    },
  });
}

export function useDeleteCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_cycles' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-cycles'] });
      qc.invalidateQueries({ queryKey: ['okr-objectives'] });
      qc.invalidateQueries({ queryKey: ['okr-all-key-results'] });
    },
  });
}
