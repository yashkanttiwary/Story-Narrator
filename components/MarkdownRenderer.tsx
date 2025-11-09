
import React from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const renderInlines = (text: string) => {
    // Split text by markdown markers, keeping the markers.
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  // Split into blocks separated by at least one empty line.
  const blocks = text.split(/\n\s*\n/);

  return (
    <>
      {blocks.map((block, index) => {
        const trimmedBlock = block.trim();
        if (trimmedBlock.startsWith('### ')) {
          return (
            <h3 key={index} className="text-2xl font-bold mt-8 mb-4 text-indigo-300">
              {renderInlines(trimmedBlock.substring(4))}
            </h3>
          );
        }
        if (trimmedBlock === '---') {
          return <hr key={index} className="my-8 border-indigo-500/30" />;
        }
        if (trimmedBlock) {
          return (
            <p key={index} className="mb-4 leading-relaxed">
              {renderInlines(trimmedBlock.replace(/\n/g, ' '))}
            </p>
          );
        }
        return null;
      })}
    </>
  );
};

export default MarkdownRenderer;
