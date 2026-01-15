import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Interface local para BoraNews (tabela não existe no banco externo)
export interface BoraNews {
  id: string;
  titulo: string;
  conteudo: string;
  resumo?: string;
  autor_nome: string;
  data_publicacao: string;
  status_publicacao: 'publicado' | 'rascunho';
  destaque: boolean;
  created_at: string;
}

export type BoraNewsInsert = Omit<BoraNews, 'id' | 'created_at'>;

export interface BoraNewsWithLeitura extends BoraNews {
  lido?: boolean;
}

export const boraNewsKeys = {
  all: ["bora_news"] as const,
  list: () => [...boraNewsKeys.all, "list"] as const,
  published: () => [...boraNewsKeys.all, "published"] as const,
  detail: (id: string) => [...boraNewsKeys.all, "detail", id] as const,
  leitura: () => [...boraNewsKeys.all, "leitura"] as const,
};

const queryOptions = {
  retry: 1,
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos
};

// Dados mock para funcionalidade sem a tabela bora_news
const mockNews: BoraNewsWithLeitura[] = [
  {
    id: '1',
    titulo: 'Bem-vindo ao Bora Hub!',
    conteudo: 'Este é o seu painel central de notícias e avisos. A funcionalidade de notícias será implementada quando a tabela bora_news estiver configurada no banco de dados.',
    resumo: 'Painel de notícias e avisos internos.',
    autor_nome: 'Sistema',
    data_publicacao: new Date().toISOString(),
    status_publicacao: 'publicado',
    destaque: true,
    created_at: new Date().toISOString(),
    lido: false,
  },
];

export function useBoraNewsList(onlyPublished = true) {
  return useQuery({
    queryKey: onlyPublished ? boraNewsKeys.published() : boraNewsKeys.list(),
    queryFn: async () => {
      // Retorna dados mock já que a tabela não existe
      return mockNews;
    },
    ...queryOptions,
  });
}

export function useBoraNewsDetail(id: string) {
  return useQuery({
    queryKey: boraNewsKeys.detail(id),
    queryFn: async () => {
      const news = mockNews.find(n => n.id === id);
      if (!news) throw new Error('Notícia não encontrada');
      return news;
    },
    enabled: !!id,
  });
}

export function useBoraNewsUnreadCount() {
  return useQuery({
    queryKey: [...boraNewsKeys.all, "unread_count"],
    queryFn: async () => {
      return mockNews.filter(n => !n.lido).length;
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boraNewsId: string) => {
      // Mock implementation
      console.log('Marking as read:', boraNewsId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useToggleRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boraNewsId, lido }: { boraNewsId: string; lido: boolean }) => {
      // Mock implementation
      console.log('Toggle read:', boraNewsId, lido);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useCreateBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (news: BoraNewsInsert) => {
      // Mock implementation
      console.log('Creating news:', news);
      return { ...news, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useUpdateBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoraNews> & { id: string }) => {
      // Mock implementation
      console.log('Updating news:', id, updates);
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}

export function useDeleteBoraNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Mock implementation
      console.log('Deleting news:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boraNewsKeys.all });
    },
  });
}
