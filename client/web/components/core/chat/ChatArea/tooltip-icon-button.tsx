"use client";

import { ComponentPropsWithRef, forwardRef } from "react";
import { Slottable } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TooltipIconButtonProps = ComponentPropsWithRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
  };

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", className, variant = "ghost", size = "icon", ...rest }, ref) => {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          buttonVariants({ variant, size }),
          "aui-button-icon size-6 p-1",
          className
        )}
        ref={ref}
        {...rest}
      >
        <Slottable>{children}</Slottable>
        <span className="aui-sr-only sr-only">{tooltip}</span>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
