import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class SocketManager {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    this.activeCalls = new Map(); // callId -> callData
    this.typingUsers = new Map(); // chatId -> Set of userIds
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.setupSocketHandlers();
    
    console.log('🔌 Enhanced Socket Manager initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 New connection: ${socket.id}`);
      
      // Enhanced authentication
      socket.on('authenticate', async (token) => {
        try {
          console.log(`🔐 Authenticating socket: ${socket.id}`);
          
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hodhod-ultra-secure-secret-key-2024');
          const user = await this.db.getUserById(decoded.userId);
          
          if (user && user.status !== 'deleted' && user.status !== 'banned') {
            // Set socket user data
            socket.userId = user.id;
            socket.username = user.username;
            socket.userRole = user.role;
            
            // Update mappings
            this.userSockets.set(user.id, socket.id);
            this.socketUsers.set(socket.id, user.id);
            
            // Update user status to online
            await this.db.updateUserStatus(user.id, true);
            
            // Join user's personal room
            socket.join(`user_${user.id}`);
            
            // Join user's chats
            const userChats = await this.db.getUserChats(user.id);
            const chatRooms = new Set();
            
            userChats.forEach(chat => {
              const roomName = `chat_${chat.id}`;
              socket.join(roomName);
              chatRooms.add(roomName);
            });
            
            this.userRooms.set(user.id, chatRooms);
            
            // Send authentication success
            socket.emit('authenticated', { 
              user: {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                role: user.role,
                status: user.status
              },
              timestamp: new Date().toISOString()
            });
            
            // Broadcast user online status
            this.broadcastUserStatus(user.id, true);
            
            // Send pending notifications
            await this.sendPendingNotifications(user.id);
            
            // Log connection
            await this.db.logEvent(user.id, 'socket_connected', {
              socketId: socket.id,
              userAgent: socket.handshake.headers['user-agent']
            });
            
            console.log(`✅ User ${user.username} authenticated successfully`);
          } else {
            socket.emit('auth_error', { message: 'Invalid user account' });
            socket.disconnect();
          }
        } catch (error) {
          console.error('❌ Authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Enhanced chat management
      socket.on('join_chat', async (chatId) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          // Verify user is participant
          const userChats = await this.db.getUserChats(socket.userId);
          const isParticipant = userChats.some(chat => chat.id === chatId);
          
          if (isParticipant) {
            const roomName = `chat_${chatId}`;
            socket.join(roomName);
            
            // Update user rooms
            const userRooms = this.userRooms.get(socket.userId) || new Set();
            userRooms.add(roomName);
            this.userRooms.set(socket.userId, userRooms);
            
            // Notify others in chat
            socket.to(roomName).emit('user_joined_chat', {
              userId: socket.userId,
              username: socket.username,
              chatId,
              timestamp: new Date().toISOString()
            });
            
            console.log(`👥 User ${socket.username} joined chat ${chatId}`);
          } else {
            socket.emit('error', { message: 'Not authorized to join this chat' });
          }
        } catch (error) {
          console.error('❌ Join chat error:', error);
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      socket.on('leave_chat', (chatId) => {
        try {
          const roomName = `chat_${chatId}`;
          socket.leave(roomName);
          
          // Update user rooms
          const userRooms = this.userRooms.get(socket.userId) || new Set();
          userRooms.delete(roomName);
          this.userRooms.set(socket.userId, userRooms);
          
          // Notify others in chat
          socket.to(roomName).emit('user_left_chat', {
            userId: socket.userId,
            username: socket.username,
            chatId,
            timestamp: new Date().toISOString()
          });
          
          console.log(`👋 User ${socket.username} left chat ${chatId}`);
        } catch (error) {
          console.error('❌ Leave chat error:', error);
        }
      });

      // Enhanced message handling
      socket.on('send_message', async (messageData) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          console.log(`📤 Processing message from ${socket.username}`);
          
          // Validate message data
          if (!messageData.chatId || (!messageData.content && !messageData.fileUrl)) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
          }
          
          // Check rate limiting
          const rateLimitKey = `message_rate_${socket.userId}`;
          // Implement rate limiting logic here
          
          // Process mentions and hashtags
          const mentions = this.extractMentions(messageData.content || '');
          const hashtags = this.extractHashtags(messageData.content || '');
          
          // Create message in database
          const message = await this.db.createMessage({
            ...messageData,
            senderId: socket.userId,
            mentions,
            hashtags,
            metadata: {
              ...messageData.metadata,
              socketId: socket.id,
              clientTimestamp: messageData.timestamp,
              serverTimestamp: new Date().toISOString()
            }
          });

          // Get sender info
          const sender = await this.db.getUserById(socket.userId);
          
          // Prepare message for broadcast
          const broadcastMessage = {
            id: message.lastID,
            chatId: messageData.chatId,
            senderId: socket.userId,
            username: sender.username,
            userAvatar: sender.avatar,
            content: messageData.content,
            type: messageData.type || 'text',
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize,
            replyToId: messageData.replyToId,
            mentions,
            hashtags,
            animationType: messageData.animationType,
            timestamp: new Date().toISOString(),
            metadata: messageData.metadata || {}
          };

          // Broadcast to chat participants
          this.io.to(`chat_${messageData.chatId}`).emit('new_message', broadcastMessage);
          
          // Handle mentions
          await this.handleMentions(mentions, messageData.chatId, message.lastID, sender);
          
          // Check for AI auto-response
          if (messageData.type === 'text' && !messageData.content.startsWith('/')) {
            await this.handleAIResponse(messageData.chatId, messageData.content, socket.userId);
          }
          
          // Check for digital twin responses
          await this.handleTwinResponses(messageData.chatId, messageData.content, socket.userId);
          
          // Log message sent
          await this.db.logEvent(socket.userId, 'message_sent', {
            chatId: messageData.chatId,
            messageId: message.lastID,
            type: messageData.type || 'text',
            hasFile: !!messageData.fileUrl,
            hasMentions: mentions.length > 0,
            hasHashtags: hashtags.length > 0
          });
          
          console.log(`✅ Message ${message.lastID} sent successfully`);
          
        } catch (error) {
          console.error('❌ Send message error:', error);
          socket.emit('message_error', { 
            message: 'Failed to send message',
            error: error.message 
          });
        }
      });

      // Enhanced typing indicators
      socket.on('typing', (data) => {
        try {
          if (!socket.userId || !data.chatId) return;
          
          const chatId = data.chatId;
          const isTyping = data.isTyping;
          
          if (!this.typingUsers.has(chatId)) {
            this.typingUsers.set(chatId, new Set());
          }
          
          const typingSet = this.typingUsers.get(chatId);
          
          if (isTyping) {
            typingSet.add(socket.userId);
          } else {
            typingSet.delete(socket.userId);
          }
          
          // Broadcast typing status to others in chat
          socket.to(`chat_${chatId}`).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            isTyping,
            chatId,
            timestamp: new Date().toISOString()
          });
          
          // Auto-clear typing after 3 seconds
          if (isTyping) {
            setTimeout(() => {
              typingSet.delete(socket.userId);
              socket.to(`chat_${chatId}`).emit('user_typing', {
                userId: socket.userId,
                username: socket.username,
                isTyping: false,
                chatId,
                timestamp: new Date().toISOString()
              });
            }, 3000);
          }
        } catch (error) {
          console.error('❌ Typing indicator error:', error);
        }
      });

      // Enhanced voice/video call handling
      socket.on('call_user', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          console.log(`📞 Call initiated by ${socket.username}`);
          
          const call = await this.db.createCall({
            chatId: data.chatId,
            initiatorId: socket.userId,
            participants: [socket.userId, data.targetUserId],
            type: data.isVideo ? 'video' : 'voice',
            isRecorded: data.isRecorded || false
          });

          const callData = {
            callId: call.lastID,
            initiatorId: socket.userId,
            participants: [socket.userId, data.targetUserId],
            type: data.isVideo ? 'video' : 'voice',
            status: 'ringing',
            startTime: Date.now()
          };
          
          this.activeCalls.set(call.lastID, callData);

          const targetSocketId = this.userSockets.get(data.targetUserId);
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('incoming_call', {
              callId: call.lastID,
              callerId: socket.userId,
              callerName: socket.username,
              callerAvatar: (await this.db.getUserById(socket.userId)).avatar,
              chatId: data.chatId,
              isVideo: data.isVideo,
              timestamp: new Date().toISOString()
            });
            
            // Auto-timeout call after 30 seconds
            setTimeout(async () => {
              if (this.activeCalls.has(call.lastID)) {
                const callData = this.activeCalls.get(call.lastID);
                if (callData.status === 'ringing') {
                  await this.endCall(call.lastID, 'timeout');
                }
              }
            }, 30000);
          } else {
            socket.emit('call_error', { message: 'User is not online' });
            await this.db.endCall(call.lastID, 0, 'poor', null);
          }
        } catch (error) {
          console.error('❌ Call user error:', error);
          socket.emit('call_error', { message: 'Failed to initiate call' });
        }
      });

      socket.on('call_response', async (data) => {
        try {
          const callData = this.activeCalls.get(data.callId);
          if (!callData) {
            socket.emit('call_error', { message: 'Call not found' });
            return;
          }
          
          const callerSocketId = this.userSockets.get(callData.initiatorId);
          if (callerSocketId) {
            this.io.to(callerSocketId).emit('call_response', {
              accepted: data.accepted,
              userId: socket.userId,
              callId: data.callId,
              timestamp: new Date().toISOString()
            });

            if (data.accepted) {
              callData.status = 'active';
              callData.acceptedAt = Date.now();
              
              // Log call started
              await this.db.logEvent(socket.userId, 'call_accepted', {
                callId: data.callId,
                callerId: callData.initiatorId
              });
            } else {
              await this.endCall(data.callId, 'declined');
            }
          }
        } catch (error) {
          console.error('❌ Call response error:', error);
          socket.emit('call_error', { message: 'Failed to respond to call' });
        }
      });

      socket.on('call_end', async (data) => {
        try {
          await this.endCall(data.callId, 'ended');
        } catch (error) {
          console.error('❌ Call end error:', error);
          socket.emit('call_error', { message: 'Failed to end call' });
        }
      });

      // Enhanced WebRTC signaling
      socket.on('webrtc_offer', (data) => {
        try {
          const targetSocket = this.userSockets.get(data.targetUserId);
          if (targetSocket) {
            this.io.to(targetSocket).emit('webrtc_offer', {
              offer: data.offer,
              callerId: socket.userId,
              callId: data.callId
            });
          }
        } catch (error) {
          console.error('❌ WebRTC offer error:', error);
        }
      });

      socket.on('webrtc_answer', (data) => {
        try {
          const targetSocket = this.userSockets.get(data.targetUserId);
          if (targetSocket) {
            this.io.to(targetSocket).emit('webrtc_answer', {
              answer: data.answer,
              answerId: socket.userId,
              callId: data.callId
            });
          }
        } catch (error) {
          console.error('❌ WebRTC answer error:', error);
        }
      });

      socket.on('webrtc_ice_candidate', (data) => {
        try {
          const targetSocket = this.userSockets.get(data.targetUserId);
          if (targetSocket) {
            this.io.to(targetSocket).emit('webrtc_ice_candidate', {
              candidate: data.candidate,
              userId: socket.userId,
              callId: data.callId
            });
          }
        } catch (error) {
          console.error('❌ WebRTC ICE candidate error:', error);
        }
      });

      // Message reactions
      socket.on('add_reaction', async (data) => {
        try {
          if (!socket.userId) return;
          
          await this.db.addMessageReaction(data.messageId, socket.userId, data.reaction);
          
          // Get updated reactions
          const reactions = await this.db.getMessageReactions(data.messageId);
          
          // Broadcast to chat
          const message = await this.db.getMessageById(data.messageId);
          if (message) {
            this.io.to(`chat_${message.chatId}`).emit('message_reaction', {
              messageId: data.messageId,
              reactions,
              userId: socket.userId,
              reaction: data.reaction,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('❌ Add reaction error:', error);
        }
      });

      // User status updates
      socket.on('update_status', async (data) => {
        try {
          if (!socket.userId) return;
          
          await this.db.updateUserProfile(socket.userId, { status: data.status });
          
          // Broadcast status update
          this.broadcastUserStatus(socket.userId, true, data.status);
          
          await this.db.logEvent(socket.userId, 'status_updated', {
            newStatus: data.status
          });
        } catch (error) {
          console.error('❌ Update status error:', error);
        }
      });

      // Enhanced disconnect handling
      socket.on('disconnect', async () => {
        try {
          if (socket.userId) {
            console.log(`🔌 User ${socket.username} disconnected`);
            
            // Update user status to offline
            await this.db.updateUserStatus(socket.userId, false);
            
            // Clean up mappings
            this.userSockets.delete(socket.userId);
            this.socketUsers.delete(socket.id);
            this.userRooms.delete(socket.userId);
            
            // Clean up typing indicators
            for (const [chatId, typingSet] of this.typingUsers.entries()) {
              if (typingSet.has(socket.userId)) {
                typingSet.delete(socket.userId);
                this.io.to(`chat_${chatId}`).emit('user_typing', {
                  userId: socket.userId,
                  username: socket.username,
                  isTyping: false,
                  chatId
                });
              }
            }
            
            // End any active calls
            for (const [callId, call] of this.activeCalls.entries()) {
              if (call.participants.includes(socket.userId)) {
                await this.endCall(callId, 'disconnected');
              }
            }
            
            // Broadcast user offline status
            this.broadcastUserStatus(socket.userId, false);
            
            // Log disconnection
            await this.db.logEvent(socket.userId, 'socket_disconnected', {
              socketId: socket.id,
              duration: Date.now() - (socket.connectedAt || Date.now())
            });
          }
        } catch (error) {
          console.error('❌ Disconnect error:', error);
        }
      });

      // Store connection time
      socket.connectedAt = Date.now();
    });
  }

  // Enhanced AI response handling
  async handleAIResponse(chatId, content, senderId) {
    try {
      // Check if AI is enabled
      const aiEnabled = await this.db.getSetting('ai', 'enabled');
      if (aiEnabled !== 'true') return;

      // Check if AI should respond (basic logic - can be enhanced)
      const shouldRespond = Math.random() < 0.3; // 30% chance
      if (!shouldRespond) return;

      // Get recent messages for context
      const recentMessages = await this.db.getChatMessages(chatId, 5);
      
      // Prepare AI request
      const apiKey = await this.db.getSetting('ai', 'openrouter_api_key');
      if (!apiKey) return;
      
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
              content: 'You are Hodhod AI, a helpful assistant in a messenger app. Respond naturally and helpfully to user messages. Keep responses concise and friendly. Only respond when directly addressed or when you can add value to the conversation.'
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === senderId ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const aiMessage = aiResponse.choices[0]?.message?.content;
        
        if (aiMessage && aiMessage.trim().length > 0) {
          // Create AI message
          const message = await this.db.createMessage({
            chatId,
            senderId: 999, // AI user ID
            content: aiMessage,
            type: 'ai',
            metadata: {
              model: 'meta-llama/llama-3.2-1b-instruct:free',
              provider: 'openrouter',
              responseTime: Date.now()
            }
          });

          // Send to chat with delay for natural feel
          setTimeout(() => {
            this.io.to(`chat_${chatId}`).emit('new_message', {
              id: message.lastID,
              chatId,
              senderId: 999,
              username: 'Hodhod AI',
              userAvatar: 'https://ui-avatars.com/api/?name=AI&background=F3C883&color=1F3934&size=128',
              content: aiMessage,
              type: 'ai',
              timestamp: new Date().toISOString(),
              metadata: {
                model: 'meta-llama/llama-3.2-1b-instruct:free',
                provider: 'openrouter'
              }
            });
          }, 1000 + Math.random() * 2000); // 1-3 second delay
        }
      }
    } catch (error) {
      console.error('❌ AI response error:', error);
    }
  }

  // Enhanced twin response handling
  async handleTwinResponses(chatId, content, senderId) {
    try {
      // Get chat participants
      const participants = await this.db.getChatParticipants(chatId);
      
      for (const participant of participants) {
        // Skip the sender and check if user has twin enabled and is offline
        if (participant.userId === senderId) continue;
        
        const user = await this.db.getUserById(participant.userId);
        if (!user || user.twinEnabled !== 1 || user.isOnline === 1) continue;
        
        // Check if twin should respond (based on settings)
        const autoReply = await this.db.getUserSetting(user.id, 'twin', 'auto_reply', 'false');
        if (autoReply !== 'true') continue;
        
        // Generate twin response
        const twinResponse = await this.generateTwinResponse(user, content, chatId);
        
        if (twinResponse) {
          const responseDelay = await this.db.getUserSetting(user.id, 'twin', 'response_delay', '30');
          
          setTimeout(async () => {
            const message = await this.db.createMessage({
              chatId,
              senderId: user.id,
              content: `[Twin] ${twinResponse}`,
              type: 'twin',
              metadata: {
                isTwin: true,
                originalUserId: user.id,
                twinPersonality: user.twinPersonality
              }
            });

            this.io.to(`chat_${chatId}`).emit('new_message', {
              id: message.lastID,
              chatId,
              senderId: user.id,
              username: `${user.username} (Twin)`,
              userAvatar: user.avatar,
              content: `[Twin] ${twinResponse}`,
              type: 'twin',
              timestamp: new Date().toISOString(),
              metadata: {
                isTwin: true,
                originalUserId: user.id
              }
            });
          }, parseInt(responseDelay) * 1000);
        }
      }
    } catch (error) {
      console.error('❌ Twin response error:', error);
    }
  }

  // Generate twin response
  async generateTwinResponse(user, message, chatId) {
    try {
      const apiKey = await this.db.getSetting('ai', 'openrouter_api_key');
      if (!apiKey) return null;
      
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
              content: `You are ${user.username}'s digital twin. Respond as if you are them based on their personality: ${user.twinPersonality || 'Friendly and helpful'}. Use their communication style and preferences. Keep responses brief and natural. You are responding because they are currently offline.`
            },
            ...recentMessages.reverse().map(msg => ({
              role: msg.senderId === user.id ? 'assistant' : 'user',
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.8,
          max_tokens: 100
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        return aiResponse.choices[0]?.message?.content;
      }
    } catch (error) {
      console.error('❌ Twin generation error:', error);
    }
    return null;
  }

  // Handle mentions
  async handleMentions(mentions, chatId, messageId, sender) {
    try {
      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== sender.id) {
          // Create notification
          await this.db.createNotification(
            mentionedUserId,
            'mention',
            'You were mentioned',
            `${sender.username} mentioned you in a message`,
            { chatId, messageId }
          );
          
          // Send real-time notification
          const targetSocketId = this.userSockets.get(mentionedUserId);
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('notification', {
              type: 'mention',
              title: 'You were mentioned',
              message: `${sender.username} mentioned you`,
              chatId,
              messageId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Handle mentions error:', error);
    }
  }

  // End call helper
  async endCall(callId, reason = 'ended') {
    try {
      const callData = this.activeCalls.get(callId);
      if (!callData) return;
      
      const duration = callData.acceptedAt 
        ? Math.floor((Date.now() - callData.acceptedAt) / 1000)
        : 0;
      
      await this.db.endCall(callId, duration, 'good', null);
      
      // Notify all participants
      callData.participants.forEach((participantId) => {
        const participantSocket = this.userSockets.get(participantId);
        if (participantSocket) {
          this.io.to(participantSocket).emit('call_ended', { 
            callId, 
            reason,
            duration,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      this.activeCalls.delete(callId);
      
      // Log call ended
      await this.db.logEvent(callData.initiatorId, 'call_ended', {
        callId,
        reason,
        duration,
        participantCount: callData.participants.length
      });
    } catch (error) {
      console.error('❌ End call error:', error);
    }
  }

  // Broadcast user status
  broadcastUserStatus(userId, isOnline, status = null) {
    try {
      const userRooms = this.userRooms.get(userId);
      if (userRooms) {
        userRooms.forEach(roomName => {
          this.io.to(roomName).emit('user_status_changed', {
            userId,
            isOnline,
            status,
            timestamp: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      console.error('❌ Broadcast user status error:', error);
    }
  }

  // Send pending notifications
  async sendPendingNotifications(userId) {
    try {
      const notifications = await this.db.getUserNotifications(userId, 10);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      if (unreadNotifications.length > 0) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
          this.io.to(socketId).emit('pending_notifications', {
            notifications: unreadNotifications,
            count: unreadNotifications.length
          });
        }
      }
    } catch (error) {
      console.error('❌ Send pending notifications error:', error);
    }
  }

  // Extract mentions from message content
  extractMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      // In a real implementation, you'd look up user IDs by username
      // For now, we'll just store the username
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  // Extract hashtags from message content
  extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(`#${match[1]}`);
    }
    
    return hashtags;
  }

  // Public methods for external use
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToChat(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  getUserSocketId(userId) {
    return this.userSockets.get(userId);
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  getActiveCallsCount() {
    return this.activeCalls.size;
  }

  getConnectedSocketsCount() {
    return this.userSockets.size;
  }
}