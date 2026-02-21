import React, { useState, useEffect, createContext, useContext, useRef, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ShoppingCart, Phone, Menu as MenuIcon, X, MapPin, ArrowRight, ArrowLeft, Globe, Sun, Moon, Download, Smartphone, ChevronUp } from 'lucide-react';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import CartDrawer from './pages/CartDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Home as HomeIcon } from 'lucide-react';
import TRANSLATIONS from './translations';
import NotificationToggle from './components/NotificationToggle';

// ─── Code-Split Lazy Imports ────────────────────────
const Admin = React.lazy(() => import('./pages/Admin'));
const OrderTrack = React.lazy(() => import('./pages/OrderTrack'));
const OrderHistory = React.lazy(() => import('./pages/OrderHistory'));

// ─── Language Context ────────────────────────────────
const LangContext = createContext();
export const useLang = () => useContext(LangContext);

function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const t = (key) => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  };
  const toggleLang = () => {
    const next = lang === 'en' ? 'ta' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  };
  return (
    <LangContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

// ─── Theme Context ──────────────────────────────────
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── SEO Page Title Hook ────────────────────────────
function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `OG Biriyani — ${title}` : 'OG Biriyani — Premium Biryani';
    return () => { document.title = 'OG Biriyani — Premium Biryani'; };
  }, [title]);
}

// ─── Festival Config ────────────────────────────────
const FESTIVAL_CONFIG = {
  diwali: { emoji: '🪔', particles: ['✨', '🪔', '🎆', '🎇'], greeting: 'Happy Diwali!', gradient: 'from-orange-500 to-yellow-400' },
  ramadan: { emoji: '🌙', particles: ['🌙', '⭐', '✨', '🕌'], greeting: 'Ramadan Mubarak!', gradient: 'from-teal-400 to-emerald-400' },
  pongal: { emoji: '🌾', particles: ['🌾', '☀️', '🍚', '✨'], greeting: 'Happy Pongal!', gradient: 'from-amber-400 to-orange-400' },
  christmas: { emoji: '🎄', particles: ['🎄', '⭐', '❄️', '🎁'], greeting: 'Merry Christmas!', gradient: 'from-red-500 to-green-500' },
  eid: { emoji: '🌙', particles: ['🌙', '✨', '⭐', '🎉'], greeting: 'Eid Mubarak!', gradient: 'from-violet-400 to-purple-500' },
};

// ─── Scroll-to-Top Button ───────────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #B8962A, #D4AF37, #E8C547)',
            border: '1px solid rgba(255,248,225,0.3)',
            boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
          }}
          aria-label="Scroll to top"
        >
          <ChevronUp size={22} className="text-dark-900" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Suspense Spinner ───────────────────────────────
function LazySpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  );
}

// ─── Festival Banner ────────────────────────────────
function FestivalBanner({ festival }) {
  if (!festival) return null;
  const config = FESTIVAL_CONFIG[festival];
  if (!config) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-[73px] left-0 right-0 z-40 text-center py-2 px-4"
      style={{
        background: 'linear-gradient(90deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06), rgba(212,175,55,0.12))',
        borderBottom: '1px solid rgba(212,175,55,0.15)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <span className="text-sm font-medium text-gold-300">
        {config.emoji} {config.greeting} {config.emoji}
      </span>
    </motion.div>
  );
}

// ─── Festival Floating Particles ────────────────────
function FestivalParticles({ festival }) {
  if (!festival) return null;
  const config = FESTIVAL_CONFIG[festival];
  if (!config) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="festival-particle absolute text-lg"
          style={{
            left: `${5 + (i * 8) % 90}%`,
            animationDelay: `${(i * 1.3) % 8}s`,
            animationDuration: `${6 + (i % 5) * 2}s`,
            opacity: 0.35 + (i % 3) * 0.15,
            fontSize: `${14 + (i % 4) * 4}px`,
          }}
        >
          {config.particles[i % config.particles.length]}
        </span>
      ))}
    </div>
  );
}

