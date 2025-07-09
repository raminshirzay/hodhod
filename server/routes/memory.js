import express from 'express';

export function memoryRouter(db) {
  const router = express.Router();

  // Search memory
  router.get('/search', async (req, res) => {
    try {
      const { query, userId } = req.query;
      
      if (!query || !userId) {
        return res.status(400).json({ message: 'Query and userId required' });
      }
      
      const results = await db.searchMemory(parseInt(userId), query);
      res.json(results);
    } catch (error) {
      console.error('Memory search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  return router;
}