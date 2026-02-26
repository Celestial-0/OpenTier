import { Chat } from "@/components/core/chat/chat";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-dvh">
            <Chat>{children}</Chat>
        </div>
    );
}
