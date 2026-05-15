import express from "express";
import authValidator from "../../middleware/authValidator.js";
import messageController from "./message.controller.js";

const router = express.Router();

router.get("/conversations", authValidator(), messageController.getConversations);

router.get("/history/:conversationId", authValidator(), messageController.getMessages);

router.post("/send/:conversationId", authValidator(), messageController.sendMessage);

router.post("/create-conversation", authValidator(), messageController.createConversation);

router.patch("/read/:conversationId", authValidator(), messageController.markAsRead);

router.post("/block/:conversationId", authValidator(), messageController.blockUser);

router.delete("/delete/:conversationId", authValidator(), messageController.deleteConversation);
router.delete("/message/:messageId", authValidator(), messageController.deleteMessage);

export const messageRoutes = router;
