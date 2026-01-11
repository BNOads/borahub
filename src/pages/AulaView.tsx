
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface Course {
    id: string;
    title: string;
}

interface Lesson {
    id: string;
    course_id: string;
    title: string;
    description: string;
    video_url: string;
    duration: string;
    order_index: number;
}

export default function AulaView() {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (courseId && lessonId) {
            fetchLessonDetails();
        }
    }, [courseId, lessonId]);

    async function fetchLessonDetails() {
        try {
            setLoading(true);

            // Fetch Course
            const { data: courseData } = await supabase
                .from("courses")
                .select("id, title")
                .eq("id", courseId)
                .single();
            setCourse(courseData);

            // Fetch Lesson
            const { data: lessonData, error: lessonError } = await supabase
                .from("lessons")
                .select("*")
                .eq("id", lessonId)
                .single();

            if (lessonError) throw lessonError;
            setLesson(lessonData);

            // Fetch Progress
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: progressData } = await supabase
                    .from("user_lesson_progress")
                    .select("completed")
                    .eq("user_id", user.id)
                    .eq("lesson_id", lessonId)
                    .maybeSingle();

                setCompleted(progressData?.completed || false);
            }

        } catch (error) {
            console.error("Error fetching lesson details:", error);
        } finally {
            setLoading(false);
        }
    }

    async function toggleCompletion() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const newStatus = !completed;

            const { error } = await supabase
                .from("user_lesson_progress")
                .upsert({
                    user_id: user.id,
                    lesson_id: lessonId,
                    completed: newStatus,
                    completed_at: newStatus ? new Date().toISOString() : null,
                    last_watched_at: new Date().toISOString()
                });

            if (error) throw error;
            setCompleted(newStatus);
        } catch (error) {
            console.error("Error toggling completion:", error);
        }
    }

    // Extract YouTube ID if applicable
    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        return url;
    };

    if (loading) return <div className="p-8">Carregando...</div>;
    if (!lesson) return <div className="p-8">Aula não encontrada.</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 mt-4">
            {/* Back Link */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild className="hover:bg-accent/5 -ml-2 text-muted-foreground hover:text-foreground">
                    <Link to={`/treinamentos/${courseId}`} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para o curso
                    </Link>
                </Button>
            </div>

            <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">{course?.title}</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight max-w-3xl leading-snug">
                    {lesson.title}
                </h1>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 border border-border shadow-2xl relative">
                {lesson.video_url ? (
                    <iframe
                        src={getEmbedUrl(lesson.video_url)}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Video className="h-16 w-16 opacity-10" />
                        <p className="font-medium">Nenhum vídeo disponível para esta aula.</p>
                    </div>
                )}
            </div>

            {/* Progress Card */}
            <Card className="p-8 rounded-[2.5rem] border-accent/10 shadow-lg bg-card/50 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black tracking-tight">Progresso da Aula</h2>
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2 group">
                                <div className={cn(
                                    "h-3 w-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                    completed ? "bg-emerald-500 shadow-emerald-500/40 scale-125" : "bg-slate-300 dark:bg-slate-700"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold transition-colors duration-300",
                                    completed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                )}>
                                    {completed ? "Aula concluída" : "Aula não concluída"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground bg-accent/5 px-3 py-1.5 rounded-full">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">Duração: {lesson.duration || "0:01"}</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={toggleCompletion}
                        variant={completed ? "outline" : "default"}
                        className={cn(
                            "rounded-2xl px-8 h-12 font-bold text-sm transition-all duration-300 shadow-lg",
                            completed
                                ? "border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 hover:text-emerald-700 dark:text-emerald-400"
                                : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-accent/20"
                        )}
                    >
                        {completed ? (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como não concluída
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Concluir aula
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
