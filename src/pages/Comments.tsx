import React, { useState } from 'react';
import { CommentForm } from '../components/CommentForm';
import { CommentList } from '../components/CommentList';

const CommentsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCommentAdded = () => {
    // Increment to trigger useEffect in CommentList
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Comments</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <CommentForm onCommentAdded={handleCommentAdded} />
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recent Comments</h2>
            <CommentList refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPage; 