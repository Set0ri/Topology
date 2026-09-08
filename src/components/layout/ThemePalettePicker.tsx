import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Sun, Moon, ChevronDown } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

interface PaletteOption {
  id: 'default' | 'catpuccin' | 'light';
  name: string;
  subtitle: string;
  mode: 'light' | 'dark';
  swatches: string[];
}

export const ThemePalettePicker: React.FC = () => {
  const theme = useTopologyStore(s => s.theme);
  const setTheme = useTopologyStore(s => s.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePalette: 'default' | 'catpuccin' | 'light' = 
    (theme === 'catpuccin' || theme === 'mocha') ? 'catpuccin' :
    (theme === 'light' || theme === 'latte') ? 'light' : 'default';

  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';

  const PALETTES: PaletteOption[] = [
    {
      id: 'default',
      name: 'Google Material Light',
      subtitle: 'Clean white workspace paper with iconic Google 4-color jewels',
      mode: 'light',
      swatches: ['#1a73e8', '#ea4335', '#fbbc04', '#34a853', '#9334e6', '#007b83'],
    },
    {
      id: 'catpuccin',
      name: 'Catppuccin Mocha',
      subtitle: 'Soothing cyber pastel dark mode for extended focus',
      mode: 'dark',
      swatches: ['#cba6f7', '#74c7ec', '#f5c2e7', '#a6e3a1', '#fab387'],
    },
    {
      id: 'light',
      name: 'Catppuccin Latte',
      subtitle: 'Warm porcelain paper light mode with soft pastel ink',
      mode: 'light',
      swatches: ['#7287fd', '#1e66f5', '#179299', '#d20f39', '#fe640b'],
    }
  ];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Compact Jewel Trigger Button - takes up minimal space */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Theme Palette (Google Light, Catppuccin, Latte)"
        className={`h-8 px-2.5 rounded-xl flex items-center gap-1.5 transition-all duration-150 border-none cursor-pointer ${
          isLight
            ? 'bg-black/5 hover:bg-black/10 text-[#202124]'
            : 'bg-white/5 hover:bg-white/10 text-[#f8fafc]'
        } ${isOpen ? (isLight ? 'bg-black/10' : 'bg-white/10') : ''}`}
      >
        {/* Swatch Cluster preview */}
        {activePalette === 'default' ? (
          <div className="grid grid-cols-2 gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc04]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34a853]" />
          </div>
        ) : activePalette === 'catpuccin' ? (
          <div className="flex items-center -space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#cba6f7]" />
            <span className="w-2 h-2 rounded-full bg-[#74c7ec]" />
            <span className="w-2 h-2 rounded-full bg-[#f5c2e7]" />
          </div>
        ) : (
          <div className="flex items-center -space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#7287fd]" />
            <span className="w-2 h-2 rounded-full bg-[#1e66f5]" />
            <span className="w-2 h-2 rounded-full bg-[#179299]" />
          </div>
        )}

        <ChevronDown size={11} className={`opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Rich Swatch Details Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-2 w-72 rounded-3xl p-3 shadow-elevated-xl z-50 border-none backdrop-blur-2xl ${
              isLight
                ? 'bg-white/95 text-[#202124]'
                : 'bg-[#181a24]/95 text-[#f8fafc]'
            }`}
          >
            <div className="px-2 pt-1 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Palette size={12} className="text-[#1a73e8]" />
                <span>Color Palettes</span>
              </span>
              <span className="text-[10px] font-mono opacity-50">3 themes</span>
            </div>

            <div className="space-y-1.5">
              {PALETTES.map((pal) => {
                const isCurrent = activePalette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => {
                      setTheme(pal.id);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-2xl text-left transition-all border-none cursor-pointer flex flex-col gap-2 ${
                      isCurrent
                        ? isLight
                          ? 'bg-[#f1f3f4] shadow-elevated-sm'
                          : 'bg-[#222534] shadow-elevated-sm'
                        : isLight
                        ? 'hover:bg-[#f8f9fa] bg-transparent'
                        : 'hover:bg-white/5 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {pal.id === 'default' ? (
                          <div className="grid grid-cols-2 gap-0.5 p-1 rounded-lg bg-black/5">
                            <span className="w-2 h-2 rounded-full bg-[#1a73e8]" />
                            <span className="w-2 h-2 rounded-full bg-[#ea4335]" />
                            <span className="w-2 h-2 rounded-full bg-[#fbbc04]" />
                            <span className="w-2 h-2 rounded-full bg-[#34a853]" />
                          </div>
                        ) : pal.mode === 'dark' ? (
                          <div className="p-1 rounded-lg bg-black/20 text-cat-mocha-mauve">
                            <Moon size={14} />
                          </div>
                        ) : (
                          <div className="p-1 rounded-lg bg-black/5 text-[#df8e1d]">
                            <Sun size={14} />
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{pal.name}</span>
                            {pal.id === 'default' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#1a73e8]/10 text-[#1a73e8] font-bold">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] line-clamp-1 ${isLight ? 'text-[#5f6368]' : 'text-[#94a3b8]'}`}>
                            {pal.subtitle}
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Color Swatch Ribbon */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {pal.swatches.map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-2 rounded-full shadow-xs"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
