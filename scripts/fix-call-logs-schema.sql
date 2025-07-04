-- Check current call_logs schema
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'call_logs' AND column_name IN ('caller_id', 'receiver_id');

-- The call_logs table should use uniqueId (VARCHAR(10)) not UUID
-- If the columns are already VARCHAR(10), no changes needed
-- If they're UUID, we need to convert them

-- For now, let's ensure the table structure matches our code expectations
-- The caller_id and receiver_id should be VARCHAR(10) to store unique_id values

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_unique_id ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver_unique_id ON call_logs(receiver_id);

-- Add a comment to clarify the data type usage
COMMENT ON COLUMN call_logs.caller_id IS 'Stores user unique_id (6-digit string), not UUID';
COMMENT ON COLUMN call_logs.receiver_id IS 'Stores user unique_id (6-digit string), not UUID';
