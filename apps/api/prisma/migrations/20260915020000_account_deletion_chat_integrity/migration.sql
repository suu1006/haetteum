-- An in-flight request must not recreate a reply after its conversation/user
-- has been deleted. Historical reservations without a conversation remain valid.
DELETE FROM chat_requests
WHERE conversation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = conversation_id);

ALTER TABLE chat_requests ADD CONSTRAINT chat_requests_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
