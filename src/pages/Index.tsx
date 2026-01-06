import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { ActiveLaunches } from "@/components/dashboard/ActiveLaunches";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";

const Index = () => {
  return (
    <div className="space-y-8">
      <WelcomeSection />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar - Quick Access */}
        <div className="lg:col-span-3">
          <QuickAccess />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
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
