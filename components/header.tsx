"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { removeToken } from "@/lib/api"
import type { User } from "@/lib/api"

interface HeaderProps {
  user?: User | null;
}

function getInitials(name: string | undefined): string {
  if (!name) return "G";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  }

  const isLoggedIn = !!user;
  const isAdmin = user?.is_admin ?? false;

  return (
    <header className="border-b border-primary/10 bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(isLoggedIn ? "/events" : "/")}
          className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
        >
          FestFrenzy
        </button>

        <nav className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/events")}
            className="text-foreground hover:text-primary"
          >
            Events
          </Button>

          {isAdmin && (
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="text-foreground hover:text-primary"
            >
              Admin
            </Button>
          )}

          {!isLoggedIn ? (
            <Button
              onClick={() => router.push("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sign In
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer border-2 border-primary/20 hover:border-primary/60 transition-colors">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {isAdmin && (
                    <p className="text-xs text-primary font-medium mt-0.5">Administrator</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  )
}