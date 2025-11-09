import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MovieDetails, BookDetails, SeriesDetails, AnimeDetails, ItemData, BrowseItem, ItemType } from '../types';
import { MOVIE_NARRATION_PROMPT, BOOK_NARRATION_PROMPT, SERIES_NARRATION_PROMPT, ANIME_NARRATION_PROMPT } from './prompts';

const aiClientCache = new Map<string, GoogleGenAI>();

const getAiClient = (apiKey: string): GoogleGenAI => {
    if (!aiClientCache.has(apiKey)) {
        aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
    }
    return aiClientCache.get(apiKey)!;
};

const parseGoogleGenAIError = (error: any): string => {
    if (typeof error?.message === 'string') {
        try {
            const match = error.message.match(/\[GoogleGenerativeAI Error\]: (.*)/);
            if (match && match[1]) {
                const errorJson = JSON.parse(match[1]);
                if (errorJson.error?.status === 'RESOURCE_EXHAUSTED') {
                    return "Rate limit exceeded. Please wait a moment and try again.";
                }
                if (errorJson.error?.message?.includes('API key not valid')) {
                    return "Invalid API Key. Please check your key and try again.";
                }
                return errorJson.error?.message || "An unknown API error occurred.";
            }
        } catch (e) {
            // Not a JSON error, return the original message if it's informative
            if (error.message.includes('API key not valid')) {
                 return "Invalid API Key. Please check your key and try again.";
            }
        }
    }
    return "An unexpected error occurred with the AI service.";
};


export const validateApiKey = async (apiKey: string): Promise<true> => {
    if (!apiKey) throw new Error("API Key is required.");
    try {
        const ai = getAiClient(apiKey);
        await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "test" });
        return true;
    } catch (error: any) {
        console.error("API Key validation failed:", error);
        throw new Error(parseGoogleGenAIError(error));
    }
};

const movieSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        backdropUrl: { type: Type.STRING, nullable: true, description: "A high-quality, thematic, publicly accessible image URL. Can be null." },
        genres: { type: Type.ARRAY, items: { type: Type.STRING } },
        imdbRating: { type: Type.STRING, nullable: true },
        letterboxdRating: { type: Type.STRING, nullable: true },
        rottenTomatoesRating: { type: Type.STRING, nullable: true },
        releaseDate: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
        director: { type: Type.ARRAY, items: { type: Type.STRING } },
        cinematography: { type: Type.ARRAY, items: { type: Type.STRING } },
        screenplay: { type: Type.ARRAY, items: { type: Type.STRING } },
        runningTime: { type: Type.STRING, description: "e.g., '148 minutes'", nullable: true },
        adaptedFrom: { type: Type.STRING, nullable: true },
        producer: { type: Type.ARRAY, items: { type: Type.STRING } },
        trailerUrl: { type: Type.STRING, nullable: true, description: "A direct, publicly accessible URL to the official movie trailer (e.g., YouTube)." },
        budget: { type: Type.STRING, nullable: true },
        boxOffice: { type: Type.STRING, nullable: true },
        cast: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    actorName: { type: Type.STRING },
                    characterName: { type: Type.STRING }
                },
                required: ['actorName', 'characterName']
            }
        }
    },
    required: ['title', 'genres', 'releaseDate', 'director', 'cast']
};

const bookSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        backdropUrl: { type: Type.STRING, nullable: true, description: "A high-quality, thematic, publicly accessible image URL. Can be null." },
        author: { type: Type.ARRAY, items: { type: Type.STRING } },
        genres: { type: Type.ARRAY, items: { type: Type.STRING } },
        publicationDate: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
        publisher: { type: Type.STRING, nullable: true },
        pageCount: { type: Type.STRING, description: "e.g., '354 pages'", nullable: true },
        awards: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
    },
    required: ['title', 'author', 'genres', 'publicationDate']
};

const seriesSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        backdropUrl: { type: Type.STRING, nullable: true, description: "A high-quality, thematic, publicly accessible image URL. Can be null." },
        genres: { type: Type.ARRAY, items: { type: Type.STRING } },
        creator: { type: Type.ARRAY, items: { type: Type.STRING } },
        seasons: { type: Type.STRING, description: "e.g., '5 seasons'" },
        episodes: { type: Type.STRING, description: "e.g., '62 episodes'" },
        releaseDate: { type: Type.STRING, description: "Format: YYYY-MM-DD (of the first episode)" },
        network: { type: Type.STRING, nullable: true, description: "The original network or streaming service." },
    },
    required: ['title', 'genres', 'creator', 'seasons', 'episodes', 'releaseDate'],
};

const animeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        backdropUrl: { type: Type.STRING, nullable: true, description: "A high-quality, thematic, publicly accessible image URL. Can be null." },
        genres: { type: Type.ARRAY, items: { type: Type.STRING } },
        studio: { type: Type.ARRAY, items: { type: Type.STRING } },
        episodes: { type: Type.STRING, description: "e.g., '26 episodes'" },
        releaseDate: { type: Type.STRING, description: "Format: YYYY-MM-DD (of the first episode)" },
        director: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['title', 'genres', 'studio', 'episodes', 'releaseDate'],
};


const browseItemSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        year: { type: Type.STRING, description: "The release or publication year as a string." },
        coverUrl: { type: Type.STRING, nullable: true, description: "A high-quality, publicly accessible direct image URL for the cover/poster." }
    },
    required: ['title', 'year']
};

const browseListSchema = { type: Type.ARRAY, items: browseItemSchema };

const multiBrowseListSchema = {
    type: Type.OBJECT,
    properties: {
        movie: { type: Type.ARRAY, items: browseItemSchema },
        book: { type: Type.ARRAY, items: browseItemSchema },
        series: { type: Type.ARRAY, items: browseItemSchema },
        anime: { type: Type.ARRAY, items: browseItemSchema }
    },
    required: ['movie', 'book', 'series', 'anime']
};

export const getInitialBrowseLists = async (apiKey: string, count: number = 12): Promise<Record<ItemType, BrowseItem[]>> => {
    const ai = getAiClient(apiKey);
    const prompt = `
        List ${count} popular and critically acclaimed items for each of the following categories: movie, book, series, and anime.
        For each item, provide its title, release/publication year, and a valid, publicly accessible URL for its cover image if available.
        They should be a mix of recent hits and timeless classics.
        Respond strictly in the JSON format defined by the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: multiBrowseListSchema,
            },
        });
        const jsonText = response.text?.trim() || '{}';
        const parsedJson = JSON.parse(jsonText);
        const allCategories: Record<ItemType, BrowseItem[]> = {
            movie: parsedJson.movie || [],
            book: parsedJson.book || [],
            series: parsedJson.series || [],
            anime: parsedJson.anime || [],
        };
        return allCategories;
    } catch (error) {
        console.error(`Error fetching initial browse lists:`, error);
        throw new Error(parseGoogleGenAIError(error));
    }
};

const getSchemaForItemType = (itemType: ItemType) => {
    switch (itemType) {
        case 'movie': return movieSchema;
        case 'book': return bookSchema;
        case 'series': return seriesSchema;
        case 'anime': return animeSchema;
    }
};

export const getBrowseList = async (itemType: ItemType, apiKey: string, existingTitles: string[], count: number = 8): Promise<BrowseItem[]> => {
    const ai = getAiClient(apiKey);
    const avoidClause = existingTitles.length > 0
        ? ` IMPORTANT: Do not include any of the following titles in your response: ${existingTitles.join(', ')}.`
        : '';

    const prompt = `
        List ${count} popular and critically acclaimed ${itemType}s that are not on the provided exclusion list. They should be a mix of recent hits and timeless classics.
        ${avoidClause}
        For each ${itemType}, provide its title and release/publication year. Also provide a valid, publicly accessible URL for its cover image, if one is readily available.
        Respond strictly in the JSON format defined by the schema. If you cannot find ${count} new and distinct titles, return as many as you can find.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: browseListSchema,
            },
        });
        const jsonText = response.text?.trim() || '[]';
        return JSON.parse(jsonText);
    } catch (error) {
        console.error(`Error fetching browse list for ${itemType}:`, error);
        throw new Error(parseGoogleGenAIError(error));
    }
};

