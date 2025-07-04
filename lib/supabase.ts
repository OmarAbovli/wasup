import { createClient } from "@supabase/supabase-js"
import { put } from "@vercel/blob"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

interface UserData {
  name: string
  phone: string
  uniqueId: string
  deviceFingerprint: string
}

export async function createUser(userData: UserData) {
  // Check if device already has an account
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("device_fingerprint", userData.deviceFingerprint)
    .single()

  if (existingUser) {
    throw new Error("Device already has an account")
  }

  // Check if phone already exists
  const { data: existingPhone } = await supabase.from("users").select("*").eq("phone", userData.phone).single()

  if (existingPhone) {
    throw new Error("Phone number already registered")
  }

  // Check if unique ID already exists and generate new one if needed
  let uniqueId = userData.uniqueId
  let attempts = 0
  while (attempts < 10) {
    const { data: existingId } = await supabase.from("users").select("*").eq("unique_id", uniqueId).single()
    if (!existingId) break
    uniqueId = Math.floor(100000 + Math.random() * 900000).toString()
    attempts++
  }

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        name: userData.name,
        phone: userData.phone,
        unique_id: uniqueId,
        device_fingerprint: userData.deviceFingerprint,
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ])
    .select()

  if (error) throw error
  return {
    id: data[0].id,
    name: data[0].name,
    phone: data[0].phone,
    uniqueId: data[0].unique_id,
    profilePhoto: data[0].profile_photo,
  }
}

export async function loginUser(phone: string, deviceFingerprint: string) {
  const { data: user, error } = await supabase.from("users").select("*").eq("phone", phone).single()

  if (error || !user) {
    throw new Error("User not found. Please check your phone number or sign up.")
  }

  // Update online status and device fingerprint
  await supabase
    .from("users")
    .update({
      device_fingerprint: deviceFingerprint,
      is_online: true,
      last_seen: new Date().toISOString(),
    })
    .eq("id", user.id)

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    uniqueId: user.unique_id,
    profilePhoto: user.profile_photo,
  }
}

export async function searchUsers(query: string, currentUserId: string) {
  if (!currentUserId) {
    throw new Error("User ID is required for search")
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(`name.ilike.%${query}%,unique_id.ilike.%${query}%`)
    .neq("id", currentUserId)
    .limit(10)

  if (error) {
    console.error("Search error:", error)
    throw new Error("Failed to search users. Please try again.")
  }

  return data.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    uniqueId: user.unique_id,
    profilePhoto: user.profile_photo,
    online: user.is_online,
    lastSeen: user.last_seen,
  }))
}

