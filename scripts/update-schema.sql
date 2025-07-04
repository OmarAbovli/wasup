-- Add profile photo column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- Create group_chats table
CREATE TABLE IF NOT EXISTS group_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
    user_unique_id VARCHAR(10) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT false,
    UNIQUE(group_id, user_unique_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_unique_id VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false
);

-- Create call_logs table for tracking voice/video calls
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id VARCHAR(10) NOT NULL,
    receiver_id VARCHAR(10) NOT NULL,
    call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('voice', 'video')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'answered', 'declined', 'missed', 'ended')),
    duration INTEGER DEFAULT 0, -- in seconds
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_chats_created_by ON group_chats(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_unique_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at);
