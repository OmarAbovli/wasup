-- Fix the schema to properly handle UUIDs vs unique_ids
-- Update group_chats table to use UUID for created_by
ALTER TABLE group_chats ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- Update call_logs table to use UUIDs for caller_id and receiver_id  
ALTER TABLE call_logs ALTER COLUMN caller_id TYPE UUID USING caller_id::uuid;
ALTER TABLE call_logs ALTER COLUMN receiver_id TYPE UUID USING receiver_id::uuid;

-- Keep group_members.user_unique_id as VARCHAR(10) since it stores unique_id
-- Keep group_messages.sender_unique_id as VARCHAR(10) since it stores unique_id

-- Add foreign key constraints for better data integrity
ALTER TABLE group_chats ADD CONSTRAINT fk_group_chats_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE call_logs ADD CONSTRAINT fk_call_logs_caller 
FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE call_logs ADD CONSTRAINT fk_call_logs_receiver 
FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_group_chats_created_by;
DROP INDEX IF EXISTS idx_call_logs_caller;
DROP INDEX IF EXISTS idx_call_logs_receiver;

CREATE INDEX idx_group_chats_created_by ON group_chats(created_by);
CREATE INDEX idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX idx_call_logs_receiver ON call_logs(receiver_id);
