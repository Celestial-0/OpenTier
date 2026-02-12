"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
    useChatRuntime,
    AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
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

export const AiChat = () => {
    const runtime = useChatRuntime({
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new AssistantChatTransport({
            api: "/api/chat",
        }),
    });

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
                        <div className="flex-1 overflow-hidden">
                            <Thread />
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </AssistantRuntimeProvider>
    );
};
