"use client";

import { useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import {
    Database,
    Globe,
    Cpu,
} from "lucide-react";
import {
    SiRust,
    SiPython,
    SiRedis,
} from "react-icons/si";
import { QdrantLogo } from "@/components/core/common/logos";

export const ArchitectureDiagram = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<HTMLDivElement>(null);
    const gatewayRef = useRef<HTMLDivElement>(null);
    const intelligenceRef = useRef<HTMLDivElement>(null);
    const redisRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<HTMLDivElement>(null);
    const qdrantRef = useRef<HTMLDivElement>(null);
    const postgresRef = useRef<HTMLDivElement>(null);

    return (
        <div className="mb-20 flex justify-center w-full">
            <div
                ref={containerRef}
                className="relative w-full max-w-5xl min-h-[380px] md:min-h-[440px] flex items-center justify-between px-2 sm:px-6 md:px-12 py-8 overflow-visible rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xs"
            >
                {/* Animated Beams */}
                {/* 1. Client -> Rust Gateway */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={clientRef}
                    toRef={gatewayRef}
                    curvature={0}
                    gradientStartColor="#22c55e"
                    gradientStopColor="#f97316"
                    duration={3}
                />
                {/* 2. Rust Gateway -> Python Intelligence (gRPC) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={gatewayRef}
                    toRef={intelligenceRef}
                    curvature={30}
                    gradientStartColor="#f97316"
                    gradientStopColor="#3b82f6"
                    duration={3.2}
                    delay={0.3}
                />
                {/* 3. Rust Gateway -> Redis Streams (Events & Rate Limits) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={gatewayRef}
                    toRef={redisRef}
                    curvature={0}
                    gradientStartColor="#f97316"
                    gradientStopColor="#ef4444"
                    duration={2.8}
                    delay={0.5}
                />
                {/* 4. Redis Streams -> Background Worker (Durable Consumers) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={redisRef}
                    toRef={workerRef}
                    curvature={0}
                    gradientStartColor="#ef4444"
                    gradientStopColor="#10b981"
                    duration={2.6}
                    delay={0.8}
                />
                {/* 5. Python Intelligence -> Qdrant (Hybrid RRF Search) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={intelligenceRef}
                    toRef={qdrantRef}
                    curvature={0}
                    gradientStartColor="#3b82f6"
                    gradientStopColor="#f43f5e"
                    duration={3.5}
                    delay={1}
                />
                {/* 6. Python Intelligence -> PostgreSQL (Conversations & Memory) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={intelligenceRef}
                    toRef={postgresRef}
                    curvature={-35}
                    gradientStartColor="#3b82f6"
                    gradientStopColor="#0284c7"
                    duration={3.8}
                    delay={1.2}
                />
                {/* 7. Worker -> Qdrant (Upsert Dense + Sparse Vectors) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={workerRef}
                    toRef={qdrantRef}
                    curvature={35}
                    gradientStartColor="#10b981"
                    gradientStopColor="#f43f5e"
                    duration={3.2}
                    delay={1.4}
                />
                {/* 8. Worker -> PostgreSQL (Ingestion Status & Metadata) */}
                <AnimatedBeam
                    containerRef={containerRef}
                    fromRef={workerRef}
                    toRef={postgresRef}
                    curvature={0}
                    gradientStartColor="#10b981"
                    gradientStopColor="#0284c7"
                    duration={3}
                    delay={1.6}
                />

                {/* Column 1: Client */}
                <div className="relative z-10 flex flex-col items-center">
                    <div
                        ref={clientRef}
                        className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl border-2 border-emerald-500/40 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110"
                    >
                        <Globe className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-emerald-400" />
                    </div>
                    <span className="mt-2 text-[11px] sm:text-xs font-semibold text-foreground">Client</span>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Web / REST</span>
                </div>

                {/* Column 2: Rust Gateway */}
                <div className="relative z-10 flex flex-col items-center">
                    <div
                        ref={gatewayRef}
                        className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl border-2 border-orange-500/60 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-xl transition-transform duration-200 hover:scale-110"
                    >
                        <SiRust className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-orange-500" />
                    </div>
                    <span className="mt-2 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Rust Gateway</span>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Axum · :4000</span>
                </div>

                {/* Column 3: Processing & Stream Tier (Python + Redis + Worker) */}
                <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 md:gap-10">
                    {/* Python Intelligence */}
                    <div className="flex flex-col items-center">
                        <div
                            ref={intelligenceRef}
                            className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl border-2 border-blue-500/50 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110"
                        >
                            <SiPython className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-500" />
                        </div>
                        <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Python Engine</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">gRPC · :50051</span>
                    </div>

                    {/* Redis 8 Streams */}
                    <div className="flex flex-col items-center">
                        <div
                            ref={redisRef}
                            className="w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-2xl border-2 border-red-500/50 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110"
                        >
                            <SiRedis className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                        </div>
                        <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Redis 8 Streams</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Event Bus · :6379</span>
                    </div>

                    {/* Background Worker */}
                    <div className="flex flex-col items-center">
                        <div
                            ref={workerRef}
                            className="w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-2xl border-2 border-emerald-500/50 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110"
                        >
                            <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                        </div>
                        <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Worker Engine</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Durable Consumers</span>
                    </div>
                </div>

                {/* Column 4: Storage & Vectors (Qdrant + PostgreSQL) */}
                <div className="relative z-10 flex flex-col items-center gap-10 sm:gap-14 md:gap-18">
                    {/* Qdrant Vector Store */}
                    <div className="flex flex-col items-center">
                        <div
                            ref={qdrantRef}
                            className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl border-2 border-rose-500/50 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 p-2 sm:p-3"
                        >
                            <QdrantLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                        </div>
                        <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Qdrant Vector DB</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">Hybrid · Dense + Sparse</span>
                    </div>

                    {/* PostgreSQL */}
                    <div className="flex flex-col items-center">
                        <div
                            ref={postgresRef}
                            className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl border-2 border-sky-500/50 bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110"
                        >
                            <Database className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-sky-500" />
                        </div>
                        <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">PostgreSQL 18</span>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">System of Record</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

