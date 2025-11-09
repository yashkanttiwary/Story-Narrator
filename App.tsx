import React, { useState, useCallback, useContext, FC } from 'react';
import { ItemData, ItemType } from './types';
import { getItemData } from './services/geminiService';
import { ApiContext } from './contexts/ApiContext';
import ItemInputForm from './components/ItemInputForm';
import ItemResultDisplay from './components/ItemResultDisplay';
import ResultSkeleton from './components/ResultSkeleton';

const App: FC = () => {
  const [itemName, setItemName] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType>('movie');
  const { apiKey } = useContext(ApiContext);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNewSearch = useCallback(() => {
    setItemData(null);
    setError(null);
    setItemName('');
    setYear('');
    setIsLoading(false);
    setLoadingMessage('');
  }, []);

  const handleItemTypeChange = useCallback((newType: ItemType) => {
    setItemName('');
    setYear('');
    setError(null);
    setItemType(newType);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim()) {
      setError(`Please enter your Google AI API key.`);
      return;
    }

    const trimmedItemName = itemName.trim();
    if (!trimmedItemName) {
      setError(`Please enter a ${itemType} name.`);
      return;
    }
    
    // C-04: Basic sanitization to prevent sending HTML-like structures to the model.
    if (/<|>/g.test(trimmedItemName)) {
        setError(`Title cannot contain special characters like '<' or '>'.`);
        return;
    }

    // C-01: Title length validation.
    if (trimmedItemName.length > 100) {
      setError(`The ${itemType} title is too long. Please keep it under 100 characters.`);
      return;
    }

    // C-02 & H-01: Year validation.
    const trimmedYear = year.trim();
    if (trimmedYear && !/^\d{4}$/.test(trimmedYear)) {
      setError(`Please enter a valid 4-digit year or leave it blank.`);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Validating API Key...');
    setItemData(null);

    try {
      // Let getItemData handle validation implicitly to save an API call.
      setLoadingMessage(`Finding details for ${trimmedItemName}...`);
      const data = await getItemData(trimmedItemName, trimmedYear, itemType, apiKey);
      setItemData(data);
      setLoadingMessage('The AI is writing your narration...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage.replace(/movie|book|series|anime/gi, itemType));
      setIsLoading(false); 
    } 
  }, [itemName, year, itemType, apiKey]);

  const handleNarrationComplete = () => {
    setIsLoading(false);
    setLoadingMessage('');
  };

  return (
    <div 
      className="min-h-screen text-white font-sans"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="min-h-screen w-full bg-gray-950/80 backdrop-blur-sm">
        <main className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {!itemData && !isLoading ? (
            <>
              <header className="text-center my-8 md:my-16 transition-all duration-500">
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter text-white bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                  What A Scene
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mt-6">
                  Experience any story, from screen to page. Enter a title and your API key to begin a unique, soul-deep narration.
                </p>
              </header>

              <section className="my-10">
                <ItemInputForm 
                  itemName={itemName}
                  setItemName={setItemName}
                  year={year}
                  setYear={setYear}
                  itemType={itemType}
                  setItemType={handleItemTypeChange}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                />
              </section>
            </>
          ) : null}

          <section className="my-10">
            {isLoading && !itemData && <ResultSkeleton />}
            {error && (
              <div className="text-center p-6 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto">
                <p className="font-semibold">Error</p>
                <p className="text-red-300">{error}</p>
              </div>
            )}
            {itemData && <ItemResultDisplay data={itemData} onNewSearch={handleNewSearch} onNarrationComplete={handleNarrationComplete} initialLoadingMessage={loadingMessage} />}
          </section>
        </main>
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Powered by Google Gemini. For entertainment purposes only.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
