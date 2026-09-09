import { useState } from "react";
import { toast } from "sonner";
import { Coins, Search, Trash2, Users } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import type { AdminUsersTabProps } from "./types";

const UserCreditAdjuster = ({
    user,
    onAdjustCredits,
}: {
    user: import("@/lib/api-types").UserAdminView;
    onAdjustCredits?: (
        userId: string,
        delta: number,
        reason: "admin_adjustment" | "grant" | "refund",
        note?: string
    ) => Promise<void>;
}) => {
    const [delta, setDelta] = useState("");
    const [reason, setReason] = useState<"admin_adjustment" | "grant" | "refund">("admin_adjustment");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApply = async () => {
        const val = parseFloat(delta);
        if (isNaN(val) || Math.abs(val) < 0.0001) {
            toast.error("Please enter a valid non-zero credit delta");
            return;
        }
        if (!onAdjustCredits) return;
        setIsSubmitting(true);
        try {
            await onAdjustCredits(user.id, val, reason, note.trim() || undefined);
            setDelta("");
            setNote("");
        } catch {
            // error handled in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Credits</p>
                </div>
                <span className="font-mono font-semibold text-sm">
                    {(user.credit_balance ?? 0).toFixed(2)}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Amount (+ or -)</label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="+20.0 or -5.0"
                        value={delta}
                        onChange={(e) => setDelta(e.target.value)}
                        className="font-mono text-sm h-8"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Reason</label>
                    <Select value={reason} onValueChange={(v) => setReason(v as "admin_adjustment" | "grant" | "refund")}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin_adjustment">Adjustment</SelectItem>
                            <SelectItem value="grant">Grant</SelectItem>
                            <SelectItem value="refund">Refund</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Audit Note (optional)</label>
                <Input
                    placeholder="e.g. Free credit top-up, compensation"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-xs h-8"
                />
            </div>
            <Button
                onClick={handleApply}
                disabled={isSubmitting || !delta || !onAdjustCredits}
                variant="outline"
                size="sm"
                className="w-full text-xs font-medium mt-1"
            >
                {isSubmitting ? "Adjusting..." : "Apply Credit Adjustment"}
            </Button>
        </div>
    );
};

export const AdminUsersTab = ({
    isLoadingUsers,
    users,
    searchQuery,
    selectedRole,
    setSelectedRole,
    onSearch,
    onRoleUpdate,
    onToggleDisable,
    onDeleteUser,
    onAdjustCredits,
}: AdminUsersTabProps) => {
    return (
        <TabsContent value="users" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all users</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by email..."
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="overflow-x-auto">
                    <Table className="min-w-190">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="font-medium text-sm">No info</p>
                                        <p className="text-xs mt-1">No users found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>
                                            {user.full_name || <span className="text-muted-foreground text-xs italic">No info</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role || "No info"}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Badge
                                                    variant={user.is_verified ? "default" : "destructive"}
                                                    className={user.is_verified ? "bg-green-500" : ""}
                                                >
                                                    {user.is_verified ? "Verified" : "Unverified"}
                                                </Badge>
                                                {user.is_disabled && <Badge variant="destructive">Disabled</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <span className="font-semibold text-foreground">
                                                {user.credit_balance != null ? Number(user.credit_balance).toFixed(2) : "0.00"}
                                            </span>
                                            {user.credit_held != null && user.credit_held > 0 ? (
                                                <span className="block text-xs text-muted-foreground font-medium">
                                                    ({Number(user.credit_held).toFixed(2)} held)
                                                </span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }) : "No info"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger render={<Button variant="ghost" size="sm" />}>Manage</DialogTrigger>

                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Manage User</DialogTitle>
                                                        <DialogDescription>Update user role, credits or delete account</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium">Email</p>
                                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium">Change Role</p>
                                                            <Select
                                                                defaultValue={user.role}
                                                                onValueChange={(value: string | null) => {
                                                                    if (!value) {
                                                                        return;
                                                                    }

                                                                    setSelectedRole((prev) => ({
                                                                        ...prev,
                                                                        [user.id]: value,
                                                                    }));
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="user">User</SelectItem>
                                                                    <SelectItem value="contributor">Contributor</SelectItem>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                onClick={() => onRoleUpdate(user.id)}
                                                                className="w-full mt-2"
                                                                disabled={!selectedRole[user.id] || selectedRole[user.id] === user.role}
                                                            >
                                                                Update Role
                                                            </Button>
                                                        </div>

                                                        {/* Credit Adjustment Section */}
                                                        <UserCreditAdjuster user={user} onAdjustCredits={onAdjustCredits} />

                                                        <div className="pt-4 border-t flex flex-col gap-2">
                                                            <Button
                                                                variant={user.is_disabled ? "default" : "destructive"}
                                                                onClick={() => onToggleDisable(user.id, user.is_disabled)}
                                                                className="w-full text-white"
                                                            >
                                                                {user.is_disabled ? "Enable Account" : "Disable Account"}
                                                            </Button>
                                                        </div>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger render={<Button variant="destructive" className="w-full" />}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete User
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete {user.email} and all associated data. This action
                                                                        cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={() => onDeleteUser(user.id)}
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
};
