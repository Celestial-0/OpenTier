import { cn } from "@/lib/utils";
import React, { useRef } from "react";

// ListItem component for navigation menu items
export const ListItem = ({
    className,
    title,
    children,
    icon: Icon,
    onClick,
    ...props
}: {
    className?: string;
    title: string;
    children: React.ReactNode;
    icon?: React.ForwardRefExoticComponent<any>;
    onClick?: () => void;
}) => {
    const iconRef = useRef<any>(null);

    const handleMouseEnter = () => {
        if (iconRef.current?.startAnimation) {
            iconRef.current.startAnimation();
        }
    };

    const handleMouseLeave = () => {
        if (iconRef.current?.stopAnimation) {
            iconRef.current.stopAnimation();
        }
    };

    return (
        <li>
            <button
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-all duration-200 hover:scale-[1.02] hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full text-left",
                    className
                )}
                {...props}
            >
                <div className="flex items-center gap-2">
                    {Icon && (
                        <div className="flex h-8 w-8 items-center justify-center">
                            <Icon ref={iconRef} size={18} className="text-primary" />
                        </div>
                    )}
                    <div className="text-sm font-medium leading-none">{title}</div>
                </div>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {children}
                </p>
            </button>
        </li>
    );
};
