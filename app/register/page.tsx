"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { User, Hash, ArrowLeft } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { createUser } from "@/lib/supabase"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [uniqueId, setUniqueId] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneNumber = searchParams.get("phone")
  const { theme } = useTheme()

  useEffect(() => {
    // Generate unique ID
    const id = Math.floor(100000 + Math.random() * 900000).toString()
    setUniqueId(id)
  }, [])

  const handleRegister = async () => {
    if (!name || !phoneNumber) return

    setIsLoading(true)

    try {
      // Get device fingerprint
      const deviceFingerprint = await getDeviceFingerprint()

      const userData = {
        name,
        phone: phoneNumber,
        uniqueId,
        deviceFingerprint,
      }

      await createUser(userData)

      // Store user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(userData))

      router.push("/chat")
    } catch (error) {
      console.error("Registration failed:", error)
      alert("Registration failed. This device may already have an account.")
    } finally {
      setIsLoading(false)
    }
  }

  const getDeviceFingerprint = async () => {
    try {
      // Create a more reliable device fingerprint without canvas
      const fingerprint = [
        navigator.userAgent || "unknown",
        navigator.language || "unknown",
        `${screen.width}x${screen.height}` || "unknown",
        new Date().getTimezoneOffset().toString() || "0",
        navigator.platform || "unknown",
        navigator.cookieEnabled ? "cookies-enabled" : "cookies-disabled",
      ].join("|")

      // Simple hash function
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
      }

      return Math.abs(hash).toString()
    } catch (error) {
      console.error("Error generating device fingerprint:", error)
      // Fallback fingerprint
      return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  const containerClass =
    theme === "neobrutalist"
      ? "min-h-screen bg-green-300 p-4"
      : "min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4"

  const cardClass =
    theme === "neobrutalist"
      ? "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
      : "backdrop-blur-lg bg-white/20 border border-white/30 shadow-2xl"

  return (
    <div className={containerClass}>
      <div className="container mx-auto max-w-md">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className={`mb-4 ${theme === "neobrutalist" ? "text-black hover:bg-black hover:text-white" : "text-white hover:bg-white/20"}`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className={`text-2xl font-bold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
              Create Your Profile
            </CardTitle>
            <CardDescription className={theme === "neobrutalist" ? "text-gray-700" : "text-white/80"}>
              Choose your display name and get your unique ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>
                Display Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={
                    theme === "neobrutalist"
                      ? "pl-10 border-2 border-black focus:border-black focus:ring-0 bg-white"
                      : "pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>Your Unique ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  value={uniqueId}
                  readOnly
                  className={
                    theme === "neobrutalist"
                      ? "pl-10 border-2 border-black bg-gray-100 text-black"
                      : "pl-10 bg-white/10 border-white/30 text-white"
                  }
                />
              </div>
              <p className={`text-sm ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                Others can find you using this unique ID
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${theme === "neobrutalist" ? "bg-gray-100 border-2 border-black" : "bg-white/10 border border-white/20"}`}
            >
              <p className={`text-sm ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                <strong>Phone:</strong> {phoneNumber}
              </p>
            </div>

            <Button
              onClick={handleRegister}
              disabled={!name || isLoading}
              className={
                theme === "neobrutalist"
                  ? "w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  : "w-full bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm font-semibold py-3"
              }
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
