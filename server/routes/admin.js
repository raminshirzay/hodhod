import express from 'express';

export function adminRouter(db, io) {
  const router = express.Router();

  // Get system stats
  router.get('/stats', async (req, res) => {
    try {
      const stats = await db.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all users
  router.get('/users', async (req, res) => {
    try {
      const users = await db.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update user role
  router.put('/users/:id/role', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      await db.updateUserRole(userId, role);
      res.json({ message: 'User role updated' });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete user
  router.delete('/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await db.deleteUser(userId);
      res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get settings
  router.get('/settings', async (req, res) => {
    try {
      const aiEnabled = await db.getSetting('ai_enabled');
      const stripeEnabled = await db.getSetting('stripe_enabled');
      const maxFileSize = await db.getSetting('max_file_size');
      
      res.json({
        ai_enabled: aiEnabled === 'true',
        stripe_enabled: stripeEnabled === 'true',
        max_file_size: parseInt(maxFileSize || '10485760')
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update settings
  router.put('/settings', async (req, res) => {
    try {
      const { ai_enabled, stripe_enabled, max_file_size, openrouter_api_key } = req.body;
      
      if (ai_enabled !== undefined) {
        await db.setSetting('ai_enabled', ai_enabled.toString());
      }
      if (stripe_enabled !== undefined) {
        await db.setSetting('stripe_enabled', stripe_enabled.toString());
      }
      if (max_file_size !== undefined) {
        await db.setSetting('max_file_size', max_file_size.toString());
      }
      if (openrouter_api_key !== undefined) {
        await db.setSetting('openrouter_api_key', openrouter_api_key);
      }
      
      res.json({ message: 'Settings updated' });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Broadcast message
  router.post('/broadcast', async (req, res) => {
    try {
      const { message } = req.body;
      
      io.emit('admin_broadcast', {
        message,
        timestamp: new Date().toISOString()
      });
      
      res.json({ message: 'Broadcast sent' });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}