import React, { useState, useEffect } from 'react';

// Enhanced HTML sanitizer with strict security policies
function sanitizeHtml(unsafeHtml: string): string {
  if (!unsafeHtml || typeof unsafeHtml !== 'string') {
    return '';
  }

  try {
    // Try to use DOMPurify if available (most secure option)
    const DOMPurify = (window as any).DOMPurify;
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(unsafeHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress', 'onchange', 'onsubmit'],
        SANITIZE_DOM: true,
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false
      });
    }
  } catch (error) {
    console.warn('DOMPurify sanitization failed:', error);
  }

  // Fallback: Strip all HTML tags and encode special characters
  const div = document.createElement('div');
  div.textContent = unsafeHtml;
  return div.innerHTML;
}
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  FileText,
  Plus,
  Edit,
  Trash,
  Save,
  X,
  Search,
  Globe,
  Eye,
  Copy,
  Layout,
  Layers,
  Home,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { 
  Page, 
  getAllPages, 
  getPageById, 
  createPage, 
  updatePage, 
  deletePage,
  ensurePagesTableExists
} from '../../services/pageService';
import { logSystemActivity } from '../../services/dashboardService';

// Helper function to format DB Page model to component model
const formatPageForComponent = (dbPage: Page): PageModel => {
  return {
    id: dbPage.id,
    title: dbPage.title,
    slug: dbPage.slug,
    content: dbPage.content,
    template: dbPage.template as PageModel['template'],
    status: dbPage.status as PageModel['status'],
    isSystem: dbPage.is_system,
    createdAt: dbPage.created_at,
    updatedAt: dbPage.updated_at
  };
};

// Helper function to format component model to DB model for saving
const formatPageForDb = (page: PageModel): Omit<Page, 'id' | 'created_at' | 'updated_at'> => {
  return {
    title: page.title,
    slug: page.slug,
    content: page.content,
    template: page.template,
    status: page.status,
    is_system: page.isSystem
  };
};

