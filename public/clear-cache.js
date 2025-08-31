console.log('🧹 Clearing corrupted service worker cache...');
if ('caches' in window) { caches.keys().then(cacheNames => { return Promise.all(cacheNames.map(cacheName => { console.log('🗑️ Deleting cache:', cacheName); return caches.delete(cacheName); })); }).then(() => { console.log('✅ All caches cleared successfully'); }); }
