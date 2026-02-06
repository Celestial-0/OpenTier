"use client";

import { cn } from "@/lib/utils";
import React, { useRef } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { BorderBeam } from "@/components/ui/border-beam";

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
}) => {
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = useRef<any>(null);
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  return (
    <motion.div
      className="relative flex h-[30rem] justify-center space-x-10 overflow-y-auto rounded-md bg-muted/0 p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      ref={ref}
    >
      <div className="div relative flex items-start px-6">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div key={item.title + index} className={
              (() => {
                switch (index) {
                  case 0:
                    return "pt-16 pb-32";
                  case cardLength - 1:
                    return "pb-16";
                  default:
                    return "my-32";
                }
              })()

            }> {/* First item: no top margin, others: large spacing */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                className="text-2xl font-bold text-foreground"
              >
                {item.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                className="text-lg mt-4 max-w-sm text-muted-foreground"
              >

                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-20" /> {/* Bottom spacer to allow last item to scroll up without going too far */}
        </div>
      </div>
      <div
        className={cn(
          "sticky top-10 hidden h-80 w-[30rem] overflow-hidden rounded-md border-none lg:block",
          contentClassName
        )}
      >
        {content[activeCard].content ?? null}
        <BorderBeam duration={8} size={100} />
      </div>
    </motion.div>
  );
};