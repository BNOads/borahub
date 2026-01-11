import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { ActiveLaunches } from "@/components/dashboard/ActiveLaunches";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";

const Index = () => {
  return (
    <div className="space-y-8">
      <WelcomeSection />

      {/* Mobile order: Active Launches -> Tasks -> Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mobile: Active Launches (order 1) -> Main Content */}
        <div className="lg:col-span-9 space-y-6 order-1 lg:order-2">
          <ActiveLaunches />
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TodaysTasks />
            <UpcomingEvents />
          </div>
        </div>

        {/* Mobile: Quick Access (order 2) -> Sidebar */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <QuickAccess />
        </div>
      </div>
    </div>
  );
};

export default Index;
