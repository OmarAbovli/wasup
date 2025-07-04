-- Alternative approach: Create a new schema update that should work
-- First, let's make sure we're working with the right data types

-- Check current schema
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'group_chats' AND column_name = 'created_by';

-- If the above shows VARCHAR(10), then we keep it as is and use uniqueId
-- If you want to change it to UUID, uncomment the lines below:

-- ALTER TABLE group_chats ALTER COLUMN created_by TYPE UUID USING (
--   SELECT id FROM users WHERE unique_id = created_by
-- );

-- For now, let's keep it as VARCHAR(10) and ensure our code uses uniqueId
-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_group_chats_created_by_unique_id ON group_chats(created_by);

-- Also fix call_logs if needed - check the current schema first
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'call_logs' AND column_name IN ('caller_id', 'receiver_id');

-- If call_logs still uses VARCHAR(10), we need to update the call functions too
-- For now, let's assume they should use uniqueId as well
