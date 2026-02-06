"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const AnimatedUnderline = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative w-fit after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100 ",
        className
      )}
    >
      {children}
    </div>
  );
};