"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./overview";
import { Conversations } from "./conversations";
import { Sessions } from "./sessions";
import { Profile } from "./profile";
import { Settings } from "./settings";
import { Contributor } from "./contributor";
import { Admin } from "./admin";
import {
  LayoutDashboard,
  MessageSquare,
  Shield,
  User,
  Settings as SettingsIcon,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useUi } from "@/context/ui-context";
import { DashboardView } from "@/types/dashboard";

export const DashboardUI = () => {
  const { user } = useAuth();
  const { activeDashboardView, setActiveDashboardView } = useUi();

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 max-w-7xl">
      <div className="space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="pt-2 sm:pt-4">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            Manage your account, conversations, and settings
          </p>
        </div>

        <Tabs
          value={activeDashboardView}
          onValueChange={(v) => setActiveDashboardView(v as DashboardView)}
          className="space-y-3"
        >
          
          {/* 🔥 Mobile-first Tabs */}
          <div className="sticky top-0 z-10 bg-background pb-2">
            <TabsList
              className="
                flex w-full gap-2 overflow-x-auto no-scrollbar
                sm:grid sm:overflow-visible
                sm:grid-cols-5
                lg:grid-cols-6
              "
            >
              {/* Tab Item */}
              <TabsTrigger value="overview" className="shrink-0">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Overview</span>
              </TabsTrigger>

              <TabsTrigger value="conversations" className="shrink-0">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Conversations</span>
              </TabsTrigger>

              <TabsTrigger value="sessions" className="shrink-0">
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Sessions</span>
              </TabsTrigger>

              <TabsTrigger value="profile" className="shrink-0">
                <User className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Profile</span>
              </TabsTrigger>

              <TabsTrigger value="settings" className="shrink-0">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Settings</span>
              </TabsTrigger>

              {user?.role === "contributor" && (
                <TabsTrigger value="contributor" className="shrink-0">
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <span className="hidden md:inline ml-2">Contribute</span>
                </TabsTrigger>
              )}

              {user?.role === "admin" && (
                <TabsTrigger value="admin" className="shrink-0">
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                  <span className="hidden md:inline ml-2">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Content */}
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