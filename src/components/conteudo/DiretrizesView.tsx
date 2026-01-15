import { useState } from "react";
import {
    FileText,
    Edit3,
    Save,
    X,
    BookOpen,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_DIRETRIZES = `# Diretrizes de Criação de Conteúdo

## 1. Identidade Visual

### Cores
- Utilize sempre as cores da marca
- Mantenha consistência visual entre os posts
- Evite cores muito saturadas ou conflitantes

### Tipografia
- Títulos: fonte bold, tamanho maior
- Texto: fonte regular, fácil leitura
- Evite usar mais de 2 fontes por post

### Elementos Gráficos
- Use ícones e ilustrações da biblioteca aprovada
- Mantenha margens e espaçamentos consistentes
- Aplique os filtros padrão em fotos

---

## 2. Tom de Voz

### Comunicação
- Seja autêntico e próximo
- Use linguagem clara e objetiva
- Adapte o tom ao público de cada rede

### Engajamento
- Faça perguntas para gerar interação
- Responda comentários de forma personalizada
- Use CTAs claros e diretos

---

## 3. Tipos de Conteúdo

### Reels
- Duração ideal: 15-30 segundos
- Gancho nos primeiros 3 segundos
- Legendas para acessibilidade
- Áudio trending quando possível

### Carrossel
- Máximo de 10 slides
- Primeiro slide: gancho forte
- Último slide: CTA
- Informações progressivas

### Stories
- Conteúdo mais casual e bastidores
- Use enquetes e perguntas
- Frequência: 3-7 por dia
- Destaque conteúdos importantes

### Imagem Única
- Alta qualidade (mínimo 1080x1080)
- Composição equilibrada
- Texto legível se houver
- Hashtags relevantes na legenda

---

## 4. Boas Práticas

### Antes de Publicar
- [ ] Revisar ortografia e gramática
- [ ] Verificar qualidade da imagem/vídeo
- [ ] Conferir tags e menções
- [ ] Validar hashtags
- [ ] Agendar no melhor horário

### Métricas de Sucesso
- Engajamento > 3%
- Salvamentos consistentes
- Crescimento de seguidores
- Alcance orgânico

---

## 5. O Que Evitar

- Erros de português
- Imagens pixeladas ou de baixa qualidade
- Textos muito longos na imagem
- Informações desatualizadas
- Polêmicas e temas sensíveis
- Excesso de hashtags (máx. 10-15)

---

*Última atualização: Este documento é vivo e deve ser atualizado conforme a estratégia evolui.*
`;

interface DiretrizesViewProps {
    className?: string;
}

export function DiretrizesView({ className }: DiretrizesViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(DEFAULT_DIRETRIZES);
    const [editContent, setEditContent] = useState(DEFAULT_DIRETRIZES);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        try {
            setSaving(true);
            // Salva localmente já que a tabela content_settings não existe
            setContent(editContent);
            setIsEditing(false);
            toast.success("Diretrizes salvas com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao salvar diretrizes: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setEditContent(content);
        setIsEditing(false);
    }

    function renderMarkdown(text: string) {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let inList = false;
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="space-y-2 my-4">
                        {listItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                {item.startsWith('[ ]') ? (
                                    <>
                                        <div className="h-5 w-5 rounded border border-accent/30 flex-shrink-0 mt-0.5" />
                                        <span>{item.replace('[ ]', '').trim()}</span>
                                    </>
                                ) : item.startsWith('[x]') ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span className="line-through opacity-60">{item.replace('[x]', '').trim()}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                        <span>{item}</span>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
            }
            inList = false;
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('# ')) {
                flushList();
                elements.push(
                    <h1 key={index} className="text-3xl font-black tracking-tight mb-6 mt-8 first:mt-0 text-foreground flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-accent" />
                        </div>
                        {trimmedLine.replace('# ', '')}
                    </h1>
                );
            } else if (trimmedLine.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={index} className="text-xl font-black tracking-tight mb-4 mt-8 text-foreground border-b border-accent/10 pb-2">
                        {trimmedLine.replace('## ', '')}
                    </h2>
                );
            } else if (trimmedLine.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={index} className="text-base font-black mb-3 mt-6 text-accent">
                        {trimmedLine.replace('### ', '')}
                    </h3>
                );
            } else if (trimmedLine.startsWith('- ')) {
                inList = true;
                listItems.push(trimmedLine.replace('- ', ''));
            } else if (trimmedLine.startsWith('---')) {
                flushList();
                elements.push(
                    <hr key={index} className="my-8 border-accent/10" />
                );
            } else if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
                flushList();
                elements.push(
                    <p key={index} className="text-xs text-muted-foreground/60 italic mt-8">
                        {trimmedLine.replace(/\*/g, '')}
                    </p>
                );
            } else if (trimmedLine) {
                flushList();
                elements.push(
                    <p key={index} className="text-sm text-muted-foreground mb-2 leading-relaxed">
                        {trimmedLine}
                    </p>
                );
            } else if (!inList) {
                flushList();
            }
        });

        flushList();
        return elements;
    }

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/10 rounded-2xl">
                        <FileText className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Diretrizes de Conteúdo</h2>
                        <p className="text-sm text-muted-foreground">Orientações e boas práticas para criação de posts</p>
                    </div>
                </div>
                {!isEditing ? (
                    <Button
                        variant="default"
                        className="rounded-2xl gap-2 font-black"
                        onClick={() => setIsEditing(true)}
                    >
                        <Edit3 className="h-4 w-4" />
                        Editar Documento
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className="rounded-2xl gap-2"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            <X className="h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button
                            variant="default"
                            className="rounded-2xl gap-2 font-black"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Salvar Alterações
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="bg-card/30 rounded-[2rem] border border-border overflow-hidden">
                {isEditing ? (
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-amber-600 font-medium">
                                Modo de edição - Use Markdown para formatação
                            </span>
                        </div>
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[600px] font-mono text-sm bg-background/50 border-accent/10 rounded-2xl p-6 resize-none"
                            placeholder="Digite as diretrizes usando Markdown..."
                        />
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-20rem)] min-h-[500px]">
                        <div className="p-8 max-w-4xl mx-auto">
                            {renderMarkdown(content)}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
