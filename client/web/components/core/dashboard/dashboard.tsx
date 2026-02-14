"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { Conversations } from "./conversations";
import { Sessions } from "./sessions";
import { Profile } from "./profile";
import { Settings } from "./settings";
import { Admin } from "./admin";
import { Notifications } from "./notifications";
import { LayoutDashboard, MessageSquare, Shield, User, Settings as SettingsIcon, ShieldCheck, Bell } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUi, DashboardView } from "@/context/ui-context";

export const DashboardUI = () => {
    const { user } = useAuth();
    const { activeDashboardView, setActiveDashboardView } = useUi();

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="space-y-6">
                {/* Dashboard Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your account, conversations, and settings
                    </p>
                </div>

                {/* Dashboard Tabs */}
                <Tabs value={activeDashboardView} onValueChange={(v) => setActiveDashboardView(v as DashboardView)} className="space-y-6">
                    <TabsList className={`grid w-full grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2`}>
                        <TabsTrigger value="overview">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="conversations">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Conversations</span>
                        </TabsTrigger>
                        <TabsTrigger value="sessions">
                            <Shield className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Sessions</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile">
                            <User className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Profile</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <SettingsIcon className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                        {user?.role === "admin" && (
                            <TabsTrigger value="admin">
                                <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />
                                <span className="hidden sm:inline">Admin</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="overview">
                        <Overview onNavigateToConversations={() => setActiveDashboardView("conversations")} />
                    </TabsContent>

                    <TabsContent value="conversations">
                        <Conversations />
                    </TabsContent>

                    <TabsContent value="sessions">
                        <Sessions />
                    </TabsContent>

                    <TabsContent value="profile">
                        <Profile />
                    </TabsContent>


                    <TabsContent value="settings">
                        <Settings onNavigateToSessions={() => setActiveDashboardView("sessions")} />
                    </TabsContent>

                    {user?.role === "admin" && (
                        <TabsContent value="admin">
                            <Admin />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
};
