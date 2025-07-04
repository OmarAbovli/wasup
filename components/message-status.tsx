"use client"

import { Check, CheckCheck, Clock } from "lucide-react"

interface MessageStatusProps {
  status: "sending" | "sent" | "delivered" | "read"
  theme: "neobrutalist" | "liquid-glass"
}

export function MessageStatus({ status, theme }: MessageStatusProps) {
  const iconClass = `h-3 w-3 ${theme === "neobrutalist" ? "text-gray-600" : "text-white/60"}`

  switch (status) {
    case "sending":
      return <Clock className={`${iconClass} animate-spin`} />
    case "sent":
      return <Check className={iconClass} />
    case "delivered":
      return <CheckCheck className={iconClass} />
    case "read":
      return <CheckCheck className={`h-3 w-3 text-blue-500`} />
    default:
      return null
  }
}
