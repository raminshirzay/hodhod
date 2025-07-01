import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Database } from './database.js';

interface SocketWithUser extends Socket {
  userId?: number;
  username?: string;
}

export class SocketManager {
  private io: Server;
  private db: Database;
  private userSockets: Map<number, string> = new Map();
  private activeCalls: Map<string, any> = new Map();

  constructor(io: Server, db: Database) {
    this.io = io;
    this.db = db;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: SocketWithUser) => {
      console.log('User connected:', socket.id);

      // Authentication
      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          const user = await this.db.getUserById(decoded.userId);
          
          if (user) {
            socket.userId = user.id;
            socket.username = user.username;
            this.userSockets.set(user.id, socket.id);
            
            // Update user status
            await this.db.updateUserStatus(user.id, true);
            
            // Join user's chats
            const userChats = await this.db.getUserChats(user.id);
            userChats.forEach(chat => {
              socket.join(`chat_${chat.id}`);
            });
            
            // Join user's personal room
            socket.join(`user_${user.id}`);
            
            socket.emit('authenticated', { user });
            console.log(`User ${user.username} authenticated`);
          }
        } catch (error) {
          socket.emit('auth_error', { message: 'Invalid token' });
        }
      });

      // Join chat
      socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`User ${socket.username} joined chat ${chatId}`);
      });

      // Leave chat
      socket.on('leave_chat', (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`User ${socket.username} left chat ${chatId}`);
      });

      // Send message
      socket.on('send_message', async (messageData) => {
        try {
          const message = await this.db.createMessage({
            ...messageData,
            senderId: socket.userId,
            timestamp: new Date().toISOString()
          });

          const messageWithUser = {
            id: message.lastID,
            ...messageData,
            senderId: socket.userId,
            username: socket.username,
            timestamp: new Date().toISOString()
          };

          // Send to all chat participants
          this.io.to(`chat_${messageData.chatId}`).emit('new_message', messageWithUser);
          
          // Check if AI should respond
          if (messageData.type === 'text' && !messageData.content.startsWith('/')) {
            await this.handleAIResponse(messageData.chatId, messageData.content, socket.userId!);
          }
          
          // Check for digital twin responses
          await this.handleTwinResponses(messageData.chatId, messageData.content, socket.userId!);
          
        } catch (error) {
          socket.emit('message_error', { message: 'Failed to send message' });
        }
      });

      // Typing indicator
      socket.on('typing', (data) => {
        socket.to(`chat_${data.chatId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.username,
          isTyping: data.isTyping
        });
      });

      // Voice/Video call events
      socket.on('call_user', async (data) => {
        try {
          const call = await this.db.createCall({
            chatId: data.chatId,
            initiatorId: socket.userId,
            participants: [socket.userId, data.targetUserId],
            type: data.isVideo ? 'video' : 'voice'
          });

          const targetSocketId = this.userSockets.get(data.targetUserId);
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('incoming_call', {
              callId: call.lastID,
              callerId: socket.userId,
              callerName: socket.username,
              chatId: data.chatId,
              isVideo: data.isVideo
            });
          }
        } catch (error) {
          socket.emit('call_error', { message: 'Failed to initiate call' });
        }
      });

      socket.on('call_response', async (data) => {
        const callerSocketId = this.userSockets.get(data.callerId);
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call_response', {
            accepted: data.accepted,
            userId: socket.userId,
            callId: data.callId
          });

          if (data.accepted) {
            // Store active call
            this.activeCalls.set(data.callId, {
              participants: [data.callerId, socket.userId],
              startTime: Date.now()
            });
          }
        }
      });

      socket.on('call_end', async (data) => {
        const call = this.activeCalls.get(data.callId);
        if (call) {
          const duration = Math.floor((Date.now() - call.startTime) / 1000);
          await this.db.endCall(data.callId, duration);
          
          // Notify all participants
          call.participants.forEach((participantId: number) => {
            const participantSocket = this.userSockets.get(participantId);
            if (participantSocket) {
              this.io.to(participantSocket).emit('call_ended', { callId: data.callId });
            }
          });
          
          this.activeCalls.delete(data.callId);
        }
      });

      // WebRTC signaling
      socket.on('webrtc_offer', (data) => {
        const targetSocket = this.userSockets.get(data.targetUserId);
        if (targetSocket) {
          this.io.to(targetSocket).emit('webrtc_offer', {
            offer: data.offer,
            callerId: socket.userId
          });
        }
      });

      socket.on('webrtc_answer', (data) => {
        const targetSocket = this.userSockets.get(data.targetUserId);
        if (targetSocket) {
          this.io.to(targetSocket).emit('webrtc_answer', {
            answer: data.answer,
            answerId: socket.userId
          });
        }
      });

      socket.on('webrtc_ice_candidate', (data) => {
        const targetSocket = this.userSockets.get(data.targetUserId);
        if (targetSocket) {
          this.io.to(targetSocket).emit('webrtc_ice_candidate', {
            candidate: data.candidate,
            userId: socket.userId
          });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        if (socket.userId) {
          await this.db.updateUserStatus(socket.userId, false);
          this.userSockets.delete(socket.userId);
          
          // End any active calls
          for (const [callId, call] of this.activeCalls.entries()) {
            if (call.participants.includes(socket.userId)) {
              const duration = Math.floor((Date.now() - call.startTime) / 1000);
              await this.db.endCall(parseInt(callId), duration);
              
              call.participants.forEach((participantId: number) => {
                if (participantId !== socket.userId) {
                  const participantSocket = this.userSockets.get(participantId);
                  if (participantSocket) {
                    this.io.to(participantSocket).emit('call_ended', { callId });
                  }
                }
              });
              
              this.activeCalls.delete(callId);
            }
          }
          
          console.log(`User ${socket.username} disconnected`);
        }
      });
    });
  }

  private async handleAIResponse(chatId: number, content: string, senderId: number) {
    try {
      // Check if AI is enabled
      const aiEnabled = await this.db.getSetting('ai_enabled');
      if (aiEnabled === 'false') return;

      // Get recent messages for context
      const recentMessages = await this.db.getChatMessages(chatId, 5);
      
      // Prepare AI request
      const apiKey = await this.db.getSetting('openrouter_api_key');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hodhod.com',
          'X-Title': 'Hodhod Messenger'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-1b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'You are Hodhod AI, a helpful assistant in a messenger app. Respond naturally and helpfully to user messages. Keep responses concise and friendly.'
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === senderId ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: content
            }
          ]
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const aiMessage = aiResponse.choices[0]?.message?.content;
        
        if (aiMessage) {
          // Create AI message
          const message = await this.db.createMessage({
            chatId,
            senderId: 999, // AI user ID
            content: aiMessage,
            type: 'ai',
            timestamp: new Date().toISOString()
          });

          // Send to chat
          this.io.to(`chat_${chatId}`).emit('new_message', {
            id: message.lastID,
            chatId,
            senderId: 999,
            username: 'Hodhod AI',
            userAvatar: 'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934',
            content: aiMessage,
            type: 'ai',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('AI response error:', error);
    }
  }

  private async handleTwinResponses(chatId: number, content: string, senderId: number) {
    try {
      // Get chat participants
      const participants = await this.db.getUserChats(senderId);
      const currentChat = participants.find(chat => chat.id === chatId);
      
      if (!currentChat) return;

      // Check for offline users with twins enabled
      // This is a simplified implementation - in reality you'd check all participants
      const offlineUsers = []; // Would query for offline participants with twins enabled
      
      for (const user of offlineUsers) {
        if (user.twinEnabled && !user.isOnline) {
          // Generate twin response
          const twinResponse = await this.generateTwinResponse(user, content, chatId);
          
          if (twinResponse) {
            const message = await this.db.createMessage({
              chatId,
              senderId: user.id,
              content: `[Twin] ${twinResponse}`,
              type: 'twin',
              timestamp: new Date().toISOString()
            });

            this.io.to(`chat_${chatId}`).emit('new_message', {
              id: message.lastID,
              chatId,
              senderId: user.id,
              username: `${user.username} (Twin)`,
              userAvatar: user.avatar,
              content: `[Twin] ${twinResponse}`,
              type: 'twin',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Twin response error:', error);
    }
  }

  private async generateTwinResponse(user: any, message: string, chatId: number) {
    try {
      const apiKey = await this.db.getSetting('openrouter_api_key');
      const recentMessages = await this.db.getChatMessages(chatId, 5);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hodhod.com',
          'X-Title': 'Hodhod Messenger'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-1b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `You are ${user.username}'s digital twin. Respond as if you are them. Personality: ${user.twinPersonality || 'Friendly and helpful'}. Keep responses brief and natural.`
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === user.id ? 'assistant' : 'user',
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ]
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        return aiResponse.choices[0]?.message?.content;
      }
    } catch (error) {
      console.error('Twin generation error:', error);
    }
    return null;
  }

  public sendToUser(userId: number, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }
}