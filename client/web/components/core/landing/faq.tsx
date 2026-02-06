"use client";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import MobileFAQ from "./faq/mobile-faq";
import { FAQ_CONTENT } from "./data";

export const FAQ = () => {
    return (
        <section className="relative w-full bg-background py-20 pb-0">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="mb-16 hidden text-center md:block">
                    <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                        Common Questions
                    </h2>
                    <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
                        Everything you need to know about integrating and deploying OpenTier.
                    </p>
                </div>

                {/* Sticky Scroll FAQ - Desktop Only */}
                <div className="hidden md:block">
                    <StickyScroll content={FAQ_CONTENT} />
                </div>

                {/* Staggered FAQ - Mobile Only */}
                <div className="block md:hidden">
                    <MobileFAQ
                        title="Common Questions"
                        subtitle="Everything you need to know about integrating and deploying OpenTier."
                        hideSupport={true}
                        faqItems={FAQ_CONTENT.map((item, index) => ({
                            id: `faq-${index}`,
                            question: item.title,
                            answer: item.description,
                        }))}
                    />
                </div>
            </div>
        </section>
    );
};
