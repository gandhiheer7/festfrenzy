"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Calendar, MapPin, Loader2, IndianRupee, Users, Tag } from "lucide-react"
import { api, getToken, type User, type Event } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

// --- Helpers ---
function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Invalid Date"

    const dateOpts: Intl.DateTimeFormatOptions = {
      year: "numeric", month: "short", day: "numeric",
    }
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric", minute: "2-digit", hour12: true,
    }

    const startDate = s.toLocaleDateString("en-IN", dateOpts)
    const endDate = e.toLocaleDateString("en-IN", dateOpts)
    const startTime = s.toLocaleTimeString("en-IN", timeOpts)
    const endTime = e.toLocaleTimeString("en-IN", timeOpts)

    return startDate === endDate
      ? `${startDate}, ${startTime} – ${endTime}`
      : `${startDate}, ${startTime} – ${endDate}, ${endTime}`
  } catch {
    return "Invalid Date"
  }
}

function SpotsBar({ registered, capacity }: { registered: number; capacity: number }) {
  const pct = Math.min((registered / capacity) * 100, 100)
  const isFull = registered >= capacity
  const isAlmostFull = pct >= 80

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{isFull ? "Fully Booked" : `${capacity - registered} spots left`}</span>
        <span>{registered}/{capacity}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? "bg-destructive" : isAlmostFull ? "bg-yellow-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// --- Main Page ---
export default function EventsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [myRegisteredIds, setMyRegisteredIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [registering, setRegistering] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // --- Load user + events + my registrations ---
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventsData] = await Promise.all([api.getEvents()])
      setEvents(eventsData)

      const token = getToken()
      if (token) {
        try {
          const [meData, regsData] = await Promise.all([
            api.getMe(),
            api.getMyRegistrations(),
          ])
          setUser(meData)
          setMyRegisteredIds(new Set(regsData.map((r) => r.event_id)))
        } catch {
          // Token expired or invalid — treat as guest
          setUser(null)
        }
      }
    } catch {
      setError("Could not load events. Please try refreshing.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Register / Cancel ---
  const handleRegister = async (event: Event) => {
    if (!user) {
      router.push("/login")
      return
    }
    setRegistering(event.id)
    try {
      const isRegistered = myRegisteredIds.has(event.id)
      if (isRegistered) {
        await api.cancelRegistration(event.id)
        setMyRegisteredIds((prev) => {
          const next = new Set(prev)
          next.delete(event.id)
          return next
        })
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, registration_count: e.registration_count - 1 }
              : e
          )
        )
        toast({ title: "Cancelled", description: `Unregistered from ${event.title}` })
      } else {
        await api.registerForEvent(event.id)
        setMyRegisteredIds((prev) => new Set(prev).add(event.id))
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, registration_count: e.registration_count + 1 }
              : e
          )
        )
        toast({ title: "Registered!", description: `You're in for ${event.title}` })
      }
      // Update selected event if dialog is open
      if (selectedEvent?.id === event.id) {
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                registration_count: myRegisteredIds.has(event.id)
                  ? prev.registration_count - 1
                  : prev.registration_count + 1,
              }
            : null
        )
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setRegistering(null)
    }
  }

  // --- Categories from live data ---
  const categories = Array.from(new Set(events.map((e) => e.category))).sort()
  const filtered = selectedCategory
    ? events.filter((e) => e.category === selectedCategory)
    : events

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Upcoming Events</h1>
            <p className="text-muted-foreground mt-1">
              {events.length} event{events.length !== 1 ? "s" : ""} available
            </p>
          </div>
          {user?.is_admin && (
            <Button
              onClick={() => router.push("/admin")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Manage Events
            </Button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={loadData}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-primary/10">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {selectedCategory
                  ? `No events in "${selectedCategory}" yet.`
                  : "No events scheduled yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => {
              const isRegistered = myRegisteredIds.has(event.id)
              const isFull = event.registration_count >= event.capacity
              const isProcessing = registering === event.id

              return (
                <Card
                  key={event.id}
                  className="overflow-hidden border-primary/10 hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={
                        event.image_url ||
                        `https://placehold.co/600x400/7ec4cf/FFFFFF?text=${encodeURIComponent(event.title)}`
                      }
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
                        {event.title}
                      </h3>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {event.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.creator.full_name}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 pb-3 flex-grow">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span className="line-clamp-1">
                        {formatDateRange(event.event_datetime, event.end_datetime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="line-clamp-1">
                        {event.venue.name} · {event.venue.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IndianRupee className="w-4 h-4 text-primary shrink-0" />
                      <span>{event.cost === 0 ? "Free Entry" : `₹${event.cost.toFixed(2)}`}</span>
                    </div>
                    <SpotsBar
                      registered={event.registration_count}
                      capacity={event.capacity}
                    />
                  </CardContent>

                  <CardFooter className="gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Details
                    </Button>
                    <Button
                      className={`flex-1 ${
                        isRegistered
                          ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                      disabled={(!isRegistered && isFull) || isProcessing}
                      onClick={() => handleRegister(event)}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRegistered ? (
                        "Cancel"
                      ) : isFull ? (
                        "Full"
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex gap-2 flex-wrap mt-1">
                  <Badge variant="secondary">{selectedEvent.category}</Badge>
                  <Badge variant="outline">{selectedEvent.creator.full_name}</Badge>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{formatDateRange(selectedEvent.event_datetime, selectedEvent.end_datetime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>{selectedEvent.venue.name} · {selectedEvent.venue.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span>Capacity: {selectedEvent.capacity}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IndianRupee className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {selectedEvent.cost === 0 ? "Free Entry" : `₹${selectedEvent.cost.toFixed(2)} per person`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-primary shrink-0" />
                <SpotsBar
                  registered={selectedEvent.registration_count}
                  capacity={selectedEvent.capacity}
                />
              </div>
              <div className="pt-2">
                <p className="text-sm font-medium mb-1">About this event</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedEvent.description || "No description provided."}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button
                className={
                  myRegisteredIds.has(selectedEvent.id)
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }
                disabled={
                  (!myRegisteredIds.has(selectedEvent.id) &&
                    selectedEvent.registration_count >= selectedEvent.capacity) ||
                  registering === selectedEvent.id
                }
                onClick={() => handleRegister(selectedEvent)}
              >
                {registering === selectedEvent.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : myRegisteredIds.has(selectedEvent.id) ? (
                  "Cancel Registration"
                ) : selectedEvent.registration_count >= selectedEvent.capacity ? (
                  "Fully Booked"
                ) : (
                  "Register Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}