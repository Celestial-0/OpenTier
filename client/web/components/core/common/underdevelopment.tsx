import { Card, CardContent } from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { ConstructionIcon, ClockIcon } from "@/components/core/common/icons/animated";

export const UnderDevelopment = () => {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4">
            {/* Subtle Background Pattern */}
            <DotPattern
                className="absolute inset-0 text-muted-foreground/10 dark:text-muted-foreground/30"
                width={24}
                height={24}
                cx={1}
                cy={1}
                cr={1}
            />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-lg">
                <Card className="border-none bg-transparent shadow-none ring-0">
                    <CardContent className="flex flex-col items-center gap-6 p-12 text-center">
                        {/* Icon with subtle animation */}
                        <div className="relative">
                            <div className="absolute inset-0 -m-2 rounded-full bg-primary/5 blur-xl" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-muted/50 transition-transform duration-300 hover:scale-105">
                                <ConstructionIcon alwaysAnimate size={40} className="text-muted-foreground" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="flex flex-col gap-3">
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                                Under Development
                            </h1>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                This feature is currently being built and will be available soon.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="my-2 h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />

                        {/* Status with Icon */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ClockIcon size={14} className="text-muted-foreground" />
                            <span>We appreciate your patience</span>
                        </div>

                        {/* Subtle Progress Indicator */}
                        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium text-foreground">In Progress</span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};