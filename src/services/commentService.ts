import sql from '../utils/db';

export interface Comment {
  id?: number;
  content: string;
  author?: string;
  email?: string;
  createdAt?: Date;
}

export async function getAllComments(): Promise<Comment[]> {
  try {
    const comments = await sql`SELECT * FROM comments ORDER BY created_at DESC`;
    return comments as Comment[];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function getCommentById(id: number): Promise<Comment | null> {
  try {
    const result = await sql.query('SELECT * FROM comments WHERE id = $1', [id]);
    return result[0] as Comment || null;
  } catch (error) {
    console.error(`Error fetching comment with id ${id}:`, error);
    return null;
  }
}

export async function createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment | null> {
  try {
    console.log('Creating comment with content:', comment.content);
    console.log('Author:', comment.author || 'Anonymous');

    // Ensure content is not empty
    if (!comment.content || comment.content.trim() === '') {
      console.error('Comment content cannot be empty');
      return null;
    }

    const result = await sql.query(`
      INSERT INTO comments (content, author, email)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [comment.content, comment.author || 'Anonymous', comment.email || null]);
    
    console.log('Comment created successfully:', result[0]);
    return result[0] as Comment;
  } catch (error) {
    console.error('Error creating comment:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

export async function deleteComment(id: number): Promise<boolean> {
  try {
    await sql.query('DELETE FROM comments WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting comment with id ${id}:`, error);
    return false;
  }
} 