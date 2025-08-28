import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Mail,
  Plus,
  Edit,
  Trash,
  Save,
  X,
  Eye,
  Search,
  Filter,
  Copy,
  CheckCircle
} from 'lucide-react';

// Types for email templates
interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  type: 'notification' | 'marketing' | 'transactional' | 'system';
  variables: string[];
  lastModified: string;
  active: boolean;
  version?: number;
  history?: Array<{ version: number; name: string; subject: string; body: string; variables: string[]; modifiedAt: string }>;
}

// Mock data for email templates
const MOCK_TEMPLATES: EmailTemplate[] = [
  {
    id: 1,
    name: 'Welcome Email',
          subject: 'Welcome to Vcarda!',
    body: `<p>Hello {{userName}},</p>
        <p>Welcome to Vcarda! We\'re excited to have you join our community.</p>
<p>Get started by exploring businesses near you and collecting points with every purchase.</p>
<p>If you have any questions, please don\'t hesitate to contact our support team.</p>
        <p>Best regards,<br/>The Vcarda Team</p>`,
    type: 'system',
    variables: ['userName', 'userEmail'],
    lastModified: '2023-09-10T14:30:00Z',
    active: true
  },
  {
    id: 2,
    name: 'Password Reset',
    subject: 'Reset Your Password',
    body: `<p>Hello {{userName}},</p>
<p>You recently requested to reset your password. Click the button below to set a new password:</p>
<p><a href="{{resetLink}}" style="padding: 10px 15px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
<p>If you didn\'t request this, please ignore this email or contact support if you have concerns.</p>
<p>This link will expire in 24 hours.</p>
        <p>Best regards,<br/>The Vcarda Team</p>`,
    type: 'system',
    variables: ['userName', 'userEmail', 'resetLink'],
    lastModified: '2023-09-12T09:45:00Z',
    active: true
  },
  {
    id: 3,
    name: 'Points Earned Notification',
    subject: 'You\'ve Earned Points!',
    body: `<p>Hello {{userName}},</p>
<p>Great news! You just earned <strong>{{pointsEarned}} points</strong> from your purchase at {{businessName}}.</p>
<p>Transaction details:</p>
<ul>
  <li>Date: {{transactionDate}}</li>
  <li>Amount: \${{transactionAmount}}</li>
  <li>Points earned: {{pointsEarned}}</li>
</ul>
<p>Your current balance is now <strong>{{totalPoints}} points</strong>.</p>
        <p>Thank you for using Vcarda!</p>`,
    type: 'transactional',
    variables: ['userName', 'businessName', 'pointsEarned', 'transactionDate', 'transactionAmount', 'totalPoints'],
    lastModified: '2023-09-15T11:20:00Z',
    active: true
  },
  {
    id: 4,
    name: 'Weekly Promotions',
    subject: 'This Week\'s Special Offers Just For You',
    body: `<p>Hello {{userName}},</p>
<p>Check out these exclusive offers from businesses near you:</p>
<p>{{promotionsList}}</p>
<p>Don\'t miss out on these limited-time offers!</p>
<p><a href="{{appLink}}" style="padding: 10px 15px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">View All Promotions</a></p>
<p>Happy saving!</p>`,
    type: 'marketing',
    variables: ['userName', 'promotionsList', 'appLink'],
    lastModified: '2023-09-16T08:30:00Z',
    active: true
  },
  {
    id: 5,
    name: 'Business Approval',
    subject: 'Your Business Has Been Approved',
    body: `<p>Hello {{businessOwner}},</p>
        <p>We\'re pleased to inform you that your business, <strong>{{businessName}}</strong>, has been approved on the Vcarda platform.</p>
<p>You can now log in to your business dashboard and start setting up your loyalty program.</p>
<p><a href="{{dashboardLink}}" style="padding: 10px 15px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a></p>
<p>If you need any assistance, our support team is here to help.</p>
<p>Welcome aboard!</p>`,
    type: 'notification',
    variables: ['businessOwner', 'businessName', 'dashboardLink'],
    lastModified: '2023-09-14T15:10:00Z',
    active: true
  }
];

