import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { BoraNewsWidget } from "@/components/bora-news/BoraNewsWidget";
import { ActiveLaunches } from "@/components/dashboard/ActiveLaunches";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PendingPDIs } from "@/components/dashboard/PendingPDIs";
import { TeamPDIs } from "@/components/dashboard/TeamPDIs";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isAdmin, isGuest } = useAuth();

  if (isGuest) {
    return (
      <div className="space-y-8">
        <WelcomeSection />
        <TodaysTasks />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WelcomeSection />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UpcomingEvents />
        <TodaysTasks />
      </div>

      <ActiveLaunches />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BoraNewsWidget />
        <PendingPDIs />
      </div>

      {isAdmin && (
        <TeamPDIs />
      )}
    </div>
  );
};

export default Index;
