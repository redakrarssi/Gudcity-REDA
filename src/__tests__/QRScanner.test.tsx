import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRScanner } from '../components/QRScanner';
import { QrCodeService } from '../services/qrCodeService';
import { NotificationService } from '../services/notificationService';

// Mock dependencies
jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    clear: jest.fn(),
    getState: jest.fn().mockReturnValue({ isScanning: false }),
  })),
  CameraDevice: jest.fn(),
}));

jest.mock('../services/qrCodeService', () => ({
  QrCodeService: {
    processQrCodeScan: jest.fn().mockResolvedValue({ success: true }),
    logScan: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue(true),
  },
}));

// Create mock QR code data for testing
const mockCustomerQR = JSON.stringify({
  type: 'customer',
  customerId: '12345',
  customerName: 'Test Customer',
  email: 'test@example.com',
  text: 'Customer QR code',
});

const mockLoyaltyCardQR = JSON.stringify({
  type: 'loyaltyCard',
  cardId: '7890',
  customerId: '12345',
  cardNumber: 'CARD-001',
  text: 'Loyalty card QR code',
});

const mockPromoCodeQR = JSON.stringify({
  type: 'promoCode',
  code: 'PROMO123',
  text: 'Promo code QR code',
});

const mockUnknownQR = 'invalid-qr-data';

// Create custom renderer with translation mock
const renderWithTranslation = (component: React.ReactElement) => {
  return render(
    <div>{component}</div>
  );
};

describe('QRScanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    renderWithTranslation(<QRScanner businessId="1" />);
    expect(screen.getByText(/Start Scanner/i)).toBeInTheDocument();
  });

  test('toggles scanning state when button is clicked', async () => {
    renderWithTranslation(<QRScanner businessId="1" />);
    
    // Start scanning
    fireEvent.click(screen.getByText(/Start Scanner/i));
    
    // Wait for the scanner to initialize
    await waitFor(() => {
      expect(screen.getByText(/Stop Scanner/i)).toBeInTheDocument();
    });
    
    // Stop scanning
    fireEvent.click(screen.getByText(/Stop Scanner/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Start Scanner/i)).toBeInTheDocument();
    });
  });

  test('ensureId utility handles undefined IDs correctly', async () => {
    // This test accesses a private utility function, which isn't ideal
    // In real testing, we would test the public API, not implementation details
    // This is for demonstration purposes only
    const { container } = renderWithTranslation(<QRScanner businessId="1" />);
    
    // Access the component instance to test the ensureId function
    // Note: This is not a recommended practice in real tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const componentInstance = (container as any).ensureId;
    
    // If we can't access the function directly, we can test its behavior through props
    // We do this by passing undefined as businessId and checking it doesn't crash
    renderWithTranslation(<QRScanner businessId={undefined} />);
    expect(screen.getByText(/Start Scanner/i)).toBeInTheDocument();
  });

  test('handles customer QR code correctly', async () => {
    const onScanMock = jest.fn();
    renderWithTranslation(<QRScanner businessId="1" onScan={onScanMock} />);
    
    // Directly simulate QR code scan since we can't trigger the HTML5QrCode in tests
    // This is a way to test the parsing logic without the actual scanning
    // Get the component instance
    const instance = screen.getByTestId('qr-scanner-container');
    
    // Simulate QR code scan by calling the function directly
    // This is not ideal in real tests but works for this validation
    fireEvent.click(screen.getByText(/Start Scanner/i));
    
    // Wait for scanner to initialize
    await waitFor(() => {
      expect(screen.getByText(/Stop Scanner/i)).toBeInTheDocument();
    });
    
    // Mock the scan result
    const scanHandler = (HTML5QrCode as any).mock.calls[0][1];
    if (scanHandler) {
      scanHandler(mockCustomerQR, { decodedText: mockCustomerQR });
    }
    
    // Verify QrCodeService was called correctly
    await waitFor(() => {
      expect(QrCodeService.logScan).toHaveBeenCalledWith(
        'CUSTOMER_CARD',
        '1',
        expect.objectContaining({ customerId: '12345' }),
        true,
        expect.any(Object)
      );
    });
  });
}); 