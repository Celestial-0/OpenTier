import { useRef } from "react";
import {
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";

import { ChevronsUpDown } from "lucide-react";
import { UserIcon, SettingsIcon, BellIcon, LogoutIcon, UsersIcon } from "@/components/core/common/icons/animated";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";
import { useUi, DashboardView } from "@/context/ui-context";
import { useAuth } from "@/context/auth-context";

export const Menu = () => {
  const iconRefs = useRef<Record<string, any>>({});
  const { user } = useUserStore();
  const { navigateToDashboard } = useUi();
  const { logout } = useAuth();

  const userData = {
    name: user?.name || "User",
    email: user?.email || "m@example.com",
    avatar: user?.avatar_url || "https://github.com/shadcn.png",
    initials: user?.name ? user.name.substring(0, 2).toUpperCase() : "U",
  };

  const menuItems: { label: string; icon: any; view?: DashboardView }[] = [
    { label: "Dashboard", icon: UsersIcon, view: "overview" },
    { label: "Settings", icon: SettingsIcon, view: "settings" },
    { label: "Notifications", icon: BellIcon, view: "notifications" },
  ];

  const handleMouseEnter = (label: string) => {
    if (iconRefs.current[label]?.startAnimation) {
      iconRefs.current[label].startAnimation();
    }
  };

  const handleMouseLeave = (label: string) => {
    if (iconRefs.current[label]?.stopAnimation) {
      iconRefs.current[label].stopAnimation();
    }
  };

  const handleItemClick = (view?: DashboardView) => {
    if (view) {
      navigateToDashboard(view);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full focus-visible:outline-none">
            <div
              className={cn(
                sidebarMenuButtonVariants({ size: "lg" }),
                "w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-in-out hover:bg-sidebar-accent/50"
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className="rounded-lg font-medium">{userData.initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">{userData.name}</span>
                <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/50" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-xl border-border/50 bg-background/95 backdrop-blur-xl shadow-xl"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback className="rounded-lg">{userData.initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userData.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/50" />

            <DropdownMenuGroup>
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleItemClick(item.view)}
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={() => handleMouseLeave(item.label)}
                    className="group gap-3 p-2 cursor-pointer focus:bg-accent focus:text-accent-foreground"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border border-border/30 bg-background/50 text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-focus:bg-accent group-focus:text-accent-foreground">
                      <Icon ref={(el: any) => iconRefs.current[item.label] = el} />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/50" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => logout()}
                onMouseEnter={() => handleMouseEnter("Log out")}
                onMouseLeave={() => handleMouseLeave("Log out")}
                className="group gap-3 p-2 cursor-pointer focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20 dark:focus:text-red-400"
              >
                <div className="flex size-6 items-center justify-center rounded-md border border-border/30 bg-background/50 text-muted-foreground transition-colors group-hover:text-red-600 group-focus:text-red-600 dark:group-hover:text-red-400">
                  <LogoutIcon ref={(el: any) => iconRefs.current["Log out"] = el} />
                </div>
                <span className="font-medium text-sm">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};