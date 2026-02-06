import { ArchitectureDiagram } from "@/components/core/landing/features/architecture-diagram";
import { ArchitectureExplanation } from "@/components/core/landing/features/architecture-explanation";
import { FeatureGrid } from "@/components/core/landing/features/feature-grid";
import { FeatureTechStack } from "@/components/core/landing/features/tech-stack";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

export const Feature = () => {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            {/* Top gradient overlay for smooth transition from hero */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-background to-transparent z-5 pointer-events-none" />

            {/* Background gradient */}
            <BackgroundRippleEffect />


            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center max-w-5xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Built for Scale, Designed for Intelligence
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        OpenTier combines the performance of Rust with the intelligence of Python,
                        <br />
                        creating a production-ready platform that scales with your needs.
                    </p>
                </div>

                <ArchitectureDiagram />
                <ArchitectureExplanation />
                <FeatureGrid />
                <FeatureTechStack />
            </div>
        </section>
    );
};
