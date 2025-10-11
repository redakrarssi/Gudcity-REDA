/**
 * User Data Backend Connection Tests
 * Tests the user data backend connection functionality
 * Following reda.md security guidelines
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import UserDataConnectionService, { UserDataConnectionState } from '../services/userDataConnectionService';
import ApiClient from '../services/apiClient';
import { ProductionSafeService } from '../utils/productionApiClient';

// Mock dependencies
vi.mock('../services/apiClient');
vi.mock('../utils/productionApiClient');
vi.mock('../utils/db', () => ({
  default: vi.fn()
}));

describe('UserDataConnectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection State Management', () => {
    it('should initialize with disconnected state', () => {
      const state = UserDataConnectionService.getConnectionState();
      expect(state).toBe(UserDataConnectionState.DISCONNECTED);
    });

    it('should return connection health status', () => {
      const health = UserDataConnectionService.getConnectionHealth();
      expect(health).toHaveProperty('state');
      expect(health).toHaveProperty('retryCount');
      expect(health).toHaveProperty('maxRetries');
      expect(health).toHaveProperty('isHealthy');
    });
  });

  describe('Connection Testing', () => {
    it('should test API connection when available', async () => {
      // Mock ProductionSafeService to return true for shouldUseApi
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(true);
      
      // Mock successful API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });

      const result = await UserDataConnectionService.testConnection();
      expect(result).toBe(true);
    });

    it('should test database connection as fallback', async () => {
      // Mock ProductionSafeService to return false for shouldUseApi
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(false);
      
      // Mock successful database query
      const mockSql = vi.fn().mockResolvedValue([{ test: 1 }]);
      vi.mocked(require('../utils/db').default).mockReturnValue(mockSql);

      const result = await UserDataConnectionService.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection test failures', async () => {
      // Mock both API and database to fail
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(true);
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const mockSql = vi.fn().mockRejectedValue(new Error('Database error'));
      vi.mocked(require('../utils/db').default).mockReturnValue(mockSql);

      const result = await UserDataConnectionService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('User Data Operations', () => {
    it('should get user by ID via API when available', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(true);
      vi.mocked(ProductionSafeService.getUserById).mockResolvedValue(mockUser);

      const result = await UserDataConnectionService.getUserById(1);
      expect(result).toEqual(mockUser);
      expect(ProductionSafeService.getUserById).toHaveBeenCalledWith(1);
    });

    it('should fallback to database when API fails', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(true);
      vi.mocked(ProductionSafeService.getUserById).mockRejectedValue(new Error('API error'));
      
      const mockSql = vi.fn().mockResolvedValue([mockUser]);
      vi.mocked(require('../utils/db').default).mockReturnValue(mockSql);

      const result = await UserDataConnectionService.getUserById(1);
      expect(result).toEqual(mockUser);
    });

    it('should get user by email via API when available', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(true);
      vi.mocked(ApiClient.getUserByEmail).mockResolvedValue(mockUser);

      const result = await UserDataConnectionService.getUserByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(ApiClient.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle invalid user ID', async () => {
      const result = await UserDataConnectionService.getUserById(NaN);
      expect(result).toBeNull();
    });

    it('should handle invalid email', async () => {
      const result = await UserDataConnectionService.getUserByEmail('');
      expect(result).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on connection failures', async () => {
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(false);
      
      // Mock database to fail first, then succeed
      const mockSql = vi.fn()
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce([{ id: 1, name: 'Test User' }]);
      vi.mocked(require('../utils/db').default).mockReturnValue(mockSql);

      // Mock testConnection to succeed on retry
      vi.spyOn(UserDataConnectionService, 'testConnection').mockResolvedValue(true);

      const result = await UserDataConnectionService.getUserById(1);
      expect(result).toEqual({ id: 1, name: 'Test User' });
    });

    it('should stop retrying after max retries', async () => {
      vi.mocked(ProductionSafeService.shouldUseApi).mockReturnValue(false);
      
      // Mock database to always fail
      const mockSql = vi.fn().mockRejectedValue(new Error('Database error'));
      vi.mocked(require('../utils/db').default).mockReturnValue(mockSql);

      // Mock testConnection to always fail
      vi.spyOn(UserDataConnectionService, 'testConnection').mockResolvedValue(false);

      const result = await UserDataConnectionService.getUserById(1);
      expect(result).toBeNull();
    });
  });

  describe('Force Reconnection', () => {
    it('should force reconnection successfully', async () => {
      vi.spyOn(UserDataConnectionService, 'testConnection').mockResolvedValue(true);

      const result = await UserDataConnectionService.forceReconnect();
      expect(result).toBe(true);
    });

    it('should handle reconnection failure', async () => {
      vi.spyOn(UserDataConnectionService, 'testConnection').mockResolvedValue(false);

      const result = await UserDataConnectionService.forceReconnect();
      expect(result).toBe(false);
    });
  });
});