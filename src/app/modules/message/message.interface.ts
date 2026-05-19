import { MessageStatus } from "../../../generated/prisma/index.js";

export type IMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type IConversation = {
  id: string;
  applicationId?: string | null;
  lastMessageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  conversationParticipants: IConversationParticipant[];
  lastMessage?: IMessage | null;
};

export type IConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date | null;
  lastReadAt?: Date | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    profile?: {
      avatarUrl?: string | null;
      headline?: string | null;
    } | null;
  };
};
