import { Link, useLocation } from "react-router-dom";
import { Home, GraduationCap, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const fullTabs = [{
  name: "Início",
  href: "/",
  icon: Home
}, {
  name: "Treinamentos",
  href: "/treinamentos",
  icon: GraduationCap
}, {
  name: "Ferramentas",
  href: "/acesso-rapido",
  icon: Wrench
}];

const guestTabs = [{
  name: "Início",
  href: "/",
  icon: Home
}];

export function BottomNav() {
  const location = useLocation();
  const { isGuest } = useAuth();
  const tabs = isGuest ? guestTabs : fullTabs;

  return <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe">
      {/* Glassmorphism background */}
      <div className="mx-3 mb-2 rounded-2xl bg-foreground/95 backdrop-blur-xl border border-border/10 shadow-2xl">
        <div className="px-0 py-0 my-px mx-0 flex-row flex items-center justify-center border-primary border-0">
          {tabs.map(tab => {
          const isActive = location.pathname === tab.href;
          return <Link key={tab.name} to={tab.href} className={cn("flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300", isActive ? "bg-background text-foreground" : "text-background/60 hover:text-background/80")}>
                <tab.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-xs font-medium transition-all", isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
                  {tab.name}
                </span>
              </Link>;
        })}
        </div>
      </div>
    </nav>;
}
