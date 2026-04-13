"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, getToken, type User, type Venue } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "Social",
  "Departmental", "Workshop", "Competition", "Other"
]

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Form fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [eventDatetime, setEventDatetime] = useState("")
  const [endDatetime, setEndDatetime] = useState("")
  const [capacity, setCapacity] = useState("100")
  const [cost, setCost] = useState("0")
  const [venueId, setVenueId] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    try {
      const me = await api.getMe()
      if (!me.is_admin) { router.push("/events"); return }
      setUser(me)
      const venuesData = await api.getVenues()
      setVenues(venuesData)
      if (venuesData.length > 0) setVenueId(String(venuesData[0].id))
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!venueId) {
      setError("Please create a venue first in the admin dashboard.")
      return
    }
    if (new Date(endDatetime) <= new Date(eventDatetime)) {
      setError("End time must be after start time.")
      return
    }

    setSubmitting(true)
    try {
      await api.createEvent({
        title,
        description,
        category,
        event_datetime: eventDatetime + ":00",
        end_datetime: endDatetime + ":00",
        capacity: parseInt(capacity),
        cost: parseFloat(cost),
        venue_id: parseInt(venueId),
        image_url: imageUrl || null,
      })
      toast({ title: "Event created!", description: `${title} is now live.` })
      router.push("/events")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create event.")
    } finally {
      setSubmitting(false)
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
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/admin/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Event</CardTitle>
            <CardDescription>Fill in the details to publish a new event</CardDescription>
          </CardHeader>
          <CardContent>
            {venues.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No venues available. Please{" "}
                  <button
                    className="underline text-primary"
                    onClick={() => router.push("/admin/dashboard")}
                  >
                    create a venue
                  </button>{" "}
                  first.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. TechFest 2025 Hackathon"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="desc">Description *</Label>
                  <textarea
                    id="desc"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Describe the event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Category + Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue *</Label>
                    <select
                      id="venue"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={venueId}
                      onChange={(e) => setVenueId(e.target.value)}
                      required
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.location}) — Cap: {v.capacity}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date & Time *</Label>
                    <Input
                      id="start"
                      type="datetime-local"
                      value={eventDatetime}
                      onChange={(e) => setEventDatetime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date & Time *</Label>
                    <Input
                      id="end"
                      type="datetime-local"
                      value={endDatetime}
                      onChange={(e) => setEndDatetime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Capacity + Cost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      placeholder="100"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost (₹) — 0 for free</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="img">Cover Image URL (optional)</Label>
                  <Input
                    id="img"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/admin/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}