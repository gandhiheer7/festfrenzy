"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, User, Calendar, Shield } from "lucide-react"
import { api, getToken, removeToken, type User as UserType } from "@/lib/api"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    try {
      const me = await api.getMe()
      setUser(me)
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleLogout = () => {
    removeToken()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>

        {/* Avatar Card */}
        <Card className="border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.full_name}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex gap-2 mt-1">
                  {user?.is_admin && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Shield className="w-3 h-3 mr-1" /> Administrator
                    </Badge>
                  )}
                  <Badge variant={user?.is_active ? "secondary" : "destructive"}>
                    {user?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p className="font-medium">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-muted-foreground">Email Address</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-muted-foreground">Member Since</p>
                <p className="font-medium">{user?.created_at ? formatDate(user.created_at) : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium">{user?.is_admin ? "Administrator" : "Attendee"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/dashboard")}
          >
            My Registrations
          </Button>
          {user?.is_admin && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/admin/dashboard")}
            >
              Admin Dashboard
            </Button>
          )}
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
      </main>
    </div>
  )
}