const getCoverUrl = async (itemName: string, itemType: ItemType, year: string | undefined, apiKey: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const yearInfo = year ? `(${year})` : '';
  const prompt = `
    TASK: Find the most reliable, high-resolution, publicly accessible direct image URL for the official cover/poster of the ${itemType} "${itemName}" ${yearInfo}.
    INSTRUCTIONS:
    1.  Use Google Search to find the item on an official source (TMDb, IMDb for movies; Goodreads, Google Books for books).
    2.  Construct a full, high-resolution, direct image URL (e.g., ending in .jpg, .png).
    3.  Output ONLY the single, complete, valid URL. If none is found, return an empty string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error(`Error fetching ${itemType} cover URL:`, error);
    // Do not throw here, let details proceed
    return '';
  }
};

const getItemDetails = async (itemName: string, year: string | undefined, itemType: ItemType, apiKey: string): Promise<MovieDetails | BookDetails | SeriesDetails | AnimeDetails> => {
    const ai = getAiClient(apiKey);
    const yearInfo = year ? ` released around ${year}` : '';
    const searchPrompt = `
      Perform a comprehensive Google Search for the ${itemType} "${itemName}"${yearInfo}. 
      Gather key information for the most relevant result, including a direct URL to its official trailer if it's a movie.
      Summarize your findings as a block of text. This information will be used to populate a data structure.
    `;

    const searchResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: searchPrompt,
        config: { tools: [{ googleSearch: {} }] },
    });
    
    const context = searchResult.text;
    if (!context || context.trim().length < 20) {
        throw new Error(`Could not find sufficient information for "${itemName}" via Google Search.`);
    }
    const extractionPrompt = `
      Based *only* on the following context, extract the requested information and format it precisely according to the provided JSON schema. 
      Do not use any prior knowledge. If info is not present, use a null value. For movie cast, list the top 6 actors.
      CONTEXT: --- ${context} ---
    `;
    
    const schema = getSchemaForItemType(itemType);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: extractionPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    try {
        const jsonText = response.text?.trim() || '{}';
        if (jsonText === '{}') throw new Error(`Could not extract ${itemType} details from the search results.`);
        return JSON.parse(jsonText);
    } catch (e) {
        console.error(`Failed to parse ${itemType} details JSON:`, e, `Raw response: "${response.text}"`);
        throw new Error(`Could not structure the ${itemType} details.`);
    }
};

export async function* getItemNarrationStream(itemName: string, year: string | undefined, itemType: ItemType, apiKey: string) {
    const ai = getAiClient(apiKey);
    let promptTemplate;
    switch(itemType) {
        case 'movie': promptTemplate = MOVIE_NARRATION_PROMPT; break;
        case 'book': promptTemplate = BOOK_NARRATION_PROMPT; break;
        case 'series': promptTemplate = SERIES_NARRATION_PROMPT; break;
        case 'anime': promptTemplate = ANIME_NARRATION_PROMPT; break;
        default: throw new Error("Invalid item type for narration.");
    }

    const finalPrompt = promptTemplate
        .replace(/{{ITEM_NAME}}/g, itemName)
        .replace('{{YEAR}}', year || 'N/A');

    try {
        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: finalPrompt,
            config: { thinkingConfig: { thinkingBudget: 32768 } }
        });
        
        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error(`Error getting narration stream for ${itemType}:`, error);
        throw new Error(parseGoogleGenAIError(error));
    }
}

export const getItemData = async (itemName: string, year: string | undefined, itemType: ItemType, apiKey: string): Promise<ItemData> => {
    try {
        const [detailsResult, coverUrlResult] = await Promise.allSettled([
            getItemDetails(itemName, year, itemType, apiKey),
            getCoverUrl(itemName, itemType, year, apiKey),
        ]);

        if (detailsResult.status === 'rejected') {
            throw detailsResult.reason;
        }
        
        const detailsWithoutCover = detailsResult.value;
        if (!detailsWithoutCover || !detailsWithoutCover.title) {
             throw new Error(`We could not find details for that ${itemType}. Please check the title and try again.`);
        }
        
        const coverUrl = coverUrlResult.status === 'fulfilled' ? coverUrlResult.value : '';
        const details = { ...detailsWithoutCover, coverUrl };

        // This is a type assertion party, but it's safe due to our structured flow.
        switch (itemType) {
            case 'movie':
                return { type: 'movie', details: details as MovieDetails };
            case 'book':
                return { type: 'book', details: details as BookDetails };
            case 'series':
                return { type: 'series', details: details as SeriesDetails };
            case 'anime':
                return { type: 'anime', details: details as AnimeDetails };
            default:
                throw new Error("Invalid item type.");
        }
    } catch (error: any) {
        console.error(`Error in getItemData for ${itemType}:`, error);
        const message = error.message || `We could not find details for that ${itemType}. Please check the title and year and try again.`;
        // Use parseGoogleGenAIError to provide more specific feedback if it's an API error
        throw new Error(message.includes("find details") ? message : parseGoogleGenAIError(error));
    }
};

export const getNarrationAudio = async (text: string, apiKey: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        // Truncate text to avoid overly long audio generation requests which may fail.
        const truncatedText = text.length > 4500 ? text.substring(0, 4500) : text;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: truncatedText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("Could not generate audio from the narration.");
        }
        return base64Audio;
    } catch(error) {
        console.error("Error generating audio:", error);
        throw new Error(parseGoogleGenAIError(error));
    }
};
