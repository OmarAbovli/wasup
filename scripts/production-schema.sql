-- Update users table with additional fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update messages table to include sender reference
ALTER TABLE messages ADD CONSTRAINT fk_messages_sender 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for real-time performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Create RLS policies for chats
CREATE POLICY "Users can view own chats" ON chats FOR SELECT USING (
  id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()::text
  )
);

-- Create RLS policies for chat_participants
CREATE POLICY "Users can view chat participants" ON chat_participants FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()::text
  )
);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert messages in their chats" ON messages FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()::text
  )
);

-- Create RLS policies for call_logs
CREATE POLICY "Users can view their call logs" ON call_logs FOR SELECT USING (
  caller_id = auth.uid()::text OR receiver_id = auth.uid()::text
);

CREATE POLICY "Users can insert their call logs" ON call_logs FOR INSERT WITH CHECK (
  caller_id = auth.uid()::text OR receiver_id = auth.uid()::text
);

-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