// Types for component pages
interface PageModel {
  id: number;
  title: string;
  slug: string;
  content: string;
  template: 'default' | 'landing' | 'sidebar' | 'full-width';
  status: 'published' | 'draft';
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const PageManager = () => {
  const { t } = useTranslation();
  
  // State
  const [pages, setPages] = useState<PageModel[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageModel | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [seoTitle, setSeoTitle] = useState<string>('');
  const [seoDescription, setSeoDescription] = useState<string>('');
  
  // Page form state
  const [pageForm, setPageForm] = useState<Partial<PageModel>>({
    title: '',
    slug: '',
    content: '',
    template: 'default',
    status: 'draft'
  });
  
  // Load pages from database on component mount
  useEffect(() => {
    (async () => {
      try {
        await ensurePagesTableExists();
      } catch (e) {
        console.warn('Pages table ensure failed (continuing):', e);
      }
      fetchPages();
    })();
  }, []);
  
  // Fetch pages from database
  const fetchPages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dbPages = await getAllPages();
      const formattedPages = dbPages.map(formatPageForComponent);
      
      setPages(formattedPages);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError('Failed to load pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter pages based on search and filters
  const filteredPages = pages.filter(page => {
    const matchesSearch = 
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle page selection for editing
  const handleEditPage = (page: PageModel) => {
    setSelectedPage(page);
    // Extract SEO metadata from content (stored as HTML comment)
    const { meta, cleaned } = extractSeoFromContent(page.content || '');
    setSeoTitle(meta.title || '');
    setSeoDescription(meta.description || '');
    setPageForm({
      ...page,
      content: cleaned
    });
    setIsEditModalOpen(true);
    setHasUnsavedChanges(false);
  };
  
  // Handle new page creation
  const handleCreatePage = () => {
    setSelectedPage(null);
    setSeoTitle('');
    setSeoDescription('');
    setPageForm({
      title: '',
      slug: '',
      content: '',
      template: 'default',
      status: 'draft',
      isSystem: false
    });
    setIsEditModalOpen(true);
    setHasUnsavedChanges(false);
  };
  
  // Handle page save
  const handleSavePage = async () => {
    if (!pageForm.title || !pageForm.slug || !pageForm.content) return;
    
    try {
      setError(null);
      // Inject SEO metadata at top of content as HTML comment
      const contentWithSeo = injectSeoInContent(pageForm.content!, seoTitle, seoDescription);
      
      if (selectedPage) {
        // Update existing page
        const updatedPage = await updatePage(
          selectedPage.id, 
          formatPageForDb({
            ...selectedPage,
            title: pageForm.title!,
            slug: pageForm.slug!,
            content: contentWithSeo,
            template: pageForm.template as PageModel['template'],
            status: pageForm.status as PageModel['status'],
            isSystem: pageForm.isSystem !== undefined ? pageForm.isSystem : selectedPage.isSystem
          })
        );
        
        if (updatedPage) {
          // Log the activity
          await logSystemActivity(
            'page_update',
            `Page "${pageForm.title}" was updated`,
            1, // Assuming admin ID is 1
            'admin'
          );
          
          // Refresh pages
          await fetchPages();
        }
      } else {
        // Create new page
        const newPage = await createPage(
          formatPageForDb({
            id: 0, // This will be ignored by the API
            title: pageForm.title!,
            slug: pageForm.slug!,
            content: contentWithSeo,
            template: pageForm.template as PageModel['template'],
            status: pageForm.status as PageModel['status'],
            isSystem: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        );
        
        if (newPage) {
          // Log the activity
          await logSystemActivity(
            'page_create',
            `Page "${pageForm.title}" was created`,
            1, // Assuming admin ID is 1
            'admin'
          );
          
          // Refresh pages
          await fetchPages();
        }
      }
      
      setIsEditModalOpen(false);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Error saving page:', err);
      setError(err.message || 'Failed to save page. Please try again.');
    }
  };
  
  // Handle page deletion
  const handleDeletePage = async () => {
    if (!selectedPage) return;
    
    try {
      setError(null);
      
      const success = await deletePage(selectedPage.id);
      
      if (success) {
        // Log the activity
        await logSystemActivity(
          'page_delete',
          `Page "${selectedPage.title}" was deleted`,
          1, // Assuming admin ID is 1
          'admin'
        );
        
        // Refresh pages
        await fetchPages();
      }
      
      setIsDeleteModalOpen(false);
      setSelectedPage(null);
    } catch (err: any) {
      console.error('Error deleting page:', err);
      setError(err.message || 'Failed to delete page. Please try again.');
      setIsDeleteModalOpen(false);
    }
  };
  
  // Handle page preview
  const handlePreviewPage = (page: PageModel) => {
    setSelectedPage(page);
    setIsPreviewModalOpen(true);
  };
  
  // Handle slug generation from title
  const handleGenerateSlug = () => {
    if (!pageForm.title) return;
    
    const slug = pageForm.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
      
    setPageForm({
      ...pageForm,
      slug: `/${slug}`
    });
    setHasUnsavedChanges(true);
  };

  // Track unsaved changes on form edits
  const markDirty = () => setHasUnsavedChanges(true);

  // Helpers to embed/extract SEO metadata inside content as HTML comment
  const SEO_BLOCK_START = '<!-- SEO:';
  const SEO_BLOCK_END = '-->';
  function extractSeoFromContent(content: string): { meta: { title?: string; description?: string }, cleaned: string } {
    try {
      const start = content.indexOf(SEO_BLOCK_START);
      const end = content.indexOf(SEO_BLOCK_END, start + 1);
      if (start !== -1 && end !== -1) {
        const jsonText = content.substring(start + SEO_BLOCK_START.length, end).trim();
        const meta = JSON.parse(jsonText) as { title?: string; description?: string };
        const before = content.substring(0, start).trimStart();
        const after = content.substring(end + SEO_BLOCK_END.length).trimStart();
        const cleaned = `${before}\n${after}`.trimStart();
        return { meta, cleaned };
      }
    } catch (_) {}
    return { meta: {}, cleaned: content };
  }
  function injectSeoInContent(content: string, title?: string, description?: string): string {
    const cleaned = extractSeoFromContent(content).cleaned.trimStart();
    const meta: any = {};
    if (title && title.trim().length > 0) meta.title = title.trim();
    if (description && description.trim().length > 0) meta.description = description.trim();
    if (Object.keys(meta).length === 0) return cleaned;
    const block = `${SEO_BLOCK_START} ${JSON.stringify(meta)} ${SEO_BLOCK_END}`;
    return `${block}\n\n${cleaned}`;
  }
  
  // Edit Modal Component
  const EditModal = () => {
    if (!isEditModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedPage ? t('Edit Page') : t('Create New Page')}
            </h2>
            <button 
              onClick={() => setIsEditModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Page Title')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pageForm.title || ''}
                    onChange={e => { setPageForm({...pageForm, title: e.target.value}); markDirty(); }}
                    placeholder={t('Enter page title')}
                    disabled={selectedPage?.isSystem}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Page Slug')} <span className="text-red-500">*</span>
                    </label>
                    {!selectedPage?.isSystem && (
                      <button
                        type="button"
                        onClick={handleGenerateSlug}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {t('Generate from title')}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">{window.location.origin}</span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={pageForm.slug || ''}
                      onChange={e => { setPageForm({...pageForm, slug: e.target.value}); markDirty(); }}
                      placeholder="/page-slug"
                      disabled={selectedPage?.isSystem}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Content')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full h-[300px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    value={pageForm.content || ''}
                    onChange={e => { setPageForm({...pageForm, content: e.target.value}); markDirty(); }}
                    placeholder={t('Enter page content (HTML supported)')}
                    disabled={selectedPage?.isSystem}
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('HTML is supported. Be careful with the markup to avoid breaking the layout.')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Template')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pageForm.template}
                    onChange={e => { setPageForm({...pageForm, template: e.target.value as PageModel['template']}); markDirty(); }}
                    disabled={selectedPage?.isSystem}
                  >
                    <option value="default">{t('Default')}</option>
                    <option value="landing">{t('Landing Page')}</option>
                    <option value="sidebar">{t('With Sidebar')}</option>
                    <option value="full-width">{t('Full Width')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Status')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pageForm.status}
                    onChange={e => { setPageForm({...pageForm, status: e.target.value as PageModel['status']}); markDirty(); }}
                  >
                    <option value="published">{t('Published')}</option>
                    <option value="draft">{t('Draft')}</option>
                  </select>
                </div>

                {/* SEO Metadata embedded in content */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('SEO Metadata')}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">{t('SEO Title')}</label>
                      <input
                        type="text"
                        maxLength={60}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={seoTitle}
                        onChange={(e) => { setSeoTitle(e.target.value); markDirty(); }}
                        placeholder={t('Up to 60 characters')}
                      />
                      <div className="text-xs text-gray-500 mt-1">{seoTitle.length}/60</div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">{t('SEO Description')}</label>
                      <textarea
                        maxLength={160}
                        className="w-full h-[90px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={seoDescription}
                        onChange={(e) => { setSeoDescription(e.target.value); markDirty(); }}
                        placeholder={t('Up to 160 characters')}
                      />
                      <div className="text-xs text-gray-500 mt-1">{seoDescription.length}/160</div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('SEO data is embedded safely inside the page content (no schema changes).')}
                    </p>
                  </div>
                </div>
                
                {selectedPage && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{t('Page Details')}</h3>
                    <p className="text-sm text-gray-600">
                      {t('Created')}: <span className="font-medium">{formatDate(selectedPage.createdAt)}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('Last Updated')}: <span className="font-medium">{formatDate(selectedPage.updatedAt)}</span>
                    </p>
                    {selectedPage.isSystem && (
                      <div className="mt-2 flex items-center">
                        <Globe className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm font-medium text-blue-600">
                          {t('System Page')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">{t('Page Tips')}</h3>
                  <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
                    <li>{t('Use clear, descriptive titles')}</li>
                    <li>{t('Keep URLs short and meaningful')}</li>
                    <li>{t('Preview before publishing')}</li>
                    <li>{t('System pages can be edited with limitations')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              {selectedPage && !selectedPage.isSystem && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('Delete Page')}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePage}
                disabled={!pageForm.title || !pageForm.slug || !pageForm.content || (selectedPage?.isSystem && (pageForm.title !== selectedPage.title || pageForm.slug !== selectedPage.slug))}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('Save Page')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Preview Modal Component
  const PreviewModal = () => {
    if (!isPreviewModalOpen || !selectedPage) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Eye className="w-5 h-5 text-blue-500 mr-2" />
                {t('Page Preview')}: {selectedPage.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {window.location.origin}{selectedPage.slug}
              </p>
            </div>
            <button 
              onClick={() => setIsPreviewModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="border-b border-gray-200 py-2 px-4 bg-gray-50 flex items-center space-x-2 text-sm">
              <span className={`px-2 py-1 rounded ${selectedPage.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {selectedPage.status === 'published' ? t('Published') : t('Draft')}
              </span>
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                {t('Template')}: {selectedPage.template}
              </span>
            </div>
            
            <div className="p-6 bg-white">
              <div className="prose max-w-none">
                {/* Render sanitized HTML safely */}
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedPage.content) }} />
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Delete Confirmation Modal
  const DeleteModal = () => {
    if (!isDeleteModalOpen || !selectedPage) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('Delete Page')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {t('Are you sure you want to delete the page')} <span className="font-semibold">{selectedPage.title}</span>?
                  {selectedPage.isSystem && (
                    <div className="mt-2 text-red-600 font-medium">
                      {t('Warning: This is a system page and deleting it may affect platform functionality.')}
                    </div>
                  )}
                </p>
                
                {error && (
                  <div className="mt-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeletePage}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Delete')}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <FileText className="w-6 h-6 text-blue-500 mr-2" />
              {t('Page Manager')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Create, edit and manage website pages')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchPages}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t('Refresh')}
            </button>
            
            <button
              onClick={handleCreatePage}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('Create Page')}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t('Error')}</p>
              <p>{error}</p>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('Search pages...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">{t('All Status')}</option>
                <option value="published">{t('Published')}</option>
                <option value="draft">{t('Draft')}</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <p className="mt-4 text-gray-600">{t('Loading pages...')}</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Page Title')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('URL')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Template')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Last Updated')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Type')}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">{t('Actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {t('No pages found')}
                      </td>
                    </tr>
                  ) : (
                    filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {page.slug === '/' ? (
                              <Home className="h-4 w-4 text-gray-400 mr-2" />
                            ) : (
                              <FileText className="h-4 w-4 text-gray-400 mr-2" />
                            )}
                            <div className="text-sm font-medium text-gray-900">{page.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-600">{page.slug}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Layout className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">{t(page.template)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {page.status === 'published' ? t('Published') : t('Draft')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(page.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {page.isSystem ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {t('System')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {t('Custom')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handlePreviewPage(page)}
                              className="text-blue-600 hover:text-blue-900"
                              title={t('Preview')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditPage(page)}
                              className="text-blue-600 hover:text-blue-900"
                              title={t('Edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {!page.isSystem && (
                              <button
                                onClick={() => {
                                  setSelectedPage(page);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title={t('Delete')}
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {EditModal()}
      {PreviewModal()}
      {DeleteModal()}
    </AdminLayout>
  );
};

export default PageManager; 