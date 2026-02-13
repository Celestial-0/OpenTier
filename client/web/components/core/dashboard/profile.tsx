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
import { useUserStore } from "@/store/user-store";
import { format } from "date-fns";

export function Profile() {
    const { user, updateProfile, isLoading } = useUserStore();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");

    const handleSave = async () => {
        await updateProfile({ name, username });
        setIsEditDialogOpen(false);
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (!user) {
        return <div className="p-6 text-center">Please sign in to view your profile.</div>;
    }

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
                            <AvatarImage src={user.avatar_url || ""} alt={user.name || "User"} />
                            <AvatarFallback className="text-2xl">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>

                        {/* User Info */}
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <div>
                                <div className="flex items-center justify-center gap-2 md:justify-start">
                                    <h3 className="text-2xl font-bold">
                                        {user.name || "User"}
                                    </h3>
                                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>

                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger asChild>
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
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Username</Label>
                                            <Input
                                                id="username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Enter your username"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                value={user.email}
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
                                        <Button onClick={handleSave} disabled={isLoading}>
                                            {isLoading ? "Saving..." : "Save Changes"}
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
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        {user.email_verified ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
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
                                {user.id}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Account Role</p>
                            <p className="text-sm text-muted-foreground capitalize">
                                {user.role}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Member Since</p>
                            <p className="text-sm text-muted-foreground">
                                {format(new Date(user.created_at), "MMMM d, yyyy")}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
