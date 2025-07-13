import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function authRouter(db) {
  const router = express.Router();

  // Test route
  router.get('/test', (req, res) => {
    console.log('✅ Auth test route accessed');
    res.json({ 
      message: 'Auth router is working!', 
      timestamp: new Date().toISOString(),
      status: 'ok'
    });
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      console.log('=== REGISTRATION REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Headers:', req.headers);
      
      const { username, email, password, phoneNumber, bio } = req.body;
      
      // Validation
      if (!username || !email || !password) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          success: false,
          message: 'Username, email, and password are required' 
        });
      }

      if (password.length < 3) {
        console.log('❌ Password too short');
        return res.status(400).json({ 
          success: false,
          message: 'Password must be at least 3 characters long' 
        });
      }
      
      // Check if user exists by email
      console.log('🔍 Checking if user exists with email:', email);
      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log('❌ User already exists with email');
        return res.status(400).json({ 
          success: false,
          message: 'User already exists with this email' 
        });
      }

      // Check if user exists by username
      console.log('🔍 Checking if user exists with username:', username);
      const existingUserByUsername = await db.getUserByUsername(username);
      if (existingUserByUsername) {
        console.log('❌ User already exists with username');
        return res.status(400).json({ 
          success: false,
          message: 'User already exists with this username' 
        });
      }
      
      // Hash password
      console.log('🔐 Hashing password...');
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      console.log('👤 Creating user...');
      const result = await db.createUser({
        username,
        email,
        passwordHash,
        phoneNumber: phoneNumber || '',
        bio: bio || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883&size=128`
      });
      
      console.log('✅ User created with ID:', result.lastID);
      
      // Generate token
      const token = jwt.sign(
        { userId: result.lastID },
        process.env.JWT_SECRET || 'hodhod-secret-key-2024',
        { expiresIn: '7d' }
      );
      
      const user = {
        id: result.lastID,
        username,
        email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883&size=128`,
        role: 'user',
        twinEnabled: false,
        phoneNumber: phoneNumber || '',
        bio: bio || '',
        status: 'available'
      };
      
      console.log('✅ Registration successful for user:', username);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      console.log('=== LOGIN REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Headers:', req.headers);
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ 
          success: false,
          message: 'Email and password are required' 
        });
      }
      
      // Find user by email or username
      console.log('🔍 Looking for user with email/username:', email);
      let user = await db.getUserByEmail(email);
      
      // If not found by email, try username
      if (!user) {
        user = await db.getUserByUsername(email);
      }
      
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }
      
      console.log('✅ User found:', { id: user.id, username: user.username, email: user.email });
      
      // Check password
      console.log('🔐 Checking password...');
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.log('❌ Password mismatch for user:', email);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }
      
      console.log('✅ Password verified successfully');
      
      // Update user status to online
      await db.updateUserStatus(user.id, true);
      
      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'hodhod-secret-key-2024',
        { expiresIn: '7d' }
      );
      
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        twinEnabled: user.twinEnabled === 1,
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        status: user.status || 'available'
      };
      
      console.log('✅ Login successful for user:', user.username);
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userData
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Verify token
  router.get('/verify', async (req, res) => {
    try {
      console.log('=== TOKEN VERIFICATION ===');
      const authHeader = req.headers.authorization;
      console.log('Authorization header:', authHeader);
      
      const token = authHeader?.split(' ')[1];
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }
      
      console.log('🔐 Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hodhod-secret-key-2024');
      console.log('✅ Token decoded:', decoded);
      
      const user = await db.getUserById(decoded.userId);
      
      if (!user) {
        console.log('❌ User not found for token');
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      console.log('✅ Token verification successful for user:', user.username);
      
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
          status: user.status || 'available'
        }
      });
    } catch (error) {
      console.error('❌ Token verification error:', error);
      res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
  });

  // Update profile
  router.put('/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hodhod-secret-key-2024');
      const { bio, phoneNumber, status } = req.body;
      
      await db.updateUserProfile(decoded.userId, {
        bio,
        phoneNumber,
        status
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
          status: updatedUser.status || 'available'
        }
      });
    } catch (error) {
      console.error('❌ Profile update error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update profile' 
      });
    }
  });

  return router;
}