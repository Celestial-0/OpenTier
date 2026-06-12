import { Search, Trash2 } from "lucide-react";
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
import { TabsContent } from "@/components/ui/tabs";
import type { AdminUsersTabProps } from "./types";

export const AdminUsersTab = ({
    isLoadingUsers,
    users,
    searchQuery,
    selectedRole,
    selectedLimit,
    setSelectedRole,
    setSelectedLimit,
    onSearch,
    onRoleUpdate,
    onLimitUpdate,
    onToggleDisable,
    onDeleteUser,
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
                                <TableHead>Quota Limit</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>{user.full_name || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
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
                                        <TableCell>
                                            {user.messages_used ?? 0} / {user.message_limit ?? 10}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger render={<Button variant="ghost" size="sm" />}>Manage</DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Manage User</DialogTitle>
                                                        <DialogDescription>Update user role or delete account</DialogDescription>
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
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium">Message Limit</p>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    placeholder={`${user.message_limit || 10}`}
                                                                    value={selectedLimit[user.id] ?? ""}
                                                                    onChange={(e) => {
                                                                        const nextValue = e.target.value;
                                                                        setSelectedLimit((prev) => ({
                                                                            ...prev,
                                                                            [user.id]: nextValue,
                                                                        }));
                                                                    }}
                                                                />
                                                                <Button onClick={() => onLimitUpdate(user.id)} disabled={!selectedLimit[user.id]}>
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
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
