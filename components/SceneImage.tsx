import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface SceneImageProps {
  images: string[];
  isGenerating: boolean;
  description?: string;
}

const ROMAN = ['I', 'II', 'III'];

export const SceneImage: React.FC<SceneImageProps> = ({ images, isGenerating, description }) => {
  const mainImage = images[images.length - 1];
  const previousImages = images.slice(0, -1);

  return (
    <div className="relative scene-frame w-full aspect-video bg-stone-950 overflow-hidden group">
      {/* Corner ornaments */}
      <div className="absolute top-2 left-2 w-5 h-5 border-l border-t border-gold-500/50 z-20 pointer-events-none" />
      <div className="absolute top-2 right-2 w-5 h-5 border-r border-t border-gold-500/50 z-20 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-5 h-5 border-l border-b border-gold-500/50 z-20 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-5 h-5 border-r border-b border-gold-500/50 z-20 pointer-events-none" />

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-stone-950/90 backdrop-blur-sm z-10"
          >
            <div className="relative">
              <div className="w-16 h-16 border-2 border-gold-600/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
              </div>
              <div className="absolute -top-2 -left-2 w-4 h-4 border-l border-t border-gold-500/60" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-r border-t border-gold-500/60" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l border-b border-gold-500/60" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r border-b border-gold-500/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-cinzel text-gold-400 uppercase tracking-[0.3em] rune-glow">Forging Visual Scene</p>
              <p className="text-[10px] text-parchment-500 italic font-serif max-w-[200px] line-clamp-1">
                {description || 'Visualizing the moment...'}
              </p>
            </div>
          </motion.div>
        ) : mainImage ? (
          <motion.div
            key="image-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
          >
            <motion.div
              key={mainImage}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <Image
                src={mainImage}
                alt="Current Scene"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-stone-950/20 opacity-70 group-hover:opacity-80 transition-opacity duration-500" />
            </motion.div>

            {/* Previous image thumbnails */}
            {previousImages.length > 0 && (
              <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
                {previousImages.map((img, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-16 aspect-video border border-gold-600/30 overflow-hidden shadow-lg"
                  >
                    <Image
                      src={img}
                      alt={`Scene ${ROMAN[idx]}`}
                      width={64}
                      height={36}
                      className="object-cover opacity-60 hover:opacity-100 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Bottom label */}
            <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-cinzel text-gold-500 uppercase tracking-[0.25em]">
                    Scene {ROMAN[(images.length - 1) % 3]} of {images.length}/3
                  </span>
                </div>
                <p className="text-xs text-parchment-400 italic font-serif max-w-[80%] drop-shadow-lg">
                  {description || 'The world takes shape before your eyes...'}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-stone-700"
          >
            <div className="w-20 h-20 border border-gold-700/20 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gold-700/25" />
            </div>
            <p className="text-[10px] font-cinzel text-gold-700/30 uppercase tracking-[0.25em]">
              Visions shall appear at key moments
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
