"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, ArrowLeft, Loader2 } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { loginUser } from "@/lib/supabase"

export default function LoginPage() {
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneNumber = searchParams.get("phone")
  const { theme } = useTheme()

  useEffect(() => {
    if (!phoneNumber) {
      router.push("/")
    }
  }, [phoneNumber, router])

  const handleLogin = async () => {
    if (!verificationCode || !phoneNumber) return

    setIsLoading(true)
    setError("")

    try {
      // Simulate verification code check (in production, verify with backend)
      if (verificationCode !== "123456") {
        throw new Error("Invalid verification code. Use 123456 for demo.")
      }

      // Get device fingerprint
      const deviceFingerprint = await getDeviceFingerprint()

      const userData = await loginUser(phoneNumber, deviceFingerprint)

      // Store user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(userData))

      router.push("/chat")
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getDeviceFingerprint = async () => {
    try {
      // Create a more reliable device fingerprint
      const fingerprint = [
        navigator.userAgent || "unknown",
        navigator.language || "unknown",
        `${screen.width}x${screen.height}` || "unknown",
        new Date().getTimezoneOffset().toString() || "0",
        navigator.platform || "unknown",
        navigator.cookieEnabled ? "cookies-enabled" : "cookies-disabled",
      ].join("|")

      // Simple hash function that doesn't rely on canvas
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
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
      ? "min-h-screen bg-orange-300 p-4"
      : "min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-4"

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
              Welcome Back
            </CardTitle>
            <CardDescription className={theme === "neobrutalist" ? "text-gray-700" : "text-white/80"}>
              Enter the verification code sent to your phone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`p-4 rounded-lg ${theme === "neobrutalist" ? "bg-gray-100 border-2 border-black" : "bg-white/10 border border-white/20"}`}
            >
              <p className={`text-sm ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                <strong>Phone:</strong> {phoneNumber}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code" className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>
                Verification Code
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className={
                    theme === "neobrutalist"
                      ? "pl-10 border-2 border-black focus:border-black focus:ring-0 bg-white text-center text-lg tracking-widest"
                      : "pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 text-center text-lg tracking-widest"
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={verificationCode.length !== 6 || isLoading}
              className={
                theme === "neobrutalist"
                  ? "w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  : "w-full bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm font-semibold py-3"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push(`/register?phone=${encodeURIComponent(phoneNumber || "")}`)}
                className={
                  theme === "neobrutalist" ? "text-black hover:text-gray-600" : "text-white hover:text-white/80"
                }
              >
                Don't have an account? Sign up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
