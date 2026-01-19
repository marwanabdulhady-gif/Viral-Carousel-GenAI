import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Layers, Download, Palette, Type, Save, Archive, Trash2, Grid, UserPlus, Zap, FileDown, Check, Lightbulb, MessageSquare, Scaling, Layout, Move, AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Frame, BoxSelect, User, Smile, Ghost, RotateCw, RefreshCw, Image as ImageIcon, Camera, AlertTriangle } from 'lucide-react';
import { generateCarouselScript, generateSlideImage, generateIdeas } from './services/geminiService';
import { CarouselResponse, GenerationStatus, ViewMode, Slide, SlideDesign, CharacterTraits, CharacterSettings, BrandColors } from './types';
import SlideCard from './components/SlideCard';
// @ts-ignore
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

// Categorized Visual Styles for better variety
const VISUAL_STYLES_CATEGORIES = {
    "Professional": ["Minimalist Clean", "Tech Startup", "Corporate Blue", "Modern SaaS", "Swiss International", "Editorial"],
    "Creative & Artistic": ["Hand Drawn Sketch", "Watercolor", "Pop Art", "Collage", "Doodle Style", "Oil Painting", "Pastel Dream"],
    "3D & Textured": ["3D Claymorphism", "Glassmorphism", "3D Isometric", "Paper Cutout", "Fabric Texture", "Plastic Sheen", "Matte 3D"],
    "Dark & Vibrant": ["Cyberpunk Neon", "Dark Mode Gradient", "Holographic", "Vaporwave", "Neon Noir", "Glowwave", "High Contrast Dark"],
    "Retro & Vintage": ["Vintage 90s", "Retro 80s", "Bauhaus", "Grunge", "Lo-Fi Aesthetic", "Film Grain", "Noir"],
    "Nature & Soft": ["Organic Green", "Earthy Tones", "Botanical", "Soft Gradient", "Warm Beige"]
};

// Flatten for dropdown but keep categorized logic if needed later
const ALL_VISUAL_STYLES = Object.values(VISUAL_STYLES_CATEGORIES).flat();

const TONES_EN = ["Professional", "Casual", "Humorous", "Inspirational", "Educational", "Controversial", "Empathetic", "Urgent", "Witty"];
const TONES_AR = ["Professional (رسمي)", "Friendly (ودود)", "Inspirational (ملهم)", "Sarcastic (ساخر)", "Educational (تعليمي)", "Urgent (عاجل)", "Serious (جدي)"];

const DIALECTS = [
    { id: 'msa', label: 'Modern Standard (الفصحى)' },
    { id: 'egyptian', label: 'Egyptian (المصرية)' },
    { id: 'saudi', label: 'Saudi/Gulf (السعودية/الخليجية)' },
    { id: 'levantine', label: 'Levantine (الشامية)' },
    { id: 'maghrebi', label: 'Maghrebi (المغربية/الجزائرية)' }
];

const COLOR_PALETTES = [
    { name: "Default", text: "#ffffff", accent: "#3b82f6" },
    { name: "Ocean", text: "#e0f2fe", accent: "#0284c7" },
    { name: "Sunset", text: "#fff7ed", accent: "#f97316" },
    { name: "Forest", text: "#f0fdf4", accent: "#16a34a" },
    { name: "Berry", text: "#fdf2f8", accent: "#db2777" },
    { name: "Monochrome", text: "#ffffff", accent: "#94a3b8" },
    { name: "Dark", text: "#0f172a", accent: "#64748b" }, // For light backgrounds
    { name: "Gold", text: "#ffffff", accent: "#fbbf24" },
];

