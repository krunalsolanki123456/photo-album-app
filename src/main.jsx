import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, BookOpen, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Crown,
  FileText, GripVertical, ImagePlus, LayoutGrid, LogOut, Music, Pause, Play,
  Plus, Save, Share2, Trash2, Type, Upload, User, Volume2, VolumeX, Heart, X, ZoomIn, ZoomOut, Move, RotateCcw, Eye, EyeOff, Sparkles,
  Bell, Undo2, Redo2, Maximize2, Edit3, Image as ImageIcon, Sliders, Palette, Sticker, Layers, Search
} from 'lucide-react';
import './styles.css';
import {
  isBackendConfigured,
  deleteAlbumBackend,
  getCurrentBackendUser,
  loadAlbumsBackend,
  loadPublicAlbumBackend,
  publishAlbumBackend,
  removeAlbumMediaBackend,
  saveAlbumsBackend,
  sendPasswordResetBackend,
  signInBackend,
  signOutBackend,
  signUpBackend,
  updatePasswordBackend,
  updatePlanBackend,
  updateProfileBackend,
  uploadAlbumMediaBackend
} from './lib/backend';

const DB_NAME = 'clickflip-photo-album';
const STORE = 'album';
const AUTH_USERS_KEY = 'clickflip_users_v1';
const AUTH_SESSION_KEY = 'clickflip_session_v1';
const REMEMBER_LOGIN_KEY = 'clickflip_saved_login_v1';
const USER_ALBUMS_PREFIX = 'albums_v4:';
const PUBLIC_PREFIX = 'public_album_v1:';

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    duration: '7 Days',
    durationDays: 7,
    price: 0,
    priceLabel: 'Free',
    albums: 1,
    photos: 30,
    pages: 10,
    watermark: true,
    hdDownload: false,
    badge: '7-Day Free Trial',
    description: '1 album, limited photos, watermark preview',
    features: [
      '7 Days duration (Free)',
      '1 album allowed',
      'Limited photos (30 photos)',
      'Watermark preview',
      'Basic page layouts & text'
    ]
  },
  {
    id: 'single',
    name: 'Single Album',
    duration: '30 Days',
    durationDays: 30,
    price: 299,
    priceLabel: '₹299',
    albums: 1,
    photos: 100,
    pages: 30,
    watermark: false,
    hdDownload: true,
    badge: 'Single Event',
    description: '1 album, 100 photos, HD PDF download',
    features: [
      '30 Days duration',
      '1 album allowed',
      '100 photos storage',
      'HD PDF download',
      'No watermark on preview',
      'All 12 wedding layouts'
    ]
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    duration: '3 Months',
    durationDays: 90,
    price: 699,
    priceLabel: '₹699',
    popular: true,
    albums: 5,
    photos: 500,
    pages: 100,
    watermark: false,
    hdDownload: true,
    badge: 'Most Popular',
    description: '5 albums, 500 photos',
    features: [
      '3 Months duration',
      '5 albums allowed',
      '500 photos storage',
      'HD PDF download',
      'Background music & scrapbook themes',
      'Public sharing links'
    ]
  },
  {
    id: 'yearly',
    name: 'Yearly',
    duration: '12 Months',
    durationDays: 365,
    price: 1999,
    priceLabel: '₹1,999',
    popular: false,
    vip: true,
    albums: 20,
    photos: 2000,
    pages: Infinity,
    watermark: false,
    hdDownload: true,
    badge: 'Best Value',
    description: '20 albums, higher storage and priority support',
    features: [
      '12 Months duration',
      '20 albums allowed',
      'Higher storage (2000+ photos)',
      'Unlimited pages & HD PDF',
      '24/7 Priority support',
      'All premium features included'
    ]
  }
];
const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));
// Compatibility aliases for existing sessions:
PLAN_MAP.free = PLAN_MAP.trial;
PLAN_MAP.starter = PLAN_MAP.single;
PLAN_MAP.plus = PLAN_MAP.quarterly;
PLAN_MAP.unlimited = PLAN_MAP.yearly;

const LAYOUTS = [
  // 12 Professional Wedding Album Layouts from Reference:
  { id: 'fullbleed', name: '1. Full Bleed', slots: 1, hint: 'One big photo across the page' },
  { id: 'classic_spread', name: '2. Classic', slots: 3, hint: 'Clean & simple with border' },
  { id: 'modern_minimal', name: '3. Modern Minimal', slots: 2, hint: 'Elegant & airy with space' },
  { id: 'collage_grid', name: '4. Collage Grid', slots: 5, hint: 'Multiple photos in clean grid' },
  { id: 'magazine_style', name: '5. Magazine Style', slots: 3, hint: 'Stylish & trendy editorial' },
  { id: 'storytelling', name: '6. Storytelling', slots: 3, hint: 'Sequence of timeline moments' },
  { id: 'overlapping_frames', name: '7. Overlapping Frames', slots: 3, hint: 'Creative overlapping polaroids' },
  { id: 'bw_mix', name: '8. Black & White Mix', slots: 4, hint: 'Color & B&W mix layout' },
  { id: 'artistic', name: '9. Artistic / Creative', slots: 2, hint: 'Shapes, brush strokes & script' },
  { id: 'panoramic', name: '10. Panoramic', slots: 1, hint: 'Wide panoramic landscape hero' },
  { id: 'photo_text', name: '11. Photo with Text', slots: 1, hint: 'Hero photo + romantic quote card' },
  { id: 'mixed_layout', name: '12. Mixed Layout', slots: 5, hint: 'Combination of different styles' },

  // Standard classic presets:
  { id: 'single', name: 'Single Photo', slots: 1, hint: 'Standard centered' },
  { id: 'split', name: '50 / 50 Split', slots: 2, hint: 'Two equal vertical columns' },
  { id: 'trio', name: 'Hero + 2 Stack', slots: 3, hint: 'Left hero, right two stacked' },
  { id: 'grid4', name: '4 Photos Grid', slots: 4, hint: '2 × 2 even grid' },
  { id: 'collage5', name: '5 Photos Collage', slots: 5, hint: 'Editorial collage' }
];
const LAYOUT_MAP = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

const FONTS = [
  { value: 'Playfair Display', label: 'Playfair Display (Luxury Serif)' },
  { value: 'Dancing Script', label: 'Dancing Script (Romantic Cursive)' },
  { value: 'Alex Brush', label: 'Alex Brush (Royal Calligraphy)' },
  { value: 'DM Sans', label: 'DM Sans (Modern Clean)' },
  { value: 'Georgia', label: 'Georgia (Classic Book)' },
  { value: 'Brush Script MT', label: 'Brush Script (Handwritten)' },
  { value: 'Courier New', label: 'Courier (Typewriter)' }
];

const WEDDING_QUOTE_PRESETS = [
  { title: 'Together Always', text: 'Together Always ♡', font: 'Dancing Script', fontSize: 32, style: 'gold' },
  { title: 'Our Story', text: 'OUR WEDDING STORY\nTwo hearts, One beautiful journey', font: 'Playfair Display', fontSize: 22, style: 'clean' },
  { title: 'Moments That Matter', text: 'Moments that matter ♡', font: 'Alex Brush', fontSize: 34, style: 'clean' },
  { title: 'Story Complete', text: 'You Make My Story Complete ♡', font: 'Dancing Script', fontSize: 28, style: 'gold' },
  { title: 'A Beautiful Chaos', text: 'A Beautiful Chaos ♡', font: 'Alex Brush', fontSize: 34, style: 'clean' },
  { title: 'Forever Together', text: 'To Love, Cherish & Hold\nForever Together', font: 'Playfair Display', fontSize: 22, style: 'clean' }
];

const SCRAPBOOK_THEMES = [
  { id: 'kraft', name: 'Kraft Story', icon: '📜' },
  { id: 'travel', name: 'Travel Diary', icon: '✈️' },
  { id: 'love', name: 'Love Story', icon: '❤' },
  { id: 'birthday', name: 'Celebration', icon: '🎂' },
  { id: 'baby', name: 'Little Moments', icon: '🧸' },
  { id: 'vintage', name: 'Vintage Notes', icon: '📷' }
];
const ALBUM_TEMPLATES = [
  { id: 'wedding', name: 'Wedding (12×36)', eventType: 'Wedding', storyMode: true, theme: 'love', coverStyle: 'photo', icon: '💍', sizeStyle: '12x36', aspectRatio: '3/2', hint: '12×36 Spread · 3:2 Page' },
  { id: 'general', name: 'Classic Album', eventType: 'General', storyMode: false, theme: 'kraft', coverStyle: 'photo', icon: '📖', sizeStyle: '12x36', aspectRatio: '3/2', hint: '3:2 Standard Landscape' },
  { id: 'birthday', name: 'Birthday', eventType: 'Birthday', storyMode: true, theme: 'birthday', coverStyle: 'photo', icon: '🎂', sizeStyle: '12x36', aspectRatio: '3/2' },
  { id: 'baby', name: 'Baby First Year', eventType: 'Baby', storyMode: true, theme: 'baby', coverStyle: 'minimal', icon: '🧸', sizeStyle: '12x36', aspectRatio: '3/2' },
  { id: 'travel', name: 'Travel Story', eventType: 'Travel', storyMode: true, theme: 'travel', coverStyle: 'photo', icon: '✈️', sizeStyle: '12x36', aspectRatio: '3/2' },
  { id: 'family', name: 'Family Heritage', eventType: 'Family', storyMode: true, theme: 'kraft', coverStyle: 'photo', icon: '❤', sizeStyle: '12x36', aspectRatio: '3/2' }
];

const ALBUM_SIZES = [
  {
    id: '12x36',
    name: '12 × 36 inch',
    title: '12 × 36" Wedding Spread',
    spread: '36 × 12" Spread',
    leaf: '18 × 12" Leaf',
    aspectRatio: '3/2',
    ratioValue: 1.5,
    resolution: '1800 × 1200 px (3:2 Leaf)',
    badge: '★ Most Popular Wedding',
    recommended: true,
    hint: 'Karizma & Canvera standard Indian wedding format'
  },
  {
    id: '12x30',
    name: '12 × 30 inch',
    title: '12 × 30" Medium Spread',
    spread: '30 × 12" Spread',
    leaf: '15 × 12" Leaf',
    aspectRatio: '5/4',
    ratioValue: 1.25,
    resolution: '1500 × 1200 px (5:4 Leaf)',
    badge: 'Compact Wedding',
    recommended: false,
    hint: 'Ideal for reception, sangeet & ring ceremony'
  },
  {
    id: '12x12',
    name: '12 × 12 inch',
    title: '12 × 12" Square Book',
    spread: '24 × 12" Spread',
    leaf: '12 × 12" Square',
    aspectRatio: '1/1',
    ratioValue: 1.0,
    resolution: '1200 × 1200 px (1:1 Square)',
    badge: 'Coffee Table Book',
    recommended: false,
    hint: 'Modern square candid & luxury coffee table book'
  },
  {
    id: '10x14',
    name: '10 × 14 inch',
    title: '10 × 14" Classic Landscape',
    spread: '28 × 10" Spread',
    leaf: '14 × 10" Leaf',
    aspectRatio: '7/5',
    ratioValue: 1.4,
    resolution: '1400 × 1000 px (7:5 Leaf)',
    badge: 'Classic Storybook',
    recommended: false,
    hint: 'Pre-wedding, family heritage & portrait albums'
  },
  {
    id: '8x12',
    name: '8 × 12 inch',
    title: '8 × 12" Pocket / Mini',
    spread: '16 × 12" Spread',
    leaf: '12 × 8" Pocket',
    aspectRatio: '3/2',
    ratioValue: 1.5,
    resolution: '1200 × 800 px (3:2 Pocket)',
    badge: 'Mini Gift Book',
    recommended: false,
    hint: 'Gift copy for parents, bridesmaids & travel'
  }
];
const ALBUM_SIZE_MAP = Object.fromEntries(ALBUM_SIZES.map((s) => [s.id, s]));
const SCRAPBOOK_STICKERS = ['✨', '❤', '★', '📍', '🌿', '🎈', '✈️', '📷'];
const FRAME_STYLES = [
  { id: 'polaroid', name: 'Polaroid' },
  { id: 'tape', name: 'Tape' },
  { id: 'torn', name: 'Torn Paper' },
  { id: 'soft', name: 'Soft Frame' }
];

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function dbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const photoAdjust = (photo) => {
  const legacyX = Number(photo?.focusX);
  const legacyY = Number(photo?.focusY);
  const defaultPanX = Number.isFinite(photo?.panX) ? Number(photo.panX) : (Number.isFinite(legacyX) ? (legacyX - 50) : 0);
  const defaultPanY = Number.isFinite(photo?.panY) ? Number(photo.panY) : (Number.isFinite(legacyY) ? (legacyY - 50) : 0);
  return {
    zoom: clamp(Number(photo?.zoom) || 1, 0.3, 3.5),
    panX: clamp(defaultPanX, -150, 150),
    panY: clamp(defaultPanY, -150, 150),
    focusX: clamp(Number.isFinite(legacyX) ? legacyX : 50, 0, 100),
    focusY: clamp(Number.isFinite(legacyY) ? legacyY : 50, 0, 100),
    rotation: ((Number(photo?.rotation) || 0) % 360 + 360) % 360
  };
};
const fileSignature = (file) => `${file.name}::${file.size}::${file.lastModified}`;
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const imageDimensions = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
  img.onerror = () => resolve({ width: 0, height: 0 });
  img.src = src;
});

// Lightweight Ambient Audio Melody Synthesizer using Web Audio API
function generateMelodyWav(notes, sampleRate = 22050, noteDuration = 0.55) {
  const numSamples = Math.floor(sampleRate * noteDuration * notes.length);
  const buffer = new Float32Array(numSamples);
  notes.forEach((freq, noteIdx) => {
    const startSample = Math.floor(noteIdx * noteDuration * sampleRate);
    const endSample = Math.min(numSamples, Math.floor((noteIdx + 1) * noteDuration * sampleRate));
    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / sampleRate;
      const env = Math.exp(-t * 3.8);
      const sample = (Math.sin(2 * Math.PI * freq * t) * 0.7 + Math.sin(4 * Math.PI * freq * t) * 0.3) * env * 0.45;
      buffer[i] = sample;
    }
  });

  const wavHeader = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavHeader);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

let _presetTracksCache = null;
function getPresetAudioTracks() {
  if (_presetTracksCache) return _presetTracksCache;
  try {
    const romanticPiano = generateMelodyWav([261.63, 329.63, 392.00, 493.88, 523.25, 392.00, 329.63, 261.63, 293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 293.66, 261.63]);
    const acousticMemories = generateMelodyWav([329.63, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 329.63, 261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63]);
    const celebrationJoy = generateMelodyWav([523.25, 587.33, 659.25, 783.99, 659.25, 783.99, 880.00, 1046.50, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 523.25, 523.25], 22050, 0.4);
    const sweetLullaby = generateMelodyWav([392.00, 329.63, 261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 293.66, 329.63, 293.66, 261.63], 22050, 0.65);

    _presetTracksCache = [
      { id: 'preset-romantic-piano', name: 'Romantic Piano Harmony', tag: 'Wedding & Love • Gentle Piano', src: romanticPiano },
      { id: 'preset-acoustic-memories', name: 'Acoustic Memories', tag: 'Family & Travel • Warm Guitar', src: acousticMemories },
      { id: 'preset-celebration-joy', name: 'Celebration & Joy', tag: 'Birthday & Party • Upbeat Melody', src: celebrationJoy },
      { id: 'preset-sweet-lullaby', name: 'Peaceful Music Box', tag: 'Baby & Kids • Sweet Chimes', src: sweetLullaby }
    ];
  } catch (err) {
    console.error('Audio presets generation failed:', err);
    _presetTracksCache = [];
  }
  return _presetTracksCache;
}

function readUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); } catch { return []; }
}
function writeUsers(users) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); }
async function hashPassword(value) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(value);
}
function planPrice(plan) {
  if (!plan || plan.price === 0) return 'Free';
  return `₹${plan.price.toLocaleString('en-IN')}`;
}

function blankPage() {
  return {
    id: makeId(), layout: 'fullbleed', slots: [null],
    text: '', font: 'Playfair Display', fontSize: 26, textAlign: 'center', textPosition: 'free', textX: 50, textY: 86,
    textColor: '#2b211a', textStyle: 'clean',
    textBoxes: [],
    musicId: '',
    storyMode: false, scrapbookTheme: 'kraft', frameStyle: 'polaroid',
    storyTitle: '', storyDate: '', storyLocation: '', storyNote: '', stickers: [], scrapbookFrames: {}
  };
}

function normalizeAlbum(album) {
  const sizeObj = ALBUM_SIZE_MAP[album.sizeStyle] || ALBUM_SIZES[0];
  const sizeStyle = album.sizeStyle || sizeObj.id;
  const sizeName = album.sizeName || sizeObj.name;
  const sizeDimensions = album.sizeDimensions || sizeObj.resolution;
  const aspectRatio = album.aspectRatio || sizeObj.aspectRatio;

  const photos = (album.photos || []).map((p) => ({
    ...p,
    id: p.id || makeId(), src: p.src, name: p.name || 'Photo', createdAt: p.createdAt || Date.now(),
    fileKey: p.fileKey || '', originalSize: Number(p.originalSize) || 0, originalType: p.originalType || '', width: Number(p.width) || 0, height: Number(p.height) || 0,
    ...photoAdjust(p)
  }));
  let musicLibrary = Array.isArray(album.musicLibrary) ? album.musicLibrary : [];
  if (album.audio?.src && !musicLibrary.some((m) => m.src === album.audio.src)) {
    musicLibrary = [{ id: makeId(), name: album.audio.name || 'Album Music', src: album.audio.src }, ...musicLibrary];
  }
  const musicId = album.musicId || musicLibrary[0]?.id || '';
  const musicScope = album.musicScope || 'album';
  if (Array.isArray(album.pages) && album.pages.length) {
    return {
      ...album, sizeStyle, sizeName, sizeDimensions, aspectRatio, photos, musicLibrary, musicId, musicScope,
      pages: album.pages.map((p) => {
        const layout = LAYOUT_MAP[p.layout] ? p.layout : 'fullbleed';
        const slots = Array.from({ length: LAYOUT_MAP[layout].slots }, (_, i) => p.slots?.[i] || null);
        let textBoxes = Array.isArray(p.textBoxes) ? p.textBoxes : [];
        if (!textBoxes.length && p.text && p.text.trim()) {
          textBoxes = [{
            id: makeId(),
            text: p.text,
            x: clamp(Number(p.textX) || 50, 4, 96),
            y: clamp(Number(p.textY) || 86, 4, 96),
            font: p.font || 'Playfair Display',
            fontSize: Number(p.fontSize) || 26,
            textAlign: p.textAlign || 'center',
            color: p.textColor || '#2b211a',
            style: p.textStyle || 'clean'
          }];
        }
        return {
          ...blankPage(), ...p, id: p.id || makeId(), layout, slots, textBoxes,
          musicId: p.musicId || (musicScope === 'album' ? musicId : ''),
          text: p.text || (textBoxes[0]?.text || ''),
          textPosition: 'free',
          textX: clamp(Number.isFinite(Number(p.textX)) ? Number(p.textX) : 50, 4, 96),
          textY: clamp(Number.isFinite(Number(p.textY)) ? Number(p.textY) : 86, 4, 96),
          scrapbookFrames: p.scrapbookFrames && typeof p.scrapbookFrames === 'object' ? p.scrapbookFrames : {}
        };
      })
    };
  }
  const legacyCount = Math.max(1, Number(album.layout) || 1);
  const legacyLayout = legacyCount === 4 ? 'grid4' : legacyCount === 2 ? 'split' : 'single';
  const slotCount = LAYOUT_MAP[legacyLayout].slots;
  const pages = [];
  for (let i = 0; i < photos.length; i += slotCount) {
    pages.push({ ...blankPage(), layout: legacyLayout, musicId, slots: photos.slice(i, i + slotCount).map((p) => p.id) });
  }
  if (!pages.length) pages.push({ ...blankPage(), musicId });
  return { ...album, sizeStyle, sizeName, sizeDimensions, aspectRatio, photos, pages, musicLibrary, musicId, musicScope, cover: album.cover || photos[0]?.src || '', shareSlug: album.shareSlug || '' };
}


