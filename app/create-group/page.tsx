"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Search, Loader2 } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { searchUsers, createGroupChat } from "@/lib/supabase"

interface User {
  id: string
  name: string
  phone: string
  uniqueId: string
  profilePhoto?: string
}

export default function CreateGroupPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    try {
      const user = JSON.parse(userData)
      if (!user.id || !user.uniqueId) {
        console.error("Invalid user data:", user)
        router.push("/")
        return
      }
      setCurrentUser(user)
    } catch (error) {
      console.error("Failed to parse user data:", error)
      router.push("/")
    }
  }, [router])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError("")
    try {
      const results = await searchUsers(searchQuery, currentUser.id)
      setSearchResults(results.filter((user) => user.uniqueId !== currentUser?.uniqueId))
    } catch (error: any) {
      console.error("Search failed:", error)
      setError(error.message || "Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.uniqueId === user.uniqueId)
      if (isSelected) {
        return prev.filter((u) => u.uniqueId !== user.uniqueId)
      } else {
        return [...prev, user]
      }
    })
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required")
      return
    }

    if (selectedUsers.length < 2) {
      setError("You must select at least 2 members")
      return
    }

    if (!currentUser) {
      setError("User session expired. Please login again.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Ensure all users have required fields
      const allMembers = [currentUser, ...selectedUsers].map((user) => ({
        id: user.id,
        uniqueId: user.uniqueId,
        name: user.name,
      }))

      const groupData = await createGroupChat({
        name: groupName.trim(),
        members: allMembers,
        createdBy: currentUser.uniqueId, // Pass uniqueId for created_by (VARCHAR(10))
      })

      router.push(`/chat?group=${groupData.id}`)
    } catch (error: any) {
      console.error("Group creation failed:", error)
      setError(error.message || "Failed to create group")
    } finally {
      setIsLoading(false)
    }
  }

  const containerClass =
    theme === "neobrutalist"
      ? "min-h-screen bg-purple-300 p-4"
      : "min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-4 relative overflow-hidden"

  const cardClass =
    theme === "neobrutalist"
      ? "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
      : "backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl overflow-hidden"

  if (!currentUser) {
    return (
      <div className={containerClass}>
        <div className="container mx-auto max-w-md">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className={theme === "neobrutalist" ? "text-black" : "text-white"}>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Liquid Glass Background Effects */}
      {theme === "liquid-glass" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-indigo-600/20 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-purple-600/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-violet-600/30 rounded-full blur-3xl animate-float-delayed"></div>
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
              Create Group Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="groupName" className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>
                Group Name
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="groupName"
                  type="text"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={
                    theme === "neobrutalist"
                      ? "pl-10 border-2 border-black focus:border-black focus:ring-0 bg-white"
                      : "pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 backdrop-blur-sm"
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className={theme === "neobrutalist" ? "text-black font-bold" : "text-white"}>Add Members</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className={
                    theme === "neobrutalist"
                      ? "border-2 border-black focus:border-black focus:ring-0 bg-white"
                      : "bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 backdrop-blur-sm"
                  }
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={
                    theme === "neobrutalist"
                      ? "bg-black text-white border-2 border-black hover:bg-white hover:text-black"
                      : "bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm"
                  }
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-sm font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                    Selected Members ({selectedUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.uniqueId}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                          theme === "neobrutalist"
                            ? "bg-black text-white border-2 border-black"
                            : "bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                        }`}
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.profilePhoto || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback className="text-xs bg-white text-black">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.uniqueId}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      theme === "neobrutalist"
                        ? "bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                        : "bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm hover:backdrop-blur-md"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedUsers.some((u) => u.uniqueId === user.uniqueId)}
                        onCheckedChange={() => toggleUserSelection(user)}
                        className={theme === "neobrutalist" ? "border-2 border-black" : "border-white/30"}
                      />
                      <Avatar>
                        <AvatarImage src={user.profilePhoto || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback
                          className={theme === "neobrutalist" ? "bg-black text-white" : "bg-white/20 text-white"}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className={`font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                          {user.name}
                        </p>
                        <p className={`text-sm ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                          ID: {user.uniqueId}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length < 2 || isLoading}
              className={
                theme === "neobrutalist"
                  ? "w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                  : "w-full bg-gradient-to-r from-violet-500/80 to-purple-600/80 text-white border border-white/30 hover:from-violet-600/80 hover:to-purple-700/80 backdrop-blur-sm font-semibold py-3 disabled:opacity-50"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Group...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Group ({selectedUsers.length + 1} members)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
