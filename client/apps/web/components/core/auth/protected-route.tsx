"use client";

import { useRequireAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useRequireAuth();

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Spinner /></div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
