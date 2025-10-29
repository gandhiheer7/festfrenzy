"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
// No need for Badge in this version
import { useRouter } from "next/navigation"
import axios from "axios"
import { Loader2 } from "lucide-react"

// --- Interfaces (Add end_datetime to Event) ---
interface User {
  id: number;
  name: string;
  email: string;
  role: "organizer" | "admin";
  is_approved: boolean;
}
interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
}
interface Event {
  id: number;
  title: string;
  description: string;
  event_datetime: string; // ISO string format
  end_datetime: string; // <-- ADDED
  capacity: number;
  cost: number;
  venue_id: number;
  organizer_id: number;
  venue: Venue;
}

// --- Loading Component ---
function FullPageLoader() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}

export default function DashboardPage() {
  // --- Form States (Add end date state) ---
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [eventVenueId, setEventVenueId] = useState<string>("")
  const [eventDateTime, setEventDateTime] = useState("")
  const [eventEndDateTime, setEventEndDateTime] = useState("") // <-- ADDED
  const [eventCapacity, setEventCapacity] = useState("")
  const [eventCost, setEventCost] = useState<string>("0")
  const [createEventError, setCreateEventError] = useState<string | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

  // --- Auth & Data States ---
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const router = useRouter()

  // --- 1. Authentication Effect (No changes needed) ---
  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true);
      const token = localStorage.getItem("festfrenzy_token");
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const response = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userData: User = response.data;
        if (userData.role === "admin") {
          router.push("/admin/dashboard");
        } else if (userData.role === "organizer") {
          setUser(userData);
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
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, [router]);

  // --- 2. Data Fetching Effect (No changes needed) ---
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setLoadingData(true);
        const token = localStorage.getItem("festfrenzy_token");
        try {
          const [venueResponse, eventResponse] = await Promise.all([
            axios.get("/api/venues"),
            axios.get("/api/organizer/events", {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          setVenues(venueResponse.data);
          setMyEvents(eventResponse.data);
        } catch (err: any) {
          console.error("Failed to fetch dashboard data:", err);
          setError(err.response?.data?.detail || "Could not load dashboard data.");
        } finally {
          setLoadingData(false);
        }
      }
    }
    fetchData();
  }, [user]);

  // --- 3. Create Event Handler (UPDATED) ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateEventError(null);
    setIsCreatingEvent(true);

    // Add end date to validation
    if (!eventTitle || !eventDescription || !eventVenueId || !eventDateTime || !eventEndDateTime || !eventCapacity) {
      setCreateEventError("All fields are required.");
      setIsCreatingEvent(false);
      return;
    }
    const costValue = parseFloat(eventCost); // Convert cost string to number
    if (isNaN(costValue) || costValue < 0) {
        setCreateEventError("Cost must be a valid number (0 or greater).");
        setIsCreatingEvent(false);
        return;
    }

    // --- Frontend date validation ---
    const startDate = new Date(eventDateTime);
    const endDate = new Date(eventEndDateTime);
    if (endDate <= startDate) {
         setCreateEventError("End date & time must be after start date & time.");
         setIsCreatingEvent(false);
         return;
    }

    const token = localStorage.getItem("festfrenzy_token");
    try {
      const response = await axios.post("/api/organizer/events", {
        title: eventTitle,
        description: eventDescription,
        venue_id: parseInt(eventVenueId),
        event_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(), // <-- SEND END DATE
        capacity: parseInt(eventCapacity),
        cost: costValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new event and sort list by date
      setMyEvents((prev) => [...prev, response.data].sort((a,b) => new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime()));

      // Reset all form fields
      setEventTitle("");
      setEventDescription("");
      setEventVenueId("");
      setEventDateTime("");
      setEventEndDateTime(""); 
      setEventCapacity("");
      setEventCost("0");
      alert("Event created successfully!");

    } catch (err: any) {
      console.error("Failed to create event:", err);
      // Use the specific error from the backend (like conflict message)
      setCreateEventError(err.response?.data?.detail || "Could not create event.");
    } finally {
      setIsCreatingEvent(false);
    }
  }

  // --- RENDER LOGIC ---
  if (loadingUser) {
     return <FullPageLoader />;
  }

  if (error && !loadingUser) { // Show error only after auth check completes
     return (
       <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
         <Card className="w-full max-w-md border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => router.push('/login')} className="w-full">Go to Login</Button>
            </CardContent>
         </Card>
       </div>
     );
  }

  if (!user) { // Fallback if user is null after loading and no error
     return <FullPageLoader />;
  }

  // --- ADDED: Date formatting helper ---
  const formatEventDates = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const optionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

    const startStrDate = startDate.toLocaleDateString('en-IN', optionsDate);
    const endStrDate = endDate.toLocaleDateString('en-IN', optionsDate);
    const startStrTime = startDate.toLocaleTimeString('en-IN', optionsTime);
    const endStrTime = endDate.toLocaleTimeString('en-IN', optionsTime);

    if (startStrDate === endStrDate) {
        // Same day: "29 Oct 2025, 10:00 AM - 12:30 PM"
        return `${startStrDate}, ${startStrTime} - ${endStrTime}`;
    } else {
        // Different days: "29 Oct 2025, 10:00 AM - 30 Oct 2025, 12:30 PM"
        return `${startStrDate}, ${startStrTime} - ${endStrDate}, ${endStrTime}`;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={user.name} userRole={user.role} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {user.name}
          </h1>
          <p className="text-muted-foreground mt-2">Manage your events and bookings</p>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="events">My Events</TabsTrigger>
            <TabsTrigger value="payments">Verify Payments</TabsTrigger>
            <TabsTrigger value="create">Create Event</TabsTrigger>
          </TabsList>

          {/* --- UPDATED My Events Tab --- */}
          <TabsContent value="events" className="space-y-4">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>My Events</CardTitle>
                <CardDescription>Events you have created</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                   <div className="flex justify-center items-center p-8"> <Loader2 className="animate-spin text-primary"/></div>
                 ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-primary/10">
                          <TableHead>Event Title</TableHead>
                          <TableHead>Date & Time Range</TableHead> {/* Updated Header */}
                          <TableHead>Venue</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Cost (INR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myEvents.length === 0 ? (
                          <TableRow>
                         {/* Ensure colSpan matches the number of TableHead columns (5) */}
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              You haven't created any events yet.
                            </TableCell>
                          </TableRow>
                      ) : (
                        myEvents.map((event) => (
                        // Make sure there's absolutely no space or newline before the first TableCell
                          <TableRow key={event.id} className="border-primary/10 hover:bg-muted/50">
                            <TableCell className="font-medium">{event.title}</TableCell><TableCell>{formatEventDates(event.event_datetime, event.end_datetime)}</TableCell><TableCell>{event.venue.name} ({event.venue.location})</TableCell><TableCell>{event.capacity}</TableCell><TableCell>
                              {event.cost === 0 ? <Badge variant="secondary">Free</Badge> : `₹ ${event.cost.toFixed(2)}`}
                            </TableCell>
                            </TableRow> // Make sure there's no space or newline after the last TableCell
                        ))
                      )}
                    </TableBody>
                      </Table>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verify Payments Tab (Still Static) */}
          <TabsContent value="payments" className="space-y-4">
             <Card className="border-primary/10">
                 <CardHeader>
                    <CardTitle>Verify Payments</CardTitle>
                    <CardDescription>Review and approve pending bookings</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <p className="text-center text-muted-foreground p-8">Payment verification feature coming soon.</p>
                 </CardContent>
             </Card>
          </TabsContent>

          {/* --- UPDATED Create Event Tab --- */}
          <TabsContent value="create" className="space-y-4">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Create New Event</CardTitle>
                <CardDescription>Add a new event to your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateEvent} className="space-y-6">
                  {/* Event Title */}
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Event Title</Label>
                    <Input id="event-title" placeholder="Enter event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required className="border-primary/20"/>
                  </div>
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea id="event-description" placeholder="Describe your event" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} required className="border-primary/20 min-h-24"/>
                  </div>

                  {/* Venue and Start Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-venue">Venue</Label>
                      <Select value={eventVenueId} onValueChange={setEventVenueId} required>
                        <SelectTrigger id="event-venue" className="border-primary/20">
                          <SelectValue placeholder="Select a venue" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingData ? (
                             <SelectItem value="loading" disabled>Loading venues...</SelectItem>
                          ) : venues.length === 0 ? (
                            <SelectItem value="no-venues" disabled>No venues available. Ask admin to add some.</SelectItem>
                          ): (
                            venues.map((venue) => (
                              <SelectItem key={venue.id} value={String(venue.id)}>
                                {venue.name} ({venue.location}) - Cap: {venue.capacity}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="event-datetime">Start Date & Time</Label>
                       <Input id="event-datetime" type="datetime-local" value={eventDateTime} onChange={(e) => setEventDateTime(e.target.value)} required className="border-primary/20"/>
                    </div>
                  </div>

                  {/* End Time and Capacity Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                         <Label htmlFor="event-end-datetime">End Date & Time</Label>
                         <Input
                           id="event-end-datetime"
                           type="datetime-local"
                           value={eventEndDateTime}
                           onChange={(e) => setEventEndDateTime(e.target.value)}
                           required
                           className="border-primary/20"
                           min={eventDateTime || ''} // Set min based on start time
                          />
                     </div>
                     <div className="space-y-2">
                         <Label htmlFor="event-capacity">Capacity</Label>
                         <Input id="event-capacity" type="number" min="1" placeholder="Enter event capacity (e.g., 50)" value={eventCapacity} onChange={(e) => setEventCapacity(e.target.value)} required className="border-primary/20"/>
                     </div>
                  </div>
                  
                  {/* --- ADD COST INPUT --- */}
                  <div className="space-y-2">
                      <Label htmlFor="event-cost">Cost per Person (INR)</Label>
                      <Input
                        id="event-cost"
                        type="number"
                        min="0" // Allow 0 for free
                        step="0.01" // Allow rupees and paise if needed, or just "1" for whole rupees
                        placeholder="Enter cost (e.g., 50 or 0 for free)"
                        value={eventCost}
                        onChange={(e) => setEventCost(e.target.value)}
                        required
                        className="border-primary/20"
                       />
                       <p className="text-xs text-muted-foreground">Enter 0 for free events.</p>
                  </div>

                  {/* Error Message Display */}
                  {createEventError && (
                    <p className="text-sm text-red-600">{createEventError}</p>
                  )}

                  <Button type="submit" disabled={isCreatingEvent || loadingData || venues.length === 0} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isCreatingEvent ? <Loader2 className="animate-spin mx-auto"/> : "Create Event"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}