function App() {
  const [activeView, setActiveView] = useState<ViewMode>('create');
  
  // Create State
  const [topic, setTopic] = useState('');
  const [visualStyle, setVisualStyle] = useState(ALL_VISUAL_STYLES[0]);
  const [targetAudience, setTargetAudience] = useState('');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '1:1' | '16:9'>('4:5');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [tone, setTone] = useState(TONES_EN[0]);
  const [dialect, setDialect] = useState('');
  const [mainTheme, setMainTheme] = useState('');
  const [brandColors, setBrandColors] = useState<BrandColors>({ text: '#ffffff', accent: '#3b82f6' });
  const [useCharacter, setUseCharacter] = useState(false);
  const [characterDesc, setCharacterDesc] = useState(''); 
  const [charGender, setCharGender] = useState<'neutral' | 'male' | 'female'>('neutral');
  const [charStyle, setCharStyle] = useState<CharacterTraits['style']>('3d-render');
  const [charAge, setCharAge] = useState<'child' | 'young-adult' | 'adult' | 'elderly'>('adult');
  const [charColor, setCharColor] = useState('Blue');

  // Editor State
  const [currentCarousel, setCurrentCarousel] = useState<CarouselResponse | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, Record<number, string>>>({});
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [imageLoadingState, setImageLoadingState] = useState<Record<number, boolean>>({});
  const [imageErrorState, setImageErrorState] = useState<Record<number, boolean>>({});
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'layout' | 'text' | 'style' | 'char'>('layout');
  const [isExporting, setIsExporting] = useState(false);
  
  // History
  const [library, setLibrary] = useState<CarouselResponse[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('carousel_library');
    if (saved) { try { setLibrary(JSON.parse(saved)); } catch (e) { console.error(e); } }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('carousel_library', JSON.stringify(library)); } catch (e) { console.error(e); }
  }, [library]);

  const handleLanguageChange = (lang: 'en' | 'ar') => {
      setLanguage(lang);
      setTone(lang === 'en' ? TONES_EN[0] : TONES_AR[0]);
      if (currentCarousel) {
          setCurrentCarousel({
              ...currentCarousel,
              carousel_metadata: { ...currentCarousel.carousel_metadata, language: lang }
          });
      }
  };

  const handleAutoGenerateIdeas = async () => {
     if (!mainTheme) { alert("Please enter a Main Theme first."); return; }
     setStatus(GenerationStatus.GENERATING_IDEAS);
     try {
         const idea = await generateIdeas(mainTheme, language);
         setTopic(idea.topic);
         setTargetAudience(idea.audience);
     } catch (e) { console.error(e); } finally { setStatus(GenerationStatus.IDLE); }
  };

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !targetAudience) return;

    setStatus(GenerationStatus.GENERATING_SCRIPT);
    
    const characterTraits: CharacterTraits = {
        gender: charGender, style: charStyle, age: charAge, color_accent: charColor
    };

    try {
      const data = await generateCarouselScript(
          topic, visualStyle, targetAudience, slideCount, 
          language, tone, dialect, useCharacter, aspectRatio, characterTraits, brandColors
      );
      if (useCharacter && data.carousel_metadata.character_description) {
          setCharacterDesc(data.carousel_metadata.character_description);
      }
      setCurrentCarousel(data);
      setStatus(GenerationStatus.COMPLETE);
      setActiveView('editor');
      setSelectedSlideIndex(0); // Select first slide
    } catch (error) {
      console.error(error);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handleGenerateImage = async (slideNumber: number) => {
    if (!currentCarousel) return;
    const slide = currentCarousel.slides.find(s => s.slide_number === slideNumber);
    if (!slide) return;

    setImageLoadingState(prev => ({ ...prev, [slideNumber]: true }));
    setImageErrorState(prev => ({ ...prev, [slideNumber]: false }));

    try {
      const metadata = { 
          ...currentCarousel.carousel_metadata, 
          character_description: characterDesc || currentCarousel.carousel_metadata.character_description 
      };
      const base64Image = await generateSlideImage(slide, metadata);
      setGeneratedImages(prev => ({
        ...prev,
        [currentCarousel.id]: { ...(prev[currentCarousel.id] || {}), [slideNumber]: base64Image }
      }));
    } catch (error) {
      console.error("Failed to generate image", error);
      setImageErrorState(prev => ({ ...prev, [slideNumber]: true }));
    } finally {
      setImageLoadingState(prev => ({ ...prev, [slideNumber]: false }));
    }
  };

  const handleGenerateAllImages = async () => {
      if (!currentCarousel) return;
      const promises = currentCarousel.slides.map(slide => handleGenerateImage(slide.slide_number));
      await Promise.all(promises);
  };

  const updateSlide = (slideIndex: number, updater: (s: Slide) => Slide) => {
      if (!currentCarousel) return;
      const updatedSlides = currentCarousel.slides.map((s, idx) => 
          idx === slideIndex ? updater(s) : s
      );
      setCurrentCarousel({ ...currentCarousel, slides: updatedSlides });
  };

  const handleUpdateSlideField = (slideNumber: number, field: keyof Slide, value: any) => {
      if (!currentCarousel) return;
      const idx = currentCarousel.slides.findIndex(s => s.slide_number === slideNumber);
      if (idx !== -1) updateSlide(idx, s => ({ ...s, [field]: value }));
  };

  const handleDesignUpdate = (field: keyof SlideDesign, value: any) => {
      updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, [field]: value } }));
  };
  
  const handleCharacterUpdate = (field: keyof CharacterSettings, value: any) => {
      updateSlide(selectedSlideIndex, s => ({ ...s, character_settings: { ...s.character_settings, [field]: value } }));
  };

  // Preset Logic
  const applyLayoutPreset = (type: 'default' | 'title-focus' | 'quote' | 'bottom-caption') => {
      const isRTL = language === 'ar';
      if (type === 'default') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textAlign: isRTL ? 'right' : 'left', xPosition: 50, yPosition: 10, fontSize: 'medium', decoration: 'none' } }));
      } else if (type === 'title-focus') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textAlign: 'center', xPosition: 50, yPosition: 40, fontSize: 'xl' } }));
      } else if (type === 'quote') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textAlign: 'center', xPosition: 50, yPosition: 50, fontSize: 'large', decoration: 'accent-line' } }));
      } else if (type === 'bottom-caption') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textAlign: 'center', xPosition: 50, yPosition: 80, fontSize: 'small', decoration: 'none' } }));
      }
  };

  const applyStylePreset = (type: 'cyber' | 'lux' | 'bold' | 'minimal') => {
      if (type === 'cyber') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#00ffcc', accentColor: '#00ffcc', textEffect: 'neon', decoration: 'grid', overlayOpacity: 80 } }));
      } else if (type === 'lux') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffd700', accentColor: '#ffd700', textEffect: 'shadow', decoration: 'frame', overlayOpacity: 60, font: 'serif' } }));
      } else if (type === 'bold') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffffff', accentColor: '#ef4444', textEffect: 'bg-highlight', decoration: 'circle', overlayOpacity: 20, font: 'display' } }));
      } else if (type === 'minimal') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffffff', accentColor: '#94a3b8', textEffect: 'none', decoration: 'none', overlayOpacity: 10, font: 'sans' } }));
      }
  }

  const applyColorPalette = (palette: { text: string, accent: string }) => {
      updateSlide(selectedSlideIndex, s => ({
          ...s,
          design: {
              ...s.design,
              textColor: palette.text,
              accentColor: palette.accent
          }
      }));
  };

  const activeSlide = currentCarousel?.slides[selectedSlideIndex];

  const saveToLibrary = () => {
      if (!currentCarousel) return;
      const carouselToSave = { ...currentCarousel, carousel_metadata: { ...currentCarousel.carousel_metadata, character_description: characterDesc } };
      const exists = library.find(c => c.id === carouselToSave.id);
      setLibrary(exists ? library.map(c => c.id === carouselToSave.id ? carouselToSave : c) : [carouselToSave, ...library]);
      alert('Saved!');
  };

  const loadFromLibrary = (carousel: CarouselResponse) => {
      setCurrentCarousel(carousel);
      setLanguage(carousel.carousel_metadata.language as any);
      setAspectRatio(carousel.carousel_metadata.aspect_ratio || '4:5');
      setCharacterDesc(carousel.carousel_metadata.character_description || '');
      setBrandColors(carousel.carousel_metadata.brand_colors || { text: '#ffffff', accent: '#3b82f6' });
      setActiveView('editor');
      setSelectedSlideIndex(0);
  };

  const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Delete?')) {
          setLibrary(prev => prev.filter(c => c.id !== id));
          if (currentCarousel?.id === id) { setCurrentCarousel(null); setActiveView('create'); }
      }
  };

  const exportJSON = () => {
      if (!currentCarousel) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ ...currentCarousel, _images: generatedImages[currentCarousel.id] || {} }, null, 2));
      const a = document.createElement('a'); a.href = dataStr; a.download = `carousel.json`; a.click();
  };

  const downloadSlideImage = async () => {
      if(!activeSlide) return;
      const el = document.getElementById(`slide-card-${activeSlide.slide_number}`);
      if(el) {
          try {
            const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null, ignoreElements: (e:any) => e.hasAttribute('data-html2canvas-ignore') });
            const link = document.createElement('a');
            link.download = `slide-${activeSlide.slide_number}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          } catch(e) {
              console.error(e);
          }
      }
  }

  const exportPDF = async () => {
    if (!currentCarousel) return;
    setIsExporting(true);
    
    // Allow React to render the hidden export container
    await new Promise(resolve => setTimeout(resolve, 500));

    let width = 340, height = 425;
    if (currentCarousel.carousel_metadata.aspect_ratio === '1:1') height = 340;
    else if (currentCarousel.carousel_metadata.aspect_ratio === '16:9') { width = 560; height = 315; }

    const doc = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "pt", format: [width, height], hotfixes: ["px_scaling"] });
    
    // IMPORTANT: Target the hidden export container elements
    const slideElements = document.querySelectorAll('[id^="export-slide-"]');
    
    for (let i = 0; i < slideElements.length; i++) {
        const el = slideElements[i] as HTMLElement;
        if (i > 0) doc.addPage([width, height]);
        try {
            const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null, ignoreElements: (e:any) => e.hasAttribute('data-html2canvas-ignore') });
            doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, width, height, undefined, 'FAST');
        } catch (e) { console.error(e); }
    }
    doc.save(`carousel.pdf`);
    setIsExporting(false);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`}>
      
      {/* Off-screen Render Container for PDF Export */}
      {currentCarousel && (
          <div className="absolute top-0 left-[-9999px] flex flex-col gap-10 pointer-events-none" aria-hidden="true">
              {currentCarousel.slides.map((slide) => (
                  <div key={slide.slide_number} id={`export-slide-${slide.slide_number}`}>
                      <SlideCard 
                          slide={slide}
                          imageData={generatedImages[currentCarousel.id]?.[slide.slide_number]}
                          isGeneratingImage={false}
                          onUpdateSlide={() => {}} 
                          onGenerateImage={() => {}}
                          readOnly={true}
                          language={language}
                          aspectRatio={aspectRatio}
                      />
                  </div>
              ))}
          </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm h-16">
         <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('create')}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg text-white hidden md:block">Carousel<span className="text-blue-500">AI</span></h1>
         </div>

         <div className="flex items-center gap-4">
             <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button onClick={() => handleLanguageChange('en')} className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>EN</button>
                <button onClick={() => handleLanguageChange('ar')} className={`px-2 py-1 text-xs font-bold rounded font-arabic ${language === 'ar' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>AR</button>
             </div>

             <div className="hidden md:flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                 {['create', 'editor', 'library'].map((mode) => (
                     <button key={mode} onClick={() => setActiveView(mode as ViewMode)} disabled={mode === 'editor' && !currentCarousel}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${activeView === mode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}>
                         {mode}
                     </button>
                 ))}
             </div>
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        
        {activeView === 'create' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-3xl font-bold text-white">{language === 'ar' ? 'إنشاء كاروسيل جديد' : 'Create New Carousel'}</h2>
                        <p className="text-slate-400">{language === 'ar' ? 'حدد استراتيجيتك ودع الذكاء الاصطناعي يتولى الباقي.' : 'Define your strategy and let AI handle the rest.'}</p>
                    </div>
                    <form onSubmit={handleGenerateScript} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <h3 className="font-bold text-white flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400"/> {language === 'ar' ? 'المحتوى' : 'Content'}</h3>
                                <input value={mainTheme} onChange={e => setMainTheme(e.target.value)} placeholder={language === 'ar' ? 'الموضوع الرئيسي' : "Main Theme"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm"/>
                                <div className="flex gap-2">
                                    <input value={topic} onChange={e => setTopic(e.target.value)} placeholder={language === 'ar' ? 'عنوان محدد' : "Specific Topic"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm"/>
                                    <button type="button" onClick={handleAutoGenerateIdeas} className="bg-slate-800 px-3 rounded-lg text-xs font-bold border border-slate-700 hover:text-white">{language === 'ar' ? 'تلقائي' : 'Auto'}</button>
                                </div>
                                <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder={language === 'ar' ? 'الجمهور المستهدف' : "Target Audience"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm"/>
                                
                                {language === 'ar' && (
                                    <div className="animate-in fade-in">
                                        <label className="text-xs font-bold text-slate-500 mb-2 block">Dialect / اللهجة</label>
                                        <select value={dialect} onChange={e => setDialect(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white">
                                            <option value="">Select Dialect...</option>
                                            {DIALECTS.map(d => (
                                                <option key={d.id} value={d.label}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <h3 className="font-bold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400"/> {language === 'ar' ? 'الأسلوب' : 'Style & Tone'}</h3>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase">Visual Style</label>
                                    <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                                        {Object.entries(VISUAL_STYLES_CATEGORIES).map(([category, styles]) => (
                                            <optgroup key={category} label={category}>
                                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* NEW: Brand Colors Section */}
                                <div className="space-y-2 pb-2 border-b border-slate-800/50">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase flex justify-between">
                                        <span>Brand Colors</span>
                                        <span className="text-blue-500">Selected: {brandColors.text} / {brandColors.accent}</span>
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {COLOR_PALETTES.map((p, i) => (
                                            <button 
                                                key={i}
                                                type="button"
                                                onClick={() => setBrandColors({ text: p.text, accent: p.accent })}
                                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 overflow-hidden relative group transition-transform hover:scale-110 ${brandColors.accent === p.accent ? 'border-white scale-110' : 'border-slate-700'}`}
                                                title={p.name}
                                            >
                                                <div className="absolute inset-0 flex">
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.text }}></div>
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.accent }}></div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                             <div className="w-6 h-6 rounded border border-slate-700 relative overflow-hidden">
                                                <input type="color" value={brandColors.text} onChange={e => setBrandColors(prev => ({ ...prev, text: e.target.value }))} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer"/>
                                             </div>
                                             <span className="text-[10px] text-slate-400 font-mono">Text</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                             <div className="w-6 h-6 rounded border border-slate-700 relative overflow-hidden">
                                                <input type="color" value={brandColors.accent} onChange={e => setBrandColors(prev => ({ ...prev, accent: e.target.value }))} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer"/>
                                             </div>
                                             <span className="text-[10px] text-slate-400 font-mono">Accent</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(language === 'en' ? TONES_EN : TONES_AR).slice(0,5).map(t => (
                                        <button key={t} type="button" onClick={() => setTone(t)} className={`px-2 py-1 rounded text-[10px] border ${tone === t ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-800 text-slate-500'}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] text-slate-500 font-bold">SLIDES</label>
                                            <span className="text-[10px] text-blue-400 font-bold bg-blue-900/30 px-1.5 rounded">{slideCount}</span>
                                        </div>
                                        <input type="range" min="3" max="10" value={slideCount} onChange={e => setSlideCount(parseInt(e.target.value))} className="w-full accent-blue-600 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">RATIO</label>
                                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-slate-950 text-xs py-1.5 px-2 rounded border-slate-800 border"><option value="4:5">4:5 (Portrait)</option><option value="1:1">1:1 (Square)</option><option value="16:9">16:9 (Landscape)</option></select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-sm font-bold">{language === 'ar' ? 'شخصية AI؟' : 'Use AI Character?'}</span>
                                    <button type="button" onClick={() => setUseCharacter(!useCharacter)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${useCharacter ? 'bg-blue-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${useCharacter ? 'translate-x-5' : 'translate-x-0'}`}/></button>
                                </div>
                                {useCharacter && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={charGender} onChange={e => setCharGender(e.target.value as any)} className="bg-slate-950 text-xs py-1.5 px-2 rounded border-slate-800"><option value="neutral">Neutral</option><option value="male">Male</option><option value="female">Female</option></select>
                                        <select value={charStyle} onChange={e => setCharStyle(e.target.value as any)} className="bg-slate-950 text-xs py-1.5 px-2 rounded border-slate-800">
                                            <option value="3d-render">3D</option>
                                            <option value="flat-vector">Vector</option>
                                            <option value="anime">Anime</option>
                                            <option value="pixel-art">Pixel</option>
                                            <option value="clay">Clay</option>
                                            <option value="cyberpunk">Cyberpunk</option>
                                            <option value="ghibli">Ghibli</option>
                                            <option value="watercolor">Watercolor</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={status !== GenerationStatus.IDLE} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                             {status === GenerationStatus.IDLE ? <><Zap className="w-5 h-5"/> {language === 'ar' ? 'إنشاء' : 'Generate Carousel'}</> : 'Generating...'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {activeView === 'editor' && currentCarousel && activeSlide && (
            <div className="flex flex-col md:flex-row h-full">
                
                {/* LEFT: Preview & Slides List */}
                <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden order-1 md:order-1">
                    {/* Toolbar */}
                    <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 z-10">
                         <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                             <span className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-500">#{selectedSlideIndex + 1}</span>
                             <span className="truncate max-w-[200px] hidden md:block">{activeSlide.headline || 'Untitled Slide'}</span>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => handleGenerateImage(activeSlide.slide_number)} disabled={imageLoadingState[activeSlide.slide_number]} className="p-2 bg-blue-600/10 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors"><RefreshCw size={16}/></button>
                             <button onClick={downloadSlideImage} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded font-bold hover:bg-slate-700 flex items-center gap-1"><Camera size={14}/> Save Slide</button>
                             <button onClick={exportPDF} disabled={isExporting} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded font-bold hover:bg-slate-700 flex items-center gap-1">
                                {isExporting ? 'Exporting...' : <><FileDown size={14}/> PDF</>}
                             </button>
                             <button onClick={handleGenerateAllImages} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-500 flex items-center gap-1"><Sparkles size={14}/> All</button>
                         </div>
                    </div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                        <div className="scale-90 md:scale-100 transition-transform duration-200 shadow-2xl">
                            <SlideCard 
                                slide={activeSlide}
                                imageData={generatedImages[currentCarousel.id]?.[activeSlide.slide_number]}
                                isGeneratingImage={!!imageLoadingState[activeSlide.slide_number]}
                                isError={!!imageErrorState[activeSlide.slide_number]}
                                onGenerateImage={() => handleGenerateImage(activeSlide.slide_number)}
                                onUpdateSlide={handleUpdateSlideField}
                                onUpdateDesign={() => {}} // Handled by sidebar
                                language={language}
                                aspectRatio={aspectRatio}
                                isSelected={true} // Always selected in this view
                            />
                        </div>
                    </div>

                    {/* Bottom Slide Strip */}
                    <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center gap-4 px-4 overflow-x-auto custom-scrollbar">
                        {currentCarousel.slides.map((s, idx) => (
                            <div 
                                key={s.slide_number} 
                                onClick={() => setSelectedSlideIndex(idx)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 cursor-pointer transition-all relative bg-slate-950 ${selectedSlideIndex === idx ? 'border-blue-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'} ${imageErrorState[s.slide_number] ? 'border-red-500' : ''}`}
                            >
                                {generatedImages[currentCarousel.id]?.[s.slide_number] ? (
                                    <img src={generatedImages[currentCarousel.id]?.[s.slide_number]} className="w-full h-full object-cover rounded-md" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs font-bold">
                                        {imageErrorState[s.slide_number] ? <AlertTriangle size={16} className="text-red-500"/> : s.slide_number}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Editor Panel (Sidebar) */}
                <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 h-[45vh] md:h-full order-2 md:order-2">
                    {/* Sidebar Tabs */}
                    <div className="flex border-b border-slate-800">
                        {['layout', 'text', 'style', 'char'].map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-3 text-[10px] font-bold uppercase flex flex-col items-center gap-1 border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab === 'layout' && <Layout size={14}/>}
                                {tab === 'text' && <Type size={14}/>}
                                {tab === 'style' && <Palette size={14}/>}
                                {tab === 'char' && <User size={14}/>}
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                        
                        {activeTab === 'layout' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presets</h4>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button onClick={() => applyLayoutPreset('default')} className="text-[10px] p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300">Standard</button>
                                         <button onClick={() => applyLayoutPreset('title-focus')} className="text-[10px] p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300">Focus</button>
                                         <button onClick={() => applyLayoutPreset('quote')} className="text-[10px] p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300">Quote</button>
                                         <button onClick={() => applyLayoutPreset('bottom-caption')} className="text-[10px] p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300">Caption</button>
                                     </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Position</h4>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500"><span>Horizontal</span><span>{activeSlide.design.xPosition}%</span></div>
                                            <input type="range" min="0" max="100" value={activeSlide.design.xPosition} onChange={(e) => handleDesignUpdate('xPosition', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500"><span>Vertical</span><span>{activeSlide.design.yPosition}%</span></div>
                                            <input type="range" min="0" max="100" value={activeSlide.design.yPosition} onChange={(e) => handleDesignUpdate('yPosition', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'text' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alignment</h4>
                                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                        {['left', 'center', 'right', 'justify'].map((align: any) => (
                                            <button key={align} onClick={() => handleDesignUpdate('textAlign', align)} 
                                                className={`flex-1 py-2 rounded flex justify-center transition-all ${activeSlide.design.textAlign === align ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                                {align === 'left' && <AlignLeft size={14}/>}
                                                {align === 'center' && <AlignCenter size={14}/>}
                                                {align === 'right' && <AlignRight size={14}/>}
                                                {align === 'justify' && <AlignJustify size={14}/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Font Family</h4>
                                    <select value={activeSlide.design.font || 'sans'} onChange={e => handleDesignUpdate('font', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:border-blue-500 outline-none">
                                        <option value="sans">Sans Serif (Inter/Cairo)</option>
                                        <option value="serif">Serif (Elegant)</option>
                                        <option value="mono">Monospace (Code)</option>
                                        <option value="display">Display (Bold)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Size & Color</h4>
                                    <div className="flex gap-3">
                                        <div className="w-12 h-10 rounded-lg border border-slate-700 overflow-hidden relative cursor-pointer">
                                            <input type="color" value={activeSlide.design.textColor} onChange={e => handleDesignUpdate('textColor', e.target.value)} className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"/>
                                        </div>
                                        <select value={activeSlide.design.fontSize} onChange={e => handleDesignUpdate('fontSize', e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 focus:border-blue-500 outline-none">
                                            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="xl">Extra Large</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effects</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['none', 'shadow', 'neon', 'outline', 'bg-highlight', 'retro'].map(eff => (
                                            <button key={eff} onClick={() => handleDesignUpdate('textEffect', eff)} 
                                                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${activeSlide.design.textEffect === eff ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                                                {eff}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme Presets</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => applyStylePreset('cyber')} className="text-[10px] py-2 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 text-teal-400 font-bold border-l-2 border-l-teal-500">Cyber</button>
                                        <button onClick={() => applyStylePreset('lux')} className="text-[10px] py-2 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 text-yellow-500 font-serif font-bold border-l-2 border-l-yellow-500">Luxury</button>
                                        <button onClick={() => applyStylePreset('bold')} className="text-[10px] py-2 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 text-white font-bold border-l-2 border-l-white">Bold</button>
                                        <button onClick={() => applyStylePreset('minimal')} className="text-[10px] py-2 bg-slate-950 border border-slate-800 rounded hover:bg-slate-800 text-slate-400 border-l-2 border-l-slate-400">Minimal</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Color Palette</h4>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {COLOR_PALETTES.map((p, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => applyColorPalette(p)}
                                                className="h-8 rounded-lg border border-slate-700 overflow-hidden relative group"
                                                title={p.name}
                                            >
                                                <div className="absolute inset-0 flex">
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.text }}></div>
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.accent }}></div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold">Text</label>
                                            <div className="h-8 rounded-lg border border-slate-700 relative overflow-hidden bg-slate-900">
                                                <input type="color" value={activeSlide.design.textColor} onChange={e => handleDesignUpdate('textColor', e.target.value)} className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"/>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold">Accent</label>
                                             <div className="h-8 rounded-lg border border-slate-700 relative overflow-hidden bg-slate-900">
                                                <input type="color" value={activeSlide.design.accentColor || '#3b82f6'} onChange={e => handleDesignUpdate('accentColor', e.target.value)} className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Decorations</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[{id:'none',i:X},{id:'grid',i:Grid},{id:'frame',i:Frame},{id:'circle',i:BoxSelect},{id:'blob',i:Sparkles}].map(d => (
                                            <button key={d.id} onClick={() => handleDesignUpdate('decoration', d.id)}
                                                className={`h-12 rounded-lg border flex items-center justify-center text-slate-500 transition-all ${activeSlide.design.decoration === d.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}>
                                                <d.i size={16}/>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image Overlay</h4>
                                    <input type="range" min="0" max="90" value={activeSlide.design.overlayOpacity} onChange={e => handleDesignUpdate('overlayOpacity', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-slate-800">
                                    <label className="text-xs font-bold text-slate-400">Visual Prompt</label>
                                    <textarea value={activeSlide.visual_description} onChange={e => handleUpdateSlideField(activeSlide.slide_number, 'visual_description', e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs resize-none focus:border-blue-500 outline-none"/>
                                </div>
                            </div>
                        )}

                        {activeTab === 'char' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-sm font-bold flex items-center gap-2"><User size={16}/> Include Character</span>
                                    <button onClick={() => handleUpdateSlideField(activeSlide.slide_number, 'include_character', !activeSlide.include_character)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${activeSlide.include_character ? 'bg-blue-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${activeSlide.include_character ? 'translate-x-5' : 'translate-x-0'}`}/></button>
                                </div>

                                {activeSlide.include_character && (
                                    <>
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anchor Position</h4>
                                            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 w-full aspect-square">
                                                {['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => (
                                                    <button key={pos} onClick={() => handleCharacterUpdate('position', pos)} className={`w-full h-full rounded flex items-center justify-center transition-all ${activeSlide.character_settings.position === pos ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-500'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${activeSlide.character_settings.position === pos ? 'bg-white' : 'bg-slate-500'}`}/>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 font-bold">Expression</label>
                                                    <select value={activeSlide.character_settings?.expression} onChange={e => handleCharacterUpdate('expression', e.target.value)} className="w-full bg-slate-950 text-xs py-2 px-2 rounded-lg border border-slate-800"><option value="neutral">Neutral</option><option value="happy">Happy</option><option value="serious">Serious</option></select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 font-bold">Scale</label>
                                                    <select value={activeSlide.character_settings?.scale} onChange={e => handleCharacterUpdate('scale', e.target.value)} className="w-full bg-slate-950 text-xs py-2 px-2 rounded-lg border border-slate-800"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-slate-500"><span>Opacity</span><span>{activeSlide.character_settings?.opacity ?? 100}%</span></div>
                                                <input type="range" min="10" max="100" value={activeSlide.character_settings?.opacity ?? 100} onChange={e => handleCharacterUpdate('opacity', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                            </div>
                                             <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-slate-500"><span>Rotation</span><span>{activeSlide.character_settings?.rotation ?? 0}°</span></div>
                                                <input type="range" min="-180" max="180" value={activeSlide.character_settings?.rotation ?? 0} onChange={e => handleCharacterUpdate('rotation', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 pt-4 border-t border-slate-800">
                                            <label className="text-xs font-bold text-blue-400">Custom Action (Override)</label>
                                            <textarea value={activeSlide.character_custom_prompt || ''} onChange={e => handleUpdateSlideField(activeSlide.slide_number, 'character_custom_prompt', e.target.value)} placeholder="e.g. Jumping in the air..." className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs resize-none focus:border-blue-500 outline-none"/>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeView === 'library' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
                 <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {library.map((item) => (
                        <div key={item.id} onClick={() => loadFromLibrary(item)} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-blue-500 transition-all hover:-translate-y-1 group relative">
                            <button onClick={(e) => deleteFromLibrary(item.id, e)} className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{item.carousel_metadata.topic}</h3>
                            <div className="flex gap-2 text-xs text-slate-500"><span className="bg-slate-800 px-2 py-1 rounded">{item.slides.length} Slides</span></div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

      </main>
    </div>
  );
}

export default App;