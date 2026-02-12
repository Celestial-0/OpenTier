"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, ExternalLink, MoreVertical, Clock, Plus, Filter } from "lucide-react";
import Link from "next/link";

// --- Mock Data ---
const mockConversations = [
    {
        id: "550e8400-e29b-41d4-a716-446655440002",
        title: "Project Planning Discussion",
        message_count: 15,
        last_message_preview: "Let's finalize the Q1 roadmap...",
        created_at: Date.now() - 604800000,
        updated_at: Date.now() - 3600000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440003",
        title: "Technical Architecture Review",
        message_count: 8,
        last_message_preview: "The gRPC integration looks solid...",
        created_at: Date.now() - 432000000,
        updated_at: Date.now() - 7200000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440004",
        title: "API Integration Questions",
        message_count: 23,
        last_message_preview: "How do we handle rate limiting?",
        created_at: Date.now() - 259200000,
        updated_at: Date.now() - 86400000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440005",
        title: "Database Schema Design",
        message_count: 12,
        last_message_preview: "pgvector seems like the right choice...",
        created_at: Date.now() - 172800000,
        updated_at: Date.now() - 172800000,
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440006",
        title: "RAG Implementation Strategy",
        message_count: 31,
        last_message_preview: null,
        created_at: Date.now() - 86400000,
        updated_at: Date.now() - 86400000,
    },
];

// --- Helpers ---
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

// --- Component ---
export const Conversations = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("updated");

    const filteredConversations = mockConversations
        .filter((conv) =>
            conv.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === "updated") return b.updated_at - a.updated_at;
            if (sortBy === "created") return b.created_at - a.created_at;
            if (sortBy === "messages") return b.message_count - a.message_count;
            return 0;
        });

    return (
        <div className="mx-auto space-y-4 p-2 animate-in fade-in duration-500">


            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/30 p-2 rounded-xl border">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background border-none shadow-none focus-visible:ring-1"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={sortBy} onValueChange={(value) => value && setSortBy(value)}>
                        <SelectTrigger className="w-full sm:w-[160px] bg-background border-none shadow-none ring-1 ring-border">
                            <Filter className="mr-2 h-3.5 w-3.5" />
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent side="bottom" alignItemWithTrigger={false}>
                            <SelectItem value="updated">Latest Activity</SelectItem>
                            <SelectItem value="created">Date Created</SelectItem>
                            <SelectItem value="messages">Message Count</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="w-[450px] py-4">Discussion</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead className="hidden md:table-cell text-center">Length</TableHead>
                            <TableHead className="text-right px-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredConversations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                                    No conversations found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredConversations.map((conversation) => (
                                <TableRow key={conversation.id} className="group transition-colors border-b last:border-0">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer leading-none">
                                                {conversation.title}
                                            </span>
                                            <span className="text-xs text-muted-foreground line-clamp-1 font-mono mt-1 opacity-80">
                                                {conversation.last_message_preview || "No messages yet"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {formatTimeAgo(conversation.updated_at)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-center">
                                        <Badge variant="outline" className="font-mono text-[10px] px-2 py-0">
                                            {conversation.message_count} msg
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Sheet>
                                            <SheetTrigger render={<Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" />}>
                                                <MoreVertical className="h-4 w-4" />
                                            </SheetTrigger>
                                            <SheetContent className="sm:max-w-md p-4">
                                                <SheetHeader className="text-left border-b px-4">
                                                    <SheetTitle className="text-2xl pt-4">{conversation.title}</SheetTitle>
                                                    <SheetDescription className="font-mono text-xs uppercase tracking-tighter">
                                                        ID: {conversation.id}
                                                    </SheetDescription>
                                                </SheetHeader>

                                                <div className="mt-8 space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl border bg-muted/20">
                                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Messages</p>
                                                            <p className="text-2xl font-bold">{conversation.message_count}</p>
                                                        </div>
                                                        <div className="p-4 rounded-xl border bg-muted/20">
                                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Last Update</p>
                                                            <p className="text-sm font-medium pt-1">{formatTimeAgo(conversation.updated_at)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-4">
                                                        <Link href={`/chat?conversation=${conversation.id}`} className="w-full">
                                                            <Button className="w-full justify-start text-base py-5 rounded-xl" variant="default">
                                                                <ExternalLink className="mx-3 h-5 w-5" />
                                                                Continue Chat
                                                            </Button>
                                                        </Link>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger render={<Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 py-5 mt-3 rounded-xl" />}>
                                                                <Trash2 className="mx-3 h-5 w-5" />
                                                                Delete Thread
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently remove the conversation and its history.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full">
                                                                        Delete Permanently
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer Summary */}
            <footer className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    Active Threads: {filteredConversations.length}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent mx-8 hidden sm:block" />
                <p className="text-xs text-muted-foreground/60 italic font-light">
                    Auto-synced to cloud.
                </p>
            </footer>
        </div>
    );
};