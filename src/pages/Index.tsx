import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { BoraNewsWidget } from "@/components/bora-news/BoraNewsWidget";
import { ActiveLaunches } from "@/components/dashboard/ActiveLaunches";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";

const Index = () => {
  return (
    <div className="space-y-8">
      <WelcomeSection />

      <BoraNewsWidget />

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <ActiveLaunches />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TodaysTasks />
            <UpcomingEvents />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
