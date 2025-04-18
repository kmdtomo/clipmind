import React from 'react';

interface TabButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button 
      className={`flex items-center justify-center ${label ? 'px-3' : 'px-4'} py-2 border-b-2 ${
        isActive ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 hover:text-gray-800'
      }`}
      onClick={onClick}
    >
      <span className="mr-1">{icon}</span>
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
};

export default TabButton; 