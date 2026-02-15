import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function DirectRedirect() {
    const { slug } = useParams<{ slug: string }>();
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!slug) {
            setError(true);
            return;
        }

        async function redirect() {
            try {
                // Fetch the target URL
                const { data, error: fetchError } = await supabase
                    .from("direct_links")
                    .select("id, target_url, click_count")
                    .eq("slug", slug)
                    .single();

                if (fetchError || !data) {
                    setError(true);
                    return;
                }

                // Increment click count
                await supabase
                    .from("direct_links")
                    .update({ click_count: (data.click_count || 0) + 1 } as any)
                    .eq("id", data.id);

                // Redirect
                window.location.href = data.target_url;
            } catch {
                setError(true);
            }
        }

        redirect();
    }, [slug]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-foreground">Link não encontrado</h1>
                    <p className="text-muted-foreground">Este redirect link não existe ou foi removido.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Redirecionando...</p>
            </div>
        </div>
    );
}
