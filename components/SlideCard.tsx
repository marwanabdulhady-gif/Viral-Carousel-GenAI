import React, { useState, useEffect, useRef } from 'react';
import { Slide, SlideDesign, PersonalBranding } from '../types';
import { Image, ImagePlus, AlertCircle, RefreshCw, Smartphone, Linkedin, Instagram, Move } from 'lucide-react';

interface SlideCardProps {
  slide: Slide;
  imageData?: string;
  isGeneratingImage: boolean;
  isError?: boolean;
  onGenerateImage: () => void;
  onUpdateSlide: (slideNumber: number, field: keyof Slide, value: any) => void;
  // New callback for design updates specifically for drag operations
  onUpdateDesign: (slideNumber: number, field: keyof SlideDesign, value: any) => void;
  readOnly?: boolean;
  language?: 'en' | 'ar';
  aspectRatio?: '4:5' | '1:1' | '16:9';
  isSelected?: boolean;
  onSelect?: () => void;
  personalBranding?: PersonalBranding;
  previewPlatform?: 'none' | 'instagram' | 'linkedin';
}

const SlideCard: React.FC<SlideCardProps> = ({ 
  slide, 
  imageData, 
  isGeneratingImage, 
  isError = false,
  onGenerateImage,
  onUpdateSlide,
  onUpdateDesign,
  readOnly = false,
  language = 'en',
  aspectRatio = '4:5',
  isSelected = false,
  onSelect,
  personalBranding,
  previewPlatform = 'none'
}) => {
  const design = slide.design;
  const isRTL = language === 'ar';
  const headlineRef = useRef<HTMLTextAreaElement>(null);
  const subheadRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

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
  }, [slide.headline, slide.sub_headline, aspectRatio, design.font, design.containerStyle, design.textWidth]);

  // Google Fonts Injection
  useEffect(() => {
    if (design.font === 'custom' && design.customFont) {
        const fontName = design.customFont;
        const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }
  }, [design.font, design.customFont]);

  // Drag Handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly) return;
      // Only start dragging if clicking the move handle or container background (not the textarea)
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;

      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      dragStart.current = { x: clientX, y: clientY };
      startPos.current = { x: design.xPosition, y: design.yPosition };
      
      // Add global listeners
      document.addEventListener('mousemove', handleDragMove as any);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove as any);
      document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const cardRect = containerRef.current?.getBoundingClientRect();
      if (!cardRect) return;

      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;

      // Convert pixels to percentage based on card dimensions
      const percentX = (deltaX / cardRect.width) * 100;
      const percentY = (deltaY / cardRect.height) * 100;

      let newX = startPos.current.x + percentX;
      let newY = startPos.current.y + percentY;

      // Clamp
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      onUpdateDesign(slide.slide_number, 'xPosition', Math.round(newX));
      onUpdateDesign(slide.slide_number, 'yPosition', Math.round(newY));
  };

  const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove as any);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove as any);
      document.removeEventListener('touchend', handleDragEnd);
  };


  const getTextStyle = (isHeadline: boolean) => {
    const baseSize = isHeadline ? 'font-bold' : 'font-medium';
    let sizeClass = isHeadline ? 'text-2xl' : 'text-sm';
    if (design.fontSize === 'small') sizeClass = isHeadline ? 'text-xl' : 'text-xs';
    if (design.fontSize === 'large') sizeClass = isHeadline ? 'text-3xl' : 'text-base';
    if (design.fontSize === 'xl') sizeClass = isHeadline ? 'text-4xl' : 'text-lg';

    let effectClass = '';
    if (design.containerStyle === 'none') {
        if (design.textEffect === 'shadow') effectClass = 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]'; 
        if (design.textEffect === 'neon') effectClass = 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]';
        if (design.textEffect === 'outline') effectClass = '[text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]'; 
        if (design.textEffect === 'retro') effectClass = 'drop-shadow-[2px_2px_0_rgba(0,0,0,1)]';
    } else {
        effectClass = 'drop-shadow-sm';
    }

    let alignClass = 'text-left';
    if (design.textAlign === 'center') alignClass = 'text-center';
    if (design.textAlign === 'right') alignClass = 'text-right';
    if (design.textAlign === 'justify') alignClass = 'text-justify';

    // Improved Line Height for Arabic
    const lineHeight = isRTL ? 'leading-loose' : 'leading-normal';
    
    // Font handling
    let fontStyle: React.CSSProperties = {};
    let fontClass = 'font-sans';
    
    if (design.font === 'custom' && design.customFont) {
        fontStyle = { fontFamily: `"${design.customFont}", sans-serif` };
        fontClass = ''; // Clear default class
    } else if (!isRTL) {
        if (design.font === 'serif') fontClass = 'font-serif';
        if (design.font === 'mono') fontClass = 'font-mono';
        if (design.font === 'display') fontClass = 'font-[system-ui] tracking-tighter';
    }

    return { className: `${baseSize} ${sizeClass} ${effectClass} ${alignClass} ${lineHeight} ${fontClass}`, style: fontStyle };
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

  // Helper for hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
      let c: any;
      if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
          c = hex.substring(1).split('');
          if(c.length === 3){
              c= [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c = '0x'+c.join('');
          return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',' + (alpha/100) +')';
      }
      return hex; // Fallback
  };

  const getContainerStyle = () => {
      const style: React.CSSProperties = {
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          transition: 'all 0.1s ease-out', // Faster transition for dragging
          width: '100%',
          cursor: isSelected && !readOnly ? 'grab' : 'default'
      };

      if (design.containerStyle === 'glass') {
          style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          style.backdropFilter = 'blur(12px)';
          style.WebkitBackdropFilter = 'blur(12px)';
          style.borderRadius = '1rem';
          style.border = '1px solid rgba(255, 255, 255, 0.2)';
          style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
      } else if (design.containerStyle === 'card') {
          style.backgroundColor = hexToRgba(design.textBackgroundColor || '#000000', 95); 
          style.borderRadius = '0.75rem';
          style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
          style.border = `1px solid ${design.accentColor}40`;
      } else if (design.containerStyle === 'paper') {
          style.backgroundColor = '#f8fafc';
          style.borderRadius = '2px';
          style.color = '#1e293b'; 
          style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
          style.transform = 'rotate(-1deg)';
      } else if (design.containerStyle === 'gradient-bottom') {
          style.background = `linear-gradient(to top, ${hexToRgba(design.textBackgroundColor || '#000000', 90)}, transparent)`;
          style.paddingTop = '4rem';
          style.paddingBottom = '2rem';
          style.width = '120%';
          style.marginLeft = '-10%';
      }

      return style;
  };

  const textBgStyle = design.containerStyle === 'none' && design.textBackgroundOpacity > 0 ? {
      backgroundColor: hexToRgba(design.textBackgroundColor || '#000000', design.textBackgroundOpacity || 0),
      boxDecorationBreak: 'clone' as any,
      WebkitBoxDecorationBreak: 'clone' as any,
      padding: '0.5rem', // increased padding for diacritics
      borderRadius: '0.25rem'
  } : {};

  const effectiveTextColor = design.containerStyle === 'paper' ? '#0f172a' : design.textColor;
  const headlineStyle = getTextStyle(true);
  const subheadStyle = getTextStyle(false);

  // Render Slide Number Design
  const renderSlideNumber = () => {
    const numDesign = design.slideNumberDesign || { show: true, style: 'minimal', position: isRTL ? 'top-right' : 'top-left' };
    if (!numDesign.show) return null;

    let posClass = '';
    switch(numDesign.position) {
        case 'top-left': posClass = 'top-4 left-4'; break;
        case 'top-right': posClass = 'top-4 right-4'; break;
        case 'bottom-left': posClass = 'bottom-6 left-4'; break;
        case 'bottom-right': posClass = 'bottom-6 right-4'; break;
        default: posClass = 'top-4 left-4';
    }

    const numberText = slide.slide_number < 10 ? `0${slide.slide_number}` : `${slide.slide_number}`;
    const accent = design.accentColor;

    if (numDesign.style === 'minimal') {
        return (
            <div className={`absolute ${posClass} z-20 text-white drop-shadow-md font-bold text-lg font-mono tracking-wider opacity-80`}>
                {numberText}
            </div>
        );
    }
    if (numDesign.style === 'circle') {
        return (
            <div className={`absolute ${posClass} z-20 w-8 h-8 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-black/20 text-white font-bold text-xs shadow-lg`}>
                {slide.slide_number}
            </div>
        );
    }
    if (numDesign.style === 'square') {
        return (
            <div className={`absolute ${posClass} z-20 w-8 h-8 border border-white/40 flex items-center justify-center backdrop-blur-sm bg-black/20 text-white font-bold text-xs shadow-lg`} style={{borderRadius: '4px'}}>
                {slide.slide_number}
            </div>
        );
    }
    if (numDesign.style === 'outline') {
        return (
            <div className={`absolute ${posClass} z-20 font-bold text-5xl opacity-40`} 
                 style={{ WebkitTextStroke: '1px white', color: 'transparent' }}>
                {numberText}
            </div>
        );
    }
    if (numDesign.style === 'tag') {
        const isRight = numDesign.position.includes('right');
        const isBottom = numDesign.position.includes('bottom');
        // Simple tag shape
        return (
             <div className={`absolute z-20 px-3 py-1 text-xs font-bold text-white shadow-md
                ${isBottom ? 'bottom-8' : 'top-8'}
                ${isRight ? 'right-0 rounded-l-md' : 'left-0 rounded-r-md'}
             `} style={{ backgroundColor: accent }}>
                #{slide.slide_number}
             </div>
        );
    }
    
    return null;
  };

  // Helper UI Badge for Errors (Kept Separate from Design)
  const renderStatusBadge = () => {
      if (isError) {
          return (
             <div className="absolute top-2 right-2 z-30 bg-red-500/90 text-white text-[10px] p-1 rounded-full shadow-lg" title="Error generating image" data-html2canvas-ignore="true">
                 <AlertCircle size={12} />
             </div>
          );
      }
      return null;
  };


  return (
    <div 
        id={`slide-card-${slide.slide_number}`}
        ref={containerRef}
        onClick={onSelect}
        className={`flex-shrink-0 relative rounded overflow-hidden bg-slate-900 group transition-all duration-300 select-none print:shadow-none cursor-pointer border-2 ${isSelected ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.01]' : 'border-slate-800 hover:border-slate-600'}`}
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

        {/* Decorations */}
        {design.decoration === 'circle' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 rounded-full pointer-events-none opacity-50" style={{borderColor: design.accentColor}}></div>
        )}
        {design.decoration === 'square' && (
          <div className="absolute top-4 right-4 bottom-4 left-4 border-2 pointer-events-none opacity-50" style={{borderColor: design.accentColor}}></div>
        )}
        {design.decoration === 'accent-line' && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-1 pointer-events-none shadow-lg" style={{backgroundColor: design.accentColor}}></div>
        )}
        {design.decoration === 'corner-shape' && (
           <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none opacity-50" style={{ background: `linear-gradient(to bottom left, ${design.accentColor}, transparent)` }}></div>
        )}
        {design.decoration === 'grid' && (
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        )}
        {design.decoration === 'blob' && (
           <div className="absolute -top-10 -right-10 w-64 h-64 blur-3xl rounded-full pointer-events-none opacity-30" style={{backgroundColor: design.accentColor}}></div>
        )}
        {design.decoration === 'frame' && (
           <div className="absolute inset-3 border rounded-lg pointer-events-none opacity-50" style={{borderColor: design.accentColor}}></div>
        )}
      </div>

      {/* Main Content Layer (Draggable) */}
      <div 
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className={`absolute z-10 transition-none ease-out flex flex-col justify-center ${isRTL ? 'font-arabic' : ''}`}
        style={{ 
            top: `${design.yPosition}%`, 
            left: `${design.xPosition}%`,
            width: `${design.textWidth || 85}%`, // Dynamic Width
            transform: 'translate(-50%, 0)', // Position based on center of X
            direction: isRTL ? 'rtl' : 'ltr'
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
          {/* Drag Handle - Only visible when selected and not readonly */}
          {isSelected && !readOnly && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                <Move size={12} />
            </div>
          )}

          <div style={getContainerStyle()} className={`${design.containerStyle !== 'none' ? 'backdrop-blur-sm' : ''} ${isSelected && !readOnly ? 'ring-1 ring-blue-500/50' : ''}`}>
            {readOnly ? (
                <>
                    <div style={textBgStyle}>
                        <h2 
                            className={`whitespace-pre-wrap ${headlineStyle.className}`}
                            style={{ ...headlineStyle.style, color: effectiveTextColor, ...(design.textEffect === 'neon' ? { textShadow: `0 0 10px ${design.accentColor}` } : {}) }}
                        >
                            {slide.headline}
                        </h2>
                    </div>
                    <div style={textBgStyle}>
                        <p 
                            className={`opacity-90 whitespace-pre-wrap ${subheadStyle.className}`}
                            style={{ ...subheadStyle.style, color: effectiveTextColor }}
                        >
                            {slide.sub_headline}
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative w-full group/input">
                        <textarea 
                            ref={headlineRef}
                            value={slide.headline}
                            onChange={(e) => onUpdateSlide(slide.slide_number, 'headline', e.target.value)}
                            className={`bg-transparent border border-dashed border-transparent hover:border-white/30 focus:border-blue-500/50 rounded w-full resize-none focus:outline-none focus:ring-0 p-1 overflow-hidden transition-all ${headlineStyle.className}`}
                            style={{ 
                                ...headlineStyle.style,
                                color: effectiveTextColor, 
                                ...(design.textEffect === 'neon' ? { textShadow: `0 0 10px ${design.accentColor}` } : {}),
                                ...textBgStyle
                            }}
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
                            className={`bg-transparent border border-dashed border-transparent hover:border-white/30 focus:border-blue-500/50 rounded w-full resize-none focus:outline-none focus:ring-0 p-1 overflow-hidden transition-all ${subheadStyle.className}`}
                            style={{ 
                                ...subheadStyle.style,
                                color: effectiveTextColor,
                                ...textBgStyle
                            }}
                            rows={1}
                            placeholder={isRTL ? "العنوان الفرعي" : "Sub-headline"}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>
                </>
            )}
          </div>
      </div>

      {/* Render Slide Number */}
      {renderSlideNumber()}
      {renderStatusBadge()}

      {/* PERSONAL BRANDING FOOTER */}
      {personalBranding?.enabled && (
          <div className={`absolute bottom-6 left-0 right-0 z-20 px-6 flex items-center gap-2 opacity-80 ${design.textAlign === 'center' ? 'justify-center' : design.textAlign === 'right' ? 'justify-end' : 'justify-start'}`}>
              {personalBranding.avatarUrl ? (
                  <img src={personalBranding.avatarUrl} className="w-6 h-6 rounded-full border border-white/20 shadow-sm object-cover"/>
              ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                      {personalBranding.name.charAt(0) || 'U'}
                  </div>
              )}
              <div className="flex flex-col leading-none shadow-sm">
                  <span className="text-[10px] font-bold text-white drop-shadow-md">{personalBranding.name}</span>
                  <span className="text-[8px] text-white/80 drop-shadow-md">{personalBranding.handle}</span>
              </div>
          </div>
      )}

      {/* PLATFORM PREVIEW OVERLAY (SAFE ZONES) */}
      {previewPlatform === 'instagram' && (
          <div className="absolute inset-0 pointer-events-none z-30 border-[14px] border-transparent border-t-[60px] border-b-[80px] opacity-30 bg-black/10 mix-blend-multiply flex flex-col justify-between">
              <div className="w-full h-full border-dashed border border-white/30 flex items-center justify-center">
                  <Instagram className="text-white/20" size={48}/>
              </div>
          </div>
      )}
      {previewPlatform === 'linkedin' && (
          <div className="absolute inset-0 pointer-events-none z-30 border-[10px] border-transparent border-b-[60px] opacity-30 bg-black/10 mix-blend-multiply flex flex-col justify-between">
              <div className="w-full h-full border-dashed border border-white/30 flex items-center justify-center">
                  <Linkedin className="text-white/20" size={48}/>
              </div>
          </div>
      )}

    </div>
  );
};

export default SlideCard;