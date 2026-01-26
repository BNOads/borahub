
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Plus, Play, CheckCircle2, MoreVertical, Video, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CourseModal } from "@/components/treinamentos/CourseModal";
import { LessonModal } from "@/components/treinamentos/LessonModal";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getVideoInfo } from "@/lib/videoUtils";

interface Course {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
}

interface Lesson {
    id: string;
    title: string;
    duration: number | null;
    position: number;
    video_url?: string;
    completed?: boolean;
}

export default function CursoDetalhes() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState({ total: 0, completed: 0 });
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);

    useEffect(() => {
        if (courseId) {
            fetchCourseDetails();
        }
    }, [courseId]);

    async function fetchCourseDetails() {
        try {
            setLoading(true);

            // Fetch Course
            const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            // Fetch Lessons
            const { data: lessonsData, error: lessonsError } = await supabase
                .from("lessons")
                .select("*")
                .eq("course_id", courseId)
                .order("position", { ascending: true });

            if (lessonsError) throw lessonsError;

            // Fetch Progress
            const { data: { user } } = await supabase.auth.getUser();
            let completedLessons: string[] = [];

            if (user) {
                const { data: progressData } = await supabase
                    .from("user_lesson_progress")
                    .select("lesson_id")
                    .eq("user_id", user.id)
                    .eq("completed", true);

                completedLessons = progressData?.map(p => p.lesson_id) || [];
            }

            const lessonsWithProgress: Lesson[] = (lessonsData || []).map((lesson: any) => ({
                ...lesson,
                position: lesson.position ?? 0,
                completed: completedLessons.includes(lesson.id)
            }));

            setLessons(lessonsWithProgress);
            setProgress({
                total: lessonsWithProgress.length,
                completed: lessonsWithProgress.filter(l => l.completed).length
            });

        } catch (error) {
            console.error("Error fetching course details:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>;
    if (!course) return <div className="p-8">Curso não encontrado.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back Link */}
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-accent/5 -ml-2 text-muted-foreground hover:text-foreground gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </Button>

            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-accent/5 dark:bg-accent/10 p-10 border border-accent/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tight">{course.title}</h1>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-slate-800 text-white hover:bg-slate-700 uppercase px-3 py-1 font-bold tracking-wider text-[10px]">
                                {course.category}
                            </Badge>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 font-medium px-3 py-1">
                                {course.level}
                            </Badge>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 font-medium px-3 py-1">
                                <Video className="h-3 w-3 mr-1" />
                                video
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            Total de {progress.total} aulas • {progress.completed} concluídas
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => setIsCourseModalOpen(true)} variant="outline" className="rounded-xl border-accent/20 h-11 px-5 shadow-sm bg-background">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Curso
                        </Button>
                        <Button onClick={() => {
                            setSelectedLesson(null);
                            setIsLessonModalOpen(true);
                        }} className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground h-11 px-6 shadow-lg shadow-accent/20">
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Aula
                        </Button>
                    </div>
                </div>

                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            </div>

            <CourseModal
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                course={course}
                onSuccess={fetchCourseDetails}
            />

            <LessonModal
                isOpen={isLessonModalOpen}
                onClose={() => setIsLessonModalOpen(false)}
                courseId={courseId!}
                lesson={selectedLesson}
                onSuccess={fetchCourseDetails}
            />

            {/* Lesson List */}
            <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    Aulas do Curso
                </h2>

                <div className="space-y-3">
                    {lessons.length > 0 ? (
                        lessons.map((lesson, index) => {
                            const videoInfo = lesson.video_url ? getVideoInfo(lesson.video_url) : null;
                            const thumbnail = videoInfo?.thumbnailUrl;

                            return (
                                <Card
                                    key={lesson.id}
                                    className="group p-4 rounded-2xl border-accent/5 hover:border-accent/40 transition-all hover:bg-accent/5 cursor-pointer shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail ou numero */}
                                        <div
                                            className="relative h-16 w-28 rounded-xl bg-accent/10 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                                            onClick={() => navigate(`/treinamentos/${courseId}/aula/${lesson.id}`)}
                                        >
                                            {thumbnail ? (
                                                <>
                                                    <img
                                                        src={thumbnail}
                                                        alt={lesson.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                    <div className="hidden absolute inset-0 bg-accent/10 flex items-center justify-center">
                                                        <span className="text-accent font-black text-xl">{index + 1}</span>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="h-6 w-6 text-white fill-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-accent font-black text-xl">{index + 1}</span>
                                            )}
                                            {lesson.completed && (
                                                <div className="absolute top-1 right-1">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => navigate(`/treinamentos/${courseId}/aula/${lesson.id}`)}
                                        >
                                            <h3 className="text-base font-bold truncate group-hover:text-accent transition-colors">
                                                {lesson.title}
                                            </h3>
                                            {lesson.duration && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {lesson.duration} min
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedLesson(lesson);
                                                        setIsLessonModalOpen(true);
                                                    }}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Editar Aula
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={async () => {
                                                            if (confirm("Deseja realmente excluir esta aula?")) {
                                                                const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
                                                                if (error) toast.error("Erro ao excluir aula");
                                                                else {
                                                                    toast.success("Aula excluída");
                                                                    fetchCourseDetails();
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Excluir Aula
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <div
                                                className="h-8 w-8 rounded-lg border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all cursor-pointer"
                                                onClick={() => navigate(`/treinamentos/${courseId}/aula/${lesson.id}`)}
                                            >
                                                <Play className="h-3.5 w-3.5 fill-current" />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 bg-accent/5 rounded-[2.5rem] border border-dashed border-accent/20">
                            <p className="text-muted-foreground">Nenhuma aula cadastrada ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
