// Test API endpoint directly
fetch('/api/admin/businesses').then(r => r.text()).then(t => console.log('Response type:', typeof t, 'Length:', t.length, 'Starts with:', t.substring(0, 100))).catch(e => console.error('Error:', e));
