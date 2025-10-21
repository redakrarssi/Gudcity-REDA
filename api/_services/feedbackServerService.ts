import sql from '../_lib/db';

export interface FeedbackData {
  id?: string;
  userId?: string;
  rating: number;
  comment?: string;
  category?: string;
  page?: string;
  timestamp: Date;
}

export interface FeedbackStats {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentFeedback: FeedbackData[];
}

/**
 * Server-side service for handling feedback
 * All database operations for feedback management
 */
export class FeedbackServerService {
  /**
   * Submit feedback
   */
  static async submitFeedback(data: {
    userId?: string;
    rating: number;
    comment?: string;
    category?: string;
    page?: string;
  }): Promise<{ success: boolean; feedback?: FeedbackData; error?: string }> {
    try {
      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      const userIdInt = data.userId ? parseInt(data.userId) : null;

      const result = await sql`
        INSERT INTO feedback (
          user_id,
          rating,
          comment,
          category,
          page,
          created_at
        ) VALUES (
          ${userIdInt},
          ${data.rating},
          ${data.comment || null},
          ${data.category || 'general'},
          ${data.page || null},
          NOW()
        )
        RETURNING 
          id::text,
          user_id::text as "userId",
          rating,
          comment,
          category,
          page,
          created_at as timestamp
      `;

      return {
        success: true,
        feedback: result[0] as unknown as FeedbackData
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all feedback
   */
  static async getAllFeedback(limit: number = 100): Promise<FeedbackData[]> {
    try {
      const result = await sql`
        SELECT 
          id::text,
          user_id::text as "userId",
          rating,
          comment,
          category,
          page,
          created_at as timestamp
        FROM feedback
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result as unknown as FeedbackData[];
    } catch (error) {
      console.error('Error getting feedback:', error);
      return [];
    }
  }

  /**
   * Get feedback statistics
   */
  static async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const stats = await sql`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as total_feedback,
          COUNT(*) FILTER (WHERE rating = 1) as rating_1,
          COUNT(*) FILTER (WHERE rating = 2) as rating_2,
          COUNT(*) FILTER (WHERE rating = 3) as rating_3,
          COUNT(*) FILTER (WHERE rating = 4) as rating_4,
          COUNT(*) FILTER (WHERE rating = 5) as rating_5
        FROM feedback
      `;

      const recent = await sql`
        SELECT 
          id::text,
          user_id::text as "userId",
          rating,
          comment,
          category,
          page,
          created_at as timestamp
        FROM feedback
        ORDER BY created_at DESC
        LIMIT 10
      `;

      return {
        averageRating: parseFloat(stats[0].average_rating) || 0,
        totalFeedback: parseInt(stats[0].total_feedback) || 0,
        ratingDistribution: {
          1: parseInt(stats[0].rating_1) || 0,
          2: parseInt(stats[0].rating_2) || 0,
          3: parseInt(stats[0].rating_3) || 0,
          4: parseInt(stats[0].rating_4) || 0,
          5: parseInt(stats[0].rating_5) || 0
        },
        recentFeedback: recent as unknown as FeedbackData[]
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return {
        averageRating: 0,
        totalFeedback: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentFeedback: []
      };
    }
  }

  /**
   * Get feedback by category
   */
  static async getFeedbackByCategory(category: string, limit: number = 50): Promise<FeedbackData[]> {
    try {
      const result = await sql`
        SELECT 
          id::text,
          user_id::text as "userId",
          rating,
          comment,
          category,
          page,
          created_at as timestamp
        FROM feedback
        WHERE category = ${category}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return result as unknown as FeedbackData[];
    } catch (error) {
      console.error('Error getting feedback by category:', error);
      return [];
    }
  }

  /**
   * Get feedback by user
   */
  static async getFeedbackByUser(userId: string): Promise<FeedbackData[]> {
    try {
      const userIdInt = parseInt(userId);

      const result = await sql`
        SELECT 
          id::text,
          user_id::text as "userId",
          rating,
          comment,
          category,
          page,
          created_at as timestamp
        FROM feedback
        WHERE user_id = ${userIdInt}
        ORDER BY created_at DESC
      `;

      return result as unknown as FeedbackData[];
    } catch (error) {
      console.error('Error getting feedback by user:', error);
      return [];
    }
  }
}

