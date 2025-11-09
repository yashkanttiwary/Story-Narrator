import React, { useContext } from 'react';
import SearchIcon from './icons/SearchIcon';
import { ItemType } from '../types';
import { ApiContext } from '../contexts/ApiContext';

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
  const { apiKey, setApiKey } = useContext(ApiContext);
  
  const placeholders: Record<ItemType, string> = {
    movie: "Enter movie name (e.g., The Matrix)",
    book: "Enter book title (e.g., Dune)",
    series: "Enter series name (e.g., Breaking Bad)",
    anime: "Enter anime title (e.g., Attack on Titan)",
  };
  const placeholderText = placeholders[itemType];

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setYear(numericValue);
  };
  
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex justify-center mb-4">
        <div className="flex items-center bg-black/30 border border-white/20 rounded-xl p-1 flex-wrap justify-center">
          {(['movie', 'book', 'series', 'anime'] as ItemType[]).map((type) => (
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
          aria-required="true"
          disabled={isLoading}
          maxLength={100}
        />
        <div className="h-px w-full sm:h-8 sm:w-px bg-white/20" />
        <input
          type="text"
          value={year}
          onChange={handleYearChange}
          placeholder={itemType === 'book' ? "Pub. Year (Opt)" : "Year (Opt)"}
          className="sm:w-32 bg-transparent text-white placeholder-gray-400 px-4 py-3 focus:outline-none focus:ring-0 border-none text-left sm:text-center"
          disabled={isLoading}
          maxLength={4}
          pattern="[0-9]*"
          inputMode="numeric"
        />
        <button
          type="submit"
          disabled={isLoading || !apiKey.trim() || !itemName.trim()}
          className="flex-shrink-0 inline-flex items-center justify-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-all duration-200 sm:ml-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
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
      <div className="mt-4">
         <label htmlFor="api-key-input" className="sr-only">Google AI API Key</label>
        <input
          id="api-key-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Google AI API Key*"
          className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-400 backdrop-blur-md shadow-lg"
          required
          aria-required="true"
          disabled={isLoading}
        />
        <p className="text-right text-xs text-gray-400 mt-2 pr-2">
          Your key is used only in your browser and is never stored.{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 underline font-semibold">
            Get your key from Google AI Studio.
          </a>
        </p>
      </div>
    </form>
  );
};

export default ItemInputForm;