import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export default function Placeholder() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="p-4 rounded-full bg-accent/10 mb-6">
        <Construction className="h-12 w-12 text-accent" />
      </div>
      <h1 className="text-3xl font-bold mb-2">{pageName || "Página"}</h1>
      <p className="text-muted-foreground max-w-md">
        Esta seção está em desenvolvimento. Em breve você terá acesso a todas as funcionalidades.
      </p>
    </div>
  );
}
