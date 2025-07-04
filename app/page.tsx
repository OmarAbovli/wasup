"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Smartphone, MessageCircle, Users, Hash } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { theme } = useTheme()

  const handleGetStarted = async () => {
    if (!phoneNumber) return

    setIsLoading(true)
    // Simulate phone verification
    setTimeout(() => {
      router.push(`/register?phone=${encodeURIComponent(phoneNumber)}`)
    }, 1000)
  }

  const containerClass =
    theme === "neobrutalist"
      ? "min-h-screen bg-yellow-300 p-4"
      : "min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4"

  const cardClass =
    theme === "neobrutalist"
      ? "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
      : "backdrop-blur-lg bg-white/20 border border-white/30 shadow-2xl"

  return (
    <div className={containerClass}>
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8 pt-16">
          <div
            className={`inline-flex items-center gap-2 mb-4 ${theme === "neobrutalist" ? "text-black" : "text-white"}`}
          >
            <MessageCircle size={40} />
            <h1 className="text-4xl font-black">wasup</h1>
          </div>
          <p className={`text-lg ${theme === "neobrutalist" ? "text-black" : "text-white/90"}`}>
            Connect with friends instantly
          </p>
        </div>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className={`text-2xl font-bold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
              Get Started
            </CardTitle>
            <CardDescription className={theme === "neobrutalist" ? "text-gray-700" : "text-white/80"}>
              Enter your phone number to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>
                Phone Number
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={
                    theme === "neobrutalist"
                      ? "pl-10 border-2 border-black focus:border-black focus:ring-0 bg-white"
                      : "pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGetStarted}
                disabled={!phoneNumber || isLoading}
                className={
                  theme === "neobrutalist"
                    ? "flex-1 bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                    : "flex-1 bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm font-semibold py-3"
                }
              >
                {isLoading ? "Verifying..." : "Continue"}
              </Button>
              <Button
                onClick={() => router.push(`/login?phone=${encodeURIComponent(phoneNumber)}`)}
                disabled={!phoneNumber}
                variant="outline"
                className={
                  theme === "neobrutalist"
                    ? "flex-1 bg-white text-black border-2 border-black hover:bg-black hover:text-white font-bold py-3"
                    : "flex-1 bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm font-semibold py-3"
                }
              >
                Sign In
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <Users className={`mx-auto mb-2 ${theme === "neobrutalist" ? "text-black" : "text-white"}`} size={24} />
                <p className={`text-sm font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                  Find Friends
                </p>
              </div>
              <div className="text-center">
                <Hash className={`mx-auto mb-2 ${theme === "neobrutalist" ? "text-black" : "text-white"}`} size={24} />
                <p className={`text-sm font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                  Unique ID
                </p>
              </div>
              <div className="text-center">
                <MessageCircle
                  className={`mx-auto mb-2 ${theme === "neobrutalist" ? "text-black" : "text-white"}`}
                  size={24}
                />
                <p className={`text-sm font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                  Chat Instantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
