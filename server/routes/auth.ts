import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../database.js';

export function authRouter(db: Database) {
  const router = express.Router();

  // Register
  router.post('/register', async (req, res) => {
    try {
      console.log('Registration attempt:', { username: req.body.username, email: req.body.email });
      
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Check if user exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await db.createUser({
        username,
        email,
        passwordHash,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1F3934&color=F3C883`
      });
      
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
      
      console.log('Registration successful:', { userId: result.lastID, username });
      
      res.status(201).json({
        message: 'User created successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      console.log('Login attempt:', { email: req.body.email });
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user
      const user = await db.getUserByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      console.log('User found:', { id: user.id, username: user.username, email: user.email });
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.log('Password mismatch for user:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
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
      
      console.log('Login successful:', { userId: user.id, username: user.username });
      
      res.json({
        message: 'Login successful',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  // Verify token
  router.get('/verify', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hodhod-secret-key-2024') as any;
      const user = await db.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
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