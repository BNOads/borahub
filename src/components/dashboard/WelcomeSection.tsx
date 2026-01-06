import { Sparkles } from "lucide-react";

export function WelcomeSection() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 p-8 text-primary-foreground animate-fade-in">
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-accent mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">{greeting}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Bem-vindo, João!
        </h1>
        <p className="text-primary-foreground/70 max-w-xl">
          Você tem <span className="text-accent font-semibold">5 tarefas</span> pendentes hoje e{" "}
          <span className="text-accent font-semibold">2 lançamentos</span> ativos. Vamos fazer acontecer!
        </p>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-20 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
    </div>
  );
}
