"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Define the component's props
interface HeaderProps {
  userName?: string; // We now accept the user's name
  userRole?: "attendee" | "organizer" | "admin" | "guest";
}

// Helper function to get initials from a name
const getInitials = (name: string | undefined) => {
  if (!name) return "G"; // Fallback for Guest
  const names = name.split(' ');
  if (names.length === 1) return names[0][0].toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

export function Header({ userName, userRole = "guest" }: HeaderProps) {
  const router = useRouter()

  // --- UPDATED LOGOUT FUNCTION ---
  const handleLogout = () => {
    // Clear the one token we use for authentication
    localStorage.removeItem("festfrenzy_token");
    router.push("/login");
  }

  const handleProfile = () => {
    router.push("/profile") // We can build this page later
  }

  return (
    <header className="border-b border-primary/10 bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-primary">FestFrenzy</h1>
        </div>

        <nav className="flex items-center gap-6">
          {/* This button shows for everyone */}
          <Button variant="ghost" onClick={() => router.push("/events")} className="text-foreground hover:text-primary">
            Events
          </Button>

          {/* This button only shows for logged-in Organizers or Admins */}
          {(userRole === "organizer" || userRole === "admin") && (
            <Button
              variant="ghost"
              onClick={() => router.push(userRole === "admin" ? "/admin/dashboard" : "/dashboard")}
              className="text-foreground hover:text-primary"
            >
              My Dashboard
            </Button>
          )}

          {/* Show "Sign In" button if they are a "guest" */}
          {userRole === "guest" ? (
            <Button
              onClick={() => router.push("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sign In
            </Button>
          ) : (
            // Show the Avatar dropdown if they are logged in
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {/* --- UPDATED AVATAR --- */}
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleProfile}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
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