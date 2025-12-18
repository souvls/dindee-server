import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { config } from "@/config";
import { Chat } from "@/models/Chat";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

interface JoinChatData {
  chatId: string;
}

interface SendMessageData {
  chatId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  attachments?: any[];
}

interface TypingData {
  chatId: string;
  isTyping: boolean;
}

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.origin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (token) {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
        socket.userId = decoded.userId;
        socket.role = decoded.role;
        console.log(
          `✅ Socket authenticated: ${socket.userId} (${socket.role})`
        );
      } else {
        // Guest access
        socket.userId = `guest_${new Date().getTime()}`;
        socket.role = "guest";
        console.log(`👤 Guest connected: ${socket.userId}`);
      }

      next();
    } catch (error) {
      console.error("❌ Socket authentication failed:", error);
      // Allow guest even if token fails? Or strictly require valid token if provided?
      // For now, if token is invalid, we reject. If no token, we allow guest.
      // If the client sends a bad token, they probably expect to be logged in, so fail.
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`🔌 User connected: ${socket.userId}`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join chat room
    socket.on("join_chat", async (data: JoinChatData) => {
      try {
        const { chatId } = data;

        // Verify user is participant in this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        const isParticipant = chat.participants.some(
          (p: any) => p.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit("error", { message: "Not authorized to join this chat" });
          return;
        }

        socket.join(`chat:${chatId}`);
        console.log(`👥 User ${socket.userId} joined chat ${chatId}`);

        // Notify other participants that user is online
        socket.to(`chat:${chatId}`).emit("user_online", {
          userId: socket.userId,
          chatId,
        });

        socket.emit("joined_chat", { chatId });
      } catch (error) {
        console.error("Join chat error:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Leave chat room
    socket.on("leave_chat", (data: JoinChatData) => {
      const { chatId } = data;
      socket.leave(`chat:${chatId}`);

      // Notify other participants that user left
      socket.to(`chat:${chatId}`).emit("user_offline", {
        userId: socket.userId,
        chatId,
      });

      console.log(`👋 User ${socket.userId} left chat ${chatId}`);
    });

    // Send message
    socket.on("send_message", async (data: SendMessageData) => {
      try {
        const {
          chatId,
          content,
          messageType = "text",
          attachments = [],
        } = data;

        if (socket.role === "guest") {
          socket.emit("error", {
            message: "Guests are not allowed to send messages to the database",
          });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        // Find and update chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Verify user is participant
        const isParticipant = chat.participants.some(
          (p: any) => p.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit("error", { message: "Not authorized to send messages" });
          return;
        }

        // Create message
        const message = {
          sender: new Types.ObjectId(socket.userId),
          content: content.trim(),
          messageType,
          attachments,
          timestamp: new Date(),
          isRead: false,
        };

        chat.messages.push(message);
        chat.lastMessageAt = new Date();

        // Update unread count for other participants
        chat.participants.forEach((participant: any) => {
          if (participant.user.toString() !== socket.userId) {
            const participantId = participant.user.toString();
            if (chat.unreadCount) {
              const currentCount =
                (chat.unreadCount as any).get(participantId) || 0;
              (chat.unreadCount as any).set(participantId, currentCount + 1);
            }
          }
        });

        await chat.save();

        // Get the created message with ID
        const createdMessage = chat.messages[chat.messages.length - 1];

        // Emit to all participants in the chat
        io.to(`chat:${chatId}`).emit("new_message", {
          chatId,
          message: {
            _id: createdMessage._id,
            sender: socket.userId,
            content: createdMessage.content,
            messageType: createdMessage.messageType,
            attachments: createdMessage.attachments,
            timestamp: createdMessage.timestamp,
            isRead: createdMessage.isRead,
          },
        });

        // Send push notification to offline users (implement later)
        const offlineParticipants = chat.participants.filter(
          (p: any) => p.user.toString() !== socket.userId
        );

        for (const participant of offlineParticipants) {
          const userId = participant.user.toString();
          // Check if user is online
          const userSockets = await io.in(`user:${userId}`).fetchSockets();
          if (userSockets.length === 0) {
            // User is offline, send push notification
            // TODO: Implement push notification service
            console.log(`📧 Send push notification to ${userId}`);
          }
        }

        console.log(`💬 Message sent in chat ${chatId} by ${socket.userId}`);
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicators
    socket.on("typing", (data: TypingData) => {
      const { chatId, isTyping } = data;
      socket.to(`chat:${chatId}`).emit("user_typing", {
        userId: socket.userId,
        chatId,
        isTyping,
      });
    });

    // Mark messages as read
    socket.on("mark_read", async (data: JoinChatData) => {
      try {
        const { chatId } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Mark messages as read
        chat.messages.forEach((message: any) => {
          if (message.sender.toString() !== socket.userId) {
            message.isRead = true;
          }
        });

        if (chat.unreadCount) {
          (chat.unreadCount as any).set(socket.userId, 0);
        }

        // Update participant's last seen
        const participant = chat.participants.find(
          (p: any) => p.user.toString() === socket.userId
        );
        if (participant) {
          participant.lastSeen = new Date();
        }

        await chat.save();

        // Notify other participants that messages were read
        socket.to(`chat:${chatId}`).emit("messages_read", {
          chatId,
          readBy: socket.userId,
        });

        console.log(
          `✅ Messages marked as read in chat ${chatId} by ${socket.userId}`
        );
      } catch (error) {
        console.error("Mark read error:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // AI Chat Handler
    socket.on(
      "ai_chat_message",
      async (data: { message: string; history?: any[] }) => {
        try {
          const { message, history } = data;

          // Import service dynamically to avoid circular deps if any, or just use it
          const { OpenRouterService } = await import(
            "@/services/OpenRouterService"
          );

          // Format history for OpenRouter (ChatMessage type compatible)
          // OpenRouterService handles normalization internally, but we pass the raw history
          // conforming to ChatMessage interface as much as possible
          const formattedHistory =
            history?.map((msg) => ({
              role: (msg.role === "assistant" ? "model" : msg.role) as
                | "user"
                | "model",
              content: msg.content,
              parts: [{ text: msg.content }], // Keep parts for backward compat if needed
            })) || [];

          const response = await OpenRouterService.chat(
            message,
            formattedHistory as any
          );

          socket.emit("ai_chat_response", {
            content: response,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("AI Chat Error:", error);
          socket.emit("ai_chat_error", {
            message: "Failed to process AI request",
          });
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);

      // Notify all chats this user was in that they went offline
      // This could be optimized by tracking which chats the user joined
    });
  });

  console.log("🚀 Socket.IO initialized successfully");
  return io;
};
