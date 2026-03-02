"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { GitHubStarButton } from "@/components/ui/github-star-button";
import {
  MenuToggleIcon,
  MessageCircleMoreIcon,
  UsersIcon,
  FileTextIcon,
} from "@/components/core/common/icons/animated";
import { OpentierLogo } from "@/components/core/common/logos";
import { AuthModal } from "@/components/core/landing/auth";
import Link from "next/link";
import { useRef, useState } from "react";
import { MobileMenu } from "./navbar/mobile-menu";
import { SmoothProfileDropdown } from "./navbar/profile-dropdown";
import { useUi } from "@/context/ui-context";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const Navbar = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for animated icons in navigation
  const chatIconRef = useRef<any>(null);
  const dashboardIconRef = useRef<any>(null);
  const docsIconRef = useRef<any>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md supports-[backdrop-filter]:bg-background/0 ">
      <div className="container mx-auto px-0 gap-2">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => {
              router.push("/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="group flex items-center gap-3 transition-all duration-300 hover:scale-105"
          >
            <OpentierLogo className="h-10 w-10" uniColor />
            <span className="text-lg font-bold text-foreground">
              OpenTier
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavigationMenu align="center">
              <NavigationMenuList className="gap-2">
                {/* Chat - Direct Link */}
                <NavigationMenuItem>
                  <Link
                    href="/chat"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-muted focus:bg-muted focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    onMouseEnter={() => chatIconRef.current?.startAnimation()}
                    onMouseLeave={() => chatIconRef.current?.stopAnimation()}
                  >
                    <MessageCircleMoreIcon ref={chatIconRef} size={20} className="mr-2" />
                    Chat
                  </Link>
                </NavigationMenuItem>

                {/* Dashboard - Direct Link */}
                <NavigationMenuItem>
                  <Link
                    href="/dashboard"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-muted focus:bg-muted focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    onMouseEnter={() => dashboardIconRef.current?.startAnimation()}
                    onMouseLeave={() => dashboardIconRef.current?.stopAnimation()}
                  >
                    <UsersIcon ref={dashboardIconRef} size={20} className="mr-2" />
                    Dashboard
                  </Link>
                </NavigationMenuItem>

                {/* Docs - Direct Link */}
                <NavigationMenuItem>
                  <Link
                    href="https://celestial-0.github.io/OpenTier/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-muted focus:bg-muted focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    onMouseEnter={() => docsIconRef.current?.startAnimation()}
                    onMouseLeave={() => docsIconRef.current?.stopAnimation()}
                  >
                    <FileTextIcon ref={docsIconRef} size={20} className="mr-2" />
                    Docs
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <GitHubStarButton
              repo="Celestial-0/OpenTier"
              className="hidden sm:flex"
            />

            <AnimatedThemeToggler />

            {/* User Menu or Auth Buttons */}
            {isAuthenticated && user ? (
              <SmoothProfileDropdown user={user} />
            ) : (
              <div className="hidden md:block">
                <AuthModal
                  id="auth-trigger"
                  triggerText="Get Started"
                />
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 hover:bg-muted"
            >
              <MenuToggleIcon open={mobileMenuOpen} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          setIsOpen={setMobileMenuOpen}
          user={user}
        />
      </div>
    </nav>
  );
};
