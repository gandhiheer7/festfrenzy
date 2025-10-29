"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header" // Assuming Header component exists
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Calendar, MapPin, Loader2, IndianRupee, CheckCircle, XCircle, Users } from "lucide-react" // Import Loader2
import axios, { AxiosError } from "axios"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// --- Interfaces (Make sure these match your backend schemas) ---
interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
}
interface Organizer { // Assuming backend returns this structure for event.organizer
    id: number;
    name: string;
    email: string;
    // role: string; // Not needed for display
    // is_approved: boolean; // Not needed for display
}
interface Event {
  id: number;
  title: string;
  description: string;
  event_datetime: string; // ISO string format
  end_datetime: string; // ISO string format
  capacity: number;
  cost: number;
  venue_id: number;
  organizer_id: number;
  venue: Venue;
  organizer: Organizer; // Include Organizer info
}

// --- Committee Data ---
// IMPORTANT: Make sure the 'items' here exactly match the 'name' field
//            of your organizer accounts in PRE_DEFINED_ACCOUNTS
const committeesData = [
  { category: "Technical Committees", items: ["SPark", "IEEE CS", "Astrophysics Club", "IEEE", "IETE", "ACSES", "IEEE AESS", "CSI"] }, // Example names, replace with YOUR actual names
  { category: "Cultural Committees", items: ["Speakers' Club", "MUDRA", "FEC", "Oculus"] }, // Example names
  { category: "Social & Other", items: ["SPCG", "Rotaract", "Ecell", "SDC", "NISP", "WIE", "DRC", "Enactus", "SURAKSHA"] }, // Example names
  { category: "Sports Committees", items: ["Sports"] }, // Example names
  { category: "Departmental", items: ["FETS"]}
  // Add more categories and items as needed
]


