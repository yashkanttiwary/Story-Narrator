import React, { useRef, useCallback } from 'react';
import { BrowseItem } from '../types';
import BrowseItemCard from './BrowseItemCard';
import { ItemType } from '../App';

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
  const observer = useRef<IntersectionObserver>();
  const sentinelRef = useCallback(node => {
      if (isLoading || isMoreLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              onLoadMore();
          }
      }, { threshold: 1.0 });
      if (node) observer.current.observe(node);
  }, [isLoading, isMoreLoading, hasMore, onLoadMore]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
             <div key={index} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
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
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
            {list.map((item) => (
              <BrowseItemCard
                key={`${item.title}-${item.year}`}
                item={item}
                onClick={() => onSelectItem(item.title, item.year)}
              />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: '1px' }} /> 
        </>
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
      {isMoreLoading && (
          <div className="flex justify-center items-center h-24">
              <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
          </div>
      )}
      {!hasMore && list.length > 0 && !isMoreLoading && (
          <p className="text-center text-gray-500 mt-8">You've reached the end of the list!</p>
      )}
    </div>
  );
};

export default BrowseSection;