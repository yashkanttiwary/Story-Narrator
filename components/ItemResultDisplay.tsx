import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { ItemData, MovieDetails, BookDetails, SeriesDetails, AnimeDetails, ChatMessage } from '../types';
import AudioPlayer from './AudioPlayer';
import DownloadIcon from './icons/DownloadIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import SearchIcon from './icons/SearchIcon';
import MarkdownRenderer from './MarkdownRenderer';
import { getNarrationAudio, getItemNarrationStream } from '../services/geminiService';
import { decode, decodeAudioData, createWavBlob, AUDIO_SAMPLE_RATE } from '../utils/audioUtils';
import Loader from './Loader';
import ChatBox from './ChatBox';
import { ApiContext } from '../contexts/ApiContext';


declare global {
  interface Window {
    jspdf: any;
  }
}

interface ItemResultDisplayProps {
  data: Omit<ItemData, 'narration'>;
  onNewSearch: () => void;
  onNarrationComplete: () => void;
  initialLoadingMessage: string;
}

const createGoogleSearchUrl = (query: string | null): string => {
  if (!query) return '';
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const DetailItem: React.FC<{ label: string; value: string | string[] | null; linkable?: boolean }> = ({ label, value, linkable = false }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  let content;
  if (linkable) {
    const names = (Array.isArray(value) ? value : String(value).split(','))
      .map(name => String(name).trim())
      .filter(Boolean);

    content = (
      <p className="text-base text-white">
        {names.map((name, index) => (
          <React.Fragment key={name}>
            <a
              href={createGoogleSearchUrl(name)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-300 transition-colors underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
            >
              {name}
            </a>
            {index < names.length - 1 && ', '}
          </React.Fragment>
        ))}
      </p>
    );
  } else {
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    content = <p className="text-base text-white">{displayValue}</p>;
  }

  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      {content}
    </div>
  );
};

const RatingDisplay: React.FC<{ label: string; value: string | null }> = ({ label, value }) => {
  const displayValue = (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'n/a') ? 'N/A' : value;
  return (
    <p>
      <span className="font-bold text-gray-400">{label}:</span>{' '}
      <span className="text-white font-semibold">{displayValue}</span>
    </p>
  );
};

const formatRunningTime = (timeStr: string | null): string | null => {
    if (!timeStr) return null;
    const minutesMatch = timeStr.match(/\d+/);
    if (!minutesMatch) return timeStr; 
    const totalMinutes = parseInt(minutesMatch[0], 10);
    if (isNaN(totalMinutes)) return timeStr;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let formattedTime = '';
    if (hours > 0) formattedTime += `${hours}h `;
    if (minutes > 0 || hours === 0) formattedTime += `${minutes}m`;
    return formattedTime.trim() || timeStr;
};

const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750" fill="#1f2937" aria-label="Placeholder for cover art"><g transform="translate(175, 300) scale(6.25)"><path d="M2,4.18A2.18,2.18,0,0,1,4.18,2H19.82A2.18,2.18,0,0,1,22,4.18V19.82A2.18,2.18,0,0,1,19.82,22H4.18A2.18,2.18,0,0,1,2,19.82Z M7,2V22 M17,2V22 M2,12H22 M2,7H7 M2,17H7 M17,17H22 M17,7H22" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></g></svg>`;
const placeholderCover = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;

const sanitizeTextForPdf = (text: string): string => {
  let sanitizedText = text
    .replace(/“|”/g, '"')
    .replace(/‘|’|`/g, "'")
    .replace(/—/g, '--')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '*');
  sanitizedText = sanitizedText.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
  return sanitizedText;
};

const ItemResultDisplay: React.FC<ItemResultDisplayProps> = ({ data, onNewSearch, onNarrationComplete, initialLoadingMessage }) => {
  const { type, details } = data;
  const { apiKey } = useContext(ApiContext);

  const [narration, setNarration] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let active = true;
    const streamNarration = async () => {
      setNarration('');
      setNarrationError(null);
      try {
        const stream = getItemNarrationStream(details.title, (details as any).releaseDate || (details as any).publicationDate, type, apiKey);
        for await (const chunk of stream) {
          if (!active) return;
          setNarration(prev => prev + chunk);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Sorry, we couldn't generate the narration at this time.";
        console.error("Narration streaming failed:", error);
        if (active) setNarrationError(errorMessage);
      } finally {
        if (active) {
          setIsStreaming(false);
          onNarrationComplete();
        }
      }
    };
    if (apiKey) {
        streamNarration();
    }
    return () => { active = false; };
  }, [data, apiKey, onNarrationComplete, details.title, type]);


  const getYear = (details: ItemData['details']) => {
    if ('releaseDate' in details && details.releaseDate) {
        return new Date(details.releaseDate).getFullYear();
    }
    if ('publicationDate' in details && details.publicationDate) {
        return new Date(details.publicationDate).getFullYear();
    }
    return '';
  }
  const year = getYear(details);
  const coverSrc = details.coverUrl || placeholderCover;

  const trailerSearchQuery = encodeURIComponent(`${details.title} ${year} official trailer`);
  const trailerLink = `https://www.youtube.com/results?search_query=${trailerSearchQuery}`;
  
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [audioData, setAudioData] = useState<{ buffer: AudioBuffer; wavBlob: Blob } | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanupAudio = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsAudioPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [cleanupAudio, narration]);
  
  const fetchAndCacheAudio = useCallback(async () => {
    if (audioData || isStreaming || !narration) return audioData;
    
    setIsAudioLoading(true);
    setAudioError(null);
    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE });
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const base64Audio = await getNarrationAudio(narration, apiKey);
        const pcmData = decode(base64Audio);
        const buffer = await decodeAudioData(pcmData, audioContextRef.current, AUDIO_SAMPLE_RATE, 1);
        const wavBlob = createWavBlob(pcmData, AUDIO_SAMPLE_RATE, 1);

        const newAudioData = { buffer, wavBlob };
        setAudioData(newAudioData);
        return newAudioData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Sorry, we couldn't generate the audio at this time.";
        console.error("Failed to generate audio:", error);
        setAudioError(errorMessage);
        return null;
    } finally {
        setIsAudioLoading(false);
    }
  }, [audioData, narration, apiKey, isStreaming]);

  const handlePlayPause = useCallback(async () => {
    if (isAudioLoading || isStreaming) return;

    if (isAudioPlaying) {
      cleanupAudio();
      return;
    }

    const currentAudio = audioData ?? await fetchAndCacheAudio();
    
    if (currentAudio && audioContextRef.current) {
      cleanupAudio(); 
      const source = audioContextRef.current.createBufferSource();
      source.buffer = currentAudio.buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsAudioPlaying(false);
        sourceRef.current = null;
      };
      source.start(0);
      sourceRef.current = source;
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying, isAudioLoading, audioData, fetchAndCacheAudio, cleanupAudio, isStreaming]);

  const handleDownloadAudio = useCallback(async () => {
    if (isDownloadLoading || isStreaming) return;
    setIsDownloadLoading(true);
    const currentAudio = audioData ?? await fetchAndCacheAudio();
    setIsDownloadLoading(false);

    if (currentAudio) {
      const url = URL.createObjectURL(currentAudio.wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${details.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/ /g, '-')}-narration.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  }, [audioData, fetchAndCacheAudio, details.title, isDownloadLoading, isStreaming]);

  const handleDownloadPdf = useCallback(() => {
    if (isStreaming || typeof window.jspdf === 'undefined') {
      if (typeof window.jspdf === 'undefined') {
          alert('PDF generation library is not available.');
      }
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const title = `AI Narration for ${details.title}`;
    const filename = `${details.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/ /g, '-')}-narration.pdf`;
    const page = { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight(), margin: { top: 20, right: 15, bottom: 25, left: 15 } };
    const contentWidth = page.width - page.margin.left - page.margin.right;
    let y = page.margin.top;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, page.width / 2, y, { align: 'center' });
    y += 10;
    doc.setDrawColor(180);
    doc.line(page.margin.left, y, page.width - page.margin.right, y);
    y += 10;

    const sanitizedNarration = sanitizeTextForPdf(narration);
    const blocks = sanitizedNarration.split(/\n\s*\n/);
    blocks.forEach(block => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;
      let textToRender = trimmedBlock;
      let fontStyle = 'normal';
      let fontSize = 11;
      let spaceAfter = 4;
      if (trimmedBlock.startsWith('### ')) {
        textToRender = trimmedBlock.substring(4);
        fontStyle = 'bold';
        fontSize = 13;
        spaceAfter = 6;
      } else if (trimmedBlock === '---') {
        y += 4;
        if (y + 6 > page.height - page.margin.bottom) { doc.addPage(); y = page.margin.top; }
        doc.line(page.margin.left, y, page.width - page.margin.right, y);
        y += 6;
        return;
      }
      textToRender = textToRender.replace(/\*/g, '');
      doc.setFont('times', fontStyle);
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(textToRender.replace(/\n/g, ' '), contentWidth);
      const blockHeight = doc.getTextDimensions(lines).h;
      if (y + blockHeight > page.height - page.margin.bottom) { doc.addPage(); y = page.margin.top; }
      doc.text(lines, page.margin.left, y, { lineHeightFactor: 1.15 });
      y += blockHeight + spaceAfter;
    });

    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, page.width / 2, page.height - 15, { align: 'center' });
    }
    doc.save(filename);
  }, [details.title, narration, isStreaming]);

  const handleCopy = useCallback(() => {
    if (isCopied || isStreaming || !narration) return;
    navigator.clipboard.writeText(narration)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      });
  }, [narration, isCopied, isStreaming]);
  
  const renderDetails = () => {
    switch(data.type) {
      case 'movie':
        const d = data.details as MovieDetails;
        return <>
            <DetailItem label="Director" value={d.director} linkable />
            <DetailItem label="Screenplay" value={d.screenplay} linkable />
            <DetailItem label="Cinematography" value={d.cinematography} linkable />
            <DetailItem label="Producer" value={d.producer} linkable />
            <DetailItem label="Running Time" value={formatRunningTime(d.runningTime)} />
            <DetailItem label="Adapted From" value={d.adaptedFrom} />
            <DetailItem label="Budget" value={d.budget} />
            <DetailItem label="Box Office" value={d.boxOffice} />
        </>;
      case 'book':
        const b = data.details as BookDetails;
        return <>
          <DetailItem label="Author" value={b.author} linkable />
          <DetailItem label="Publisher" value={b.publisher} />
          <DetailItem label="Page Count" value={b.pageCount} />
          <DetailItem label="Awards" value={b.awards} />
        </>;
       case 'series':
         const s = data.details as SeriesDetails;
         return <>
            <DetailItem label="Creator" value={s.creator} linkable />
            <DetailItem label="Seasons" value={s.seasons} />
            <DetailItem label="Episodes" value={s.episodes} />
            <DetailItem label="Network" value={s.network} />
         </>;
        case 'anime':
         const a = data.details as AnimeDetails;
         return <>
            <DetailItem label="Studio" value={a.studio} linkable />
            <DetailItem label="Episodes" value={a.episodes} />
            <DetailItem label="Director" value={a.director} linkable/>
         </>;
      default:
        return null;
    }
  }
  
  const renderCast = () => {
      if (data.type === 'movie' && data.details.cast && data.details.cast.length > 0) {
          return (
              <div className="md:col-span-2">
                <h4 className="text-xl font-semibold text-white mb-4">Main Cast</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {data.details.cast.map((member) => (
                    <div key={member.actorName}>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(member.actorName)}`} target="_blank" rel="noopener noreferrer" className="text-base text-white font-medium hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded">
                        {member.actorName}
                        </a>
                        <p className="text-sm text-gray-400">as {member.characterName}</p>
                    </div>
                    ))}
                </div>
            </div>
          )
      }
      return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in">
       <div className="text-center mb-8">
        <button
          onClick={onNewSearch}
          className="inline-flex items-center justify-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          aria-label="Start a new search"
        >
          <SearchIcon className="w-5 h-5 mr-2" />
          <span>New Search</span>
        </button>
      </div>

      <div className="relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
        {details.backdropUrl && <img src={details.backdropUrl} alt={`Backdrop for ${details.title}`} className="absolute inset-0 w-full h-full object-cover object-center" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-transparent"></div>
      </div>
      
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-32 md:-mt-40 z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0">
            <div className="relative w-full aspect-[2/3] bg-gray-800 rounded-lg shadow-xl border-4 border-gray-800 overflow-hidden">
                <img src={coverSrc} alt={`Cover for ${details.title}`} className="absolute top-0 left-0 w-full h-full object-cover" onError={(e) => { const img = e.currentTarget; img.onerror = null; if (img.src !== placeholderCover) { img.src = placeholderCover; } }} />
            </div>
             <div className="mt-4 flex flex-col gap-3">
              {type === 'movie' && (
                <a href={trailerLink} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  Watch Trailer
                </a>
              )}
              <AudioPlayer onPlayPause={handlePlayPause} isPlaying={isAudioPlaying} isLoading={isAudioLoading || isStreaming} />
              {audioError && <p className="text-xs text-center text-red-400">{audioError}</p>}
            </div>
          </div>
          
          <div className="flex-grow pt-8 md:pt-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">{details.title}</h2>
            {year && <p className="text-xl font-light text-gray-400 mt-1">{year}</p>}
            <div className="flex flex-wrap gap-2 my-4">{details.genres.map(genre => <span key={genre} className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full">{genre}</span>)}</div>
            {type === 'movie' && (details as MovieDetails).imdbRating && (
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2 my-5 text-sm">
                  <RatingDisplay label="IMDb" value={(details as MovieDetails).imdbRating} />
                  <RatingDisplay label="Rotten Tomatoes" value={(details as MovieDetails).rottenTomatoesRating} />
                  <RatingDisplay label="Letterboxd" value={(details as MovieDetails).letterboxdRating} />
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-12">
          <div>
            <div className="flex justify-between items-center border-b-2 border-indigo-500/30 pb-2 mb-4">
              <h3 className="text-2xl font-bold text-indigo-300">AI Narration</h3>
              <div className="flex items-center gap-2">
                 <button onClick={handleDownloadAudio} disabled={isDownloadLoading || isStreaming || !narration} aria-label="Download narration as WAV audio" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700/60 hover:bg-gray-700 rounded-md transition-colors text-gray-300 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" title="Download as WAV audio">
                  {isDownloadLoading ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <DownloadIcon className="w-4 h-4" />}
                  <span>Audio</span>
                </button>
                <button onClick={handleDownloadPdf} disabled={isStreaming || !narration} aria-label="Download narration as PDF" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700/60 hover:bg-gray-700 rounded-md transition-colors text-gray-300 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" title="Download as PDF">
                  <DownloadIcon className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button onClick={handleCopy} disabled={isCopied || isStreaming || !narration} aria-label="Copy narration text to clipboard" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700/60 hover:bg-gray-700 rounded-md transition-colors text-gray-300 w-28 justify-center disabled:bg-green-600/80 disabled:cursor-default disabled:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-400" title="Copy to clipboard">
                  {isCopied ? (<><CheckIcon className="w-4 h-4" /><span>Copied!</span></>) : (<><CopyIcon className="w-4 h-4" /><span>Copy Text</span></>)}
                </button>
              </div>
            </div>
            {isStreaming && !narration && <Loader message={initialLoadingMessage} />}
            {narrationError && (
                 <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
                    <p className="font-semibold text-red-300">Narration Failed</p>
                    <p className="text-red-400 text-sm">{narrationError}</p>
                </div>
            )}
            <div className="prose prose-invert max-w-none text-gray-300">
              <MarkdownRenderer text={narration} />
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h4 className="text-xl font-semibold text-white mb-4">Details</h4>
              {renderDetails()}
            </div>
            {renderCast()}
          </div>
          
          {!isStreaming && narration && !narrationError && (
            <ChatBox 
                itemTitle={details.title} 
                narration={narration}
                onHistoryChange={setChatHistory}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default ItemResultDisplay;