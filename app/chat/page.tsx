"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MessageCircle,
  Settings,
  Send,
  Palette,
  Phone,
  Video,
  UserPlus,
  Smile,
  Paperclip,
  MoreVertical,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import {
  searchUsers,
  getChats,
  sendMessage,
  getOrCreateChat,
  getMessages,
  subscribeToMessages,
  updateUserOnlineStatus,
  subscribeToUserStatus,
  sendTypingIndicator,
  subscribeToTyping,
  subscribeToCallSignals,
} from "@/lib/supabase"
import { VideoCall } from "@/components/video-call"
import { TypingIndicator } from "@/components/typing-indicator"
import { MessageStatus } from "@/components/message-status"

interface ChatUser {
  id: string
  name: string
  phone: string
  uniqueId: string
  online?: boolean
  profilePhoto?: string
  lastSeen?: string
}

interface Chat {
  id: string
  user: ChatUser
  lastMessage: string
  lastMessageSender?: string
  timestamp: string
  unread: number
}

interface Message {
  id: string
  text: string
  sender: string
  senderName: string
  timestamp: string
  messageType: string
  isOwn: boolean
  status?: "sending" | "sent" | "delivered" | "read"
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [activeTab, setActiveTab] = useState<"chats" | "search">("chats")
  const [isLoading, setIsLoading] = useState(false)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video">("voice")
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState<{ [key: string]: boolean }>({})
  const [incomingCall, setIncomingCall] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageSubscriptionRef = useRef<any>(null)
  const typingSubscriptionRef = useRef<any>(null)
  const callSubscriptionRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    const user = JSON.parse(userData)
    setCurrentUser(user)
    loadChats(user.id)
    updateUserOnlineStatus(user.id, true)

