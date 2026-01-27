// Utilitario para lidar com URLs de midia (YouTube, Google Drive, Vimeo, imagens)

export type MediaType = "youtube" | "google-drive" | "vimeo" | "image" | "unknown";

export interface MediaInfo {
  type: MediaType;
  id: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  isImage: boolean;
}

// Extensoes de imagem suportadas
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

// Verificar se eh uma URL de imagem
function isImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}

// Extrair ID do YouTube
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Extrair ID do Google Drive
function getGoogleDriveId(url: string): string | null {
  // Formatos suportados:
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Extrair ID do Vimeo
function getVimeoId(url: string): string | null {
  const regExp = /(?:vimeo\.com\/)(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Obter informacoes da midia a partir da URL
export function getMediaInfo(url: string): MediaInfo {
  if (!url) {
    return { type: "unknown", id: null, embedUrl: "", thumbnailUrl: null, isImage: false };
  }

  // Verificar se eh imagem primeiro
  if (isImageUrl(url)) {
    return {
      type: "image",
      id: null,
      embedUrl: url,
      thumbnailUrl: url,
      isImage: true,
    };
  }

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = getYouTubeId(url);
    return {
      type: "youtube",
      id,
      embedUrl: id ? `https://www.youtube.com/embed/${id}` : url,
      thumbnailUrl: id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null,
      isImage: false,
    };
  }

  // Google Drive
  if (url.includes("drive.google.com")) {
    const id = getGoogleDriveId(url);
    return {
      type: "google-drive",
      id,
      embedUrl: id ? `https://drive.google.com/file/d/${id}/preview` : url,
      thumbnailUrl: id ? `https://drive.google.com/thumbnail?id=${id}&sz=w640` : null,
      isImage: false,
    };
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const id = getVimeoId(url);
    return {
      type: "vimeo",
      id,
      embedUrl: id ? `https://player.vimeo.com/video/${id}` : url,
      thumbnailUrl: null, // Vimeo precisa de API para thumbnail
      isImage: false,
    };
  }

  // URL desconhecida - tentar usar como embed direto
  return {
    type: "unknown",
    id: null,
    embedUrl: url,
    thumbnailUrl: null,
    isImage: false,
  };
}

// Alias para compatibilidade
export function getVideoInfo(url: string): MediaInfo {
  return getMediaInfo(url);
}

// Verificar se eh uma URL de midia valida
export function isMediaUrl(url: string): boolean {
  if (!url) return false;
  const info = getMediaInfo(url);
  return info.type !== "unknown" || url.includes("embed") || url.includes("player") || info.isImage;
}

// Alias para compatibilidade
export function isVideoUrl(url: string): boolean {
  return isMediaUrl(url);
}
