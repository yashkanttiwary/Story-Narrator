import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MovieDetails, BookDetails, ItemData } from '../types';

const MOVIE_NARRATION_PROMPT = `
ROLE: Intuitive Story Guide — You help someone experience a film's complete story by following its natural timeline and structure exactly as the director presents it, while revealing the emotional and thematic depths that create connection. You don't impose frameworks or reorganize—you follow the film's flow, weaving in character interiority, directorial craft, and thematic resonance organically as the story unfolds.

TASK: Guide me through the complete story of the film **{{ITEM_NAME}} ({{YEAR}})** in **1000-1200 words**, following its natural timeline and structure, with soul woven into the flow.
... [rest of detailed movie prompt]
`;

const BOOK_NARRATION_PROMPT = `
ROLE: Literary Story Guide — You help someone experience a book's complete story by following its narrative structure, while revealing the emotional and thematic depths woven into the author's prose. You follow the book's flow, weaving in character interiority, authorial craft, and thematic resonance organically as the story unfolds.

TASK: Guide me through the complete story of the book **{{ITEM_NAME}}** in **1000-1200 words**, following its narrative structure, with soul woven into the flow.

---

📖 THE FLOWING STRUCTURE — ORGANIC INTEGRATION

### 🎭 OPENING: The Soul's Essence (75-100 words)
Before diving into the story, briefly ground us in what we're about to experience:
- **What is this book about at its core?** (1-2 sentences) - The THEME or human experience it explores.
- **What's the narrative voice/tone?** (1 sentence) - Intimate, epic, melancholic, satirical, etc.
- **Who is at the center, and what's their inner struggle?** (1-2 sentences) - Their INTERNAL CONFLICT.

### 🌊 THE STORY FLOWS — Follow the Narrative with Soul Woven In
From here, simply TELL THE STORY in the order the book presents it, weaving in depth naturally:

**CORE TECHNIQUE: The Integrated Observation**
As you describe what happens, seamlessly integrate:
1.  **Character Interiority** — What they're feeling/fearing/wanting internally.
2.  **Thematic Resonance** — How moments connect to the book's core idea.
3.  **Authorial Craft** — How the author uses prose, structure, or symbolism to create feeling.
4.  **Emotional Truth** — Universal human moments that create connection.

### 💫 CLOSING: Thematic Echo (50-75 words)
After the story completes, briefly reflect:
- **What experience does this book give you?** What feeling does it leave you with?
- **What question or truth does it explore?** What is the book ultimately about/saying?
- **Why does it resonate?** What human truth does it touch?

---

🎯 EXECUTION PRINCIPLES — ORGANIC SOUL INTEGRATION
- **TIMELINE FIDELITY:** Tell the story in the exact order the book presents it.
- **RESPECT AUTHOR'S STRUCTURE:** Don't force a three-act structure if it's not there.
- **RESPECT AUTHOR'S PACING:** Match your narrative rhythm to the book's prose.
- **WEAVE SOUL NATURALLY:** Integrate observations about character, theme, and craft into the flow.
- **WORD LIMIT:** 1000-1200 words.

Now, guide me through the story of the book: **{{ITEM_NAME}}**
`;

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


