"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, Trash2, Mail, Shield, MessageSquare, AlertCircle } from "lucide-react";

// Mock notification data
type Notification = {
    id: string;
    type: "system" | "conversation" | "security" | "admin";
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
};

const mockNotifications: Notification[] = [
    {
        id: "1",
        type: "conversation",
        title: "New message in Project Planning",
        message: "You have 3 new messages in your conversation",
        timestamp: Date.now() - 300000, // 5 min ago
        read: false,
    },
    {
        id: "2",
        type: "security",
        title: "New login detected",
        message: "A new device logged into your account from 192.168.1.105",
        timestamp: Date.now() - 3600000, // 1 hour ago
        read: false,
    },
    {
        id: "3",
        type: "system",
        title: "Email verified successfully",
        message: "Your email address has been verified",
        timestamp: Date.now() - 86400000, // 1 day ago
        read: true,
    },
    {
        id: "4",
        type: "conversation",
        title: "Conversation updated",
        message: "Technical Architecture Review has been updated",
        timestamp: Date.now() - 172800000, // 2 days ago
        read: true,
    },
];

const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
        case "conversation":
            return <MessageSquare className="h-4 w-4" />;
        case "security":
            return <Shield className="h-4 w-4" />;
        case "system":
            return <Mail className="h-4 w-4" />;
        case "admin":
            return <AlertCircle className="h-4 w-4" />;
    }
};

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export const Notifications = () => {
    const [notifications, setNotifications] = useState(mockNotifications);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <Popover>
            <PopoverTrigger>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Badge variant="secondary">{unreadCount} new</Badge>
                    )}
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">
                                No notifications
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read ? "bg-muted/30" : ""
                                        }`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium leading-none">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatTimeAgo(notification.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer Actions */}
                {notifications.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-2 flex gap-2">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={markAllAsRead}
                                >
                                    <CheckCheck className="mr-2 h-4 w-4" />
                                    Mark all read
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                                onClick={clearAll}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear all
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
};
