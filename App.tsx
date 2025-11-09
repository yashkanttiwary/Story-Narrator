import React, { useState, useCallback, useEffect, useContext, FC } from 'react';
import { ItemData, BrowseItem, ItemType } from './types';
import { getItemData, getInitialBrowseLists, getBrowseList } from './services/geminiService';
import { ApiContext } from './contexts/ApiContext';
import ItemInputForm from './components/ItemInputForm';
import ItemResultDisplay from './components/ItemResultDisplay';
import ResultSkeleton from './components/ResultSkeleton';
import BrowseSection from './components/BrowseSection';

const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};


const App: FC = () => {
  const [itemName, setItemName] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType>('movie');
  const { apiKey, setApiKey } = useContext(ApiContext);
  const debouncedApiKey = useDebounce(apiKey, 500);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [browseLists, setBrowseLists] = useState<Record<ItemType, BrowseItem[]>>({ movie: [], book: [], series: [], anime: [] });
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<Record<ItemType, boolean>>({ movie: true, book: true, series: true, anime: true });
  const [initialBrowseFetched, setInitialBrowseFetched] = useState(false);

  useEffect(() => {
    const fetchAllInitialData = async (currentApiKey: string) => {
        if (!currentApiKey || initialBrowseFetched) {
            if (!currentApiKey) {
                setBrowseLists({ movie: [], book: [], series: [], anime: [] });
                setHasMore({ movie: true, book: true, series: true, anime: true });
                setBrowseError('Enter an API key to browse titles.');
                setInitialBrowseFetched(false);
            }
            return;
        }

        setIsBrowseLoading(true);
        setBrowseError(null);
        try {
            const allLists = await getInitialBrowseLists(currentApiKey, 12);
            setBrowseLists(allLists);
            
            const newHasMore: Record<ItemType, boolean> = { movie: true, book: true, series: true, anime: true };
            (Object.keys(allLists) as ItemType[]).forEach(key => {
                if (allLists[key].length < 12) {
                    newHasMore[key] = false;
                }
            });
            setHasMore(newHasMore);
            setInitialBrowseFetched(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Could not load popular titles.`;
            setBrowseError(errorMessage);
            setBrowseLists({ movie: [], book: [], series: [], anime: [] });
        } finally {
            setIsBrowseLoading(false);
        }
    };

    fetchAllInitialData(debouncedApiKey);
  }, [debouncedApiKey, initialBrowseFetched]);

  const handleLoadMore = useCallback(async () => {
    if (isMoreLoading || !hasMore[itemType] || !debouncedApiKey) return;

    setIsMoreLoading(true);
    try {
        const existingTitles = browseLists[itemType].map(item => item.title);
        const list = await getBrowseList(itemType, debouncedApiKey, existingTitles, 12);

        if (list.length < 12) {
            setHasMore(prev => ({ ...prev, [itemType]: false }));
        }
        
        const newItems = list.filter(newItem => !existingTitles.includes(newItem.title));
        setBrowseLists(prev => ({ ...prev, [itemType]: [...prev[itemType], ...newItems] }));
        
    } catch (err) {
       // Silently fail on load more to not disrupt UX
       console.error(`Could not load more ${itemType}s.`, err);
    } finally {
        setIsMoreLoading(false);
    }
  }, [isMoreLoading, hasMore, itemType, debouncedApiKey, browseLists]);

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

              <section className="my-10">
                 <BrowseSection 
                    list={browseLists[itemType]}
                    isLoading={isBrowseLoading}
                    isMoreLoading={isMoreLoading}
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
