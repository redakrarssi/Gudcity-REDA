import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { getPageBySlug, Page } from '../services/pageService';

function sanitizeHtml(unsafeHtml: string): string {
  try {
    const DOMPurify: any = (window as any).DOMPurify;
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(unsafeHtml);
    }
  } catch {}
  const div = document.createElement('div');
  div.textContent = unsafeHtml || '';
  return div.innerHTML;
}

function extractSeo(content: string): { title?: string; description?: string } {
  const startToken = '<!-- SEO:';
  const endToken = '-->';
  try {
    const start = content.indexOf(startToken);
    const end = content.indexOf(endToken, start + 1);
    if (start !== -1 && end !== -1) {
      const jsonText = content.substring(start + startToken.length, end).trim();
      const meta = JSON.parse(jsonText) as { title?: string; description?: string };
      return meta;
    }
  } catch {}
  return {};
}

const reservedPrefixes = ['/admin', '/business', '/api', '/access-admin'];

const DynamicDbPage: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const normalizedSlug = useMemo(() => {
    let s = pathname || '/';
    if (!s.startsWith('/')) s = '/' + s;
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
    return s;
  }, [pathname]);

  useEffect(() => {
    // guard reserved paths
    if (reservedPrefixes.some(p => normalizedSlug.startsWith(p))) {
      setPage(null);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const dbPage = await getPageBySlug(normalizedSlug);
        setPage(dbPage);
      } catch (e: any) {
        setError(e?.message || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    })();
  }, [normalizedSlug]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-gray-600">{t('Loading...')}</div>
        </div>
      </Layout>
    );
  }

  if (!page || page.status !== 'published') {
    // Fallback 404 UI
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <h1 className="text-4xl font-bold mb-4">{t('404: Page Not Found')}</h1>
          <p className="mb-8">{t('The page you are looking for does not exist.')}</p>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {t('Go to Home')}
          </a>
        </div>
      </Layout>
    );
  }

  const meta = extractSeo(page.content || '');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content || '') }} />
        </div>
      </div>
    </Layout>
  );
};

export default DynamicDbPage;

