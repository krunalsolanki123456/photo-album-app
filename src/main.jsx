import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Copy, Crown,
  FileText, GripVertical, ImagePlus, LayoutGrid, LogOut, Maximize2, Minimize2, Move, Music, Pause, Play,
  Plus, RotateCcw, Save, Share2, Trash2, Type, Upload, User, Volume2, X, ZoomIn, ZoomOut, Eye, EyeOff
} from 'lucide-react';
import './styles.css';

const DB_NAME = 'clickflip-photo-album';
const STORE = 'album';
const AUTH_USERS_KEY = 'clickflip_users_v1';
const AUTH_SESSION_KEY = 'clickflip_session_v1';
const REMEMBER_LOGIN_KEY = 'clickflip_saved_login_v1';
const USER_ALBUMS_PREFIX = 'albums_v4:';
const PUBLIC_PREFIX = 'public_album_v1:';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, pages: 5, description: 'Up to 5 pages' },
  { id: 'starter', name: 'Starter', price: 100, pages: 10, description: 'Up to 10 pages' },
  { id: 'plus', name: 'Plus', price: 200, pages: 20, description: 'Up to 20 pages' },
  { id: 'unlimited', name: 'Unlimited', price: 500, pages: Infinity, description: 'Unlimited pages' }
];
const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));

const LAYOUTS = [
  { id: 'single', name: '1 Photo', slots: 1, hint: 'Full page' },
  { id: 'split', name: '2 Photos', slots: 2, hint: '50 / 50 split' },
  { id: 'trio', name: '3 Photos', slots: 3, hint: 'Hero + 2' },
  { id: 'grid4', name: '4 Photos', slots: 4, hint: '2 × 2 grid' },
  { id: 'collage5', name: '5 Photos', slots: 5, hint: 'Editorial collage' }
];
const LAYOUT_MAP = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

const FONTS = [
  { value: 'Playfair Display', label: 'Elegant Serif' },
  { value: 'DM Sans', label: 'Clean Sans' },
  { value: 'Georgia', label: 'Classic' },
  { value: 'Courier New', label: 'Typewriter' },
  { value: 'Brush Script MT', label: 'Handwritten' }
];

const SCRAPBOOK_THEMES = [
  { id: 'kraft', name: 'Kraft Story', icon: '📜' },
  { id: 'travel', name: 'Travel Diary', icon: '✈️' },
  { id: 'love', name: 'Love Story', icon: '❤' },
  { id: 'birthday', name: 'Celebration', icon: '🎂' },
  { id: 'baby', name: 'Little Moments', icon: '🧸' },
  { id: 'vintage', name: 'Vintage Notes', icon: '📷' }
];
const SCRAPBOOK_STICKERS = ['✨','❤','★','📍','🌿','🎈','✈️','📷'];
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
  const panX = Number.isFinite(Number(photo?.panX))
    ? Number(photo.panX)
    : Number.isFinite(Number(photo?.focusX))
    ? (Number(photo.focusX) - 50) * 1.5
    : 0;
  const panY = Number.isFinite(Number(photo?.panY))
    ? Number(photo.panY)
    : Number.isFinite(Number(photo?.focusY))
    ? (Number(photo.focusY) - 50) * 1.5
    : 0;
  return {
    zoom: clamp(Number(photo?.zoom) || 1, 0.6, 3.5),
    panX: clamp(panX, -100, 100),
    panY: clamp(panY, -100, 100),
    fit: photo?.fit === 'contain' ? 'contain' : 'cover'
  };
};
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

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
function planPrice(plan) { return plan.price === 0 ? 'Free' : `₹${plan.price}`; }

function blankPage() {
  return {
    id: makeId(), layout: 'single', slots: [null],
    text: '', font: 'Playfair Display', fontSize: 28, textAlign: 'center', textPosition: 'bottom', textX: 50, textY: 84,
    musicId: '',
    storyMode: false, scrapbookTheme: 'kraft', frameStyle: 'polaroid',
    storyTitle: '', storyDate: '', storyLocation: '', storyNote: '', stickers: [], scrapbookFrames: {}
  };
}

