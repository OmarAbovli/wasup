"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { subscribeToCallSignals, answerCall, endCall, sendCallSignal, initiateCall } from "@/lib/supabase"

interface VideoCallProps {
  isOpen: boolean
  onClose: () => void
  contact: {
    name: string
    profilePhoto?: string
    uniqueId: string
    id: string
  }
  isIncoming?: boolean
  callType: "voice" | "video"
  currentUser: {
    id: string
    uniqueId: string
    name: string
  }
  callId?: string
}

export function VideoCall({
  isOpen,
  onClose,
  contact,
  isIncoming = false,
  callType,
  currentUser,
  callId: initialCallId,
}: VideoCallProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice")
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting")
  const [callId, setCallId] = useState<string | null>(initialCallId || null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const callSubscriptionRef = useRef<any>(null)
  const callStartTimeRef = useRef<number>(Date.now())

  const { theme } = useTheme()

  useEffect(() => {
    if (isOpen) {
      initializeCall()
      setupCallSubscription()
    }

    return () => {
      cleanup()
    }
  }, [isOpen])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isConnected])

  const setupCallSubscription = () => {
    callSubscriptionRef.current = subscribeToCallSignals(currentUser.id, (payload) => {
      handleCallSignal(payload.payload)
    })
  }

  const initializeCall = async () => {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: callType === "video",
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      }

      const peerConnection = new RTCPeerConnection(configuration)
      peerConnectionRef.current = peerConnection

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
        setIsConnected(true)
        setConnectionState("connected")
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate && callId) {
          await sendCallSignal(contact.id, {
            type: "ice-candidate",
            candidate: event.candidate,
            callId,
          })
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.log("Connection state:", state)

        if (state === "connected") {
          setIsConnected(true)
          setConnectionState("connected")
        } else if (state === "failed" || state === "disconnected") {
          setConnectionState("failed")
          setTimeout(() => handleEndCall(), 3000)
        }
      }

      if (!isIncoming) {
        // Create offer for outgoing call
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        // Initiate call
        const newCallId = await initiateCall(currentUser.uniqueId, contact.uniqueId, callType, offer)
        setCallId(newCallId)
      }
    } catch (error) {
      console.error("Failed to initialize call:", error)
      setConnectionState("failed")
      setTimeout(() => onClose(), 2000)
    }
  }

  const handleCallSignal = async (signal: any) => {
    if (!peerConnectionRef.current) return

    try {
      switch (signal.type) {
        case "offer":
          if (isIncoming && signal.offer) {
            await peerConnectionRef.current.setRemoteDescription(signal.offer)
            const answer = await peerConnectionRef.current.createAnswer()
            await peerConnectionRef.current.setLocalDescription(answer)

            if (signal.callId) {
              await answerCall(signal.callId, answer)
              setCallId(signal.callId)
            }
          }
          break

        case "answer":
          if (!isIncoming && signal.answer) {
            await peerConnectionRef.current.setRemoteDescription(signal.answer)
          }
          break

        case "ice-candidate":
          if (signal.candidate) {
            await peerConnectionRef.current.addIceCandidate(signal.candidate)
          }
          break

        case "call_ended":
          handleEndCall()
          break
      }
    } catch (error) {
      console.error("Error handling call signal:", error)
    }
  }

  const handleAnswer = async () => {
    callStartTimeRef.current = Date.now()
    // The WebRTC connection is already being established
  }

  const handleEndCall = async () => {
    if (callId) {
      await endCall(callId, callDuration)
    }
    cleanup()
    onClose()
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (callSubscriptionRef.current) {
      callSubscriptionRef.current.unsubscribe()
      callSubscriptionRef.current = null
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isOpen) return null

  const overlayClass =
    theme === "neobrutalist"
      ? "fixed inset-0 bg-red-400 z-50 flex items-center justify-center p-4"
      : "fixed inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"

  const cardClass =
    theme === "neobrutalist"
      ? "w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
      : "w-full max-w-md backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl overflow-hidden"

  return (
    <div className={overlayClass}>
      <Card className={cardClass}>
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24 mx-auto ring-4 ring-white/20">
                  <AvatarImage src={contact.profilePhoto || "/placeholder.svg"} alt={contact.name} />
                  <AvatarFallback
                    className={
                      theme === "neobrutalist" ? "bg-black text-white text-2xl" : "bg-white/20 text-white text-2xl"
                    }
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${theme === "neobrutalist" ? "text-black" : "text-white"}`}>
                  {contact.name}
                </h3>
                <p className={`text-sm ${theme === "neobrutalist" ? "text-gray-600" : "text-white/70"}`}>
                  {isIncoming && !isConnected
                    ? `Incoming ${callType} call...`
                    : connectionState === "connecting"
                      ? "Connecting..."
                      : connectionState === "connected"
                        ? formatDuration(callDuration)
                        : "Connection failed"}
                </p>
              </div>
            </div>

            {/* Video Area */}
            {callType === "video" && isConnected && (
              <div className="relative rounded-2xl overflow-hidden">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-48 bg-gray-800 object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-2 right-2 w-20 h-16 bg-gray-600 rounded-lg border-2 border-white object-cover"
                />
              </div>
            )}

            {/* Call Controls */}
            <div className="flex justify-center space-x-4">
              {isIncoming && !isConnected ? (
                <>
                  <Button
                    onClick={handleAnswer}
                    size="lg"
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 border-2 border-black text-white"
                        : "rounded-full w-16 h-16 bg-green-500/80 hover:bg-green-600/80 text-white backdrop-blur-sm border border-white/20"
                    }
                  >
                    <Phone className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={handleEndCall}
                    size="lg"
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 border-2 border-black text-white"
                        : "rounded-full w-16 h-16 bg-red-500/80 hover:bg-red-600/80 text-white backdrop-blur-sm border border-white/20"
                    }
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={toggleMute}
                    size="lg"
                    variant={isMuted ? "destructive" : "secondary"}
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-12 h-12 border-2 border-black"
                        : "rounded-full w-12 h-12 backdrop-blur-sm border border-white/20"
                    }
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {callType === "video" && (
                    <Button
                      onClick={toggleVideo}
                      size="lg"
                      variant={isVideoOff ? "destructive" : "secondary"}
                      className={
                        theme === "neobrutalist"
                          ? "rounded-full w-12 h-12 border-2 border-black"
                          : "rounded-full w-12 h-12 backdrop-blur-sm border border-white/20"
                      }
                    >
                      {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>
                  )}

                  <Button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    size="lg"
                    variant={isSpeakerOn ? "default" : "secondary"}
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-12 h-12 border-2 border-black"
                        : "rounded-full w-12 h-12 backdrop-blur-sm border border-white/20"
                    }
                  >
                    {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>

                  <Button
                    onClick={handleEndCall}
                    size="lg"
                    className={
                      theme === "neobrutalist"
                        ? "rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 border-2 border-black text-white"
                        : "rounded-full w-16 h-16 bg-red-500/80 hover:bg-red-600/80 text-white backdrop-blur-sm border border-white/20"
                    }
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
