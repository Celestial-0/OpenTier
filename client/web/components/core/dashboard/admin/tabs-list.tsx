import { Activity, BarChart3, Database, Inbox, Users } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AdminTabsList = () => {
    return (
        <TabsList className="flex w-full gap-1 overflow-x-auto p-1">
            <TabsTrigger value="stats" className="shrink-0 px-3 text-xs sm:text-sm">
                <BarChart3 className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Stats</span>
                <span className="hidden sm:inline">Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 px-3 text-xs sm:text-sm">
                <Users className="mr-2 h-4 w-4" />
                Users
            </TabsTrigger>
            <TabsTrigger value="resources" className="shrink-0 px-3 text-xs sm:text-sm">
                <Database className="mr-2 h-4 w-4" />
                Resources
            </TabsTrigger>
            <TabsTrigger value="queue" className="shrink-0 px-3 text-xs sm:text-sm">
                <Inbox className="mr-2 h-4 w-4" />
                Submissions
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="shrink-0 px-3 text-xs sm:text-sm">
                <Activity className="mr-2 h-4 w-4" />
                Monitoring
            </TabsTrigger>
        </TabsList>
    );
};
