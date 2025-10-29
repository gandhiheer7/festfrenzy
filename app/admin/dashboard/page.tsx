"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Loader2 } from "lucide-react"

// --- User Interface ---
interface User {
  id: number;
  name: string;
  email: string;
  role: "organizer" | "admin";
  is_approved: boolean;
}

// --- UPDATED Venue Interface ---
interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
}

// --- Loading Component ---
function FullPageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}

export default function AdminDashboardPage() {
  // --- Venue states ---
  const [venueName, setVenueName] = useState("")
  const [venueLocation, setVenueLocation] = useState("")
  const [venueCapacity, setVenueCapacity] = useState("")
  const [venues, setVenues] = useState<Venue[]>([]) // Initialize as empty
  const [venueError, setVenueError] = useState<string | null>(null) // For venue form errors

  // --- Auth & Data States ---
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [pendingOrganizers, setPendingOrganizers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // --- 1. Authentication Effect (No changes) ---
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("festfrenzy_token")
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const response = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        const userData: User = response.data
        if (userData.role === "organizer") {
          router.push("/dashboard");
        } else if (userData.role === "admin") {
          setAdminUser(userData);
        } else {
          setError("You do not have permission to view this page.");
          localStorage.removeItem("festfrenzy_token");
          router.push("/login");
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setError(err.response?.data?.detail || "Session expired. Please log in again.");
        localStorage.removeItem("festfrenzy_token");
        router.push("/login");
      }
    }
    fetchUser()
  }, [router])

  // --- 2. Data Fetching Effect (UPDATED to fetch venues) ---
  useEffect(() => {
    const fetchData = async () => {
      if (adminUser) { // Only run if we are a confirmed admin
        const token = localStorage.getItem("festfrenzy_token")
        try {
          // Fetch both sets of data
          const [orgResponse, venueResponse] = await Promise.all([
            axios.get("/api/admin/pending-organizers", {
              headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get("/api/venues") // This is a public endpoint
          ]);
          
          setPendingOrganizers(orgResponse.data)
          setVenues(venueResponse.data)

        } catch (err: any) {
          console.error("Failed to fetch data:", err)
          setError(err.response?.data?.detail || "Could not load data.")
        } finally {
          setLoading(false) // Stop loader after *all* data is fetched
        }
      }
    }
    fetchData()
  }, [adminUser]) // This effect depends on 'adminUser'

  // --- 3. Approve Button Handler (No changes) ---
  const handleApprove = async (userId: number) => {
    const token = localStorage.getItem("festfrenzy_token")
    try {
      await axios.post(`/api/admin/approve-organizer/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPendingOrganizers((prev) => prev.filter((user) => user.id !== userId))
    } catch (err: any) {
      console.error("Failed to approve:", err)
      alert(err.response?.data?.detail || "Could not approve organizer.")
    }
  }

  // --- 4. UPDATED Venue Handlers ---
  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form from reloading page
    setVenueError(null);
    
    if (!venueName || !venueLocation || !venueCapacity) {
      setVenueError("All fields are required.");
      return;
    }
    
    const token = localStorage.getItem("festfrenzy_token")
    try {
      const response = await axios.post("/api/admin/venues", {
        name: venueName,
        location: venueLocation,
        capacity: parseInt(venueCapacity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new venue to the list in the UI
      setVenues((prev) => [...prev, response.data]);
      
      // Reset form
      setVenueName("");
      setVenueLocation("");
      setVenueCapacity("");

    } catch (err: any) {
      console.error("Failed to add venue:", err);
      setVenueError(err.response?.data?.detail || "Could not add venue.");
    }
  }

  const handleDeleteVenue = async (id: number) => {
    if (!confirm("Are you sure you want to delete this venue?")) {
      return;
    }

    const token = localStorage.getItem("festfrenzy_token")
    try {
      await axios.delete(`/api/admin/venues/${id}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      // Remove venue from the list in the UI
      setVenues((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      console.error("Failed to delete venue:", err);
      alert(err.response?.data?.detail || "Could not delete venue.");
    }
  }

  // --- RENDER LOGIC ---
  if (loading || !adminUser) {
    return <FullPageLoader />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={adminUser.name} userRole={adminUser.role} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ... (Header section - no changes) ... */}
        <div className="mb-8">
           <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
           <p className="text-muted-foreground mt-2">Manage organizers and venues</p>
         </div>

        <Tabs defaultValue="organizers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="organizers">Approve Organizers</TabsTrigger>
            <TabsTrigger value="venues">Manage Venues</TabsTrigger>
          </TabsList>

          {/* Approve Organizers Tab (No changes) */}
          <TabsContent value="organizers" className="space-y-4">
             {/* ... (Organizers Table JSX - no changes) ... */}
          </TabsContent>

          {/* --- UPDATED Manage Venues Tab --- */}
          <TabsContent value="venues" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Existing Venues Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Existing Venues</CardTitle>
                  <CardDescription>Current venues in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {venues.length === 0 ? (
                      <p className="text-center text-muted-foreground">No venues created yet.</p>
                    ) : (
                      venues.map((venue) => (
                        <div key={venue.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium text-foreground">{venue.name}</span>
                            <p className="text-sm text-muted-foreground">{venue.location} (Cap: {venue.capacity})</p>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVenue(venue.id)}>
                            Delete
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Add New Venue Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Add New Venue</CardTitle>
                  <CardDescription>Create a new venue</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Form now has an onSubmit handler */}
                  <form onSubmit={handleAddVenue} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">Venue Name</Label>
                      <Input
                        id="venue-name"
                        placeholder="Enter venue name"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        className="border-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-location">Location</Label>
                      <Input
                        id="venue-location"
                        placeholder="e.g., 'Tech Building, Room 201'"
                        value={venueLocation}
                        onChange={(e) => setVenueLocation(e.target.value)}
                        className="border-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-capacity">Capacity</Label>
                      <Input
                        id="venue-capacity"
                        type="number"
                        placeholder="e.g., 150"
                        value={venueCapacity}
                        onChange={(e) => setVenueCapacity(e.target.value)}
                        className="border-primary/20"
                        required
                      />
                    </div>

                    {venueError && (
                      <p className="text-sm text-red-600">{venueError}</p>
                    )}

                    <Button
                      type="submit" // Button is now a submit button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Add Venue
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}