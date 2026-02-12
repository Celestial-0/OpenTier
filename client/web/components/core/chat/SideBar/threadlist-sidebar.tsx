import * as React from "react";
import { OpentierLogo } from "@/components/core/common/logos";
import { Menu } from "@/components/core/chat/SideBar/menupopup";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/core/chat/SideBar/thread-list";

export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header mb-2 border-b">
        <div className="aui-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <Link
                  href="https://opentier.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >

                  <OpentierLogo uniColor className="!h-8 !w-auto" />

                  <div className="aui-sidebar-header-heading mr-6 flex flex-col gap-0.5 leading-none">
                    <span className="aui-sidebar-header-title font-semibold">
                      OpenTier
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="aui-sidebar-content px-2">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter className="aui-sidebar-footer border-t flex items-center">
        <Menu />
      </SidebarFooter>
    </Sidebar>
  );
}
