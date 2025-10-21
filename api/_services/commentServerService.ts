import sql from '../_lib/db';

export interface Comment {
  id: string;
  userId: string;
  userName?: string;
  resourceType: 'business' | 'program' | 'reward' | 'transaction';
  resourceId: string;
  content: string;
  rating?: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Server-side service for comments and reviews
 * All database operations for comment management
 */
export class CommentServerService {
  /**
   * Create comment
   */
  static async createComment(data: {
    userId: string;
    resourceType: Comment['resourceType'];
    resourceId: string;
    content: string;
    rating?: number;
    isPublic?: boolean;
  }): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
      const userIdInt = parseInt(data.userId);
      const resourceIdInt = parseInt(data.resourceId);

      // Validate rating if provided
      if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      const result = await sql`
        INSERT INTO comments (
          user_id,
          resource_type,
          resource_id,
          content,
          rating,
          is_public,
          created_at
        ) VALUES (
          ${userIdInt},
          ${data.resourceType},
          ${resourceIdInt},
          ${data.content},
          ${data.rating || null},
          ${data.isPublic !== false},
          NOW()
        )
        RETURNING 
          id::text,
          user_id::text as "userId",
          resource_type as "resourceType",
          resource_id::text as "resourceId",
          content,
          rating,
          is_public as "isPublic",
          created_at as "createdAt"
      `;

      // Get user name
      const user = await sql`SELECT name FROM users WHERE id = ${userIdInt}`;

      return {
        success: true,
        comment: {
          ...result[0],
          userName: user[0]?.name
        } as unknown as Comment
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comments for a resource
   */
  static async getResourceComments(
    resourceType: Comment['resourceType'],
    resourceId: string,
    publicOnly: boolean = true
  ): Promise<Comment[]> {
    try {
      const resourceIdInt = parseInt(resourceId);

      let query;
      if (publicOnly) {
        query = await sql`
          SELECT 
            c.id::text,
            c.user_id::text as "userId",
            u.name as "userName",
            c.resource_type as "resourceType",
            c.resource_id::text as "resourceId",
            c.content,
            c.rating,
            c.is_public as "isPublic",
            c.created_at as "createdAt",
            c.updated_at as "updatedAt"
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.resource_type = ${resourceType}
          AND c.resource_id = ${resourceIdInt}
          AND c.is_public = true
          ORDER BY c.created_at DESC
        `;
      } else {
        query = await sql`
          SELECT 
            c.id::text,
            c.user_id::text as "userId",
            u.name as "userName",
            c.resource_type as "resourceType",
            c.resource_id::text as "resourceId",
            c.content,
            c.rating,
            c.is_public as "isPublic",
            c.created_at as "createdAt",
            c.updated_at as "updatedAt"
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.resource_type = ${resourceType}
          AND c.resource_id = ${resourceIdInt}
          ORDER BY c.created_at DESC
        `;
      }

      return query as unknown as Comment[];
    } catch (error) {
      console.error('Error getting resource comments:', error);
      return [];
    }
  }

  /**
   * Get user comments
   */
  static async getUserComments(userId: string): Promise<Comment[]> {
    try {
      const userIdInt = parseInt(userId);

      const result = await sql`
        SELECT 
          c.id::text,
          c.user_id::text as "userId",
          u.name as "userName",
          c.resource_type as "resourceType",
          c.resource_id::text as "resourceId",
          c.content,
          c.rating,
          c.is_public as "isPublic",
          c.created_at as "createdAt",
          c.updated_at as "updatedAt"
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ${userIdInt}
        ORDER BY c.created_at DESC
      `;

      return result as unknown as Comment[];
    } catch (error) {
      console.error('Error getting user comments:', error);
      return [];
    }
  }

  /**
   * Update comment
   */
  static async updateComment(
    commentId: string,
    userId: string,
    updates: { content?: string; rating?: number; isPublic?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const commentIdInt = parseInt(commentId);
      const userIdInt = parseInt(userId);

      // Verify ownership
      const comment = await sql`
        SELECT user_id FROM comments WHERE id = ${commentIdInt}
      `;

      if (comment.length === 0) {
        return { success: false, error: 'Comment not found' };
      }

      if (comment[0].user_id !== userIdInt) {
        return { success: false, error: 'Unauthorized' };
      }

      const setClauses = [];
      if (updates.content !== undefined) setClauses.push(`content = '${updates.content}'`);
      if (updates.rating !== undefined) setClauses.push(`rating = ${updates.rating}`);
      if (updates.isPublic !== undefined) setClauses.push(`is_public = ${updates.isPublic}`);

      if (setClauses.length === 0) {
        return { success: true };
      }

      setClauses.push('updated_at = NOW()');

      await sql.unsafe(`
        UPDATE comments
        SET ${setClauses.join(', ')}
        WHERE id = ${commentIdInt}
      `);

      return { success: true };
    } catch (error) {
      console.error('Error updating comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete comment
   */
  static async deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const commentIdInt = parseInt(commentId);
      const userIdInt = parseInt(userId);

      // Verify ownership
      const comment = await sql`
        SELECT user_id FROM comments WHERE id = ${commentIdInt}
      `;

      if (comment.length === 0) {
        return { success: false, error: 'Comment not found' };
      }

      if (comment[0].user_id !== userIdInt) {
        return { success: false, error: 'Unauthorized' };
      }

      await sql`
        DELETE FROM comments WHERE id = ${commentIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get average rating for a resource
   */
  static async getResourceRating(
    resourceType: Comment['resourceType'],
    resourceId: string
  ): Promise<{ averageRating: number; totalRatings: number }> {
    try {
      const resourceIdInt = parseInt(resourceId);

      const result = await sql`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(rating) as total_ratings
        FROM comments
        WHERE resource_type = ${resourceType}
        AND resource_id = ${resourceIdInt}
        AND rating IS NOT NULL
        AND is_public = true
      `;

      return {
        averageRating: parseFloat(result[0].average_rating) || 0,
        totalRatings: parseInt(result[0].total_ratings) || 0
      };
    } catch (error) {
      console.error('Error getting resource rating:', error);
      return { averageRating: 0, totalRatings: 0 };
    }
  }
}