const getCoverUrl = async (itemName: string, itemType: 'movie' | 'book', year: string | undefined, apiKey: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const yearInfo = year ? `(${year})` : '';
  const prompt = `
    TASK: Find the most reliable, high-resolution, publicly accessible direct image URL for the official cover/poster of the ${itemType} "${itemName}" ${yearInfo}.

    INSTRUCTIONS:
    1.  **Prioritize Official Sources:** 
        - For movies, use Google Search to find the movie on The Movie Database (TMDb) or IMDb.
        - For books, use Google Search to find the book on Goodreads, Publisher's website, or Google Books.
    2.  **Construct URL:** If possible, construct the full image URL using a high-resolution path from the source (e.g., TMDb's '/original/' path).
    3.  **URL Verification:** The final URL MUST be a direct link to an image file (e.g., .jpg, .png, .webp) and NOT to a webpage.
    4.  **No Unreliable Sources:** Do NOT use URLs from fan wikis, blogs, or other non-reputable sources.
    5.  **Output:** Return ONLY the single, complete, valid URL. If no reliable URL is found, return an empty string.
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
    const ai = new GoogleGenAI({ apiKey });
    
    // Step 1: Use Google Search to get grounded, rich context.
    const searchPrompt = `
        Perform a comprehensive Google Search for the ${itemType}: "${itemName}"${year ? ` released around ${year}` : ''}. 
        Gather all key details including:
        - For Movies: Full title, release date, director(s), screenplay writer(s), cinematographer(s), producer(s), running time, genres, cast (top 6-8 actors and their characters), IMDb rating, Rotten Tomatoes score, Letterboxd rating, budget, box office, and whether it was adapted from another work. Also find a high-quality, thematic backdrop image URL.
        - For Books: Full title, author(s), original publication date, publisher, page count, genres, any major awards won, and a high-quality, thematic backdrop image URL.
        Synthesize this information into a detailed text summary. Prioritize the most well-known and acclaimed version of the item.
    `;

    const searchResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: searchPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const context = searchResponse.text?.trim();

    if (!context || context.length < 50) {
        throw new Error(`Could not find sufficient information for "${itemName}" using Google Search.`);
    }

    // Step 2: Use the grounded context to populate the JSON schema.
    const extractionPrompt = `
        Based *only* on the following context, extract the information for the ${itemType} "${itemName}" and format it precisely according to the provided JSON schema. Be as accurate as possible. If a piece of information is not available in the context, use a null value. Do not invent or infer information not present in the context.

        CONTEXT:
        ---
        ${context}
        ---
    `;

    const extractionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: extractionPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: itemType === 'movie' ? movieSchema : bookSchema,
        },
    });

    try {
        const jsonText = extractionResponse.text?.trim() || '{}';
        if (jsonText === '{}') {
            throw new Error(`Could not extract ${itemType} details from the search results. The API returned an empty response.`);
        }
        return JSON.parse(jsonText);
    } catch (e) {
        console.error(`Failed to parse extracted ${itemType} details JSON:`, e, `Raw response: "${extractionResponse.text}"`);
        throw new Error(`Could not structure the ${itemType} details. The format was invalid.`);
    }
};

const getItemNarration = async (itemName: string, year: string | undefined, itemType: 'movie' | 'book', apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const promptTemplate = itemType === 'movie' ? MOVIE_NARRATION_PROMPT : BOOK_NARRATION_PROMPT;
    const finalPrompt = promptTemplate
        .replace(/{{ITEM_NAME}}/g, itemName)
        .replace('{{YEAR}}', year || 'N/A');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: finalPrompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    });

    return response.text?.trim() || '';
};

export const getItemData = async (itemName: string, year: string | undefined, itemType: 'movie' | 'book', apiKey: string): Promise<ItemData> => {
    const [detailsResult, narrationResult, coverUrlResult] = await Promise.allSettled([
        getItemDetails(itemName, year, itemType, apiKey),
        getItemNarration(itemName, year, itemType, apiKey),
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

    if (narrationResult.status === 'rejected') {
        console.error("Error generating narration:", narrationResult.reason);
        throw new Error(`We were unable to generate a narration for this ${itemType} at this time.`);
    }
    
    const narration = narrationResult.value;
    if (!narration || narration.trim().length < 100) {
        throw new Error(`We were unable to generate a sufficient narration for this ${itemType}.`);
    }
    
    const coverUrl = coverUrlResult.status === 'fulfilled' ? coverUrlResult.value : '';

    const details = { ...detailsWithoutCover, coverUrl };

    if (itemType === 'movie') {
        return { type: 'movie', details: details as MovieDetails, narration };
    } else {
        return { type: 'book', details: details as BookDetails, narration };
    }
};

export const getNarrationAudio = async (text: string, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
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