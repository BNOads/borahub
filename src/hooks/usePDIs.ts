import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PDIAula {
  id: string;
  pdi_id: string;
  titulo: string;
  origem: "interna" | "externa";
  curso_origem: string | null;
  lesson_id: string | null;
  link_externo: string | null;
  duracao_minutos: number | null;
  status: "nao_iniciada" | "concluida";
  ordem: number;
  concluida_em: string | null;
  created_at: string;
}

export interface PDIAcesso {
  id: string;
  pdi_id: string;
  nome: string;
  categoria: string | null;
  link: string | null;
  created_at: string;
}

export interface PDI {
  id: string;
  titulo: string;
  descricao: string | null;
  colaborador_id: string;
  data_limite: string;
  status: "ativo" | "finalizado" | "atrasado";
  criado_por: string | null;
  criado_em: string;
  finalizado_em: string | null;
  updated_at: string;
  colaborador?: {
    id: string;
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
  };
  aulas?: PDIAula[];
  acessos?: PDIAcesso[];
}

export interface CreatePDIInput {
  titulo: string;
  descricao?: string;
  colaborador_id: string;
  data_limite: string;
  aulas: Omit<PDIAula, "id" | "pdi_id" | "created_at" | "concluida_em">[];
  acessos: { nome: string; categoria?: string; link?: string }[];
}

const pdiKeys = {
  all: ["pdis"] as const,
  lists: () => [...pdiKeys.all, "list"] as const,
  myPdis: (userId: string) => [...pdiKeys.lists(), "my", userId] as const,
  teamPdis: () => [...pdiKeys.lists(), "team"] as const,
  detail: (id: string) => [...pdiKeys.all, "detail", id] as const,
};

// Calcular status baseado na data limite e conclusão
function calculateStatus(pdi: any): "ativo" | "finalizado" | "atrasado" {
  if (pdi.status === "finalizado" || pdi.finalizado_em) return "finalizado";
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataLimite = new Date(pdi.data_limite);
  dataLimite.setHours(0, 0, 0, 0);
  
  if (hoje > dataLimite) return "atrasado";
  return "ativo";
}

// Calcular progresso
export function calcularProgresso(aulas: PDIAula[] = []): number {
  if (aulas.length === 0) return 0;
  const concluidas = aulas.filter(a => a.status === "concluida").length;
  return Math.round((concluidas / aulas.length) * 100);
}

// Buscar meus PDIs
export function useMyPDIs() {
  const { user, authReady } = useAuth();

  return useQuery({
    queryKey: pdiKeys.myPdis(user?.id || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdis")
        .select(`
          *,
          colaborador:profiles!colaborador_id(id, full_name, display_name, avatar_url, job_title),
          aulas:pdi_aulas(*)
        `)
        .eq("colaborador_id", user!.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      return (data || []).map(pdi => ({
        ...pdi,
        status: calculateStatus(pdi),
      })) as PDI[];
    },
    enabled: authReady && !!user,
  });
}

// Buscar PDIs da equipe (gestor/admin)
export function useTeamPDIs() {
  const { authReady, user } = useAuth();

  return useQuery({
    queryKey: pdiKeys.teamPdis(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdis")
        .select(`
          *,
          colaborador:profiles!colaborador_id(id, full_name, display_name, avatar_url, job_title),
          aulas:pdi_aulas(*)
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      return (data || []).map(pdi => ({
        ...pdi,
        status: calculateStatus(pdi),
      })) as PDI[];
    },
    enabled: authReady && !!user,
  });
}

// Buscar PDI por ID
export function usePDI(id: string) {
  const { authReady, user } = useAuth();

  return useQuery({
    queryKey: pdiKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdis")
        .select(`
          *,
          colaborador:profiles!colaborador_id(id, full_name, display_name, avatar_url, job_title),
          aulas:pdi_aulas(*),
          acessos:pdi_acessos(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Ordenar aulas por ordem
      if (data.aulas) {
        data.aulas.sort((a: any, b: any) => a.ordem - b.ordem);
      }

      return {
        ...data,
        status: calculateStatus(data),
      } as PDI;
    },
    enabled: authReady && !!user && !!id,
  });
}

// Criar PDI
export function useCreatePDI() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePDIInput) => {
      // Criar PDI
      const { data: pdi, error: pdiError } = await supabase
        .from("pdis")
        .insert({
          titulo: input.titulo,
          descricao: input.descricao,
          colaborador_id: input.colaborador_id,
          data_limite: input.data_limite,
          criado_por: user?.id,
        })
        .select()
        .single();

      if (pdiError) throw pdiError;

      // Criar aulas
      if (input.aulas.length > 0) {
        const { error: aulasError } = await supabase
          .from("pdi_aulas")
          .insert(
            input.aulas.map((aula, index) => ({
              pdi_id: pdi.id,
              titulo: aula.titulo,
              origem: aula.origem,
              curso_origem: aula.curso_origem,
              lesson_id: aula.lesson_id,
              link_externo: aula.link_externo,
              duracao_minutos: aula.duracao_minutos,
              ordem: index,
              status: "nao_iniciada",
            }))
          );

        if (aulasError) throw aulasError;
      }

      // Criar acessos
      if (input.acessos.length > 0) {
        const { error: acessosError } = await supabase
          .from("pdi_acessos")
          .insert(
            input.acessos.map(acesso => ({
              pdi_id: pdi.id,
              nome: acesso.nome,
              categoria: acesso.categoria || "outros",
              link: acesso.link,
            }))
          );

        if (acessosError) throw acessosError;
      }

      return pdi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdiKeys.all });
      toast.success("PDI criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar PDI:", error);
      toast.error("Erro ao criar PDI");
    },
  });
}

