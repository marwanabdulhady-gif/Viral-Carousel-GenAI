
export interface CharacterTraits {
  style: '3d-render' | 'flat-vector' | 'hand-drawn' | 'anime' | 'realistic' | 'pixel-art' | 'clay' | 'cyberpunk' | 'vaporwave' | 'noir' | 'ghibli' | 'paper-cutout' | 'steampunk' | 'watercolor' | 'sketch' | 'disney';
  gender: 'neutral' | 'male' | 'female';
  age: 'child' | 'young-adult' | 'adult' | 'elderly';
  color_accent: string;
}

export interface BrandColors {
  text: string;
  accent: string;
}

export interface CarouselMetadata {
  topic: string;
  visual_style: string;
  target_audience: string;
  language: 'en' | 'ar';
  tone: string;
  aspect_ratio: '4:5' | '1:1' | '16:9';
  dialect?: string;
  main_theme?: string;
  character_description?: string; // Global character prompt
  character_traits?: CharacterTraits;
  brand_colors?: BrandColors;
}

export interface SlideDesign {
  textColor: string;
  accentColor: string; // New field for decorations
  overlayOpacity: number;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  font: 'sans' | 'serif' | 'mono' | 'display';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  xPosition: number; // 0 to 100 percentage
  yPosition: number; // 0 to 100 percentage
  textEffect: 'none' | 'shadow' | 'neon' | 'outline' | 'bg-highlight' | 'glitch' | 'retro';
  decoration: 'none' | 'circle' | 'square' | 'accent-line' | 'corner-shape' | 'grid' | 'blob' | 'frame';
}

export type CharacterPosition = 
  'top-left' | 'top-center' | 'top-right' | 
  'center-left' | 'center' | 'center-right' | 
  'bottom-left' | 'bottom-center' | 'bottom-right';

export interface CharacterSettings {
    scale: 'small' | 'medium' | 'large';
    position: CharacterPosition;
    opacity: number; // 0-100
    rotation: number; // -180 to 180
    expression: 'neutral' | 'happy' | 'serious' | 'surprised' | 'focused' | 'excited' | 'confused';
}

export interface Slide {
  slide_number: number;
  headline: string;
  sub_headline: string;
  visual_description: string;
  layout_hint: string;
  include_character: boolean; 
  character_custom_prompt?: string;
  character_settings: CharacterSettings;
  design: SlideDesign;
}

export interface CarouselResponse {
  id: string;
  createdAt: number;
  carousel_metadata: CarouselMetadata;
  slides: Slide[];
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING_IDEAS = 'GENERATING_IDEAS',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type ViewMode = 'create' | 'editor' | 'library';
