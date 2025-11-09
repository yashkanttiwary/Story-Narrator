import React, { createContext, useState, useMemo, FC, ReactNode } from 'react';

interface ApiContextType {
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const ApiContext = createContext<ApiContextType>({
    apiKey: '',
    setApiKey: () => {},
});

export const ApiProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [apiKey, setApiKey] = useState<string>('');

    const handleSetApiKey = (key: string) => {
        setApiKey(key);
    };

    const value = useMemo(() => ({
        apiKey,
        setApiKey: handleSetApiKey,
    }), [apiKey]);

    return (
        <ApiContext.Provider value={value}>
            {children}
        </ApiContext.Provider>
    );
};