const AdminEmailTemplates = () => {
  const { t } = useTranslation();
  
  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>(MOCK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EmailTemplate['type']>('all');
  const [copySuccess, setCopySuccess] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showHistoryFor, setShowHistoryFor] = useState<number | null>(null);
  
  // Template form state
  const [templateForm, setTemplateForm] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    body: '',
    type: 'notification',
    variables: [],
    active: true
  });
  
  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    
    return matchesSearch && matchesType;
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Simple validation per reda.md (non-invasive)
  const validateTemplate = useMemo(() => {
    return (tpl: Partial<EmailTemplate>) => {
      const errors: string[] = [];
      if (!tpl.name || tpl.name.trim().length < 3) errors.push('Name must be at least 3 characters');
      if (!tpl.subject || tpl.subject.trim().length < 3) errors.push('Subject must be at least 3 characters');
      if (!tpl.body || tpl.body.trim().length < 10) errors.push('Body must be at least 10 characters');
      if (tpl.type && !['notification','marketing','transactional','system'].includes(tpl.type)) errors.push('Invalid type');
      // ensure variables present in body are reflected
      const found = extractVariablesFromBody(tpl.body || '');
      const diff = found.filter(v => !(tpl.variables || []).includes(v));
      if (diff.length > 0) {
        // not an error; auto-add during save
      }
      return errors;
    };
  }, []);
  
  // Handle template selection for editing
  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      ...template,
      variables: [...template.variables]
    });
    setIsEditModalOpen(true);
  };
  
  // Handle new template creation
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      name: '',
      subject: '',
      body: '',
      type: 'notification',
      variables: [],
      active: true
    });
    setIsEditModalOpen(true);
  };
  
  // Handle template save
  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) return;
    const errors = validateTemplate(templateForm);
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }
    // Ensure variables sync with body
    const syncedVars = extractVariablesFromBody(templateForm.body);
    
    if (selectedTemplate) {
      // Update existing template
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.id === selectedTemplate.id
            ? { 
                ...template, 
                name: templateForm.name!,
                subject: templateForm.subject!,
                body: templateForm.body!,
                type: templateForm.type as EmailTemplate['type'],
                variables: syncedVars,
                active: templateForm.active || false,
                lastModified: new Date().toISOString(),
                version: (template.version || 1) + 1,
                history: [
                  ...(template.history || []),
                  {
                    version: template.version || 1,
                    name: template.name,
                    subject: template.subject,
                    body: template.body,
                    variables: template.variables,
                    modifiedAt: new Date().toISOString()
                  }
                ]
              }
            : template
        )
      );
    } else {
      // Create new template
      const newTemplate: EmailTemplate = {
        id: Math.max(...templates.map(t => t.id)) + 1,
        name: templateForm.name!,
        subject: templateForm.subject!,
        body: templateForm.body!,
        type: templateForm.type as EmailTemplate['type'],
        variables: syncedVars,
        active: templateForm.active || false,
        lastModified: new Date().toISOString(),
        version: 1,
        history: []
      };
      setTemplates([...templates, newTemplate]);
    }
    
    setIsEditModalOpen(false);
  };
  
  // Handle template deletion
  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;
    
    setTemplates(prevTemplates => prevTemplates.filter(template => template.id !== selectedTemplate.id));
    setIsDeleteModalOpen(false);
    setSelectedTemplate(null);
  };
  
  // Handle template preview
  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };
  
  // Handle variable addition
  const handleAddVariable = (variable: string) => {
    if (!variable.trim() || templateForm.variables?.includes(variable)) return;
    
    setTemplateForm(prev => ({
      ...prev,
      variables: [...(prev.variables || []), variable]
    }));
  };
  
  // Handle variable removal
  const handleRemoveVariable = (variable: string) => {
    setTemplateForm(prev => ({
      ...prev,
      variables: (prev.variables || []).filter(v => v !== variable)
    }));
  };
  
  // Handle copy template
  const handleCopyTemplate = (templateId: number) => {
    const templateToCopy = templates.find(t => t.id === templateId);
    if (!templateToCopy) return;
    
    const newTemplate: EmailTemplate = {
      ...templateToCopy,
      id: Math.max(...templates.map(t => t.id)) + 1,
      name: `${templateToCopy.name} (Copy)`,
      lastModified: new Date().toISOString(),
      version: 1,
      history: []
    };
    
    setTemplates([...templates, newTemplate]);
    
    // Show success message
    setCopySuccess(templateId);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Import/Export
  const exportTemplates = () => {
    try {
      setExporting(true);
      const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-templates-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const importTemplates = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data)) throw new Error('Invalid format');
        const normalized: EmailTemplate[] = data.map((d: any, idx: number) => ({
          id: typeof d.id === 'number' ? d.id : idx + 1000,
          name: String(d.name || '').slice(0, 255),
          subject: String(d.subject || '').slice(0, 255),
          body: String(d.body || ''),
          type: ['notification','marketing','transactional','system'].includes(d.type) ? d.type : 'system',
          variables: Array.isArray(d.variables) ? d.variables.map(String) : extractVariablesFromBody(String(d.body || '')),
          active: Boolean(d.active),
          lastModified: new Date().toISOString(),
          version: Number(d.version) || 1,
          history: Array.isArray(d.history) ? d.history : []
        }));
        setTemplates(normalized);
      } catch (e: any) {
        setImportError(e?.message || 'Failed to import');
      }
    };
    reader.readAsText(file);
  };
  
  // Extract variables from body
  const extractVariablesFromBody = (body: string) => {
    const regex = /{{([^{}]+)}}/g;
    const matches = body.match(regex) || [];
    const variables = matches.map(match => match.replace(/{{|}}/g, ''));
    return [...new Set(variables)]; // Remove duplicates
  };
  
  // Update variables when body changes
  const handleBodyChange = (body: string) => {
    const extractedVariables = extractVariablesFromBody(body);
    
    setTemplateForm(prev => ({
      ...prev,
      body,
      variables: extractedVariables
    }));
  };
  
  // Template type badge component
  const TemplateTypeBadge = ({ type }: { type: EmailTemplate['type'] }) => {
    let bgColor, textColor;
    
    switch (type) {
      case 'notification':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'marketing':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'transactional':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case 'system':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {t(type.charAt(0).toUpperCase() + type.slice(1))}
      </span>
    );
  };
  
  // Edit Modal Component
  const EditModal = () => {
    if (!isEditModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedTemplate ? t('Edit Email Template') : t('Create Email Template')}
            </h2>
            <button 
              onClick={() => setIsEditModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Template Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={templateForm.name || ''}
                    onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder={t('Enter template name')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Subject Line')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={templateForm.subject || ''}
                    onChange={e => setTemplateForm({...templateForm, subject: e.target.value})}
                    placeholder={t('Enter email subject')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Template Type')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={templateForm.type}
                    onChange={e => setTemplateForm({...templateForm, type: e.target.value as EmailTemplate['type']})}
                  >
                    <option value="notification">{t('Notification')}</option>
                    <option value="marketing">{t('Marketing')}</option>
                    <option value="transactional">{t('Transactional')}</option>
                    <option value="system">{t('System')}</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="template-active"
                    checked={templateForm.active || false}
                    onChange={e => setTemplateForm({...templateForm, active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="template-active" className="ml-2 block text-sm text-gray-900">
                    {t('Active')}
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Variables')}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {templateForm.variables?.map(variable => (
                      <div key={variable} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm flex items-center">
                        <span>{`{{${variable}}}`}</span>
                        <button 
                          onClick={() => handleRemoveVariable(variable)}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {t('Variables are automatically extracted from the template body when you use the {{variable}} syntax.')}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Email Body')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full h-[400px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={templateForm.body || ''}
                  onChange={e => handleBodyChange(e.target.value)}
                  placeholder={t('Enter email body (HTML supported)')}
                ></textarea>
                <p className="text-xs text-gray-500 mt-2">
                  {t('Use {{variableName}} syntax to add dynamic content.')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('Delete Template')}
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
                onClick={handleSaveTemplate}
                disabled={!templateForm.name || !templateForm.subject || !templateForm.body}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('Save Template')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Preview Modal Component
  const PreviewModal = () => {
    if (!isPreviewModalOpen || !selectedTemplate) return null;
    
    // Replace variables with example values for preview
    const getPreviewBody = () => {
      let previewBody = selectedTemplate.body;
      
      selectedTemplate.variables.forEach(variable => {
        const placeholder = `{{${variable}}}`;
        const exampleValue = `<span class="bg-yellow-100 px-1 rounded">[${variable}]</span>`;
        previewBody = previewBody.split(placeholder).join(exampleValue);
      });
      
      return previewBody;
    };
    
    // Responsive preview sizes
    const [viewport, setViewport] = useState<'desktop'|'tablet'|'mobile'>('desktop');
    const frameStyle = viewport === 'mobile'
      ? { width: 360, height: 640 }
      : viewport === 'tablet'
      ? { width: 768, height: 1024 }
      : { width: 1024, height: 768 };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {t('Email Preview')}: {selectedTemplate.name}
            </h2>
            <button 
              onClick={() => setIsPreviewModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                {t('Responsive preview')}:
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setViewport('mobile')} className={`px-2 py-1 border rounded text-sm ${viewport==='mobile'?'bg-blue-50 border-blue-300 text-blue-700':'bg-white'}`}>Mobile</button>
                <button onClick={()=>setViewport('tablet')} className={`px-2 py-1 border rounded text-sm ${viewport==='tablet'?'bg-blue-50 border-blue-300 text-blue-700':'bg-white'}`}>Tablet</button>
                <button onClick={()=>setViewport('desktop')} className={`px-2 py-1 border rounded text-sm ${viewport==='desktop'?'bg-blue-50 border-blue-300 text-blue-700':'bg-white'}`}>Desktop</button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mx-auto" style={{ width: frameStyle.width, height: frameStyle.height }}>
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-800">
                  <span className="font-semibold">{t('Subject')}:</span> {selectedTemplate.subject}
                </div>
              </div>
              
              <div className="p-6 bg-white overflow-auto" style={{ height: frameStyle.height - 42 }}>
                <div 
                  className="prose max-w-none" 
                  dangerouslySetInnerHTML={{ __html: getPreviewBody() }}
                ></div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('Template Variables')}</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.variables.map(variable => (
                  <div key={variable} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm">
                    {`{{${variable}}}`}
                  </div>
                ))}
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
    if (!isDeleteModalOpen || !selectedTemplate) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('Delete Email Template')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {t('Are you sure you want to delete the template')} <span className="font-semibold">{selectedTemplate.name}</span>?
                  {selectedTemplate.type === 'system' && (
                    <div className="mt-2 text-red-600 font-medium">
                      {t('Warning: This is a system template and deleting it may affect platform functionality.')}
                    </div>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeleteTemplate}
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
              <Mail className="w-6 h-6 text-blue-500 mr-2" />
              {t('Email Templates')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage email templates for system notifications and marketing')}
            </p>
          </div>
          
          <button
            onClick={handleCreateTemplate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Create Template')}
          </button>
        </div>
        
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
                  placeholder={t('Search templates...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">{t('All Types')}</option>
                <option value="notification">{t('Notification')}</option>
                <option value="marketing">{t('Marketing')}</option>
                <option value="transactional">{t('Transactional')}</option>
                <option value="system">{t('System')}</option>
              </select>
              
              <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 hidden sm:block">
                <Filter className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportTemplates}
                  disabled={exporting}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
                >
                  {t('Export JSON')}
                </button>
                <label className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 cursor-pointer">
                  {t('Import JSON')}
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importTemplates(f);
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          {importError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border-t border-red-200">{importError}</div>
          )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Template Name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Subject')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Type')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Variables')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Last Modified')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Status')}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t('Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      {t('No templates found')}
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-1">{template.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TemplateTypeBadge type={template.type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {template.variables.slice(0, 3).map(variable => (
                            <span key={variable} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {variable}
                            </span>
                          ))}
                          {template.variables.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              +{template.variables.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(template.lastModified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.active ? t('Active') : t('Inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                        <span className="text-xs text-gray-500">v{template.version || 1}</span>
                          <button
                            onClick={() => handlePreviewTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('Preview')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('Edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => handleCopyTemplate(template.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title={t('Duplicate')}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {copySuccess === template.id && (
                              <div className="absolute top-0 right-6 whitespace-nowrap bg-green-100 text-green-800 text-xs px-2 py-1 rounded flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t('Copied')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={t('Delete')}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
      
      {/* Modals */}
      <EditModal />
      <PreviewModal />
      <DeleteModal />
    </AdminLayout>
  );
};

export default AdminEmailTemplates; 