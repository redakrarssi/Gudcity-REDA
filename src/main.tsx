// Very simple test to see if JavaScript is executing at all
console.log('=== MAIN.TSX LOADED ===');

// Test basic JavaScript functionality
console.log('Testing basic JavaScript...');
console.log('Document ready state:', document.readyState);
console.log('Window object exists:', typeof window !== 'undefined');
console.log('Document object exists:', typeof document !== 'undefined');

// Test if we can access the root element
try {
  const rootElement = document.getElementById('root');
  console.log('Root element found:', !!rootElement);
  
  if (rootElement) {
    console.log('Root element exists, testing simple text content...');
    rootElement.textContent = 'JavaScript is working!';
    console.log('Text content set successfully');
  }
} catch (error) {
  console.error('Error accessing DOM:', error);
}

console.log('=== MAIN.TSX COMPLETED ===');