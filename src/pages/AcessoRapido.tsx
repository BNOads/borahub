import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  Link as LinkIcon,
  Key,
  FileText,
  Calendar,
  Target,
  TrendingUp,
  BookMarked,
  MessageSquare,
  Trophy,
  Sparkles,
  LayoutGrid,
  DollarSign,
  Rocket,
  Palette,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    name: "Central de Treinamentos",
    description: "Acesse cursos, trilhas de aprendizado e certificações da equipe",
    href: "/treinamentos",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    name: "Equipe",
    description: "Diretório completo de todos os membros da empresa",
    href: "/equipe",
    icon: Users,
    color: "bg-green-500/10 text-green-500",
  },
  {
    name: "Guia de Sobrevivência",
    description: "Cultura, organograma e principais processos da empresa",
    href: "/guia",
    icon: BookMarked,
    color: "bg-indigo-500/10 text-indigo-500",
  },
  {
    name: "Links Importantes",
    description: "Central de links úteis organizados por categoria",
    href: "/links",
    icon: LinkIcon,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    name: "Senhas Úteis",
    description: "Gerencie credenciais e acessos da equipe de forma segura",
    href: "/senhas",
    icon: Key,
    color: "bg-rose-500/10 text-rose-500",
  },
  {
    name: "Gestão de Conteúdo",
    description: "Kanban de produção e cronograma de publicações",
    href: "/conteudo",
    icon: FileText,
    color: "bg-pink-500/10 text-pink-500",
  },
  {
    name: "Arquivo de Reuniões",
    description: "Pautas, atas e gravações de todas as reuniões",
    href: "/reunioes",
    icon: Calendar,
    color: "bg-cyan-500/10 text-cyan-500",
  },
  {
    name: "Gestão de Lançamentos",
    description: "Gerencie e acompanhe todos os lançamentos e campanhas",
    href: "/funis",
    icon: Rocket,
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    name: "Orçamentos por Funil",
    description: "Gerencie orçamentos de marketing organizados por funil",
    href: "/funis",
    icon: DollarSign,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    name: "Metas e OKRs",
    description: "Acompanhe objetivos e resultados-chave do trimestre",
    href: "/metas",
    icon: Target,
    color: "bg-red-500/10 text-red-500",
  },
  {
    name: "Desafio do Mês",
    description: "Participe dos desafios mensais e acompanhe o ranking",
    href: "/desafio",
    icon: Trophy,
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    name: "Assistente IA",
    description: "Assistente virtual para auxílio em tarefas e dúvidas",
    href: "/assistente",
    icon: Bot,
    color: "bg-violet-500/10 text-violet-500",
  },
];

export default function AcessoRapido() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ferramentas</h1>
          <p className="text-muted-foreground mt-1">
            Centro de ferramentas para produtividade e criação
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-muted transition-colors">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, index) => (
          <Link
            key={tool.name}
            to={tool.href}
            className="group rounded-xl border border-border bg-card p-6 hover:border-accent/50 hover:shadow-lg transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className={cn(
              "inline-flex p-3 rounded-xl mb-4 transition-transform group-hover:scale-110",
              tool.color
            )}>
              <tool.icon className="h-6 w-6" />
            </div>

            <h3 className="font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
              {tool.name}
            </h3>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
