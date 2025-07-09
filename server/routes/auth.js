import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function authRouter(db) {
  const router = express.Router();

  // Test route
  router.get('/test', (req, res) => {
    console.log('Auth test route accessed');
    res.json({ message: 'Auth router is working!' });
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      console.log('=== REGISTRATION REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Headers:', req.headers);
      
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        console.log('Missing required fields');
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Check if user exists
      console.log('Checking if user exists with email:', email);
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        console.log('User already exists');
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      console.log('Hashing password...');
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      console.log('Creating user...');
      const result = await db.createUser({
        username,
        email,
        passwordHash,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883`
      });
      
      console.log('User created with ID:', result.lastID);
      
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
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883`,
        role: 'user',
        twinEnabled: false
      };
      
      console.log('Registration successful for user:', username);
      
      res.status(201).json({
        message: 'User created successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      console.log('=== LOGIN REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Headers:', req.headers);
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user
      console.log('Looking for user with email:', email);
      const user = await db.getUserByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      console.log('User found:', { id: user.id, username: user.username, email: user.email });
      
      // Check password
      console.log('Checking password...');
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.log('Password mismatch for user:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      console.log('Password verified successfully');
      
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
        twinEnabled: user.twinEnabled
      };
      
      console.log('Login successful for user:', user.username);
      
      res.json({
        message: 'Login successful',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
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
        console.log('No token provided');
        return res.status(401).json({ message: 'No token provided' });
      }
      
      console.log('Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hodhod-secret-key-2024');
      console.log('Token decoded:', decoded);
      
      const user = await db.getUserById(decoded.userId);
      
      if (!user) {
        console.log('User not found for token');
        return res.status(401).json({ message: 'User not found' });
      }
      
      console.log('Token verification successful for user:', user.username);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          twinEnabled: user.twinEnabled
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  });

  return router;
}