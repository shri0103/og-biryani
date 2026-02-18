import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Phone, Menu as MenuIcon, X, MapPin, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import OrderTrack from './pages/OrderTrack';
import OrderHistory from './pages/OrderHistory';
import CartDrawer from './pages/CartDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import TRANSLATIONS from './translations';

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

function AppContent({ cart, setCart, addToCart, updateQuantity, removeFromCart, clearCart, toast, orderCount }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { t } = useLang();

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50" style={{
        background: 'rgba(26, 26, 46, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl font-serif font-bold tracking-[0.15em] text-gradient-gold">
              OG BIRIYANI
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <LangNav />
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
          <div className="flex md:hidden items-center gap-3">
            <LangNav />
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 rounded-lg border border-gold-600/30 text-gold-400"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-ember-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            <button
              className="p-2 rounded-lg border border-gold-600/30 text-gold-400 hover:text-gold-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
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
                background: 'rgba(26, 26, 46, 0.95)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
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
        <Routes>
          <Route path="/" element={<Home orderCount={orderCount} addToCart={addToCart} />} />
          <Route path="/menu" element={<Menu addToCart={addToCart} cart={cart} />} />
          <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} clearCart={clearCart} orderCount={orderCount} />} />
          <Route path="/track/:token" element={<OrderTrack />} />
          <Route path="/history" element={<OrderHistory />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>

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
        background: 'rgba(26, 26, 46, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(212, 175, 55, 0.1)'
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

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 glass-card px-6 py-3 flex items-center gap-3 glow-gold"
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
      document.body.classList.add(`theme-${active.name}`);
      return () => document.body.classList.remove(`theme-${active.name}`);
    }
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (item, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
    showToast(`Added ${quantity}× ${item.name} to cart!`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
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
        <AppContent
          cart={cart}
          setCart={setCart}
          addToCart={addToCart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          toast={toast}
          orderCount={orderCount}
        />
      </LangProvider>
    </Router>
  );
}

export default App;