function normalizeAlbum(album) {
  const photos = (album.photos || []).map((p) => ({
    ...p,
    id: p.id || makeId(), src: p.src, name: p.name || 'Photo', createdAt: p.createdAt || Date.now(),
    ...photoAdjust(p)
  }));
  let musicLibrary = Array.isArray(album.musicLibrary) ? album.musicLibrary : [];
  if (album.audio?.src && !musicLibrary.some((m) => m.src === album.audio.src)) {
    musicLibrary = [{ id: makeId(), name: album.audio.name || 'Album Music', src: album.audio.src }, ...musicLibrary];
  }
  if (Array.isArray(album.pages) && album.pages.length) {
    return {
      ...album, photos, musicLibrary,
      pages: album.pages.map((p) => {
        const layout = LAYOUT_MAP[p.layout] ? p.layout : 'single';
        const slots = Array.from({ length: LAYOUT_MAP[layout].slots }, (_, i) => p.slots?.[i] || null);
        const legacyPosition = p.textPosition || 'bottom';
        const fallbackX = 50;
        const fallbackY = legacyPosition === 'top' ? 12 : legacyPosition === 'overlay' ? 76 : 88;
        return {
          ...blankPage(), ...p, id: p.id || makeId(), layout, slots,
          textPosition: p.storyMode ? 'free' : 'bottom',
          textX: clamp(Number.isFinite(Number(p.textX)) ? Number(p.textX) : fallbackX, 4, 96),
          textY: clamp(Number.isFinite(Number(p.textY)) ? Number(p.textY) : fallbackY, 4, 96),
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
    pages.push({ ...blankPage(), layout: legacyLayout, slots: photos.slice(i, i + slotCount).map((p) => p.id) });
  }
  if (!pages.length) pages.push(blankPage());
  return { ...album, photos, pages, musicLibrary, cover: album.cover || photos[0]?.src || '', shareSlug: album.shareSlug || '' };
}


function LandingPage({ onLogin, onRegister }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const albums = [
    { title: 'Wedding Memories', count: '24 photos', kind: 'wedding' },
    { title: 'Baby Moments', count: '18 photos', kind: 'baby' },
    { title: 'Family Trip', count: '32 photos', kind: 'travel' },
    { title: 'Birthday Album', count: '20 photos', kind: 'birthday' }
  ];
  return <main className="landing-page">
    <header className="landing-header">
      <button className="landing-brand" onClick={()=>scrollTo('home')} aria-label="ClickFlip home"><span><BookOpen size={20}/></span><b>ClickFlip</b></button>
      <nav className="landing-nav" aria-label="Main navigation">
        <button className="active" onClick={()=>scrollTo('home')}>Home</button>
        <button onClick={()=>scrollTo('features')}>Features</button>
        <button onClick={()=>scrollTo('pricing')}>Pricing</button>
        <button onClick={()=>scrollTo('templates')}>Templates</button>
        <button onClick={()=>scrollTo('about')}>About</button>
      </nav>
      <div className="landing-auth-actions"><button className="landing-login" onClick={onLogin}>Login</button><button className="landing-get-started" onClick={()=>onRegister('free')}>Get Started</button></div>
    </header>

    <section id="home" className="landing-hero">
      <div className="hero-copy-block">
        <div className="hero-eyebrow">YOUR MEMORIES. BEAUTIFULLY TOLD.</div>
        <h1>Create Stunning<br/>Photo Albums<br/>in Minutes</h1>
        <p>Turn your special moments into beautiful digital albums with a real page-flip experience.</p>
        <div className="hero-actions"><button className="hero-primary" onClick={()=>onRegister('free')}>Get Started Free <ChevronRight size={16}/></button><button className="hero-demo" onClick={()=>scrollTo('templates')}><span><Play size={13} fill="currentColor"/></span> Watch Demo</button></div>
        <div className="hero-trust"><span><Check size={14}/> No card required</span><span><Check size={14}/> 5 pages free</span><span><Check size={14}/> Mobile friendly</span></div>
      </div>
      <div className="hero-art" aria-label="ClickFlip album preview">
        <div className="hero-polaroid hero-polaroid-left"><div className="mini-scene scene-family"><i/><i/><i/></div></div>
        <div className="hero-polaroid hero-polaroid-right"><div className="mini-scene scene-sunset"><i/><i/></div></div>
        <div className="hero-book-shadow"/>
        <div className="hero-book-cover"><span>Good<br/>Things<br/>Live Forever</span><b>♡</b></div>
        <div className="hero-photo-strip"><div className="mini-scene scene-travel"><i/><i/></div></div>
      </div>
    </section>

    <section id="templates" className="landing-albums">
      <div className="section-head"><div><small>READY-TO-START IDEAS</small><h2>Albums for every story</h2></div><button onClick={()=>onRegister('free')}>Create your album <ChevronRight size={15}/></button></div>
      <div className="landing-album-grid">{albums.map((a)=><article className="landing-album-card" key={a.title}>
        <div className={`landing-thumb ${a.kind}`}><div className="thumb-scene"><i/><i/><i/></div></div>
        <h3>{a.title}</h3><p>{a.count}</p>
      </article>)}</div>
    </section>

    <section id="features" className="landing-feature-strip">
      <article><span><Upload size={19}/></span><div><b>Upload</b><small>Add all photos once</small></div></article>
      <article><span><LayoutGrid size={19}/></span><div><b>Create</b><small>Build every page</small></div></article>
      <article><span><Music size={19}/></span><div><b>Add Music</b><small>Music per page</small></div></article>
      <article><span><Type size={19}/></span><div><b>Tell Stories</b><small>Scrapbook & text</small></div></article>
      <article><span><Share2 size={19}/></span><div><b>Share</b><small>Publish with a link</small></div></article>
    </section>

    <section id="pricing" className="landing-pricing">
      <div className="pricing-intro"><small>Simple & Affordable Plans</small><p>Start free, upgrade anytime.</p></div>
      <div className="landing-plan-list">{PLANS.map((p)=><button key={p.id} className={p.id==='unlimited'?'featured':''} onClick={()=>onRegister(p.id)}>
        {p.id==='unlimited'&&<Crown size={14}/>}<b>{planPrice(p)}</b><span>{p.pages===Infinity?'Unlimited':`${p.pages} pages`}</span>
      </button>)}</div>
    </section>

    <section id="about" className="landing-about">
      <div><BookOpen size={28}/><span><b>ClickFlip</b><small>More than photos. Brighter tomorrows.</small></span></div>
      <p>Design page-by-page albums, scrapbook your favorite moments, add music and share the finished story with people you love.</p>
      <button onClick={()=>onRegister('free')}>Start your first album</button>
    </section>
  </main>;
}

function AuthScreen({ onAuthenticated, initialMode='login', initialPlan='free', onBack }) {
  const savedLogin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null'); } catch { return null; }
  }, []);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(savedLogin?.email || '');
  const [password, setPassword] = useState(savedLogin?.password || '');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(Boolean(savedLogin?.email && savedLogin?.password));
  const [plan, setPlan] = useState(initialPlan);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) throw new Error('Email aur password enter karein.');
      const users = readUsers();
      const passwordHash = await hashPassword(password);
      if (mode === 'login') {
        const found = users.find((u) => u.email === cleanEmail && u.passwordHash === passwordHash);
        if (!found) throw new Error('Email ya password incorrect hai.');
        if (rememberLogin) localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ email: cleanEmail, password }));
        else localStorage.removeItem(REMEMBER_LOGIN_KEY);
        onAuthenticated(found); return;
      }
      if (!name.trim()) throw new Error('Apna naam enter karein.');
      if (password.length < 6) throw new Error('Password kam se kam 6 characters ka rakhein.');
      if (password !== confirm) throw new Error('Confirm password match nahi ho raha.');
      if (users.some((u) => u.email === cleanEmail)) throw new Error('Is email se account already registered hai.');
      const user = { id: makeId(), name: name.trim(), email: cleanEmail, passwordHash, plan, createdAt: Date.now() };
      writeUsers([...users, user]); onAuthenticated(user);
    } catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return <main className="auth-page">
    <section className="auth-visual">
      <div className="logo"><span><BookOpen size={24}/></span><b>ClickFlip</b></div>
      <div className="auth-copy">
        <small>YOUR MEMORIES, BEAUTIFULLY TOLD.</small>
        <h1>Create photo albums that feel handcrafted.</h1>
        <p>Upload your memories once. Design every page yourself with collages, text and music, then share the finished album.</p>
      </div>
      <div className="auth-album-demo">
        <div className="demo-page a">Good times<br/>live forever ♡</div>
        <div className="demo-page b"><Camera size={42}/><span>Your photo story</span></div>
      </div>
    </section>
    <section className="auth-form-side">
      <div className="auth-card">
        {onBack && <button type="button" className="auth-back-home" onClick={onBack}><ArrowLeft size={15}/> Back to Home</button>}
        <div className="auth-tabs">
          <button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Login</button>
          <button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Register</button>
        </div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p>{mode === 'login' ? 'Continue creating your albums.' : 'Choose a plan and start designing.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Full name<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name"/></label>}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label>Password
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Minimum 6 characters"/>
              <button type="button" className="password-toggle" onClick={()=>setShowPassword((v)=>!v)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </label>
          {mode === 'login' && <label className="remember-login">
            <input type="checkbox" checked={rememberLogin} onChange={(e)=>{
              const checked = e.target.checked; setRememberLogin(checked);
              if (!checked) localStorage.removeItem(REMEMBER_LOGIN_KEY);
            }}/>
            <span><b>Save ID & Password</b><small>Only on this browser</small></span>
          </label>}
          {mode === 'register' && <>
            <label>Confirm password
              <div className="password-field">
                <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Repeat password"/>
                <button type="button" className="password-toggle" onClick={()=>setShowConfirm((v)=>!v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} title={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </label>
            <div className="register-plan-title">Choose your plan</div>
            <div className="register-plans">
              {PLANS.map((p)=><button type="button" key={p.id} className={plan===p.id?'selected':''} onClick={()=>setPlan(p.id)}>
                <b>{planPrice(p)}</b><span>{p.pages===Infinity?'Unlimited':`${p.pages} pages`}</span>{p.id==='unlimited'&&<Crown size={13}/>} 
              </button>)}
            </div>
          </>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary wide" disabled={busy}>{busy?'Please wait...':mode==='login'?'Log In':'Create Account'}</button>
        </form>
      </div>
    </section>
  </main>;
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch { return null; }
  });
  const [publicView, setPublicView] = useState('home');
  const [authPlan, setAuthPlan] = useState('free');
  const [shareSlug, setShareSlug] = useState(() => location.hash.startsWith('#/share/') ? location.hash.replace('#/share/','') : '');

  useEffect(() => {
    const h = () => setShareSlug(location.hash.startsWith('#/share/') ? location.hash.replace('#/share/','') : '');
    window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h);
  }, []);

  if (shareSlug) return <PublicShareView slug={shareSlug} onExit={()=>{location.hash=''; setShareSlug('')}}/>;

  const onAuthenticated = (user) => { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user)); setSession(user); };
  const logout = () => { localStorage.removeItem(AUTH_SESSION_KEY); setSession(null); setPublicView('home'); };
  const changePlan = (planId) => {
    const users = readUsers().map((u)=>u.id===session.id?{...u,plan:planId}:u); writeUsers(users);
    const updated = {...session,plan:planId}; localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated)); setSession(updated);
  };
  const openAuth = (mode, planId='free') => { setAuthPlan(planId); setPublicView(mode); window.scrollTo({top:0,behavior:'smooth'}); };

  if (session) return <Workspace user={session} onLogout={logout} onPlanChange={changePlan}/>;
  if (publicView === 'home') return <LandingPage onLogin={()=>openAuth('login')} onRegister={(planId)=>openAuth('register',planId)}/>;
  return <AuthScreen key={`${publicView}-${authPlan}`} initialMode={publicView} initialPlan={authPlan} onAuthenticated={onAuthenticated} onBack={()=>setPublicView('home')}/>;
}

