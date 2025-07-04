-- Insert sample users (for testing purposes)
INSERT INTO users (name, phone, unique_id, device_fingerprint) VALUES
('Alice Johnson', '+1234567890', '123456', 'device_fingerprint_1'),
('Bob Smith', '+1987654321', '789012', 'device_fingerprint_2'),
('Carol Davis', '+1555123456', '345678', 'device_fingerprint_3'),
('David Wilson', '+1777987654', '901234', 'device_fingerprint_4'),
('Emma Brown', '+1333555777', '567890', 'device_fingerprint_5')
ON CONFLICT (phone) DO NOTHING;

-- Create a sample chat between Alice and Bob
INSERT INTO chats (id) VALUES ('550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;

-- Add participants to the chat
INSERT INTO chat_participants (chat_id, user_id) 
SELECT '550e8400-e29b-41d4-a716-446655440000', id 
FROM users 
WHERE phone IN ('+1234567890', '+1987654321')
ON CONFLICT DO NOTHING;

-- Add sample messages
INSERT INTO messages (chat_id, sender_id, content) VALUES
('550e8400-e29b-41d4-a716-446655440000', 
 (SELECT id FROM users WHERE phone = '+1234567890'), 
 'Hey Bob! How are you doing?'),
('550e8400-e29b-41d4-a716-446655440000', 
 (SELECT id FROM users WHERE phone = '+1987654321'), 
 'Hi Alice! I''m doing great, thanks for asking!'),
('550e8400-e29b-41d4-a716-446655440000', 
 (SELECT id FROM users WHERE phone = '+1234567890'), 
 'That''s wonderful to hear! Want to grab coffee later?'),
('550e8400-e29b-41d4-a716-446655440000', 
 (SELECT id FROM users WHERE phone = '+1987654321'), 
 'How about 3 PM at the usual place?');
