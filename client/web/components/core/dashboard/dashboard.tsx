"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { Conversations } from "./conversations";
import { Sessions } from "./sessions";
import { Profile } from "./profile";
import { Settings } from "./settings";
import { Contributor } from "./contributor";
import { Admin } from "./admin";
import { LayoutDashboard, MessageSquare, Shield, User, Settings as SettingsIcon, ShieldCheck, BookOpen } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUi } from "@/context/ui-context";
import { DashboardView } from "@/types/dashboard";

export const DashboardUI = () => {
    const { user } = useAuth();
    const { activeDashboardView, setActiveDashboardView } = useUi();

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="space-y-6">
                {/* Dashboard Header */}
                <div className="pt-4">
                    <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-lg">
                        Manage your account, conversations, and settings
                    </p>
                </div>

                {/* Dashboard Tabs */}
                <Tabs value={activeDashboardView} onValueChange={(v) => setActiveDashboardView(v as DashboardView)} className="space-y-2">
                    <TabsList className={`grid w-full grid-cols-2 ${
                        user?.role === 'admin' ? 'lg:grid-cols-6' :
                        user?.role === 'contributor' ? 'lg:grid-cols-6' :
                        'lg:grid-cols-5'
                    } gap-2`}>
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
                        {user?.role === "contributor" && (
                            <TabsTrigger value="contributor">
                                <BookOpen className="mr-2 h-4 w-4 text-blue-400" />
                                <span className="hidden sm:inline">Contribute</span>
                            </TabsTrigger>
                        )}
                        {user?.role === "admin" && (
                            <TabsTrigger value="admin">
                                <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />
                                <span className="hidden sm:inline">Admin</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="overview">
                        <Overview />
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
                        <Settings />
                    </TabsContent>

                    {user?.role === "admin" && (
                        <TabsContent value="admin">
                            <Admin />
                        </TabsContent>
                    )}

                    {user?.role === "contributor" && (
                        <TabsContent value="contributor">
                            <Contributor />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
};
