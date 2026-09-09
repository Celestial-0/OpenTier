import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const AdminFooter = () => {
    return (
        <Card className="border-border bg-card/60 mt-8">
            <CardContent className="pt-0">
                <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Admin Panel</p>
                        <p className="text-xs text-muted-foreground">
                            You have administrative privileges. Use these tools responsibly.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
