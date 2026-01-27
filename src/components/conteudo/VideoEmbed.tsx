import { useState } from "react";
import { Play, Film, ExternalLink, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMediaInfo } from "@/lib/videoUtils";

interface MediaEmbedProps {
    url: string;
    className?: string;
    showPlayButton?: boolean;
}

export function VideoEmbed({ url, className, showPlayButton = true }: MediaEmbedProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [imageError, setImageError] = useState(false);
    const mediaInfo = getMediaInfo(url);

    if (!url) return null;

    const handlePlay = () => {
        setIsPlaying(true);
    };

    // Se for imagem, renderiza diretamente
    if (mediaInfo.isImage) {
        return (
            <div className={cn("relative w-full aspect-video rounded-2xl overflow-hidden bg-muted", className)}>
                {!imageError ? (
                    <img
                        src={url}
                        alt="Post media"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                )}
                {/* Badge do tipo */}
                <div className="absolute top-3 left-3">
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Imagem
                    </div>
                </div>
            </div>
        );
    }

    // Se está tocando, mostra o iframe (para vídeos)
    if (isPlaying) {
        return (
            <div className={cn("relative w-full aspect-video rounded-2xl overflow-hidden bg-black", className)}>
                <iframe
                    src={mediaInfo.embedUrl}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    // Thumbnail com botão de play (para vídeos)
    return (
        <div 
            className={cn(
                "relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/80 cursor-pointer group",
                className
            )}
            onClick={handlePlay}
        >
            {/* Thumbnail */}
            {mediaInfo.thumbnailUrl ? (
                <img
                    src={mediaInfo.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Film className="h-16 w-16 text-muted-foreground/30" />
                </div>
            )}

            {/* Overlay escuro */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

            {/* Botão de Play */}
            {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-background/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="h-7 w-7 text-foreground ml-1" fill="currentColor" />
                    </div>
                </div>
            )}

            {/* Badge do tipo de vídeo */}
            <div className="absolute top-3 left-3">
                <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5" />
                    {mediaInfo.type === "google-drive" && "Google Drive"}
                    {mediaInfo.type === "youtube" && "YouTube"}
                    {mediaInfo.type === "vimeo" && "Vimeo"}
                    {mediaInfo.type === "unknown" && "Vídeo"}
                </div>
            </div>
        </div>
    );
}

interface VideoInputProps {
    value: string;
    onChange: (url: string) => void;
    onSave?: () => void;
    saving?: boolean;
    className?: string;
}

export function VideoInput({ value, onChange, onSave, saving, className }: VideoInputProps) {
    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center gap-2">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Cole o link do Google Drive, YouTube ou Vimeo..."
                    className="flex-1 h-10 px-4 rounded-xl border border-accent/20 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                {value && (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-xl border border-accent/20 flex items-center justify-center hover:bg-accent/10 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                )}
            </div>
            {value && (
                <VideoEmbed url={value} className="mt-3" />
            )}
        </div>
    );
}
