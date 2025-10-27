import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgramBuilder } from '../../components/business/ProgramBuilder';
import { ProgramDeleteModal } from '../../components/business/ProgramDeleteModal';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { Plus, Award, Calendar, Tag, Clock, ChevronRight, X } from 'lucide-react';
import type { LoyaltyProgram } from '../../types/loyalty';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';
import { DeleteButton, PermissionGate, RestrictedFeatureNotice } from '../../components/common/PermissionGate';
import { PERMISSIONS, isBusinessOwner, hasPermission } from '../../utils/permissions';
import { getBusinessIdString } from '../../utils/businessContext';
// Do not check DB connection from browser in production; rely on API
import { ProductionSafeService } from '../../utils/productionApiClient';

const Programs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatAmount } = useBusinessCurrency();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<LoyaltyProgram | null>(null);
  const [enrolledCustomersCount, setEnrolledCustomersCount] = useState<number>(0);
  
  // Add this useEffect to ensure browser object is defined for this page
  useEffect(() => {
    // Ensure browser is defined to prevent "browser is not defined" errors
    if (typeof window !== 'undefined' && !window.browser) {
      console.log('Applying browser polyfill in Programs component');
      window.browser = window.browser || {
        runtime: { 
          sendMessage: function() { return Promise.resolve(); }, 
          onMessage: { addListener: function() {}, removeListener: function() {} },
          getManifest: function() { return {}; },
          getURL: function(path) { return path; }
        },
        storage: { 
          local: { get: function() { return Promise.resolve({}); }, set: function() { return Promise.resolve(); }, remove: function() { return Promise.resolve(); } },
          sync: { get: function() { return Promise.resolve({}); }, set: function() { return Promise.resolve(); }, remove: function() { return Promise.resolve(); } }
        },
        tabs: {
          query: function() { return Promise.resolve([]); }
        }
      };
    }
    
    // Detect and disable extension scripts causing errors
    const disableErrorScripts = () => {
      const scripts = document.querySelectorAll('script');
      for (const script of Array.from(scripts)) {
        if (script.src && (
          script.src.includes('content.js') || 
          script.src.includes('checkPageManual.js') || 
          script.src.includes('overlays.js')
        )) {
          console.log('Removing problematic script:', script.src);
          script.remove();
        }
      }
    };
    
    disableErrorScripts();
  }, []);

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use the business ID from the logged-in user (or their business owner if staff)
        const businessId = getBusinessIdString(user);
        const programsData = await LoyaltyProgramService.getBusinessPrograms(businessId);
        setPrograms(programsData);
      } catch (err) {
        console.error('Error loading loyalty programs:', err);
        setError(t('business.Failed to load loyalty programs. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    
    loadPrograms();
  }, [user, t]);

  const handleProgramDeleteClick = async (program: LoyaltyProgram) => {
    try {
      // Get enrolled customers count before showing the modal
      const enrolledCustomers = await LoyaltyProgramService.getEnrolledCustomers(program.id);
      setEnrolledCustomersCount(enrolledCustomers.length);
      
      setProgramToDelete(program);
      setShowDeleteModal(true);
    } catch (err) {
      console.error('Error getting enrolled customers count:', err);
      // Still show the modal even if we can't get the count
      setEnrolledCustomersCount(0);
      setProgramToDelete(program);
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!programToDelete) return;
    
    try {
      setError(null);
      const success = await LoyaltyProgramService.deleteProgram(programToDelete.id);
      
      if (success) {
        setPrograms(programs.filter((program) => program.id !== programToDelete.id));
        setShowDeleteModal(false);
        setProgramToDelete(null);
      } else {
        setError(t('business.Failed to delete program. Please try again.'));
      }
    } catch (err) {
      console.error('Error deleting program:', err);
      setError(t('business.An error occurred while deleting the program.'));
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setProgramToDelete(null);
    setEnrolledCustomersCount(0);
  };

  const handleProgramEdit = (program: LoyaltyProgram) => {
    // SECURITY: Check if user has permission to edit programs - REDA.MD COMPLIANCE
    if (!hasPermission(user, PERMISSIONS.PROGRAMS_EDIT)) {
      console.error('🔒 SECURITY: User attempted to edit program without permission', {
        userId: user?.id,
        userRole: user?.role,
        userPermissions: user?.permissions,
        attemptedAction: 'program_edit',
        programId: program.id
      });
      
      setError('❌ Access Denied: You do not have permission to edit programs. Please contact your business owner for access.');
      return;
    }

    console.log('✅ SECURITY: Program edit permission verified for user', {
      userId: user?.id,
      userRole: user?.role,
      programId: program.id
    });

    setSelectedProgram(program);
    setShowProgramBuilder(true);
  };

  const handleProgramSubmit = async (program: Partial<LoyaltyProgram>) => {
    setError(null);
    
    try {
      if (selectedProgram) {
        // SECURITY: Check if user has permission to edit programs - REDA.MD COMPLIANCE
        if (!hasPermission(user, PERMISSIONS.PROGRAMS_EDIT)) {
          console.error('🔒 SECURITY: User attempted to update program without permission', {
            userId: user?.id,
            userRole: user?.role,
            userPermissions: user?.permissions,
            attemptedAction: 'program_update',
            programId: selectedProgram.id
          });
          
          setError('❌ Access Denied: You do not have permission to update programs. Please contact your business owner for access.');
          return;
        }

        console.log('✅ SECURITY: Program update permission verified for user', {
          userId: user?.id,
          userRole: user?.role,
          programId: selectedProgram.id
        });

        // Update existing program
        const updatedProgram = await LoyaltyProgramService.updateProgram(
          selectedProgram.id,
          program
        );
        
        if (updatedProgram) {
          setPrograms(programs.map((p) => 
            p.id === selectedProgram.id ? updatedProgram : p
          ));
          setShowProgramBuilder(false);
          setSelectedProgram(null);
          
          console.log('✅ SECURITY: Program updated successfully by authorized user', {
            userId: user?.id,
            programId: selectedProgram.id
          });
        } else {
          setError(t('business.Failed to update program. Please try again.'));
        }
      } else {
        // SECURITY: Check if user has permission to create programs - REDA.MD COMPLIANCE
        if (!hasPermission(user, PERMISSIONS.PROGRAMS_CREATE)) {
          console.error('🔒 SECURITY: User attempted to create program without permission', {
            userId: user?.id,
            userRole: user?.role,
            userPermissions: user?.permissions,
            attemptedAction: 'program_create'
          });
          
          setError('❌ Access Denied: You do not have permission to create programs. Only business owners can create new loyalty programs.');
          return;
        }

        console.log('✅ SECURITY: Program creation permission verified for user', {
          userId: user?.id,
          userRole: user?.role
        });

        // Create new program
        // Validate business ID is available
        const businessId = user?.id?.toString();
        
        if (!businessId) {
          console.error('No business ID available for program creation');
          setError(t('business.Could not create program: Missing business information'));
          return;
        }
        
        console.log('Creating program with business ID:', businessId);
        
        // In production, rely on API availability; in dev you already have DB
        if (ProductionSafeService.shouldUseApi()) {
          // Quick ping: fetch programs list via API to validate availability
          try {
            await ProductionSafeService.getBusinessPrograms(parseInt(businessId));
          } catch (e) {
            setError(t('business.Could not connect to API. Please try again later.'));
            return;
          }
        }
        
        try {
          // Create new program with validated business ID
        const newProgram = await LoyaltyProgramService.createProgram({
          ...program,
          businessId,
          status: 'ACTIVE',
        } as any);
        
        if (newProgram) {
          setPrograms([...programs, newProgram]);
            setShowProgramBuilder(false);
            setSelectedProgram(null);
        } else {
            // Show a more specific error from the service layer
            setError(t('business.Program creation failed - check console for details'));
          }
        } catch (createErr: any) {
          // Display the actual error message directly
          console.error('Detailed program creation error:', createErr);
          setError(t('business.Error creating program: {{error}}', { error: createErr?.message || JSON.stringify(createErr) }));
        }
      }
    } catch (err: any) {
      console.error('Error submitting program:', err);
      setError(`${t('business.An error occurred')}: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleProgramCancel = () => {
    setShowProgramBuilder(false);
    setSelectedProgram(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'POINTS':
        return <Award className="w-5 h-5 text-blue-500" />;
      case 'STAMPS':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'CASHBACK':
        return <Tag className="w-5 h-5 text-purple-500" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 programs-page business-programs-page">
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <Award className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-800 mb-3">
                🔵 DIAGNOSIS: Business Programs Page Data Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Browser Extension Workaround (Lines 31-68)</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> Massive useEffect polyfills <code className="bg-red-100 px-1 rounded">window.browser</code> object for extension compatibility.</p>
                  <p className="text-red-900 mb-2"><strong>Why It Exists:</strong> Page crashes with "browser is not defined" errors. Quick fix: mock entire browser API.</p>
                  <p className="text-red-900"><strong>Root Cause:</strong> Some imported service/library expects browser extension APIs to exist globally.</p>
                  <p className="text-red-900"><strong>Impact:</strong> 40 lines of polyfill code just to prevent crashes. Performance overhead checking scripts.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: LoyaltyProgramService Direct DB Access</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> Uses <code className="bg-orange-100 px-1 rounded">LoyaltyProgramService.getBusinessPrograms()</code> (line 78), <code className="bg-orange-100 px-1 rounded">createProgram()</code> (line 248), <code className="bg-orange-100 px-1 rounded">updateProgram()</code> (line 185).</p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Broken:</strong> No API endpoints for program CRUD. Service likely calls database directly with <code className="bg-orange-100 px-1 rounded">sql</code> template.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> Program creation fails silently if DB connection lost. No error recovery, no retry logic.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: ProductionSafeService Check (Lines 236-244)</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> Before creating program, checks if should use API, tries to fetch programs list to validate availability.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Hacky:</strong> Doesn't actually call program creation API - just pings another endpoint to see if API is up!</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> Creates confusion. Still falls through to direct DB access if check passes.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-purple-700 mb-2">⚠️ Problem #4: Permission Checks Happen Client-Side (Lines 136-148, 206-216)</h4>
                  <p className="text-purple-900 mb-2"><strong>Current State:</strong> Uses <code className="bg-purple-100 px-1 rounded">hasPermission(user, PERMISSIONS.PROGRAMS_EDIT)</code> to show/hide edit buttons.</p>
                  <p className="text-purple-900 mb-2"><strong>Why It's Broken:</strong> UI-only protection. Malicious user can bypass by calling service methods directly from console.</p>
                  <p className="text-purple-900"><strong>Impact:</strong> Staff without edit permissions could still modify programs if they know service API.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Create Programs API with Server-Side Auth</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET/POST/PUT/DELETE /api/business/programs</code> with JWT auth</li>
                    <li>Move permission checks to API: verify <code className="bg-blue-100 px-1 rounded">user.role === 'business' || user.permissions.includes('programs.edit')</code></li>
                    <li>Remove browser polyfill by fixing root cause: identify which import needs extension APIs</li>
                    <li>Replace ProductionSafeService with proper environment detection</li>
                    <li>Follow fun.md: Merge into <code className="bg-blue-100 px-1 rounded">api/business/[[...businessId]]/[[...segments]].ts</code> catch-all</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 error-alert">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
      
        {showProgramBuilder ? (
          <div className="bg-white rounded-xl shadow-md program-builder-modal">
            <div className="p-6 pb-0 flex justify-between items-center program-builder-header">
              <h2 className="text-xl font-bold text-gray-900 program-builder-title">
                {selectedProgram ? t('business.Edit Loyalty Program') : t('business.Create New Loyalty Program')}
              </h2>
              <button
                onClick={handleProgramCancel}
                className="text-gray-500 hover:text-gray-700 program-builder-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ProgramBuilder
              initialProgram={selectedProgram || undefined}
              onSubmit={handleProgramSubmit}
              onCancel={handleProgramCancel}
            />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center programs-header business-programs-header">
              <h1 className="text-2xl font-semibold text-gray-800 programs-title">
                {t('business.Loyalty Programs')}
              </h1>
              <PermissionGate permission={PERMISSIONS.PROGRAMS_CREATE}>
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setShowProgramBuilder(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors create-program-btn"
              >
                <Plus className="w-5 h-5" />
                {t('business.Create Program')}
              </button>
              </PermissionGate>
            </div>

            {/* Staff restrictions notice */}
            {user && !isBusinessOwner(user) && (
              <RestrictedFeatureNotice 
                featureName={t('business.Program deletion')}
                className="mb-4"
              />
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64 programs-loading">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 programs-grid business-programs-grid">
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow program-card"
                    >
                      <div className="p-6 program-card-content">
                        <div className="flex items-start justify-between program-card-header">
                          <div className="flex items-center program-card-info">
                            <div className="mr-4 p-2 bg-gray-100 rounded-full program-card-icon">
                              {getTypeIcon(program.type)}
                            </div>
                            <div className="program-card-details">
                              <h3 className="text-lg font-semibold text-gray-900 program-card-name">
                                {program.name}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 program-card-description">
                                {program.description}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium program-status ${
                              program.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {program.status}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 program-card-stats">
                          <div className="text-sm text-gray-600 flex items-center program-stat">
                            <Award className="w-4 h-4 mr-1 text-gray-400" />
                            <span>
                              {program.type === 'POINTS'
                                ? t('business.{{value}} = 1 point', { value: formatAmount(program.pointValue) })
                                : t('business.1 stamp per visit')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center program-stat">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            <span>
                              {program.expirationDays
                                ? t('business.Points expire after {{days}} days', { days: program.expirationDays })
                                : t('business.Never expires')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 program-reward-tiers">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 program-tiers-title">{t('business.Reward Tiers')}:</h4>
                          <ul className="space-y-1 program-tiers-list">
                            {program.rewardTiers.map((tier) => (
                              <li key={tier.id} className="text-sm text-gray-600 program-tier-item">
                                • {tier.pointsRequired} {program.type === 'POINTS' ? t('business.points') : t('business.stamps')} ={' '}
                                {tier.reward}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3 program-card-actions">
                          <DeleteButton
                            permission={PERMISSIONS.PROGRAMS_DELETE}
                            onDelete={() => handleProgramDeleteClick(program)}
                            className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors program-delete-btn"
                          >
                            {t('business.Delete')}
                          </DeleteButton>
                          <PermissionGate
                            permission={PERMISSIONS.PROGRAMS_EDIT}
                            fallback={
                              <div className="text-sm px-3 py-1.5 bg-gray-300 text-gray-500 rounded cursor-not-allowed flex items-center">
                                {t('business.Edit')} (No Permission)
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </div>
                            }
                          >
                            <button
                              onClick={() => handleProgramEdit(program)}
                              className="text-sm flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors program-edit-btn"
                            >
                              {t('business.Edit')}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                          </PermissionGate>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {programs.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center programs-empty-state">
                    <Award className="w-12 h-12 mx-auto text-gray-400 programs-empty-icon" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 programs-empty-title">
                      {t('business.No Programs Found')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto programs-empty-description">
                      {t('business.You haven\'t created any loyalty programs yet. Create your first program to start rewarding your customers.')}
                    </p>
                    <PermissionGate
                      permission={PERMISSIONS.PROGRAMS_CREATE}
                      fallback={
                        <div className="mt-6 flex items-center gap-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed mx-auto">
                          <Plus className="w-5 h-5" />
                          {t('business.Create Program')} (Owner Only)
                        </div>
                      }
                    >
                      <button
                        onClick={() => {
                          setSelectedProgram(null);
                          setShowProgramBuilder(true);
                        }}
                        className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto programs-empty-btn"
                      >
                        <Plus className="w-5 h-5" />
                        {t('business.Create Program')}
                      </button>
                    </PermissionGate>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Program Delete Confirmation Modal */}
        <ProgramDeleteModal
          isOpen={showDeleteModal}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          programName={programToDelete?.name || ''}
          enrolledCustomersCount={enrolledCustomersCount}
        />
      </div>
    </BusinessLayout>
  );
};

export default Programs; 