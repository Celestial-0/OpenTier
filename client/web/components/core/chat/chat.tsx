"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/core/chat/ChatArea/thread";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/core/chat/SideBar/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useChatRuntimeAdapter } from "./chat-runtime-adapter";
import { useAuth } from "@/context/auth-context";
import { useChatStore, FREE_MESSAGE_LIMIT } from "@/store/chat-store";
import Link from "next/link";

export const AiChat = () => {
    const runtime = useChatRuntimeAdapter();
    const { isAuthenticated } = useAuth();
    const { freeMessageCount } = useChatStore();

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <SidebarProvider >
                <div className="flex h-dvh w-full pr-0.5">
                    <ThreadListSidebar />
                    <SidebarInset>
                        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="/">
                                            OpenTier
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Chat</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </header>
                        <div className="flex-1 overflow-hidden relative">
                            {/* Free Tier Banner */}
                            {!isAuthenticated && (
                                <div className="absolute top-0 left-0 right-0 z-10 bg-muted/50 backdrop-blur-sm border-b px-4 py-1 flex items-center justify-center text-xs text-muted-foreground">
                                    {freeMessageCount >= FREE_MESSAGE_LIMIT ? (
                                        <span>
                                            Free limit reached. <Link href="#" onClick={() => document.getElementById('auth-trigger')?.click()} className="underline font-medium text-primary">Sign in</Link> for unlimited chats.
                                        </span>
                                    ) : (
                                        <span>
                                            Free Preview: {FREE_MESSAGE_LIMIT - freeMessageCount} messages remaining. <Link href="#" onClick={() => document.getElementById('auth-trigger')?.click()} className="underline font-medium text-primary">Sign in</Link> to save progress.
                                        </span>
                                    )}
                                </div>
                            )}
                            <Thread />
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </AssistantRuntimeProvider>
    );
};
