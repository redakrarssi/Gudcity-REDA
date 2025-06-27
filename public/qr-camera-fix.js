/**
 * QR Camera Fix Script
 * 
 * This script fixes camera issues with the QR scanner by enhancing
 * camera initialization and handling without modifying the core component.
 */

(function() {
  console.log('QR camera fix script loaded');
  
  // Wait for DOM to be ready before patching
  function waitForDOMReady(callback) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(callback, 1);
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }
  
  // Main fix function
  function applyQrCameraFix() {
    try {
      console.log('QR camera fix: Applying camera enhancements');
      
      // Cache original functions to avoid breaking the system
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      
      // Enhance getUserMedia with better error handling and recovery
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        // Handle constraints to improve camera capture
        if (constraints && constraints.video) {
          // Always prefer environment facing camera for QR scanning
          if (typeof constraints.video === 'object') {
            // Ensure we have the best possible constraints for QR scanning
            if (!constraints.video.facingMode) {
              constraints.video.facingMode = { ideal: 'environment' };
            }
            
            // Add ideal width and height if not specified
            if (!constraints.video.width) {
              constraints.video.width = { ideal: 1280 };
            }
            
            if (!constraints.video.height) {
              constraints.video.height = { ideal: 720 };
            }
          }
        }
        
        // Try to get camera stream with improved error handling
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            // Use original method to get camera
            const stream = await originalGetUserMedia.call(navigator.mediaDevices, constraints);
            
            // Fix common issues with video tracks
            if (stream && stream.getVideoTracks) {
              const videoTracks = stream.getVideoTracks();
              if (videoTracks && videoTracks.length > 0) {
                // Ensure auto-focus is enabled on camera when possible
                try {
                  const track = videoTracks[0];
                  if (track.getCapabilities && track.applyConstraints) {
                    const capabilities = track.getCapabilities();
                    
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                      await track.applyConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                      });
                    }
                  }
                } catch (focusError) {
                  console.log('QR camera fix: Focus mode setting failed, continuing anyway', focusError);
                }
              }
            }
            
            return stream;
          } catch (error) {
            retryCount++;
            console.log(`QR camera fix: Camera access error (attempt ${retryCount}/${maxRetries})`, error);
            
            if (retryCount >= maxRetries) {
              throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // If permission denied error, don't retry
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              throw error;
            }
          }
        }
        
        // If we get here, all retries failed
        throw new Error('Failed to access camera after multiple attempts');
      };
      
      // Monitor for common scanner issues and fix them
      startScannerMonitoring();
      
      console.log('QR camera fix: Camera enhancements applied');
    } catch (error) {
      console.error('QR camera fix: Error applying camera fix', error);
    }
  }
  
  // Monitor for QR scanner issues and fix them automatically
  function startScannerMonitoring() {
    // Check every 5 seconds for scanner issues
    setInterval(() => {
      try {
        // Check for frozen or stuck video
        const scannerVideo = document.querySelector('#html5-qrcode-scanregion video');
        if (scannerVideo instanceof HTMLVideoElement) {
          if (scannerVideo.paused || scannerVideo.ended || !scannerVideo.srcObject) {
            console.log('QR camera fix: Detected frozen scanner, attempting to restart');
            
            // Try to manually restart scanning
            try {
              // Look for scanner stop/start buttons in DOM
              const startButton = document.querySelector('[data-testid="start-scanning"], [data-role="start-scanner"], button:not([disabled]):not(.disabled):not([aria-disabled="true"]):has-text("Start"), button:not([disabled]):not(.disabled):not([aria-disabled="true"]):has-text("Scan"), [role="button"]:has-text("Start"), [role="button"]:has-text("Scan")');
              
              if (startButton && typeof startButton.click === 'function') {
                // Stop first if needed
                const stopButton = document.querySelector('[data-testid="stop-scanning"], [data-role="stop-scanner"], button:not([disabled]):not(.disabled):not([aria-disabled="true"]):has-text("Stop")');
                if (stopButton && typeof stopButton.click === 'function') {
                  stopButton.click();
                  
                  // Wait before starting again
                  setTimeout(() => {
                    startButton.click();
                  }, 1000);
                } else {
                  // Just try starting
                  startButton.click();
                }
              }
            } catch (clickError) {
              console.log('QR camera fix: Auto-restart failed', clickError);
            }
          }
        }
      } catch (error) {
        console.error('QR camera fix: Error during scanner monitoring', error);
      }
    }, 5000);
  }
  
  // Apply the fix when DOM is ready
  waitForDOMReady(applyQrCameraFix);
})(); 