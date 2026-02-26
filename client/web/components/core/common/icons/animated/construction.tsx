"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface ConstructionIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ConstructionIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  alwaysAnimate?: boolean;
}

const ConstructionIcon = forwardRef<
  ConstructionIconHandle,
  ConstructionIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, alwaysAnimate = false, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  // Auto-start animation if alwaysAnimate is true
  useEffect(() => {
    if (alwaysAnimate) {
      controls.start("animate");
    }
  }, [alwaysAnimate, controls]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current || alwaysAnimate) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter, alwaysAnimate]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current || alwaysAnimate) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave, alwaysAnimate]
  );

  return (
    <div
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <motion.pattern
            animate={controls}
            height="14"
            id="stripes"
            initial="normal"
            patternUnits="userSpaceOnUse"
            variants={{
              normal: {
                x: 0,
              },
              animate: {
                x: [0, 6],
                transition: {
                  duration: 1,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                },
              },
            }}
            width="6"
          >
            <path d="M-4 -2 L14 30" stroke="currentColor" strokeWidth="2" />
          </motion.pattern>
        </defs>
        <rect fill="url(#stripes)" height="8" rx="1" width="20" x="2" y="6" />
        <path d="M17 14v7" />
        <path d="M7 14v7" />
        <path d="M17 3v3" />
        <path d="M7 3v3" />
      </svg>
    </div>
  );
});

ConstructionIcon.displayName = "ConstructionIcon";

export { ConstructionIcon };
