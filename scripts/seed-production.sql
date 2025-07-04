-- Clear existing demo data
DELETE FROM messages;
DELETE FROM chat_participants;
DELETE FROM chats;
DELETE FROM group_messages;
DELETE FROM group_members;
DELETE FROM group_chats;
DELETE FROM call_logs;
DELETE FROM users WHERE name LIKE '%Demo%' OR name LIKE '%Alice%' OR name LIKE '%Bob%';

-- The application is now ready for real users
-- No seed data needed for production
