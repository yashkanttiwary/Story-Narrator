import React from 'react';
import { BrowseItem } from '../types';

interface BrowseItemCardProps {
  item: BrowseItem;
  onClick: () => void;
}

const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750" fill="#1f2937"><g transform="translate(175, 300) scale(6.25)"><path d="M2,4.18A2.18,2.18,0,0,1,4.18,2H19.82A2.18,2.18,0,0,1,22,4.18V19.82A2.18,2.18,0,0,1,19.82,22H4.18A2.18,2.18,0,0,1,2,19.82Z M7,2V22 M17,2V22 M2,12H22 M2,7H7 M2,17H7 M17,17H22 M17,7H22" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></g></svg>`;
const placeholderCover = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;

const BrowseItemCard: React.FC<BrowseItemCardProps> = ({ item, onClick }) => {
  const coverSrc = item.coverUrl || placeholderCover;

  return (
    <div
      onClick={onClick}
      className="group relative aspect-[2/3] bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
      title={`${item.title} (${item.year})`}
    >
      <img 
        src={coverSrc} 
        alt={`Cover for ${item.title}`} 
        className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60"
        onError={(e) => { const img = e.currentTarget; img.onerror = null; if (img.src !== placeholderCover) { img.src = placeholderCover; } }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h4 className="font-bold text-sm truncate">{item.title}</h4>
        <p className="text-xs text-gray-300">{item.year}</p>
      </div>
    </div>
  );
};

export default BrowseItemCard;
