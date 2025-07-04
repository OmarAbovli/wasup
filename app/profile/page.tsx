"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Camera, Loader2, Save, Trash2 } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { updateUserProfile, uploadProfilePhoto } from "@/lib/supabase"

interface User {
  id: string
  name: string
  phone: string
  uniqueId: string
  profilePhoto?: string
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    const user = JSON.parse(userData)
    setCurrentUser(user)
    setName(user.name)
    setProfilePhoto(user.profilePhoto || null)
  }, [router])

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      const uploadedUrl = await uploadProfilePhoto(file, currentUser.uniqueId)
      setProfilePhoto(uploadedUrl)
      setSuccess("Photo uploaded successfully!")
    } catch (error: any) {
      setError(error.message || "Failed to upload photo")
      setProfilePhoto(currentUser.profilePhoto || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setProfilePhoto(null)
  }

  const handleSaveProfile = async () => {
    if (!currentUser || !name.trim()) return

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const updatedUser = await updateUserProfile(currentUser.id, {
        name: name.trim(),
        profilePhoto,
      })

      const newUserData = {
        ...currentUser,
        name: updatedUser.name,
        profilePhoto: updatedUser.profilePhoto,
      }
      localStorage.setItem("currentUser", JSON.stringify(newUserData))
      setCurrentUser(newUserData)
      setSuccess("Profile updated successfully!")
    } catch (error: any) {
      setError(error.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const containerClass =
    theme === "neobrutalist"
      ? "min-h-screen bg-pink-300 p-4"
      : "min-h-screen bg-gradient-to-br from-rose-900 via-pink-900 to-purple-900 p-4 relative overflow-hidden"

  const cardClass =
    theme === "neobrutalist"
      ? "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
      : "backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl overflow-hidden"

  if (!currentUser) return null

  return (
    <div className={containerClass}>
      {/* Liquid Glass Background Effects */}
      {theme === "liquid-glass" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 via-pink-600/20 to-purple-600/20 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-rose-600/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-600/30 rounded-full blur-3xl animate-float-delayed"></div>
        </>
      )}

      <div className="container mx-auto max-w-md relative z-10">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className={`mb-4 ${
            theme === "neobrutalist"
              ? "text-black hover:bg-black hover:text-white"
              : "text-white hover:bg-white/20 backdrop-blur-sm"
          }`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className={`text-2xl font-bold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white/20">
                  <AvatarImage src={profilePhoto || undefined} alt={name} />
                  <AvatarFallback
                    className={
                      theme === "neobrutalist" ? "bg-black text-white text-2xl" : "bg-white/20 text-white text-2xl"
                    }
                  >
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-8 h-8 p-0 bg-black text-white border-2 border-black hover:bg-white hover:text-black"
                        : "rounded-full w-8 h-8 p-0 bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm"
                    }
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                  {profilePhoto && (
                    <Button
                      size="sm"
                      onClick={handleRemovePhoto}
                      variant="destructive"
                      className="rounded-full w-8 h-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>
                Display Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={
                  theme === "neobrutalist"
                    ? "border-2 border-black focus:border-black focus:ring-0 bg-white"
                    : "bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 backdrop-blur-sm"
                }
              />
            </div>

            <div
              className={`p-4 rounded-lg ${
                theme === "neobrutalist"
                  ? "bg-gray-100 border-2 border-black"
                  : "bg-white/10 border border-white/20 backdrop-blur-sm"
              }`}
            >
              <p className={`text-sm ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                <strong>Phone:</strong> {currentUser.phone}
              </p>
              <p className={`text-sm ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                <strong>Unique ID:</strong> {currentUser.uniqueId}
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={!name.trim() || isLoading}
              className={
                theme === "neobrutalist"
                  ? "w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                  : "w-full bg-gradient-to-r from-pink-500/80 to-purple-600/80 text-white border border-white/30 hover:from-pink-600/80 hover:to-purple-700/80 backdrop-blur-sm font-semibold py-3 disabled:opacity-50"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
