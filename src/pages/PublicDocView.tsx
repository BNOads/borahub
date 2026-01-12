
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Document {
    title: string;
    content: string;
    icon: string;
    updated_at: string;
    is_public: boolean;
}

export default function PublicDocView() {
    const { slug } = useParams();
    const [doc, setDoc] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchPublicDoc();
        }
    }, [slug]);

    async function fetchPublicDoc() {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from("documents")
                .select("*")
                .eq("slug", slug)
                .eq("is_public", true)
                .single();

            if (fetchError) throw fetchError;
            setDoc(data);
        } catch (err) {
            console.error("Error fetching public doc:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 bg-accent/20 rounded-2xl" />
                    <div className="h-4 w-32 bg-accent/10 rounded-full" />
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-6 text-center">
                <div>
                    <h1 className="text-4xl mb-4">404</h1>
                    <p>Documento não encontrado ou não é público.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
            <ScrollArea className="h-screen">
                <div className="max-w-3xl mx-auto py-20 px-6">
                    <div className="mb-12 flex items-center gap-4">
                        <span className="text-5xl">{doc.icon}</span>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{doc.title}</h1>
                    </div>

                    <div
                        className="public-content prose prose-slate dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: doc.content }}
                    />

                    <div className="mt-20 pt-8 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                        <span>Publicado via Borahub</span>
                        <span>Atualizado em {new Date(doc.updated_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </ScrollArea>

            <style>{`
                .public-content {
                    font-size: 1.125rem;
                    line-height: 1.75;
                }
                .public-content h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; }
                .public-content h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; }
                .public-content h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                .public-content p { margin-bottom: 1.25rem; }
                .public-content ul, .public-content ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
                .public-content li { margin-bottom: 0.5rem; }
                .public-content blockquote { border-left: 4px solid hsl(var(--accent)); padding-left: 1rem; font-style: italic; margin-bottom: 1.25rem; }
                .public-content img { border-radius: 0.75rem; margin-bottom: 1.25rem; }
            `}</style>
        </div>
    );
}
