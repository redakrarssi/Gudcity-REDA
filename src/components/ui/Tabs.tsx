import React from 'react';

interface TabsProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

// Create context for the tabs
const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: "",
  onValueChange: () => {},
});

// Update main Tabs component to provide context
export const Tabs: React.FC<TabsProps> = ({ children, value, onValueChange }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className="w-full" data-state={value}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ children }) => {
  return (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1">
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  value, 
  children,
  onClick,
  ...props 
}) => {
  const { onValueChange } = React.useContext(TabsContext);
  const isActive = React.useContext(TabsContext).value === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-600 hover:text-gray-900"
      }`}
      onClick={(e) => {
        onValueChange(value);
        if (onClick) onClick(e);
      }}
      data-state={isActive ? "active" : "inactive"}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children }) => {
  const isActive = React.useContext(TabsContext).value === value;
  
  if (!isActive) return null;
  
  return (
    <div
      className="mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </div>
  );
}; 