// Atualizar PDI
export function useUpdatePDI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PDI> & { id: string }) => {
      const { data, error } = await supabase
        .from("pdis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pdiKeys.all });
      queryClient.invalidateQueries({ queryKey: pdiKeys.detail(variables.id) });
    },
    onError: (error) => {
      console.error("Erro ao atualizar PDI:", error);
      toast.error("Erro ao atualizar PDI");
    },
  });
}

// Finalizar PDI
export function useFinalizePDI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("pdis")
        .update({
          status: "finalizado",
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: pdiKeys.all });
      queryClient.invalidateQueries({ queryKey: pdiKeys.detail(id) });
      toast.success("PDI finalizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao finalizar PDI:", error);
      toast.error("Erro ao finalizar PDI");
    },
  });
}

// Deletar PDI
export function useDeletePDI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pdis")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdiKeys.all });
      toast.success("PDI excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir PDI:", error);
      toast.error("Erro ao excluir PDI");
    },
  });
}

// Marcar aula como concluída
export function useMarkAulaConcluida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aulaId, pdiId }: { aulaId: string; pdiId: string }) => {
      const { data, error } = await supabase
        .from("pdi_aulas")
        .update({
          status: "concluida",
          concluida_em: new Date().toISOString(),
        })
        .eq("id", aulaId)
        .select()
        .single();

      if (error) throw error;

      // Verificar se todas as aulas foram concluídas
      const { data: aulas } = await supabase
        .from("pdi_aulas")
        .select("status")
        .eq("pdi_id", pdiId);

      const todasConcluidas = aulas?.every(a => a.status === "concluida");

      // Se todas concluídas, finalizar PDI automaticamente
      if (todasConcluidas) {
        await supabase
          .from("pdis")
          .update({
            status: "finalizado",
            finalizado_em: new Date().toISOString(),
          })
          .eq("id", pdiId);
      }

      return { aula: data, todasConcluidas };
    },
    onSuccess: (result, { pdiId }) => {
      queryClient.invalidateQueries({ queryKey: pdiKeys.all });
      queryClient.invalidateQueries({ queryKey: pdiKeys.detail(pdiId) });
      
      if (result.todasConcluidas) {
        toast.success("🎉 Parabéns! PDI concluído com sucesso!");
      } else {
        toast.success("Aula marcada como concluída!");
      }
    },
    onError: (error) => {
      console.error("Erro ao marcar aula:", error);
      toast.error("Erro ao marcar aula como concluída");
    },
  });
}

// Buscar aulas internas (do catálogo de cursos)
export function useLessonsForPDI(search: string = "") {
  const { authReady, user } = useAuth();

  return useQuery({
    queryKey: ["lessons-for-pdi", search],
    queryFn: async () => {
      let query = supabase
        .from("lessons")
        .select(`
          id,
          title,
          description,
          duration,
          course:courses(id, title)
        `)
        .order("title");

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: authReady && !!user,
  });
}
