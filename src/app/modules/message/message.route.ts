import express from 'express';
import authValidator from '../../middleware/authValidator.js';
import { requireEntitlement } from '../../middleware/requireEntitlement.js';
import messageController from './message.controller.js';

const router = express.Router();

router.get(
  '/conversations',
  authValidator(),
  requireEntitlement('canMessage'),
  messageController.getConversations,
);

router.get(
  '/history/:conversationId',
  authValidator(),
  requireEntitlement('canMessage'),
  messageController.getMessages,
);

router.post(
  '/send/:conversationId',
  authValidator(),
  requireEntitlement('canMessage'),
  messageController.sendMessage,
);

router.post(
  '/create-conversation',
  authValidator(),
  requireEntitlement('canMessage'),
  messageController.createConversation,
);

router.patch('/read/:conversationId', authValidator(), messageController.markAsRead);

router.post('/block/:conversationId', authValidator(), messageController.blockUser);

router.delete('/delete/:conversationId', authValidator(), messageController.deleteConversation);
router.delete('/message/:messageId', authValidator(), messageController.deleteMessage);
router.get('/file/:messageId', authValidator(), messageController.streamMessageFile);

export const messageRoutes = router;
