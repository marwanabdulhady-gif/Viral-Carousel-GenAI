import React, { useState, useEffect, useRef } from 'react';
import { Slide, SlideDesign } from '../types';
import { Image, ImagePlus, AlertCircle, RefreshCw } from 'lucide-react';

interface SlideCardProps {
  slide: Slide;
  imageData?: string;
  isGeneratingImage: boolean;
  isError?: boolean;
  onGenerateImage: () => void;
  onUpdateSlide: (slideNumber: number, field: keyof Slide, value: any) => void;
  readOnly?: boolean;
  language?: 'en' | 'ar';
  aspectRatio?: '4:5' | '1:1' | '16:9';
  isSelected?: boolean;
  onSelect?: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({ 
  slide, 
  imageData, 
  isGeneratingImage, 
  isError = false,
  onGenerateImage,
  onUpdateSlide,
  readOnly = false,
  language = 'en',
  aspectRatio = '4:5',
  isSelected = false,
  onSelect
}) => {
  const design = slide.design;
  const isRTL = language === 'ar';
  const headlineRef = useRef<HTMLTextAreaElement>(null);
  const subheadRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  const autoResize = (elem: HTMLTextAreaElement | null) => {
    if (elem) {
        elem.style.height = 'auto'; 
        elem.style.height = `${elem.scrollHeight + 4}px`;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        autoResize(headlineRef.current);
        autoResize(subheadRef.current);
    }, 10);
    return () => clearTimeout(timer);
  }, [slide.headline, slide.sub_headline, aspectRatio, design.font]);

  const getTextStyle = (isHeadline: boolean) => {
    const baseSize = isHeadline ? 'font-bold' : 'font-medium';
    let sizeClass = isHeadline ? 'text-2xl' : 'text-sm';
    if (design.fontSize === 'small') sizeClass = isHeadline ? 'text-xl' : 'text-xs';
    if (design.fontSize === 'large') sizeClass = isHeadline ? 'text-3xl' : 'text-base';
    if (design.fontSize === 'xl') sizeClass = isHeadline ? 'text-4xl' : 'text-lg';

    let effectClass = '';
    if (design.textEffect === 'shadow') effectClass = 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]'; 
    if (design.textEffect === 'neon') effectClass = 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]';
    if (design.textEffect === 'outline') effectClass = '[text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]'; 
    if (design.textEffect === 'bg-highlight') effectClass = 'bg-black/60 px-2 rounded box-decoration-clone py-1 leading-loose';
    if (design.textEffect === 'retro') effectClass = 'drop-shadow-[2px_2px_0_rgba(0,0,0,1)]';

    let alignClass = 'text-left';
    if (design.textAlign === 'center') alignClass = 'text-center';
    if (design.textAlign === 'right') alignClass = 'text-right';
    if (design.textAlign === 'justify') alignClass = 'text-justify';

    const lineHeight = isRTL ? 'leading-relaxed' : 'leading-normal';
    
    // Font handling
    let fontClass = 'font-sans';
    if (!isRTL) {
        if (design.font === 'serif') fontClass = 'font-serif';
        if (design.font === 'mono') fontClass = 'font-mono';
        if (design.font === 'display') fontClass = 'font-[system-ui] tracking-tighter';
    }

    return `${baseSize} ${sizeClass} ${effectClass} ${alignClass} ${lineHeight} ${fontClass}`;
  };

  const getDimensions = () => {
      switch(aspectRatio) {
          case '1:1': return { width: '340px', height: '340px' };
          case '16:9': return { width: '560px', height: '315px' }; 
          case '4:5': 
          default: return { width: '340px', height: '425px' };
      }
  };

  const dim = getDimensions();

  // Helper to convert hex to rgba for backgrounds requiring opacity if needed
  // For simplicity, we use opacity via style prop where supported or strict hex for solid colors
  const accentStyle = { color: design.accentColor };
  const accentBgStyle = { backgroundColor: design.accentColor };
  const accentBorderStyle = { borderColor: design.accentColor };

  return (
    <div 
        id={`slide-card-${slide.slide_number}`}
        onClick={onSelect}
        className={`flex-shrink-0 relative rounded-xl overflow-hidden bg-slate-900 group transition-all duration-300 select-none print:shadow-none cursor-pointer border-2 ${isSelected ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.01]' : 'border-slate-800 hover:border-slate-600'}`}
        style={{ width: dim.width, height: dim.height }}
    >
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        {imageData ? (
          <img 
            src={imageData} 
            alt={`Slide ${slide.slide_number} visual`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
            <div className="text-center p-4 flex flex-col items-center gap-3">
              {isGeneratingImage ? (
                  <>
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"/>
                    <p className="text-xs text-slate-500 font-medium">Generating...</p>
                  </>
              ) : isError ? (
                  <>
                    <AlertCircle className="w-10 h-10 text-red-500 opacity-80" />
                    <p className="text-xs text-red-400 font-medium max-w-[150px]">Image generation failed.</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
                        className="flex items-center gap-1 text-[10px] bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-full transition-colors mt-1"
                    >
                        <RefreshCw size={12} /> Retry
                    </button>
                  </>
              ) : (
                  <>
                    <ImagePlus className="w-12 h-12 mx-auto opacity-30 text-slate-600" />
                    <p className="text-xs text-slate-600 font-medium">No Image</p>
                  </>
              )}
            </div>
          </div>
        )}
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
          style={{ backgroundColor: `rgba(15, 23, 42, ${design.overlayOpacity / 100})` }}
        ></div>

        {/* Decorations using Dynamic Accent Color */}
        {design.decoration === 'circle' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 rounded-full pointer-events-none opacity-50" style={accentBorderStyle}></div>
        )}
        {design.decoration === 'square' && (
          <div className="absolute top-4 right-4 bottom-4 left-4 border-2 pointer-events-none opacity-50" style={accentBorderStyle}></div>
        )}
        {design.decoration === 'accent-line' && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-1 pointer-events-none shadow-lg" style={accentBgStyle}></div>
        )}
        {design.decoration === 'corner-shape' && (
           <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none opacity-50" style={{ background: `linear-gradient(to bottom left, ${design.accentColor}, transparent)` }}></div>
        )}
        {design.decoration === 'grid' && (
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        )}
        {design.decoration === 'blob' && (
           <div className="absolute -top-10 -right-10 w-64 h-64 blur-3xl rounded-full pointer-events-none opacity-30" style={accentBgStyle}></div>
        )}
        {design.decoration === 'frame' && (
           <div className="absolute inset-3 border rounded-lg pointer-events-none opacity-50" style={accentBorderStyle}></div>
        )}
      </div>

      {/* Main Content Layer */}
      <div 
        className={`absolute z-10 w-[85%] transition-all duration-100 ease-out flex flex-col gap-2 ${isRTL ? 'font-arabic' : ''}`}
        style={{ 
            top: `${design.yPosition}%`, 
            left: `${design.xPosition}%`,
            transform: 'translate(-50%, 0)', 
            direction: isRTL ? 'rtl' : 'ltr'
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
            {readOnly ? (
                <>
                    <h2 
                        className={`whitespace-pre-wrap ${getTextStyle(true)}`}
                        style={{ color: design.textColor, ...(design.textEffect === 'neon' ? { textShadow: `0 0 10px ${design.accentColor}` } : {}) }}
                    >
                        {slide.headline}
                    </h2>
                    <p 
                        className={`opacity-90 whitespace-pre-wrap ${getTextStyle(false)}`}
                        style={{ color: design.textColor }}
                    >
                        {slide.sub_headline}
                    </p>
                </>
            ) : (
                <>
                    <div className="relative w-full group/input">
                        <textarea 
                            ref={headlineRef}
                            value={slide.headline}
                            onChange={(e) => onUpdateSlide(slide.slide_number, 'headline', e.target.value)}
                            className={`bg-transparent border border-dashed border-transparent hover:border-white/30 focus:border-blue-500/50 rounded w-full resize-none focus:outline-none focus:bg-slate-900/40 p-1 overflow-hidden transition-all ${getTextStyle(true)}`}
                            style={{ color: design.textColor, ...(design.textEffect === 'neon' ? { textShadow: `0 0 10px ${design.accentColor}` } : {}) }}
                            rows={1}
                            placeholder={isRTL ? "العنوان الرئيسي" : "Headline"}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>
                    
                    <div className="relative w-full group/input">
                        <textarea 
                            ref={subheadRef}
                            value={slide.sub_headline}
                            onChange={(e) => onUpdateSlide(slide.slide_number, 'sub_headline', e.target.value)}
                            className={`bg-transparent border border-dashed border-transparent hover:border-white/30 focus:border-blue-500/50 rounded w-full resize-none focus:outline-none focus:bg-slate-900/40 p-1 overflow-hidden transition-all ${getTextStyle(false)}`}
                            style={{ color: design.textColor }}
                            rows={1}
                            placeholder={isRTL ? "العنوان الفرعي" : "Sub-headline"}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>
                </>
            )}
      </div>

      {/* Slide Number Badge */}
      <div 
        className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-20`}
        data-html2canvas-ignore="true"
      >
             <div className="bg-slate-900/80 text-slate-400 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm border border-slate-700 shadow-sm flex items-center gap-1">
                #{slide.slide_number}
                {isError && <AlertCircle size={10} className="text-red-500" />}
             </div>
      </div>
    </div>
  );
};

export default SlideCard;