export default function EventsPage() {
  const router = useRouter()
  //const { toast } = useToast();
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null)

  // --- States for Data Fetching ---
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"guest" | "organizer" | "admin">("guest");
  //const [isLoggedIn, setIsLoggedIn] = useState(false);
  //const [bookingState, setBookingState] = useState<BookingState>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // --- Check Auth Status ---
  useEffect(() => {
        const token = localStorage.getItem("festfrenzy_token");
        setUserRole(token ? "organizer" : "guest");
  }, []);

  // --- Fetch Events Effect ---
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("/api/events"); // Call the public endpoint
        // --- Add Organizer to Event schema if backend doesn't nest it ---
        // If your backend /api/events doesn't automatically include organizer details,
        // you might need another request here or adjust the backend schema.
        // Assuming backend *does* include organizer details now.
        setEvents(response.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setError("Could not load events. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []); // Run only once on page load

  // --- Filter events by selected committee ---
  const filteredEvents = selectedCommittee
    ? events.filter((e) => e.organizer && e.organizer.name === selectedCommittee) // Filter by organizer name
    : events;

  // --- Date Formatting Helper ---
  const formatEventDates = (start: string, end: string): string => {
    console.log('Formatting dates - Raw Received:', { start, end });
    try {
        const startDate = new Date(start + 'Z');
        const endDate = new Date(end + 'Z');
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "Invalid Date";

        const optionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' };
        const optionsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };

        const startStrDate = startDate.toLocaleDateString('en-IN', optionsDate);
        const endStrDate = endDate.toLocaleDateString('en-IN', optionsDate);
        const startStrTime = startDate.toLocaleTimeString('en-IN', optionsTime);
        const endStrTime = endDate.toLocaleTimeString('en-IN', optionsTime);

        if (startStrDate === endStrDate) {
            return `${startStrDate}, ${startStrTime} - ${endStrTime}`;
        } else {
            return `${startStrDate}, ${startStrTime} - ${endStrDate}, ${endStrTime}`;
        }
    } catch (e) {
        console.error("Error formatting date:", start, end, e);
        return "Invalid Date Range";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={userRole} /> {/* Pass role for conditional rendering in Header */}
      <Toaster />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-12">
          {/* Events Section */}
          <section>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Upcoming Events</h1>
              {selectedCommittee && (
                <p className="text-muted-foreground">
                  Showing events from <span className="font-semibold text-primary">{selectedCommittee}</span>
                   <Button variant="link" size="sm" onClick={() => setSelectedCommittee(null)} className="ml-2 text-xs">(Show All)</Button>
                </p>
              )}
            </div>

            {/* --- Loading and Error Handling --- */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">{error}</p></CardContent>
              </Card>
            ) : filteredEvents.length === 0 ? (
               <Card className="border-primary/10">
                 <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                        {selectedCommittee ? `No upcoming events found for ${selectedCommittee}.` : "No upcoming events scheduled right now."}
                    </p>
                 </CardContent>
               </Card>
            ) : (
              // --- Event Grid ---
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden border-primary/10 hover:shadow-lg transition-shadow flex flex-col">
                    <div className="aspect-video bg-muted overflow-hidden">
                       <img
                         src={`https://placehold.co/600x400/7ec4cf/FFFFFF?text=${encodeURIComponent(event.title)}`} // Teal placeholder
                         alt={event.title}
                         className="w-full h-full object-cover"
                       />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-2">{event.title}</h3>
                      </div>
                      {/* Show Organizer (Committee) Name */}
                      <Badge variant="secondary" className="w-fit text-xs">
                        {event.organizer?.name || 'Unknown Organizer'} {/* Add fallback */}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3 flex-grow">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{formatEventDates(event.event_datetime, event.end_datetime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{event.venue?.name || 'Unknown Venue'} ({event.venue?.location || ''})</span> {/* Add fallback */}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <IndianRupee className="w-4 h-4 text-primary" />
                         <span>
                             {event.cost === 0 ? 'Free Entry' : `₹ ${event.cost.toFixed(2)} per person`}
                         </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {/* --- Wrap button in Dialog and DialogTrigger --- */}
                      <Dialog open={selectedEvent?.id === event.id} onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            // --- Button now sets the selectedEvent to open the modal ---
                            onClick={() => setSelectedEvent(event)}
                          >
                            View Details
                          </Button>
                        </DialogTrigger>
                        {/* --- Dialog Content (Modal Body) --- */}
                        <DialogContent className="sm:max-w-[525px]">
                          <DialogHeader>
                            <DialogTitle className="text-2xl">{selectedEvent?.title}</DialogTitle>
                            <DialogDescription>
                                Organized by: <Badge variant="secondary">{selectedEvent?.organizer?.name || 'Unknown'}</Badge>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            {/* Event Details */}
                            <div className="flex items-center gap-2 text-sm "><Calendar className="w-4 h-4 text-primary" /><span>{selectedEvent ? formatEventDates(selectedEvent.event_datetime, selectedEvent.end_datetime) : 'N/A'}</span></div>
                            <div className="flex items-center gap-2 text-sm "><MapPin className="w-4 h-4 text-primary" /><span>{selectedEvent?.venue?.name || 'N/A'} ({selectedEvent?.venue?.location || 'N/A'})</span></div>
                            <div className="flex items-center gap-2 text-sm "><Users className="w-4 h-4 text-primary" /><span>Capacity: {selectedEvent?.capacity ?? 'N/A'}</span></div>
                            <div className="flex items-center gap-2 text-sm "><IndianRupee className="w-4 h-4 text-primary" /><span>{selectedEvent?.cost === 0 ? 'Free Entry' : `₹ ${selectedEvent?.cost?.toFixed(2) ?? 'N/A'} per person`}</span></div>
                            <div className="pt-2">
                                <h4 className="font-semibold mb-1">Description:</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEvent?.description || 'No description provided.'}</p>
                            </div>
                          </div>
                          <DialogFooter>
                              {/* Close Button */}
                              <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                  Close
                                </Button>
                              </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Committees Section (Static Data) */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">Explore College Committees</h2>
            <Card className="border-primary/10">
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {committeesData.map((committee, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger className="text-sm font-medium hover:text-primary">
                        {committee.category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {committee.items.map((item) => (
                            <button
                              key={item}
                              onClick={() => setSelectedCommittee(selectedCommittee === item ? null : item)}
                              className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                                selectedCommittee === item
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}