export async function getChats(currentUserId: string) {
  // Get all chats where user is a participant
  const { data: chatParticipants, error } = await supabase
    .from("chat_participants")
    .select(`
      chat_id,
      chats!inner(
        id,
        updated_at,
        created_at
      )
    `)
    .eq("user_id", currentUserId)

  if (error) throw error

  const chats = []

  for (const participant of chatParticipants) {
    // Get other participants in this chat
    const { data: otherParticipants } = await supabase
      .from("chat_participants")
      .select(`
        user_id,
        users!inner(
          id,
          name,
          unique_id,
          profile_photo,
          is_online,
          last_seen
        )
      `)
      .eq("chat_id", participant.chat_id)
      .neq("user_id", currentUserId)

    if (otherParticipants && otherParticipants.length > 0) {
      // Get last message
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("chat_id", participant.chat_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      // Count unread messages (messages sent by others after user's last seen)
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", participant.chat_id)
        .neq("sender_id", currentUserId)
        .eq("is_deleted", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      const otherUser = otherParticipants[0].users
      chats.push({
        id: participant.chat_id,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          uniqueId: otherUser.unique_id,
          profilePhoto: otherUser.profile_photo,
          online: otherUser.is_online,
          lastSeen: otherUser.last_seen,
        },
        lastMessage: lastMessage?.content || "",
        lastMessageSender: lastMessage?.sender_id,
        timestamp: lastMessage?.created_at || participant.chats.created_at,
        unread: unreadCount || 0,
      })
    }
  }

  return chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function getOrCreateChat(user1Id: string, user2Id: string) {
  // Check if chat already exists between these users
  const { data: user1Chats } = await supabase.from("chat_participants").select("chat_id").eq("user_id", user1Id)

  const { data: user2Chats } = await supabase.from("chat_participants").select("chat_id").eq("user_id", user2Id)

  if (user1Chats && user2Chats) {
    const commonChatId = user1Chats.find((c1) => user2Chats.some((c2) => c2.chat_id === c1.chat_id))?.chat_id

    if (commonChatId) {
      return commonChatId
    }
  }

  // Create new chat
  const { data: newChat, error: chatError } = await supabase
    .from("chats")
    .insert([
      {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (chatError) throw chatError

  // Add participants
  const { error: participantsError } = await supabase.from("chat_participants").insert([
    { chat_id: newChat.id, user_id: user1Id, joined_at: new Date().toISOString() },
    { chat_id: newChat.id, user_id: user2Id, joined_at: new Date().toISOString() },
  ])

  if (participantsError) throw participantsError

  return newChat.id
}

export async function sendMessage(chatId: string, senderId: string, content: string, messageType = "text") {
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        chat_id: chatId,
        sender_id: senderId,
        content: content,
        message_type: messageType,
        created_at: new Date().toISOString(),
        is_deleted: false,
      },
    ])
    .select(`
      *,
      users!inner(name, unique_id, profile_photo)
    `)

  if (error) throw error

  // Update chat timestamp
  await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId)

  return {
    id: data[0].id,
    text: data[0].content,
    sender: data[0].sender_id,
    senderName: data[0].users.name,
    timestamp: data[0].created_at,
    messageType: data[0].message_type,
  }
}

export async function getMessages(chatId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      users!inner(name, unique_id, profile_photo)
    `)
    .eq("chat_id", chatId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.reverse().map((message) => ({
    id: message.id,
    text: message.content,
    sender: message.sender_id,
    senderName: message.users.name,
    timestamp: message.created_at,
    messageType: message.message_type,
    isOwn: false, // This will be set by the component
  }))
}

export async function uploadProfilePhoto(file: File, uniqueId: string) {
  try {
    const filename = `profile-photos/${uniqueId}-${Date.now()}.${file.name.split(".").pop()}`

    const blob = await put(filename, file, {
      access: "public",
    })

    return blob.url
  } catch (error) {
    console.error("Upload error:", error)
    throw new Error("Failed to upload photo. Please try again.")
  }
}

export async function updateUserProfile(userId: string, updates: { name?: string; profilePhoto?: string | null }) {
  const updateData: any = {}

  if (updates.name) updateData.name = updates.name
  if (updates.profilePhoto !== undefined) updateData.profile_photo = updates.profilePhoto

  const { data, error } = await supabase.from("users").update(updateData).eq("id", userId).select().single()

  if (error) throw error

  return {
    id: data.id,
    name: data.name,
    profilePhoto: data.profile_photo,
    uniqueId: data.unique_id,
  }
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean) {
  await supabase
    .from("users")
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    })
    .eq("id", userId)
}

export function subscribeToMessages(chatId: string, callback: (message: any) => void) {
  return supabase
    .channel(`messages_${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      },
      async (payload) => {
        // Get user info for the message
        const { data: user } = await supabase
          .from("users")
          .select("name, unique_id, profile_photo")
          .eq("id", payload.new.sender_id)
          .single()

        callback({
          ...payload,
          new: {
            ...payload.new,
            users: user,
          },
        })
      },
    )
    .subscribe()
}

export function subscribeToUserStatus(callback: (payload: any) => void) {
  return supabase
    .channel("user_status")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
      },
      callback,
    )
    .subscribe()
}

export function subscribeToCallSignals(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`call_signals_${userId}`)
    .on("broadcast", { event: "call_signal" }, callback)
    .on("broadcast", { event: "incoming_call" }, callback)
    .on("broadcast", { event: "call_ended" }, callback)
    .subscribe()
}

