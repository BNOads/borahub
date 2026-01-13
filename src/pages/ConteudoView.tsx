
import { useState, useEffect, useMemo } from "react";
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
    Wand2,
    GripVertical,
    FileText,
    Bot
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragEndEvent,
    type DragStartEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { NewPostModal } from "@/components/conteudo/NewPostModal";
import { ProfileManagementModal } from "@/components/conteudo/ProfileManagementModal";
import { DiretrizesView } from "@/components/conteudo/DiretrizesView";
import { AgentesIAView } from "@/components/conteudo/AgentesIAView";

// Youtube Icon Component
const YoutubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);

// Constants
const POST_TYPES = {
    'Reels': { icon: Video, color: 'text-purple-500' },
    'Carrossel': { icon: Layers, color: 'text-blue-500' },
    'Imagem': { icon: ImageIcon, color: 'text-emerald-500' },
    'Vídeo': { icon: Monitor, color: 'text-rose-500' },
    'Stories': { icon: Smartphone, color: 'text-orange-500' },
    'Youtube': { icon: YoutubeIcon, color: 'text-red-600' },
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
    comments_count?: number;
    history_count?: number;
}

export default function ConteudoView() {
    const [view, setView] = useState<"grid" | "kanban" | "diretrizes" | "agentes">("grid");
    const [profiles, setProfiles] = useState<SocialProfile[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [searchQuery, setSearchQuery] = useState("");

    // Modals state
    const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditorialOpen, setIsEditorialOpen] = useState(false);
    const [isNewPostOpen, setIsNewPostOpen] = useState(false);
    const [isProfilesOpen, setIsProfilesOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newPostInitialData, setNewPostInitialData] = useState<{ date?: Date, profileId?: string, status?: string }>({});

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    // Sort profiles by post count (descending)
    const sortedProfiles = useMemo(() => {
        const postCountByProfile = posts.reduce((acc, post) => {
            acc[post.profile_id] = (acc[post.profile_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [...profiles].sort((a, b) => {
            const countA = postCountByProfile[a.id] || 0;
            const countB = postCountByProfile[b.id] || 0;
            return countB - countA;
        });
    }, [profiles, posts]);

    useEffect(() => {
        fetchInitialData();
    }, [currentWeekStart]);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const [profilesRes, postsRes] = await Promise.all([
                supabase.from("social_profiles").select("*"),
                supabase.from("social_posts")
                    .select(`
                        *,
                        profiles:social_profiles(*),
                        post_comments(id),
                        post_history(id)
                    `)
                    .gte("scheduled_date", format(currentWeekStart, 'yyyy-MM-dd'))
                    .lte("scheduled_date", format(addDays(currentWeekStart, 6), 'yyyy-MM-dd'))
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (postsRes.error) throw postsRes.error;

            setProfiles(profilesRes.data || []);
            const formattedPosts = (postsRes.data || []).map((p: any) => ({
                ...p,
                comments_count: p.post_comments?.length || 0,
                history_count: p.post_history?.length || 0
            }));
            setPosts(formattedPosts);
        } catch (error: any) {
            toast.error("Erro ao carregar dados: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activePost = posts.find(p => p.id === active.id);
        if (!activePost) return;

        // Kanban logic: Update status
        if (typeof over.id === 'string' && STATUS_PIPELINE.includes(over.id)) {
            const newStatus = over.id;
            if (activePost.status === newStatus) return;

            setPosts(prev => prev.map(p => p.id === String(active.id) ? { ...p, status: newStatus } : p));

            const { error } = await supabase.from('social_posts').update({ status: newStatus }).eq('id', String(active.id));
            if (error) {
                toast.error("Erro ao atualizar status");
                fetchInitialData();
            }
        }

        // Grid logic: Update date and profile
        if (typeof over.id === 'string' && over.id.startsWith('grid:')) {
            const [, dateStr, profileId] = over.id.split(':');

            if (activePost.scheduled_date === dateStr && activePost.profile_id === profileId) return;

            setPosts(prev => prev.map(p => p.id === String(active.id) ? { ...p, scheduled_date: dateStr, profile_id: profileId } : p));

            const { error } = await supabase.from('social_posts').update({
                scheduled_date: dateStr,
                profile_id: profileId
            }).eq('id', String(active.id));

            if (error) {
                toast.error("Erro ao atualizar data/perfil");
                fetchInitialData();
            }
        }
    };

    const navigateWeek = (direction: 'next' | 'prev') => {
        setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
    };

    const getPostsForDayAndProfile = (day: Date, profileId: string) => {
        return posts.filter(p => isSameDay(parseISO(p.scheduled_date), day) && p.profile_id === profileId);
    };

    const handleOpenPost = (post: SocialPost) => {
        setSelectedPost(post);
        setIsDetailsOpen(true);
    };

    const handleAddNewPost = (date?: Date, profileId?: string, status?: string) => {
        setNewPostInitialData({ date, profileId, status });
        setIsNewPostOpen(true);
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
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
                            <Button
                                variant="ghost"
                                className="rounded-2xl h-11 gap-2 font-black border border-accent/10 hover:bg-accent/5 transition-all"
                                onClick={() => setIsProfilesOpen(true)}
                            >
                                <User className="h-4 w-4" />
                                Gerenciar Perfis
                            </Button>
                        </div>
                    </div>

                    {/* View Switcher & Filters */}
                    <div className="flex flex-col md:flex-row items-center justify-between bg-card/50 p-2 rounded-3xl border border-border backdrop-blur-md gap-4">
                        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-2xl">
                            <Button
                                variant={view === "grid" ? "gold" : "ghost"}
                                className={cn("rounded-xl h-9 gap-2 px-4", view === "grid" && "shadow-md")}
                                onClick={() => setView("grid")}
                            >
                                <Calendar className="h-4 w-4" />
                                Grade
                            </Button>
                            <Button
                                variant={view === "kanban" ? "gold" : "ghost"}
                                className={cn("rounded-xl h-9 gap-2 px-4", view === "kanban" && "shadow-md")}
                                onClick={() => setView("kanban")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Kanban
                            </Button>
                            <div className="w-px h-6 bg-border mx-1" />
                            <Button
                                variant={view === "diretrizes" ? "gold" : "ghost"}
                                className={cn("rounded-xl h-9 gap-2 px-4", view === "diretrizes" && "shadow-md")}
                                onClick={() => setView("diretrizes")}
                            >
                                <FileText className="h-4 w-4" />
                                Diretrizes
                            </Button>
                            <Button
                                variant={view === "agentes" ? "gold" : "ghost"}
                                className={cn("rounded-xl h-9 gap-2 px-4", view === "agentes" && "shadow-md")}
                                onClick={() => setView("agentes")}
                            >
                                <Bot className="h-4 w-4" />
                                Agentes de IA
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
                    {view === "grid" && (
                        <WeeklyGridView
                            days={daysOfWeek}
                            profiles={sortedProfiles}
                            posts={posts.filter(p => !searchQuery || p.theme?.toLowerCase().includes(searchQuery.toLowerCase()))}
                            getPosts={getPostsForDayAndProfile}
                            onOpenPost={handleOpenPost}
                            onAddPost={handleAddNewPost}
                        />
                    )}
                    {view === "kanban" && (
                        <KanbanView
                            posts={posts.filter(p => !searchQuery || p.theme?.toLowerCase().includes(searchQuery.toLowerCase()))}
                            onOpenPost={handleOpenPost}
                            onAddPost={handleAddNewPost}
                        />
                    )}
                    {view === "diretrizes" && (
                        <DiretrizesView />
                    )}
                    {view === "agentes" && (
                        <AgentesIAView />
                    )}

                    <DragOverlay>
                        {activeId && posts.find(p => p.id === activeId) ? (
                            <div className="opacity-80 scale-105 pointer-events-none">
                                <PostKanbanCard
                                    post={posts.find(p => p.id === activeId)!}
                                    onClick={() => { }}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </DndContext>

            {/* Modals */}
            <PostDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                post={selectedPost}
                onUpdate={fetchInitialData}
            />

            <EditorialLineModal
                isOpen={isEditorialOpen}
                onClose={() => setIsEditorialOpen(false)}
                profiles={profiles}
                onSuccess={fetchInitialData}
            />

            <NewPostModal
                isOpen={isNewPostOpen}
                onClose={() => setIsNewPostOpen(false)}
                onSuccess={fetchInitialData}
                profiles={profiles}
                initialDate={newPostInitialData.date}
                initialProfileId={newPostInitialData.profileId}
                initialStatus={newPostInitialData.status}
            />

            <ProfileManagementModal
                isOpen={isProfilesOpen}
                onClose={() => setIsProfilesOpen(false)}
                onSuccess={fetchInitialData}
            />
        </>
    );
}

function WeeklyGridView({ days, profiles, posts, getPosts, onOpenPost, onAddPost }: any) {
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
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-sm overflow-hidden"
                                            style={{ backgroundColor: profile.color + '25', color: profile.color }}
                                        >
                                            {profile.icon?.startsWith('http') ? (
                                                <img src={profile.icon} alt={profile.name} className="h-full w-full object-cover" />
                                            ) : (
                                                profile.icon
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-[11px] tracking-tight leading-none">{profile.name}</p>
                                        </div>
                                    </div>
                                </td>
                                {days.map((day: Date) => {
                                    const cellPosts = getPosts(day, profile.id);
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    return (
                                        <GridCell key={dateStr} id={`grid:${dateStr}:${profile.id}`}>
                                            <div className="flex flex-col gap-2 min-h-[100px]">
                                                {cellPosts.map((post: SocialPost) => (
                                                    <PostGridCard key={post.id} post={post} onClick={() => onOpenPost(post)} />
                                                ))}
                                                <div
                                                    onClick={() => onAddPost(day, profile.id)}
                                                    className="h-10 border-2 border-dashed border-accent/[0.03] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/[0.05] hover:border-accent/10 cursor-pointer mt-auto"
                                                >
                                                    <Plus className="h-4 w-4 text-accent/10" />
                                                </div>
                                            </div>
                                        </GridCell>
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

function GridCell({ id, children }: { id: string, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <td
            ref={setNodeRef}
            className={cn(
                "p-2 border-b border-border align-top transition-colors",
                isOver && "bg-accent/10"
            )}
        >
            {children}
        </td>
    );
}

function PostGridCard({ post, onClick }: { post: SocialPost, onClick: () => void }) {
    if (!post) return null;
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: post.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    const PostTypeIcon = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.icon || Monitor;
    const statusColor = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.color || 'text-muted-foreground';
    const isDelayed = post.status !== 'Publicado' && post.deadline && new Date(post.deadline + "T23:59:59") < new Date();

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            {...attributes}
            {...listeners}
            className={cn(
                "p-3 rounded-2xl border bg-card/50 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group/card relative overflow-hidden h-full flex flex-col",
                STATUS_COLORS[post.status as keyof typeof STATUS_COLORS],
                post.status === 'Publicado' && "bg-emerald-500/10 border-emerald-500/20"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="p-1.5 bg-background/50 rounded-lg">
                    <PostTypeIcon className={cn("h-3 w-3", statusColor)} />
                </div>
                {post.status === 'Publicado' && (
                    <Badge variant="outline" className="h-3.5 px-1 text-[7px] border-emerald-500/30 text-emerald-600 bg-emerald-50 font-black">Lançado</Badge>
                )}
                {isDelayed && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive text-white text-[8px] font-black tracking-widest animate-pulse">
                        <AlertCircle className="h-2 w-2" /> ATRASADO
                    </div>
                )}
            </div>
            <p className={cn(
                "text-[10px] font-black line-clamp-2 mb-2 flex-1 leading-tight",
                post.status === 'Publicado' && "line-through opacity-50"
            )}>
                {post.theme}
            </p>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-accent/5">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-accent shadow-sm flex items-center justify-center text-accent-foreground">
                        <User className="h-3 w-3" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground">
                        {post.scheduled_date ? format(parseISO(post.scheduled_date), 'dd/MM') : '--/--'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black opacity-60">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{post.comments_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KanbanView({ posts, onOpenPost, onAddPost }: { posts: SocialPost[], onOpenPost: (p: SocialPost) => void, onAddPost: (d?: Date, pid?: string, s?: string) => void }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-6 h-[calc(100vh-22rem)] min-h-[600px] px-2">
            {STATUS_PIPELINE.map(status => (
                <KanbanColumn
                    key={status}
                    status={status}
                    posts={posts.filter(p => p.status === status)}
                    onOpenPost={onOpenPost}
                    onAddPost={onAddPost}
                />
            ))}
        </div>
    );
}

function KanbanColumn({ status, posts, onOpenPost, onAddPost }: any) {
    const { setNodeRef } = useSortable({ id: status });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[240px] flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", STATUS_COLORS[status as keyof typeof STATUS_COLORS].split(' ')[1])} />
                    <h3 className="font-black text-[10px] uppercase tracking-tighter opacity-80">{status}</h3>
                    <div className="px-1.5 py-0.5 rounded-full bg-accent/5 border border-accent/10 text-[9px] font-black">
                        {posts.length}
                    </div>
                </div>
                {status === 'Planejado' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md hover:bg-accent/10"
                        onClick={() => onAddPost(undefined, undefined, 'Planejado')}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </div>
            <ScrollArea className="flex-1 bg-card/20 rounded-3xl p-3 border border-border/60 hover:border-accent/10 transition-colors">
                <SortableContext items={posts.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {posts.map((post: any) => (
                            <PostKanbanCard key={post.id} post={post} onClick={() => onOpenPost(post)} />
                        ))}
                    </div>
                </SortableContext>
            </ScrollArea>
        </div>
    );
}

function PostKanbanCard({ post, onClick }: { post: SocialPost, onClick: () => void }) {
    if (!post) return null;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: post.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const PostTypeIcon = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.icon || Monitor;
    const statusColor = POST_TYPES[post.post_type as keyof typeof POST_TYPES]?.color || 'text-muted-foreground';

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "bg-card p-3 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group/kcard border-l-4",
                post.status === 'Publicado' && "bg-emerald-500/10 border-emerald-500/20"
            )}
            style={{ ...style, borderLeftColor: post.profiles?.color || '#gold' }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
                    <PostTypeIcon className={cn("h-3 w-3", statusColor)} />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">{post.post_type}</span>
                </div>
                <div className="flex items-center gap-1">
                    {post.status !== 'Publicado' && post.deadline && new Date(post.deadline + "T23:59:59") < new Date() && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive text-white text-[7px] font-black tracking-widest animate-pulse">
                            <AlertCircle className="h-2 w-2" /> ATRASADO
                        </div>
                    )}
                    {post.status === 'Publicado' && (
                        <Badge variant="outline" className="h-4 text-[8px] border-emerald-500/30 text-emerald-600 bg-emerald-50 font-black tracking-widest uppercase">Publicado</Badge>
                    )}
                </div>
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                </div>
            </div>
            <p className={cn(
                "font-black text-[11px] mb-3 leading-tight tracking-tight line-clamp-2 h-8",
                post.status === 'Publicado' && "line-through opacity-50"
            )}>
                {post.theme}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                    {post.profiles?.icon?.startsWith('http') ? (
                        <img
                            src={post.profiles.icon}
                            alt={post.profiles.name}
                            className="h-7 w-7 rounded-lg object-cover shadow-sm"
                        />
                    ) : (
                        <div
                            className="h-7 w-7 rounded-lg shadow-sm flex items-center justify-center text-sm"
                            style={{ backgroundColor: post.profiles?.color || '#D4AF37' }}
                        >
                            {post.profiles?.icon || '👤'}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-foreground leading-tight truncate max-w-[80px]">
                            {post.profiles?.name || 'Sem perfil'}
                        </span>
                        <span className="text-[8px] text-muted-foreground">
                            {post.scheduled_date ? format(parseISO(post.scheduled_date), 'dd/MM') : '--/--'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/50" title="Comentários">
                        <MessageSquare className="h-3 w-3" />
                        <span>{post.comments_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/50" title="Rastros/Histórico">
                        <History className="h-3 w-3" />
                        <span>{post.history_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