function NavLink({ to, children, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative font-medium tracking-wider text-sm uppercase transition-colors ${isActive ? 'text-gold-400' : 'text-gold-300/70 hover:text-gold-300'}`}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent"
        />
      )}
    </Link>
  );
}

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on home page
  if (location.pathname === '/') return null;

  const pageNames = {
    '/menu': 'Home',
    '/cart': 'Menu',
    '/admin': 'Home',
  };

  const backLabel = pageNames[location.pathname] || 'Back';

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full glass-card-light text-gold-400 hover:text-gold-300 hover:border-gold-500/30 transition-all group text-sm font-medium"
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      {backLabel}
    </motion.button>
  );
}

// ─── Page Transition Wrapper ────────────────────────
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

// ─── 404 Not Found Page ─────────────────────────────
function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-ember-500/10 flex items-center justify-center"
      >
        <AlertTriangle size={44} className="text-ember-500" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-6xl font-serif font-bold text-gradient-gold">404</h1>
        <p className="text-xl text-gold-300/60 font-light">This page doesn't exist</p>
        <p className="text-sm text-gold-300/30">Looks like you took a wrong turn. Let's get you back!</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-full btn-shimmer glow-gold-strong hover:from-gold-500 hover:to-gold-400 transition-all"
        >
          <HomeIcon size={18} />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}

function FloatingCartBar({ cart }) {
  const location = useLocation();
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Only show on menu page when cart has items
  if (location.pathname !== '/menu' || cart.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
    >
      <div className="container mx-auto max-w-2xl pointer-events-auto">
        <Link
          to="/cart"
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl btn-shimmer glow-gold-strong"
          style={{
            background: 'linear-gradient(135deg, #B8962A 0%, #D4AF37 50%, #E8C547 100%)',
            border: '1px solid rgba(255, 248, 225, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-dark-900/20 rounded-full flex items-center justify-center">
              <ShoppingCart size={18} className="text-dark-900" />
            </div>
            <div>
              <p className="text-dark-900 font-bold text-sm">
                {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
              </p>
              <p className="text-dark-900/60 text-xs">Tap to checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-dark-900 font-bold text-lg">₹{total}</span>
            <ArrowRight size={18} className="text-dark-900" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Language Toggle Button ─────────────────────────
function LangNav() {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      title={lang === 'en' ? 'Switch to Tamil' : 'Switch to English'}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gold-600/30 text-gold-400 hover:text-gold-300 hover:border-gold-500/50 transition-all text-xs font-semibold"
    >
      <Globe size={14} />
      {lang === 'en' ? 'தமிழ்' : 'EN'}
    </button>
  );
}

// ─── Theme Toggle Button ────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="flex items-center gap-1.5 p-2 rounded-full border border-gold-600/30 text-gold-400 hover:text-gold-300 hover:border-gold-500/50 transition-all"
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

function AppContent({ cart, setCart, addToCart, updateQuantity, removeFromCart, clearCart, toast, orderCount, activeFestival }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { t } = useLang();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();

  // ─── SEO: Dynamic Page Titles ─────────────────────
  const pageTitles = { '/': 'Home', '/menu': 'Menu', '/cart': 'Cart', '/history': 'Order History', '/admin': 'Admin' };
  const titleFromPath = location.pathname.startsWith('/track/') ? 'Track Order' : pageTitles[location.pathname];
  usePageTitle(titleFromPath);

  // ─── PWA Install Prompt ────────────────────────────
  const deferredPromptRef = useRef(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check 2-day cooldown — show again after 2 days
    const dismissedAt = localStorage.getItem('pwaInstallDismissedAt');
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 2) return; // Still within cooldown
    }

    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    deferredPromptRef.current = null;
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwaInstallDismissedAt', String(Date.now()));
  };

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50" style={{
        background: isDark ? 'rgba(26, 26, 46, 0.75)' : 'rgba(255, 252, 245, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isDark ? '1px solid rgba(212, 175, 55, 0.1)' : '1px solid rgba(194, 120, 45, 0.15)',
        boxShadow: isDark ? 'none' : '0 4px 20px rgba(194, 120, 45, 0.06)'
      }}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl font-serif font-bold tracking-[0.15em] text-gradient-gold">
              OG BIRIYANI
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LangNav />
              <NotificationToggle />
            </div>
            <NavLink to="/">{t('home')}</NavLink>
            <NavLink to="/menu">{t('menu')}</NavLink>
            <NavLink to="/history">{t('history')}</NavLink>
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative group"
            >
              <div className="p-2 rounded-full border border-gold-600/30 group-hover:border-gold-500/60 transition-all group-hover:glow-gold cursor-pointer">
                <ShoppingCart size={20} className="text-gold-400 group-hover:text-gold-300" />
              </div>
              {cart.length > 0 && (
                <motion.span
                  key={cart.reduce((sum, item) => sum + item.quantity, 0)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-ember-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </motion.span>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <LangNav />
            <NotificationToggle />
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-lg border border-gold-600/30 text-gold-400"
            >
              <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-ember-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            <button
              className="p-1.5 sm:p-2 rounded-lg border border-gold-600/30 text-gold-400 hover:text-gold-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={18} className="sm:w-[22px] sm:h-[22px]" /> : <MenuIcon size={18} className="sm:w-[22px] sm:h-[22px]" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{
                background: isDark ? 'rgba(26, 26, 46, 0.95)' : 'rgba(255, 252, 245, 0.97)',
                borderBottom: isDark ? '1px solid rgba(212, 175, 55, 0.1)' : '1px solid rgba(194, 120, 45, 0.12)'
              }}
            >
              <div className="flex flex-col p-6 gap-5">
                <NavLink to="/" onClick={() => setIsMenuOpen(false)}>{t('home')}</NavLink>
                <NavLink to="/menu" onClick={() => setIsMenuOpen(false)}>{t('menu')}</NavLink>
                <NavLink to="/history" onClick={() => setIsMenuOpen(false)}>{t('history')}</NavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-12 px-4 md:px-6 container mx-auto">
        <BackButton />
        <Suspense fallback={<LazySpinner />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home orderCount={orderCount} addToCart={addToCart} /></PageTransition>} />
              <Route path="/menu" element={<PageTransition><Menu addToCart={addToCart} cart={cart} /></PageTransition>} />
              <Route path="/cart" element={<PageTransition><Cart cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} clearCart={clearCart} orderCount={orderCount} /></PageTransition>} />
              <Route path="/track/:token" element={<PageTransition><OrderTrack /></PageTransition>} />
              <Route path="/history" element={<PageTransition><OrderHistory /></PageTransition>} />
              <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Festival UI */}
      <FestivalBanner festival={activeFestival} />
      <FestivalParticles festival={activeFestival} />

      {/* Floating Cart Bar (Menu page only) */}
      <AnimatePresence>
        <FloatingCartBar cart={cart} />
      </AnimatePresence>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
      />

      {/* Footer */}
      <footer className="relative mt-auto" style={{
        background: isDark ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 250, 240, 0.85)',
        backdropFilter: 'blur(10px)',
        borderTop: isDark ? '1px solid rgba(212, 175, 55, 0.1)' : '1px solid rgba(194, 120, 45, 0.12)'
      }}>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-2xl font-serif font-bold tracking-[0.12em] text-gradient-gold">OG BIRIYANI</h3>
              <p className="text-gold-300/60 italic font-serif text-lg">Taste It Once. Crave It Forever.</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3">
              <a href="tel:9363164680" className="flex items-center gap-2 text-gold-400 hover:text-gold-300 font-medium">
                <Phone size={16} />
                <span>93631 64680</span>
              </a>
              <div className="flex items-center gap-2 text-gold-300/50 text-sm">
                <MapPin size={14} />
                <span>Fresh Biryani Delivered Daily</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gold-700/20 text-center">
            <p className="text-gold-300/30 text-xs tracking-wide">
              <Link to="/admin" className="text-gold-300/30 hover:text-gold-400 transition-colors">©</Link> {new Date().getFullYear()} OG Biryani. Crafted with ❤️ and Spices.
            </p>
          </div>
        </div>
      </footer>

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-4 shadow-2xl"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(26,26,46,0.95), rgba(40,35,60,0.95))'
                  : 'linear-gradient(135deg, rgba(255,252,245,0.97), rgba(255,245,230,0.97))',
                border: '1px solid rgba(212,175,55,0.3)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="w-11 h-11 rounded-xl bg-gold-500/15 flex items-center justify-center shrink-0">
                <Smartphone size={20} className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gold-300">Install OG Biriyani</p>
                <p className="text-[11px] text-gold-300/50">Add to home screen for quick ordering</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={dismissInstall}
                  className="px-3 py-1.5 text-xs text-gold-300/40 hover:text-gold-300/70 transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 text-xs font-bold rounded-full btn-shimmer flex items-center gap-1.5"
                >
                  <Download size={12} />
                  Install
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top */}
      <ScrollToTop />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[9999] glass-card px-6 py-3 flex items-center gap-3 glow-gold"
            style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
          >
            <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center">
              <ShoppingCart size={16} className="text-gold-400" />
            </div>
            <span className="text-gold-200 font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [orderCount, setOrderCount] = useState(() => {
    return parseInt(localStorage.getItem('orderCount') || '0', 10);
  });

  // Save last order to localStorage whenever an order is placed (cart cleared)
  useEffect(() => {
    if (cart.length > 0) {
      // Track current cart as potential "last order"
      sessionStorage.setItem('currentCart', JSON.stringify(cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
      }))));
    }
  }, [cart]);

  // ─── Festive Theme Detection ───────
  const [activeFestival, setActiveFestival] = useState(null);
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const festivals = [
      { name: 'pongal', start: [1, 14], end: [1, 17] },
      { name: 'ramadan', start: [3, 1], end: [3, 31] },
      { name: 'diwali', start: [10, 20], end: [11, 5] },
      { name: 'christmas', start: [12, 20], end: [12, 31] },
      { name: 'eid', start: [4, 9], end: [4, 12] },
    ];

    const active = festivals.find(f => {
      const afterStart = month > f.start[0] || (month === f.start[0] && day >= f.start[1]);
      const beforeEnd = month < f.end[0] || (month === f.end[0] && day <= f.end[1]);
      return afterStart && beforeEnd;
    });

    if (active) {
      setActiveFestival(active.name);
      document.body.classList.add(`theme-${active.name}`);
      return () => document.body.classList.remove(`theme-${active.name}`);
    }
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (item, quantity = 1) => {
    const existing = cart.find(i => i.id === item.id);
    const currentQ = existing ? existing.quantity : 0;
    const newQ = currentQ + quantity;

    if (newQ > 20) {
      showToast(`Maximum 20 limit reached for ${item.name}`);
      setCart(prev => {
        const e = prev.find(i => i.id === item.id);
        if (e) return prev.map(i => i.id === item.id ? { ...i, quantity: 20 } : i);
        return [...prev, { ...item, quantity: 20 }];
      });
      return;
    }

    showToast(`Added ${quantity}× ${item.name} to cart!`);
    setCart(prev => {
      const e = prev.find(i => i.id === item.id);
      if (e) return prev.map(i => i.id === item.id ? { ...i, quantity: newQ } : i);
      return [...prev, { ...item, quantity }];
    });
  };

  const updateQuantity = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQ = item.quantity + delta;

    if (newQ > 20) {
      showToast(`Maximum 20 limit reached for ${item.name}`);
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: 20 } : i));
      return;
    }

    setCart(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, quantity: Math.max(0, newQ) };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    // Save as last order before clearing
    if (cart.length > 0) {
      localStorage.setItem('lastOrder', JSON.stringify(cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
      }))));
      // Increment loyalty count
      const newCount = orderCount + 1;
      setOrderCount(newCount);
      localStorage.setItem('orderCount', String(newCount));
    }
    setCart([]);
  };

  return (
    <Router>
      <LangProvider>
        <ThemeProvider>
          <AppContent
            cart={cart}
            setCart={setCart}
            addToCart={addToCart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            toast={toast}
            orderCount={orderCount}
            activeFestival={activeFestival}
          />
        </ThemeProvider>
      </LangProvider>
    </Router>
  );
}

export default App;
