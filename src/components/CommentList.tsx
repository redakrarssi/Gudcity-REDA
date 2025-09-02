import React, { useEffect, useState } from 'react';
import { Comment, getAllComments, deleteComment } from '../services/commentService';

interface CommentListProps {
  refreshKey?: number;
}

export const CommentList: React.FC<CommentListProps> = ({ refreshKey = 0 }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllComments();
      setComments(data);
    } catch (err) {
      setError('Failed to load comments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [refreshKey]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const success = await deleteComment(id);
        if (success) {
          setComments(comments.filter(comment => comment.id !== id));
        } else {
          setError('Failed to delete comment');
        }
      } catch (err) {
        setError('An error occurred while deleting the comment');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading comments...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        {error}
        <button 
          onClick={loadComments}
          className="ml-4 text-blue-600 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return <div className="text-center p-4 text-gray-500">No comments yet. Be the first to comment!</div>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">
                {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Recently'}
              </p>
            </div>
            <button
              onClick={() => comment.id && handleDelete(comment.id)}
              className="text-gray-400 hover:text-red-500"
            >
              &times;
            </button>
          </div>
          <div className="mt-2 text-gray-700 whitespace-pre-wrap">{comment.content}</div>
        </div>
      ))}
    </div>
  );
}; 