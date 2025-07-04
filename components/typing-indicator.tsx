"use client"

import { useEffect, useState } from "react"

interface TypingIndicatorProps {
  isTyping: boolean
  userName?: string
  theme: "neobrutalist" | "liquid-glass"
}

export function TypingIndicator({ isTyping, userName, theme }: TypingIndicatorProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (!isTyping) {
      setDots("")
      return
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isTyping])

  if (!isTyping) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div
        className={`px-3 py-2 rounded-lg ${
          theme === "neobrutalist"
            ? "bg-gray-200 text-black border-2 border-gray-400"
            : "bg-white/20 text-white backdrop-blur-sm border border-white/20"
        }`}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm opacity-70">{userName || "Someone"} is typing</span>
          <span className="text-sm font-mono w-6">{dots}</span>
        </div>
      </div>
    </div>
  )
}
