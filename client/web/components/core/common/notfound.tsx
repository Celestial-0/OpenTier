"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Button } from "@/components/ui/button";
import { SearchX, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const NotFound = ({ params }: { params: { slug: string } }) => {
    const router = useRouter();

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
            <div className="relative z-10 w-full max-w-md">
                <Card className="border-none bg-transparent shadow-none ring-0">
                    <CardContent className="flex flex-col items-center gap-8 p-8 text-center md:p-12">
                        {/* Icon */}
                        <div className="relative group">
                            <div className="absolute inset-0 -m-3 rounded-full bg-primary/5 blur-2xl transition-opacity duration-300 group-hover:opacity-150" />
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted/50 transition-transform duration-200 group-hover:scale-105">
                                <SearchX className="h-12 w-12 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-8xl font-bold tracking-tight text-foreground">
                                    404
                                </h1>
                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                    Page Not Found
                                </h2>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                The page you're looking for doesn't exist or has been moved.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />

                        {/* Action Buttons */}
                        <div className="flex w-full max-w-xs flex-row gap-3">
                            <Link href="/" className="flex-1">
                                <Button
                                    variant="default"
                                    className="w-full gap-2 transition-transform duration-200 hover:scale-105"
                                >
                                    <Home className="h-4 w-4" />
                                    Back to Home
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                className="flex-1 gap-2 transition-transform duration-200 hover:scale-105"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Go Back
                            </Button>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-muted-foreground">
                            If you believe this is an error, please contact support
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};