import {
    BellIcon,
    LogoutIcon,
    MessageCircleMoreIcon,
    SettingsIcon,
    UserIcon,
    UsersIcon,
} from "@/components/core/common/icons/animated";
import { AuthModal } from "@/components/core/landing/auth";
import Image from "next/image";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { knowledgeBaseItems } from "./constants";
import { UserResponse } from "@/lib/api-types";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

interface MobileMenuProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    user: UserResponse | null;
}

export const MobileMenu = ({ isOpen, setIsOpen, user }: MobileMenuProps) => {
    const { logout, signIn, signUp, resendVerification, verifyEmail } = useAuth();

    if (!isOpen) return null;

    const isLoggedIn = !!user;
    const avatarUrl = user?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${user?.name || user?.email || 'User'}`;

    return (
        <div className="md:hidden pt-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
                {/* Chat - Direct Link */}
                <Link
                    href="/chat"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-left"
                >
                    <MessageCircleMoreIcon size={20} />
                    Chat
                </Link>

                {/* Dashboard - Direct Link */}
                <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-left"
                >
                    <UsersIcon size={20} />
                    Dashboard
                </Link>

                {/* Knowledge Base - Collapsible */}
                {/* <MobileSection title="Knowledge Base" items={knowledgeBaseItems} /> */}

                {/* User Profile or Auth Buttons */}
                {isLoggedIn && user ? (
                    <div className="mt-4 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-3 px-4 py-2 mb-2">
                            <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20">
                                <Image
                                    src={avatarUrl}
                                    alt={user.name || "User"}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                                <p className="text-xs text-muted-foreground ">{user.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                console.log('Navigate to Profile');
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-left"
                        >
                            <UserIcon size={16} />
                            Profile
                        </button>

                        <button
                            onClick={() => {
                                console.log('Navigate to Settings');
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-left"
                        >
                            <SettingsIcon size={16} />
                            Settings
                        </button>

                        <button
                            onClick={() => {
                                console.log('Navigate to Notifications');
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted text-left"
                        >
                            <BellIcon size={16} />
                            Notifications
                        </button>

                        <div className="my-2 h-px bg-border" />

                        <button
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-destructive/10 text-destructive text-left"
                        >
                            <LogoutIcon size={16} />
                            Log out
                        </button>
                    </div>
                ) : (
                    <div className="mt-4 pt-4 border-t border-border/40">
                        <AuthModal
                            triggerText="Sign In / Sign Up"
                            className="w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
