import express from 'express';
import { Database } from '../database.js';

export function memoryRouter(db: Database) {
  const router = express.Router();

  // Search memory
  router.get('/search', async (req, res) => {
    try {
      const { query, userId } = req.query;
      
      if (!query || !userId) {
        return res.status(400).json({ message: 'Query and userId required' });
      }
      
      const results = await db.searchMemory(parseInt(userId as string), query as string);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Search failed' });
    }
  });

  return router;
}