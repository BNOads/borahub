
import { useState, useEffect } from "react";
import {
    Calendar,
    LayoutGrid,
    Plus,
    Search,
    Filter,
    Clock,
    AlertCircle,
    ArrowRight,
    MoreVertical,
    MessageSquare,
    History,
    User,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Video,
    Layers,
    Image as ImageIcon,
    Smartphone,
    Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfWeek, addDays, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PostDetailsModal } from "@/components/conteudo/PostDetailsModal";
import { EditorialLineModal } from "@/components/conteudo/EditorialLineModal";

// Constants
const POST_TYPES = {
    'Reels': { icon: Video, color: 'text-purple-500' },
    'Carrossel': { icon: Layers, color: 'text-blue-500' },
    'Imagem': { icon: ImageIcon, color: 'text-emerald-500' },
    'Vídeo': { icon: Monitor, color: 'text-rose-500' },
    'Stories': { icon: Smartphone, color: 'text-orange-500' },
};

const STATUS_PIPELINE = [
    'Planejado',
    'Em desenvolvimento de ideia',
    'Em produção visual ou vídeo',
    'Em revisão',
    'Ajustes solicitados',
    'Aprovado',
    'Agendado',
    'Publicado'
];

const STATUS_COLORS = {
    'Planejado': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    'Em desenvolvimento de ideia': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Em produção visual ou vídeo': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Em revisão': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'Ajustes solicitados': 'bg-destructive/10 text-destructive border-destructive/20',
    'Aprovado': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Agendado': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'Publicado': 'bg-success/10 text-success border-success/20',
};

