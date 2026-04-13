"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, MapPin, IndianRupee, Users } from "lucide-react"
import { api, getToken, type User, type Event, type Registration } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: "Asia/Kolkata",
    })
  } catch {
    return "Invalid Date"
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [eventMap, setEventMap] = useState<Map<number, Event>>(new Map())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      const [meData, regsData, eventsData] = await Promise.all([
        api.getMe(),
        api.getMyRegistrations(),
        api.getEvents(),
      ])
      setUser(meData)
      setRegistrations(regsData)
      const map = new Map<number, Event>()
      eventsData.forEach((e) => map.set(e.id, e))
      setEventMap(map)
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCancel = async (eventId: number) => {
    try {
      await api.cancelRegistration(eventId)
      setRegistrations((prev) => prev.filter((r) => r.event_id !== eventId))
      toast({ title: "Cancelled", description: "Registration cancelled successfully." })
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not cancel registration.",
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
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {user?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            You are registered for {registrations.length} event{registrations.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* Registered Events */}
        <section>
          <h2 className="text-xl font-semibold mb-4">My Registrations</h2>
          {registrations.length === 0 ? (
            <Card className="border-primary/10">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t registered for any events yet.
                </p>
                <Button onClick={() => router.push("/events")}>
                  Browse Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registrations.map((reg) => {
                const event = eventMap.get(reg.event_id)
                if (!event) return null
                return (
                  <Card key={reg.id} className="border-primary/10 hover:shadow-md transition-shadow flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">{event.category}</Badge>
                      </div>
                      <CardDescription>
                        Registered {formatDate(reg.registered_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span>{formatDate(event.event_datetime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span>{event.venue.name} · {event.venue.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IndianRupee className="w-4 h-4 text-primary shrink-0" />
                        <span>{event.cost === 0 ? "Free" : `₹${event.cost.toFixed(2)}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 text-primary shrink-0" />
                        <span>{event.registration_count}/{event.capacity} registered</span>
                      </div>
                    </CardContent>
                    <div className="px-6 pb-6">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleCancel(event.id)}
                      >
                        Cancel Registration
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}