import { HeroBackground } from "@/components/core/landing/hero/background";
import { HeroContent } from "@/components/core/landing/hero/content";
import { HeroChatDemo } from "@/components/core/landing/hero/chat-demo";

export const Hero = () => {
    return (
        <div className="relative min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-background">
            <HeroBackground />

            <main className="flex-1 flex flex-col relative z-10 pt-20 md:pt-32">
                <section className="flex-1 flex flex-col items-center text-center px-0">
                    <HeroContent />
                    <HeroChatDemo />
                </section>
            </main>

            {/* Gradient overlay for smooth transition to feature section */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-b from-transparent to-background z-5 pointer-events-none" />
        </div>
    );
};
