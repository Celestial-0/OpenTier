"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { Conversations } from "./conversations";
import { Sessions } from "./sessions";
import { Profile } from "./profile";
import { Settings } from "./settings";
import { Admin } from "./admin";
import { LayoutDashboard, MessageSquare, Shield, User, Settings as SettingsIcon, ShieldCheck } from "lucide-react";

// Mock user role - in real app this would come from auth context
const mockUserRole: "user" | "admin" = "admin";

export const DashboardUI = () => {
    const [activeTab, setActiveTab] = useState("overview");
    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="space-y-6">
                {/* Dashboard Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your account, conversations, and settings
                    </p>
                </div>

                {/* Dashboard Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2">
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
                        {mockUserRole === "admin" && (
                            <TabsTrigger value="admin">
                                <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />
                                <span className="hidden sm:inline">Admin</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="overview">
                        <Overview onNavigateToConversations={() => setActiveTab("conversations")} />
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

                    {mockUserRole === "admin" && (
                        <TabsContent value="admin">
                            <Admin />
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
};