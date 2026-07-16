import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Layers, Download, Palette, Type, Save, Archive, Trash2, Grid, UserPlus, Zap, FileDown, Check, Lightbulb, MessageSquare, Scaling, Layout, Move, AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Frame, BoxSelect, User, Smile, Ghost, RotateCw, RefreshCw, Image as ImageIcon, Camera, AlertTriangle, ArrowLeft, ArrowRight, Smartphone, AtSign, FileOutput, Hash } from 'lucide-react';
import { generateCarouselScript, generateSlideImage } from './services/geminiService';
import { CarouselResponse, GenerationStatus, ViewMode, Slide, SlideDesign, CharacterTraits, CharacterSettings, BrandColors, PersonalBranding, SlideNumberDesign } from './types';
import SlideCard from './components/SlideCard';
// @ts-ignore
import { jsPDF } from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";
// @ts-ignore
import PptxGenJS from "pptxgenjs";

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
  const [writtenPost, setWrittenPost] = useState('');
  const [visualStyle, setVisualStyle] = useState(ALL_VISUAL_STYLES[0]);
  const [slideCount, setSlideCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '1:1' | '16:9'>('4:5');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [tone, setTone] = useState(TONES_EN[0]);
  const [dialect, setDialect] = useState('');
  const [brandColors, setBrandColors] = useState<BrandColors>({ text: '#ffffff', accent: '#3b82f6' });
  const [useCharacter, setUseCharacter] = useState(false);
  const [characterDesc, setCharacterDesc] = useState('');
  const [characterRefImage, setCharacterRefImage] = useState('');
  const [characterRefText, setCharacterRefText] = useState('');
  const [isExtractingColors, setIsExtractingColors] = useState(false);

  // Editor State
  const [currentCarousel, setCurrentCarousel] = useState<CarouselResponse | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, Record<number, string>>>({});
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [imageLoadingState, setImageLoadingState] = useState<Record<number, boolean>>({});
  const [imageErrorState, setImageErrorState] = useState<Record<number, boolean>>({});
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'layout' | 'text' | 'style' | 'char'>('layout');
  const [isExporting, setIsExporting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true); // Assume true initially, check in effect
  
  // New UI States
  const [previewPlatform, setPreviewPlatform] = useState<'none' | 'instagram' | 'linkedin'>('none');
  const [personalBranding, setPersonalBranding] = useState<PersonalBranding>({ name: '', handle: '', enabled: false });

  // History
  const [library, setLibrary] = useState<CarouselResponse[]>([]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume successful selection to avoid race conditions
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCharacterRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeCharacter = async () => {
      if (!characterRefImage) return;
      setIsExtractingColors(true);
      try {
          const { analyzeCharacterReference } = await import('./services/geminiService');
          const result = await analyzeCharacterReference(characterRefImage);
          if (result.brandColors && result.brandColors.text && result.brandColors.accent) {
              setBrandColors(result.brandColors);
          }
          if (result.visualStyle) {
              setVisualStyle(result.visualStyle);
          }
          if (result.characterRefText) {
              setCharacterRefText(result.characterRefText);
          }
      } catch (e) {
          console.error(e);
          alert("Failed to analyze character. Make sure your API key is set.");
      } finally {
          setIsExtractingColors(false);
      }
  };

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

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenPost) return;

    setStatus(GenerationStatus.GENERATING_SCRIPT);
    
    try {
      const data = await generateCarouselScript(
          writtenPost, visualStyle, slideCount, 
          language, tone, dialect, useCharacter, aspectRatio, brandColors, characterRefImage, characterRefText
      );
      if (useCharacter && data.carousel_metadata.character_description) {
          setCharacterDesc(data.carousel_metadata.character_description);
      }
      // Store the reference image in metadata so it can be used for image generation
      data.carousel_metadata.character_reference_image = characterRefImage;
      
      setCurrentCarousel(data);
      setStatus(GenerationStatus.COMPLETE);
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

  const handleDesignUpdateBySlideNumber = (slideNumber: number, field: keyof SlideDesign, value: any) => {
      if (!currentCarousel) return;
      const idx = currentCarousel.slides.findIndex(s => s.slide_number === slideNumber);
      if (idx !== -1) {
          updateSlide(idx, s => ({ ...s, design: { ...s.design, [field]: value } }));
      }
  };
  
  const handleCharacterUpdate = (field: keyof CharacterSettings, value: any) => {
      updateSlide(selectedSlideIndex, s => ({ ...s, character_settings: { ...s.character_settings, [field]: value } }));
  };

  const handleSlideNumberUpdate = (field: keyof SlideNumberDesign, value: any) => {
      if (!currentCarousel) return;
      const currentDesign = activeSlide?.design.slideNumberDesign || { show: true, style: 'minimal', position: 'top-left' };
      handleDesignUpdate('slideNumberDesign', { ...currentDesign, [field]: value });
  };

  const moveSlide = (direction: 'left' | 'right') => {
      if (!currentCarousel) return;
      const newIndex = direction === 'left' ? selectedSlideIndex - 1 : selectedSlideIndex + 1;
      if (newIndex < 0 || newIndex >= currentCarousel.slides.length) return;

      const newSlides = [...currentCarousel.slides];
      const temp = newSlides[selectedSlideIndex];
      newSlides[selectedSlideIndex] = newSlides[newIndex];
      newSlides[newIndex] = temp;

      newSlides[selectedSlideIndex].slide_number = selectedSlideIndex + 1;
      newSlides[newIndex].slide_number = newIndex + 1;

      setCurrentCarousel({ ...currentCarousel, slides: newSlides });
      setSelectedSlideIndex(newIndex);
  };

  const applyLayoutPreset = (type: 'default' | 'title-focus' | 'quote' | 'bottom-caption') => {
      const isRTL = language === 'ar';
      if (type === 'default') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, containerStyle: 'none', textAlign: isRTL ? 'right' : 'left', xPosition: 50, yPosition: 10, fontSize: 'medium', decoration: 'none', textWidth: 85 } }));
      } else if (type === 'title-focus') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, containerStyle: 'none', textAlign: 'center', xPosition: 50, yPosition: 40, fontSize: 'xl', textWidth: 90 } }));
      } else if (type === 'quote') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, containerStyle: 'glass', textAlign: 'center', xPosition: 50, yPosition: 50, fontSize: 'large', decoration: 'none', textWidth: 80 } }));
      } else if (type === 'bottom-caption') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, containerStyle: 'gradient-bottom', textAlign: 'center', xPosition: 50, yPosition: 85, fontSize: 'small', decoration: 'none', textWidth: 90 } }));
      }
  };

  const applyStylePreset = (type: 'cyber' | 'lux' | 'bold' | 'minimal') => {
      if (type === 'cyber') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#00ffcc', accentColor: '#00ffcc', textEffect: 'neon', decoration: 'grid', overlayOpacity: 80, containerStyle: 'glass' } }));
      } else if (type === 'lux') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffd700', accentColor: '#ffd700', textEffect: 'shadow', decoration: 'frame', overlayOpacity: 60, font: 'serif', containerStyle: 'card', textBackgroundColor: '#000000' } }));
      } else if (type === 'bold') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffffff', accentColor: '#ef4444', textEffect: 'bg-highlight', decoration: 'circle', overlayOpacity: 20, font: 'display', containerStyle: 'none' } }));
      } else if (type === 'minimal') {
          updateSlide(selectedSlideIndex, s => ({ ...s, design: { ...s.design, textColor: '#ffffff', accentColor: '#94a3b8', textEffect: 'none', decoration: 'none', overlayOpacity: 10, font: 'sans', containerStyle: 'none' } }));
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
      setPersonalBranding(carousel.carousel_metadata.personal_branding || { name: '', handle: '', enabled: false });
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
    await new Promise(resolve => setTimeout(resolve, 500));
    let width = 340, height = 425;
    if (currentCarousel.carousel_metadata.aspect_ratio === '1:1') height = 340;
    else if (currentCarousel.carousel_metadata.aspect_ratio === '16:9') { width = 560; height = 315; }
    const doc = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "pt", format: [width, height], hotfixes: ["px_scaling"] });
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

  const exportPPTX = async () => {
      if (!currentCarousel) return;
      setIsExporting(true);
      const pres = new PptxGenJS();
      const ar = currentCarousel.carousel_metadata.aspect_ratio;
      let w = 10, h = 12.5;
      if (ar === '1:1') { h = 10; }
      else if (ar === '16:9') { w = 13.33; h = 7.5; }
      pres.defineLayout({ name: 'CUSTOM_AR', width: w, height: h });
      pres.layout = 'CUSTOM_AR';
      for (const slide of currentCarousel.slides) {
          const s = pres.addSlide();
          const imgData = generatedImages[currentCarousel.id]?.[slide.slide_number];
          if (imgData) { s.background = { data: imgData }; } else { s.background = { color: '0f172a' }; }
          const xPct = slide.design.xPosition / 100;
          const yPct = slide.design.yPosition / 100;
          const wPct = (slide.design.textWidth || 85) / 100;
          const textBoxWidth = w * wPct;
          const xPos = (w * xPct) - (textBoxWidth / 2);
          const yPos = h * yPct;
          const alignMap: any = { 'left': 'left', 'center': 'center', 'right': 'right', 'justify': 'justify' };
          s.addText(slide.headline, { x: xPos, y: yPos, w: textBoxWidth, h: 1.5, color: slide.design.textColor.replace('#', ''), fontSize: slide.design.fontSize === 'xl' ? 36 : slide.design.fontSize === 'large' ? 32 : 24, align: alignMap[slide.design.textAlign], fontFace: slide.design.font === 'serif' ? 'Times New Roman' : 'Arial', isTextBox: true, autoFit: true, bold: true });
          s.addText(slide.sub_headline, { x: xPos, y: yPos + 1.6, w: textBoxWidth, h: 2, color: slide.design.textColor.replace('#', ''), fontSize: slide.design.fontSize === 'xl' ? 24 : slide.design.fontSize === 'large' ? 20 : 16, align: alignMap[slide.design.textAlign], fontFace: slide.design.font === 'serif' ? 'Times New Roman' : 'Arial', isTextBox: true, transparency: 10 });
          if (slide.design.slideNumberDesign?.show) {
              const numDesign = slide.design.slideNumberDesign;
              let numX = 0.5; let numY = 0.5;
              if (numDesign.position.includes('right')) numX = w - 1.5;
              if (numDesign.position.includes('bottom')) numY = h - 1.5;
              const numText = slide.slide_number.toString();
              if (numDesign.style === 'minimal') { s.addText(numText, { x: numX, y: numY, fontSize: 18, color: 'FFFFFF', bold: true }); }
              else if (numDesign.style === 'circle') { s.addShape(pres.ShapeType.ellipse, { x: numX, y: numY, w: 0.5, h: 0.5, fill: { color: '000000', transparency: 50 }, line: { color: 'FFFFFF' } }); s.addText(numText, { x: numX, y: numY, w: 0.5, h: 0.5, align: 'center', fontSize: 14, color: 'FFFFFF', bold: true }); }
          }
      }
      await pres.writeFile({ fileName: `Carousel-${currentCarousel.carousel_metadata.title}.pptx` });
      setIsExporting(false);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col ${language === 'ar' ? 'font-arabic' : ''}`}>
      {currentCarousel && (
          <div className="absolute top-0 left-[-9999px] flex flex-col gap-10 pointer-events-none" aria-hidden="true">
              {currentCarousel.slides.map((slide) => (
                  <div key={slide.slide_number} id={`export-slide-${slide.slide_number}`}>
                      <SlideCard slide={slide} imageData={generatedImages[currentCarousel.id]?.[slide.slide_number]} isGeneratingImage={false} onUpdateSlide={() => {}} onGenerateImage={() => {}} onUpdateDesign={() => {}} readOnly={true} language={language} aspectRatio={aspectRatio} personalBranding={personalBranding}/>
                  </div>
              ))}
          </div>
      )}

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
                     <button key={mode} onClick={() => setActiveView(mode as ViewMode)} disabled={mode === 'editor' && !currentCarousel} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${activeView === mode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}>
                         {mode}
                     </button>
                 ))}
             </div>
         </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {activeView === 'create' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-3xl font-bold text-white">{language === 'ar' ? 'إنشاء كاروسيل جديد' : 'Create New Carousel'}</h2>
                        <p className="text-slate-400">{language === 'ar' ? 'حدد استراتيجيتك ودع الذكاء الاصطناعي يتولى الباقي.' : 'Define your strategy and let AI handle the rest.'}</p>
                    </div>
                    <form onSubmit={handleGenerateScript} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Column 1: Content */}
                            <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
                                {!hasApiKey && (
                                    <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg flex items-start gap-3 mb-4">
                                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-red-200">API Key Required</h4>
                                            <p className="text-xs text-red-300 mt-1">You need to select a Gemini API key to use the advanced image generation features.</p>
                                            <button type="button" onClick={handleSelectApiKey} className="mt-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors">Select API Key</button>
                                        </div>
                                    </div>
                                )}
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg"><Lightbulb className="w-5 h-5 text-yellow-400"/> {language === 'ar' ? 'المحتوى' : 'Content'}</h3>
                                <textarea value={writtenPost} onChange={e => setWrittenPost(e.target.value)} placeholder={language === 'ar' ? 'الصق منشورك المكتوب هنا لتحويله إلى كاروسيل...' : "Paste your written post here to convert it into a carousel..."} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:border-blue-500 outline-none min-h-[150px] resize-y" />
                                
                                {language === 'ar' && (
                                    <div className="animate-in fade-in">
                                        <label className="text-xs font-bold text-slate-500 mb-2 block">Dialect / اللهجة</label>
                                        <select value={dialect} onChange={e => setDialect(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 outline-none">
                                            <option value="">Select Dialect...</option>
                                            {DIALECTS.map(d => (<option key={d.id} value={d.label}>{d.label}</option>))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Column 2: Character */}
                            <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-white flex items-center gap-2 text-lg"><User className="w-5 h-5 text-blue-400"/> {language === 'ar' ? 'الشخصية' : 'Character'}</h3>
                                    <button 
                                        type="button" 
                                        onClick={() => setUseCharacter(!useCharacter)} 
                                        dir="ltr"
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${useCharacter ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${useCharacter ? 'translate-x-5' : 'translate-x-0'}`}/>
                                    </button>
                                </div>
                                
                                {useCharacter ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase">Reference Sheet</label>
                                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:bg-slate-800/50 transition-colors relative group">
                                                {characterRefImage ? (
                                                    <div className="relative w-full h-32 rounded overflow-hidden">
                                                        <img src={characterRefImage} alt="Ref" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 px-3 rounded flex items-center gap-2">
                                                                <RefreshCw size={14} /> Change
                                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                            </label>
                                                            <button type="button" onClick={() => setCharacterRefImage('')} className="bg-red-600 hover:bg-red-500 text-white text-xs py-1.5 px-3 rounded flex items-center gap-2">
                                                                <Trash2 size={14} /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center justify-center h-32 gap-2">
                                                        <ImageIcon className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                                        <span className="text-xs text-slate-400 font-medium">Upload Reference Sheet</span>
                                                        <span className="text-[10px] text-slate-500">PNG, JPG up to 5MB</span>
                                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                            {characterRefImage && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleAnalyzeCharacter}
                                                    disabled={isExtractingColors}
                                                    className="w-full mt-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 disabled:opacity-50 text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Palette size={14} /> {isExtractingColors ? 'Analyzing...' : 'Auto-Fill from Image'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase">Character Details</label>
                                            <textarea 
                                                value={characterRefText} 
                                                onChange={e => setCharacterRefText(e.target.value)} 
                                                placeholder="Describe the character's exact outfit, hairstyle, and features..." 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none h-20 resize-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 py-8">
                                        <User className="w-12 h-12 opacity-20" />
                                        <p className="text-xs text-center px-4">Enable AI Character to keep a consistent character across all slides.</p>
                                        <button type="button" onClick={() => setUseCharacter(true)} className="text-xs font-bold text-blue-400 hover:text-blue-300">Enable Character</button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Column 3: Style */}
                            <div className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg"><Palette className="w-5 h-5 text-purple-400"/> {language === 'ar' ? 'الأسلوب' : 'Style & Tone'}</h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase">Visual Style</label>
                                    <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none">
                                        {Object.entries(VISUAL_STYLES_CATEGORIES).map(([category, styles]) => (
                                            <optgroup key={category} label={category}>
                                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 pb-2 border-b border-slate-800/50">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase flex justify-between">
                                        <span>Brand Colors</span>
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {COLOR_PALETTES.map((p, i) => (
                                            <button key={i} type="button" onClick={() => setBrandColors({ text: p.text, accent: p.accent })} className={`flex-shrink-0 w-8 h-8 rounded-full border-2 overflow-hidden relative group transition-transform hover:scale-110 ${brandColors.accent === p.accent ? 'border-white scale-110' : 'border-slate-700'}`} title={p.name}>
                                                <div className="absolute inset-0 flex">
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.text }}></div>
                                                    <div className="w-1/2 h-full" style={{ backgroundColor: p.accent }}></div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors group">
                                             <div className="w-6 h-6 rounded border border-slate-700 relative overflow-hidden flex-shrink-0">
                                                <input type="color" value={brandColors.text} onChange={e => setBrandColors(prev => ({ ...prev, text: e.target.value }))} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"/>
                                                <div className="absolute inset-0 pointer-events-none" style={{backgroundColor: brandColors.text}}></div>
                                             </div>
                                             <div className="flex flex-col flex-1 min-w-0">
                                                 <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Text</span>
                                                 <input type="text" value={brandColors.text} onChange={e => setBrandColors(prev => ({ ...prev, text: e.target.value }))} className="bg-transparent border-none text-[10px] text-slate-300 font-mono w-full p-0 h-auto focus:ring-0 focus:outline-none uppercase" placeholder="#FFFFFF"/>
                                             </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors group">
                                             <div className="w-6 h-6 rounded border border-slate-700 relative overflow-hidden flex-shrink-0">
                                                <input type="color" value={brandColors.accent} onChange={e => setBrandColors(prev => ({ ...prev, accent: e.target.value }))} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"/>
                                                <div className="absolute inset-0 pointer-events-none" style={{backgroundColor: brandColors.accent}}></div>
                                             </div>
                                             <div className="flex flex-col flex-1 min-w-0">
                                                 <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Accent</span>
                                                 <input type="text" value={brandColors.accent} onChange={e => setBrandColors(prev => ({ ...prev, accent: e.target.value }))} className="bg-transparent border-none text-[10px] text-slate-300 font-mono w-full p-0 h-auto focus:ring-0 focus:outline-none uppercase" placeholder="#3B82F6"/>
                                             </div>
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
                            </div>
                        </div>

                        {currentCarousel && (
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg mb-4"><FileDown className="w-5 h-5 text-green-400"/> Script Preview</h3>
                                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                                    {currentCarousel.slides.map((slide, idx) => (
                                        <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-blue-900/50 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded">Slide {slide.slide_number}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-white mb-1">{slide.headline}</h4>
                                            <p className="text-xs text-slate-400">{slide.sub_headline}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button 
                                        type="button" 
                                        onClick={() => setActiveView('editor')} 
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <Check className="w-5 h-5"/> Proceed to Editor
                                    </button>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={status !== GenerationStatus.IDLE} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                             {status === GenerationStatus.IDLE ? <><Zap className="w-5 h-5"/> {language === 'ar' ? 'تحليل المنشور ومعاينة النص' : 'Analyze Post & Preview Script'}</> : 'Analyzing...'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {activeView === 'editor' && currentCarousel && activeSlide && (
            <div className="flex flex-col md:flex-row h-full">
                <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden order-1 md:order-1">
                    <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 z-10">
                         <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                             <div className="flex bg-slate-800 rounded-lg p-0.5" dir="ltr">
                                 <button onClick={() => moveSlide('left')} disabled={selectedSlideIndex === 0} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-30"><ArrowLeft size={14}/></button>
                                 <button onClick={() => moveSlide('right')} disabled={selectedSlideIndex === currentCarousel.slides.length - 1} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-30"><ArrowRight size={14}/></button>
                             </div>
                             <span className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-500">#{selectedSlideIndex + 1}</span>
                         </div>
                         <div className="flex gap-2" dir="ltr">
                             <div className="hidden md:flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-2">
                                 <button onClick={() => setPreviewPlatform('none')} className={`p-1.5 rounded text-[10px] font-bold ${previewPlatform === 'none' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>None</button>
                                 <button onClick={() => setPreviewPlatform('instagram')} className={`p-1.5 rounded text-slate-400 hover:text-white ${previewPlatform === 'instagram' ? 'bg-slate-600 text-white' : ''}`}><Smartphone size={14}/></button>
                             </div>
                             <button onClick={() => handleGenerateImage(activeSlide.slide_number)} disabled={imageLoadingState[activeSlide.slide_number]} className="p-2 bg-blue-600/10 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors"><RefreshCw size={16}/></button>
                             <button onClick={downloadSlideImage} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded font-bold hover:bg-slate-700 flex items-center gap-1"><Camera size={14}/> Save Slide</button>
                             <button onClick={exportPPTX} disabled={isExporting} className="text-xs bg-orange-700/50 border border-orange-600 text-orange-200 px-3 py-1.5 rounded font-bold hover:bg-orange-700 flex items-center gap-1">
                                {isExporting ? 'Exporting...' : <><FileOutput size={14}/> PPTX</>}
                             </button>
                             <button onClick={exportPDF} disabled={isExporting} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded font-bold hover:bg-slate-700 flex items-center gap-1">
                                {isExporting ? 'Exporting...' : <><FileDown size={14}/> PDF</>}
                             </button>
                             <button onClick={handleGenerateAllImages} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-500 flex items-center gap-1"><Sparkles size={14}/> All</button>
                         </div>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
                        <div className="scale-90 md:scale-100 transition-transform duration-200 shadow-2xl relative">
                            <SlideCard slide={activeSlide} imageData={generatedImages[currentCarousel.id]?.[activeSlide.slide_number]} isGeneratingImage={!!imageLoadingState[activeSlide.slide_number]} isError={!!imageErrorState[activeSlide.slide_number]} onGenerateImage={() => handleGenerateImage(activeSlide.slide_number)} onUpdateSlide={handleUpdateSlideField} onUpdateDesign={handleDesignUpdateBySlideNumber} language={language} aspectRatio={aspectRatio} isSelected={true} personalBranding={personalBranding} previewPlatform={previewPlatform}/>
                        </div>
                    </div>
                    <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center gap-4 px-4 overflow-x-auto custom-scrollbar" dir="ltr">
                        {currentCarousel.slides.map((s, idx) => (
                            <div key={s.slide_number} onClick={() => setSelectedSlideIndex(idx)} className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 cursor-pointer transition-all relative bg-slate-950 ${selectedSlideIndex === idx ? 'border-blue-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'} ${imageErrorState[s.slide_number] ? 'border-red-500' : ''}`}>
                                {generatedImages[currentCarousel.id]?.[s.slide_number] ? (<img src={generatedImages[currentCarousel.id]?.[s.slide_number]} className="w-full h-full object-cover rounded-md" />) : (<div className="w-full h-full flex items-center justify-center text-slate-700 text-xs font-bold">{imageErrorState[s.slide_number] ? <AlertTriangle size={16} className="text-red-500"/> : s.slide_number}</div>)}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 h-[45vh] md:h-full order-2 md:order-2">
                    <div className="flex border-b border-slate-800">
                        {['layout', 'text', 'style', 'char'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[10px] font-bold uppercase flex flex-col items-center gap-1 border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                {tab === 'layout' && <Layout size={14}/>}{tab === 'text' && <Type size={14}/>}{tab === 'style' && <Palette size={14}/>}{tab === 'char' && <User size={14}/>}{tab}
                            </button>
                        ))}
                    </div>
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
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layout Style</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['none', 'glass', 'card', 'paper', 'gradient-bottom'].map(s => (
                                            <button key={s} onClick={() => handleDesignUpdate('containerStyle', s)} className={`text-[10px] py-2 px-1 capitalize border rounded transition-all ${activeSlide.design.containerStyle === s ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                                                {s.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Position & Size</h4>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500"><span>Box Width</span><span>{activeSlide.design.textWidth || 85}%</span></div>
                                            <input type="range" min="20" max="100" value={activeSlide.design.textWidth || 85} onChange={(e) => handleDesignUpdate('textWidth', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500"><span>Horizontal (X)</span><span>{activeSlide.design.xPosition}%</span></div>
                                            <input type="range" min="0" max="100" value={activeSlide.design.xPosition} onChange={(e) => handleDesignUpdate('xPosition', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500"><span>Vertical (Y)</span><span>{activeSlide.design.yPosition}%</span></div>
                                            <input type="range" min="0" max="100" value={activeSlide.design.yPosition} onChange={(e) => handleDesignUpdate('yPosition', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slide Numbering</h4>
                                        <button onClick={() => handleSlideNumberUpdate('show', !activeSlide.design.slideNumberDesign?.show)} dir="ltr" className={`w-8 h-4 rounded-full p-0.5 transition-colors shrink-0 ${activeSlide.design.slideNumberDesign?.show ? 'bg-blue-600' : 'bg-slate-700'}`}><div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${activeSlide.design.slideNumberDesign?.show ? 'translate-x-4' : 'translate-x-0'}`}/></button>
                                    </div>
                                    {activeSlide.design.slideNumberDesign?.show && (
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                            <div className="grid grid-cols-3 gap-2">
                                                {['minimal', 'circle', 'square', 'outline', 'tag'].map(s => (
                                                    <button key={s} onClick={() => handleSlideNumberUpdate('style', s)} className={`text-[10px] py-1.5 capitalize rounded border transition-colors ${activeSlide.design.slideNumberDesign?.style === s ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-slate-500 font-bold">Position</label>
                                                <div className="grid grid-cols-2 gap-2 aspect-video bg-slate-900 rounded p-2">
                                                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                                                        <button key={pos} onClick={() => handleSlideNumberUpdate('position', pos)} className={`rounded transition-colors flex items-center justify-center h-8 ${activeSlide.design.slideNumberDesign?.position === pos ? 'bg-blue-500' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                                            <div className={`w-2 h-2 rounded-full ${activeSlide.design.slideNumberDesign?.position === pos ? 'bg-white' : 'bg-slate-500'}`}/>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Other tabs omitted for brevity but they exist in full file... */}
                        {activeTab === 'text' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alignment</h4>
                                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800" dir="ltr">
                                        {['left', 'center', 'right', 'justify'].map((align: any) => (
                                            <button key={align} onClick={() => handleDesignUpdate('textAlign', align)} className={`flex-1 py-2 rounded flex justify-center transition-all ${activeSlide.design.textAlign === align ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                                {align === 'left' && <AlignLeft size={14}/>}{align === 'center' && <AlignCenter size={14}/>}{align === 'right' && <AlignRight size={14}/>}{align === 'justify' && <AlignJustify size={14}/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Font Family</h4>
                                    <select value={activeSlide.design.font || 'sans'} onChange={e => handleDesignUpdate('font', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:border-blue-500 outline-none mb-2">
                                        <option value="sans">Sans Serif (Inter/Cairo)</option><option value="serif">Serif (Elegant)</option><option value="mono">Monospace (Code)</option><option value="display">Display (Bold)</option><option value="custom">Custom Google Font</option>
                                    </select>
                                    {activeSlide.design.font === 'custom' && (
                                        <div className="animate-in fade-in">
                                            <input type="text" value={activeSlide.design.customFont || ''} onChange={e => handleDesignUpdate('customFont', e.target.value)} placeholder="e.g. Roboto, Open Sans, Lato" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none"/>
                                        </div>
                                    )}
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
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Text Background</h4>
                                    <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <div className="space-y-1 flex-1">
                                             <label className="text-[10px] text-slate-500 font-bold">Color</label>
                                             <div className="h-8 rounded-lg border border-slate-700 relative overflow-hidden bg-slate-900">
                                                <input type="color" value={activeSlide.design.textBackgroundColor || '#000000'} onChange={e => handleDesignUpdate('textBackgroundColor', e.target.value)} className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"/>
                                             </div>
                                        </div>
                                        <div className="space-y-1 flex-[2]">
                                             <label className="text-[10px] text-slate-500 font-bold">Opacity: {activeSlide.design.textBackgroundOpacity}%</label>
                                             <input type="range" min="0" max="100" value={activeSlide.design.textBackgroundOpacity || 0} onChange={e => handleDesignUpdate('textBackgroundOpacity', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'style' && (
                             <div className="space-y-6 animate-in fade-in duration-300">
                                 {/* Style tab content... */}
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
                                            <button key={i} onClick={() => applyColorPalette(p)} className="h-8 rounded-lg border border-slate-700 overflow-hidden relative group" title={p.name}>
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
                                            <button key={d.id} onClick={() => handleDesignUpdate('decoration', d.id)} className={`h-12 rounded-lg border flex items-center justify-center text-slate-500 transition-all ${activeSlide.design.decoration === d.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}>
                                                <d.i size={16}/>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image Overlay</h4>
                                    <input type="range" min="0" max="90" value={activeSlide.design.overlayOpacity} onChange={e => handleDesignUpdate('overlayOpacity', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                             </div>
                        )}
                        {activeTab === 'char' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-sm font-bold flex items-center gap-2"><User size={16}/> Include Character</span>
                                    <button onClick={() => handleUpdateSlideField(activeSlide.slide_number, 'include_character', !activeSlide.include_character)} dir="ltr" className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${activeSlide.include_character ? 'bg-blue-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${activeSlide.include_character ? 'translate-x-5' : 'translate-x-0'}`}/></button>
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
                            <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{item.carousel_metadata.title}</h3>
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