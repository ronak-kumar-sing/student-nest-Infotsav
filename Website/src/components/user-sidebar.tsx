"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LogOut, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentNestLogoIcon } from "@/components/ui/logo";

interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: "student" | "owner";
  image?: string;
  signedIn: boolean;
}

interface ActiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function ActiveLink({ href, children, className }: ActiveLinkProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
        active && "bg-accent text-accent-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
}

interface UserSidebarProps {
  user: User;
  children: React.ReactNode;
}

export function UserSidebar({ user, children }: UserSidebarProps) {
  const pathname = usePathname();

  const items = React.useMemo(() => {
    const userRole = user.role || 'student';
    console.log("Filtering nav items for role:", userRole);
    const filtered = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(userRole));
    console.log("Filtered nav items:", filtered.length, filtered.map(i => i.label));
    return filtered;
  }, [user.role]);

  // Get current page title based on pathname
  const currentPageTitle = React.useMemo(() => {
    const currentItem = NAV_ITEMS.find(item => item.href === pathname);
    return currentItem?.label || "StudentNest";
  }, [pathname]);

  const handleLogout = () => {
    // Clear any stored tokens/session data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to login page
    window.location.href = '/';
  };

  const userInitials = user.name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <UISidebar className="border-r bg-background">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-4 py-3">
              <StudentNestLogoIcon className="h-6 w-6" />
              <span className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
                StudentNest
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Navigation
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-1">
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <ActiveLink href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </ActiveLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <Separator className="my-2" />
            {user.signedIn ? (
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="text-xs bg-gradient-to-r from-purple-600 to-blue-500 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 group-data-[collapsible=icon]:hidden"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="px-4 py-3">
                <ActiveLink href="/student/login">
                  <span className="text-sm">Sign in</span>
                </ActiveLink>
              </div>
            )}
          </SidebarFooter>
        </UISidebar>

        <SidebarInset className="flex-1">
          {/* Header bar with trigger */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">{currentPageTitle}</span>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
