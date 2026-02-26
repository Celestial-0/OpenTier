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
} from "@/components/core/common/icons/animated";
import { OpentierLogo } from "@/components/core/common/logos";
import { AuthModal } from "@/components/core/landing/auth";
import Link from "next/link";
import { useRef, useState } from "react";
import { knowledgeBaseItems } from "./navbar/constants";
import { MobileMenu } from "./navbar/mobile-menu";
import { ListItem } from "./navbar/nav-list-item";
import { SmoothProfileDropdown } from "./navbar/profile-dropdown";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export const Navbar = () => {
  const { user, isAuthenticated, signIn, signUp, resendVerification, verifyEmail, forgotPassword } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for animated icons in navigation
  const chatIconRef = useRef<any>(null);
  const dashboardIconRef = useRef<any>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md supports-[backdrop-filter]:bg-background/0 ">
      <div className="container mx-auto px-0 gap-2">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => {
              // TODO: Connect to navigation store/context
              console.log('Navigate to Home');
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

                {/* Knowledge Base - Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="group/item transition-all duration-200 hover:scale-105 bg-background/0">
                    Knowledge Base
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background/0">
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-background/0">
                      {knowledgeBaseItems.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          icon={item.icon}
                          onClick={() => {
                            // TODO: Connect to navigation store/context
                            console.log(`Navigate to ${item.title}`);
                          }}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
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