export async function initiateCall(
  callerUniqueId: string,
  receiverUniqueId: string,
  callType: "voice" | "video",
  offer?: any,
) {
  try {
    // Log call initiation - using uniqueIds for VARCHAR(10) columns
    const { data: callLog, error } = await supabase
      .from("call_logs")
      .insert({
        caller_id: callerUniqueId, // uniqueId (6-digit string)
        receiver_id: receiverUniqueId, // uniqueId (6-digit string)
        call_type: callType,
        status: "initiated",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Call log creation error:", error)
      throw new Error("Failed to initiate call")
    }

    // Send call signal to receiver - we need to find the user ID for the channel
    const { data: receiverUser } = await supabase.from("users").select("id").eq("unique_id", receiverUniqueId).single()

    if (receiverUser) {
      const channel = supabase.channel(`call_signals_${receiverUser.id}`)
      await channel.send({
        type: "broadcast",
        event: "incoming_call",
        payload: {
          callId: callLog.id,
          callerId: callerUniqueId,
          receiverId: receiverUniqueId,
          callType,
          offer,
        },
      })
    }

    return callLog.id
  } catch (error) {
    console.error("Initiate call error:", error)
    throw error
  }
}

export async function answerCall(callId: string, answer: any) {
  try {
    await supabase.from("call_logs").update({ status: "answered" }).eq("id", callId)

    // Get call details
    const { data: call } = await supabase.from("call_logs").select("*").eq("id", callId).single()

    if (call) {
      // Find the caller's user ID for the channel
      const { data: callerUser } = await supabase.from("users").select("id").eq("unique_id", call.caller_id).single()

      if (callerUser) {
        const channel = supabase.channel(`call_signals_${callerUser.id}`)
        await channel.send({
          type: "broadcast",
          event: "call_signal",
          payload: {
            type: "answer",
            callId,
            answer,
          },
        })
      }
    }
  } catch (error) {
    console.error("Answer call error:", error)
    throw error
  }
}

export async function endCall(callId: string, duration = 0) {
  try {
    await supabase
      .from("call_logs")
      .update({
        status: "ended",
        duration,
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId)

    // Get call details to notify other party
    const { data: call } = await supabase.from("call_logs").select("*").eq("id", callId).single()

    if (call) {
      // Find both users' IDs for the channels
      const { data: callerUser } = await supabase.from("users").select("id").eq("unique_id", call.caller_id).single()
      const { data: receiverUser } = await supabase
        .from("users")
        .select("id")
        .eq("unique_id", call.receiver_id)
        .single()

      const endPayload = {
        type: "broadcast",
        event: "call_ended",
        payload: { callId },
      }

      const promises = []
      if (callerUser) {
        const callerChannel = supabase.channel(`call_signals_${callerUser.id}`)
        promises.push(callerChannel.send(endPayload))
      }
      if (receiverUser) {
        const receiverChannel = supabase.channel(`call_signals_${receiverUser.id}`)
        promises.push(receiverChannel.send(endPayload))
      }

      await Promise.all(promises)
    }
  } catch (error) {
    console.error("End call error:", error)
    throw error
  }
}

export async function sendCallSignal(targetUserId: string, signal: any) {
  const channel = supabase.channel(`call_signals_${targetUserId}`)
  await channel.send({
    type: "broadcast",
    event: "call_signal",
    payload: signal,
  })
}

export async function createGroupChat(groupData: {
  name: string
  members: Array<{ id: string; uniqueId: string; name: string }>
  createdBy: string // This should be the uniqueId (6-digit) of the creator
}) {
  // Create group chat - using uniqueId for created_by to match VARCHAR(10)
  const { data: chat, error: chatError } = await supabase
    .from("group_chats")
    .insert([
      {
        name: groupData.name,
        created_by: groupData.createdBy, // uniqueId (6-digit string)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (chatError) {
    console.error("Group chat creation error:", chatError)
    throw new Error("Failed to create group chat")
  }

  // Add members to group - using uniqueId for group_members table
  const memberInserts = groupData.members.map((member) => ({
    group_id: chat.id,
    user_unique_id: member.uniqueId, // 6-digit unique ID
    joined_at: new Date().toISOString(),
    is_admin: member.uniqueId === groupData.createdBy, // Compare uniqueIds to determine admin
  }))

  const { error: membersError } = await supabase.from("group_members").insert(memberInserts)

  if (membersError) {
    console.error("Group members insertion error:", membersError)
    throw new Error("Failed to add members to group")
  }

  return chat
}

// Typing indicators
export function sendTypingIndicator(chatId: string, userId: string, isTyping: boolean) {
  const channel = supabase.channel(`typing_${chatId}`)
  return channel.send({
    type: "broadcast",
    event: "typing",
    payload: {
      userId,
      isTyping,
      timestamp: new Date().toISOString(),
    },
  })
}

export function subscribeToTyping(chatId: string, callback: (payload: any) => void) {
  return supabase.channel(`typing_${chatId}`).on("broadcast", { event: "typing" }, callback).subscribe()
}
