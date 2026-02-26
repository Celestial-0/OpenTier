"use client";


import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, Trash2, Mail, Shield, MessageSquare, AlertCircle } from "lucide-react";
import { useNotificationStore } from "@/store/notification-store";
import { Notification } from "@/types/dashboard";



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
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <Popover>
            <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                        {unreadCount}
                    </Badge>
                )}
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