// Types
interface SocialProfile {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface SocialPost {
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
}

export default function ConteudoView() {
    const [view, setView] = useState<"grid" | "kanban">("grid");
    const [profiles, setProfiles] = useState<SocialProfile[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [searchQuery, setSearchQuery] = useState("");

    // Modals state
    const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditorialOpen, setIsEditorialOpen] = useState(false);

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    useEffect(() => {
        fetchInitialData();
    }, [currentWeekStart]);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const [profilesRes, postsRes] = await Promise.all([
                supabase.from("social_profiles").select("*"),
                supabase.from("social_posts")
                    .select("*, profiles:social_profiles(*)")
                    .gte("scheduled_date", format(currentWeekStart, 'yyyy-MM-dd'))
                    .lte("scheduled_date", format(addDays(currentWeekStart, 6), 'yyyy-MM-dd'))
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (postsRes.error) throw postsRes.error;

            setProfiles(profilesRes.data || []);
            setPosts(postsRes.data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar dados: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const navigateWeek = (direction: 'next' | 'prev') => {
        setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
    };

    const getPostForDayAndProfile = (day: Date, profileId: string) => {
        return posts.find(p => isSameDay(parseISO(p.scheduled_date), day) && p.profile_id === profileId);
    };

    const handleOpenPost = (post: SocialPost) => {
        setSelectedPost(post);
        setIsDetailsOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-2xl">
                            <Video className="h-8 w-8 text-accent" />
                        </div>
                        Gestão de Conteúdo
                    </h1>
                    <p className="text-muted-foreground mt-1">Sinfonia de produção: estratégia, criação e publicação em um só lugar.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-card border border-border rounded-2xl p-1">
                        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigateWeek('prev')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 py-1 text-sm font-black min-w-[180px] text-center">
                            {format(currentWeekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(currentWeekStart, 6), 'dd MMM', { locale: ptBR })}
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigateWeek('next')}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="gold"
                        className="rounded-2xl h-11 gap-2 font-black shadow-xl shadow-gold/20 hover:scale-105 transition-transform"
                        onClick={() => setIsEditorialOpen(true)}
                    >
                        <Wand2 className="h-4 w-4" />
                        Nova Estratégia Semanal
                    </Button>
                </div>
            </div>

            {/* View Switcher & Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-card/50 p-2 rounded-3xl border border-border backdrop-blur-md gap-4">
                <div className="flex items-center gap-1 bg-background/50 p-1 rounded-2xl">
                    <Button
                        variant={view === "grid" ? "gold" : "ghost"}
                        className={cn("rounded-xl h-9 gap-2 px-6", view === "grid" && "shadow-md")}
                        onClick={() => setView("grid")}
                    >
                        <Calendar className="h-4 w-4" />
                        Grade
                    </Button>
                    <Button
                        variant={view === "kanban" ? "gold" : "ghost"}
                        className={cn("rounded-xl h-9 gap-2 px-6", view === "kanban" && "shadow-md")}
                        onClick={() => setView("kanban")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Kanban
                    </Button>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar pela intenção ou tema..."
                            className="pl-11 h-11 rounded-2xl border-accent/10 focus-visible:ring-accent bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-accent/10 hover:bg-accent/5">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content Areas */}
            {view === "grid" ? (
                <WeeklyGridView
                    days={daysOfWeek}
                    profiles={profiles}
                    posts={posts.filter(p => !searchQuery || p.theme.toLowerCase().includes(searchQuery.toLowerCase()))}
                    getPost={getPostForDayAndProfile}
                    onOpenPost={handleOpenPost}
                />
            ) : (
                <KanbanView
                    posts={posts.filter(p => !searchQuery || p.theme.toLowerCase().includes(searchQuery.toLowerCase()))}
                    onOpenPost={handleOpenPost}
                />
            )}

            {/* Modals */}
            <PostDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                post={selectedPost}
                onUpdate={fetchInitialData}
                users={[]}
            />

            <EditorialLineModal
                isOpen={isEditorialOpen}
                onClose={() => setIsEditorialOpen(false)}
                profiles={profiles}
                onSuccess={fetchInitialData}
            />
        </div>
    );
}

function WeeklyGridView({ days, profiles, posts, getPost, onOpenPost }: any) {
    return (
        <div className="bg-card/30 rounded-[2.5rem] border border-border overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 border-b border-r border-border min-w-[140px] bg-muted/30 sticky left-0 z-10 backdrop-blur-xl">
                                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground block mb-0.5">Perfis</span>
                            </th>
                            {days.map((day: Date) => (
                                <th key={day.toISOString()} className="p-3 border-b border-border min-w-[160px] bg-muted/10">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black uppercase text-accent tracking-tighter mb-0.5">{format(day, 'EEEE', { locale: ptBR })}</span>
                                        <span className="text-sm font-black">{format(day, 'dd')} {format(day, 'MMM', { locale: ptBR })}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {profiles.map((profile: SocialProfile) => (
                            <tr key={profile.id} className="group hover:bg-accent/[0.02] transition-colors">
                                <td className="p-3 border-b border-r border-border bg-card/80 sticky left-0 z-10 backdrop-blur-xl">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-sm"
                                            style={{ backgroundColor: profile.color + '25', color: profile.color }}
                                        >
                                            {profile.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-[11px] tracking-tight leading-none">{profile.name}</p>
                                        </div>
                                    </div>
                                </td>
                                {days.map((day: Date) => {
                                    const post = getPost(day, profile.id);
                                    return (
                                        <td key={day.toISOString()} className="p-2 border-b border-border align-top">
                                            {post ? (
                                                <PostGridCard post={post} onClick={() => onOpenPost(post)} />
                                            ) : (
                                                <div className="h-24 border-2 border-dashed border-accent/[0.03] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/[0.05] hover:border-accent/10 cursor-pointer">
                                                    <Plus className="h-6 w-6 text-accent/10" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PostGridCard({ post, onClick }: { post: SocialPost, onClick: () => void }) {
    const PostTypeIcon = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.icon || Monitor;
    const isDelayed = post.status !== 'Publicado' && new Date(post.deadline + "T23:59:59") < new Date();

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-3 rounded-2xl border bg-card/50 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group/card relative overflow-hidden h-full flex flex-col",
                STATUS_COLORS[post.status as keyof typeof STATUS_COLORS]
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="p-1.5 bg-background/50 rounded-lg">
                    <PostTypeIcon className={cn("h-3 w-3", POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.color)} />
                </div>
                {isDelayed && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive text-white text-[8px] font-black tracking-widest animate-pulse">
                        <AlertCircle className="h-2 w-2" /> ATRASADO
                    </div>
                )}
            </div>
            <p className="text-[10px] font-black line-clamp-2 mb-2 flex-1 leading-tight">
                {post.theme}
            </p>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-accent/5">
                <div className="h-6 w-6 rounded-lg bg-accent shadow-sm flex items-center justify-center text-accent-foreground">
                    <User className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black opacity-60">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KanbanView({ posts, onOpenPost }: { posts: SocialPost[], onOpenPost: (p: SocialPost) => void }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-6 h-[calc(100vh-22rem)] min-h-[600px] px-2">
            {STATUS_PIPELINE.map(status => (
                <div key={status} className="flex-1 min-w-[240px] flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", STATUS_COLORS[status as keyof typeof STATUS_COLORS].split(' ')[1])} />
                            <h3 className="font-black text-[10px] uppercase tracking-tighter opacity-80">{status}</h3>
                            <div className="px-1.5 py-0.5 rounded-full bg-accent/5 border border-accent/10 text-[9px] font-black">
                                {posts.filter(p => p.status === status).length}
                            </div>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 bg-card/20 rounded-3xl p-3 border border-border/60 hover:border-accent/10 transition-colors">
                        <div className="space-y-3">
                            {posts.filter(p => p.status === status).map(post => (
                                <PostKanbanCard key={post.id} post={post} onClick={() => onOpenPost(post)} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            ))}
        </div>
    );
}

function PostKanbanCard({ post, onClick }: { post: SocialPost, onClick: () => void }) {
    const PostTypeIcon = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.icon || Monitor;
    return (
        <div
            onClick={onClick}
            className="bg-card p-3 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group/kcard border-l-4"
            style={{ borderLeftColor: post.profiles?.color || '#gold' }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                    <PostTypeIcon className={cn("h-3 w-3", POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.color)} />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">{post.post_type}</span>
                </div>
            </div>
            <p className="font-black text-[11px] mb-3 leading-tight tracking-tight line-clamp-2 h-8">
                {post.theme}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-accent shadow-sm flex items-center justify-center text-accent-foreground">
                        <User className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/50">
                        <MessageSquare className="h-3 w-3" />
                        <span>2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function parseISO(date: string) {
    return new Date(date + "T00:00:00");
}
