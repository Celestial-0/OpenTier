"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";
import Image from "next/image";
import { UserIcon, SettingsIcon, BellIcon, LogoutIcon } from "@/components/core/common/icons/animated";
import { UserResponse } from "@/lib/api-types";
import { useAuth } from "@/context/auth-context";

// Smooth Profile Dropdown Component
const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface SmoothProfileDropdownProps {
    user: UserResponse;
}

export const SmoothProfileDropdown = ({ user }: SmoothProfileDropdownProps) => {
    const { logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for animated icons
    const iconRefs = useRef<Record<string, any>>({});

    const [contentRef, contentBounds] = useMeasure();

    const menuItems = [
        { id: "profile", label: "Profile", icon: UserIcon },
        { id: "settings", label: "Settings", icon: SettingsIcon },
        { id: "notifications", label: "Notifications", icon: BellIcon },
        { id: "divider", label: "", icon: null },
        { id: "logout", label: "Log out", icon: LogoutIcon },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const openHeight = Math.max(40, Math.ceil(contentBounds.height));

    const handleItemMouseEnter = (itemId: string) => {
        setHoveredItem(itemId);
        // Trigger icon animation if it has the startAnimation method
        if (iconRefs.current[itemId]?.startAnimation) {
            iconRefs.current[itemId].startAnimation();
        }
    };

    const handleItemMouseLeave = (itemId: string) => {
        setHoveredItem(null);
        // Stop icon animation if it has the stopAnimation method
        if (iconRefs.current[itemId]?.stopAnimation) {
            iconRefs.current[itemId].stopAnimation();
        }
    };

    const avatarUrl = user.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${user.name || user.email}`;

    return (
        <div ref={containerRef} className="relative h-9 w-9 hidden md:block">
            <motion.div
                layout
                initial={false}
                animate={{
                    width: isOpen ? 220 : 36,
                    height: isOpen ? openHeight : 36,
                    borderRadius: isOpen ? 14 : 18,
                }}
                transition={{
                    type: "spring" as const,
                    damping: 34,
                    stiffness: 380,
                    mass: 0.8,
                }}
                className="absolute top-0 right-0 bg-popover border border-border shadow-lg overflow-hidden cursor-pointer origin-top-right"
                onClick={() => !isOpen && setIsOpen(true)}
            >
                {/* Avatar Trigger - visible when closed */}
                <motion.div
                    initial={false}
                    animate={{
                        opacity: isOpen ? 0 : 1,
                        scale: isOpen ? 0.8 : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        pointerEvents: isOpen ? "none" : "auto",
                        willChange: "transform",
                    }}
                >
                    <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200">
                        <Image
                            src={avatarUrl}
                            alt={user.name || "User"}
                            width={36}
                            height={36}
                            className="object-cover pointer-events-none select-none"
                            priority
                            draggable={false}
                        />
                    </div>
                </motion.div>

                {/* Menu Content - visible when open */}
                <div ref={contentRef}>
                    <motion.div
                        layout
                        initial={false}
                        animate={{
                            opacity: isOpen ? 1 : 0,
                        }}
                        transition={{
                            duration: 0.2,
                            delay: isOpen ? 0.08 : 0,
                        }}
                        className="p-2"
                        style={{
                            pointerEvents: isOpen ? "auto" : "none",
                            willChange: "transform",
                        }}
                    >
                        {/* User Info Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{
                                opacity: isOpen ? 1 : 0,
                                y: isOpen ? 0 : -5,
                            }}
                            transition={{
                                delay: isOpen ? 0.06 : 0,
                                duration: 0.15,
                                ease: easeOutQuint,
                            }}
                            className="flex items-center gap-3 px-3 py-2 mb-1"
                        >
                            <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20 flex-shrink-0">
                                <Image
                                    src={avatarUrl}
                                    alt={user.name || "User"}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-none truncate">{user.name || "User"}</p>
                                <p className="text-xs leading-none text-muted-foreground my-1 truncate">
                                    {user.email}
                                </p>
                            </div>
                        </motion.div>

                        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none">
                            {menuItems.map((item, index) => {
                                if (item.id === "divider") {
                                    return (
                                        <motion.hr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: isOpen ? 1 : 0 }}
                                            transition={{ delay: isOpen ? 0.12 + index * 0.015 : 0 }}
                                            className="border-border my-1.5"
                                        />
                                    );
                                }

                                const Icon = item.icon!;
                                const isActive = activeItem === item.id;
                                const isLogout = item.id === "logout";
                                const showIndicator = hoveredItem
                                    ? hoveredItem === item.id
                                    : isActive;

                                const itemDuration = item.id === "logout" ? 0.12 : 0.15;
                                const itemDelay = isOpen ? 0.06 + index * 0.02 : 0;

                                return (
                                    <motion.li
                                        key={item.id}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{
                                            opacity: isOpen ? 1 : 0,
                                            x: isOpen ? 0 : 8,
                                        }}
                                        transition={{
                                            delay: itemDelay,
                                            duration: itemDuration,
                                            ease: easeOutQuint,
                                        }}
                                        onClick={() => {
                                            setActiveItem(item.id);
                                            console.log(`Navigate to ${item.label}`);
                                            if (item.id === "logout") {
                                                logout();
                                                setIsOpen(false);
                                            }
                                        }}
                                        onMouseEnter={() => handleItemMouseEnter(item.id)}
                                        onMouseLeave={() => handleItemMouseLeave(item.id)}
                                        className={`relative flex items-center gap-3 rounded-lg text-sm cursor-pointer transition-colors duration-200 ease-out m-0 pl-3 py-2 ${isLogout && showIndicator
                                            ? "text-red-600"
                                            : isActive
                                                ? "text-foreground"
                                                : isLogout
                                                    ? "text-muted-foreground hover:text-red-600"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {/* Hover/Active background indicator */}
                                        {showIndicator && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className={`absolute inset-0 rounded-lg ${isLogout ? "bg-red-50 dark:bg-red-950/30" : "bg-muted"
                                                    }`}
                                                transition={{
                                                    type: "spring",
                                                    damping: 30,
                                                    stiffness: 520,
                                                    mass: 0.8,
                                                }}
                                            />
                                        )}
                                        {/* Left bar indicator */}
                                        {showIndicator && (
                                            <motion.div
                                                layoutId="leftBar"
                                                className={`absolute left-0 top-0 bottom-0 my-auto w-[3px] h-5 rounded-full ${isLogout ? "bg-red-500" : "bg-foreground"
                                                    }`}
                                                transition={{
                                                    type: "spring",
                                                    damping: 30,
                                                    stiffness: 520,
                                                    mass: 0.8,
                                                }}
                                            />
                                        )}
                                        <Icon
                                            ref={(el: any) => iconRefs.current[item.id] = el}
                                            size={18}
                                            className="relative z-10"
                                        />
                                        <span className="font-medium relative z-10">
                                            {item.label}
                                        </span>
                                    </motion.li>
                                );
                            })}
                        </ul>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

