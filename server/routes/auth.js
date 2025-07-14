import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function authRouter(db) {
  const router = express.Router();

  // Enhanced JWT secret
  const JWT_SECRET = process.env.JWT_SECRET || 'hodhod-ultra-secure-secret-key-2024-' + crypto.randomBytes(32).toString('hex');

  // Test route
  router.get('/test', (req, res) => {
    console.log('✅ Auth test route accessed');
    res.json({ 
      message: 'Auth router is working!', 
      timestamp: new Date().toISOString(),
      status: 'ok',
      features: ['login', 'register', 'verify', 'profile', 'sessions']
    });
  });

  // Enhanced Register with comprehensive validation
  router.post('/register', async (req, res) => {
    try {
      console.log('=== ENHANCED REGISTRATION REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { username, email, password, phoneNumber, bio, theme, language } = req.body;
      
      // Comprehensive validation
      if (!username || !email || !password) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          success: false,
          message: 'Username, email, and password are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Username validation
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ 
          success: false,
          message: 'Username must be between 3 and 30 characters',
          code: 'INVALID_USERNAME'
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ 
          success: false,
          message: 'Username can only contain letters, numbers, and underscores',
          code: 'INVALID_USERNAME_FORMAT'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          message: 'Please enter a valid email address',
          code: 'INVALID_EMAIL'
        });
      }

      // Password validation
      if (password.length < 3) {
        return res.status(400).json({ 
          success: false,
          message: 'Password must be at least 3 characters long',
          code: 'WEAK_PASSWORD'
        });
      }
      
      // Check if user exists by email
      console.log('🔍 Checking if user exists with email:', email);
      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log('❌ User already exists with email');
        return res.status(409).json({ 
          success: false,
          message: 'An account with this email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // Check if user exists by username
      console.log('🔍 Checking if user exists with username:', username);
      const existingUserByUsername = await db.getUserByUsername(username);
      if (existingUserByUsername) {
        console.log('❌ User already exists with username');
        return res.status(409).json({ 
          success: false,
          message: 'This username is already taken',
          code: 'USERNAME_EXISTS'
        });
      }
      
      // Enhanced password hashing
      console.log('🔐 Hashing password with enhanced security...');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user with enhanced data
      console.log('👤 Creating enhanced user...');
      const result = await db.createUser({
        username,
        email,
        passwordHash,
        phoneNumber: phoneNumber || '',
        bio: bio || '',
        theme: theme || 'light',
        language: language || 'en',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883&size=128`,
        notificationSettings: {
          push: true,
          email: true,
          sound: true,
          vibration: true
        },
        privacySettings: {
          lastSeen: 'everyone',
          profilePhoto: 'everyone',
          status: 'everyone',
          readReceipts: true
        }
      });
      
      console.log('✅ Enhanced user created with ID:', result.lastID);
      
      // Generate enhanced JWT token
      const tokenPayload = {
        userId: result.lastID,
        username,
        email,
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET);
      
      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await db.createSession(
        result.lastID, 
        sessionToken, 
        req.headers['user-agent'] || 'Unknown',
        req.ip || 'Unknown',
        req.headers['user-agent'] || 'Unknown'
      );
      
      // Log registration event
      await db.logEvent(result.lastID, 'user_registered', {
        username,
        email,
        registrationMethod: 'email'
      });
      
      const user = {
        id: result.lastID,
        username,
        email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883&size=128`,
        role: 'user',
        twinEnabled: false,
        phoneNumber: phoneNumber || '',
        bio: bio || '',
        status: 'available',
        theme: theme || 'light',
        language: language || 'en',
        emailVerified: true,
        phoneVerified: false
      };
      
      console.log('✅ Enhanced registration successful for user:', username);
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to Hodhod Messenger.',
        token,
        sessionToken,
        user,
        features: {
          aiEnabled: true,
          twinEnabled: true,
          worldBrainEnabled: true,
          storiesEnabled: true,
          callsEnabled: true
        }
      });
    } catch (error) {
      console.error('❌ Enhanced registration error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during registration. Please try again.',
        code: 'SERVER_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Enhanced Login with comprehensive features
  router.post('/login', async (req, res) => {
    try {
      console.log('=== ENHANCED LOGIN REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { email, password, rememberMe, deviceInfo } = req.body;
      
      if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ 
          success: false,
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }
      
      // Find user by email or username with enhanced lookup
      console.log('🔍 Enhanced user lookup for:', email);
      let user = await db.getUserByEmail(email);
      
      if (!user) {
        user = await db.getUserByUsername(email);
      }
      
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email/username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if user is deleted/banned
      if (user.status === 'deleted' || user.status === 'banned') {
        console.log('❌ User account is disabled:', email);
        return res.status(403).json({ 
          success: false,
          message: 'Account is disabled. Please contact support.',
          code: 'ACCOUNT_DISABLED'
        });
      }
      
      console.log('✅ User found:', { id: user.id, username: user.username, email: user.email });
      
      // Enhanced password verification
      console.log('🔐 Verifying password with enhanced security...');
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.log('❌ Password mismatch for user:', email);
        
        // Log failed login attempt
        await db.logEvent(user.id, 'login_failed', {
          reason: 'invalid_password',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email/username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      console.log('✅ Password verified successfully');
      
      // Update user status to online
      await db.updateUserStatus(user.id, true);
      
      // Generate enhanced JWT token
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (rememberMe ? (30 * 24 * 60 * 60) : (7 * 24 * 60 * 60))
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET);
      
      // Create enhanced session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await db.createSession(
        user.id, 
        sessionToken, 
        deviceInfo || req.headers['user-agent'] || 'Unknown',
        req.ip || 'Unknown',
        req.headers['user-agent'] || 'Unknown'
      );
      
      // Log successful login
      await db.logEvent(user.id, 'user_login', {
        loginMethod: 'email',
        rememberMe: !!rememberMe,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Get user settings
      const notificationSettings = JSON.parse(user.notificationSettings || '{}');
      const privacySettings = JSON.parse(user.privacySettings || '{}');
      
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        twinEnabled: user.twinEnabled === 1,
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        status: user.status || 'available',
        theme: user.theme || 'light',
        language: user.language || 'en',
        timezone: user.timezone || 'UTC',
        emailVerified: user.emailVerified === 1,
        phoneVerified: user.phoneVerified === 1,
        twoFactorEnabled: user.twoFactorEnabled === 1,
        premiumUntil: user.premiumUntil,
        lastSeen: user.lastSeen,
        notificationSettings,
        privacySettings
      };
      
      console.log('✅ Enhanced login successful for user:', user.username);
      
      res.json({
        success: true,
        message: `Welcome back, ${user.username}!`,
        token,
        sessionToken,
        user: userData,
        features: {
          aiEnabled: true,
          twinEnabled: true,
          worldBrainEnabled: true,
          storiesEnabled: true,
          callsEnabled: true,
          paymentsEnabled: false,
          encryptionEnabled: true
        }
      });
    } catch (error) {
      console.error('❌ Enhanced login error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during login. Please try again.',
        code: 'SERVER_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Enhanced Token Verification
  router.get('/verify', async (req, res) => {
    try {
      console.log('=== ENHANCED TOKEN VERIFICATION ===');
      const authHeader = req.headers.authorization;
      console.log('Authorization header present:', !!authHeader);
      
      const token = authHeader?.split(' ')[1];
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
          success: false,
          message: 'Authentication token required',
          code: 'NO_TOKEN'
        });
      }
      
      console.log('🔐 Verifying enhanced token...');
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded:', { userId: decoded.userId, username: decoded.username });
      
      const user = await db.getUserById(decoded.userId);
      
      if (!user) {
        console.log('❌ User not found for token');
        return res.status(401).json({ 
          success: false,
          message: 'User account not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.status === 'deleted' || user.status === 'banned') {
        console.log('❌ User account is disabled');
        return res.status(403).json({ 
          success: false,
          message: 'Account is disabled',
          code: 'ACCOUNT_DISABLED'
        });
      }
      
      // Update last activity
      await db.updateUserStatus(user.id, true);
      
      // Get enhanced user data
      const notificationSettings = JSON.parse(user.notificationSettings || '{}');
      const privacySettings = JSON.parse(user.privacySettings || '{}');
      
      console.log('✅ Enhanced token verification successful for user:', user.username);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          twinEnabled: user.twinEnabled === 1,
          phoneNumber: user.phoneNumber || '',
          bio: user.bio || '',
          status: user.status || 'available',
          theme: user.theme || 'light',
          language: user.language || 'en',
          timezone: user.timezone || 'UTC',
          emailVerified: user.emailVerified === 1,
          phoneVerified: user.phoneVerified === 1,
          twoFactorEnabled: user.twoFactorEnabled === 1,
          premiumUntil: user.premiumUntil,
          lastSeen: user.lastSeen,
          notificationSettings,
          privacySettings
        },
        features: {
          aiEnabled: true,
          twinEnabled: true,
          worldBrainEnabled: true,
          storiesEnabled: true,
          callsEnabled: true,
          paymentsEnabled: false,
          encryptionEnabled: true
        }
      });
    } catch (error) {
      console.error('❌ Enhanced token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ 
          success: false,
          message: 'Authentication token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ 
          success: false,
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN'
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Token verification failed',
          code: 'VERIFICATION_ERROR'
        });
      }
    }
  });

  // Enhanced Profile Update
  router.put('/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication token required',
          code: 'NO_TOKEN'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const { bio, phoneNumber, status, theme, language, timezone, notificationSettings, privacySettings } = req.body;
      
      // Validate inputs
      const updateData = {};
      if (bio !== undefined) updateData.bio = bio;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (status !== undefined) updateData.status = status;
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (notificationSettings !== undefined) updateData.notificationSettings = JSON.stringify(notificationSettings);
      if (privacySettings !== undefined) updateData.privacySettings = JSON.stringify(privacySettings);
      
      await db.updateUserProfile(decoded.userId, updateData);
      
      // Log profile update
      await db.logEvent(decoded.userId, 'profile_updated', {
        fields: Object.keys(updateData)
      });
      
      const updatedUser = await db.getUserById(decoded.userId);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          role: updatedUser.role,
          twinEnabled: updatedUser.twinEnabled === 1,
          phoneNumber: updatedUser.phoneNumber || '',
          bio: updatedUser.bio || '',
          status: updatedUser.status || 'available',
          theme: updatedUser.theme || 'light',
          language: updatedUser.language || 'en',
          timezone: updatedUser.timezone || 'UTC',
          emailVerified: updatedUser.emailVerified === 1,
          phoneVerified: updatedUser.phoneVerified === 1,
          notificationSettings: JSON.parse(updatedUser.notificationSettings || '{}'),
          privacySettings: JSON.parse(updatedUser.privacySettings || '{}')
        }
      });
    } catch (error) {
      console.error('❌ Enhanced profile update error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_ERROR'
      });
    }
  });

  // Enhanced Logout
  router.post('/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      const { sessionToken } = req.body;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          
          // Update user status to offline
          await db.updateUserStatus(decoded.userId, false);
          
          // Revoke session if provided
          if (sessionToken) {
            await db.revokeSession(sessionToken);
          }
          
          // Log logout event
          await db.logEvent(decoded.userId, 'user_logout', {
            logoutMethod: 'manual'
          });
          
          console.log('✅ Enhanced logout successful for user:', decoded.username);
        } catch (error) {
          console.log('⚠️ Token invalid during logout, proceeding anyway');
        }
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Enhanced logout error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  });

  // Get User Sessions
  router.get('/sessions', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication token required'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user sessions (implement this method in database)
      const sessions = []; // await db.getUserSessions(decoded.userId);
      
      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('❌ Error getting sessions:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to get sessions'
      });
    }
  });

  // Revoke Session
  router.delete('/sessions/:sessionId', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      const { sessionId } = req.params;
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication token required'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      await db.revokeSession(sessionId);
      
      // Log session revocation
      await db.logEvent(decoded.userId, 'session_revoked', {
        sessionId
      });
      
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to revoke session'
      });
    }
  });

  return router;
}