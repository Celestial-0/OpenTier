import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const AdminFooter = () => {
    return (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 mt-8">
            <CardContent className="pt-0">
                <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Admin Panel</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            You have administrative privileges. Use these tools responsibly.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
