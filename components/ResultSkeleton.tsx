import React from 'react';

const ResultSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto animate-pulse">
      <div className="text-center mb-8">
        <div className="inline-block bg-gray-700 h-12 w-40 rounded-lg"></div>
      </div>

      <div className="relative h-64 md:h-80 lg:h-96 rounded-2xl bg-gray-800"></div>
      
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-32 md:-mt-40 z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0">
            <div className="relative w-full aspect-[2/3] bg-gray-700 rounded-lg shadow-xl"></div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="w-full h-10 bg-gray-700 rounded-lg"></div>
              <div className="w-full h-10 bg-gray-700 rounded-lg"></div>
            </div>
          </div>
          
          <div className="flex-grow pt-8 md:pt-16">
            <div className="h-10 bg-gray-700 rounded w-3/4"></div>
            <div className="h-6 bg-gray-700 rounded w-1/4 mt-3"></div>
            <div className="flex flex-wrap gap-2 my-4">
              <div className="h-6 w-20 bg-gray-700 rounded-full"></div>
              <div className="h-6 w-24 bg-gray-700 rounded-full"></div>
              <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
            </div>
             <div className="flex items-center gap-6 my-5">
                 <div className="h-5 w-24 bg-gray-700 rounded"></div>
                 <div className="h-5 w-28 bg-gray-700 rounded"></div>
             </div>
          </div>
        </div>
        
        <div className="mt-12">
          <div>
            <div className="flex justify-between items-center border-b-2 border-indigo-500/30 pb-2 mb-4">
              <div className="h-8 w-48 bg-gray-700 rounded"></div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 bg-gray-700 rounded-md"></div>
                <div className="h-7 w-20 bg-gray-700 rounded-md"></div>
                <div className="h-7 w-28 bg-gray-700 rounded-md"></div>
              </div>
            </div>
            <div className="space-y-4 mt-6">
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700 rounded w-full mt-6"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSkeleton;