function Workspace({ user, onLogout, onPlanChange }) {
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
  const [photoSearch, setPhotoSearch] = useState('');
  const inputPhotosRef = useRef(null);

  const storageKey = `${USER_ALBUMS_PREFIX}${user.id}`;
  const activePlan = PLAN_MAP[user.plan] || PLAN_MAP.free;

  useEffect(() => {
    (async()=>{
      let saved = await dbGet(storageKey);
      if (!saved) {
        const older = await dbGet(`albums_v2:${user.id}`) || await dbGet('albums_v2');
        saved = Array.isArray(older) && older.length ? older : [];
      }
      const normalized = saved.map(normalizeAlbum);
      setAlbums(normalized);
      setActiveId(normalized[0]?.id || '');
      setLoaded(true);
    })().catch(console.error);
  }, [storageKey]);

  useEffect(()=>{ if (loaded) dbSet(storageKey, albums).catch(console.error); }, [albums,loaded,storageKey]);

  const currentAlbum = useMemo(()=>albums.find((a)=>a.id===activeId) || albums[0] || null,[albums,activeId]);
  const usedPages = useMemo(()=>albums.reduce((sum,a)=>sum+(a.pages?.length||0),0),[albums]);
  const remainingPages = activePlan.pages===Infinity ? Infinity : Math.max(0,activePlan.pages-usedPages);

  const updateAlbum = (updater) => setAlbums((prev)=>prev.map((a)=>a.id!==activeId?a:(typeof updater==='function'?updater(a):{...a,...updater})));
  const setToast = (msg) => { setNotice(msg); window.clearTimeout(window.__cfToast); window.__cfToast=setTimeout(()=>setNotice(''),3200); };

  const createAlbum = () => {
    if (activePlan.pages!==Infinity && usedPages>=activePlan.pages) { setPlanOpen(true); setToast('Page limit complete. Upgrade plan to create another page.'); return; }
    const album = normalizeAlbum({ id:makeId(), title:newTitle.trim()||`My Album ${albums.length+1}`, subtitle:newSubtitle.trim()||'A beautiful memory book', cover:'', photos:[], pages:[blankPage()], musicLibrary:[], shareSlug:'', createdAt:Date.now() });
    setAlbums((p)=>[...p,album]); setActiveId(album.id); setEditorPage(0); setScreen('editor'); setCreateOpen(false); setNewTitle(''); setNewSubtitle('');
  };

  const deleteAlbum = (id) => {
    if (!confirm('Delete this album?')) return;
    const next = albums.filter((a)=>a.id!==id); setAlbums(next); if (activeId===id) setActiveId(next[0]?.id||'');
  };

  const uploadPhotos = async (files) => {
    if (!currentAlbum || !files?.length) return;
    const imgs = Array.from(files).filter((f)=>f.type.startsWith('image/')); if (!imgs.length) return;
    setUploading(true);
    try {
      const next=[]; for (const f of imgs) next.push({id:makeId(),name:f.name,src:await fileToDataUrl(f),createdAt:Date.now(),zoom:1,focusX:50,focusY:50});
      updateAlbum((a)=>({...a,photos:[...a.photos,...next],cover:a.cover||next[0]?.src||a.cover}));
      setToast(`${next.length} photo(s) uploaded. Ab layout select karke drag & drop karein.`);
      setScreen('editor');
    } finally { setUploading(false); }
  };

  const deleteUploadedPhoto = (photoId) => {
    if (!confirm('Kya aap is uploaded photo ko album se permanently delete karna chahte hain?')) return;
    updateAlbum((a) => {
      const nextPhotos = a.photos.filter((p) => p.id !== photoId);
      const nextPages = a.pages.map((p) => ({
        ...p,
        slots: p.slots.map((id) => (id === photoId ? null : id))
      }));
      const nextCover = a.cover === a.photos.find((p) => p.id === photoId)?.src
        ? (nextPhotos[0]?.src || '')
        : a.cover;
      return {
        ...a,
        photos: nextPhotos,
        pages: nextPages,
        cover: nextCover
      };
    });
    setToast('Photo delete ho gayi.');
  };

  const clearUnusedPhotos = () => {
    if (!currentAlbum) return;
    const usedIds = new Set(currentAlbum.pages.flatMap((p) => p.slots.filter(Boolean)));
    const unusedCount = currentAlbum.photos.filter((p) => !usedIds.has(p.id)).length;
    if (unusedCount === 0) {
      setToast('Saari photos pages par use ho chuki hain.');
      return;
    }
    if (!confirm(`Kya aap ${unusedCount} unused photos ko library se delete karna chahte hain?`)) return;
    updateAlbum((a) => {
      const nextPhotos = a.photos.filter((p) => usedIds.has(p.id));
      return { ...a, photos: nextPhotos };
    });
    setToast(`${unusedCount} unused photos delete ho gayi.`);
  };

  const updatePage = (pageIndex, patch) => updateAlbum((a)=>({...a,pages:a.pages.map((p,i)=>i===pageIndex?{...p,...patch}:p)}));
  const updatePhotoAdjust = (photoId, patch) => updateAlbum((a)=>({...a,photos:a.photos.map((p)=>p.id===photoId?{...p,...photoAdjust({...p,...patch})}:p)}));

  const changePageLayout = (layoutId) => {
    if (!currentAlbum) return;
    const count = LAYOUT_MAP[layoutId].slots;
    const old = currentAlbum.pages[editorPage];
    updatePage(editorPage,{layout:layoutId,slots:Array.from({length:count},(_,i)=>old.slots?.[i]||null)});
  };

  const assignPhoto = (photoId, slotIndex) => {
    updateAlbum((a)=>{
      const pages = a.pages.map((p)=>({...p,slots:p.slots.map((id)=>id===photoId?null:id)}));
      const page = {...pages[editorPage],slots:[...pages[editorPage].slots]};
      page.slots[slotIndex]=photoId; pages[editorPage]=page;
      return {...a,pages};
    });
  };
  const removeFromSlot = (slotIndex) => {
    const page=currentAlbum.pages[editorPage]; const slots=[...page.slots]; slots[slotIndex]=null; updatePage(editorPage,{slots});
  };

  const addNextPage = () => {
    if (editorPage < currentAlbum.pages.length-1) { setEditorPage(editorPage+1); return; }
    if (activePlan.pages!==Infinity && usedPages>=activePlan.pages) { setPlanOpen(true); setToast(`${activePlan.name} plan ki page limit complete ho gayi hai.`); return; }
    updateAlbum((a)=>({...a,pages:[...a.pages,blankPage()]})); setEditorPage(editorPage+1);
  };
  const addBlankPage = () => {
    if (activePlan.pages!==Infinity && usedPages>=activePlan.pages) { setPlanOpen(true); return; }
    updateAlbum((a)=>({...a,pages:[...a.pages,blankPage()]})); setEditorPage(currentAlbum.pages.length);
  };
  const deletePage = () => {
    if (currentAlbum.pages.length<=1) { setToast('Album me kam se kam 1 page rahega.'); return; }
    updateAlbum((a)=>({...a,pages:a.pages.filter((_,i)=>i!==editorPage)})); setEditorPage(Math.max(0,editorPage-1));
  };

  const uploadMusic = async (file) => {
    if (!file) return; const track={id:makeId(),name:file.name,src:await fileToDataUrl(file)};
    updateAlbum((a)=>({...a,musicLibrary:[...(a.musicLibrary||[]),track],pages:a.pages.map((p,i)=>i===editorPage?{...p,musicId:track.id}:p)}));
    setToast('Music uploaded and selected for this page.');
  };

  const publishAlbum = async () => {
    if (!currentAlbum) return;
    const slug=currentAlbum.shareSlug||`${currentAlbum.id.slice(-7)}-${Math.random().toString(36).slice(2,6)}`;
    const published={...currentAlbum,shareSlug:slug,publishedAt:Date.now()};
    await dbSet(`${PUBLIC_PREFIX}${slug}`,published);
    updateAlbum({shareSlug:slug,publishedAt:Date.now()});
    const link=`${location.origin}${location.pathname}#/share/${slug}`;
    try { await navigator.clipboard.writeText(link); setToast('Album published. Demo share link copied.'); }
    catch { setToast(`Album published: ${link}`); }
  };

  if (!loaded) return <div className="loading">Loading ClickFlip…</div>;

  return <div className="app-shell">
    <header className="app-header">
      <button className="brand-btn" onClick={()=>setScreen('dashboard')}><span><BookOpen size={20}/></span><b>ClickFlip</b></button>
      <nav>
        <button className={screen==='dashboard'?'active':''} onClick={()=>setScreen('dashboard')}>My Albums</button>
        {currentAlbum && <button className={screen==='editor'?'active':''} onClick={()=>setScreen('editor')}>Editor</button>}
      </nav>
      <div className="header-actions">
        <button className="plan-pill" onClick={()=>setPlanOpen(true)}><Crown size={14}/>{activePlan.name}<b>{activePlan.pages===Infinity?'∞':`${usedPages}/${activePlan.pages}`}</b></button>
        <div className="user-pill"><span>{(user.name||'U')[0].toUpperCase()}</span><b>{user.name}</b></div>
        <button className="icon-btn" onClick={onLogout} title="Logout"><LogOut size={17}/></button>
      </div>
    </header>

    {screen==='dashboard' && <Dashboard albums={albums} activePlan={activePlan} usedPages={usedPages} remainingPages={remainingPages}
      onOpen={(id)=>{setActiveId(id);setEditorPage(0);setScreen('editor')}} onPreview={(id)=>{setActiveId(id);setScreen('preview')}}
      onDelete={deleteAlbum} onCreate={()=>setCreateOpen(true)} onUpgrade={()=>setPlanOpen(true)} />}

    {screen==='editor' && currentAlbum && <Editor album={currentAlbum} pageIndex={editorPage} plan={activePlan} usedPages={usedPages} remainingPages={remainingPages}
      uploading={uploading} photoSearch={photoSearch} setPhotoSearch={setPhotoSearch} inputPhotosRef={inputPhotosRef}
      onUploadPhotos={uploadPhotos} onLayout={changePageLayout} onAssign={assignPhoto} onRemoveSlot={removeFromSlot}
      onPageChange={setEditorPage} onNextPage={addNextPage} onAddPage={addBlankPage} onDeletePage={deletePage}
      onUpdatePage={(patch)=>updatePage(editorPage,patch)} onUpdatePhoto={updatePhotoAdjust} onUploadMusic={uploadMusic}
      onPreview={()=>setScreen('preview')} onPublish={publishAlbum}
      onDeletePhoto={deleteUploadedPhoto} onClearUnused={clearUnusedPhotos}
      onBack={()=>setScreen('dashboard')} />}

    {screen==='preview' && currentAlbum && <Preview album={currentAlbum} onBack={()=>setScreen('editor')} onPublish={publishAlbum} />}

    {createOpen && <Modal onClose={()=>setCreateOpen(false)} title="Create New Album">
      <label>Album title<input value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} placeholder="e.g. Family Trip 2026"/></label>
      <label>Subtitle<input value={newSubtitle} onChange={(e)=>setNewSubtitle(e.target.value)} placeholder="A journey to remember"/></label>
      <button className="primary wide" onClick={createAlbum}>Create & Open Editor</button>
    </Modal>}

    {planOpen && <PlanModal current={activePlan} usedPages={usedPages} onClose={()=>setPlanOpen(false)} onSelect={(id)=>{const p=PLAN_MAP[id]; if(p.pages!==Infinity&&usedPages>p.pages){setToast('Pehle pages reduce karein.');return;} onPlanChange(id); setPlanOpen(false); setToast(`${p.name} plan selected (demo).`)}}/>}
    {notice && <div className="toast">{notice}</div>}
  </div>;
}

