"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, Shield, Edit } from "lucide-react";

// Mock data matching /user/me API response
const mockUser = {
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com",
    full_name: "John Doe",
    role: "admin" as "user" | "admin",
    is_verified: true,
    created_at: 1699920000, // Nov 14, 2023
    updated_at: 1706484000,
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

export const Profile = () => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [fullName, setFullName] = useState(mockUser.full_name || "");

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Your account information and settings</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                        {/* Avatar */}
                        <Avatar className="h-24 w-24">
                            <AvatarImage src="" alt={mockUser.full_name || "User"} />
                            <AvatarFallback className="text-2xl">
                                {getInitials(mockUser.full_name)}
                            </AvatarFallback>
                        </Avatar>

                        {/* User Info */}
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <div>
                                <div className="flex items-center justify-center gap-2 md:justify-start">
                                    <h3 className="text-2xl font-bold">
                                        {mockUser.full_name || "User"}
                                    </h3>
                                    <Badge variant={mockUser.role === "admin" ? "default" : "secondary"}>
                                        {mockUser.role}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                            </div>

                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger>
                                    <Button variant="outline">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Profile
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Profile</DialogTitle>
                                        <DialogDescription>
                                            Update your profile information
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Full Name</Label>
                                            <Input
                                                id="fullName"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                value={mockUser.email}
                                                disabled
                                                className="bg-muted"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Email cannot be changed
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={() => setIsEditDialogOpen(false)}>
                                            Save Changes
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Email Address</p>
                            <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                        </div>
                        {mockUser.is_verified ? (
                            <Badge variant="default" className="bg-green-500">
                                Verified
                            </Badge>
                        ) : (
                            <Badge variant="destructive">Unverified</Badge>
                        )}
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">User ID</p>
                            <p className="text-sm text-muted-foreground font-mono">
                                {mockUser.user_id}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Account Role</p>
                            <p className="text-sm text-muted-foreground capitalize">
                                {mockUser.role}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Member Since</p>
                            <p className="text-sm text-muted-foreground">
                                {formatDate(mockUser.created_at)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Account Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Conversations</p>
                            <p className="text-2xl font-bold">12</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Messages</p>
                            <p className="text-2xl font-bold">156</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Active Sessions</p>
                            <p className="text-2xl font-bold">2</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
