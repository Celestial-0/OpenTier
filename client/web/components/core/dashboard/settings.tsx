"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lock, Bell, Palette, Globe, Shield, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Settings = () => {
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Mock settings state
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    const isVerified = true; // Mock verification status

    return (
        <div className="space-y-6">
            {/* Settings Header */}
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>
                        Manage your account preferences and security settings
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Settings Accordion */}
            <Accordion className="space-y-4">
                {/* Account Settings */}
                <AccordionItem value="account" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Lock className="h-5 w-5" />
                            <span className="font-semibold">Account Settings</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        {/* Email Verification Status */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Email Verification</p>
                                <p className="text-sm text-muted-foreground">
                                    Your email verification status
                                </p>
                            </div>
                            {isVerified ? (
                                <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Verified
                                </Badge>
                            ) : (
                                <Button variant="outline" size="sm">
                                    Verify Email
                                </Button>
                            )}
                        </div>

                        {/* Change Password */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Password</p>
                                <p className="text-sm text-muted-foreground">
                                    Change your account password
                                </p>
                            </div>
                            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                <DialogTrigger>
                                    <Button variant="outline" size="sm">
                                        Change Password
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Change Password</DialogTitle>
                                        <DialogDescription>
                                            Enter your current password and choose a new one
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Current Password</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                At least 12 characters with uppercase, lowercase, numbers, and special characters
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={() => setIsPasswordDialogOpen(false)}>
                                            Update Password
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Notifications */}
                <AccordionItem value="notifications" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5" />
                            <span className="font-semibold">Notifications</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Email Notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive updates via email
                                </p>
                            </div>
                            <Switch
                                checked={emailNotifications}
                                onCheckedChange={setEmailNotifications}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Push Notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive browser notifications
                                </p>
                            </div>
                            <Switch
                                checked={pushNotifications}
                                onCheckedChange={setPushNotifications}
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Appearance */}
                <AccordionItem value="appearance" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Palette className="h-5 w-5" />
                            <span className="font-semibold">Appearance</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Dark Mode</p>
                                <p className="text-sm text-muted-foreground">
                                    Use dark theme
                                </p>
                            </div>
                            <Switch
                                checked={darkMode}
                                onCheckedChange={setDarkMode}
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Privacy & Security */}
                <AccordionItem value="security" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5" />
                            <span className="font-semibold">Privacy & Security</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Two-Factor Authentication</p>
                                <p className="text-sm text-muted-foreground">
                                    Add an extra layer of security
                                </p>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Coming Soon
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Active Sessions</p>
                                <p className="text-sm text-muted-foreground">
                                    View and manage logged-in devices
                                </p>
                            </div>
                            <Button variant="outline" size="sm">
                                Manage
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Danger Zone */}
                <AccordionItem value="danger" className="border border-destructive rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <span className="font-semibold text-destructive">Danger Zone</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                These actions are permanent and cannot be undone. Please proceed with caution.
                            </AlertDescription>
                        </Alert>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Delete Account</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all data
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Account
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your account,
                                            all conversations, messages, and associated data. You can recover your account
                                            within 30 days by signing in again.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Delete Account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};