function Dashboard({ albums, activePlan, usedPages, remainingPages, onOpen, onPreview, onDelete, onCreate, onUpgrade }) {
  const pct=activePlan.pages===Infinity?18:Math.min(100,(usedPages/activePlan.pages)*100);
  return <main className="dashboard-page">
    <section className="dashboard-title"><div><small>YOUR MEMORY LIBRARY</small><h1>My Albums</h1><p>Create, edit and share page-by-page photo stories.</p></div><button className="primary" onClick={onCreate}><Plus size={16}/> Create New Album</button></section>
    <section className="usage-card"><div><Crown size={20}/><span><b>{activePlan.name} Plan</b><small>{activePlan.pages===Infinity?`${usedPages} pages used · Unlimited`: `${usedPages} of ${activePlan.pages} pages used`}</small></span></div><div className="usage-middle"><div><span>{activePlan.pages===Infinity?'Unlimited':`${remainingPages} pages remaining`}</span><b>{activePlan.pages===Infinity?'∞':`${Math.round(pct)}%`}</b></div><div className="usage-bar"><i style={{width:`${pct}%`}}/></div></div><button onClick={onUpgrade}>Upgrade Plan</button></section>
    {albums.length===0 ? <section className="empty-state"><BookOpen size={52}/><h2>No albums yet</h2><p>Create your first album. A blank Page 1 will open in the editor.</p><button className="primary" onClick={onCreate}>Create Album</button></section> :
    <section className="album-grid">{albums.map((a)=><article className="album-card" key={a.id}>
      <div className="album-cover" onClick={()=>onOpen(a.id)}>{a.cover?<img src={a.cover} alt=""/>:<Camera size={38}/>}<div className="cover-overlay"><span>{a.pages.length} pages</span></div></div>
      <div className="album-card-body"><div><h3>{a.title}</h3><p>{a.subtitle}</p><small>{a.photos.length} uploaded photos · {a.pages.length} pages</small></div><div className="album-card-actions"><button onClick={()=>onOpen(a.id)}>Edit</button><button onClick={()=>onPreview(a.id)}>Preview</button><button className="danger" onClick={()=>onDelete(a.id)}><Trash2 size={14}/></button></div></div>
    </article>)}</section>}
  </main>;
}

