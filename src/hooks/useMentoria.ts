import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MentoriaProcesso {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentoriaEtapa {
  id: string;
  processo_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface MentoriaTarefa {
  id: string;
  etapa_id: string;
  title: string;
  description: string | null;
  position: number;
  status: 'pending' | 'in_progress' | 'completed';
  mentorado_nome: string | null;
  parent_tarefa_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ProcessoComEtapas extends MentoriaProcesso {
  mentoria_etapas: (MentoriaEtapa & {
    mentoria_tarefas: MentoriaTarefa[];
  })[];
}

// Fetch all processos with etapas and tarefas
export function useProcessos() {
  return useQuery({
    queryKey: ["mentoria-processos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentoria_processos")
        .select(`
          *,
          mentoria_etapas (
            *,
            mentoria_tarefas (*)
          )
        `)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Sort etapas and tarefas by position
      return (data as ProcessoComEtapas[]).map(processo => ({
        ...processo,
        mentoria_etapas: processo.mentoria_etapas
          .sort((a, b) => a.position - b.position)
          .map(etapa => ({
            ...etapa,
            mentoria_tarefas: etapa.mentoria_tarefas.sort((a, b) => a.position - b.position)
          }))
      }));
    },
  });
}

// Fetch tarefas for a specific etapa
export function useTarefasByEtapa(etapaId: string | null) {
  return useQuery({
    queryKey: ["mentoria-tarefas", etapaId],
    queryFn: async () => {
      if (!etapaId) return [];
      
      const { data, error } = await supabase
        .from("mentoria_tarefas")
        .select("*")
        .eq("etapa_id", etapaId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as MentoriaTarefa[];
    },
    enabled: !!etapaId,
  });
}

// Create processo
export function useCreateProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: processo, error } = await supabase
        .from("mentoria_processos")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return processo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Processo criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar processo: " + error.message);
    },
  });
}

// Update processo
export function useUpdateProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string }) => {
      const { data: processo, error } = await supabase
        .from("mentoria_processos")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return processo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Processo atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar processo: " + error.message);
    },
  });
}

// Delete processo
export function useDeleteProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mentoria_processos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Processo excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir processo: " + error.message);
    },
  });
}

// Create etapa
export function useCreateEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { processo_id: string; name: string; position?: number }) => {
      const { data: etapa, error } = await supabase
        .from("mentoria_etapas")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return etapa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Etapa criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar etapa: " + error.message);
    },
  });
}

// Update etapa
export function useUpdateEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; position?: number }) => {
      const { data: etapa, error } = await supabase
        .from("mentoria_etapas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return etapa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Etapa atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar etapa: " + error.message);
    },
  });
}

// Delete etapa
export function useDeleteEtapa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mentoria_etapas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success("Etapa excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir etapa: " + error.message);
    },
  });
}

// Create tarefa
export function useCreateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      etapa_id: string; 
      title: string; 
      description?: string; 
      position?: number;
      mentorado_nome?: string;
      parent_tarefa_id?: string;
    }) => {
      const { data: tarefa, error } = await supabase
        .from("mentoria_tarefas")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      queryClient.invalidateQueries({ queryKey: ["mentoria-tarefas"] });
      toast.success("Tarefa criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar tarefa: " + error.message);
    },
  });
}

// Update tarefa
export function useUpdateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string; 
      title?: string; 
      description?: string; 
      position?: number;
      status?: 'pending' | 'in_progress' | 'completed';
      completed_at?: string | null;
    }) => {
      const { data: tarefa, error } = await supabase
        .from("mentoria_tarefas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      queryClient.invalidateQueries({ queryKey: ["mentoria-tarefas"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tarefa: " + error.message);
    },
  });
}

// Delete tarefa
export function useDeleteTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mentoria_tarefas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      queryClient.invalidateQueries({ queryKey: ["mentoria-tarefas"] });
      toast.success("Tarefa excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir tarefa: " + error.message);
    },
  });
}

// Replicate processo for a mentorado
export function useReplicarProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ processoId, mentoradoNome }: { processoId: string; mentoradoNome: string }) => {
      // First, fetch the processo with its etapas and tarefas
      const { data: processo, error: processoError } = await supabase
        .from("mentoria_processos")
        .select(`
          *,
          mentoria_etapas (
            *,
            mentoria_tarefas (*)
          )
        `)
        .eq("id", processoId)
        .single();

      if (processoError) throw processoError;

      // For each etapa, create copies of tarefas with mentorado_nome
      const typedProcesso = processo as ProcessoComEtapas;
      
      for (const etapa of typedProcesso.mentoria_etapas) {
        const tarefasToInsert = etapa.mentoria_tarefas.map(tarefa => ({
          etapa_id: etapa.id,
          title: tarefa.title,
          description: tarefa.description,
          position: tarefa.position,
          status: 'pending' as const,
          mentorado_nome: mentoradoNome,
          parent_tarefa_id: tarefa.id,
        }));

        if (tarefasToInsert.length > 0) {
          const { error } = await supabase
            .from("mentoria_tarefas")
            .insert(tarefasToInsert);

          if (error) throw error;
        }
      }

      return { processoId, mentoradoNome };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mentoria-processos"] });
      toast.success(`Processo replicado para ${data.mentoradoNome}!`);
    },
    onError: (error) => {
      toast.error("Erro ao replicar processo: " + error.message);
    },
  });
}
