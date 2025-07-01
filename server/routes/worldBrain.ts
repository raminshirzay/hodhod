import express from 'express';
import { Database } from '../database.js';

export function worldBrainRouter(db: Database) {
  const router = express.Router();

  // Get all questions
  router.get('/questions', async (req, res) => {
    try {
      const questions = await db.getWorldBrainQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create question
  router.post('/questions', async (req, res) => {
    try {
      const { question, askedBy } = req.body;
      const result = await db.createWorldBrainQuestion(question, askedBy);
      res.status(201).json({ id: result.lastID, message: 'Question created' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get question answers
  router.get('/questions/:id/answers', async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const answers = await db.getQuestionAnswers(questionId);
      res.json(answers);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Submit answer
  router.post('/questions/:id/answers', async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const { answer, userId } = req.body;
      
      await db.addWorldBrainAnswer(questionId, userId, answer);
      res.status(201).json({ message: 'Answer submitted' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Vote on answer
  router.post('/answers/:id/vote', async (req, res) => {
    try {
      const answerId = parseInt(req.params.id);
      const { vote } = req.body; // 1 for upvote, -1 for downvote
      
      await db.voteAnswer(answerId, vote);
      res.json({ message: 'Vote recorded' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}