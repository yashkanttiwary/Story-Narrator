import React, { useState, useCallback } from 'react';
import { ItemData } from './types';
import { getItemData } from './services/geminiService';
import ItemInputForm from './components/ItemInputForm';
import ItemResultDisplay from './components/ItemResultDisplay';
import Loader from './components/Loader';

export type ItemType = 'movie' | 'book';

const App: React.FC = () => {
  const [itemName, setItemName] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType>('movie');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError(`Please enter a ${itemType} name.`);
      return;
    }
    if (!apiKey.trim()) {
      setError(`Please enter your API key.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setItemData(null);

    try {
      const data = await getItemData(itemName, year, itemType, apiKey);
      setItemData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [itemName, year, itemType, apiKey]);

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
              setItemType={setItemType}
              apiKey={apiKey}
              setApiKey={setApiKey}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </section>

          <section className="my-10">
            {isLoading && <Loader />}
            {error && (
              <div className="text-center p-6 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto">
                <p className="font-semibold">Error</p>
                <p className="text-red-300">{error}</p>
              </div>
            )}
            {itemData && <ItemResultDisplay data={itemData} apiKey={apiKey} />}
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