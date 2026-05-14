# Real-time Messaging System (Socket.io)

This module provides a full real-time messaging system using Socket.io and Prisma.

## Features

- Real-time 1-on-1 chat.
- Conversation rooms.
- Typing indicators.
- Read receipts.
- Persistent message history.

## Technical Architecture

### Socket.io Implementation

Located in `src/socket/index.ts`.

- **Authentication**: Uses JWT passed via handshake auth or headers.
- **Rooms**:
  - `user:${userId}`: Personal room for global notifications.
  - `conversation:${conversationId}`: Room for specific chat messages.

### Database Models

- `Conversation`: Links participants and tracks the last message.
- `ConversationParticipant`: Junction table for users in a conversation.
- `Message`: Stores individual messages with status (`SENT`, `DELIVERED`, `READ`).

## API Endpoints (`/message`)

- `GET /conversations`: List all conversations for the authenticated user.
- `GET /history/:conversationId`: Fetch message history for a specific conversation.
- `POST /send/:conversationId`: Send a message (also triggers Socket.io emission).
- `PATCH /read/:conversationId`: Mark all messages in a conversation as read.

## Real-time Events

### Client to Server

- `join_conversation(conversationId)`: Joins the room for real-time updates.
- `leave_conversation(conversationId)`: Leaves the room.
- `typing({ conversationId, userId, isTyping })`: Broadcasts typing status.

### Server to Client

- `new_message`: Emitted to the `conversation:id` room when a new message is saved.
- `new_conversation_message`: Emitted to the `user:id` room to notify of messages in other conversations.
- `user_typing`: Emitted to the `conversation:id` room.
- `messages_read`: Notifies participants that messages have been marked as read.
