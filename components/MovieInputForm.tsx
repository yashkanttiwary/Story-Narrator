import React from 'react';
import SearchIcon from './icons/SearchIcon';
import { ItemType } from '../App';

interface ItemInputFormProps {
  itemName: string;
  setItemName: (value: string) => void;
  year: string;
  setYear: (value: string) => void;
  itemType: ItemType;
  setItemType: (value: ItemType) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ItemInputForm: React.FC<ItemInputFormProps> = ({
  itemName,
  setItemName,
  year,
  setYear,
  itemType,
  setItemType,
  handleSubmit,
  isLoading,
}) => {
  const placeholderText = itemType === 'movie' ? "Enter movie name (e.g., The Matrix)" : "Enter book title (e.g., Dune)";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex justify-center mb-4">
        <div className="flex items-center bg-black/30 border border-white/20 rounded-xl p-1">
          {(['movie', 'book'] as ItemType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setItemType(type)}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
                itemType === type ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full bg-black/30 border border-white/20 rounded-xl shadow-lg p-2 gap-2 sm:gap-0 backdrop-blur-md">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder={placeholderText}
          className="flex-grow bg-transparent text-white placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-0 border-none"
          required
          disabled={isLoading}
        />
        <div className="h-px w-full sm:h-8 sm:w-px bg-white/20" />
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder={itemType === 'movie' ? "Year (Opt)" : "Pub. Year (Opt)"}
          className="sm:w-32 bg-transparent text-white placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-0 border-none text-left sm:text-center"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex-shrink-0 inline-flex items-center justify-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-all duration-200 sm:ml-2"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <SearchIcon className="w-5 h-5 sm:mr-2" />
          )}
          <span className="hidden sm:inline">{isLoading ? 'Narrating...' : 'Narrate'}</span>
        </button>
      </div>
    </form>
  );
};

export default ItemInputForm;
