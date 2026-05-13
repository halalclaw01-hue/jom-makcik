const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const {
  createChatMessage,
  listChatMessages,
  listAdminChatConversations,
  createAdminChatNote,
} = require("../chat/chatService");

const bookingChatRouter = express.Router();

bookingChatRouter.use(requireAuth);

bookingChatRouter.get("/admin/monitor", (req, res, next) => {
  try {
    res.json({
      chats: listAdminChatConversations(req.user),
    });
  } catch (error) {
    next(error);
  }
});

bookingChatRouter.post("/:id/admin-note", (req, res, next) => {
  try {
    res.status(201).json({
      adminNote: createAdminChatNote(req.params.id, req.user, req.body || {}),
    });
  } catch (error) {
    next(error);
  }
});

bookingChatRouter.post("/:id/chat", (req, res, next) => {
  try {
    res.status(201).json({
      chatMessage: createChatMessage(req.params.id, req.user, req.body || {}),
    });
  } catch (error) {
    next(error);
  }
});

bookingChatRouter.get("/:id/chat", (req, res, next) => {
  try {
    res.json({
      chatMessages: listChatMessages(req.params.id, req.user),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { bookingChatRouter };
