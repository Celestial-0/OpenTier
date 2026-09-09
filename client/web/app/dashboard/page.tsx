import { Suspense } from "react";
import { DashboardUI } from "@/components/core/dashboard/dashboard";
import { ProtectedRoute } from "@/components/core/auth/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <DashboardUI />
      </Suspense>
    </ProtectedRoute>
  );
}