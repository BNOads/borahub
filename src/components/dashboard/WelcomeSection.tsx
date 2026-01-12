import { Sparkles, MessageCircle, Calendar, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function WelcomeSection() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 p-5 text-primary-foreground animate-fade-in">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">{greeting}</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            Bem-vindo, João!
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            Você tem <span className="text-accent font-semibold">5 tarefas</span> pendentes hoje e{" "}
            <span className="text-accent font-semibold">2 lançamentos</span> ativos.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="gold-outline"
              size="sm"
              className="bg-transparent border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground text-xs"
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
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-20 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
    </div>
  );
}
