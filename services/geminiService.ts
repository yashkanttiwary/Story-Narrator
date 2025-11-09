import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MovieDetails, BookDetails, ItemData, BrowseItem } from '../types';
import { MOVIE_NARRATION_PROMPT, BOOK_NARRATION_PROMPT } from './prompts';

const aiClientCache = new Map<string, GoogleGenAI>();

const getAiClient = (apiKey: string): GoogleGenAI => {
    if (!aiClientCache.has(apiKey)) {
        aiClientCache.set(apiKey, new GoogleGenAI({ apiKey }));
    }
    return aiClientCache.get(apiKey)!;
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;
    try {
        const ai = getAiClient(apiKey);
        // Use a lightweight model and short prompt for validation to minimize cost/time
        await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "test" });
        return true;
    } catch (error: any) {
        console.error("API Key validation failed:", error);
        // More specific error checking
        if (error.message.includes('API key not valid') || error.message.includes('permission denied') || error.message.includes('API_KEY_INVALID')) {
            return false;
        }
        // It might be a network error, but for this app's purpose, we treat it as a validation failure.
        return false;
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

const browseListSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            year: { type: Type.STRING, description: "The release or publication year as a string." },
            coverUrl: { type: Type.STRING, description: "A high-quality, publicly accessible direct image URL for the cover/poster." }
        },
        required: ['title', 'year', 'coverUrl']
    }
};

export const getBrowseList = async (itemType: 'movie' | 'book', apiKey: string, existingTitles: string[]): Promise<BrowseItem[]> => {
    const ai = getAiClient(apiKey);
    const avoidClause = existingTitles.length > 0
        ? ` IMPORTANT: Do not include any of the following titles in your response: ${existingTitles.join(', ')}.`
        : '';

    const prompt = `
        List 12 popular and critically acclaimed ${itemType}s that are not on the provided exclusion list. They should be a mix of recent hits and timeless classics.
        ${avoidClause}
        For each ${itemType}, provide its title, release/publication year, and a valid, publicly accessible URL for its cover image.
        Respond strictly in the JSON format defined by the schema. If you cannot find 12 new and distinct titles, return as many as you can find.
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
        return []; // Fail gracefully
    }
};

const getCoverUrl = async (itemName: string, itemType: 'movie' | 'book', year: string | undefined, apiKey: string): Promise<string> => {
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
    return '';
  }
};

const getItemDetails = async (itemName: string, year: string | undefined, itemType: 'movie' | 'book', apiKey: string): Promise<MovieDetails | BookDetails> => {
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
      Do not use any prior knowledge. If info is not present, use a null value. For cast, list the top 6 actors.
      CONTEXT: --- ${context} ---
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: extractionPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: itemType === 'movie' ? movieSchema : bookSchema,
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

export async function* getItemNarrationStream(itemName: string, year: string | undefined, itemType: 'movie' | 'book', apiKey: string) {
    const ai = getAiClient(apiKey);
    const promptTemplate = itemType === 'movie' ? MOVIE_NARRATION_PROMPT : BOOK_NARRATION_PROMPT;
    const finalPrompt = promptTemplate
        .replace(/{{ITEM_NAME}}/g, itemName)
        .replace('{{YEAR}}', year || 'N/A');

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents: finalPrompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    
    for await (const chunk of response) {
        yield chunk.text;
    }
}

// This function now only gets the details and cover. Narration is streamed separately.
export const getItemData = async (itemName: string, year: string | undefined, itemType: 'movie' | 'book', apiKey: string): Promise<Omit<ItemData, 'narration'>> => {
    const [detailsResult, coverUrlResult] = await Promise.allSettled([
        getItemDetails(itemName, year, itemType, apiKey),
        getCoverUrl(itemName, itemType, year, apiKey),
    ]);

    if (detailsResult.status === 'rejected') {
        console.error(`Error fetching ${itemType} details:`, detailsResult.reason);
        throw new Error(`We could not find details for that ${itemType}. Please check the title and year and try again.`);
    }
    const detailsWithoutCover = detailsResult.value;
    if (!detailsWithoutCover || !detailsWithoutCover.title) {
         throw new Error(`We could not find details for that ${itemType}. Please check the title and try again.`);
    }
    
    const coverUrl = coverUrlResult.status === 'fulfilled' ? coverUrlResult.value : '';
    const details = { ...detailsWithoutCover, coverUrl };

    if (itemType === 'movie') {
        return { type: 'movie', details: details as MovieDetails };
    } else {
        return { type: 'book', details: details as BookDetails };
    }
};

export const getNarrationAudio = async (text: string, apiKey: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with a calm and engaging tone: ${text}` }] }],
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
};