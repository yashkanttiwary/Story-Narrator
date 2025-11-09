import React from 'react';
import { BrowseItem } from '../types';
import BrowseItemCard from './BrowseItemCard';
import { ItemType } from '../types';

interface BrowseSectionProps {
  list: BrowseItem[];
  isLoading: boolean;
  isMoreLoading: boolean;
  error: string | null;
  onSelectItem: (title: string, year: string) => void;
  itemType: ItemType;
  onLoadMore: () => void;
  hasMore: boolean;
}

const BrowseSection: React.FC<BrowseSectionProps> = ({ list, isLoading, isMoreLoading, error, onSelectItem, itemType, onLoadMore, hasMore }) => {

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
             <div key={index} className="aspect-[2/3] bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-6 bg-yellow-900/30 border border-yellow-700/50 rounded-lg max-w-md mx-auto">
          <p className="text-yellow-300">{error}</p>
        </div>
      );
    }
    
    if (list.length > 0) {
      return (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
            {list.map((item) => (
              <BrowseItemCard
                key={`${item.title}-${item.year}`}
                item={item}
                onClick={() => onSelectItem(item.title, item.year)}
              />
            ))}
          </div>
      );
    }

    if (!isLoading && !error) {
      return (
        <div className="text-center p-6 bg-gray-800/50 rounded-lg">
          <p className="text-gray-400">No popular {itemType}s to display at the moment.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-2xl font-bold text-indigo-300">Or Browse Popular Titles</h3>
        <div className="flex-grow h-px bg-indigo-500/30"></div>
      </div>
      {renderContent()}

      <div className="text-center mt-8">
        {isMoreLoading ? (
            <div className="flex justify-center items-center h-12">
                <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
            </div>
        ) : hasMore && list.length > 0 && !error ? (
            <button
              onClick={onLoadMore}
              disabled={isMoreLoading}
              className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
              Load More
            </button>
        ) : !hasMore && list.length > 0 && !error ? (
          <p className="text-gray-500">You've reached the end of the list!</p>
        ) : null}
      </div>
    </div>
  );
};

export default BrowseSection;
