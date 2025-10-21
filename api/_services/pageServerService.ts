import sql from '../_lib/db';

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Server-side service for static page management
 * All database operations for pages
 */
export class PageServerService {
  /**
   * Get all pages
   */
  static async getAllPages(publishedOnly: boolean = false): Promise<Page[]> {
    try {
      let query;

      if (publishedOnly) {
        query = await sql`
          SELECT 
            id::text,
            slug,
            title,
            content,
            meta_description as "metaDescription",
            is_published as "isPublished",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM pages
          WHERE is_published = true
          ORDER BY title
        `;
      } else {
        query = await sql`
          SELECT 
            id::text,
            slug,
            title,
            content,
            meta_description as "metaDescription",
            is_published as "isPublished",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM pages
          ORDER BY title
        `;
      }

      return query as unknown as Page[];
    } catch (error) {
      console.error('Error getting all pages:', error);
      return [];
    }
  }

  /**
   * Get page by slug
   */
  static async getPageBySlug(slug: string): Promise<Page | null> {
    try {
      const result = await sql`
        SELECT 
          id::text,
          slug,
          title,
          content,
          meta_description as "metaDescription",
          is_published as "isPublished",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM pages
        WHERE slug = ${slug}
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as Page;
    } catch (error) {
      console.error('Error getting page by slug:', error);
      return null;
    }
  }

  /**
   * Get page by ID
   */
  static async getPageById(pageId: string): Promise<Page | null> {
    try {
      const pageIdInt = parseInt(pageId);

      const result = await sql`
        SELECT 
          id::text,
          slug,
          title,
          content,
          meta_description as "metaDescription",
          is_published as "isPublished",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM pages
        WHERE id = ${pageIdInt}
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as Page;
    } catch (error) {
      console.error('Error getting page by ID:', error);
      return null;
    }
  }

  /**
   * Create page
   */
  static async createPage(data: {
    slug: string;
    title: string;
    content: string;
    metaDescription?: string;
    isPublished?: boolean;
  }): Promise<{ success: boolean; page?: Page; error?: string }> {
    try {
      // Check if slug already exists
      const existing = await sql`
        SELECT id FROM pages WHERE slug = ${data.slug}
      `;

      if (existing.length > 0) {
        return { success: false, error: 'A page with this slug already exists' };
      }

      const result = await sql`
        INSERT INTO pages (
          slug,
          title,
          content,
          meta_description,
          is_published,
          created_at
        ) VALUES (
          ${data.slug},
          ${data.title},
          ${data.content},
          ${data.metaDescription || null},
          ${data.isPublished !== false},
          NOW()
        )
        RETURNING 
          id::text,
          slug,
          title,
          content,
          meta_description as "metaDescription",
          is_published as "isPublished",
          created_at as "createdAt"
      `;

      return {
        success: true,
        page: result[0] as unknown as Page
      };
    } catch (error) {
      console.error('Error creating page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update page
   */
  static async updatePage(
    pageId: string,
    updates: Partial<Omit<Page, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pageIdInt = parseInt(pageId);
      const setClauses = [];

      if (updates.slug !== undefined) {
        // Check if new slug is already taken by another page
        const existing = await sql`
          SELECT id FROM pages WHERE slug = ${updates.slug} AND id != ${pageIdInt}
        `;
        
        if (existing.length > 0) {
          return { success: false, error: 'Slug already in use' };
        }
        
        setClauses.push(`slug = '${updates.slug}'`);
      }

      if (updates.title !== undefined) setClauses.push(`title = '${updates.title}'`);
      if (updates.content !== undefined) setClauses.push(`content = '${updates.content.replace(/'/g, "''")}'`);
      if (updates.metaDescription !== undefined) setClauses.push(`meta_description = '${updates.metaDescription}'`);
      if (updates.isPublished !== undefined) setClauses.push(`is_published = ${updates.isPublished}`);

      if (setClauses.length === 0) {
        return { success: true };
      }

      setClauses.push('updated_at = NOW()');

      await sql.unsafe(`
        UPDATE pages
        SET ${setClauses.join(', ')}
        WHERE id = ${pageIdInt}
      `);

      return { success: true };
    } catch (error) {
      console.error('Error updating page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete page
   */
  static async deletePage(pageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const pageIdInt = parseInt(pageId);

      await sql`
        DELETE FROM pages WHERE id = ${pageIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error deleting page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

