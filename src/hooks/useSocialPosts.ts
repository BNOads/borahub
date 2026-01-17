import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const SOCIAL_POSTS_KEY = "social_posts";
export const SOCIAL_PROFILES_KEY = "social_profiles";

export interface SocialProfile {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface SocialPost {
    id: string;
    profile_id: string;
    scheduled_date: string;
    day_of_week: string;
    post_type: string;
    theme: string;
    status: string;
    current_assignee_id: string;
    start_date: string;
    deadline: string;
    editorial_line_id: string;
    created_at: string;
    updated_at: string;
    profiles?: SocialProfile;
    comments_count?: number;
    history_count?: number;
}

export function useSocialProfiles() {
    const { authReady, session } = useAuth();

    return useQuery({
        queryKey: [SOCIAL_PROFILES_KEY],
        queryFn: async () => {
            console.log("🔥 loadData disparado useSocialProfiles", session?.user?.id);
            const { data, error } = await supabase
                .from("social_profiles")
                .select("*");

            if (error) throw error;
            return data as SocialProfile[];
        },
        staleTime: 60 * 60 * 1000, // 1 hour
        enabled: authReady && !!session,
    });
}

export function useSocialPosts(weekStart: string, weekEnd: string) {
    const { authReady, session } = useAuth();

    const query = useQuery({
        queryKey: [SOCIAL_POSTS_KEY, weekStart, weekEnd],
        queryFn: async () => {
            console.log("🔥 loadData disparado useSocialPosts", session?.user?.id);
            const { data, error } = await supabase
                .from("social_posts")
                .select(`
                    id,
                    profile_id,
                    scheduled_date,
                    day_of_week,
                    post_type,
                    theme,
                    status,
                    current_assignee_id,
                    start_date,
                    deadline,
                    editorial_line_id,
                    created_at,
                    updated_at,
                    profiles:social_profiles(id, name, icon, color),
                    post_comments(count),
                    post_history(count)
                `)
                .gte("scheduled_date", weekStart)
                .lte("scheduled_date", weekEnd);

            if (error) throw error;

            return data.map((p: any) => ({
                ...p,
                comments_count: p.post_comments?.[0]?.count || 0,
                history_count: p.post_history?.[0]?.count || 0
            })) as SocialPost[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: authReady && !!session,
    });

    return query;
}

export function useUpdateSocialPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<SocialPost> }) => {
            const { error } = await supabase
                .from("social_posts")
                .update(updates)
                .eq("id", id);

            if (error) throw error;
            return { id, ...updates };
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: [SOCIAL_POSTS_KEY] });

            // Snapshot the previous value
            const previousPosts = queryClient.getQueriesData({ queryKey: [SOCIAL_POSTS_KEY] });

            // Optimistically update to the new value
            queryClient.setQueriesData({ queryKey: [SOCIAL_POSTS_KEY] }, (old: any) => {
                if (!old) return old;
                // Determine if we are updating a single list or iterating over multiple lists
                // React Query 5 structure might slightly differ, but usually `old` is the data
                // We will assume `old` is an array of posts if it matches the query structure
                if (Array.isArray(old)) {
                    return old.map((post: SocialPost) =>
                        post.id === id ? { ...post, ...updates } : post
                    );
                }
                return old;
            });

            return { previousPosts };
        },
        onError: (err, newTodo, context) => {
            // Rollback on error
            if (context?.previousPosts) {
                context.previousPosts.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            toast.error("Erro ao atualizar post: " + err.message);
        },
        onSettled: () => {
            // Invalidate to ensure data is fresh
            queryClient.invalidateQueries({ queryKey: [SOCIAL_POSTS_KEY] });
        },
    });
}
