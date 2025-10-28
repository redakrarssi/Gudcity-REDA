import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QRScanner } from '../components/QRScanner';
import { QrCodeService } from '../services/qrCodeService';
import { CustomerNotificationService } from '../services/customerNotificationService';
import { createNotificationSyncEvent } from '../utils/realTimeSync';
import * as serverFunctions from '../server';

// Mock dependencies
jest.mock('../services/qrCodeService');
jest.mock('../services/customerNotificationService');
jest.mock('../utils/realTimeSync');
jest.mock('../server');

// Mock Html5Qrcode
jest.mock('html5-qrcode', () => {
  return {
    Html5Qrcode: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockResolvedValue({}),
      stop: jest.fn().mockResolvedValue({}),
      clear: jest.fn(),
      getState: jest.fn().mockReturnValue({ isScanning: true }),
      isScanning: jest.fn().mockReturnValue(true),
      getSupportedFormats: jest.fn().mockReturnValue([]),
      getCameras: jest.fn().mockResolvedValue([{ id: 'camera1', label: 'Test Camera' }]),
    })),
    CameraDevice: {},
  };
});

// Mock contexts
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ 
    user: { id: '1', name: 'Test Business', role: 'BUSINESS' },
    isAuthenticated: true
  })
}));

describe('QR Scanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render scanner component', async () => {
    render(<QRScanner businessId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Scan a QR code/i)).toBeInTheDocument();
    });
  });

  test('should successfully scan customer QR code', async () => {
    // Mock successful QR code scan
    const mockQrData = {
      type: 'customer',
      customerId: '4',
      customerName: 'Test Customer',
      raw: JSON.stringify({ customerId: '4', customerName: 'Test Customer', type: 'customer' })
    };
    
    // Mock notification creation
    (CustomerNotificationService.createNotification as jest.Mock).mockResolvedValue({
      id: 'notif-123',
      customerId: '4',
      businessId: '1',
      type: 'QR_SCAN',
      title: 'QR Code Scanned',
      message: 'Test Business is scanning your QR code',
    });
    
    // Mock QR code service
    (QrCodeService.logScan as jest.Mock).mockResolvedValue({ success: true });
    
    const onScanMock = jest.fn();
    
    // Render component
    render(<QRScanner businessId="1" onScan={onScanMock} />);
    
    // Simulate QR code scan
    const scannerInstance = (window as any).scannerInstance;
    
    // Manually trigger the handleQrCodeScan method
    await waitFor(() => {
      // Find and trigger the scan button
      const scanButton = screen.getByText(/Start Scanning/i);
      fireEvent.click(scanButton);
    });
    
    // Verify notification was created
    await waitFor(() => {
      expect(CustomerNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: expect.any(String),
          businessId: expect.any(String),
          type: expect.any(String)
        })
      );
    });
    
    // Verify sync event was created
    await waitFor(() => {
      expect(createNotificationSyncEvent).toHaveBeenCalled();
    });
  });

  test('should handle invalid QR code format', async () => {
    // Mock invalid QR code data
    const invalidQrData = "not-a-valid-qr-code";
    
    const onErrorMock = jest.fn();
    
    // Render component
    render(<QRScanner businessId="1" onError={onErrorMock} />);
    
    // Simulate invalid QR code scan
    await waitFor(() => {
      // Find and trigger the scan button
      const scanButton = screen.getByText(/Start Scanning/i);
      fireEvent.click(scanButton);
    });
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/Invalid QR code format/i)).toBeInTheDocument();
    });
  });

  test('should create real-time notification when scanning', async () => {
    // Mock successful QR code scan for customer ID 4
    const mockQrData = {
      type: 'customer',
      customerId: '4',
      customerName: 'Test Customer',
      raw: JSON.stringify({ customerId: '4', customerName: 'Test Customer', type: 'customer' })
    };
    
    // Mock notification creation
    const mockNotification = {
      id: 'notif-123',
      customerId: '4',
      businessId: '1',
      type: 'QR_SCAN',
      title: 'QR Code Scanned',
      message: 'Test Business is scanning your QR code',
    };
    
    (CustomerNotificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);
    
    // Render component
    render(<QRScanner businessId="1" />);
    
    // Simulate QR code scan
    await waitFor(() => {
      // Find and trigger the scan button
      const scanButton = screen.getByText(/Start Scanning/i);
      fireEvent.click(scanButton);
    });
    
    // Verify notification was created
    await waitFor(() => {
      expect(CustomerNotificationService.createNotification).toHaveBeenCalled();
    });
    
    // Verify sync event was created
    await waitFor(() => {
      expect(createNotificationSyncEvent).toHaveBeenCalledWith(
        mockNotification.id,
        expect.any(String),
        expect.any(String),
        'INSERT',
        expect.objectContaining({
          type: expect.any(String),
          businessName: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });
    
    // Verify server notification was emitted
    await waitFor(() => {
      expect(serverFunctions.emitNotification).toHaveBeenCalled();
    });
  });

  test('should handle multiple scans gracefully', async () => {
    // Mock QR code service to simulate multiple scans
    (QrCodeService.logScan as jest.Mock).mockResolvedValue({ success: true });
    
    // Mock rate limiting check
    const mockRateLimitCheck = jest.fn().mockReturnValue(false);
    (window as any).qrScanMonitor = {
      isRateLimited: mockRateLimitCheck,
      trackScan: jest.fn(),
      recordSuccessfulScan: jest.fn(),
      recordFailedScan: jest.fn(),
    };
    
    // Render component
    render(<QRScanner businessId="1" />);
    
    // Simulate multiple QR code scans
    await waitFor(() => {
      // Find and trigger the scan button
      const scanButton = screen.getByText(/Start Scanning/i);
      fireEvent.click(scanButton);
    });
    
    // Verify scan tracking was called
    await waitFor(() => {
      expect((window as any).qrScanMonitor.trackScan).toHaveBeenCalled();
    });
    
    // Verify rate limiting was checked
    await waitFor(() => {
      expect(mockRateLimitCheck).toHaveBeenCalled();
    });
  });
}); 