function Editor({ album, pageIndex, plan, usedPages, remainingPages, uploading, photoSearch, setPhotoSearch, inputPhotosRef, onUploadPhotos, onLayout, onAssign, onRemoveSlot, onPageChange, onNextPage, onAddPage, onDeletePage, onUpdatePage, onUpdatePhoto, onUploadMusic, onPreview, onPublish, onBack, onDeletePhoto, onClearUnused }) {
  const page=album.pages[pageIndex];
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const photosById=useMemo(()=>Object.fromEntries(album.photos.map((p)=>[p.id,p])),[album.photos]);
  const usedIds=useMemo(()=>new Set(album.pages.flatMap((p)=>p.slots.filter(Boolean))),[album.pages]);
  const filtered=album.photos.filter((p)=>p.name.toLowerCase().includes(photoSearch.toLowerCase()));
  const selectedTrack=(album.musicLibrary||[]).find((m)=>m.id===page.musicId);
  const dragStart=(e,id)=>{e.dataTransfer.setData('text/photo-id',id);e.dataTransfer.effectAllowed='move'};
  const placePhoto=(id,idx)=>{ if(!id)return; onAssign(id,idx); setSelectedPhoto(''); };
  const drop=(e,idx)=>{e.preventDefault(); const id=e.dataTransfer.getData('text/photo-id'); if(id) placePhoto(id,idx)};

  return <main className="editor-page">
    <div className="editor-topbar">
      <div className="editor-title"><button className="icon-btn" onClick={onBack}><ArrowLeft size={18}/></button><div><small>EDITING ALBUM</small><h2>{album.title}</h2></div></div>
      <div className="editor-actions"><span className="save-indicator"><Save size={14}/> Auto-saved</span><button className="secondary" onClick={onPreview}>Preview anytime</button><button className="primary" onClick={onPublish}><Share2 size={15}/> Publish & Share</button></div>
    </div>

    <div className="editor-workspace">
      <aside className="editor-sidebar layout-sidebar">
        <div className="tool-heading"><LayoutGrid size={18}/><div><b>Page Layout</b><span>Page {pageIndex+1} can have its own layout.</span></div></div>
        <div className="layout-list">{LAYOUTS.map((l)=><button key={l.id} className={page.layout===l.id?'active':''} onClick={()=>onLayout(l.id)}><LayoutIcon id={l.id}/><span><b>{l.name}</b><small>{l.hint}</small></span>{page.layout===l.id&&<Check size={15}/>}</button>)}</div>
        <div className="page-quota"><small>{plan.name} PLAN</small><b>{plan.pages===Infinity?'Unlimited pages':`${usedPages}/${plan.pages} pages used`}</b><span>{remainingPages===Infinity?'Add as many pages as you want.':`${remainingPages} page(s) remaining`}</span></div>
      </aside>

      <section className="canvas-column">
        <div className="page-strip">
          <button className="page-arrow" disabled={pageIndex===0} onClick={()=>onPageChange(Math.max(0,pageIndex-1))}><ChevronLeft/></button>
          <div className="page-chips">{album.pages.map((p,i)=><button key={p.id} className={i===pageIndex?'active':''} onClick={()=>onPageChange(i)}>Page {i+1}<small>{p.slots.filter(Boolean).length}/{p.slots.length}</small></button>)}<button className="add-page-chip" onClick={onAddPage}><Plus size={15}/> Page</button></div>
          <button className="page-arrow" onClick={onNextPage}><ChevronRight/></button>
        </div>
        <div className="canvas-shell">
          <div className="canvas-meta"><span>PAGE {pageIndex+1} OF {album.pages.length}</span><div className="canvas-meta-actions">{page.storyMode&&<div className="page-zoom-control"><button type="button" onClick={()=>setCanvasZoom((z)=>clamp(z-10,50,150))}><ZoomOut size={13}/></button><b>{canvasZoom}%</b><button type="button" onClick={()=>setCanvasZoom((z)=>clamp(z+10,50,150))}><ZoomIn size={13}/></button><button type="button" onClick={()=>setCanvasZoom(100)}><RotateCcw size={12}/></button></div>}<button onClick={onDeletePage}><Trash2 size={14}/> Delete page</button></div></div>
          <div className={`canvas-zoom-frame ${page.storyMode?'scrapbook-zoom-enabled':''}`}><div className="canvas-zoom-inner" style={page.storyMode?{zoom:canvasZoom/100}:undefined}><PageCanvas page={page} photosById={photosById} editor onDragStart={dragStart} onDrop={drop} onRemove={onRemoveSlot} onUpdatePhoto={onUpdatePhoto} onUpdatePage={onUpdatePage} selectedPhoto={selectedPhoto} onTapSlot={(idx)=>placePhoto(selectedPhoto,idx)}/></div></div>
        </div>
        <div className="editor-next-row"><button className="secondary" disabled={pageIndex===0} onClick={()=>onPageChange(pageIndex-1)}><ChevronLeft size={16}/> Previous Page</button><button className="primary" onClick={onNextPage}>{pageIndex<album.pages.length-1?'Next Page':'Complete Page & Add Next'} <ChevronRight size={16}/></button></div>
      </section>

      <aside className="editor-sidebar settings-sidebar">
        {page.slots.some(Boolean) && (() => {
          const activePhotoId = page.slots.find(Boolean);
          const activePhoto = activePhotoId ? photosById[activePhotoId] : null;
          if (!activePhoto) return null;
          const adj = photoAdjust(activePhoto);
          return (
            <>
              <div className="tool-heading">
                <Move size={18}/>
                <div>
                  <b>Photo Position (Framing)</b>
                  <span>Photo ko upar, niche, left, right move karein.</span>
                </div>
              </div>
              <div className="framing-sidebar-card">
                <div className="framing-dpad-wrapper">
                  <button type="button" className="dpad-btn up" title="Move Up (Upar)" onClick={() => onUpdatePhoto(activePhoto.id, { panY: clamp(adj.panY - 6, -100, 100) })}>
                    <ArrowUp size={15}/>
                  </button>
                  <div className="dpad-row">
                    <button type="button" className="dpad-btn left" title="Move Left (Left)" onClick={() => onUpdatePhoto(activePhoto.id, { panX: clamp(adj.panX - 6, -100, 100) })}>
                      <ArrowLeft size={15}/>
                    </button>
                    <button type="button" className="dpad-btn center" title="Center Photo" onClick={() => onUpdatePhoto(activePhoto.id, { panX: 0, panY: 0 })}>
                      <Move size={13}/>
                    </button>
                    <button type="button" className="dpad-btn right" title="Move Right (Right)" onClick={() => onUpdatePhoto(activePhoto.id, { panX: clamp(adj.panX + 6, -100, 100) })}>
                      <ArrowRight size={15}/>
                    </button>
                  </div>
                  <button type="button" className="dpad-btn down" title="Move Down (Niche)" onClick={() => onUpdatePhoto(activePhoto.id, { panY: clamp(adj.panY + 6, -100, 100) })}>
                    <ArrowDown size={15}/>
                  </button>
                </div>

                <div className="framing-slider-item">
                  <label>
                    <span>↔️ Left / Right</span>
                    <b>{Math.round(adj.panX)}%</b>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={adj.panX}
                    onChange={(e) => onUpdatePhoto(activePhoto.id, { panX: Number(e.target.value) })}
                  />
                </div>

                <div className="framing-slider-item">
                  <label>
                    <span>↕️ Up / Down</span>
                    <b>{Math.round(adj.panY)}%</b>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={adj.panY}
                    onChange={(e) => onUpdatePhoto(activePhoto.id, { panY: Number(e.target.value) })}
                  />
                </div>

                <div className="framing-slider-item">
                  <label>
                    <span>🔍 Zoom Level</span>
                    <b>{Math.round(adj.zoom * 100)}%</b>
                  </label>
                  <input
                    type="range"
                    min="0.6"
                    max="3"
                    step="0.05"
                    value={adj.zoom}
                    onChange={(e) => onUpdatePhoto(activePhoto.id, { zoom: Number(e.target.value) })}
                  />
                </div>

                <div className="framing-btn-row">
                  <button
                    type="button"
                    className={`framing-toggle-fit ${adj.fit === 'contain' ? 'active' : ''}`}
                    onClick={() => onUpdatePhoto(activePhoto.id, { fit: adj.fit === 'contain' ? 'cover' : 'contain' })}
                  >
                    {adj.fit === 'contain' ? <Maximize2 size={13}/> : <Minimize2 size={13}/>}
                    <span>{adj.fit === 'contain' ? 'Fill Frame' : 'Show Full Photo'}</span>
                  </button>
                  <button
                    type="button"
                    className="framing-reset-btn"
                    title="Reset Photo Position"
                    onClick={() => onUpdatePhoto(activePhoto.id, { zoom: 1, panX: 0, panY: 0, fit: 'cover' })}
                  >
                    <RotateCcw size={12}/> Reset
                  </button>
                </div>
              </div>
              <div className="tool-divider"/>
            </>
          );
        })()}
        <div className="tool-heading"><FileText size={18}/><div><b>Storytelling Scrapbook</b><span>Turn this page into a handcrafted memory story.</span></div></div>
        <div className="story-mode-switch"><button className={!page.storyMode?'active':''} onClick={()=>onUpdatePage({storyMode:false})}>Classic</button><button className={page.storyMode?'active':''} onClick={()=>onUpdatePage({storyMode:true})}>Scrapbook</button></div>
        {page.storyMode && <>
          <label>Story theme<div className="scrapbook-theme-grid">{SCRAPBOOK_THEMES.map((t)=><button type="button" key={t.id} className={page.scrapbookTheme===t.id?'active':''} onClick={()=>onUpdatePage({scrapbookTheme:t.id})}><span>{t.icon}</span><b>{t.name}</b></button>)}</div></label>
          <label>Photo frame<select value={page.frameStyle||'polaroid'} onChange={(e)=>onUpdatePage({frameStyle:e.target.value})}>{FRAME_STYLES.map((f)=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          <label>Story title<input value={page.storyTitle||''} onChange={(e)=>onUpdatePage({storyTitle:e.target.value})} placeholder="e.g. Our first family trip"/></label>
          <div className="two-fields"><label>Date<input type="date" value={page.storyDate||''} onChange={(e)=>onUpdatePage({storyDate:e.target.value})}/></label><label>Location<input value={page.storyLocation||''} onChange={(e)=>onUpdatePage({storyLocation:e.target.value})} placeholder="Place"/></label></div>
          <label>Memory note<textarea value={page.storyNote||''} onChange={(e)=>onUpdatePage({storyNote:e.target.value})} placeholder="Write the small moment behind these photos…" rows={3}/></label>
          <label>Stickers<div className="sticker-picker">{SCRAPBOOK_STICKERS.map((st)=>{const active=(page.stickers||[]).includes(st);return <button type="button" key={st} className={active?'active':''} onClick={()=>onUpdatePage({stickers:active?(page.stickers||[]).filter((x)=>x!==st):[...(page.stickers||[]),st]})}>{st}</button>})}</div></label>
          <div className="tool-divider"/>
        </>}
        <div className="tool-heading"><Type size={18}/><div><b>Text & Style</b><span>Add optional text to this page.</span></div></div>
        <label>Page text<textarea value={page.text||''} onChange={(e)=>onUpdatePage({text:e.target.value})} placeholder="Write a caption, story or memory…" rows={4}/></label>
        <label>Font<select value={page.font} onChange={(e)=>onUpdatePage({font:e.target.value})}>{FONTS.map((f)=><option key={f.value} value={f.value}>{f.label}</option>)}</select></label>
        <div className={page.storyMode?'two-fields':''}><label>Size<select value={page.fontSize} onChange={(e)=>onUpdatePage({fontSize:Number(e.target.value)})}><option value="20">Small</option><option value="28">Medium</option><option value="38">Large</option></select></label>{page.storyMode&&<label>Text position<button type="button" className="text-reset-btn" onClick={()=>onUpdatePage({textX:50,textY:84})}><Move size={14}/> Reset position</button></label>}</div>
        <label>Alignment<div className="segmented">{['left','center','right'].map((x)=><button key={x} className={page.textAlign===x?'active':''} onClick={()=>onUpdatePage({textAlign:x})}>{x}</button>)}</div></label>
        {page.storyMode?<div className="text-drag-tip"><Move size={14}/><span>Scrapbook me text ko photo ke baju, upar ya niche kahin bhi drag karke rakhein.</span></div>:<div className="classic-text-tip">Classic mode me text fixed caption area me rahega.</div>}

        <div className="tool-divider"/>
        <div className="tool-heading"><Music size={18}/><div><b>Page Music</b><span>Upload once, reuse on any page.</span></div></div>
        <label>Select music<select value={page.musicId||''} onChange={(e)=>onUpdatePage({musicId:e.target.value})}><option value="">No music</option>{(album.musicLibrary||[]).map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className="upload-music-btn"><Upload size={16}/> Upload Music<input type="file" accept="audio/*" onChange={(e)=>onUploadMusic(e.target.files?.[0])}/></label>
        {selectedTrack && <div className="selected-track"><Music size={15}/><span>{selectedTrack.name}</span><Check size={14}/></div>}
      </aside>
    </div>

    <section className="photo-library">
      <div className="library-head">
        <div>
          <b><ImagePlus size={17}/> Photo Library</b>
          <span>{album.photos.length} photos uploaded · Drag photos into the current page</span>
        </div>
        <div className="library-actions">
          <input value={photoSearch} onChange={(e)=>setPhotoSearch(e.target.value)} placeholder="Search photos…"/>
          {album.photos.length > 0 && (
            <button type="button" className="secondary danger-text" onClick={onClearUnused} title="Delete all photos that are not on any page">
              <Trash2 size={13}/> Clean Unused
            </button>
          )}
          <button className="secondary" onClick={()=>inputPhotosRef.current?.click()}><Upload size={15}/>{uploading?'Uploading…':'Upload Photos'}</button>
          <input ref={inputPhotosRef} hidden multiple type="file" accept="image/*" onChange={(e)=>onUploadPhotos(e.target.files)}/>
        </div>
      </div>
      {filtered.length===0 ? <div className="library-empty" onClick={()=>inputPhotosRef.current?.click()}><Upload size={25}/><b>Upload your photos</b><span>After upload, photos stay here until you drag them onto a page.</span></div> :
      <div className="photo-tray">{filtered.map((p)=><div className={`tray-photo ${usedIds.has(p.id)?'used':''} ${selectedPhoto===p.id?'selected':''}`} key={p.id} draggable onDragStart={(e)=>dragStart(e,p.id)} onClick={()=>setSelectedPhoto(selectedPhoto===p.id?'':p.id)} title="Drag to a slot, or tap photo then tap a slot">
        <button
          type="button"
          className="tray-photo-delete"
          title="Delete this photo from album"
          onClick={(e)=>{
            e.stopPropagation();
            onDeletePhoto(p.id);
          }}
        >
          <Trash2 size={12}/>
        </button>
        <img src={p.src} alt=""/>
        <span><GripVertical size={13}/>{p.name}</span>
        {usedIds.has(p.id)&&<i>Used</i>}
      </div>)}</div>}
    </section>
  </main>;
}

function LayoutIcon({ id }) {
  const n=LAYOUT_MAP[id].slots; return <div className={`mini-layout ${id}`}>{Array.from({length:n},(_,i)=><i key={i}/>)}</div>;
}

function defaultScrapbookFrame(page, idx) {
  const count=Math.max(1,page.slots?.length||1);
  const presets={
    1:[{x:10,y:22,w:58,h:58}],
    2:[{x:6,y:22,w:42,h:52},{x:52,y:30,w:42,h:52}],
    3:[{x:5,y:22,w:48,h:56},{x:57,y:22,w:37,h:30},{x:55,y:56,w:39,h:30}],
    4:[{x:5,y:23,w:40,h:34},{x:51,y:19,w:42,h:36},{x:8,y:61,w:38,h:30},{x:52,y:59,w:40,h:31}],
    5:[{x:5,y:23,w:38,h:46},{x:47,y:20,w:24,h:31},{x:73,y:26,w:22,h:29},{x:47,y:56,w:25,h:31},{x:75,y:60,w:20,h:26}]
  };
  const arr=presets[count]||presets[5];
  return arr[idx]||{x:8+(idx%3)*29,y:24+Math.floor(idx/3)*34,w:26,h:28};
}

function PageCanvas({ page, photosById, editor=false, onDragStart, onDrop, onRemove, onUpdatePhoto=()=>{}, onUpdatePage=()=>{}, selectedPhoto='', onTapSlot=()=>{} }) {
  const [activeSlot, setActiveSlot] = useState(null);
  const panRef = useRef(null);
  const textDragRef = useRef(null);
  const frameDragRef = useRef(null);
  const frameResizeRef = useRef(null);
  useEffect(()=>setActiveSlot(null),[page.id]);

  const scrapbookFrame=(idx)=>{
    const raw=page.scrapbookFrames?.[idx]||defaultScrapbookFrame(page,idx);
    return {
      x:clamp(Number(raw.x)||0,0,92), y:clamp(Number(raw.y)||0,0,92),
      w:clamp(Number(raw.w)||30,16,94), h:clamp(Number(raw.h)||30,16,90)
    };
  };
  const updateScrapbookFrame=(idx,patch)=>{
    const next={...(page.scrapbookFrames||{}),[idx]:{...scrapbookFrame(idx),...patch}};
    onUpdatePage({scrapbookFrames:next});
  };

  const startFrameMove=(e,idx)=>{
    if(!editor||!page.storyMode) return;
    e.preventDefault();e.stopPropagation();setActiveSlot(idx);
    const paper=e.currentTarget.closest('.album-paper'); const rect=paper?.getBoundingClientRect(); if(!rect)return;
    const frame=scrapbookFrame(idx);
    frameDragRef.current={idx,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startFrame:frame,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveFrame=(e)=>{
    const drag=frameDragRef.current;if(!drag||drag.pointerId!==e.pointerId)return;
    e.preventDefault();
    const dx=((e.clientX-drag.startX)/drag.width)*100,dy=((e.clientY-drag.startY)/drag.height)*100;
    updateScrapbookFrame(drag.idx,{x:clamp(drag.startFrame.x+dx,0,100-drag.startFrame.w),y:clamp(drag.startFrame.y+dy,0,100-drag.startFrame.h)});
  };
  const endFrameMove=(e)=>{if(frameDragRef.current?.pointerId===e.pointerId)frameDragRef.current=null};
  const startFrameResize=(e,idx)=>{
    if(!editor||!page.storyMode)return;
    e.preventDefault();e.stopPropagation();setActiveSlot(idx);
    const paper=e.currentTarget.closest('.album-paper');const rect=paper?.getBoundingClientRect();if(!rect)return;
    const frame=scrapbookFrame(idx);
    frameResizeRef.current={idx,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startFrame:frame,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const resizeFrame=(e)=>{
    const drag=frameResizeRef.current;if(!drag||drag.pointerId!==e.pointerId)return;
    e.preventDefault();
    const dw=((e.clientX-drag.startX)/drag.width)*100,dh=((e.clientY-drag.startY)/drag.height)*100;
    updateScrapbookFrame(drag.idx,{w:clamp(drag.startFrame.w+dw,16,100-drag.startFrame.x),h:clamp(drag.startFrame.h+dh,16,100-drag.startFrame.y)});
  };
  const endFrameResize=(e)=>{if(frameResizeRef.current?.pointerId===e.pointerId)frameResizeRef.current=null};

  const startPan = (e, photo, idx) => {
    if (!editor || selectedPhoto) return;
    e.preventDefault(); e.stopPropagation(); setActiveSlot(idx);
    const rect=e.currentTarget.parentElement.getBoundingClientRect();
    const adjust=photoAdjust(photo);
    panRef.current={
      photoId:photo.id,
      pointerId:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      startPanX:adjust.panX,
      startPanY:adjust.panY,
      width:Math.max(1,rect.width),
      height:Math.max(1,rect.height)
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const movePan = (e) => {
    const pan=panRef.current; if(!pan || pan.pointerId!==e.pointerId) return;
    e.preventDefault();
    const dx=((e.clientX-pan.startX)/pan.width)*100;
    const dy=((e.clientY-pan.startY)/pan.height)*100;
    const panX=clamp(pan.startPanX+dx,-100,100);
    const panY=clamp(pan.startPanY+dy,-100,100);
    onUpdatePhoto(pan.photoId,{panX,panY});
  };
  const endPan = (e) => { if(panRef.current?.pointerId===e.pointerId) panRef.current=null; };
  const nudgePhoto = (photo, dx, dy) => {
    const adj = photoAdjust(photo);
    onUpdatePhoto(photo.id, {
      panX: clamp(adj.panX + dx, -100, 100),
      panY: clamp(adj.panY + dy, -100, 100)
    });
  };
  const setZoom = (photo, value) => onUpdatePhoto(photo.id,{zoom:clamp(Number(value),0.6,3.5)});
  const toggleFit = (photo) => {
    const adj = photoAdjust(photo);
    onUpdatePhoto(photo.id, { fit: adj.fit === 'contain' ? 'cover' : 'contain' });
  };
  const resetPhoto = (photo) => onUpdatePhoto(photo.id,{zoom:1,panX:0,panY:0,fit:'cover'});

  const startTextDrag = (e) => {
    if(!editor || !page.storyMode || !page.text) return;
    e.preventDefault(); e.stopPropagation();
    const paper=e.currentTarget.closest('.album-paper');
    const rect=paper?.getBoundingClientRect(); if(!rect) return;
    textDragRef.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startTextX:Number(page.textX)||50,startTextY:Number(page.textY)||84,width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveTextDrag = (e) => {
    const drag=textDragRef.current; if(!drag || drag.pointerId!==e.pointerId) return;
    e.preventDefault();
    const textX=clamp(drag.startTextX+((e.clientX-drag.startX)/drag.width)*100,4,96);
    const textY=clamp(drag.startTextY+((e.clientY-drag.startY)/drag.height)*100,4,96);
    onUpdatePage({textPosition:'free',textX,textY});
  };
  const endTextDrag = (e) => { if(textDragRef.current?.pointerId===e.pointerId) textDragRef.current=null; };

  return <div className={`album-paper layout-${page.layout} ${page.storyMode?`scrapbook scrapbook-${page.scrapbookTheme||'kraft'} frame-${page.frameStyle||'polaroid'}`:''}`}>
    {page.storyMode && <ScrapbookDecor page={page}/>} 
    {page.storyMode && (page.storyTitle || page.storyDate || page.storyLocation) && <div className="scrapbook-story-head">
      {page.storyTitle && <h3>{page.storyTitle}</h3>}
      {(page.storyDate || page.storyLocation) && <div className="scrapbook-meta">{page.storyDate&&<span>{page.storyDate}</span>}{page.storyLocation&&<span>📍 {page.storyLocation}</span>}</div>}
    </div>}
    <div className="paper-photo-area">{page.slots.map((id,idx)=>{
      const photo=id?photosById[id]:null; const adjust=photoAdjust(photo); const frame=page.storyMode?scrapbookFrame(idx):null;
      const frameStyle=page.storyMode?{left:`${frame.x}%`,top:`${frame.y}%`,width:`${frame.w}%`,height:`${frame.h}%`}:undefined;
      return <div key={idx} style={frameStyle} className={`photo-slot slot-${idx} ${editor?'editor-slot':''} ${editor&&selectedPhoto?'tap-ready':''} ${activeSlot===idx?'adjusting':''} ${page.storyMode?'free-scrap-photo':''}`} onDragOver={editor?(e)=>e.preventDefault():undefined} onDrop={editor?(e)=>onDrop(e,idx):undefined} onClick={editor&&selectedPhoto?()=>onTapSlot(idx):undefined}>
        {photo ? <>
          <img src={photo.src} alt="" draggable={false} style={{transform:`translate(${adjust.panX}%, ${adjust.panY}%) scale(${adjust.zoom})`,objectFit:adjust.fit,transformOrigin:'center center',cursor:editor?'grab':'default'}} onPointerDown={editor?(e)=>startPan(e,photo,idx):undefined} onPointerMove={editor?movePan:undefined} onPointerUp={editor?endPan:undefined} onPointerCancel={editor?endPan:undefined} onClick={editor&&!selectedPhoto?(e)=>{e.stopPropagation();setActiveSlot(activeSlot===idx?null:idx)}:undefined}/>
          {editor&&<><button className="remove-slot" onClick={(e)=>{e.stopPropagation();onRemove(idx);setActiveSlot(null)}}><X size={13}/></button><div className="move-hint"><Move size={13}/> Drag to move (Upar, Niche, Left, Right)</div>
          {page.storyMode&&<><button type="button" className="frame-move-handle" title="Move photo frame" onPointerDown={(e)=>startFrameMove(e,idx)} onPointerMove={moveFrame} onPointerUp={endFrameMove} onPointerCancel={endFrameMove}><Move size={13}/><span>Move</span></button><button type="button" className="frame-resize-handle" title="Resize photo frame" onPointerDown={(e)=>startFrameResize(e,idx)} onPointerMove={resizeFrame} onPointerUp={endFrameResize} onPointerCancel={endFrameResize}><span>↘</span></button></>}
          <div className={`photo-adjust-tools ${activeSlot===idx?'visible':''}`} onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()}>
            <div className="adjust-dpad">
              <button type="button" title="Move Up (Upar)" onClick={()=>nudgePhoto(photo, 0, -6)}><ArrowUp size={12}/></button>
              <div className="adjust-dpad-row">
                <button type="button" title="Move Left (Left)" onClick={()=>nudgePhoto(photo, -6, 0)}><ArrowLeft size={12}/></button>
                <button type="button" title="Center" className="dpad-center-btn" onClick={()=>onUpdatePhoto(photo.id, {panX:0, panY:0})}><Move size={10}/></button>
                <button type="button" title="Move Right (Right)" onClick={()=>nudgePhoto(photo, 6, 0)}><ArrowRight size={12}/></button>
              </div>
              <button type="button" title="Move Down (Niche)" onClick={()=>nudgePhoto(photo, 0, 6)}><ArrowDown size={12}/></button>
            </div>
            <div className="adjust-divider"/>
            <div className="adjust-zoom-group">
              <button type="button" title="Zoom out" onClick={()=>setZoom(photo,adjust.zoom-.15)} disabled={adjust.zoom<=.65}><ZoomOut size={13}/></button>
              <input aria-label="Photo zoom" type="range" min="0.6" max="3" step="0.05" value={adjust.zoom} onChange={(e)=>setZoom(photo,e.target.value)}/>
              <button type="button" title="Zoom in" onClick={()=>setZoom(photo,adjust.zoom+.15)} disabled={adjust.zoom>=2.95}><ZoomIn size={13}/></button>
            </div>
            <div className="adjust-divider"/>
            <button type="button" className={`toggle-fit-btn ${adjust.fit==='contain'?'active':''}`} title={adjust.fit==='contain'?'Full Frame':'Show Full Photo'} onClick={()=>toggleFit(photo)}>
              {adjust.fit==='contain'?<Maximize2 size={12}/>:<Minimize2 size={12}/>}
              <span>{adjust.fit==='contain'?'Fill':'Fit'}</span>
            </button>
            <button type="button" title="Reset position" className="reset-adjust" onClick={()=>resetPhoto(photo)}><RotateCcw size={12}/></button>
          </div></>}
        </> : editor ? <div className="slot-placeholder"><ImagePlus size={24}/><b>{selectedPhoto?'Tap to place photo':'Drop photo here'}</b><span>Slot {idx+1}</span></div> : <div className="empty-preview-slot"/>}
      </div>
    })}</div>
    {page.storyMode && page.storyNote && <div className="scrapbook-memory-note">{page.storyNote}</div>}
    {page.text && (page.storyMode ? <div className={`free-text-layer ${editor?'editable':''}`} style={{left:`${Number(page.textX)||50}%`,top:`${Number(page.textY)||84}%`}} onPointerDown={editor?startTextDrag:undefined} onPointerMove={editor?moveTextDrag:undefined} onPointerUp={editor?endTextDrag:undefined} onPointerCancel={editor?endTextDrag:undefined}>
      {editor&&<span className="text-move-handle"><Move size={12}/> drag text</span>}
      <PageText page={page}/>
    </div> : <div className="classic-caption"><PageText page={page}/></div>)}
  </div>;
}
function ScrapbookDecor({page}) {
  const stickers=(page.stickers||[]).slice(0,8);
  return <div className="scrapbook-decor" aria-hidden="true"><i className="tape tape-a"/><i className="tape tape-b"/>{stickers.map((st,i)=><span key={`${st}-${i}`} className={`scrap-sticker sticker-${i%8}`}>{st}</span>)}</div>;
}
function PageText({page}) { return <div className="page-text" style={{fontFamily:page.font,fontSize:`${page.fontSize}px`,textAlign:page.textAlign}}>{page.text}</div>; }

function Preview({ album, onBack, onPublish, publicMode=false }) {
  const [pageIndex,setPageIndex]=useState(0); const [playing,setPlaying]=useState(false); const audioRef=useRef(null); const touchStart=useRef(null);
  const photosById=useMemo(()=>Object.fromEntries(album.photos.map((p)=>[p.id,p])),[album.photos]);
  const page=album.pages[pageIndex]; const track=(album.musicLibrary||[]).find((m)=>m.id===page?.musicId);
  useEffect(()=>{ if(!audioRef.current)return; audioRef.current.pause(); setPlaying(false); if(track?.src){audioRef.current.src=track.src}else{audioRef.current.removeAttribute('src')} },[track?.id]);
  const toggle=()=>{if(!audioRef.current||!track)return; if(playing){audioRef.current.pause();setPlaying(false)}else{audioRef.current.play().then(()=>setPlaying(true)).catch(()=>{})}};
  const prevPage=()=>setPageIndex((i)=>Math.max(0,i-1));
  const nextPage=()=>setPageIndex((i)=>Math.min(album.pages.length-1,i+1));
  useEffect(()=>{ const key=(e)=>{ if(e.key==='ArrowLeft')prevPage(); if(e.key==='ArrowRight'||e.key===' ')nextPage(); }; window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key); },[album.pages.length]);
  const clickBook=(e)=>{ const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left+r.width/2)prevPage(); else nextPage(); };
  const touchEnd=(e)=>{ if(touchStart.current==null)return; const diff=e.changedTouches[0].clientX-touchStart.current; touchStart.current=null; if(Math.abs(diff)>45){ if(diff<0)nextPage(); else prevPage(); } };
  return <main className="preview-page">
    <audio ref={audioRef} loop/>
    <header className="preview-header"><div><button className="preview-back-btn" onClick={onBack}><ArrowLeft size={18}/><span>{publicMode?'Back to ClickFlip':'Back to Editor'}</span></button><span className="preview-album-title"><small>{publicMode?'SHARED ALBUM':'PREVIEW MODE'}</small><b>{album.title}</b></span></div><div>{track&&<button className="music-control" onClick={toggle}>{playing?<Pause size={16}/>:<Play size={16}/>}<span>{track.name}</span><Volume2 size={15}/></button>}{!publicMode&&<button className="primary" onClick={onPublish}><Share2 size={15}/> Publish & Copy Link</button>}</div></header>
    <section className="viewer-stage">
      <button className="viewer-arrow" disabled={pageIndex===0} onClick={prevPage}><ChevronLeft/></button>
      <div className="viewer-book" onClick={clickBook} onTouchStart={(e)=>{touchStart.current=e.touches[0].clientX}} onTouchEnd={touchEnd}><div className="viewer-page-number">Page {pageIndex+1} / {album.pages.length}</div><PageCanvas page={page} photosById={photosById}/></div>
      <button className="viewer-arrow" disabled={pageIndex>=album.pages.length-1} onClick={nextPage}><ChevronRight/></button>
    </section>
    <div className="preview-dots">{album.pages.map((p,i)=><button key={p.id} className={i===pageIndex?'active':''} onClick={()=>setPageIndex(i)}/>)}</div>
    <p className="viewer-help">Click left/right side of page or use arrows · Mobile: swipe left/right · Page music changes with each page</p>
  </main>;
}

function PublicShareView({ slug, onExit }) {
  const [album,setAlbum]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{dbGet(`${PUBLIC_PREFIX}${slug}`).then(setAlbum).finally(()=>setLoading(false))},[slug]);
  if(loading)return <div className="loading">Opening shared album…</div>;
  if(!album)return <main className="share-not-found"><BookOpen size={52}/><h1>Album not found</h1><p>This demo link only works where the album has been published locally.</p><button className="primary" onClick={onExit}>Back to ClickFlip</button></main>;
  return <Preview album={album} publicMode onBack={onExit} onPublish={()=>{}}/>;
}

function PlanModal({ current, usedPages, onClose, onSelect }) { return <Modal title="Choose Your Plan" onClose={onClose} wide><div className="plan-grid">{PLANS.map((p)=><article className={`plan-card ${current.id===p.id?'current':''}`} key={p.id}>{p.id==='unlimited'&&<Crown className="plan-crown"/>}<small>{p.name}</small><h2>{planPrice(p)}</h2><p>{p.description}</p><ul><li><Check/> Multiple albums</li><li><Check/> Page editor & collages</li><li><Check/> Text & fonts</li><li><Check/> Page music</li></ul><button disabled={current.id===p.id || (p.pages!==Infinity&&usedPages>p.pages)} onClick={()=>onSelect(p.id)}>{current.id===p.id?'Current Plan':p.pages!==Infinity&&usedPages>p.pages?'Reduce pages first':'Select Plan'}</button></article>)}</div><p className="modal-note">Payment gateway abhi demo me connected nahi hai. Paid plan selection local demo activation hai.</p></Modal> }

function Modal({ title, onClose, children, wide=false }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${wide?'wide':''}`} onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</section></div>; }

createRoot(document.getElementById('root')).render(<App/>);
