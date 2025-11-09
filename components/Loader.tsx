import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
      <p className="text-lg text-indigo-300">{message || 'Loading...'}</p>
    </div>
  );
};

export default Loader;