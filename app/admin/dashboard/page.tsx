"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, ShieldCheck, ShieldOff } from "lucide-react"
import { api, getToken, type User, type Venue } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  // Venue form
  const [venueName, setVenueName] = useState("")
  const [venueLocation, setVenueLocation] = useState("")
  const [venueCapacity, setVenueCapacity] = useState("")
  const [venueLoading, setVenueLoading] = useState(false)

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    try {
      const me = await api.getMe()
      if (!me.is_admin) { router.push("/events"); return }
      setUser(me)
      const [usersData, venuesData] = await Promise.all([
        api.getAllUsers(),
        api.getVenues(),
      ])
      setUsers(usersData)
      setVenues(venuesData)
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleAdmin = async (targetUser: User) => {
    try {
      const updated = targetUser.is_admin
        ? await api.removeAdmin(targetUser.id)
        : await api.makeAdmin(targetUser.id)
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
      toast({
        title: "Updated",
        description: `${updated.full_name} is ${updated.is_admin ? "now" : "no longer"} an admin.`,
      })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not update user.",
      })
    }
  }

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueName || !venueLocation || !venueCapacity) return
    setVenueLoading(true)
    try {
      const newVenue = await api.createVenue({
        name: venueName,
        location: venueLocation,
        capacity: parseInt(venueCapacity),
      })
      setVenues((prev) => [...prev, newVenue])
      setVenueName("")
      setVenueLocation("")
      setVenueCapacity("")
      toast({ title: "Venue added", description: `${newVenue.name} created successfully.` })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not add venue.",
      })
    } finally {
      setVenueLoading(false)
    }
  }

  const handleDeleteVenue = async (id: number, name: string) => {
    if (!confirm(`Delete venue "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteVenue(id)
      setVenues((prev) => prev.filter((v) => v.id !== id))
      toast({ title: "Deleted", description: `${name} removed.` })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not delete venue.",
      })
    }
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
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users, venues, and events</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: users.length },
            { label: "Admins", value: users.filter((u) => u.is_admin).length },
            { label: "Venues", value: venues.length },
            { label: "Total Capacity", value: venues.reduce((a, v) => a + v.capacity, 0) },
          ].map((stat) => (
            <Card key={stat.label} className="border-primary/10">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="venues" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="venues">Manage Venues</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
          </TabsList>

          {/* Venues Tab */}
          <TabsContent value="venues" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Existing Venues */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Existing Venues</CardTitle>
                  <CardDescription>{venues.length} venue{venues.length !== 1 ? "s" : ""} in system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {venues.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No venues yet.</p>
                    ) : (
                      venues.map((venue) => (
                        <div
                          key={venue.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">{venue.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {venue.location} · Cap: {venue.capacity}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteVenue(venue.id, venue.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Add Venue */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Add New Venue</CardTitle>
                  <CardDescription>Create a venue for events</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddVenue} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="v-name">Venue Name</Label>
                      <Input
                        id="v-name"
                        placeholder="e.g. Main Auditorium"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="v-location">Location</Label>
                      <Input
                        id="v-location"
                        placeholder="e.g. Block A, Ground Floor"
                        value={venueLocation}
                        onChange={(e) => setVenueLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="v-cap">Capacity</Label>
                      <Input
                        id="v-cap"
                        type="number"
                        min="1"
                        placeholder="e.g. 200"
                        value={venueCapacity}
                        onChange={(e) => setVenueCapacity(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={venueLoading}>
                      {venueLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Venue"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Grant or revoke admin privileges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{u.full_name}</p>
                          {u.is_admin && (
                            <Badge variant="default" className="text-xs bg-primary">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={u.is_admin ? "destructive" : "outline"}
                        onClick={() => handleToggleAdmin(u)}
                        disabled={u.id === user?.id}
                        title={u.id === user?.id ? "Cannot change your own role" : ""}
                      >
                        {u.is_admin ? (
                          <><ShieldOff className="w-4 h-4 mr-1" /> Remove Admin</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4 mr-1" /> Make Admin</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}