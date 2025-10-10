"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import RoomBrowser from "@/components/room/RoomBrowser"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/student/login')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    // Redirect owners to their dashboard
    if (user && (user.role === 'owner' || user.role === 'Owner')) {
      router.push('/owner/bookings')
    }
  }, [user, router])

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isStudent = user.role === 'student' || user.role === 'Student'

  // Redirect owners
  if (!isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to Owner Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.fullName || user.email}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Find your perfect accommodation near top universities
        </p>
      </div>

      {/* Room Browser Component */}
      <RoomBrowser />
    </div>
  )
}
