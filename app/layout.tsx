import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "FestFrenzy — College Event Portal",
  description: "Discover and register for college events with FestFrenzy",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}