    // Subscribe to user status changes
    const statusSubscription = subscribeToUserStatus((payload) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.user.id === payload.new.id
            ? {
                ...chat,
                user: {
                  ...chat.user,
                  online: payload.new.is_online,
                  lastSeen: payload.new.last_seen,
                },
              }
            : chat,
        ),
      )
    })

    // Subscribe to incoming calls
    callSubscriptionRef.current = subscribeToCallSignals(user.id, (payload) => {
      if (payload.event === "incoming_call") {
        setIncomingCall(payload.payload)
        setShowVideoCall(true)
      }
    })

    // Cleanup on unmount
    return () => {
      updateUserOnlineStatus(user.id, false)
      statusSubscription.unsubscribe()
      if (callSubscriptionRef.current) {
        callSubscriptionRef.current.unsubscribe()
      }
    }
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (selectedChat && currentUser) {
      loadMessages(selectedChat.id)

      // Subscribe to new messages
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe()
      }

      messageSubscriptionRef.current = subscribeToMessages(selectedChat.id, (payload) => {
        const newMessage = {
          id: payload.new.id,
          text: payload.new.content,
          sender: payload.new.sender_id,
          senderName: payload.new.users?.name || "Unknown",
          timestamp: payload.new.created_at,
          messageType: payload.new.message_type,
          isOwn: payload.new.sender_id === currentUser.id,
          status: "delivered" as const,
        }

        setMessages((prev) => {
          // Remove any temporary message with same content
          const filtered = prev.filter(
            (msg) => !(msg.text === newMessage.text && msg.isOwn && msg.id.startsWith("temp_")),
          )
          return [...filtered, newMessage]
        })

        // Update chat list with new message
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  lastMessage: payload.new.content,
                  lastMessageSender: payload.new.sender_id,
                  timestamp: payload.new.created_at,
                }
              : chat,
          ),
        )
      })

      // Subscribe to typing indicators
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe()
      }

      typingSubscriptionRef.current = subscribeToTyping(selectedChat.id, (payload) => {
        const { userId, isTyping: typing } = payload.payload
        if (userId !== currentUser.id) {
          setOtherUserTyping((prev) => ({
            ...prev,
            [userId]: typing,
          }))
        }
      })
    }

    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe()
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe()
      }
    }
  }, [selectedChat, currentUser])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadChats = async (userId: string) => {
    try {
      const chatData = await getChats(userId)
      setChats(chatData)
    } catch (error) {
      console.error("Failed to load chats:", error)
    }
  }

  const loadMessages = async (chatId: string) => {
    try {
      const messageData = await getMessages(chatId)
      const messagesWithOwnership = messageData.map((msg) => ({
        ...msg,
        isOwn: msg.sender === currentUser?.id,
        status: "delivered" as const,
      }))
      setMessages(messagesWithOwnership)
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      const results = await searchUsers(searchQuery, currentUser.id)
      setSearchResults(results)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const startChat = async (user: ChatUser) => {
    if (!currentUser) return

    try {
      const chatId = await getOrCreateChat(currentUser.id, user.id)

      const newChat: Chat = {
        id: chatId,
        user,
        lastMessage: "",
        timestamp: new Date().toISOString(),
        unread: 0,
      }

      setSelectedChat(newChat)

      // Add to chats if not already there
      setChats((prev) => {
        const exists = prev.find((chat) => chat.id === chatId)
        if (!exists) {
          return [newChat, ...prev]
        }
        return prev
      })

      setActiveTab("chats")
    } catch (error) {
      console.error("Failed to start chat:", error)
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (!selectedChat || !currentUser) return

    // Send typing indicator
    const isCurrentlyTyping = value.length > 0
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping)
      sendTypingIndicator(selectedChat.id, currentUser.id, isCurrentlyTyping)
    }

    // Clear typing after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        sendTypingIndicator(selectedChat.id, currentUser.id, false)
      }, 3000)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUser) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setIsTyping(false)
    sendTypingIndicator(selectedChat.id, currentUser.id, false)

    // Add optimistic message
    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`,
      text: messageText,
      sender: currentUser.id,
      senderName: currentUser.name,
      timestamp: new Date().toISOString(),
      messageType: "text",
      isOwn: true,
      status: "sending",
    }

    setMessages((prev) => [...prev, optimisticMessage])

    try {
      await sendMessage(selectedChat.id, currentUser.id, messageText)

      // Update optimistic message status
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? { ...msg, status: "sent" as const } : msg)),
      )
    } catch (error) {
      console.error("Failed to send message:", error)
      // Remove failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
      setNewMessage(messageText) // Restore message on error
    }
  }

  const startVoiceCall = () => {
    setCallType("voice")
    setShowVideoCall(true)
  }

  const startVideoCall = () => {
    setCallType("video")
    setShowVideoCall(true)
  }

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const containerClass =
    theme === "neobrutalist"
      ? "min-h-screen bg-blue-300"
      : "min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden"

  const cardClass =
    theme === "neobrutalist"
      ? "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white h-full"
      : "backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl h-full rounded-3xl overflow-hidden"

  const sidebarClass = theme === "neobrutalist" ? "border-r-4 border-black" : "border-r border-white/20"

  if (!currentUser) return null

  return (
    <div className={containerClass}>
      {/* Liquid Glass Background Effects */}
      {theme === "liquid-glass" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-600/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-purple-600/30 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-2xl animate-pulse"></div>
        </>
      )}

      <div className="container mx-auto max-w-6xl p-4 h-screen relative z-10">
        <div className="flex h-full gap-4">
          {/* Sidebar */}
          <div className={`w-80 ${cardClass} ${sidebarClass}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-xl font-bold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                  wasup
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/profile")}
                    className={
                      theme === "neobrutalist"
                        ? "text-black hover:bg-black hover:text-white"
                        : "text-white hover:bg-white/20 backdrop-blur-sm"
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/create-group")}
                    className={
                      theme === "neobrutalist"
                        ? "text-black hover:bg-black hover:text-white"
                        : "text-white hover:bg-white/20 backdrop-blur-sm"
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className={
                      theme === "neobrutalist"
                        ? "text-black hover:bg-black hover:text-white"
                        : "text-white hover:bg-white/20 backdrop-blur-sm"
                    }
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      theme === "neobrutalist"
                        ? "text-black hover:bg-black hover:text-white"
                        : "text-white hover:bg-white/20 backdrop-blur-sm"
                    }
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                className={`p-3 rounded-lg ${
                  theme === "neobrutalist"
                    ? "bg-gray-100 border-2 border-black"
                    : "bg-white/10 border border-white/20 backdrop-blur-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={currentUser.profilePhoto || "/placeholder.svg"} alt={currentUser.name} />
                      <AvatarFallback className="text-xs bg-white text-black">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                      {currentUser.name}
                    </p>
                    <p className={`text-xs ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                      ID: {currentUser.uniqueId}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              <div className="flex mb-4">
                <Button
                  variant={activeTab === "chats" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("chats")}
                  className={
                    theme === "neobrutalist"
                      ? activeTab === "chats"
                        ? "bg-black text-white border-2 border-black"
                        : "text-black hover:bg-black hover:text-white border-2 border-black bg-white"
                      : activeTab === "chats"
                        ? "bg-white/30 text-white backdrop-blur-sm"
                        : "text-white hover:bg-white/20 backdrop-blur-sm"
                  }
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chats
                </Button>
                <Button
                  variant={activeTab === "search" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("search")}
                  className={
                    theme === "neobrutalist"
                      ? activeTab === "search"
                        ? "bg-black text-white border-2 border-black ml-2"
                        : "text-black hover:bg-black hover:text-white border-2 border-black bg-white ml-2"
                      : activeTab === "search"
                        ? "bg-white/30 text-white ml-2 backdrop-blur-sm"
                        : "text-white hover:bg-white/20 ml-2 backdrop-blur-sm"
                  }
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>

              {activeTab === "search" && (
                <div className="space-y-4">
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
                      disabled={isLoading}
                      className={
                        theme === "neobrutalist"
                          ? "bg-black text-white border-2 border-black hover:bg-white hover:text-black"
                          : "bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm"
                      }
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.uniqueId}
                        onClick={() => startChat(user)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          theme === "neobrutalist"
                            ? "bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                            : "bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm hover:backdrop-blur-md"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={user.profilePhoto || "/placeholder.svg"} alt={user.name} />
                              <AvatarFallback
                                className={theme === "neobrutalist" ? "bg-black text-white" : "bg-white/20 text-white"}
                              >
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.online && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                              {user.name}
                            </p>
                            <p className={`text-sm ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                              ID: {user.uniqueId} • {user.online ? "Online" : formatLastSeen(user.lastSeen || "")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "chats" && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedChat?.id === chat.id
                          ? theme === "neobrutalist"
                            ? "bg-black text-white"
                            : "bg-white/30 backdrop-blur-md"
                          : theme === "neobrutalist"
                            ? "bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                            : "bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm hover:backdrop-blur-md"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={chat.user.profilePhoto || "/placeholder.svg"} alt={chat.user.name} />
                            <AvatarFallback
                              className={
                                selectedChat?.id === chat.id
                                  ? "bg-white text-black"
                                  : theme === "neobrutalist"
                                    ? "bg-black text-white"
                                    : "bg-white/20 text-white"
                              }
                            >
                              {chat.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {chat.user.online && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold truncate">{chat.user.name}</p>
                            <div className="flex items-center gap-1">
                              {chat.unread > 0 && (
                                <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                                  {chat.unread > 99 ? "99+" : chat.unread}
                                </Badge>
                              )}
                              <span className="text-xs opacity-60">
                                {new Date(chat.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {chat.lastMessageSender === currentUser.id && (
                              <MessageStatus status="delivered" theme={theme} />
                            )}
                            <p className="text-sm opacity-70 truncate">{chat.lastMessage || "Start a conversation"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 ${cardClass}`}>
            {selectedChat ? (
              <div className="flex flex-col h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="ring-2 ring-white/20">
                          <AvatarImage
                            src={selectedChat.user.profilePhoto || "/placeholder.svg"}
                            alt={selectedChat.user.name}
                          />
                          <AvatarFallback
                            className={theme === "neobrutalist" ? "bg-black text-white" : "bg-white/20 text-white"}
                          >
                            {selectedChat.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {selectedChat.user.online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      <div>
                        <CardTitle className={`text-lg ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                          {selectedChat.user.name}
                        </CardTitle>
                        <p className={`text-sm ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                          {selectedChat.user.online
                            ? "Online"
                            : `Last seen ${formatLastSeen(selectedChat.user.lastSeen || "")}`}{" "}
                          • ID: {selectedChat.user.uniqueId}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={startVoiceCall}
                        className={
                          theme === "neobrutalist"
                            ? "text-black hover:bg-black hover:text-white"
                            : "text-white hover:bg-white/20 backdrop-blur-sm"
                        }
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={startVideoCall}
                        className={
                          theme === "neobrutalist"
                            ? "text-black hover:bg-black hover:text-white"
                            : "text-white hover:bg-white/20 backdrop-blur-sm"
                        }
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          theme === "neobrutalist"
                            ? "text-black hover:bg-black hover:text-white"
                            : "text-white hover:bg-white/20 backdrop-blur-sm"
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-2">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative group ${
                            message.isOwn
                              ? theme === "neobrutalist"
                                ? "bg-black text-white border-2 border-black"
                                : "bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white backdrop-blur-sm"
                              : theme === "neobrutalist"
                                ? "bg-gray-200 text-black border-2 border-gray-400"
                                : "bg-white/20 text-white backdrop-blur-sm border border-white/20"
                          }`}
                        >
                          <p className="break-words">{message.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className="text-xs opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {message.isOwn && message.status && <MessageStatus status={message.status} theme={theme} />}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Typing Indicator */}
                    {Object.values(otherUserTyping).some(Boolean) && (
                      <TypingIndicator isTyping={true} userName={selectedChat.user.name} theme={theme} />
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2 items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        theme === "neobrutalist"
                          ? "text-black hover:bg-black hover:text-white"
                          : "text-white hover:bg-white/20 backdrop-blur-sm"
                      }
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className={
                          theme === "neobrutalist"
                            ? "border-2 border-black focus:border-black focus:ring-0 bg-white pr-12"
                            : "bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 backdrop-blur-sm pr-12"
                        }
                      />
                      <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={
                        theme === "neobrutalist"
                          ? "bg-black text-white border-2 border-black hover:bg-white hover:text-black disabled:opacity-50"
                          : "bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white border border-white/30 hover:from-blue-600/80 hover:to-purple-700/80 backdrop-blur-sm disabled:opacity-50"
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle
                    className={`mx-auto mb-4 ${theme === "neobrutalist" ? "text-black" : "text-white/60"}`}
                    size={64}
                  />
                  <h3 className={`text-xl font-bold mb-2 ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                    Select a chat to start messaging
                  </h3>
                  <p className={`${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                    Search for users or select from your chat list
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Call Component */}
      {showVideoCall && (
        <VideoCall
          isOpen={showVideoCall}
          onClose={() => {
            setShowVideoCall(false)
            setIncomingCall(null)
          }}
          contact={
            incomingCall
              ? {
                  name: "Incoming Call",
                  uniqueId: incomingCall.callerId,
                  id: incomingCall.callerId,
                }
              : selectedChat
                ? {
                    name: selectedChat.user.name,
                    profilePhoto: selectedChat.user.profilePhoto,
                    uniqueId: selectedChat.user.uniqueId,
                    id: selectedChat.user.id,
                  }
                : { name: "", uniqueId: "", id: "" }
          }
          callType={incomingCall ? incomingCall.callType : callType}
          currentUser={{
            id: currentUser.id,
            uniqueId: currentUser.uniqueId,
            name: currentUser.name,
          }}
          isIncoming={!!incomingCall}
          callId={incomingCall?.callId}
        />
      )}
    </div>
  )
}
