"use client";

import { useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import {
    Database,
    GitBranch,
    Globe,
} from "lucide-react";
import {
    SiRust,
    SiPython,
} from "react-icons/si";

export const ArchitectureDiagram = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<HTMLDivElement>(null);
    const gatewayRef = useRef<HTMLDivElement>(null);
    const grpcRef = useRef<HTMLDivElement>(null);
    const intelligenceRef = useRef<HTMLDivElement>(null);
    const dbRef = useRef<HTMLDivElement>(null);

    return (
        <div className="mb-20 flex justify-center">
            <div
                ref={containerRef}
                className="relative w-full max-w-5xl h-[120px] md:h-[200px] flex items-center justify-between px-2 md:px-8 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-visible"
            >
                {/* Animated Beams */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={clientRef}
                    toRef={gatewayRef}
                    curvature={0}
                    gradientStartColor="#6366f1"
                    gradientStopColor="#8b5cf6"
                    duration={3}
                />
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={gatewayRef}
                    toRef={grpcRef}
                    curvature={0}
                    gradientStartColor="#8b5cf6"
                    gradientStopColor="#a855f7"
                    duration={3}
                    delay={0.5}
                />
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={grpcRef}
                    toRef={intelligenceRef}
                    curvature={0}
                    gradientStartColor="#a855f7"
                    gradientStopColor="#c084fc"
                    duration={3}
                    delay={1}
                />
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={intelligenceRef}
                    toRef={dbRef}
                    curvature={0}
                    gradientStartColor="#c084fc"
                    gradientStopColor="#e879f9"
                    duration={3}
                    delay={1.5}
                />

                {/* Nodes */}
                <div className="relative z-10 flex flex-col items-center">
                    <div ref={clientRef} className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-primary/40 bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Globe className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <span className="mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-muted-foreground">Client</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div ref={gatewayRef} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-primary/60 bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                        <SiRust className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap">Rust Gateway</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div ref={grpcRef} className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-primary/40 bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <GitBranch className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <span className="mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-muted-foreground">gRPC</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div ref={intelligenceRef} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-primary/60 bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                        <SiPython className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap">Python Engine</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div ref={dbRef} className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-primary/40 bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Database className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <span className="mt-2 md:mt-3 text-[10px] md:text-xs font-medium text-muted-foreground">PostgreSQL</span>
                </div>
            </div>
        </div>
    );
};
