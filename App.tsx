import React, { useState, useCallback, useEffect } from 'react';
import { ItemData, BrowseItem } from './types';
import { getItemData, validateApiKey, getBrowseList } from './services/geminiService';
import ItemInputForm from './components/ItemInputForm';
import ItemResultDisplay from './components/ItemResultDisplay';
import Loader from './components/Loader';
import BrowseSection from './components/BrowseSection';
import ResultSkeleton from './components/ResultSkeleton';

export type ItemType = 'movie' | 'book';

const App: React.FC = () => {
  const [itemName, setItemName] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType>('movie');
  const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem('gemini-api-key') || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [browseLists, setBrowseLists] = useState<{ movie: BrowseItem[], book: BrowseItem[] }>({ movie: [], book: [] });
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<{ movie: boolean, book: boolean }>({ movie: true, book: true });

  useEffect(() => {
    if (apiKey) {
      sessionStorage.setItem('gemini-api-key', apiKey);
    } else {
      sessionStorage.removeItem('gemini-api-key');
    }
  }, [apiKey]);

  const fetchInitialBrowseData = useCallback(async (currentApiKey: string, currentItemType: ItemType) => {
    if (!currentApiKey) {
        setBrowseLists({ movie: [], book: [] });
        setHasMore({ movie: true, book: true });
        setBrowseError('Enter an API key to browse titles.');
        return;
    }

    setIsBrowseLoading(true);
    setBrowseError(null);
    try {
        const isValid = await validateApiKey(currentApiKey);
        if (!isValid) {
            setBrowseError('Your API key is invalid.');
            setBrowseLists({ movie: [], book: [] });
            return;
        }

        setBrowseLists(prev => ({...prev, [currentItemType]: []}));
        setHasMore(prev => ({...prev, [currentItemType]: true}));

        const list = await getBrowseList(currentItemType, currentApiKey, []);
        if (list.length < 12) {
            setHasMore(prev => ({ ...prev, [currentItemType]: false }));
        }
        if (list.length === 0) {
           setBrowseError(`Could not load popular ${currentItemType}s at this time.`);
        }
        setBrowseLists(prev => ({ ...prev, [currentItemType]: list }));
    } catch (err) {
        setBrowseError(`Could not load popular ${currentItemType}s.`);
    } finally {
        setIsBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialBrowseData(apiKey, itemType);
  }, [apiKey, itemType, fetchInitialBrowseData]);

  const handleLoadMore = useCallback(async () => {
    if (isBrowseLoading || !hasMore[itemType] || !apiKey) return;

    setIsBrowseLoading(true);
    try {
        const existingTitles = browseLists[itemType].map(item => item.title);
        const list = await getBrowseList(itemType, apiKey, existingTitles);

        if (list.length < 12) {
            setHasMore(prev => ({ ...prev, [itemType]: false }));
        }
        
        const newItems = list.filter(newItem => !existingTitles.includes(newItem.title));
        setBrowseLists(prev => ({ ...prev, [itemType]: [...prev[itemType], ...newItems] }));
        
    } catch (err) {
        setBrowseError(`Could not load more ${itemType}s.`);
    } finally {
        setIsBrowseLoading(false);
    }
  }, [isBrowseLoading, hasMore, itemType, apiKey, browseLists]);

  const handleBrowseSelect = useCallback((title: string, selectedYear: string) => {
    setItemName(title);
    setYear(selectedYear);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNewSearch = useCallback(() => {
    setItemData(null);
    setError(null);
    setItemName('');
    setYear('');
  }, []);

  const handleItemTypeChange = useCallback((newType: ItemType) => {
    setItemName('');
    setYear('');
    setError(null);
    setItemType(newType);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError(`Please enter your Google AI API key.`);
      return;
    }
    if (!itemName.trim()) {
      setError(`Please enter a ${itemType} name.`);
      return;
    }
     if (itemName.trim().length > 150) {
      setError(`The ${itemType} title is too long. Please keep it under 150 characters.`);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Validating API Key...');
    setError(null);
    setItemData(null);

    try {
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API Key. Please check your key from Google AI Studio and try again.');
      }

      setLoadingMessage(`Finding details for ${itemName}...`);
      const data = await getItemData(itemName, year, itemType, apiKey);
      setItemData(data);
      setLoadingMessage('The AI is writing your narration...'); // Message for streaming phase
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      // Ensure error message is specific to the current item type
      setError(errorMessage.replace(/movie|book/gi, itemType));
      setIsLoading(false); // Stop loading on detail fetch error
    } 
    // `isLoading` is managed by ItemResultDisplay during streaming phase
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
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                />
              </section>

              <section className="my-10">
                 <BrowseSection 
                    list={browseLists[itemType]}
                    isLoading={isBrowseLoading && browseLists[itemType].length === 0}
                    isMoreLoading={isBrowseLoading && browseLists[itemType].length > 0}
                    error={browseError}
                    onSelectItem={handleBrowseSelect}
                    itemType={itemType}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore[itemType]}
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
            {itemData && <ItemResultDisplay data={itemData} apiKey={apiKey} onNewSearch={handleNewSearch} onNarrationComplete={handleNarrationComplete} initialLoadingMessage={loadingMessage} />}
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