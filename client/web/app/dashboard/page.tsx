import { DashboardUI } from "@/components/core/dashboard/dashboard";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <DashboardUI />
      </div>
    </ProtectedRoute>
  );
}