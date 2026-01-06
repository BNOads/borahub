import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  LayoutGrid,
  Users, 
  Calendar,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Início", href: "/", icon: Home },
  { name: "Acesso", href: "/acesso-rapido", icon: LayoutGrid },
  { name: "Equipe", href: "/equipe", icon: Users },
  { name: "Reuniões", href: "/reunioes", icon: Calendar },
  { name: "Metas", href: "/metas", icon: Target },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Glassmorphism background */}
      <div className="mx-4 mb-4 rounded-2xl bg-foreground/95 backdrop-blur-xl border border-border/10 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-3">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-background text-foreground" 
                    : "text-background/60 hover:text-background/80"
                )}
              >
                <tab.icon className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-xs font-medium transition-all",
                  isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                )}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
        
        {/* Home indicator line */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 bg-background/30 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
