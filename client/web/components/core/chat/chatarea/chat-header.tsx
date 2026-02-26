"use client";

import { useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SidebarLeftIcon,
  LockedIcon,
  ArrowDownDoubleIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";

export const ChatHeader = () => {
  const { toggleSidebar } = useSidebar();
  const [isPrivate, setIsPrivate] = useState(true);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between pl-3 pr-4 z-40 w-full mt-1">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-[34px] w-[34px] bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-[8px]"
          onClick={toggleSidebar}
        >
          <HugeiconsIcon icon={SidebarLeftIcon} size={18} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center h-[34px] px-2.5 gap-1.5 bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={LockedIcon} size={15} />
            <HugeiconsIcon icon={ArrowDownDoubleIcon} size={15} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[320px] bg-popover border-border p-2 rounded-xl shadow-2xl mt-1"
          >
            <DropdownMenuItem
              onClick={() => setIsPrivate(true)}
              className="flex items-center justify-between p-3 pt-4 cursor-pointer rounded-lg focus:bg-accent"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[15px] font-semibold text-foreground tracking-tight leading-none">
                  Private
                </span>
                <span className="text-[13px] text-muted-foreground font-medium leading-none">
                  Only you can access this chat
                </span>
              </div>
              {isPrivate && (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} />
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setIsPrivate(false)}
              className="flex items-center justify-between p-3 pb-4 cursor-pointer rounded-lg focus:bg-accent"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[15px] font-semibold text-foreground tracking-tight leading-none">
                  Public
                </span>
                <span className="text-[13px] text-muted-foreground font-medium leading-none">
                  Anyone with the link can access this chat
                </span>
              </div>
              {!isPrivate && (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};