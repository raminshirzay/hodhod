import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Globe, Plus, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  id: number;
  question: string;
  askedBy: number;
  askedByUsername: string;
  status: string;
  finalAnswer?: string;
  answerCount: number;
  createdAt: string;
}

interface Answer {
  id: number;
  questionId: number;
  userId: number;
  username: string;
  answer: string;
  votes: number;
  createdAt: string;
}

export const WorldBrainPage: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showNewQuestion, setShowNewQuestion] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      fetchAnswers(selectedQuestion.id);
    }
  }, [selectedQuestion]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/worldbrain/questions');
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchAnswers = async (questionId: number) => {
    try {
      const response = await fetch(`/api/worldbrain/questions/${questionId}/answers`);
      if (response.ok) {
        const data = await response.json();
        setAnswers(data);
      }
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const response = await fetch('/api/worldbrain/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: newQuestion,
          askedBy: user?.id
        })
      });

      if (response.ok) {
        toast.success('Question submitted successfully');
        setNewQuestion('');
        setShowNewQuestion(false);
        fetchQuestions();
      } else {
        toast.error('Failed to submit question');
      }
    } catch (error) {
      toast.error('Failed to submit question');
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim() || !selectedQuestion) return;

    try {
      const response = await fetch(`/api/worldbrain/questions/${selectedQuestion.id}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answer: newAnswer,
          userId: user?.id
        })
      });

      if (response.ok) {
        toast.success('Answer submitted successfully');
        setNewAnswer('');
        fetchAnswers(selectedQuestion.id);
        fetchQuestions(); // Update answer count
      } else {
        toast.error('Failed to submit answer');
      }
    } catch (error) {
      toast.error('Failed to submit answer');
    }
  };

  const handleVote = async (answerId: number, vote: number) => {
    try {
      const response = await fetch(`/api/worldbrain/answers/${answerId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote })
      });

      if (response.ok) {
        toast.success('Vote recorded');
        if (selectedQuestion) {
          fetchAnswers(selectedQuestion.id);
        }
      } else {
        toast.error('Failed to record vote');
      }
    } catch (error) {
      toast.error('Failed to record vote');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                to="/messenger"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Messenger</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Globe className="h-8 w-8 text-[#1F3934]" />
                <h1 className="text-2xl font-bold text-[#1F3934]">World Brain</h1>
              </div>
            </div>
            <button
              onClick={() => setShowNewQuestion(true)}
              className="flex items-center space-x-2 bg-[#1F3934] text-white px-4 py-2 rounded-xl hover:bg-[#2D4A3E] transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Ask Question</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Questions List */}
          <div className="w-1/2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Community Questions</h2>
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => setSelectedQuestion(question)}
                  className={`bg-white rounded-2xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedQuestion?.id === question.id ? 'ring-2 ring-[#F3C883]' : ''
                  }`}
                >
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {question.question}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>by {question.askedByUsername}</span>
                      <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{question.answerCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Details */}
          <div className="w-1/2">
            {selectedQuestion ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {selectedQuestion.question}
                  </h2>
                  <div className="text-sm text-gray-500 mb-4">
                    Asked by {selectedQuestion.askedByUsername} on{' '}
                    {new Date(selectedQuestion.createdAt).toLocaleDateString()}
                  </div>
                  
                  {/* Submit Answer Form */}
                  <form onSubmit={handleSubmitAnswer} className="space-y-4">
                    <textarea
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Share your knowledge..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
                      rows={3}
                    />
                    <button
                      type="submit"
                      className="bg-[#1F3934] text-white px-4 py-2 rounded-xl hover:bg-[#2D4A3E] transition-colors"
                    >
                      Submit Answer
                    </button>
                  </form>
                </div>

                {/* Answers */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Community Answers ({answers.length})
                  </h3>
                  <div className="space-y-4">
                    {answers.map((answer) => (
                      <div key={answer.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <p className="text-gray-900 mb-2">{answer.answer}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            by {answer.username} on {new Date(answer.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVote(answer.id, 1)}
                              className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors"
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{answer.votes > 0 ? answer.votes : ''}</span>
                            </button>
                            <button
                              onClick={() => handleVote(answer.id, -1)}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to World Brain
                </h3>
                <p className="text-gray-500 mb-6">
                  A global knowledge sharing platform where the community's collective intelligence
                  provides answers to your questions.
                </p>
                <button
                  onClick={() => setShowNewQuestion(true)}
                  className="bg-[#1F3934] text-white px-6 py-2 rounded-xl hover:bg-[#2D4A3E] transition-colors"
                >
                  Ask Your First Question
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Question Modal */}
      {showNewQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ask a Question</h2>
            
            <form onSubmit={handleAskQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Question
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What would you like to know?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F3C883]"
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewQuestion(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F3934] text-white rounded-xl hover:bg-[#2D4A3E] transition-colors"
                >
                  Ask Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};