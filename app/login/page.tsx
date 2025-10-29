"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Remove Tabs imports if not used elsewhere on the page
import { useRouter } from "next/navigation"
import axios from "axios"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react"; // Make sure Loader2 is imported

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [organiserForm, setOrganiserForm] = useState(false); // State to show/hide organizer login
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Attendee Access Handler ---
  const handleAttendeeAccess = () => {
    router.push("/events"); // Simply navigate to the events page
  }

  // --- Organizer Sign In Handler ---
  const handleOrganizerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append('username', signInEmail);
    params.append('password', signInPassword);

    try {
      const response = await axios.post("/api/organizer/login", params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token } = response.data;
      localStorage.setItem("festfrenzy_token", access_token);
      router.push("/dashboard"); // Redirect, dashboard will handle role check

    } catch (err: any) {
      console.error("Sign In failed:", err);
      setError(err.response?.data?.detail || "Sign in failed. Check credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Toaster />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">FestFrenzy</h1>
          <p className="text-muted-foreground">Welcome to FestFrenzy</p>
        </div>

        {/* --- Initial Choice Screen --- */}
        {!organiserForm ? (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Choose Your Access</CardTitle>
              <CardDescription>Select how you want to access FestFrenzy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleAttendeeAccess}
                className="w-full h-12 text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                Browse Events as Attendee
              </Button>
              <Button
                onClick={() => setOrganiserForm(true)}
                variant="outline"
                className="w-full h-12 text-base border-primary/30 text-primary hover:bg-primary/5"
              >
                Organizer Sign In
              </Button>
            </CardContent>
          </Card>
        ) : (
          // --- Organizer Sign In Form ---
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Organizer Access</CardTitle>
              <CardDescription>Sign in to manage your events</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrganizerSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email" type="email" placeholder="your@email.com"
                    value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)}
                    required className="border-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password" type="password" placeholder="••••••••"
                    value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)}
                    required maxLength={72} className="border-primary/20"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isLoading ? <Loader2 className="animate-spin mx-auto"/> : "Sign In"}
                </Button>
              </form>
              {/* Back Button */}
              <Button onClick={() => { setOrganiserForm(false); setError(null); }} variant="ghost" className="w-full mt-4">
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}