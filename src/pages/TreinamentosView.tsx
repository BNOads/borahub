
import { useState, useEffect } from "react";
import { Search, Filter, Play, BookOpen, GraduationCap, MoreVertical, Trash2, Edit, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CourseModal } from "@/components/treinamentos/CourseModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Course {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnail_url: string;
}

interface Lesson {
    id: string;
    course_id: string;
    title: string;
    description: string;
    course_title?: string;
}

export default function TreinamentosView() {
    const { isAdmin } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    useEffect(() => {
        fetchCourses();
        fetchLessons();
    }, []);

    async function fetchCourses() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchLessons() {
        try {
            const { data, error } = await supabase
                .from("lessons")
                .select("id, course_id, title, description, courses(title)")
                .order("order_index", { ascending: true });

            if (error) throw error;
            const lessonsWithCourse = data?.map(lesson => ({
                ...lesson,
                course_title: (lesson.courses as any)?.title
            })) || [];
            setLessons(lessonsWithCourse);
        } catch (error) {
            console.error("Error fetching lessons:", error);
        }
    }

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
            course.category?.toLowerCase().includes(search.toLowerCase());

        return matchesSearch;
    });

    const filteredLessons = search.length > 1 ? lessons.filter(lesson => {
        return lesson.title.toLowerCase().includes(search.toLowerCase()) ||
            lesson.description?.toLowerCase().includes(search.toLowerCase());
    }) : [];
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Treinamentos</h1>
                    <p className="text-muted-foreground mt-1">Cursos e capacitações da equipe</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => {
                        setSelectedCourse(null);
                        setIsModalOpen(true);
                    }} className="rounded-xl bg-accent hover:bg-accent/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Curso
                    </Button>
                )}
            </div>

            <CourseModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCourse(null);
                }}
                course={selectedCourse}
                onSuccess={fetchCourses}
            />

            {/* Search and Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar cursos ou aulas..."
                        className="pl-10 h-12 rounded-full border-accent/20 focus-visible:ring-accent"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-12 rounded-xl px-6 gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                </Button>
            </div>

            {/* Lesson Search Results */}
            {filteredLessons.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Aulas Encontradas ({filteredLessons.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredLessons.map((lesson) => (
                            <Card key={lesson.id} className="group p-4 rounded-2xl border-accent/10 hover:border-accent/40 transition-all hover:bg-accent/5">
                                <Link to={`/treinamentos/${lesson.course_id}/aula/${lesson.id}`} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                                        <Play className="h-4 w-4 fill-current" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                                            {lesson.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {lesson.course_title}
                                        </p>
                                    </div>
                                </Link>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold mb-6">Cursos Disponíveis</h2>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-accent/5 animate-pulse rounded-3xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Card key={course.id} className="group overflow-hidden rounded-3xl border-accent/10 hover:border-accent/40 transition-all hover:shadow-xl bg-card/50 backdrop-blur-sm">
                                <CardHeader className="p-6 pb-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="secondary" className={cn(
                                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                                            course.level === 'Iniciante' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                                "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                                        )}>
                                            {course.level}
                                        </Badge>
                                        {isAdmin && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-accent/10 rounded-full">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedCourse(course);
                                                        setIsModalOpen(true);
                                                    }}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Editar Curso
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={async () => {
                                                        if (confirm("Deseja realmente excluir este curso?")) {
                                                            const { error } = await supabase.from("courses").delete().eq("id", course.id);
                                                            if (error) toast.error("Erro ao excluir curso");
                                                            else {
                                                                toast.success("Curso excluído");
                                                                fetchCourses();
                                                            }
                                                        }
                                                    }}>
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Excluir Curso
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {course.description || "Sem descrição disponível"}
                                    </p>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-medium">Categoria:</span>
                                        <Badge variant="outline" className="rounded-full bg-accent/5 border-accent/20 text-foreground font-medium">
                                            {course.category}
                                        </Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 pt-0">
                                    <Button asChild className="w-full rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground h-11">
                                        <Link to={`/treinamentos/${course.id}`} className="gap-2">
                                            <Play className="h-4 w-4 fill-current" />
                                            Acessar Curso
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