function LandingPage({ onLogin, onRegister }) {
  const [activeNav, setActiveNav] = useState('flip-home');
  const [occasionIndex, setOccasionIndex] = useState(0);
  const [occasionVisible, setOccasionVisible] = useState(() => window.innerWidth <= 480 ? 1 : window.innerWidth <= 760 ? 2 : 4);
  const [billingView, setBillingView] = useState('monthly');

  const scrollTo = (id) => {
    setActiveNav(id);
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 78;
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);
      const sectionIds = ['flip-home', 'flip-templates', 'flip-features', 'flip-about', 'flip-pricing', 'flip-explore'];
      const headerOffset = 110;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && scrollY >= el.offsetTop - headerOffset) {
          setActiveNav(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateVisible = () => {
      const nextVisible = window.innerWidth <= 480 ? 1 : window.innerWidth <= 760 ? 2 : 4;
      setOccasionVisible(nextVisible);
      setOccasionIndex((v) => Math.min(v, 8 - nextVisible));
    };
    window.addEventListener('resize', updateVisible, { passive: true });
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  const occasionCards = [
    { title: 'Wedding', icon: '💍', image: '/assets/landing/story-wedding.jpg' },
    { title: 'Birthday', icon: '🎂', image: '/assets/landing/story-birthday.jpg' },
    { title: 'Baby', icon: '🧸', image: '/assets/landing/story-baby.jpg' },
    { title: 'Family', icon: '👨‍👩‍👧', image: '/assets/landing/story-family.jpg' },
    { title: 'Travel', icon: '✈️', image: '/assets/landing/template-travel.jpg' },
    { title: 'Festival', icon: '🪔', image: '/assets/landing/template-festive.jpg' },
    { title: 'School', icon: '🎒', image: '/assets/landing/template-kids.jpg' },
    { title: 'Love', icon: '❤', image: '/assets/landing/template-love.jpg' }
  ];

  const occasionMax = Math.max(0, occasionCards.length - occasionVisible);
  const nextOccasion = () => setOccasionIndex((v) => v >= occasionMax ? 0 : v + 1);
  const prevOccasion = () => setOccasionIndex((v) => v <= 0 ? occasionMax : v - 1);

  const pricingDisplay = [
    { ...PLANS[0], displayName: 'Free', sub: 'For casual users', button: 'Get Started', priceText: '₹0' },
    { ...PLANS[1], displayName: 'Starter', sub: 'For personal use', button: 'Choose Plan', priceText: '₹299', suffix: '/album' },
    { ...PLANS[2], displayName: 'Standard', sub: 'For most users', button: 'Choose Plan', priceText: '₹699', suffix: '/album' },
    { ...PLANS[3], displayName: 'Premium', sub: 'For special moments', button: 'Choose Plan', priceText: '₹1,999', suffix: '/album' }
  ];

  return <main className="lp-page">
    <header className={`lp-header ${isScrolled ? 'lp-header-scrolled' : 'lp-header-integrated'}`}>
      <div className="lp-nav-wrap">
        <button className="lp-logo" onClick={() => scrollTo('flip-home')} aria-label="Flipora home">
          <img src="/assets/brand/flipora-logo.png" alt="Flipora" />
        </button>
        <nav className="lp-nav-links">
          <button className={activeNav === 'flip-home' ? 'active' : ''} onClick={() => scrollTo('flip-home')}>Home</button>
          <button className={activeNav === 'flip-features' ? 'active' : ''} onClick={() => scrollTo('flip-features')}>Features</button>
          <button className={activeNav === 'flip-templates' ? 'active' : ''} onClick={() => scrollTo('flip-templates')}>Templates</button>
          <button className={activeNav === 'flip-pricing' ? 'active' : ''} onClick={() => scrollTo('flip-pricing')}>Pricing</button>
          <button className={activeNav === 'flip-explore' ? 'active' : ''} onClick={() => scrollTo('flip-explore')}>Explore</button>
          <button className={activeNav === 'flip-about' ? 'active' : ''} onClick={() => scrollTo('flip-about')}>About</button>
        </nav>
        <div className="lp-nav-actions">
          <button className="lp-search" aria-label="Search">⌕</button>
          <button className="lp-login" onClick={onLogin}>Login</button>
          <button className="lp-cta" onClick={() => onRegister('trial')}>Get Started</button>
        </div>
      </div>
    </header>

    <div className="lp-hero-unified-wrapper">
      <section id="flip-home" className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-kicker">TURN MOMENTS INTO MEMORIES</div>
            <h1>Beautiful <span>Photo Albums</span> Made Easy</h1>
            <p>Create stunning digital albums with the feel of a real photo book.<br />Add photos, text, music and beautiful layouts — all in minutes.</p>
            <div className="lp-hero-buttons">
              <button className="lp-main-btn" onClick={() => onRegister('trial')}>Start Creating Free <ChevronRight size={17} /></button>
              <button className="lp-watch-btn" onClick={() => scrollTo('flip-features')}><i><Play size={13} fill="currentColor" /></i> Watch Video</button>
            </div>
            <div className="lp-trust-line"><span>✓ No design skills required</span><span>✓ Works on all devices</span><span>✓ Beautiful templates</span></div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-leaf lp-leaf-a"></div><div className="lp-leaf lp-leaf-b"></div>
            <div className="lp-hero-book"><img src="/assets/landing/hero-album.jpg" alt="Flipora family photo album" /></div>
            <div className="lp-sticky">Collect<br />Create<br />Share<br />Forever ♡</div>
            <div className="lp-camera-deco">◉</div>
          </div>
        </div>
      </section>
    </div>

    <section className="lp-metrics-strip">
      <div className="lp-metrics-wrap">
        <div className="lp-metric-item">
          <div className="lp-metric-icon"><Sparkles size={22} /></div>
          <div>
            <b>Instant 3D Page Flip</b>
            <small>Feels just like turning pages of a real paper book</small>
          </div>
        </div>
        <div className="lp-metric-divider" />
        <div className="lp-metric-item">
          <div className="lp-metric-icon"><Music size={22} /></div>
          <div>
            <b>Background Music & Audio</b>
            <small>Add soulful songs matching your precious moments</small>
          </div>
        </div>
        <div className="lp-metric-divider" />
        <div className="lp-metric-item">
          <div className="lp-metric-icon"><Heart size={22} /></div>
          <div>
            <b>Loved by 10,000+ Families</b>
            <small>★★★★★ 4.9/5 rated digital keepsake platform</small>
          </div>
        </div>
      </div>
    </section>

    <section id="flip-templates" className="lp-section lp-occasion-section">
      <div className="lp-section-head"><h2>Create for Every Occasion</h2><div className="lp-slider-actions"><button onClick={prevOccasion} aria-label="Previous"><ChevronLeft size={19} /></button><button onClick={nextOccasion} aria-label="Next"><ChevronRight size={19} /></button></div></div>
      <div className="lp-occasion-viewport">
        <div className="lp-occasion-track" style={{ transform: `translateX(-${occasionIndex * (100 / occasionVisible)}%)` }}>
          {occasionCards.map((a) => <button className="lp-occasion-card" key={a.title} onClick={() => onRegister('trial')}>
            <img src={a.image} alt={a.title} /><div><span>{a.icon}</span><b>{a.title}</b></div>
          </button>)}
        </div>
      </div>
      <div className="lp-slider-dots">{Array.from({ length: occasionMax + 1 }).map((_, i) => <button key={i} className={i === occasionIndex ? 'active' : ''} onClick={() => setOccasionIndex(i)} aria-label={`Slide ${i + 1}`} />)}</div>
    </section>

    <section id="flip-features" className="lp-why-wrap">
      <div className="lp-why">
        <div className="lp-why-art">
          <div className="lp-album-stage">
            <div className="lp-album-casing">
              <div className="lp-album-sheet">
                <div className="lp-sheet-half left">
                  <div className="lp-frame-polaroid">
                    <img src="/assets/landing/public-family.jpg" alt="Family moments" />
                    <span>Together Always ♡</span>
                    <i className="tape-corner"></i>
                  </div>
                  <div className="lp-sheet-script">Not just an album, it’s your story ♡</div>
                </div>
                <div className="lp-sheet-spine"></div>
                <div className="lp-sheet-half right">
                  <div className="lp-dual-grid">
                    <div className="lp-mini-photo">
                      <img src="/assets/landing/story-birthday.jpg" alt="Birthday joy" />
                      <i className="washi-tape"></i>
                    </div>
                    <div className="lp-mini-photo">
                      <img src="/assets/landing/public-college.jpg" alt="Memories" />
                      <i className="washi-tape"></i>
                    </div>
                  </div>
                  <div className="lp-sheet-note">Good Times Live Forever ★</div>
                </div>
              </div>
            </div>
            <div className="lp-album-badge top">
              <BookOpen size={16} />
              <span>Realistic 3D Flip</span>
            </div>
            <div className="lp-album-badge bottom">
              <Music size={16} />
              <span>Music & Sound FX</span>
            </div>
            <div className="lp-album-heart">♡</div>
          </div>
        </div>
        <div className="lp-why-copy">
          <h2>Why Choose Flipora?</h2>
          <p className="lp-why-subtitle">Everything you need to turn cherished moments into breathtaking digital photo books.</p>
          <div className="lp-feature-grid">
            <article><i className="pink"><LayoutGrid size={20} /></i><div><b>Beautiful Templates</b><span>Professional designs for every occasion</span></div></article>
            <article><i className="mint"><BookOpen size={20} /></i><div><b>Realistic Page Flip</b><span>Feel like a real photo book</span></div></article>
            <article><i className="blue"><Music size={20} /></i><div><b>Add Music & Text</b><span>Make your memories come alive</span></div></article>
            <article><i className="lav"><Share2 size={20} /></i><div><b>Share with Anyone</b><span>Share a link with friends & family</span></div></article>
            <article><i className="peach"><Move size={20} /></i><div><b>Easy Drag & Drop</b><span>Simple and fun to use</span></div></article>
            <article><i className="sky"><Eye size={20} /></i><div><b>Works on All Devices</b><span>Create anywhere, anytime</span></div></article>
          </div>
          <div className="lp-why-footer">
            <button className="lp-dark-btn" onClick={() => onRegister('trial')}>Start Creating Now <ChevronRight size={17} /></button>
            <div className="lp-script-small">Preserve<br />What Matters ♡</div>
          </div>
        </div>
      </div>
    </section>

    <section id="flip-about" className="lp-premium-wrap">
      <div className="lp-premium-banner">
        <div className="lp-premium-copy"><span>NEW</span><h2>Premium Scrapbook Templates</h2><p>Give your memories a creative touch with our new scrapbook collection.</p><button onClick={() => scrollTo('flip-templates')}>Explore Templates <ChevronRight size={16} /></button></div>
        <div className="lp-premium-image"><img src="/assets/landing/scrapbook-feature.jpg" alt="Premium scrapbook template" /><div className="lp-premium-note">Collect<br />Moments<br />Not Things ♡</div><div className="lp-camera">◉</div></div>
      </div>
    </section>

    <section id="flip-pricing" className="lp-section lp-pricing-section">
      <div className="lp-pricing-head"><h2>Simple Plans for Everyone</h2><div className="lp-billing-toggle"><button className={billingView === 'monthly' ? 'active' : ''} onClick={() => setBillingView('monthly')}>Monthly</button><button className={billingView === 'yearly' ? 'active' : ''} onClick={() => setBillingView('yearly')}>Yearly <small>Save 50%</small></button></div></div>
      <div className="lp-price-layout">
        <div className="lp-price-grid-new">
          {pricingDisplay.map((p) => <article className={`lp-price-card-new ${p.popular ? 'popular' : ''}`} key={p.id}>
            {p.popular && <span className="lp-popular">Popular</span>}
            <h3>{p.displayName}</h3><small>{p.sub}</small><div className="lp-price-main">{p.priceText}<em>{p.suffix || ''}</em></div>
            <ul>{p.features.slice(0, 5).map((f) => <li key={f}><Check size={13} />{f}</li>)}</ul>
            <button className={p.popular ? 'accent' : ''} onClick={() => onRegister(p.id)}>{p.button}</button>
          </article>)}
        </div>
        <aside className="lp-price-photo"><div className="lp-price-script">Make it<br />Memorable ♡</div><div className="lp-photo-frame"><img src="/assets/landing/pricing-girl.jpg" alt="Memory maker" /></div><div className="lp-twig">⌁</div></aside>
      </div>
    </section>

    <section id="flip-explore" className="lp-section lp-reviews">
      <div className="lp-section-head"><h2>What Our Users Say</h2><div className="lp-review-arrows"><button><ChevronLeft size={17} /></button><button><ChevronRight size={17} /></button></div></div>
      <div className="lp-review-grid">
        <article><div className="lp-review-user"><img src="/assets/landing/public-wedding.jpg" /><div><b>Priya Mehta</b><span>★★★★★</span></div></div><p>“Flipora made it so easy to create my daughter’s birthday album. The templates are beautiful!”</p></article>
        <article><div className="lp-review-user"><img src="/assets/landing/public-family.jpg" /><div><b>Rahul Shah</b><span>★★★★★</span></div></div><p>“Loved the page flip effect and music feature. It feels like a real album.”</p></article>
        <article><div className="lp-review-user"><img src="/assets/landing/public-birthday.jpg" /><div><b>Neha Patel</b><span>★★★★★</span></div></div><p>“Simple, elegant and so much fun to use. Highly recommended!”</p></article>
      </div>
    </section>

    <footer className="lp-footer">
      <div className="lp-footer-inner"><div className="lp-footer-brand"><img src="/assets/brand/flipora-logo.png" alt="Flipora" /><small>Your Memories, Our Magic</small></div><nav><button onClick={() => scrollTo('flip-home')}>Home</button><button onClick={() => scrollTo('flip-features')}>Features</button><button onClick={() => scrollTo('flip-templates')}>Templates</button><button onClick={() => scrollTo('flip-pricing')}>Pricing</button><button onClick={() => scrollTo('flip-about')}>About</button><button>Contact</button></nav><div className="lp-social"><span>◎</span><span>▶</span><span>f</span><span>p</span></div></div>
      <div className="lp-footer-copy">© 2026 Flipora. All rights reserved.</div>
    </footer>
  </main>;
}

function AuthScreen({ onAuthenticated, initialMode = 'login', initialPlan = 'free', resetToken = '', onRecoveryComplete, onBack }) {
  const savedLogin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null'); } catch { return null; }
  }, []);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(savedLogin?.email || '');
  const [password, setPassword] = useState(isBackendConfigured ? '' : (savedLogin?.password || ''));
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(Boolean(savedLogin?.email));
  const [plan, setPlan] = useState(initialPlan);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const resetMessages = () => { setError(''); setMessage(''); };

  const submit = async (e) => {
    e.preventDefault(); resetMessages(); setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isBackendConfigured) {
        if (mode === 'forgot') {
          if (!cleanEmail) throw new Error('Please enter your email.');
          const result = await sendPasswordResetBackend(cleanEmail);
          if (result?.debugResetUrl) setMessage(`Development reset link: ${result.debugResetUrl}`);
          else setMessage(result?.message || 'Password reset link has been sent to your email. Open the link to set a new password.');
          return;
        }
        if (mode === 'recovery') {
          if (password.length < 6) throw new Error('New password must be at least 6 characters.');
          if (password !== confirm) throw new Error('Passwords do not match.');
          if (!resetToken) throw new Error('Reset link is invalid. Please request a new link from Forgot Password.');
          await updatePasswordBackend(password, resetToken);
          await signOutBackend().catch(() => { });
          setPassword(''); setConfirm(''); setMode('login');
          setMessage('Password updated successfully. Please log in with your new password.');
          onRecoveryComplete?.();
          return;
        }
        if (!cleanEmail || !password) throw new Error('Please enter your email and password.');
        if (mode === 'login') {
          const user = await signInBackend(cleanEmail, password);
          if (rememberLogin) localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ email: cleanEmail }));
          else localStorage.removeItem(REMEMBER_LOGIN_KEY);
          onAuthenticated(user);
          return;
        }
        if (!name.trim()) throw new Error('Please enter your name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        const result = await signUpBackend({ name: name.trim(), email: cleanEmail, password, plan });
        if (result.emailConfirmationRequired) {
          setMode('login'); setPassword(''); setConfirm('');
          setMessage('Account created successfully. Please check your confirmation email to verify, then log in.');
          return;
        }
        onAuthenticated(result.user);
        return;
      }

      // Local prototype fallback when VITE_LOCAL_ONLY=true.
      if (!cleanEmail || !password) throw new Error('Please enter your email and password.');
      const users = readUsers();
      if (mode === 'forgot') {
        if (password.length < 6) throw new Error('New password must be at least 6 characters.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        const index = users.findIndex((u) => u.email === cleanEmail);
        if (index < 0) throw new Error('No account found with this email.');
        const passwordHash = await hashPassword(password);
        const next = [...users]; next[index] = { ...next[index], passwordHash, passwordUpdatedAt: Date.now() };
        writeUsers(next); setMode('login'); setPassword(''); setConfirm(''); setShowPassword(false); setShowConfirm(false);
        setMessage('Password reset successfully. Please log in with your new password.');
        return;
      }
      const passwordHash = await hashPassword(password);
      if (mode === 'login') {
        const found = users.find((u) => u.email === cleanEmail && u.passwordHash === passwordHash);
        if (!found) throw new Error('Incorrect email or password.');
        if (rememberLogin) localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ email: cleanEmail, password }));
        else localStorage.removeItem(REMEMBER_LOGIN_KEY);
        onAuthenticated(found); return;
      }
      if (!name.trim()) throw new Error('Please enter your name.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      if (password !== confirm) throw new Error('Passwords do not match.');
      if (users.some((u) => u.email === cleanEmail)) throw new Error('An account is already registered with this email.');
      const user = { id: makeId(), name: name.trim(), email: cleanEmail, passwordHash, plan, createdAt: Date.now() };
      writeUsers([...users, user]); onAuthenticated(user);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  const title = mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : mode === 'recovery' ? 'Choose a new password' : 'Create your account';
  const subtitle = mode === 'login'
    ? 'Continue creating your albums.'
    : mode === 'forgot'
      ? (isBackendConfigured ? 'Enter your registered email. We will send you a secure reset link.' : 'Enter your registered email and choose a new password.')
      : mode === 'recovery'
        ? 'Enter and confirm your new password.'
        : 'Choose a plan and start designing.';
  const showNameField = mode === 'register';
  const showPasswordField = !(isBackendConfigured && mode === 'forgot');
  const showConfirmField = mode === 'register' || mode === 'recovery' || (!isBackendConfigured && mode === 'forgot');
  const buttonLabel = mode === 'login' ? 'Log In' : mode === 'forgot' ? (isBackendConfigured ? 'Send Reset Link' : 'Reset Password') : mode === 'recovery' ? 'Update Password' : 'Create Account';

  return <div className="auth-page-wrapper">
    <main className="auth-page">
      <section className="auth-visual">
        <div className="logo"><img src="/assets/brand/flipora-logo.png" alt="Flipora" className="brand-logo-img auth-logo" /></div>
        <div className="auth-copy">
          <div className="auth-top-badges">
            <small className="auth-kicker">YOUR MEMORIES, BEAUTIFULLY TOLD</small>
            <span className="auth-rating-badge">★ 4.9/5 by 10,000+ Families</span>
          </div>
          <div className="cf-hand-note auth-hand-note">More than Photos <span>♡</span> It&apos;s your Story <span>♡</span></div>
          <h1>Create photo albums that feel handcrafted.</h1>
          <p>Upload your memories once. Design every page yourself with collages, text and music, then share the finished album.</p>
        </div>
        <div className="auth-hero-visual">
          <div className="auth-hero-image-wrap">
            <img src="/assets/landing/hero-album.jpg" alt="Flipora handcrafted photo album" className="auth-hero-img" />
            <div className="auth-polaroid-peek">
              <img src="/assets/landing/public-wedding.jpg" alt="Real memories preview" />
              <span>Forever ♡</span>
            </div>
            <div className="auth-review-bubble">
              <div className="auth-bubble-stars">★★★★★</div>
              <p>&ldquo;Felt just like holding our real wedding album!&rdquo;</p>
              <small>— Priya &amp; Rohan M.</small>
            </div>
          </div>
          <div className="auth-trust-strip">
            <span><Check size={16} /> Realistic Page Flip</span>
            <span><Check size={16} /> Background Music</span>
            <span><Check size={16} /> Instant Share Link</span>
          </div>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          {onBack && <button type="button" className="auth-back-home" onClick={onBack}><ArrowLeft size={15} /> Back to Home</button>}
          <div className="auth-mobile-preview">
            <img src="/assets/landing/hero-album.jpg" alt="Flipora album preview" />
            <span className="auth-mobile-note">Collect • Create • Cherish ♡</span>
          </div>
          {mode !== 'recovery' && <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); resetMessages() }}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); resetMessages() }}>Register</button>
          </div>}
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <form onSubmit={submit}>
            {mode === 'register' && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus required /></label>}
            {mode !== 'recovery' && <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>}
            {showPasswordField && <label>{mode === 'recovery' ? 'New Password' : 'Password'}
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>}
            {mode === 'login' && <label className="remember-login">
              <input type="checkbox" checked={rememberLogin} onChange={(e) => {
                const checked = e.target.checked; setRememberLogin(checked);
                if (!checked) localStorage.removeItem(REMEMBER_LOGIN_KEY);
              }} />
              <span><b>{isBackendConfigured ? 'Remember email' : 'Save ID & Password'}</b><small>Only on this browser</small></span>
            </label>}
            {showConfirmField && <>
              <label>Confirm password
                <div className="password-field">
                  <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} title={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {mode === 'register' && <>
                <div className="register-plan-header">
                  <span className="register-plan-title">Choose your plan</span>
                  <span className="register-plan-sub">Cancel or switch anytime</span>
                </div>
                <div className="register-plans">
                  {PLANS.map((p) => {
                    const isSel = plan === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        className={`register-plan-card ${isSel ? 'selected' : ''} ${p.popular ? 'is-popular' : ''}`}
                        onClick={() => setPlan(p.id)}
                      >
                        {p.popular && <div className="plan-badge-pill popular">★ Popular</div>}
                        {p.vip && <div className="plan-badge-pill vip"><Crown size={12} /> Best Value</div>}
                        <div className="rpc-top">
                          <div className="rpc-radio">
                            <span className="rpc-radio-dot" />
                          </div>
                          <div className="rpc-main">
                            <div className="rpc-name-row">
                              <span className="rpc-name">{p.name}</span>
                              <span className="rpc-duration">{p.duration}</span>
                            </div>
                            <div className="rpc-specs">
                              <span>{p.albums} {p.albums > 1 ? 'Albums' : 'Album'}</span>
                              <span className="rpc-bullet">•</span>
                              <span>{p.photos} Photos</span>
                            </div>
                          </div>
                          <div className="rpc-price-wrap">
                            <span className="rpc-price">{planPrice(p)}</span>
                            <span className="rpc-sub">{p.price === 0 ? 'Forever' : 'Total'}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>}
            </>}
            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}
            {mode === 'login' && <button type="button" className="forgot-link" onClick={() => { setMode('forgot'); resetMessages(); setPassword(''); setConfirm('') }}>Forgot password?</button>}
            <button className="primary wide" disabled={busy}>{busy ? 'Please wait...' : buttonLabel}</button>
            {(mode === 'forgot' || mode === 'recovery') && <button type="button" className="auth-inline-back" onClick={() => { setMode('login'); resetMessages() }}>Back to Login</button>}
          </form>
        </div>
      </section>
    </main>
  </div>;
}

function App() {
  const initialResetToken = location.hash.startsWith('#/reset/') ? decodeURIComponent(location.hash.replace('#/reset/', '')) : '';
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch { return null; }
  });
  const [authReady, setAuthReady] = useState(false);
  const [publicView, setPublicView] = useState(initialResetToken ? 'recovery' : 'home');
  const [authPlan, setAuthPlan] = useState('trial');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [shareSlug, setShareSlug] = useState(() => location.hash.startsWith('#/share/') ? location.hash.replace('#/share/', '') : '');

  useEffect(() => {
    const h = () => {
      const hash = location.hash || '';
      const shared = hash.startsWith('#/share/') ? hash.replace('#/share/', '') : '';
      const reset = hash.startsWith('#/reset/') ? decodeURIComponent(hash.replace('#/reset/', '')) : '';
      setShareSlug(shared);
      setResetToken(reset);
      if (reset) {
        setSession(null);
        setPublicView('recovery');
        setAuthReady(true);
      } else if (hash === '#/login') {
        setPublicView('login');
      } else if (hash.startsWith('#/register')) {
        const parts = hash.split('/');
        if (parts[2]) setAuthPlan(parts[2]);
        setPublicView('register');
      } else if (!shared && (hash === '' || hash === '#/' || hash === '#/home')) {
        setPublicView('home');
      }
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  useEffect(() => {
    let active = true;
    const safetyTimer = setTimeout(() => {
      if (active) setAuthReady(true);
    }, 1500);

    (async () => {
      try {
        if (isBackendConfigured) {
          const user = await getCurrentBackendUser();
          if (active && !resetToken && user) {
            setSession(user);
          }
        }
      } catch (err) {
        console.warn('Backend session restore skipped or failed, using local session:', err);
      } finally {
        clearTimeout(safetyTimer);
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [resetToken]);

  if (shareSlug) return <PublicShareView slug={shareSlug} onExit={() => { location.hash = ''; setShareSlug('') }} />;
  if (!authReady) return <div className="loading">Connecting Flipora…</div>;

  const onAuthenticated = (user) => {
    if (!isBackendConfigured) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    setSession(user);
    location.hash = '';
  };
  const logout = async () => {
    if (isBackendConfigured) await signOutBackend().catch(console.error);
    else localStorage.removeItem(AUTH_SESSION_KEY);
    setSession(null); setPublicView('home');
    location.hash = '';
  };
  const changePlan = async (planId) => {
    let updated;
    if (isBackendConfigured) {
      const backendUser = await updatePlanBackend(session.id, planId);
      updated = backendUser || { ...session, plan: planId };
    } else {
      const users = readUsers().map((u) => u.id === session.id ? { ...u, plan: planId } : u); writeUsers(users);
      updated = { ...session, plan: planId };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));
    }
    setSession(updated);
  };
  const openAuth = (mode, planId = 'trial') => {
    setAuthPlan(planId);
    setPublicView(mode);
    location.hash = mode === 'register' ? `#/register/${planId}` : `#/login`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const recoveryComplete = () => {
    if (location.hash.startsWith('#/reset/')) history.replaceState(null, '', `${location.pathname}${location.search}`);
    setResetToken('');
    setPublicView('login');
  };

  if (session && !resetToken) return <Workspace
    user={session}
    onLogout={logout}
    onPlanChange={changePlan}
    onUserUpdate={(updated) => {
      if (!updated) return;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));
      setSession(updated);
    }}
  />;
  if (publicView === 'home') return <LandingPage onLogin={() => openAuth('login')} onRegister={(planId) => openAuth('register', planId)} />;
  return <AuthScreen
    key={`${publicView}-${authPlan}-${resetToken ? 'reset' : 'normal'}`}
    initialMode={publicView}
    initialPlan={authPlan}
    resetToken={resetToken}
    onRecoveryComplete={recoveryComplete}
    onAuthenticated={onAuthenticated}
    onBack={() => { location.hash = ''; setPublicView('home'); }}
  />;
}

function Workspace({ user, onLogout, onPlanChange, onUserUpdate }) {
  const [albums, setAlbums] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [screen, setScreen] = useState('dashboard');
  const [editorPage, setEditorPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, done: 0, skipped: 0 });
  const [failedUploads, setFailedUploads] = useState([]);
  const [photoSearch, setPhotoSearch] = useState('');
  const [newEventType, setNewEventType] = useState('Wedding');
  const [newCoverStyle, setNewCoverStyle] = useState('photo');
  const [newTemplate, setNewTemplate] = useState('wedding');
  const [newSize, setNewSize] = useState('12x36');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const historyRef = useRef({ past: [], future: [], lastAt: 0 });
  const inputPhotosRef = useRef(null);

  const storageKey = `${USER_ALBUMS_PREFIX}${user.id}`;
  const activePlan = PLAN_MAP[user.plan] || PLAN_MAP.free;

  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = [];
      let backendFailed = false;
      if (isBackendConfigured) {
        try {
          saved = await loadAlbumsBackend(user.id);
        } catch (err) {
          backendFailed = true;
          console.error('Backend album load failed:', err);
          setNotice('Unable to connect to backend. Loaded from local storage.');
        }
      }
      if (!saved?.length) {
        saved = await dbGet(storageKey);
        if (!saved && !isBackendConfigured) {
          const older = await dbGet(`albums_v2:${user.id}`) || await dbGet('albums_v2');
          saved = Array.isArray(older) && older.length ? older : [];
        }
      }
      if (!saved?.length) {
        saved = [];
      }
      if (cancelled) return;
      const normalized = saved.map(normalizeAlbum);
      setAlbums(normalized);
      setActiveId(normalized[0]?.id || '');
      setLoaded(true);
      if (backendFailed) window.setTimeout(() => setNotice(''), 4200);
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [storageKey, user.id]);

  useEffect(() => {
    if (!loaded) return undefined;
    dbSet(storageKey, albums).catch(console.error);
    if (!isBackendConfigured) return undefined;
    const timer = window.setTimeout(() => {
      saveAlbumsBackend(user.id, albums).catch((err) => {
        console.error('Backend autosave failed:', err);
        setNotice('Cloud autosave failed. Local copy safe hai.');
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [albums, loaded, storageKey, user.id]);

  const currentAlbum = useMemo(() => albums.find((a) => a.id === activeId) || albums[0] || null, [albums, activeId]);
  const usedPages = useMemo(() => albums.reduce((sum, a) => sum + (a.pages?.length || 0), 0), [albums]);
  const remainingPages = activePlan.pages === Infinity ? Infinity : Math.max(0, activePlan.pages - usedPages);

  const snapshotEditorState = () => currentAlbum ? {
    albumId: currentAlbum.id,
    pages: structuredClone(currentAlbum.pages),
    photos: structuredClone(currentAlbum.photos),
    photoAdjustments: currentAlbum.photos.map((p) => ({ id: p.id, ...photoAdjust(p) })),
    cover: currentAlbum.cover,
    coverStyle: currentAlbum.coverStyle,
    eventType: currentAlbum.eventType
  } : null;
  const recordHistory = (force = false) => {
    const snap = snapshotEditorState(); if (!snap) return;
    const now = Date.now(); if (!force && now - historyRef.current.lastAt < 350) return;
    historyRef.current.past.push(snap); if (historyRef.current.past.length > 40) historyRef.current.past.shift();
    historyRef.current.future = []; historyRef.current.lastAt = now;
  };
  const restoreSnapshot = (snap) => {
    if (!snap) return;
    setAlbums((prev) => prev.map((a) => a.id !== snap.albumId ? a : {
      ...a,
      pages: structuredClone(snap.pages),
      photos: snap.photos ? structuredClone(snap.photos) : a.photos.map((p) => { const ad = snap.photoAdjustments?.find((x) => x.id === p.id); return ad ? { ...p, ...ad } : p; }),
      cover: snap.cover,
      coverStyle: snap.coverStyle,
      eventType: snap.eventType
    }));
  };
  const undo = () => { const h = historyRef.current; const snap = h.past.pop(); if (!snap || !currentAlbum) return; h.future.push(snapshotEditorState()); restoreSnapshot(snap); setEditorPage((i) => Math.min(i, snap.pages.length - 1)); setToast('Undo applied.'); };
  const redo = () => { const h = historyRef.current; const snap = h.future.pop(); if (!snap || !currentAlbum) return; h.past.push(snapshotEditorState()); restoreSnapshot(snap); setEditorPage((i) => Math.min(i, snap.pages.length - 1)); setToast('Redo applied.'); };
  const updateAlbum = (updater, record = false) => { if (record) recordHistory(); setAlbums((prev) => prev.map((a) => a.id !== activeId ? a : (typeof updater === 'function' ? updater(a) : { ...a, ...updater }))); };
  const setToast = (msg) => { setNotice(msg); window.clearTimeout(window.__cfToast); window.__cfToast = setTimeout(() => setNotice(''), 3200); };
  const saveNow = async () => {
    await dbSet(storageKey, albums);
    if (isBackendConfigured) await saveAlbumsBackend(user.id, albums);
    setToast(isBackendConfigured ? 'Album saved to cloud.' : 'Album manually saved.');
  };

  const saveProfileName = async (name) => {
    const clean = String(name || '').trim();
    if (!clean) throw new Error('Name is required.');
    let updated = { ...user, name: clean };
    if (isBackendConfigured) {
      updated = await updateProfileBackend({ name: clean });
    } else {
      const users = readUsers().map((u) => u.id === user.id ? { ...u, name: clean } : u);
      writeUsers(users);
    }
    onUserUpdate?.(updated);
    setToast('Profile updated.');
    return updated;
  };

  const startCreateFlow = (target = 'create') => {
    if (activePlan.albums && albums.length >= activePlan.albums) {
      setPlanOpen(true);
      setToast(`Your ${activePlan.name} plan allows up to ${activePlan.albums} album(s). Please upgrade your plan.`);
      return;
    }
    setNewTitle('');
    setNewSubtitle('');
    setNewEventType('Birthday');
    setNewCoverStyle('photo');
    setNewTemplate('birthday');
    setNewSize('12x36');
    setScreen(target);
  };

  const createAlbum = (targetScreen = 'editor') => {
    if (activePlan.albums && albums.length >= activePlan.albums) {
      setPlanOpen(true);
      setToast(`Your ${activePlan.name} plan allows up to ${activePlan.albums} album(s). Please upgrade your plan.`);
      return;
    }
    if (activePlan.pages !== Infinity && usedPages >= activePlan.pages) { setPlanOpen(true); setToast('Page limit complete. Upgrade plan to create another page.'); return; }
    const preset = ALBUM_TEMPLATES.find((t) => t.id === newTemplate) || ALBUM_TEMPLATES[0];
    const sizeObj = ALBUM_SIZE_MAP[newSize] || ALBUM_SIZES[0];
    const firstPage = { ...blankPage(), storyMode: preset.storyMode, scrapbookTheme: preset.theme, storyTitle: newTitle.trim() || '' };
    const defaultTitle = preset.id === 'wedding' ? `Wedding Album ${albums.length + 1}` : `My Album ${albums.length + 1}`;
    const defaultSubtitle = preset.id === 'wedding' ? `Our ${sizeObj.name} Wedding Story` : 'A beautiful memory book';
    const album = normalizeAlbum({
      id: makeId(),
      title: newTitle.trim() || defaultTitle,
      subtitle: newSubtitle.trim() || defaultSubtitle,
      eventType: newEventType || preset.eventType,
      templateId: preset.id,
      sizeStyle: sizeObj.id,
      sizeName: sizeObj.name,
      sizeDimensions: sizeObj.resolution,
      aspectRatio: sizeObj.aspectRatio,
      coverStyle: newCoverStyle || preset.coverStyle,
      cover: '', photos: [], pages: [firstPage], musicLibrary: [], shareSlug: '', status: 'draft', createdAt: Date.now()
    });
    setAlbums((p) => [...p, album]); setActiveId(album.id); setEditorPage(0); setScreen(targetScreen); setCreateOpen(false); setNewTitle(''); setNewSubtitle(''); setNewEventType('Birthday'); setNewCoverStyle('photo'); setNewTemplate('birthday'); setNewSize('12x36'); return album;
  };

  const deletePhoto = (photoIdOrIds) => {
    if (!currentAlbum) return;
    const ids = Array.isArray(photoIdOrIds) ? photoIdOrIds : [photoIdOrIds];
    if (!ids.length) return;
    const idSet = new Set(ids);
    const removedList = currentAlbum.photos.filter((p) => idSet.has(p.id));
    recordHistory(true);
    updateAlbum((a) => {
      const photos = a.photos.filter((p) => !idSet.has(p.id));
      const pages = a.pages.map((pg) => ({
        ...pg,
        slots: pg.slots.map((sId) => (idSet.has(sId) ? null : sId))
      }));
      const deletedCovers = new Set(removedList.map((p) => p.src));
      const cover = deletedCovers.has(a.cover) ? (photos[0]?.src || '') : a.cover;
      return { ...a, photos, pages, cover };
    }, true);
    if (isBackendConfigured) {
      removedList.forEach((removed) => {
        if (removed.storagePath) removeAlbumMediaBackend(removed.storagePath).catch(console.error);
      });
    }
    setToast(ids.length > 1 ? `${ids.length} photos removed from library.` : 'Photo removed from library.');
  };

  const deleteAlbum = async (id) => {
    if (!confirm('Delete this album?')) return;
    const next = albums.filter((a) => a.id !== id); setAlbums(next); if (activeId === id) setActiveId(next[0]?.id || '');
    if (isBackendConfigured) {
      try { await deleteAlbumBackend(user.id, id); }
      catch (err) { console.error(err); setToast('Album deleted locally. Retry to delete from cloud.'); }
    }
  };

  const uploadPhotos = async (files) => {
    if (!currentAlbum || !files?.length) return;
    if (activePlan.photos && currentAlbum.photos.length >= activePlan.photos) {
      setPlanOpen(true);
      setToast(`Your ${activePlan.name} plan allows up to ${activePlan.photos} photos. Please upgrade your plan.`);
      return;
    }
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/')); if (!imgs.length) return;
    const existing = new Set(currentAlbum.photos.map((p) => p.fileKey).filter(Boolean));
    const unique = []; let skipped = 0;
    for (const f of imgs) { const key = fileSignature(f); if (existing.has(key)) { skipped++; continue; } existing.add(key); unique.push(f); }
    if (!unique.length) { setToast(skipped ? `${skipped} duplicate photo(s) skipped.` : 'No valid images selected.'); return; }
    setUploading(true); setFailedUploads([]); setUploadProgress({ total: unique.length, done: 0, skipped });
    const next = []; const failed = [];
    for (let i = 0; i < unique.length; i++) {
      const f = unique[i];
      try {
        let src; let storagePath = '';
        if (isBackendConfigured) {
          const uploaded = await uploadAlbumMediaBackend({ userId: user.id, albumId: currentAlbum.id, file: f, kind: 'photos' });
          src = uploaded.publicUrl; storagePath = uploaded.path;
        } else {
          src = await fileToDataUrl(f);
        }
        const dim = await imageDimensions(src);
        next.push({ id: makeId(), name: f.name, src, storagePath, createdAt: Date.now(), fileKey: fileSignature(f), originalSize: f.size, originalType: f.type, width: dim.width, height: dim.height, zoom: 1, focusX: 50, focusY: 50, rotation: 0 });
      } catch (err) { console.error('Upload failed:', err); failed.push(f); }
      setUploadProgress({ total: unique.length, done: i + 1, skipped });
    }
    if (next.length) updateAlbum((a) => ({ ...a, photos: [...a.photos, ...next], cover: a.cover || (a.coverStyle !== 'minimal' ? next[0]?.src : '') || a.cover }), true);
    setFailedUploads(failed); setUploading(false); setScreen('editor');
    const parts = [`${next.length} uploaded`]; if (skipped) parts.push(`${skipped} duplicates skipped`); if (failed.length) parts.push(`${failed.length} failed`);
    setToast(parts.join(' · '));
  };
  const retryFailedUploads = async () => { const files = [...failedUploads]; setFailedUploads([]); if (files.length) await uploadPhotos(files); };


  const updatePage = (pageIndex, patch) => updateAlbum((a) => ({ ...a, pages: a.pages.map((p, i) => i === pageIndex ? { ...p, ...patch } : p) }), true);
  const updatePhotoAdjust = (photoId, patch) => updateAlbum((a) => ({ ...a, photos: a.photos.map((p) => p.id === photoId ? { ...p, ...photoAdjust({ ...p, ...patch }) } : p) }), true);
  const replacePhoto = async (photoId, file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    const oldPhoto = currentAlbum?.photos.find((p) => p.id === photoId);
    try {
      let src; let storagePath = '';
      if (isBackendConfigured) {
        const uploaded = await uploadAlbumMediaBackend({ userId: user.id, albumId: currentAlbum.id, file, kind: 'photos' });
        src = uploaded.publicUrl; storagePath = uploaded.path;
      } else {
        src = await fileToDataUrl(file);
      }
      const dim = await imageDimensions(src); recordHistory(true);
      updateAlbum((a) => ({ ...a, photos: a.photos.map((p) => p.id === photoId ? { ...p, name: file.name, src, storagePath, fileKey: fileSignature(file), originalSize: file.size, originalType: file.type, width: dim.width, height: dim.height, zoom: 1, focusX: 50, focusY: 50, rotation: 0 } : p), cover: a.cover === a.photos.find((p) => p.id === photoId)?.src ? src : a.cover }));
      if (isBackendConfigured && oldPhoto?.storagePath) removeAlbumMediaBackend(oldPhoto.storagePath).catch(console.error);
      setToast('Photo replaced.');
    } catch (err) { console.error(err); setToast('Photo replace failed.'); }
  };
  const setCoverPhoto = (photoId) => { const photo = currentAlbum?.photos.find((p) => p.id === photoId); if (!photo) return; updateAlbum({ cover: photo.src, coverStyle: 'photo' }, true); setToast('Album cover updated.'); };

  const changePageLayout = (layoutId) => {
    if (!currentAlbum) return;
    const count = LAYOUT_MAP[layoutId].slots;
    const old = currentAlbum.pages[editorPage];
    updatePage(editorPage, { layout: layoutId, slots: Array.from({ length: count }, (_, i) => old.slots?.[i] || null) });
  };

  const assignPhoto = (photoId, slotIndex) => {
    recordHistory(true); updateAlbum((a) => {
      const pages = a.pages.map((p) => ({ ...p, slots: p.slots.map((id) => id === photoId ? null : id) }));
      const page = { ...pages[editorPage], slots: [...pages[editorPage].slots] };
      page.slots[slotIndex] = photoId; pages[editorPage] = page;
      return { ...a, pages };
    });
  };
  const removeFromSlot = (slotIndex) => {
    const page = currentAlbum.pages[editorPage]; const slots = [...page.slots]; slots[slotIndex] = null; updatePage(editorPage, { slots });
  };

  const addNextPage = () => {
    if (editorPage < currentAlbum.pages.length - 1) { setEditorPage(editorPage + 1); return; }
    if (activePlan.pages !== Infinity && usedPages >= activePlan.pages) { setPlanOpen(true); setToast(`Page limit reached for ${activePlan.name} plan.`); return; }
    recordHistory(true); updateAlbum((a) => ({ ...a, pages: [...a.pages, blankPage()] })); setEditorPage(editorPage + 1);
  };
  const addBlankPage = () => {
    if (activePlan.pages !== Infinity && usedPages >= activePlan.pages) { setPlanOpen(true); return; }
    recordHistory(true); updateAlbum((a) => ({ ...a, pages: [...a.pages, blankPage()] })); setEditorPage(currentAlbum.pages.length);
  };
  const deletePage = () => {
    if (currentAlbum.pages.length <= 1) { setToast('An album must have at least 1 page.'); return; }
    recordHistory(true); updateAlbum((a) => ({ ...a, pages: a.pages.filter((_, i) => i !== editorPage) })); setEditorPage(Math.max(0, editorPage - 1));
  };
  const duplicatePage = () => {
    if (activePlan.pages !== Infinity && usedPages >= activePlan.pages) { setPlanOpen(true); setToast('Page limit complete.'); return; }
    recordHistory(true); const copy = { ...structuredClone(currentAlbum.pages[editorPage]), id: makeId() };
    updateAlbum((a) => { const pages = [...a.pages]; pages.splice(editorPage + 1, 0, copy); return { ...a, pages }; }); setEditorPage(editorPage + 1);
  };
  const movePage = (dir) => {
    const to = editorPage + dir; if (to < 0 || to >= currentAlbum.pages.length) return; recordHistory(true);
    updateAlbum((a) => { const pages = [...a.pages]; const [p] = pages.splice(editorPage, 1); pages.splice(to, 0, p); return { ...a, pages }; }); setEditorPage(to);
  };
  const reorderPage = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= currentAlbum.pages.length || to >= currentAlbum.pages.length) return; recordHistory(true);
    updateAlbum((a) => { const pages = [...a.pages]; const [p] = pages.splice(from, 1); pages.splice(to, 0, p); return { ...a, pages }; }); setEditorPage(to);
  };

  const uploadMusic = async (file) => {
    if (!file) return;
    try {
      let src; let storagePath = '';
      if (isBackendConfigured) {
        const uploaded = await uploadAlbumMediaBackend({ userId: user.id, albumId: currentAlbum.id, file, kind: 'audio' });
        src = uploaded.publicUrl; storagePath = uploaded.path;
      } else {
        src = await fileToDataUrl(file);
      }
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const track = { id: makeId(), name: cleanName, src, storagePath, size: file.size, createdAt: Date.now() };
      recordHistory(true);
      updateAlbum((a) => {
        const library = [...(a.musicLibrary || []).filter((m) => m.name !== cleanName), track];
        return {
          ...a,
          musicId: track.id,
          musicScope: 'album',
          musicLibrary: library,
          pages: a.pages.map((p) => ({ ...p, musicId: track.id }))
        };
      }, true);
      setToast(`🎵 "${cleanName}" uploaded and set as album background music!`);
    } catch (err) { console.error(err); setToast('Music upload failed.'); }
  };

  const deleteMusic = (trackId) => {
    if (!currentAlbum) return;
    recordHistory(true);
    updateAlbum((a) => {
      const musicLibrary = (a.musicLibrary || []).filter((m) => m.id !== trackId);
      const musicId = a.musicId === trackId ? (musicLibrary[0]?.id || '') : a.musicId;
      const pages = a.pages.map((p) => p.musicId === trackId ? { ...p, musicId: '' } : p);
      return { ...a, musicId, musicLibrary, pages };
    }, true);
    setToast('Music removed from library.');
  };

  const setActiveMusic = (trackId, scope = 'album') => {
    if (!currentAlbum) return;
    recordHistory(true);
    updateAlbum((a) => {
      if (scope === 'album') {
        return {
          ...a,
          musicId: trackId,
          musicScope: 'album',
          pages: a.pages.map((p) => ({ ...p, musicId: trackId }))
        };
      } else {
        return {
          ...a,
          musicScope: 'page',
          pages: a.pages.map((p, i) => i === editorPage ? { ...p, musicId: trackId } : p)
        };
      }
    }, true);
    const track = currentAlbum.musicLibrary?.find((m) => m.id === trackId);
    setToast(track ? `🎵 "${track.name}" active (${scope === 'album' ? 'Whole album' : 'This page'}).` : 'Background music updated.');
  };

  const selectPresetMusic = (preset) => {
    if (!currentAlbum) return;
    const cleanName = preset.name;
    const track = { id: preset.id || makeId(), name: cleanName, src: preset.src, isPreset: true, createdAt: Date.now() };
    recordHistory(true);
    updateAlbum((a) => {
      const musicLibrary = [...(a.musicLibrary || []).filter((m) => m.id !== track.id && m.name !== cleanName), track];
      return {
        ...a,
        musicId: track.id,
        musicScope: 'album',
        musicLibrary,
        pages: a.pages.map((p) => ({ ...p, musicId: track.id }))
      };
    }, true);
    setToast(`🎵 "${cleanName}" set as album background music!`);
  };

  const removeActiveMusic = () => {
    if (!currentAlbum) return;
    recordHistory(true);
    updateAlbum((a) => ({
      ...a,
      musicId: '',
      pages: a.pages.map((p) => ({ ...p, musicId: '' }))
    }), true);
    setToast('Background music turned off.');
  };

  const publishAlbum = async () => {
    if (!currentAlbum) return;
    const slug = currentAlbum.shareSlug || `${currentAlbum.id.slice(-7)}-${Math.random().toString(36).slice(2, 6)}`;
    const published = { ...currentAlbum, shareSlug: slug, publishedAt: Date.now(), completedAt: Date.now(), status: 'completed' };
    await dbSet(`${PUBLIC_PREFIX}${slug}`, published);
    if (isBackendConfigured) await publishAlbumBackend(user.id, published);
    updateAlbum({ shareSlug: slug, publishedAt: Date.now(), completedAt: Date.now(), status: 'completed' });
    const link = `${location.origin}${location.pathname}#/share/${slug}`;
    try { await navigator.clipboard.writeText(link); setToast(isBackendConfigured ? 'Album published. Public share link copied.' : 'Album published. Demo share link copied.'); }
    catch { setToast(`Album published: ${link}`); }
  };

  if (!loaded) return <div className="loading">Loading Flipora…</div>;

  const openPublishedShare = async () => {
    try {
      await publishAlbum();
      setScreen('publish');
    } catch (err) {
      console.error(err);
      setToast('Could not publish album. Please try again.');
    }
  };

  return <div className="app-shell ux-shell">
    <header className="app-header ux-app-header">
      <button className="brand-btn" onClick={() => setScreen('dashboard')} aria-label="Flipora dashboard"><img src="/assets/brand/flipora-logo.png" alt="Flipora" className="brand-logo-img" /></button>
      <nav>
        <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>My Albums</button>
        <button className={['create', 'template', 'setup-upload'].includes(screen) ? 'active' : ''} type="button" onClick={() => startCreateFlow('template')}>Templates</button>
        {currentAlbum && <button className={screen === 'editor' ? 'active' : ''} onClick={() => setScreen('editor')}>Editor</button>}
        <button className={screen === 'pricing' ? 'active' : ''} type="button" onClick={() => setScreen('pricing')}>Pricing</button>
      </nav>
      <div className="header-actions">
        <button className="plan-pill trial-pill" onClick={() => setScreen('pricing')}>
          <Crown size={14} /><span>{activePlan.name}</span><b>{albums.length}/{activePlan.albums || 1} albums</b>
        </button>
        <button type="button" className="notif-btn" title="Notifications" aria-label="Notifications"><Bell size={17} /><span className="notif-dot" /></button>
        <div className="profile-menu-wrap" ref={profileRef}>
          <button className={`user-pill ${profileOpen ? 'active' : ''}`} onClick={() => setProfileOpen((o) => !o)} aria-label="User profile and menu" aria-expanded={profileOpen}>
            <span>{(user.name || 'K')[0].toUpperCase()}</span><b>{user.name || 'User'}</b><ChevronDown size={14} />
          </button>
          {profileOpen && <div className="profile-dropdown">
            <div className="profile-dropdown-user"><div className="user-avatar">{(user.name || 'U')[0].toUpperCase()}</div><div className="user-details"><strong>{user.name}</strong><small>{user.email || 'Member'}</small></div></div>
            <div className="profile-dropdown-plan"><div className="dropdown-plan-meta"><span><Crown size={13} /> {activePlan.name} Plan</span><b>{albums.length}/{activePlan.albums || 1} albums · {activePlan.photos} photos max</b></div><button className="dropdown-upgrade-btn" onClick={() => { setProfileOpen(false); setScreen('pricing'); }}>{activePlan.id === 'yearly' ? 'Manage Plan' : 'Upgrade Plan'}</button></div>
            <div className="profile-dropdown-divider" />
            <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); setScreen('settings'); }}><User size={15} /><span>Profile & Settings</span></button>
            <button className="profile-dropdown-item danger" onClick={() => { setProfileOpen(false); onLogout(); }}><LogOut size={15} /><span>Logout</span></button>
          </div>}
        </div>
      </div>
    </header>

    {screen === 'dashboard' && <Dashboard albums={albums} activePlan={activePlan} usedPages={usedPages} remainingPages={remainingPages}
      onOpen={(id) => { setActiveId(id); setEditorPage(0); setScreen('editor') }} onPreview={(id) => { setActiveId(id); setScreen('preview') }}
      onDelete={deleteAlbum} onCreate={() => startCreateFlow('create')} onUpgrade={() => setScreen('pricing')} onSettings={() => setScreen('settings')} onTemplates={() => startCreateFlow('template')} />}

    {screen === 'create' && <CreateAlbumSetup
      title={newTitle} setTitle={setNewTitle} subtitle={newSubtitle} setSubtitle={setNewSubtitle}
      eventType={newEventType} setEventType={setNewEventType} size={newSize} setSize={setNewSize}
      onBack={() => setScreen('dashboard')} onNext={() => setScreen('template')} />}

    {screen === 'template' && <TemplateSelectionPage
      selected={newTemplate}
      onSelect={(id) => { const preset = ALBUM_TEMPLATES.find((t) => t.id === id); setNewTemplate(id); if (preset) { setNewEventType(preset.eventType); setNewCoverStyle(preset.coverStyle); } }}
      onBack={() => setScreen('create')}
      onNext={() => createAlbum('setup-upload')} />}

    {screen === 'setup-upload' && currentAlbum && <PhotoUploadSetup
      album={currentAlbum} uploading={uploading} uploadProgress={uploadProgress} failedUploads={failedUploads}
      inputPhotosRef={inputPhotosRef} onUploadPhotos={uploadPhotos} onRetryFailed={retryFailedUploads} onDeletePhoto={deletePhoto} onSetCover={setCoverPhoto}
      onBack={() => setScreen('dashboard')} onContinue={() => setScreen('editor')} />}

    {screen === 'editor' && currentAlbum && <Editor album={currentAlbum} pageIndex={editorPage} plan={activePlan} usedPages={usedPages} remainingPages={remainingPages}
      uploading={uploading} uploadProgress={uploadProgress} failedUploads={failedUploads} onRetryFailed={retryFailedUploads} photoSearch={photoSearch} setPhotoSearch={setPhotoSearch} inputPhotosRef={inputPhotosRef}
      onUploadPhotos={uploadPhotos} onDeletePhoto={deletePhoto} onLayout={changePageLayout} onAssign={assignPhoto} onRemoveSlot={removeFromSlot}
      onPageChange={setEditorPage} onNextPage={addNextPage} onAddPage={addBlankPage} onDeletePage={deletePage} onDuplicatePage={duplicatePage} onMovePage={movePage} onReorderPage={reorderPage}
      onUpdatePage={(patch) => updatePage(editorPage, patch)} onUpdatePhoto={updatePhotoAdjust} onReplacePhoto={replacePhoto} onSetCover={setCoverPhoto}
      onUploadMusic={uploadMusic} onDeleteMusic={deleteMusic} onSetActiveMusic={setActiveMusic} onSelectPresetMusic={selectPresetMusic} onRemoveActiveMusic={removeActiveMusic}
      onUpdateAlbum={updateAlbum} onPreview={() => setScreen('preview')} onPublish={openPublishedShare} onSave={saveNow} onUndo={undo} onRedo={redo} canUndo={historyRef.current.past.length > 0} canRedo={historyRef.current.future.length > 0}
      onBack={() => setScreen('dashboard')} />}

    {screen === 'preview' && currentAlbum && <Preview album={currentAlbum} plan={activePlan} onBack={() => setScreen('editor')} onPublish={openPublishedShare} />}

    {screen === 'publish' && currentAlbum && <PublishSharePage album={currentAlbum} onBack={() => setScreen('editor')} onPreview={() => setScreen('preview')} onRepublish={publishAlbum} />}

    {screen === 'pricing' && <PricingPage current={activePlan} albums={albums} usedPages={usedPages} onBack={() => setScreen('dashboard')} onSelect={async (id) => {
      const p = PLAN_MAP[id];
      if (p.pages !== Infinity && usedPages > p.pages) { setToast('Please reduce the number of pages first.'); return; }
      await onPlanChange(id); setToast(`${p.name} plan selected.`);
    }} />}

    {screen === 'settings' && <ProfileSettingsPage user={user} plan={activePlan} albums={albums} onBack={() => setScreen('dashboard')} onSaveName={saveProfileName} onPricing={() => setScreen('pricing')} onLogout={onLogout} />}

    {planOpen && <PlanModal current={activePlan} usedPages={usedPages} onClose={() => setPlanOpen(false)} onSelect={(id) => { const p = PLAN_MAP[id]; if (p.pages !== Infinity && usedPages > p.pages) { setToast('Please reduce the number of pages first.'); return; } onPlanChange(id); setPlanOpen(false); setToast(`${p.name} plan selected.`) }} />}
    {notice && <div className="toast">{notice}</div>}
  </div>;
}

function Dashboard({ albums, activePlan, onOpen, onPreview, onDelete, onCreate, onUpgrade, onSettings, onTemplates }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const statusOf = (a) => a.purchaseStatus === 'purchased' ? 'purchased' : (a.completedAt || a.status === 'completed') ? 'completed' : 'draft';
  const categories = ['all', 'Wedding', 'Birthday', 'Family', 'Travel', 'Baby'];
  const list = albums
    .filter((a) => filter === 'all' || String(a.eventType || '').toLowerCase() === filter.toLowerCase())
    .filter((a) => `${a.title} ${a.subtitle} ${a.eventType}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'oldest' ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0));
  const usedPhotos = albums.reduce((n, a) => n + (a.photos?.length || 0), 0);
  return <main className="ux-dashboard">
    <aside className="ux-dash-sidebar">
      <button className="ux-create-btn" onClick={onCreate}><Plus size={16} /> Create Album</button>
      <nav className="ux-side-nav">
        <button className="active"><BookOpen size={17} /> My Albums</button>
        <button><Share2 size={17} /> Shared with Me</button>
        <button><Heart size={17} /> Favorites</button>
        <button><Trash2 size={17} /> Trash</button>
        <button onClick={onTemplates}><LayoutGrid size={17} /> Templates</button>
        <button onClick={onUpgrade}><Crown size={17} /> Pricing</button>
        <button onClick={onSettings}><User size={17} /> Settings</button>
      </nav>
      <div className="ux-storage-card"><div><b>Storage</b><span>{usedPhotos} photos</span></div><div className="ux-storage-bar"><i style={{ width: `${Math.min(100, (usedPhotos / Math.max(1, activePlan.photos)) * 100)}%` }} /></div><small>{activePlan.photos} photos included</small><button onClick={onUpgrade}>Upgrade</button></div>
    </aside>
    <section className="ux-dash-main">
      <div className="ux-page-title-row"><div><small>YOUR MEMORY LIBRARY</small><h1>My Albums</h1><p>Create, manage and relive your memories.</p></div><button className="primary ux-new-album" onClick={onCreate}><Plus size={16} /> New Album</button></div>
      <div className="ux-dashboard-toolbar">
        <div className="ux-filter-pills">{categories.map((c) => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c === 'all' ? 'All' : c}</button>)}</div>
        <div className="ux-search-sort"><label className="ux-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search albums..." /></label><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option></select></div>
      </div>
      {list.length === 0 ? <div className="ux-empty"><BookOpen size={44} /><h2>No albums found</h2><p>Start a new album or change the filter.</p><button className="primary" onClick={onCreate}>Create Album</button></div> : <div className="ux-album-grid">
        {list.map((a) => <article className="ux-album-card" key={a.id}>
          <button className="ux-cover-btn" onClick={() => onOpen(a.id)}>{a.cover ? <img src={a.cover} alt="" /> : <div className="ux-cover-empty"><Camera size={36} /><span>Add cover photo</span></div>}<span className={`ux-status ${statusOf(a)}`}>{statusOf(a)}</span><span className="ux-card-pages">{a.photos.length} photos · {a.pages.length} pages</span></button>
          <div className="ux-album-info"><div><h3>{a.title}</h3><p>{a.subtitle || a.eventType || 'Beautiful memories'}</p><small>{a.eventType || 'General'} · {a.sizeName || 'Digital album'}</small></div><div className="ux-card-actions"><button onClick={() => onOpen(a.id)}>Edit</button><button onClick={() => onPreview(a.id)}><Eye size={14} /> Preview</button><button className="danger" onClick={() => onDelete(a.id)}><Trash2 size={14} /></button></div></div>
        </article>)}
        <button className="ux-add-card" onClick={onCreate}><Plus size={30} /><b>Create New Album</b><span>Start from scratch</span></button>
      </div>}
    </section>
  </main>;
}

function SetupStepper({ active = 1 }) {
  const steps = ['Basic Info', 'Choose Template', 'Add Photos', 'Customize', 'Save & Share'];
  return <aside className="ux-setup-steps">{steps.map((s, i) => <div className={`${active === i + 1 ? 'active' : ''} ${active > i + 1 ? 'done' : ''}`} key={s}><span>{active > i + 1 ? <Check size={14} /> : i + 1}</span><b>{s}</b></div>)}</aside>;
}

function CreateAlbumSetup({ title, setTitle, subtitle, setSubtitle, eventType, setEventType, size, setSize, onBack, onNext }) {
  const occasions = ['Birthday', 'Wedding', 'Baby', 'Family', 'Travel', 'Festival', 'School', 'Other'];
  const selectedSize = ALBUM_SIZE_MAP[size] || ALBUM_SIZES[0];
  return <main className="ux-setup-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back to Albums</button><div className="ux-setup-shell"><SetupStepper active={1} /><section className="ux-setup-content"><div className="ux-setup-head"><small>STEP 1 OF 5</small><h1>Let's Create Your Album</h1><p>Give your album a name and choose what it is for.</p></div><div className="ux-setup-card"><label>Album Name<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aadhya's Birthday" /></label><label>Short Description <span>(Optional)</span><textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A special album for our happiest memories" /></label><label>Occasion<div className="ux-occasion-pills">{occasions.map((o) => <button type="button" key={o} className={eventType === o ? 'active' : ''} onClick={() => setEventType(o)}>{o}</button>)}</div></label><label>Album Size<select value={size} onChange={(e) => setSize(e.target.value)}>{ALBUM_SIZES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.aspectRatio.replace('/', ':')}</option>)}</select><small className="ux-field-note">{selectedSize.resolution} · {selectedSize.hint}</small></label><div className="ux-setup-actions"><button className="secondary" onClick={onBack}>Cancel</button><button className="primary" disabled={!title.trim()} onClick={onNext}>Next Step <ChevronRight size={16} /></button></div></div></section><aside className="ux-setup-art"><img src="/assets/landing/story-birthday.jpg" alt="Album inspiration" /><div className="ux-paper-note">Every photo<br />tells a story ♡</div><small>Everything can be edited later.</small></aside></div></main>;
}

const TEMPLATE_VISUALS = { wedding: '/assets/landing/template-classic.jpg', general: '/assets/landing/template-minimal.jpg', birthday: '/assets/landing/template-kids.jpg', baby: '/assets/landing/story-baby.jpg', travel: '/assets/landing/template-travel.jpg', family: '/assets/landing/story-family.jpg' };
function TemplateSelectionPage({ selected, onSelect, onBack, onNext }) {
  const extras = [{ id: 'classic', name: 'Classic', img: '/assets/landing/template-classic.jpg' }, { id: 'modern', name: 'Modern', img: '/assets/landing/template-modern.jpg' }, { id: 'scrapbook', name: 'Scrapbook', img: '/assets/landing/template-scrapbook.jpg' }, { id: 'magazine', name: 'Magazine', img: '/assets/landing/template-love.jpg' }];
  const cards = [...ALBUM_TEMPLATES.map(t => ({ id: t.id, name: t.name, img: TEMPLATE_VISUALS[t.id] })), ...extras];
  return <main className="ux-setup-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button><div className="ux-setup-shell ux-template-shell"><SetupStepper active={2} /><section className="ux-setup-content"><div className="ux-setup-head"><small>STEP 2 OF 5</small><h1>Choose a Template</h1><p>Start with a beautiful design. You can customize every detail later.</p></div><div className="ux-template-filter"><button className="active">All</button><button>Wedding</button><button>Birthday</button><button>Baby</button><button>Family</button><button>Travel</button></div><div className="ux-template-grid">{cards.map((t) => <button key={t.id} className={selected === t.id ? 'active' : ''} onClick={() => onSelect(ALBUM_TEMPLATES.some(x => x.id === t.id) ? t.id : 'general')}><img src={t.img} alt="" /><div><b>{t.name}</b><span>{t.id === 'scrapbook' ? 'Creative & fun' : 'Beautiful layout'}</span></div>{selected === t.id && <i><Check size={14} /></i>}</button>)}</div><div className="ux-setup-actions"><button className="secondary" onClick={onBack}><ArrowLeft size={15} /> Back</button><button className="primary" onClick={onNext}>Next: Add Photos <ChevronRight size={16} /></button></div></section></div></main>;
}

function PhotoUploadSetup({ album, uploading, uploadProgress, failedUploads, inputPhotosRef, onUploadPhotos, onRetryFailed, onDeletePhoto, onSetCover, onBack, onContinue }) {
  return <main className="ux-setup-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back to Albums</button><div className="ux-setup-shell ux-upload-shell"><SetupStepper active={3} /><section className="ux-setup-content"><div className="ux-setup-head"><small>STEP 3 OF 5</small><h1>Add Your Photos</h1><p>Upload your memories now. You can always add or remove photos in the editor.</p></div><label className="ux-upload-zone"><Upload size={30} /><b>{uploading ? 'Uploading photos...' : 'Drag & drop photos here'}</b><span>or click to choose JPG, PNG, WebP</span><button type="button">Select from Device</button><input ref={inputPhotosRef} type="file" accept="image/*" multiple onChange={(e) => onUploadPhotos(e.target.files)} /></label>{uploading && <div className="ux-upload-progress"><div><i style={{ width: `${Math.round((uploadProgress.done / Math.max(1, uploadProgress.total)) * 100)}%` }} /></div><span>{uploadProgress.done}/{uploadProgress.total} uploaded</span></div>}{failedUploads.length > 0 && <button className="secondary" onClick={onRetryFailed}>Retry {failedUploads.length} failed upload(s)</button>}<div className="ux-upload-gallery">{album.photos.map((p, i) => <article key={p.id}><img src={p.src} alt="" /><button className={`ux-cover-mark ${album.cover === p.src ? 'active' : ''}`} onClick={() => onSetCover(p.id)}>{album.cover === p.src ? 'Cover ✓' : 'Set Cover'}</button><button className="ux-photo-remove" onClick={() => onDeletePhoto(p.id)}><X size={13} /></button><span>{p.name}</span></article>)}{!album.photos.length && <div className="ux-no-photos">No photos uploaded yet.</div>}</div><div className="ux-setup-actions"><button className="secondary" onClick={onBack}>Save & Exit</button><button className="primary" onClick={onContinue}>Continue to Editor <ChevronRight size={16} /></button></div></section></div></main>;
}

function PricingPage({ current, albums, usedPages, onBack, onSelect }) {
  const [billing, setBilling] = useState('yearly');
  return <main className="ux-pricing-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back to Albums</button><header><small>PLANS THAT GROW WITH YOU</small><h1>Simple & Transparent Plans</h1><p>Choose the plan that fits your memories.</p><div className="ux-billing-toggle"><button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button><button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>Yearly <span>Save more</span></button></div></header><section className="ux-pricing-grid">{PLANS.map((p) => { const cur = current?.id === p.id; return <article key={p.id} className={`${p.popular ? 'popular' : ''} ${cur ? 'current' : ''}`}>{p.popular && <b className="ux-plan-ribbon">Most Popular</b>}<h3>{p.name}</h3><small>{p.description}</small><div className="ux-price">{planPrice(p)}<span>{p.price === 0 ? '' : ' / plan'}</span></div><ul>{p.features.map((f) => <li key={f}><Check size={15} />{f}</li>)}</ul><button disabled={cur} onClick={() => onSelect(p.id)}>{cur ? 'Current Plan' : 'Choose Plan'}</button></article> })}</section><div className="ux-plan-footnote">You currently have <b>{albums.length}</b> album(s) and <b>{usedPages}</b> page(s). Plan changes keep your existing work safe.</div></main>;
}

function ProfileSettingsPage({ user, plan, albums, onBack, onSaveName, onPricing, onLogout }) {
  const [name, setName] = useState(user.name || ''); const [saving, setSaving] = useState(false); const [tab, setTab] = useState('profile');
  const save = async () => { setSaving(true); try { await onSaveName(name) } finally { setSaving(false) } };
  return <main className="ux-settings-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back to Albums</button><div className="ux-settings-shell"><aside><h3>Account Settings</h3>{[['profile', 'Profile'], ['subscription', 'Subscription'], ['storage', 'Storage'], ['notifications', 'Notifications'], ['privacy', 'Privacy']].map(([id, l]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{l}</button>)}<button className="danger" onClick={onLogout}>Logout</button></aside><section>{tab === 'profile' && <><div className="ux-settings-head"><div className="ux-settings-avatar">{(user.name || 'K')[0].toUpperCase()}</div><div><h1>Profile Settings</h1><p>Update your personal information.</p></div></div><div className="ux-settings-form"><label>Full Name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Email Address<input value={user.email || ''} readOnly /></label><label>Language<select defaultValue="English"><option>English</option><option>Hindi</option><option>Gujarati</option></select></label><button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</button></div></>}{tab === 'subscription' && <div className="ux-settings-panel"><h1>Your Subscription</h1><div className="ux-current-plan"><Crown size={26} /><div><b>{plan.name} Plan</b><span>{plan.description}</span></div><button onClick={onPricing}>Manage Plan</button></div></div>}{tab === 'storage' && <div className="ux-settings-panel"><h1>Storage</h1><p>{albums.reduce((n, a) => n + (a.photos?.length || 0), 0)} photos across {albums.length} album(s).</p></div>}{tab === 'notifications' && <div className="ux-settings-panel"><h1>Notifications</h1><label className="ux-check-row"><input type="checkbox" defaultChecked /> Email me when someone views a shared album</label><label className="ux-check-row"><input type="checkbox" defaultChecked /> Product and template updates</label></div>}{tab === 'privacy' && <div className="ux-settings-panel"><h1>Privacy</h1><p>Public albums are accessible only with their share link. Keep private albums unpublished.</p></div>}</section></div></main>;
}

function PublishSharePage({ album, onBack, onPreview, onRepublish }) {
  const [copied, setCopied] = useState(false); const [allowDownload, setAllowDownload] = useState(false); const [comments, setComments] = useState(false);
  const link = album.shareSlug ? `${location.origin}${location.pathname}#/share/${album.shareSlug}` : '';
  const copy = async () => { if (!link) { await onRepublish(); return; } try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { } };
  return <main className="ux-publish-page"><button className="ux-back-link" onClick={onBack}><ArrowLeft size={16} /> Back to Editor</button><section className="ux-publish-card"><div className="ux-success-icon"><Check size={30} /></div><small>PUBLISHED SUCCESSFULLY</small><h1>Your Album is Ready!</h1><p>Share it with your loved ones and let them relive the memories.</p><div className="ux-share-link"><input readOnly value={link || 'Publish once to generate your share link'} /><button onClick={copy}><Copy size={15} />{copied ? 'Copied!' : 'Copy Link'}</button></div><div className="ux-social-row"><button>🟢<span>WhatsApp</span></button><button>🔵<span>Facebook</span></button><button>✉️<span>Email</span></button><button>▦<span>QR Code</span></button></div><div className="ux-link-settings"><h3>Link Settings</h3><label><span><b>Allow Download</b><small>Visitors may save a copy</small></span><input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} /></label><label><span><b>Show Comments</b><small>Let viewers leave a message</small></span><input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /></label></div><div className="ux-publish-actions"><button className="secondary" onClick={onBack}>Edit Album</button><button className="primary" onClick={onPreview}><Eye size={16} /> View Album</button></div></section><aside className="ux-publish-art"><img src={album.cover || album.photos?.[0]?.src || '/assets/landing/story-birthday.jpg'} alt="" /><div>Share Memories<br />Spread Happiness ♡</div></aside></main>;
}

function Editor({ album, pageIndex, plan, usedPages, remainingPages, uploading, uploadProgress, failedUploads, onRetryFailed, photoSearch, setPhotoSearch, inputPhotosRef, onUploadPhotos, onDeletePhoto, onLayout, onAssign, onRemoveSlot, onPageChange, onNextPage, onAddPage, onDeletePage, onDuplicatePage, onMovePage, onReorderPage, onUpdatePage, onUpdatePhoto, onReplacePhoto, onSetCover, onUploadMusic, onDeleteMusic, onSetActiveMusic, onSelectPresetMusic, onRemoveActiveMusic, onUpdateAlbum, onPreview, onPublish, onSave, onUndo, onRedo, canUndo, canRedo, onBack }) {
  const page = album.pages[pageIndex] || album.pages[0];
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [activeTextId, setActiveTextId] = useState(null);

  // Background Music Audio State
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorAudioVolume, setEditorAudioVolume] = useState(0.85);
  const [editorAudioTrackId, setEditorAudioTrackId] = useState(null);
  const editorAudioRef = useRef(null);

  const currentActiveTrack = useMemo(() => {
    const trackId = page.musicId || album.musicId || album.musicLibrary?.[0]?.id;
    return (album.musicLibrary || []).find((m) => m.id === trackId) || null;
  }, [page.musicId, album.musicId, album.musicLibrary]);

  const toggleEditorMusic = (trackToPlay = currentActiveTrack) => {
    if (!trackToPlay?.src || !editorAudioRef.current) return;
    if (editorPlaying && editorAudioTrackId === trackToPlay.id) {
      editorAudioRef.current.pause();
      setEditorPlaying(false);
    } else {
      editorAudioRef.current.src = trackToPlay.src;
      editorAudioRef.current.volume = editorAudioVolume;
      editorAudioRef.current.play().then(() => {
        setEditorPlaying(true);
        setEditorAudioTrackId(trackToPlay.id);
      }).catch((err) => console.log('Audio playback error:', err));
    }
  };

  // Left Sidebar Category Tabs & Filter
  const [leftTab, setLeftTab] = useState('layouts'); // 'layouts' | 'backgrounds' | 'stickers' | 'text' | 'elements' | 'music'
  const [layoutCategory, setLayoutCategory] = useState('all'); // 'all' | 'classic' | 'modern' | 'collage' | 'magazine'

  // Right Inspector Tabs & Settings
  const [rightTab, setRightTab] = useState('page'); // 'page' | 'photo' | 'text' | 'element'
  const [showPageNumber, setShowPageNumber] = useState(page.showPageNumber !== false);
  const [pageNumberPos, setPageNumberPos] = useState(page.pageNumberPos || 'bottom-right');
  const [bgColorType, setBgColorType] = useState('color'); // 'color' | 'image' | 'texture'

  // Bottom Photo Library States
  const [bottomTab, setBottomTab] = useState('library'); // 'library' | 'uploads' | 'favorites'
  const [bottomSort, setBottomSort] = useState('newest');
  const [selectedPhotosList, setSelectedPhotosList] = useState([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(album.title);

  const photosById = useMemo(() => Object.fromEntries(album.photos.map((p) => [p.id, p])), [album.photos]);
  const usedIds = useMemo(() => new Set(album.pages.flatMap((p) => p.slots.filter(Boolean))), [album.pages]);
  const filtered = useMemo(() => {
    let list = album.photos.filter((p) => p.name.toLowerCase().includes(photoSearch.toLowerCase()));
    if (bottomTab === 'favorites') {
      list = list.filter((p) => p.favorite);
    }
    if (bottomSort === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      list = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return list;
  }, [album.photos, photoSearch, bottomTab, bottomSort]);

  const textBoxes = useMemo(() => {
    if (Array.isArray(page.textBoxes) && page.textBoxes.length > 0) return page.textBoxes;
    if (page.text && page.text.trim()) {
      return [{
        id: 'legacy-text',
        text: page.text,
        x: clamp(Number(page.textX) || 50, 4, 96),
        y: clamp(Number(page.textY) || 84, 4, 96),
        font: page.font || 'Playfair Display',
        fontSize: Number(page.fontSize) || 26,
        textAlign: page.textAlign || 'center',
        color: page.textColor || '#2b211a',
        style: page.textStyle || 'clean'
      }];
    }
    return [];
  }, [page.textBoxes, page.text, page.textX, page.textY, page.font, page.fontSize, page.textAlign, page.textColor, page.textStyle]);

  const activeTextBox = textBoxes.find((t) => t.id === activeTextId) || textBoxes[0] || null;

  const addTextBox = (preset = null) => {
    const newBox = {
      id: makeId(),
      text: preset?.text || 'My Little Sunshine ♡',
      font: preset?.font || 'Dancing Script',
      fontSize: preset?.fontSize || 32,
      textAlign: 'center',
      color: preset?.color || (preset?.style === 'gold' ? '#bfa054' : '#2b211a'),
      style: preset?.style || 'clean',
      x: 50,
      y: Math.min(86, 35 + textBoxes.length * 14)
    };
    const next = [...textBoxes, newBox];
    onUpdatePage({ textBoxes: next, text: next[0]?.text || '' });
    setActiveTextId(newBox.id);
  };

  const updateTextBox = (id, patch) => {
    const next = textBoxes.map((tb) => tb.id === id ? { ...tb, ...patch } : tb);
    onUpdatePage({ textBoxes: next, text: next[0]?.text || '' });
  };

  const deleteTextBox = (id) => {
    const next = textBoxes.filter((tb) => tb.id !== id);
    onUpdatePage({ textBoxes: next, text: next[0]?.text || '' });
    if (activeTextId === id) setActiveTextId(next[0]?.id || null);
  };

  const dragStart = (e, id) => { e.dataTransfer.setData('text/photo-id', id); e.dataTransfer.effectAllowed = 'move'; };
  const placePhoto = (id, idx) => { if (!id) return; onAssign(id, idx); setSelectedPhoto(''); };
  const drop = (e, idx) => { e.preventDefault(); const id = e.dataTransfer.getData('text/photo-id'); if (id) placePhoto(id, idx); };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && onUpdateAlbum) {
      onUpdateAlbum((a) => ({ ...a, title: titleDraft.trim() }));
    }
  };

  const filteredLayouts = useMemo(() => {
    if (layoutCategory === 'all') return LAYOUTS;
    if (layoutCategory === 'classic') return LAYOUTS.filter((l) => l.id === 'fullbleed' || l.id === 'classic_spread' || l.id === 'single' || l.id === 'split');
    if (layoutCategory === 'modern') return LAYOUTS.filter((l) => l.id === 'modern_minimal' || l.id === 'trio' || l.id === 'photo_text');
    if (layoutCategory === 'collage') return LAYOUTS.filter((l) => l.id === 'collage_grid' || l.id === 'grid4' || l.id === 'collage5' || l.id === 'mixed_layout');
    if (layoutCategory === 'magazine') return LAYOUTS.filter((l) => l.id === 'magazine_style' || l.id === 'storytelling' || l.id === 'artistic' || l.id === 'overlapping_frames');
    return LAYOUTS;
  }, [layoutCategory]);

  const togglePhotoSelection = (id) => {
    setSelectedPhotosList((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addSelectedToPage = () => {
    if (selectedPhotosList.length === 0) return;
    const emptySlots = page.slots.map((s, idx) => s ? null : idx).filter((idx) => idx !== null);
    selectedPhotosList.slice(0, emptySlots.length).forEach((photoId, i) => {
      onAssign(photoId, emptySlots[i]);
    });
    setSelectedPhotosList([]);
  };

  const deleteSinglePhoto = (e, photoId, photoName) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${photoName || 'photo'}" from album?`)) {
      onDeletePhoto(photoId);
      setSelectedPhotosList((prev) => prev.filter((id) => id !== photoId));
      if (selectedPhoto === photoId) setSelectedPhoto('');
    }
  };

  const deleteSelectedPhotos = () => {
    if (selectedPhotosList.length === 0) return;
    if (window.confirm(`Delete ${selectedPhotosList.length} selected photo(s) from album?`)) {
      onDeletePhoto(selectedPhotosList);
      if (selectedPhotosList.includes(selectedPhoto)) setSelectedPhoto('');
      setSelectedPhotosList([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPhotosList.length === filtered.length && filtered.length > 0) {
      setSelectedPhotosList([]);
    } else {
      setSelectedPhotosList(filtered.map((p) => p.id));
    }
  };

  return <main className="ed-pro-page">
    <audio ref={editorAudioRef} loop />
    {/* 1. SECONDARY TOP ACTION BAR */}
    <div className="ed-subbar">
      <div className="ed-subbar-left">
        <button type="button" className="ed-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="ed-album-meta">
          <div className="ed-title-row">
            {isEditingTitle ? (
              <input
                className="ed-title-input"
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} title="Click to rename">
                {album.title}
                <Edit3 size={15} className="ed-title-edit-icon" />
              </h2>
            )}
          </div>
          <div className="ed-meta-sub">
            <span>{album.sizeName || '12 × 36 inch'} ({album.sizeDimensions || '1800 × 1200 px'})</span>
            <span className="ed-bullet">•</span>
            <span>{album.pages.length} pages</span>
            <span className="ed-bullet">•</span>
            <span>Saved 2 minutes ago</span>
          </div>
        </div>
      </div>

      <div className="ed-subbar-right">
        {/* Background Music Quick Player Pill */}
        <div className={`ed-subbar-music-pill ${currentActiveTrack ? 'has-track' : ''} ${editorPlaying ? 'is-playing' : ''}`}>
          <button
            type="button"
            className="ed-music-play-toggle"
            onClick={(e) => {
              e.stopPropagation();
              if (currentActiveTrack) toggleEditorMusic(currentActiveTrack);
              else setLeftTab('music');
            }}
            title={currentActiveTrack ? (editorPlaying ? 'Pause background song' : 'Listen background song') : 'Choose background song'}
          >
            {editorPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            className="ed-music-name-btn"
            onClick={() => setLeftTab('music')}
            title="Configure background song"
          >
            <Music size={13} />
            <span className="ed-music-title-text">{currentActiveTrack ? currentActiveTrack.name : 'Add Song'}</span>
          </button>
        </div>

        <span className="ed-autosave-pill"><Check size={14} /> Auto-saved</span>
        <div className="ed-history-group">
          <button type="button" className="ed-action-btn" disabled={!canUndo} onClick={onUndo} title="Undo">
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          <button type="button" className="ed-action-btn" disabled={!canRedo} onClick={onRedo} title="Redo">
            <Redo2 size={16} />
            <span>Redo</span>
          </button>
        </div>
        <button type="button" className="ed-preview-btn" onClick={onPreview}>
          <Eye size={16} />
          <span>Preview</span>
        </button>
        <button type="button" className="ed-publish-btn" onClick={onPublish}>
          <Share2 size={16} />
          <span>Publish &amp; Share</span>
        </button>
      </div>
    </div>

    {/* 2. MAIN 3-COLUMN WORKSPACE */}
    <div className="ed-main-stage">
      {/* LEFT SIDEBAR: TOOL TABS & ASSET PICKER */}
      <aside className="ed-left-sidebar">
        {/* Top category tabs: Layouts, Backgrounds, Stickers, Text, Elements, Music */}
        <div className="ed-tool-tabs">
          <button type="button" className={leftTab === 'layouts' ? 'active' : ''} onClick={() => setLeftTab('layouts')}>Layouts</button>
          <button type="button" className={leftTab === 'backgrounds' ? 'active' : ''} onClick={() => setLeftTab('backgrounds')}>Backgrounds</button>
          <button type="button" className={leftTab === 'stickers' ? 'active' : ''} onClick={() => setLeftTab('stickers')}>Stickers</button>
          <button type="button" className={leftTab === 'text' ? 'active' : ''} onClick={() => setLeftTab('text')}>Text</button>
          <button type="button" className={leftTab === 'elements' ? 'active' : ''} onClick={() => setLeftTab('elements')}>Elements</button>
          <button type="button" className={leftTab === 'music' ? 'active' : ''} onClick={() => setLeftTab('music')}>Music</button>
        </div>

        {/* LAYOUTS TAB CONTENT */}
        {leftTab === 'layouts' && (
          <div className="ed-layouts-panel">
            {/* Filter pills: All, Classic, Modern, Collage, Magazine */}
            <div className="ed-filter-pills">
              {['all', 'classic', 'modern', 'collage', 'magazine'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`ed-pill ${layoutCategory === cat ? 'active' : ''}`}
                  onClick={() => setLayoutCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Layout Thumbnails Grid */}
            <div className="ed-layout-thumbs-grid">
              {filteredLayouts.map((l) => {
                const isSelected = page.layout === l.id;
                return (
                  <button
                    type="button"
                    key={l.id}
                    className={`ed-layout-thumb-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onLayout(l.id)}
                    title={l.hint}
                  >
                    <div className="ed-thumb-visual">
                      <LayoutIcon id={l.id} />
                      {isSelected && <div className="ed-thumb-check"><Check size={12} /></div>}
                    </div>
                    <span className="ed-thumb-label">{l.name.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BACKGROUNDS TAB CONTENT */}
        {leftTab === 'backgrounds' && (
          <div className="ed-panel-inner">
            <div className="ed-section-title">Canvas Background Theme</div>
            <div className="ed-theme-grid">
              {SCRAPBOOK_THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`ed-theme-card ${page.scrapbookTheme === t.id ? 'active' : ''}`}
                  onClick={() => onUpdatePage({ storyMode: true, scrapbookTheme: t.id })}
                >
                  <span className="ed-theme-icon">{t.icon}</span>
                  <b>{t.name}</b>
                </button>
              ))}
            </div>
            <div className="ed-color-palette-block">
              <span className="ed-sub-heading">Solid Warm Hues</span>
              <div className="ed-color-bubbles">
                {['#fffdf9', '#fbf5ee', '#f8ebd9', '#ebdcd0', '#e5efe9', '#e8edf8', '#2e2017'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="ed-color-bubble"
                    style={{ backgroundColor: c }}
                    onClick={() => onUpdatePage({ pageBgColor: c })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STICKERS TAB CONTENT */}
        {leftTab === 'stickers' && (
          <div className="ed-panel-inner">
            <div className="ed-section-title">Romantic & Family Stickers</div>
            <div className="ed-sticker-catalog">
              {SCRAPBOOK_STICKERS.map((st) => {
                const active = (page.stickers || []).includes(st);
                return (
                  <button
                    type="button"
                    key={st}
                    className={`ed-sticker-chip ${active ? 'active' : ''}`}
                    onClick={() => onUpdatePage({ storyMode: true, stickers: active ? (page.stickers || []).filter((x) => x !== st) : [...(page.stickers || []), st] })}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TEXT TAB CONTENT */}
        {leftTab === 'text' && (
          <div className="ed-panel-inner">
            <button type="button" className="ed-add-text-btn" onClick={() => addTextBox()}>
              <Plus size={16} /> Add Heading Text
            </button>
            <div className="ed-section-title" style={{ marginTop: '14px' }}>Romantic Quotes</div>
            <div className="ed-quote-list">
              {WEDDING_QUOTE_PRESETS.map((q, i) => (
                <button type="button" key={i} className="ed-quote-item" onClick={() => addTextBox(q)}>
                  <span style={{ fontFamily: q.font }}>{q.title}</span>
                  <Plus size={13} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ELEMENTS TAB CONTENT */}
        {leftTab === 'elements' && (
          <div className="ed-panel-inner">
            <div className="ed-section-title">Frame Embellishments</div>
            <div className="ed-element-options">
              {FRAME_STYLES.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  className={`ed-frame-opt ${page.frameStyle === f.id ? 'active' : ''}`}
                  onClick={() => onUpdatePage({ storyMode: true, frameStyle: f.id })}
                >
                  <b>{f.name}</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MUSIC TAB CONTENT */}
        {leftTab === 'music' && (
          <div className="ed-music-panel">
            {/* Active Track Hero Card */}
            {currentActiveTrack ? (
              <div className={`ed-music-hero ${editorPlaying ? 'is-playing' : ''}`}>
                {/* Vinyl + Info */}
                <div className="ed-music-hero-top">
                  <div className={`ed-vinyl ${editorPlaying ? 'spinning' : ''}`}>
                    <div className="ed-vinyl-inner">
                      <Music size={16} />
                    </div>
                  </div>
                  <div className="ed-music-hero-info">
                    <span className="ed-music-now-label">NOW PLAYING</span>
                    <b className="ed-music-hero-title">{currentActiveTrack.name}</b>
                    <span className="ed-music-scope-chip">
                      {album.musicScope === 'page' ? `📄 Page ${pageIndex + 1} only` : '💿 Whole album'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ed-music-hero-remove"
                    onClick={() => { editorAudioRef.current?.pause(); setEditorPlaying(false); onRemoveActiveMusic?.(); }}
                    title="Remove background music"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Waveform bars (decorative, animate when playing) */}
                <div className="ed-music-waveform" aria-hidden="true">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} style={{ '--i': i }} />
                  ))}
                </div>

                {/* Play/Pause + Volume Row */}
                <div className="ed-music-controls-row">
                  <button
                    type="button"
                    className={`ed-music-big-play ${editorPlaying ? 'playing' : ''}`}
                    onClick={() => toggleEditorMusic(currentActiveTrack)}
                  >
                    {editorPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <div className="ed-music-vol-row">
                    <Volume2 size={13} />
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={editorAudioVolume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setEditorAudioVolume(v);
                        if (editorAudioRef.current) editorAudioRef.current.volume = v;
                      }}
                    />
                    <span>{Math.round(editorAudioVolume * 100)}%</span>
                  </div>
                </div>

                {/* Scope Pills */}
                <div className="ed-music-scope-row">
                  <span>Play on:</span>
                  <div className="ed-music-scope-pills">
                    <button
                      type="button"
                      className={album.musicScope !== 'page' ? 'active' : ''}
                      onClick={() => onSetActiveMusic?.(currentActiveTrack.id, 'album')}
                    >
                      Whole Album
                    </button>
                    <button
                      type="button"
                      className={album.musicScope === 'page' ? 'active' : ''}
                      onClick={() => onSetActiveMusic?.(currentActiveTrack.id, 'page')}
                    >
                      This Page
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ed-music-empty-hero">
                <div className="ed-music-empty-icon">
                  <Music size={28} />
                </div>
                <b>No Music Selected</b>
                <p>Upload a song or pick an ambient melody below to add background music to your album.</p>
              </div>
            )}

            {/* Upload Zone */}
            <label className="ed-music-upload-zone">
              <div className="ed-music-upload-icon"><Upload size={18} /></div>
              <div className="ed-music-upload-text">
                <b>Upload Your Song</b>
                <span>MP3, WAV, OGG supported</span>
              </div>
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadMusic(f); e.target.value = ''; }} />
            </label>

            {/* Uploaded Library */}
            {album.musicLibrary && album.musicLibrary.length > 0 && (
              <div className="ed-music-section">
                <div className="ed-music-section-label">
                  <Music size={13} /> Your Uploads
                </div>
                <div className="ed-music-track-list">
                  {album.musicLibrary.map((m) => {
                    const isActive = (album.musicScope === 'page' ? page.musicId : album.musicId) === m.id;
                    const isPlaying = editorPlaying && editorAudioTrackId === m.id;
                    return (
                      <div key={m.id} className={`ed-music-track-row ${isActive ? 'active' : ''}`}>
                        <button type="button" className="ed-music-track-play" onClick={() => toggleEditorMusic(m)}>
                          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <div className="ed-music-track-meta">
                          <b>{m.name}</b>
                          {isActive && <span className="ed-music-active-badge">Active</span>}
                        </div>
                        <div className="ed-music-track-btns">
                          {!isActive && (
                            <button type="button" className="ed-music-use-btn" onClick={() => onSetActiveMusic?.(m.id, 'album')}>Use</button>
                          )}
                          <button type="button" className="ed-music-del-btn" onClick={() => onDeleteMusic?.(m.id)} title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preset Melodies */}
            <div className="ed-music-section">
              <div className="ed-music-section-label">
                <Music size={13} /> Ambient Melodies
                <span className="ed-music-section-sub">Royalty-free</span>
              </div>
              <div className="ed-music-preset-grid">
                {getPresetAudioTracks().map((preset) => {
                  const isActive = currentActiveTrack?.name === preset.name;
                  const isPlaying = editorPlaying && editorAudioTrackId === preset.id;
                  return (
                    <div key={preset.id} className={`ed-music-preset-card ${isActive ? 'active' : ''}`}>
                      <button type="button" className="ed-music-preset-play" onClick={() => toggleEditorMusic(preset)}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <div className="ed-music-preset-info">
                        <b>{preset.name}</b>
                        <span>{preset.tag}</span>
                      </div>
                      <button
                        type="button"
                        className={`ed-music-preset-use ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectPresetMusic?.(preset)}
                      >
                        {isActive ? '✓' : 'Use'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* CENTER CANVAS WORKSPACE */}
      <section className="ed-center-stage">
        {/* Floating Top Control Strip */}
        <div className="ed-canvas-ctrl-bar">
          <div className="ed-page-stepper">
            <button
              type="button"
              className="ed-step-arrow"
              disabled={pageIndex === 0}
              onClick={() => onPageChange(pageIndex - 1)}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="ed-step-label">Page {pageIndex + 1} of {album.pages.length}</span>
            <button
              type="button"
              className="ed-step-arrow"
              disabled={pageIndex >= album.pages.length - 1}
              onClick={() => onPageChange(pageIndex + 1)}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button type="button" className="ed-add-page-pill" onClick={onAddPage}>
              <Plus size={14} /> Add Page
            </button>
          </div>

          <div className="ed-canvas-tools">
            <button type="button" className="ed-icon-tool" onClick={onDuplicatePage} title="Duplicate page">
              <Copy size={16} />
            </button>
            <button type="button" className="ed-icon-tool" onClick={onDeletePage} title="Delete page">
              <Trash2 size={16} />
            </button>
            <div className="ed-zoom-group">
              <button type="button" onClick={() => setCanvasZoom((z) => clamp(z - 10, 50, 150))}>-</button>
              <span>{canvasZoom}%</span>
              <button type="button" onClick={() => setCanvasZoom((z) => clamp(z + 10, 50, 150))}>+</button>
            </div>
            <button type="button" className="ed-icon-tool" onClick={() => setCanvasZoom(100)} title="Reset view">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="ed-canvas-viewport">
          <div
            className="ed-canvas-zoom-container"
            style={{ transform: `scale(${canvasZoom / 100})`, transformOrigin: 'center center' }}
          >
            <PageCanvas
              page={page}
              photosById={photosById}
              albumAspectRatio={album.aspectRatio}
              editor
              onDragStart={dragStart}
              onDrop={drop}
              onRemove={onRemoveSlot}
              onUpdatePhoto={onUpdatePhoto}
              onReplacePhoto={onReplacePhoto}
              onUpdatePage={onUpdatePage}
              selectedPhoto={selectedPhoto}
              onTapSlot={(idx) => placePhoto(selectedPhoto, idx)}
              activeTextId={activeTextId}
              onSelectText={(id) => { setActiveTextId(id); setRightTab('text'); }}
              onUpdateTextBox={updateTextBox}
              onDeleteTextBox={deleteTextBox}
            />
          </div>
        </div>
      </section>

      {/* RIGHT INSPECTOR PANEL */}
      <aside className="ed-right-sidebar">
        {/* Top inspector tabs: Page, Photo, Text, Element */}
        <div className="ed-inspector-tabs">
          <button type="button" className={rightTab === 'page' ? 'active' : ''} onClick={() => setRightTab('page')}>Page</button>
          <button type="button" className={rightTab === 'photo' ? 'active' : ''} onClick={() => setRightTab('photo')}>Photo</button>
          <button type="button" className={rightTab === 'text' ? 'active' : ''} onClick={() => setRightTab('text')}>Text</button>
          <button type="button" className={rightTab === 'element' ? 'active' : ''} onClick={() => setRightTab('element')}>Element</button>
        </div>

        {/* PAGE TAB CONTENT (Exact match to reference mockup) */}
        {rightTab === 'page' && (
          <div className="ed-inspector-content">
            {/* Page Size */}
            <div className="ed-inspector-field">
              <label>Page Size</label>
              <select
                value={album.sizeStyle || '12x36'}
                onChange={(e) => {
                  const sz = ALBUM_SIZES.find((s) => s.id === e.target.value);
                  if (sz && onUpdateAlbum) {
                    onUpdateAlbum((a) => ({
                      ...a,
                      sizeStyle: sz.id,
                      sizeName: sz.name,
                      sizeDimensions: sz.dimensions,
                      aspectRatio: sz.aspectRatio
                    }));
                  }
                }}
              >
                {ALBUM_SIZES.map((sz) => (
                  <option key={sz.id} value={sz.id}>
                    {sz.name} ({sz.aspectRatio.replace('/', ':')})
                  </option>
                ))}
              </select>
            </div>

            <div className="ed-dimension-row">
              <div>
                <label>Width</label>
                <div className="ed-unit-input">
                  <input type="text" readOnly value="1800" />
                  <span>px</span>
                </div>
              </div>
              <div>
                <label>Height</label>
                <div className="ed-unit-input">
                  <input type="text" readOnly value="1200" />
                  <span>px</span>
                </div>
              </div>
            </div>

            {/* Background */}
            <div className="ed-inspector-field" style={{ marginTop: '16px' }}>
              <label>Background</label>
              <div className="ed-bg-mode-tabs">
                <button
                  type="button"
                  className={bgColorType === 'color' ? 'active' : ''}
                  onClick={() => setBgColorType('color')}
                >
                  <Palette size={14} /> Color
                </button>
                <button
                  type="button"
                  className={bgColorType === 'image' ? 'active' : ''}
                  onClick={() => setBgColorType('image')}
                >
                  <ImageIcon size={14} /> Image
                </button>
                <button
                  type="button"
                  className={bgColorType === 'texture' ? 'active' : ''}
                  onClick={() => setBgColorType('texture')}
                >
                  <Layers size={14} /> Texture
                </button>
              </div>

              {/* Color Swatches Grid */}
              <div className="ed-swatch-row">
                {['#ffffff', '#24201e', '#e67340', '#4a6fa5', '#7ea4b3', '#a3c2c8', '#fceee2', '#faeed2'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    className={`ed-swatch ${(page.pageBgColor || '#fffdf9') === col ? 'selected' : ''}`}
                    style={{ backgroundColor: col }}
                    onClick={() => onUpdatePage({ pageBgColor: col })}
                  />
                ))}
                <label className="ed-custom-color-ring" title="Custom color">
                  <input
                    type="color"
                    value={page.pageBgColor || '#fffdf9'}
                    onChange={(e) => onUpdatePage({ pageBgColor: e.target.value })}
                  />
                  <span>🌈</span>
                </label>
              </div>
            </div>

            {/* Page Effects */}
            <div className="ed-inspector-field" style={{ marginTop: '18px' }}>
              <label>Page Effects</label>
              <div className="ed-effects-grid">
                {[
                  { id: 'none', label: 'None', bg: '#d6d6d6' },
                  { id: 'shadow', label: 'Shadow', bg: '#f1efe9', shadow: 'inset 0 0 10px rgba(0,0,0,.15)' },
                  { id: 'frame', label: 'Frame', bg: '#faf7f2', border: '2px solid #ceb8a3' },
                  { id: 'paper', label: 'Paper', bg: '#fbf4ea', texture: true },
                  { id: 'texture', label: 'Texture', bg: '#faedd7', texture: true }
                ].map((eff) => {
                  const isSel = (page.pageEffect || 'none') === eff.id;
                  return (
                    <button
                      type="button"
                      key={eff.id}
                      className={`ed-effect-card ${isSel ? 'selected' : ''}`}
                      onClick={() => onUpdatePage({ pageEffect: eff.id })}
                    >
                      <div className="ed-eff-box" style={{ backgroundColor: eff.bg, boxShadow: eff.shadow, border: eff.border }} />
                      <span>{eff.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page Number */}
            <div className="ed-inspector-field" style={{ marginTop: '18px' }}>
              <div className="ed-toggle-row">
                <label>Page Number</label>
                <label className="ed-switch">
                  <input
                    type="checkbox"
                    checked={showPageNumber}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setShowPageNumber(val);
                      onUpdatePage({ showPageNumber: val });
                    }}
                  />
                  <span className="ed-switch-slider" />
                </label>
              </div>
              <div className="ed-pos-row">
                <span className="ed-pos-label">Show on page</span>
                <select
                  value={pageNumberPos}
                  onChange={(e) => {
                    const pos = e.target.value;
                    setPageNumberPos(pos);
                    onUpdatePage({ pageNumberPos: pos });
                  }}
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="ed-apply-all-btn"
              onClick={() => {
                if (onUpdateAlbum) {
                  onUpdateAlbum((a) => ({
                    ...a,
                    pages: a.pages.map((p) => ({
                      ...p,
                      pageBgColor: page.pageBgColor,
                      pageEffect: page.pageEffect,
                      showPageNumber,
                      pageNumberPos
                    }))
                  }));
                }
              }}
            >
              Apply to All Pages
            </button>
          </div>
        )}

        {/* PHOTO TAB CONTENT */}
        {rightTab === 'photo' && (
          <div className="ed-inspector-content">
            <div className="ed-inspector-field">
              <label>Photo Adjustment</label>
              <p className="ed-sub-hint">Click on any photo on the canvas to drag, pan, zoom or replace.</p>
            </div>
          </div>
        )}

        {/* TEXT TAB CONTENT */}
        {rightTab === 'text' && (
          <div className="ed-inspector-content">
            {activeTextBox ? (
              <>
                <div className="ed-inspector-field">
                  <label>Message / Quote</label>
                  <textarea
                    rows={3}
                    value={activeTextBox.text || ''}
                    onChange={(e) => updateTextBox(activeTextBox.id, { text: e.target.value })}
                  />
                </div>

                {/* Box Width & Sizing */}
                <div className="ed-inspector-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Box Width ({activeTextBox.width ? `${activeTextBox.width}%` : 'Auto'})</label>
                    <button
                      type="button"
                      style={{ fontSize: '16px', background: 'none', border: 'none', color: '#c65b2d', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      onClick={() => updateTextBox(activeTextBox.id, { width: activeTextBox.width ? undefined : 60 })}
                    >
                      {activeTextBox.width ? 'Reset Auto' : 'Set Width'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="96"
                    value={activeTextBox.width || 60}
                    onChange={(e) => updateTextBox(activeTextBox.id, { width: Number(e.target.value) })}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                    {[
                      { label: 'Narrow', val: 35 },
                      { label: 'Medium', val: 60 },
                      { label: 'Wide', val: 80 },
                      { label: 'Full', val: 95 }
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        className={(activeTextBox.width || 60) === s.val ? 'active' : ''}
                        onClick={() => updateTextBox(activeTextBox.id, { width: s.val })}
                        style={{
                          padding: '6px 2px',
                          fontSize: '16px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: (activeTextBox.width || 60) === s.val ? '#fff5ef' : '#fff',
                          borderColor: (activeTextBox.width || 60) === s.val ? '#ec6b35' : 'var(--line)',
                          color: (activeTextBox.width || 60) === s.val ? '#cf5d31' : '#555',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Box Padding & Spacing */}
                <div className="ed-inspector-field">
                  <label>Box Spacing / Padding ({activeTextBox.padding != null ? `${activeTextBox.padding}px` : '12px'})</label>
                  <input
                    type="range"
                    min="4"
                    max="36"
                    value={activeTextBox.padding != null ? activeTextBox.padding : 12}
                    onChange={(e) => updateTextBox(activeTextBox.id, { padding: Number(e.target.value) })}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
                    {[
                      { label: 'Tight', val: 6 },
                      { label: 'Normal', val: 14 },
                      { label: 'Spacious', val: 24 }
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={(activeTextBox.padding != null ? activeTextBox.padding : 12) === p.val ? 'active' : ''}
                        onClick={() => updateTextBox(activeTextBox.id, { padding: p.val })}
                        style={{
                          padding: '6px 4px',
                          fontSize: '16px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: (activeTextBox.padding != null ? activeTextBox.padding : 12) === p.val ? '#fff5ef' : '#fff',
                          borderColor: (activeTextBox.padding != null ? activeTextBox.padding : 12) === p.val ? '#ec6b35' : 'var(--line)',
                          color: (activeTextBox.padding != null ? activeTextBox.padding : 12) === p.val ? '#cf5d31' : '#555',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ed-inspector-field">
                  <label>Font Family</label>
                  <select
                    value={activeTextBox.font || 'Playfair Display'}
                    onChange={(e) => updateTextBox(activeTextBox.id, { font: e.target.value })}
                  >
                    {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="ed-inspector-field">
                  <label>Font Size ({activeTextBox.fontSize || 26}px)</label>
                  <input
                    type="range"
                    min="16"
                    max="60"
                    value={activeTextBox.fontSize || 26}
                    onChange={(e) => updateTextBox(activeTextBox.id, { fontSize: Number(e.target.value) })}
                  />
                </div>
                <div className="ed-inspector-field">
                  <label>Alignment</label>
                  <div className="segmented">
                    {['left', 'center', 'right'].map((x) => (
                      <button
                        key={x}
                        type="button"
                        className={(activeTextBox.textAlign || 'center') === x ? 'active' : ''}
                        onClick={() => updateTextBox(activeTextBox.id, { textAlign: x })}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ed-inspector-field">
                  <label>Box Style & Theme</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {[
                      { label: 'Clean', val: 'clean' },
                      { label: 'Frosted Glass', val: 'frosted' },
                      { label: 'Gold Card', val: 'gold' },
                      { label: 'Dark Ribbon', val: 'banner' }
                    ].map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        className={(activeTextBox.style || 'clean') === st.val ? 'active' : ''}
                        onClick={() => updateTextBox(activeTextBox.id, { style: st.val })}
                        style={{
                          padding: '8px 4px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: (activeTextBox.style || 'clean') === st.val ? '#fff5ef' : '#fff',
                          borderColor: (activeTextBox.style || 'clean') === st.val ? '#ec6b35' : 'var(--line)',
                          color: (activeTextBox.style || 'clean') === st.val ? '#cf5d31' : '#444',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="ed-apply-all-btn danger-outline"
                  onClick={() => deleteTextBox(activeTextBox.id)}
                >
                  Delete Text Box
                </button>
              </>
            ) : (
              <div className="ed-inspector-empty">
                <p>No text box selected. Click a text box on canvas or add one from the left sidebar.</p>
                <button type="button" className="ed-add-text-btn" onClick={() => addTextBox()}>
                  <Plus size={16} /> Add Text Box
                </button>
              </div>
            )}
          </div>
        )}

        {/* ELEMENT TAB CONTENT */}
        {rightTab === 'element' && (
          <div className="ed-inspector-content">
            <div className="ed-inspector-field">
              <label>Frame Style</label>
              <select
                value={page.frameStyle || 'polaroid'}
                onChange={(e) => onUpdatePage({ storyMode: true, frameStyle: e.target.value })}
              >
                {FRAME_STYLES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="ed-inspector-field">
              <label>Stickers Active ({page.stickers?.length || 0})</label>
              <div className="ed-active-stickers">
                {(page.stickers || []).map((s, i) => (
                  <span key={i} className="ed-sticker-pill">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>

    {/* 3. BOTTOM PHOTO LIBRARY DRAWER */}
    <section className="ed-bottom-drawer">
      {/* Top Drawer Controls */}
      <div className="ed-drawer-topbar">
        {/* Segmented Pill Tabs */}
        <div className="ed-drawer-tabs">
          <button
            type="button"
            className={`ed-drawer-tab ${bottomTab === 'library' ? 'active' : ''}`}
            onClick={() => setBottomTab('library')}
          >
            <ImagePlus size={14} />
            <span>Photo Library</span>
            <span className="ed-tab-badge">{album.photos.length}</span>
          </button>
          <button
            type="button"
            className={`ed-drawer-tab ${bottomTab === 'uploads' ? 'active' : ''}`}
            onClick={() => setBottomTab('uploads')}
          >
            <Upload size={14} />
            <span>My Uploads</span>
          </button>
          <button
            type="button"
            className={`ed-drawer-tab ${bottomTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setBottomTab('favorites')}
          >
            <Heart size={14} />
            <span>Favorites</span>
            {album.photos.filter((p) => p.favorite).length > 0 && (
              <span className="ed-tab-badge">{album.photos.filter((p) => p.favorite).length}</span>
            )}
          </button>
        </div>

        {/* Middle Search */}
        <div className="ed-drawer-middle">
          <div className="ed-search-box">
            <Search size={14} className="ed-search-icon" />
            <input
              type="text"
              value={photoSearch}
              onChange={(e) => setPhotoSearch(e.target.value)}
              placeholder="Search photos..."
            />
            {photoSearch && (
              <button type="button" className="ed-search-clear" onClick={() => setPhotoSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right Sort & Batch Controls */}
        <div className="ed-drawer-right">
          <div className="ed-sort-group">
            <span className="ed-sort-label">Sort:</span>
            <select value={bottomSort} onChange={(e) => setBottomSort(e.target.value)} className="ed-sort-select">
              <option value="newest">Newest</option>
              <option value="name">Name</option>
            </select>
          </div>

          {selectedPhotosList.length > 0 ? (
            <div className="ed-selection-actions">
              <span className="ed-selection-pill">
                {selectedPhotosList.length} selected
              </span>
              <button
                type="button"
                className="ed-add-selected-btn"
                onClick={addSelectedToPage}
                title="Add selected photos to empty slots on page"
              >
                <Plus size={14} /> Add to Page
              </button>
              <button
                type="button"
                className="ed-delete-selected-btn"
                onClick={deleteSelectedPhotos}
                title="Delete selected photos from album"
              >
                <Trash2 size={13} /> Delete ({selectedPhotosList.length})
              </button>
              <button
                type="button"
                className="ed-clear-selected-btn"
                onClick={() => setSelectedPhotosList([])}
                title="Clear selection"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ed-select-all-btn"
              onClick={toggleSelectAll}
              disabled={filtered.length === 0}
            >
              Select All
            </button>
          )}
        </div>
      </div>

      {/* Photo Cards Tray */}
      <div className="ed-photo-carousel-strip">
        {/* Upload Card Tile */}
        <div className="ed-upload-tile" onClick={() => inputPhotosRef.current?.click()}>
          <div className="ed-upload-icon-wrap">
            <Upload size={18} />
          </div>
          <b>Upload Photos</b>
          <span>Drop or click</span>
          <input
            ref={inputPhotosRef}
            hidden
            multiple
            type="file"
            accept="image/*"
            onChange={(e) => onUploadPhotos(e.target.files)}
          />
        </div>

        {/* Upload progress indicator if active */}
        {uploading && (
          <div className="ed-uploading-card">
            <div className="ed-spinner" />
            <span>{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
        )}

        {/* Photo Thumbnail Cards */}
        {filtered.map((p) => {
          const isChecked = selectedPhotosList.includes(p.id);
          const isUsed = usedIds.has(p.id);
          return (
            <div
              key={p.id}
              className={`ed-photo-card ${isChecked ? 'is-checked' : ''} ${selectedPhoto === p.id ? 'is-active-tap' : ''}`}
              draggable
              onDragStart={(e) => dragStart(e, p.id)}
              onClick={() => setSelectedPhoto(selectedPhoto === p.id ? '' : p.id)}
            >
              {/* Image */}
              <img src={p.src} alt={p.name} loading="lazy" />

              {/* Scrim Overlay on hover / active */}
              <div className="ed-card-scrim" />

              {/* Top Action Bar (Checkbox on left, Favorite & Delete on right) */}
              <div className="ed-card-topbar">
                <div
                  className={`ed-photo-checkbox ${isChecked ? 'checked' : ''}`}
                  title={isChecked ? 'Deselect photo' : 'Select photo'}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhotoSelection(p.id);
                  }}
                >
                  {isChecked && <Check size={11} strokeWidth={3} />}
                </div>

                <div className="ed-card-actions">
                  <button
                    type="button"
                    className={`ed-photo-fav-btn ${p.favorite ? 'is-fav' : ''}`}
                    title={p.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePhoto(p.id, { favorite: !p.favorite });
                    }}
                  >
                    <Heart size={12} fill={p.favorite ? '#ef4444' : 'transparent'} color={p.favorite ? '#ef4444' : '#ffffff'} />
                  </button>
                  <button
                    type="button"
                    className="ed-photo-delete-btn"
                    title="Delete photo from album"
                    onClick={(e) => deleteSinglePhoto(e, p.id, p.name)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Bottom Meta Bar (Used status on left, filename on right) */}
              <div className="ed-card-bottombar">
                {isUsed && (
                  <span className="ed-used-badge">
                    <Check size={9} strokeWidth={3} /> Used
                  </span>
                )}
                <span className="ed-photo-filename" title={p.name || 'Photo.jpg'}>
                  {p.name || 'Photo.jpg'}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="ed-empty-photos-msg">
            {bottomTab === 'favorites' ? (
              <>
                <Heart size={18} color="#94a3b8" />
                <span>No favorite photos yet. Click the heart icon on any photo to favorite it.</span>
              </>
            ) : (
              <>
                <ImagePlus size={18} color="#94a3b8" />
                <span>No photos found. Upload photos above or try a different search.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Drawer Bottom Status Bar */}
      <div className="ed-drawer-footer">
        <div className="ed-footer-left">
          <span className="ed-count-label">
            <b>{album.photos.length}</b> {album.photos.length === 1 ? 'photo' : 'photos'} in album
          </span>
          <span className="ed-footer-hint">• Drag photo onto canvas or tap slot</span>
        </div>
        <div className="ed-footer-right">
          {filtered.length > 0 && (
            <button
              type="button"
              className="ed-footer-select-btn"
              onClick={toggleSelectAll}
            >
              {selectedPhotosList.length === filtered.length ? 'Deselect All' : `Select All (${filtered.length})`}
            </button>
          )}
        </div>
      </div>
    </section>
  </main>;
}

function LayoutIcon({ id }) {
  const n = LAYOUT_MAP[id]?.slots || 1;
  return (
    <div className={`mini-layout mini-${id}`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} />
      ))}
      {id === 'photo_text' && <span>T</span>}
    </div>
  );
}

function defaultScrapbookFrame(page, idx) {
  const count = Math.max(1, page.slots?.length || 1);
  const presets = {
    1: [{ x: 10, y: 22, w: 58, h: 58 }],
    2: [{ x: 6, y: 22, w: 42, h: 52 }, { x: 52, y: 30, w: 42, h: 52 }],
    3: [{ x: 5, y: 22, w: 48, h: 56 }, { x: 57, y: 22, w: 37, h: 30 }, { x: 55, y: 56, w: 39, h: 30 }],
    4: [{ x: 5, y: 23, w: 40, h: 34 }, { x: 51, y: 19, w: 42, h: 36 }, { x: 8, y: 61, w: 38, h: 30 }, { x: 52, y: 59, w: 40, h: 31 }],
    5: [{ x: 5, y: 23, w: 38, h: 46 }, { x: 47, y: 20, w: 24, h: 31 }, { x: 73, y: 26, w: 22, h: 29 }, { x: 47, y: 56, w: 25, h: 31 }, { x: 75, y: 60, w: 20, h: 26 }]
  };
  const arr = presets[count] || presets[5];
  return arr[idx] || { x: 8 + (idx % 3) * 29, y: 24 + Math.floor(idx / 3) * 34, w: 26, h: 28 };
}

function PageCanvas({ page, photosById, albumAspectRatio = '3/2', editor = false, onDragStart, onDrop, onRemove, onUpdatePhoto = () => { }, onReplacePhoto = () => { }, onUpdatePage = () => { }, selectedPhoto = '', onTapSlot = () => { }, activeTextId = null, onSelectText = () => { }, onUpdateTextBox = () => { }, onDeleteTextBox = () => { } }) {
  const [activeSlot, setActiveSlot] = useState(null);
  const panRef = useRef(null);
  const textDragRef = useRef(null);
  const textResizeRef = useRef(null);
  const frameDragRef = useRef(null);
  const frameResizeRef = useRef(null);
  useEffect(() => setActiveSlot(null), [page.id]);

  const textBoxes = useMemo(() => {
    if (Array.isArray(page.textBoxes) && page.textBoxes.length > 0) return page.textBoxes;
    if (page.text && page.text.trim()) {
      return [{
        id: 'legacy-text',
        text: page.text,
        x: clamp(Number(page.textX) || 50, 4, 96),
        y: clamp(Number(page.textY) || 84, 4, 96),
        font: page.font || 'Playfair Display',
        fontSize: Number(page.fontSize) || 26,
        textAlign: page.textAlign || 'center',
        color: page.textColor || '#2b211a',
        style: page.textStyle || 'clean'
      }];
    }
    return [];
  }, [page.textBoxes, page.text, page.textX, page.textY, page.font, page.fontSize, page.textAlign, page.textColor, page.textStyle]);

  const scrapbookFrame = (idx) => {
    const raw = page.scrapbookFrames?.[idx] || defaultScrapbookFrame(page, idx);
    return {
      x: clamp(Number(raw.x) || 0, 0, 92), y: clamp(Number(raw.y) || 0, 0, 92),
      w: clamp(Number(raw.w) || 30, 16, 94), h: clamp(Number(raw.h) || 30, 16, 90)
    };
  };
  const updateScrapbookFrame = (idx, patch) => {
    const next = { ...(page.scrapbookFrames || {}), [idx]: { ...scrapbookFrame(idx), ...patch } };
    onUpdatePage({ scrapbookFrames: next });
  };

  const startFrameMove = (e, idx) => {
    if (!editor || !page.storyMode) return;
    e.preventDefault(); e.stopPropagation(); setActiveSlot(idx);
    const paper = e.currentTarget.closest('.album-paper'); const rect = paper?.getBoundingClientRect(); if (!rect) return;
    const frame = scrapbookFrame(idx);
    frameDragRef.current = { idx, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startFrame: frame, width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveFrame = (e) => {
    const drag = frameDragRef.current; if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = ((e.clientX - drag.startX) / drag.width) * 100, dy = ((e.clientY - drag.startY) / drag.height) * 100;
    updateScrapbookFrame(drag.idx, { x: clamp(drag.startFrame.x + dx, 0, 100 - drag.startFrame.w), y: clamp(drag.startFrame.y + dy, 0, 100 - drag.startFrame.h) });
  };
  const endFrameMove = (e) => { if (frameDragRef.current?.pointerId === e.pointerId) frameDragRef.current = null };
  const startFrameResize = (e, idx) => {
    if (!editor || !page.storyMode) return;
    e.preventDefault(); e.stopPropagation(); setActiveSlot(idx);
    const paper = e.currentTarget.closest('.album-paper'); const rect = paper?.getBoundingClientRect(); if (!rect) return;
    const frame = scrapbookFrame(idx);
    frameResizeRef.current = { idx, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startFrame: frame, width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const resizeFrame = (e) => {
    const drag = frameResizeRef.current; if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dw = ((e.clientX - drag.startX) / drag.width) * 100, dh = ((e.clientY - drag.startY) / drag.height) * 100;
    updateScrapbookFrame(drag.idx, { w: clamp(drag.startFrame.w + dw, 16, 100 - drag.startFrame.x), h: clamp(drag.startFrame.h + dh, 16, 100 - drag.startFrame.y) });
  };
  const endFrameResize = (e) => { if (frameResizeRef.current?.pointerId === e.pointerId) frameResizeRef.current = null };

  const [isPanning, setIsPanning] = useState(false);

  const startPan = (e, photo, idx) => {
    if (!editor || selectedPhoto) return;
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault(); e.stopPropagation(); setActiveSlot(idx); setIsPanning(true);
    const paper = e.currentTarget.closest('.photo-slot') || e.currentTarget;
    const rect = paper.getBoundingClientRect();
    const adjust = photoAdjust(photo);
    panRef.current = {
      photoId: photo.id,
      button: e.button,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: adjust.panX,
      startPanY: adjust.panY,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const movePan = (e) => {
    const pan = panRef.current; if (!pan || pan.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = ((e.clientX - pan.startX) / pan.width) * 100;
    const dy = ((e.clientY - pan.startY) / pan.height) * 100;
    const panX = clamp(pan.startPanX + dx, -150, 150);
    const panY = clamp(pan.startPanY + dy, -150, 150);
    onUpdatePhoto(pan.photoId, { panX, panY, focusX: clamp(50 + panX, 0, 100), focusY: clamp(50 + panY, 0, 100) });
  };
  const endPan = (e) => {
    if (panRef.current?.pointerId === e.pointerId) {
      panRef.current = null;
      setIsPanning(false);
    }
  };
  const setZoom = (photo, value) => onUpdatePhoto(photo.id, { zoom: clamp(Number(value), 0.3, 3.5) });
  const resetPhoto = (photo) => onUpdatePhoto(photo.id, { zoom: 1, panX: 0, panY: 0, focusX: 50, focusY: 50, rotation: 0 });

  // Text Anywhere Draggable Handler
  const startTextBoxDrag = (e, tbId) => {
    if (!editor) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('.tb-resize-handle') || e.target.closest('button')) return;
    e.preventDefault(); e.stopPropagation();
    onSelectText(tbId);
    const paper = e.currentTarget.closest('.album-paper');
    const rect = paper?.getBoundingClientRect(); if (!rect) return;
    const currentTb = textBoxes.find((t) => t.id === tbId);
    textDragRef.current = {
      tbId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentTb ? Number(currentTb.x) || 50 : 50,
      origY: currentTb ? Number(currentTb.y) || 84 : 84,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveTextBoxDrag = (e) => {
    const drag = textDragRef.current; if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = ((e.clientX - drag.startX) / drag.width) * 100;
    const dy = ((e.clientY - drag.startY) / drag.height) * 100;
    const nextX = clamp(drag.origX + dx, 4, 96);
    const nextY = clamp(drag.origY + dy, 4, 96);
    onUpdateTextBox(drag.tbId, { x: nextX, y: nextY });
  };
  const endTextBoxDrag = (e) => {
    if (textDragRef.current?.pointerId === e.pointerId) {
      textDragRef.current = null;
    }
  };

  // Text Anywhere Interactive Resize Handler
  const startTextBoxResize = (e, tbId, direction) => {
    if (!editor) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault(); e.stopPropagation();
    onSelectText(tbId);
    const paper = e.currentTarget.closest('.album-paper');
    const rect = paper?.getBoundingClientRect(); if (!rect) return;
    const tbElement = e.currentTarget.closest('.draggable-text-box');
    const tbRect = tbElement?.getBoundingClientRect();
    const currentTb = textBoxes.find((t) => t.id === tbId);

    const currentW = currentTb?.width
      ? Number(currentTb.width)
      : (tbRect && rect.width ? clamp(Math.round((tbRect.width / rect.width) * 100), 18, 96) : 60);

    const currentPad = currentTb?.padding != null ? Number(currentTb.padding) : 12;

    textResizeRef.current = {
      tbId,
      direction,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origW: currentW,
      origPad: currentPad,
      origX: currentTb ? Number(currentTb.x) || 50 : 50,
      origY: currentTb ? Number(currentTb.y) || 50 : 50,
      paperW: Math.max(1, rect.width),
      paperH: Math.max(1, rect.height)
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveTextBoxResize = (e) => {
    const resize = textResizeRef.current; if (!resize || resize.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;
    const dxPercent = (dx / resize.paperW) * 100;
    const patch = {};

    if (resize.direction === 'e') {
      const newW = clamp(resize.origW + dxPercent, 18, 96);
      const deltaW = newW - resize.origW;
      const newX = clamp(resize.origX + deltaW / 2, newW / 2 + 1, 99 - newW / 2);
      patch.width = Math.round(newW);
      patch.x = Math.round(newX * 10) / 10;
    } else if (resize.direction === 'w') {
      const newW = clamp(resize.origW - dxPercent, 18, 96);
      const deltaW = newW - resize.origW;
      const newX = clamp(resize.origX - deltaW / 2, newW / 2 + 1, 99 - newW / 2);
      patch.width = Math.round(newW);
      patch.x = Math.round(newX * 10) / 10;
    } else if (resize.direction === 'se') {
      const newW = clamp(resize.origW + dxPercent, 18, 96);
      const deltaW = newW - resize.origW;
      const newX = clamp(resize.origX + deltaW / 2, newW / 2 + 1, 99 - newW / 2);
      patch.width = Math.round(newW);
      patch.x = Math.round(newX * 10) / 10;
      if (Math.abs(dy) > 6) {
        patch.padding = clamp(Math.round(resize.origPad + dy * 0.15), 4, 38);
      }
    } else if (resize.direction === 'sw') {
      const newW = clamp(resize.origW - dxPercent, 18, 96);
      const deltaW = newW - resize.origW;
      const newX = clamp(resize.origX - deltaW / 2, newW / 2 + 1, 99 - newW / 2);
      patch.width = Math.round(newW);
      patch.x = Math.round(newX * 10) / 10;
      if (Math.abs(dy) > 6) {
        patch.padding = clamp(Math.round(resize.origPad + dy * 0.15), 4, 38);
      }
    } else if (resize.direction === 's') {
      patch.padding = clamp(Math.round(resize.origPad + dy * 0.2), 4, 48);
    }

    onUpdateTextBox(resize.tbId, patch);
  };

  const endTextBoxResize = (e) => {
    if (textResizeRef.current?.pointerId === e.pointerId) {
      textResizeRef.current = null;
    }
  };

  return <div
    className={`album-paper layout-${page.layout} ${page.storyMode ? `scrapbook scrapbook-${page.scrapbookTheme || 'kraft'} frame-${page.frameStyle || 'polaroid'}` : ''}`}
    style={{ aspectRatio: albumAspectRatio || '3/2' }}
  >
    {editor && <div className="print-safe-guide"><span>PRINT SAFE AREA</span></div>}
    {page.storyMode && <ScrapbookDecor page={page} />}
    {page.storyMode && (page.storyTitle || page.storyDate || page.storyLocation) && <div className="scrapbook-story-head">
      {page.storyTitle && <h3>{page.storyTitle}</h3>}
      {(page.storyDate || page.storyLocation) && <div className="scrapbook-meta">{page.storyDate && <span>{page.storyDate}</span>}{page.storyLocation && <span>📍 {page.storyLocation}</span>}</div>}
    </div>}

    {page.layout === 'storytelling' && (
      <div className="storytelling-timeline-bar" aria-hidden="true">
        <span>I. The Beginning</span>
        <span>II. The Promise</span>
        <span>III. Forever Together</span>
      </div>
    )}

    <div className="paper-photo-area">
      {page.layout === 'magazine_style' && (
        <div className="magazine-editorial-strip">
          <span className="mag-issue">THE WEDDING CHRONICLE</span>
          <b className="mag-title">SPECIAL ISSUE</b>
          <div className="mag-bar" />
          <p className="mag-quote">Two souls, one sacred promise</p>
        </div>
      )}

      {page.slots.map((id, idx) => {
        const photo = id ? photosById[id] : null; const adjust = photoAdjust(photo); const frame = page.storyMode ? scrapbookFrame(idx) : null;
        const frameStyle = page.storyMode ? { left: `${frame.x}%`, top: `${frame.y}%`, width: `${frame.w}%`, height: `${frame.h}%` } : undefined;
        return <div key={idx} style={frameStyle} className={`photo-slot slot-${idx} ${editor ? 'editor-slot' : ''} ${editor && selectedPhoto ? 'tap-ready' : ''} ${activeSlot === idx ? 'adjusting' : ''} ${isPanning && activeSlot === idx ? 'panning' : ''} ${page.storyMode ? 'free-scrap-photo' : ''}`} onDragOver={editor ? (e) => e.preventDefault() : undefined} onDrop={editor ? (e) => onDrop(e, idx) : undefined} onContextMenu={editor ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined} onClick={editor && selectedPhoto ? () => onTapSlot(idx) : undefined}>
          {photo ? <>
            <img src={photo.src} alt="" draggable={false} style={{ transform: `translate(${adjust.panX}%, ${adjust.panY}%) scale(${adjust.zoom}) rotate(${adjust.rotation}deg)`, transformOrigin: 'center center', objectPosition: `${adjust.focusX}% ${adjust.focusY}%` }} onPointerDown={editor ? (e) => startPan(e, photo, idx) : undefined} onPointerMove={editor ? movePan : undefined} onPointerUp={editor ? endPan : undefined} onPointerCancel={editor ? endPan : undefined} onContextMenu={editor ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined} onClick={editor && !selectedPhoto ? (e) => { e.stopPropagation(); setActiveSlot(activeSlot === idx ? null : idx) } : undefined} />
            {editor && <><button className="remove-slot" onClick={(e) => { e.stopPropagation(); onRemove(idx); setActiveSlot(null) }}><X size={13} /></button><div className="move-hint"><Move size={13} /> Right click drag to move</div>
              {page.storyMode && <><button type="button" className="frame-move-handle" title="Move photo frame" onPointerDown={(e) => startFrameMove(e, idx)} onPointerMove={moveFrame} onPointerUp={endFrameMove} onPointerCancel={endFrameMove}><Move size={13} /><span>Move</span></button><button type="button" className="frame-resize-handle" title="Resize photo frame" onPointerDown={(e) => startFrameResize(e, idx)} onPointerMove={resizeFrame} onPointerUp={endFrameResize} onPointerCancel={endFrameResize}><span>↘</span></button></>}
              <div className={`photo-adjust-tools ${activeSlot === idx ? 'visible' : ''}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button type="button" title="Zoom out (Minus)" onClick={() => setZoom(photo, adjust.zoom - .1)} disabled={adjust.zoom <= 0.31}><ZoomOut size={14} /></button>
                <input aria-label="Photo zoom" type="range" min="0.3" max="3.5" step="0.05" value={adjust.zoom} onChange={(e) => setZoom(photo, e.target.value)} />
                <button type="button" title="Zoom in (Plus)" onClick={() => setZoom(photo, adjust.zoom + .1)} disabled={adjust.zoom >= 3.49}><ZoomIn size={14} /></button>
                <span className="zoom-val-tag">{Math.round(adjust.zoom * 100)}%</span>
                <button type="button" title="Rotate 90°" onClick={() => onUpdatePhoto(photo.id, { rotation: (adjust.rotation + 90) % 360 })}>↻</button>
                <label className="replace-photo-btn" title="Replace photo">Replace<input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplacePhoto(photo.id, f); e.target.value = '' }} /></label>
                <button type="button" title="Reset photo" className="reset-adjust" onClick={() => resetPhoto(photo)}><RotateCcw size={13} /></button>
              </div></>}
          </> : editor ? <div className="slot-placeholder"><ImagePlus size={24} /><b>{selectedPhoto ? 'Tap to place photo' : 'Drop photo here'}</b><span>Slot {idx + 1}</span></div> : <div className="empty-preview-slot" />}
        </div>
      })}

      {page.layout === 'photo_text' && (
        <div className="photo-text-card">
          <small className="ptc-eyebrow">TWO HEARTS · ONE DESTINY</small>
          <div className="ptc-quote">You Make My Story Complete ♡</div>
          <div className="ptc-divider"><i /><span>❦</span><i /></div>
          <p className="ptc-sub">Forever & Always</p>
        </div>
      )}

      {page.layout === 'overlapping_frames' && (
        <div className="overlapping-script-tag">
          <span>Moments that matter ♡</span>
        </div>
      )}

      {page.layout === 'artistic' && (
        <div className="artistic-script-tag">
          <span>A Beautiful Chaos ♡</span>
        </div>
      )}
    </div>

    {page.storyMode && page.storyNote && <div className="scrapbook-memory-note">{page.storyNote}</div>}

    {/* Draggable & Resizable Text Anywhere layer */}
    {textBoxes.map((tb) => (
      <div
        key={tb.id}
        className={`draggable-text-box text-style-${tb.style || 'clean'} ${editor ? 'editable' : ''} ${activeTextId === tb.id ? 'is-active' : ''}`}
        style={{
          left: `${tb.x}%`,
          top: `${tb.y}%`,
          width: tb.width ? `${tb.width}%` : 'auto',
          maxWidth: '96%',
          minWidth: '70px',
          boxSizing: 'border-box',
          fontFamily: tb.font || 'Playfair Display',
          fontSize: `${tb.fontSize || 26}px`,
          color: tb.color || '#2b211a',
          textAlign: tb.textAlign || 'center',
          padding: tb.padding != null ? `${tb.padding}px` : undefined,
          lineHeight: tb.lineHeight || 1.35
        }}
        onPointerDown={editor ? (e) => startTextBoxDrag(e, tb.id) : undefined}
        onPointerMove={editor ? moveTextBoxDrag : undefined}
        onPointerUp={editor ? endTextBoxDrag : undefined}
        onPointerCancel={editor ? endTextBoxDrag : undefined}
        onClick={editor ? (e) => { e.stopPropagation(); onSelectText?.(tb.id); } : undefined}
      >
        {editor && (
          <div className="tb-action-bar" onPointerDown={(e) => e.stopPropagation()}>
            <span className="tb-handle" title="Drag to move text box" onPointerDown={(e) => startTextBoxDrag(e, tb.id)}>
              <Move size={12} />
            </span>
            <span className="tb-size-pill" title="Box Width">
              {tb.width ? `${tb.width}%` : 'Auto'}
            </span>
            <button
              type="button"
              className="tb-delete-btn"
              title="Delete text box"
              onClick={(e) => { e.stopPropagation(); onDeleteTextBox?.(tb.id); }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {editor && activeTextId === tb.id && (
          <>
            {/* Left Edge Resize Handle */}
            <div
              className="tb-resize-handle tb-resize-w"
              title="Drag left edge to resize width"
              onPointerDown={(e) => startTextBoxResize(e, tb.id, 'w')}
              onPointerMove={moveTextBoxResize}
              onPointerUp={endTextBoxResize}
              onPointerCancel={endTextBoxResize}
            >
              <span className="tb-handle-bar" />
            </div>

            {/* Right Edge Resize Handle */}
            <div
              className="tb-resize-handle tb-resize-e"
              title="Drag right edge to resize width"
              onPointerDown={(e) => startTextBoxResize(e, tb.id, 'e')}
              onPointerMove={moveTextBoxResize}
              onPointerUp={endTextBoxResize}
              onPointerCancel={endTextBoxResize}
            >
              <span className="tb-handle-bar" />
            </div>

            {/* Bottom Spacing Handle */}
            <div
              className="tb-resize-handle tb-resize-s"
              title="Drag bottom edge to adjust spacing / padding"
              onPointerDown={(e) => startTextBoxResize(e, tb.id, 's')}
              onPointerMove={moveTextBoxResize}
              onPointerUp={endTextBoxResize}
              onPointerCancel={endTextBoxResize}
            >
              <span className="tb-handle-bar-h" />
            </div>

            {/* Bottom-Right Corner Handle */}
            <div
              className="tb-resize-handle tb-resize-se"
              title="Drag corner to resize box & spacing"
              onPointerDown={(e) => startTextBoxResize(e, tb.id, 'se')}
              onPointerMove={moveTextBoxResize}
              onPointerUp={endTextBoxResize}
              onPointerCancel={endTextBoxResize}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M8 2L8 8L2 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Bottom-Left Corner Handle */}
            <div
              className="tb-resize-handle tb-resize-sw"
              title="Drag corner to resize box & spacing"
              onPointerDown={(e) => startTextBoxResize(e, tb.id, 'sw')}
              onPointerMove={moveTextBoxResize}
              onPointerUp={endTextBoxResize}
              onPointerCancel={endTextBoxResize}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2L2 8L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Live Size & Spacing Badge */}
            <div className="tb-size-badge" aria-hidden="true">
              {tb.width ? `${tb.width}% W` : 'Auto'} {tb.padding != null ? `· ${tb.padding}px pad` : ''}
            </div>
          </>
        )}

        <div
          className="tb-inner-text"
          contentEditable={editor}
          suppressContentEditableWarning
          onPointerDown={(e) => { e.stopPropagation(); onSelectText?.(tb.id); }}
          onBlur={(e) => {
            if (!editor) return;
            onUpdateTextBox?.(tb.id, { text: e.currentTarget.innerText });
          }}
        >
          {tb.text}
        </div>
      </div>
    ))}
  </div>;
}
function ScrapbookDecor({ page }) {
  const stickers = (page.stickers || []).slice(0, 8);
  return <div className="scrapbook-decor" aria-hidden="true"><i className="tape tape-a" /><i className="tape tape-b" />{stickers.map((st, i) => <span key={`${st}-${i}`} className={`scrap-sticker sticker-${i % 8}`}>{st}</span>)}</div>;
}
function PageText({ page }) { return <div className="page-text" style={{ fontFamily: page.font, fontSize: `${page.fontSize}px`, textAlign: page.textAlign }}>{page.text}</div>; }

function playPageFlipAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const pink = (lastOut + 0.02 * white) / 1.02;
      lastOut = pink;
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.2);
      data[i] = pink * envelope * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.16);
    noise.connect(filter);
    filter.connect(ctx.destination);
    noise.start();
  } catch (e) { }
}

function renderPhotobookLeafContent(page, pageNum, photosById, album, side, isWatermark = false) {
  if (page) {
    return (
      <div className="photobook-leaf-canvas-wrap" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <PageCanvas page={page} photosById={photosById} albumAspectRatio={album.aspectRatio} />
        {isWatermark && (
          <div className="photobook-watermark-stamp" aria-hidden="true">
            <span>Flipora Trial Preview</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`photobook-endpaper endpaper-${side}`}>
      <div className="endpaper-ornament">
        <Heart size={32} className="endpaper-heart" />
        <div className="endpaper-divider" />
        <h3>{album.title}</h3>
        <p>{album.subtitle || 'Our Cherished Moments'}</p>
        <span className="endpaper-tag">THE END · FOREVER TOGETHER ♡</span>
        <small className="endpaper-credit">Flipora Premium Wedding Photobook</small>
      </div>
    </div>
  );
}

function Preview({ album, onBack, onPublish, publicMode = false, plan = null }) {
  const isWatermark = Boolean(plan?.watermark);
  const photosById = useMemo(() => Object.fromEntries(album.photos.map((p) => [p.id, p])), [album.photos]);

  // Compute 2-page facing spreads
  const spreads = useMemo(() => {
    const pages = album.pages || [];
    if (pages.length === 0) return [];
    const list = [];
    for (let i = 0; i < pages.length; i += 2) {
      list.push({
        spreadIndex: list.length,
        leftPage: pages[i] || null,
        leftNum: i + 1,
        rightPage: pages[i + 1] || null,
        rightNum: i + 2 <= pages.length ? i + 2 : null
      });
    }
    return list;
  }, [album.pages]);

  const [spreadIndex, setSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipState, setFlipState] = useState(null); // { direction: 'next'|'prev', fromSpread: number, toSpread: number }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const touchStart = useRef(null);

  const currentSpread = spreads[spreadIndex] || spreads[0];

  // Preview + PDF must use the album's real leaf/spread ratio.
  // The print page size is derived from the physical leaf size so Save PDF opens
  // in the same landscape proportion as the photobook preview (e.g. 36 × 12 in).
  const albumSizeDef = ALBUM_SIZE_MAP[album.sizeStyle] || ALBUM_SIZES[0];
  const leafRatio = Number(albumSizeDef?.ratioValue) || (() => {
    const [w, h] = String(album.aspectRatio || '3/2').split('/').map(Number);
    return w > 0 && h > 0 ? w / h : 1.5;
  })();
  const spreadRatio = leafRatio * 2;
  const leafPhysicalMatch = String(albumSizeDef?.leaf || '').match(/([\d.]+)\s*×\s*([\d.]+)/);
  const printLeafWidthIn = leafPhysicalMatch ? Number(leafPhysicalMatch[1]) : 18;
  const printLeafHeightIn = leafPhysicalMatch ? Number(leafPhysicalMatch[2]) : 12;
  const printSpreadWidthIn = printLeafWidthIn * 2;
  const printSpreadHeightIn = printLeafHeightIn;

  const activeMusicId =
    (album.musicScope === 'page' ? (currentSpread?.leftPage?.musicId || currentSpread?.rightPage?.musicId) : null)
    || album.musicId
    || currentSpread?.leftPage?.musicId
    || currentSpread?.rightPage?.musicId
    || album.musicLibrary?.[0]?.id;

  const track = (album.musicLibrary || []).find((m) => m.id === activeMusicId);

  useEffect(() => {
    if (!audioRef.current) return;
    if (track?.src) {
      if (audioRef.current.dataset.trackId !== track.id) {
        audioRef.current.dataset.trackId = track.id;
        const wasPlaying = playing;
        audioRef.current.src = track.src;
        if (wasPlaying) {
          audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
      }
    } else {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      delete audioRef.current.dataset.trackId;
      setPlaying(false);
    }
  }, [track?.id, track?.src]);

  const toggleMusic = () => {
    if (!audioRef.current || !track) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => { });
    }
  };

  const goToNextSpread = () => {
    if (isFlipping || spreadIndex >= spreads.length - 1) return;
    if (soundEnabled) playPageFlipAudio();
    setIsFlipping(true);
    setFlipState({
      direction: 'next',
      fromSpread: spreadIndex,
      toSpread: spreadIndex + 1
    });
    setTimeout(() => {
      setSpreadIndex((i) => i + 1);
      setIsFlipping(false);
      setFlipState(null);
    }, 620);
  };

  const goToPrevSpread = () => {
    if (isFlipping || spreadIndex <= 0) return;
    if (soundEnabled) playPageFlipAudio();
    setIsFlipping(true);
    setFlipState({
      direction: 'prev',
      fromSpread: spreadIndex,
      toSpread: spreadIndex - 1
    });
    setTimeout(() => {
      setSpreadIndex((i) => i - 1);
      setIsFlipping(false);
      setFlipState(null);
    }, 620);
  };

  const goToSpread = (targetIdx) => {
    if (isFlipping || targetIdx === spreadIndex || targetIdx < 0 || targetIdx >= spreads.length) return;
    const dir = targetIdx > spreadIndex ? 'next' : 'prev';
    if (soundEnabled) playPageFlipAudio();
    setIsFlipping(true);
    setFlipState({
      direction: dir,
      fromSpread: spreadIndex,
      toSpread: targetIdx
    });
    setTimeout(() => {
      setSpreadIndex(targetIdx);
      setIsFlipping(false);
      setFlipState(null);
    }, 620);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goToPrevSpread();
      if (e.key === 'ArrowRight' || e.key === ' ') goToNextSpread();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spreadIndex, spreads.length, isFlipping]);

  const onBookClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX > rect.width * 0.5) {
      goToNextSpread();
    } else {
      goToPrevSpread();
    }
  };

  const touchEnd = (e) => {
    if (touchStart.current == null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(diff) > 40) {
      if (diff < 0) goToNextSpread();
      else goToPrevSpread();
    }
  };

  const fromSpreadObj = flipState ? spreads[flipState.fromSpread] : currentSpread;
  const toSpreadObj = flipState ? spreads[flipState.toSpread] : currentSpread;

  const totalSpreads = spreads.length;
  const leftStackCount = Math.min(8, spreadIndex + 1);
  const rightStackCount = Math.min(8, totalSpreads - spreadIndex);

  return (
    <main className="preview-page photobook-mode">
      <audio ref={audioRef} loop />
      <header className="preview-header">
        <div>
          <button className="preview-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>{publicMode ? 'Back to Flipora' : 'Back to Editor'}</span>
          </button>
          <div className="preview-album-title">
            <small>{publicMode ? 'SHARED WEDDING PHOTOBOOK' : 'PHOTOBOOK SPREAD PREVIEW'}</small>
            <b>{album.title}</b>
          </div>
          <span className="photobook-size-tag">📐 {album.sizeName || '12 × 36 inch'}</span>
        </div>
        <div>
          <button
            type="button"
            className="photobook-sound-toggle"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute page flip sound' : 'Enable realistic page flip sound'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>
          {track && (
            <button
              className={`music-control ${playing ? 'playing' : ''}`}
              onClick={toggleMusic}
              title={playing ? `Pause background music (${track.name})` : `Play background music (${track.name})`}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              <span className="music-control-name">{track.name}</span>
              {playing && (
                <span className="music-waves" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </button>
          )}
          {!publicMode && (
            <button className="secondary" onClick={() => window.print()}>
              <FileText size={15} /> Print / Save PDF
            </button>
          )}
          {!publicMode && (
            <button className="primary" onClick={onPublish}>
              <Share2 size={15} /> Publish & Copy Link
            </button>
          )}
        </div>
      </header>

      {/* 2-Page Photobook Stage */}
      <section className="photobook-stage">
        <button
          className="viewer-arrow arrow-left"
          disabled={spreadIndex === 0 || isFlipping}
          onClick={goToPrevSpread}
          title="Previous Spread (←)"
          aria-label="Previous Spread"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          className="photobook-wrapper"
          onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
          onTouchEnd={touchEnd}
        >
          {/* Spread Top Header Meta */}
          <div className="photobook-spread-meta">
            <div className="meta-left">
              <span className="spread-badge">
                SPREAD {spreadIndex + 1} OF {totalSpreads}
              </span>
              <span className="spread-pages-label">
                Pages {currentSpread?.leftNum} {currentSpread?.rightNum ? `& ${currentSpread.rightNum}` : ''} of {album.pages.length}
              </span>
            </div>

          </div>

          {/* Hardcover Bound Casing with 2 Facing Pages */}
          <div
            className={`photobook-casing ${isFlipping ? `is-flipping flip-${flipState?.direction}` : ''}`}
            style={{ '--leaf-ratio': leafRatio, '--spread-ratio': spreadRatio }}
            onClick={onBookClick}
          >
            {/* Paper stack depth on left edge */}
            <div
              className="photobook-stack stack-left"
              style={{ width: `${Math.max(4, leftStackCount * 2.5)}px` }}
              aria-hidden="true"
            />

            {/* Left Page Side */}
            <div className="photobook-half half-left" title="Click to flip back">
              <div className="photobook-leaf leaf-left">
                {renderPhotobookLeafContent(
                  (isFlipping && flipState?.direction === 'prev') ? toSpreadObj?.leftPage : fromSpreadObj?.leftPage,
                  (isFlipping && flipState?.direction === 'prev') ? toSpreadObj?.leftNum : fromSpreadObj?.leftNum,
                  photosById,
                  album,
                  'left',
                  isWatermark
                )}
                <div className="gutter-fold-shadow fold-left" aria-hidden="true" />
                <div className="leaf-footer footer-left">
                  <span>Page {(isFlipping && flipState?.direction === 'prev') ? toSpreadObj?.leftNum : fromSpreadObj?.leftNum}</span>
                </div>
                {spreadIndex > 0 && !isFlipping && (
                  <div className="page-curl-corner corner-left" title="Click to flip back">
                    <span className="curl-icon">‹</span>
                  </div>
                )}
              </div>
            </div>

            {/* Central Book Spine & Binding Crease */}
            <div className="photobook-spine" aria-hidden="true">
              <div className="spine-stitch" />
              <div className="spine-crease" />
            </div>

            {/* Right Page Side */}
            <div className="photobook-half half-right" title="Click to flip forward">
              <div className="photobook-leaf leaf-right">
                {renderPhotobookLeafContent(
                  (isFlipping && flipState?.direction === 'next') ? toSpreadObj?.rightPage : fromSpreadObj?.rightPage,
                  (isFlipping && flipState?.direction === 'next') ? toSpreadObj?.rightNum : fromSpreadObj?.rightNum,
                  photosById,
                  album,
                  'right',
                  isWatermark
                )}
                <div className="gutter-fold-shadow fold-right" aria-hidden="true" />
                {((isFlipping && flipState?.direction === 'next') ? toSpreadObj?.rightNum : fromSpreadObj?.rightNum) && (
                  <div className="leaf-footer footer-right">
                    <span>Page {(isFlipping && flipState?.direction === 'next') ? toSpreadObj?.rightNum : fromSpreadObj?.rightNum}</span>
                  </div>
                )}
                {spreadIndex < totalSpreads - 1 && !isFlipping && (
                  <div className="page-curl-corner corner-right" title="Click to flip forward">
                    <span className="curl-icon">›</span>
                  </div>
                )}
              </div>
            </div>

            {/* Paper stack depth on right edge */}
            <div
              className="photobook-stack stack-right"
              style={{ width: `${Math.max(4, rightStackCount * 2.5)}px` }}
              aria-hidden="true"
            />

            {/* 3D Dynamic Turning Leaf (Flips like physical book) */}
            {isFlipping && flipState && (
              <div className={`photobook-turning-leaf turning-${flipState.direction}`}>
                {/* Front Face */}
                <div className="turning-face face-front">
                  {flipState.direction === 'next' ? (
                    renderPhotobookLeafContent(fromSpreadObj?.rightPage, fromSpreadObj?.rightNum, photosById, album, 'right', isWatermark)
                  ) : (
                    renderPhotobookLeafContent(fromSpreadObj?.leftPage, fromSpreadObj?.leftNum, photosById, album, 'left', isWatermark)
                  )}
                  <div className="turning-dynamic-shadow" />
                </div>

                {/* Back Face */}
                <div className="turning-face face-back">
                  {flipState.direction === 'next' ? (
                    renderPhotobookLeafContent(toSpreadObj?.leftPage, toSpreadObj?.leftNum, photosById, album, 'left', isWatermark)
                  ) : (
                    renderPhotobookLeafContent(toSpreadObj?.rightPage, toSpreadObj?.rightNum, photosById, album, 'right', isWatermark)
                  )}
                  <div className="turning-dynamic-highlight" />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          className="viewer-arrow arrow-right"
          disabled={spreadIndex >= totalSpreads - 1 || isFlipping}
          onClick={goToNextSpread}
          title="Next Spread (→)"
          aria-label="Next Spread"
        >
          <ChevronRight size={24} />
        </button>
      </section>

      {isWatermark && (
        <div className="preview-trial-watermark-bar preview-trial-watermark-below">
          <span><b>Trial preview</b> · Watermark active</span>
          <small>Upgrade to remove watermark and enable HD download.</small>
        </div>
      )}

      {/* Spread dots navigation */}
      <div className="photobook-spread-dots">
        {spreads.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className={idx === spreadIndex ? 'active' : ''}
            onClick={() => goToSpread(idx)}
            title={`Go to Spread ${idx + 1} (Pages ${s.leftNum}${s.rightNum ? `-${s.rightNum}` : ''})`}
          >
            <span>{idx + 1}</span>
          </button>
        ))}
      </div>


      {/* Browser PDF page size follows the selected physical album size. */}
      <style>{`@media print { @page { size: ${printSpreadWidthIn}in ${printSpreadHeightIn}in; margin: 0; } }`}</style>

      {/* Hidden Print Section for PDF Export
          IMPORTANT: one PDF page = one landscape photobook spread, matching Preview. */}
      <section className="print-album" aria-hidden="true">
        {spreads.map((spread, i) => (
          <div className="print-spread-sheet" key={`print-spread-${i}`}>
            <div className="print-spread-book" style={{ '--leaf-ratio': leafRatio, '--spread-ratio': spreadRatio }}>
              <div className="print-spread-page print-spread-left">
                {renderPhotobookLeafContent(
                  spread.leftPage,
                  spread.leftNum,
                  photosById,
                  album,
                  'left',
                  isWatermark
                )}
              </div>

              <div className="print-spread-spine" aria-hidden="true" />

              <div className="print-spread-page print-spread-right">
                {renderPhotobookLeafContent(
                  spread.rightPage,
                  spread.rightNum,
                  photosById,
                  album,
                  'right',
                  isWatermark
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function PublicShareView({ slug, onExit }) {
  const [album, setAlbum] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let found = null;
      if (isBackendConfigured) {
        try { found = await loadPublicAlbumBackend(slug); }
        catch (err) { console.error('Public album backend lookup failed:', err); }
      }
      if (!found) found = await dbGet(`${PUBLIC_PREFIX}${slug}`);
      if (!cancelled) setAlbum(found ? normalizeAlbum(found) : null);
    })().finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true };
  }, [slug]);
  if (loading) return <div className="loading">Opening shared album…</div>;
  if (!album) return <main className="share-not-found"><BookOpen size={52} /><h1>Album not found</h1><p>This share link is invalid, unpublished, or no longer available.</p><button className="primary" onClick={onExit}>Back to Flipora</button></main>;
  return <Preview album={album} publicMode onBack={onExit} onPublish={() => { }} />;
}

function PlanModal({ current, usedPages, onClose, onSelect }) {
  return (
    <Modal title="Choose Your Plan" onClose={onClose} wide>
      <div className="plan-grid modal-plan-grid">
        {PLANS.map((p) => {
          const isCurrent = current?.id === p.id;
          return (
            <article className={`plan-card ${isCurrent ? 'current' : ''} ${p.popular ? 'popular' : ''} ${p.vip ? 'vip' : ''}`} key={p.id}>
              {p.popular && <span className="p-badge popular">★ Most Popular</span>}
              {p.vip && <span className="p-badge vip">★ Best Value</span>}
              <small className="plan-card-name">{p.name}</small>
              <div className="plan-card-duration">⏱️ Duration: <b>{p.duration}</b></div>
              <h2 className="plan-card-price">{planPrice(p)}</h2>
              <p className="plan-card-desc">{p.description}</p>
              <ul className="plan-card-features">
                <li><Check size={14} /> <b>{p.albums}</b> Album{p.albums > 1 ? 's' : ''}</li>
                <li><Check size={14} /> <b>{p.photos}</b> Photos storage</li>
                <li><Check size={14} /> {p.watermark ? 'Watermark preview' : 'No watermark preview'}</li>
                <li><Check size={14} /> {p.hdDownload ? 'HD PDF download' : 'Preview only'}</li>
                {p.vip && <li><Check size={14} /> <b>Priority support</b></li>}
              </ul>
              <button
                className={`plan-card-btn ${isCurrent ? 'btn-current' : 'btn-select'}`}
                disabled={isCurrent}
                onClick={() => onSelect(p.id)}
              >
                {isCurrent ? 'Current Plan' : 'Select Plan'}
              </button>
            </article>
          );
        })}
      </div>
      <p className="modal-note">Selecting a plan will immediately update your album and photo limits.</p>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide = false }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X /></button></div>{children}</section></div>; }

createRoot(document.getElementById('root')).render(<App />);
