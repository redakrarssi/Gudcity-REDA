// This script fixes the missing manifest icon
// Error: "Error while trying to use the following icon from the Manifest: https://gudcity-reda.vercel.app/assets/icon-192x192.png"

document.addEventListener('DOMContentLoaded', function() {
  // Check if the manifest link exists
  const manifestLink = document.querySelector('link[rel="manifest"]');
  
  if (manifestLink) {
    // Fetch the manifest JSON
    fetch(manifestLink.href)
      .then(response => response.json())
      .then(manifest => {
        // Check if the manifest has icons
        if (manifest.icons && Array.isArray(manifest.icons)) {
          // Create a new manifest object
          const fixedManifest = { ...manifest };
          
          // Fix any icon paths that point to missing files
          fixedManifest.icons = manifest.icons.map(icon => {
            // Convert relative paths to absolute if needed
            let iconPath = icon.src;
            
            if (!iconPath.startsWith('http') && !iconPath.startsWith('/')) {
              iconPath = '/' + iconPath;
            }
            
            // Replace specific problematic icon paths
            if (iconPath.includes('/assets/icon-192x192.png')) {
              // Use a default icon from your public folder or an emoji as fallback
              return {
                ...icon,
                src: '/favicon.ico' // Replace with a path to an icon you know exists
              };
            }
            
            return icon;
          });
          
          // Create a blob with the fixed manifest
          const fixedManifestBlob = new Blob(
            [JSON.stringify(fixedManifest)],
            { type: 'application/json' }
          );
          
          // Create a URL for the blob
          const fixedManifestURL = URL.createObjectURL(fixedManifestBlob);
          
          // Replace the original manifest link
          manifestLink.href = fixedManifestURL;
          
          console.log('Manifest icons fixed');
        }
      })
      .catch(error => {
        console.error('Error fixing manifest:', error);
      });
  }
});

// Alternative approach: Create missing icons
function createMissingIcons() {
  const iconPaths = ['/assets/icon-192x192.png', '/assets/icon-512x512.png'];
  
  // Check if the public directory has these icons
  iconPaths.forEach(iconPath => {
    fetch(iconPath)
      .then(response => {
        if (!response.ok) {
          console.warn(`Missing icon: ${iconPath}. You should add this to your public folder.`);
        }
      })
      .catch(() => {
        console.warn(`Missing icon: ${iconPath}. You should add this to your public folder.`);
      });
  });
}

// Instructions for implementation:
// 1. Ensure you have all icons referenced in your manifest.json in your public directory
// 2. Add the following icons to your public/assets folder:
//    - icon-192x192.png (192x192 pixels)
//    - icon-512x512.png (512x512 pixels)
// 3. Verify your manifest.json has correct paths to these icons 