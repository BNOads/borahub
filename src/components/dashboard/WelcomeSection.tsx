import { Sparkles, MessageCircle, Calendar, FileText, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTodaysTasks } from "@/hooks/useTasks";
import { useActiveFunnelsCount } from "@/hooks/useFunnels";
import { useAuth } from "@/contexts/AuthContext";

const quickActions = [
  {
    label: "Conversa Franca",
    href: "https://forms.gle/Phw9RHKm6vU4zkmP9",
    icon: MessageCircle,
  },
  {
    label: "1x1",
    href: "https://calendar.app.google/KiYUew2CX1Gop9YDA",
    icon: Calendar,
  },
  {
    label: "Relatório Semanal",
    href: "https://forms.clickup.com/9007162734/f/8cdwtbe-43773/TD95CNAUWM5F56Y0SQ",
    icon: FileText,
  },
  {
    label: "Reembolso",
    href: "https://docs.google.com/forms/d/e/1FAIpQLSeGUFdfuH0KFb3Pyd__h82vVIhwKqrLVEX6jJZKngSCe1F8Mw/viewform",
    icon: Receipt,
  },
];

// Common feminine name endings in Portuguese
const isFeminineName = (name: string): boolean => {
  const lowerName = name.toLowerCase().trim();
  
  // Common feminine endings
  const feminineEndings = ['a', 'ane', 'ene', 'ine', 'ice', 'ete', 'iele', 'elle'];
  
  // Exceptions - names ending in 'a' that are typically masculine
  const masculineExceptions = ['uca', 'luca', 'nikita', 'josua', 'joshua', 'noá', 'noa'];
  
  // Common feminine names that might not follow patterns
  const femininNames = [
    'ana', 'maria', 'julia', 'juliana', 'fernanda', 'amanda', 'bruna', 'camila',
    'carolina', 'beatriz', 'leticia', 'larissa', 'mariana', 'gabriela', 'rafaela',
    'patricia', 'adriana', 'luciana', 'daniela', 'priscila', 'vanessa', 'jessica',
    'aline', 'michele', 'michele', 'raquel', 'debora', 'natalia', 'cristina',
    'sandra', 'carla', 'paula', 'renata', 'simone', 'viviane', 'elaine', 'rose',
    'isabel', 'marta', 'lucia', 'silvia', 'sonia', 'vera', 'regina', 'tereza',
    'helena', 'alice', 'clara', 'laura', 'lara', 'livia', 'isadora', 'victoria',
    'valentina', 'sofia', 'luiza', 'giovanna', 'manuela', 'rafaella', 'rebeca',
    'sarah', 'tais', 'thaís', 'thais', 'ingrid', 'karen', 'kelly', 'miriam'
  ];
  
  if (masculineExceptions.some(exc => lowerName.includes(exc))) {
    return false;
  }
  
  if (femininNames.includes(lowerName)) {
    return true;
  }
  
  return feminineEndings.some(ending => lowerName.endsWith(ending));
};

export function WelcomeSection() {
  const { profile } = useAuth();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const userName = profile?.display_name || profile?.full_name?.split(' ')[0] || 'usuário';
  
  const welcomeText = isFeminineName(userName) ? "Bem-vinda" : "Bem-vindo";

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useTodaysTasks();
  const { data: activeFunnelsCount = 0, isLoading: funnelsLoading, isError: funnelsError } = useActiveFunnelsCount();
  
  const pendingTasks = tasks?.filter(task => !task.completed) ?? [];
  const pendingCount = pendingTasks.length;
  
  const isLoading = tasksLoading || funnelsLoading;
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 animate-fade-in">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">{greeting}</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-foreground">
            {welcomeText}, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Sua central de tarefas, eventos e atalhos de operação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent text-xs"
              asChild
            >
              <a href={action.href} target="_blank" rel="noopener noreferrer">
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
