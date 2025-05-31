import sql from '../utils/db';

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  template: 'default' | 'landing' | 'sidebar' | 'full-width';
  status: 'published' | 'draft';
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Ensure the pages table exists
export async function ensurePagesTableExists(): Promise<void> {
  try {
    console.log('✅ Starting to ensure pages table exists...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        template VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Pages table created or already exists');
    
    // Insert default pages if they don't exist
    await ensureDefaultPages();
  } catch (error) {
    console.error('❌ Error ensuring pages table exists:', error);
    throw error;
  }
}

// Insert default pages if they don't exist
async function ensureDefaultPages(): Promise<void> {
  try {
    console.log('✅ Starting to ensure default pages...');
    
    const defaultPages = [
      {
        title: 'Home',
        slug: '/',
        content: '<h1>Welcome to GudCity</h1><p>Your loyalty platform for local businesses.</p>',
        template: 'landing',
        status: 'published',
        is_system: true
      },
      {
        title: 'About Us',
        slug: '/about',
        content: '<h1>About GudCity</h1><p>Learn more about our mission and team.</p>',
        template: 'default',
        status: 'published',
        is_system: false
      },
      {
        title: 'Contact',
        slug: '/contact',
        content: '<h1>Contact Us</h1><p>Get in touch with our support team.</p>',
        template: 'sidebar',
        status: 'published',
        is_system: false
      },
      {
        title: 'Privacy Policy',
        slug: '/privacy',
        content: '<h1>Privacy Policy</h1><p>Our commitment to your privacy.</p>',
        template: 'full-width',
        status: 'published',
        is_system: true
      },
      {
        title: 'Terms of Service',
        slug: '/terms',
        content: '<h1>Terms of Service</h1><p>Please read our terms carefully.</p>',
        template: 'full-width',
        status: 'published',
        is_system: true
      }
    ];
    
    // Check if home page exists
    console.log('✅ Checking if home page exists...');
    const existingHomePage = await sql`
      SELECT * FROM pages WHERE slug = '/'
    `;
    
    console.log('✅ Existing home page check result:', existingHomePage.length);
    
    // Only insert default pages if home page doesn't exist
    if (existingHomePage.length === 0) {
      console.log('✅ Inserting default pages...');
      
      for (const page of defaultPages) {
        console.log(`✅ Inserting page: ${page.title}`);
        try {
          await sql`
            INSERT INTO pages (title, slug, content, template, status, is_system)
            VALUES (${page.title}, ${page.slug}, ${page.content}, ${page.template}, ${page.status}, ${page.is_system})
          `;
          console.log(`✅ Inserted page: ${page.title}`);
        } catch (err) {
          console.error(`❌ Error inserting page ${page.title}:`, err);
        }
      }
      
      console.log('✅ Default pages inserted');
    } else {
      console.log('✅ Default pages already exist, skipping insertion');
    }
  } catch (error) {
    console.error('❌ Error ensuring default pages:', error);
    throw error;
  }
}

// Get all pages
export async function getAllPages(): Promise<Page[]> {
  try {
    console.log('✅ Getting all pages...');
    const pages = await sql`
      SELECT * FROM pages
      ORDER BY created_at DESC
    `;
    
    console.log(`✅ Found ${pages.length} pages`);
    return pages.map(formatPage);
  } catch (error) {
    console.error('❌ Error getting all pages:', error);
    throw error;
  }
}

// Get a page by ID
export async function getPageById(id: number): Promise<Page | null> {
  try {
    const pages = await sql`
      SELECT * FROM pages
      WHERE id = ${id}
    `;
    
    if (pages.length === 0) {
      return null;
    }
    
    return formatPage(pages[0]);
  } catch (error) {
    console.error(`Error getting page with ID ${id}:`, error);
    throw error;
  }
}

// Get a page by slug
export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const pages = await sql`
      SELECT * FROM pages
      WHERE slug = ${slug}
    `;
    
    if (pages.length === 0) {
      return null;
    }
    
    return formatPage(pages[0]);
  } catch (error) {
    console.error(`Error getting page with slug ${slug}:`, error);
    throw error;
  }
}

// Create a new page
export async function createPage(page: Omit<Page, 'id' | 'created_at' | 'updated_at'>): Promise<Page> {
  try {
    // Check if slug already exists
    const existingPage = await getPageBySlug(page.slug);
    if (existingPage) {
      throw new Error(`A page with slug "${page.slug}" already exists`);
    }
    
    const result = await sql`
      INSERT INTO pages (title, slug, content, template, status, is_system)
      VALUES (${page.title}, ${page.slug}, ${page.content}, ${page.template}, ${page.status}, ${page.is_system})
      RETURNING *
    `;
    
    return formatPage(result[0]);
  } catch (error) {
    console.error('Error creating page:', error);
    throw error;
  }
}

// Update an existing page
export async function updatePage(id: number, page: Partial<Omit<Page, 'id' | 'created_at' | 'updated_at'>>): Promise<Page | null> {
  try {
    // Check if the page exists
    const existingPage = await getPageById(id);
    if (!existingPage) {
      return null;
    }
    
    // If slug is being updated, check if the new slug already exists
    if (page.slug && page.slug !== existingPage.slug) {
      const pageWithSlug = await getPageBySlug(page.slug);
      if (pageWithSlug && pageWithSlug.id !== id) {
        throw new Error(`A page with slug "${page.slug}" already exists`);
      }
    }
    
    // Use the actual values or fall back to existing values
    const title = page.title !== undefined ? page.title : existingPage.title;
    const slug = page.slug !== undefined ? page.slug : existingPage.slug;
    const content = page.content !== undefined ? page.content : existingPage.content;
    const template = page.template !== undefined ? page.template : existingPage.template;
    const status = page.status !== undefined ? page.status : existingPage.status;
    const is_system = page.is_system !== undefined ? page.is_system : existingPage.is_system;
    
    // Execute the query with all fields
    const result = await sql`
      UPDATE pages
      SET 
        title = ${title},
        slug = ${slug},
        content = ${content},
        template = ${template},
        status = ${status},
        is_system = ${is_system},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return formatPage(result[0]);
  } catch (error) {
    console.error(`Error updating page with ID ${id}:`, error);
    throw error;
  }
}

// Delete a page
export async function deletePage(id: number): Promise<boolean> {
  try {
    // Check if the page exists and is not a system page
    const existingPage = await getPageById(id);
    if (!existingPage) {
      return false;
    }
    
    if (existingPage.is_system) {
      throw new Error('Cannot delete a system page');
    }
    
    const result = await sql`
      DELETE FROM pages
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting page with ID ${id}:`, error);
    throw error;
  }
}

// Helper function to format page from database
function formatPage(dbPage: any): Page {
  return {
    id: dbPage.id,
    title: dbPage.title,
    slug: dbPage.slug,
    content: dbPage.content,
    template: dbPage.template,
    status: dbPage.status,
    is_system: dbPage.is_system,
    created_at: dbPage.created_at,
    updated_at: dbPage.updated_at
  };
} 