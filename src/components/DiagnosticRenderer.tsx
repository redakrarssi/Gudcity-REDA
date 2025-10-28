import React, { useEffect, useState } from 'react';

interface DiagnosticRendererProps {
  name: string;
  children: React.ReactNode;
}

const DiagnosticRenderer: React.FC<DiagnosticRendererProps> = ({ name, children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    try {
      console.log(`${name} component mounted`);
      setMounted(true);
      
      return () => {
        console.log(`${name} component unmounted`);
      };
    } catch (err) {
      console.error(`Error in ${name} diagnostic:`, err);
    }
  }, [name]);
  
  try {
    console.log(`${name} rendering, mounted: ${mounted}`);
    return <>{children}</>;
  } catch (err) {
    console.error(`Error rendering ${name}:`, err);
    return <div className="p-4 bg-red-50 text-red-700 rounded">Render Error: {String(err)}</div>;
  }
};

export default DiagnosticRenderer; 