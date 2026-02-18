import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Flame, Sparkles, ShoppingCart, Check, RotateCcw, Zap, X, Clock, Star, Calendar } from 'lucide-react';
import { useLang } from '../App';

// ─── Combo Definitions ─────────────────────────────
const COMBO_RULES = [
    {
        trigger: 'Chicken Biryani',
        suggest: 'Chicken 65',
        message: 'Add Chicken 65 for the perfect combo!',
        discount: 20,
    },
    {
        trigger: 'Mutton Biryani',
        suggest: 'Bread Halwa',
        message: 'Complete your meal with sweet Bread Halwa!',
        discount: 15,
    },
    {
        trigger: 'Chicken 65',
        suggest: 'Chicken Biryani',
        message: 'Pair it with our Chicken Biryani!',
        discount: 20,
    },
];

const Menu = ({ addToCart, cart = [] }) => {
    const { t } = useLang();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [quantities, setQuantities] = useState({});
    const [addedItems, setAddedItems] = useState({});
    const [flyingItem, setFlyingItem] = useState(null);
    const [lastOrder, setLastOrder] = useState(null);
    const [comboPopup, setComboPopup] = useState(null);
    const [isOrderingLocked, setIsOrderingLocked] = useState(false);
    const cartIconRef = useRef(null);
    const cardRefs = useRef({});

    // ─── Smart Ordering Lock (after 6 PM) ───────────
    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const h = now.getHours();
            setIsOrderingLocked(false); // TEMP: unlocked for testing — original: (h < 6 || h >= 12)
        };
        checkTime();
        const interval = setInterval(checkTime, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/menu');
                setItems(res.data.data);
            } catch (error) {
                console.error("Error fetching menu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();

        // Load last order from localStorage
        const saved = localStorage.getItem('lastOrder');
        if (saved) {
            try { setLastOrder(JSON.parse(saved)); } catch { }
        }
    }, []);

    const categories = ['All', ...new Set(items.map(item => item.category))];
    const filteredItems = (selectedCategory === 'All' ? items : items.filter(item => item.category === selectedCategory))
        .sort((a, b) => {
            // Combo items always go last
            if (a.category === 'Combo' && b.category !== 'Combo') return 1;
            if (a.category !== 'Combo' && b.category === 'Combo') return -1;
            return 0;
        });

    const getQuantity = (id) => quantities[id] || 1;

    const setQuantity = (id, val) => {
        setQuantities(prev => ({ ...prev, [id]: Math.max(1, Math.min(20, val)) }));
    };

    // Check if a combo suggestion applies
    const checkComboSuggestion = useCallback((item) => {
        const rule = COMBO_RULES.find(r => r.trigger === item.name);
        if (!rule) return;

        const alreadyInCart = cart.some(c => c.name === rule.suggest);
        if (alreadyInCart) return;

        const suggestItem = items.find(i => i.name === rule.suggest);
        if (!suggestItem) return;

        setComboPopup({
            ...rule,
            suggestItem,
        });

        // Auto-dismiss after 6 seconds
        setTimeout(() => setComboPopup(null), 6000);
    }, [cart, items]);

    // Add & Fly Animation
    const handleAddToCart = (item) => {
        const qty = getQuantity(item.id);

        // Get button position for fly animation
        const cardEl = cardRefs.current[item.id];
        if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            setFlyingItem({
                id: item.id,
                name: item.name,
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
            setTimeout(() => setFlyingItem(null), 800);
        }

        // Add to cart
        addToCart(item, qty);

        // Show "Added!" feedback
        setAddedItems(prev => ({ ...prev, [item.id]: true }));
        setTimeout(() => {
            setAddedItems(prev => ({ ...prev, [item.id]: false }));
        }, 1500);

        // Reset quantity
        setQuantities(prev => ({ ...prev, [item.id]: 1 }));

        // Check combo suggestion
        checkComboSuggestion(item);
    };

    const handleReorder = () => {
        if (!lastOrder) return;
        lastOrder.forEach(item => {
            const menuItem = items.find(i => i.name === item.name);
            if (menuItem) {
                addToCart(menuItem, item.quantity);
            }
        });
    };

    const getCartItemCount = (itemId) => {
        const cartItem = cart.find(c => c.id === itemId);
        return cartItem ? cartItem.quantity : 0;
    };

    if (loading) {
        return (
            <div className="container mx-auto px-2 pb-24">
                <div className="text-center mb-10">
                    <div className="skeleton h-10 w-64 mx-auto mb-4" />
                    <div className="skeleton h-4 w-48 mx-auto" />
                </div>
                <div className="flex justify-center gap-3 mb-12">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-9 w-20 rounded-full" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-card p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="skeleton h-6 w-36" />
                                <div className="skeleton h-8 w-16 rounded-lg" />
                            </div>
                            <div className="skeleton h-4 w-full" />
                            <div className="skeleton h-4 w-3/4" />
                            <div className="flex gap-3 mt-2">
                                <div className="skeleton h-10 w-24 rounded-xl" />
                                <div className="skeleton h-4 w-20 self-center" />
                            </div>
                            <div className="skeleton h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 pb-24">
            {/* Page Header */}
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-gradient-gold">{t('ourPremiumMenu')}</h2>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
                <p className="text-gold-300/50 mt-3 font-light">{t('homemadeFood')}</p>
            </div>

            {/* Today's Special Banner */}
            {items.find(i => i.is_today_special) && (() => {
                const special = items.find(i => i.is_today_special);
                return (
                    <motion.div
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 relative overflow-hidden rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,150,42,0.08) 100%)',
                            border: '1px solid rgba(212,175,55,0.25)',
                        }}
                    >
                        <div className="p-6 flex items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center shrink-0">
                                <Star size={24} className="text-gold-400" fill="rgba(212,175,55,0.5)" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs uppercase tracking-widest text-gold-500 font-semibold mb-1">⭐ {t('todaysSpecial')}</p>
                                <h3 className="text-xl font-serif font-bold text-gold-200">{special.name}</h3>
                                <p className="text-sm text-gold-300/50 mt-1">{special.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-2xl font-bold text-gradient-gold">₹{special.price}</span>
                                {!isOrderingLocked && (
                                    <button
                                        onClick={() => addToCart(special, 1)}
                                        className="block mt-2 text-xs text-dark-900 bg-gold-500 hover:bg-gold-400 px-4 py-1.5 rounded-full font-semibold transition-colors"
                                    >
                                        {t('addToCart')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-gold-500/5 to-transparent" />
                    </motion.div>
                );
            })()}

            {/* Orders Closed Banner */}
            {isOrderingLocked && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 glass-card p-4 flex items-center gap-4 border-ember-500/30"
                    style={{ borderColor: 'rgba(232, 93, 58, 0.3)' }}
                >
                    <div className="w-10 h-10 rounded-full bg-ember-500/15 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-ember-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-ember-500">{t('ordersClosed')}</p>
                        <p className="text-xs text-gold-300/40">{t('ordersOpenTime')}</p>
                    </div>
                </motion.div>
            )}

            {/* Quick Reorder */}
            {lastOrder && lastOrder.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 glass-card p-4 flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0">
                            <RotateCcw size={18} className="text-gold-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gold-300">{t('reorderLastOrder')}</p>
                            <p className="text-xs text-gold-300/40 truncate">
                                {lastOrder.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleReorder}
                        className="shrink-0 px-5 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold text-sm rounded-full btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all"
                    >
                        {t('reorder')}
                    </button>
                </motion.div>
            )}

            {/* Category Filters */}
            <div className="flex justify-center gap-2 md:gap-4 mb-12 flex-wrap">
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`relative px-5 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${selectedCategory === category
                            ? 'bg-gold-500/15 text-gold-400 border border-gold-500/40 glow-gold'
                            : 'text-gold-300/50 border border-transparent hover:text-gold-300/80 hover:border-gold-600/20'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredItems.map((item, index) => {
                        const isSpecial = item.tag === 'Special' || item.is_today_special;
                        const isNew = item.tag === 'New';
                        const isAdded = addedItems[item.id];
                        const cartCount = getCartItemCount(item.id);
                        const qty = getQuantity(item.id);

                        // Check day-based availability
                        const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const today = DAYS[new Date().getDay()];
                        const availDays = item.available_days ? item.available_days.split(',').map(d => d.trim()) : [];
                        const isAvailableToday = availDays.length === 0 || availDays.includes(today);

                        return (
                            <motion.div
                                key={item.id}
                                ref={el => { cardRefs.current[item.id] = el; }}
                                layout
                                initial={isSpecial ? { opacity: 0, scale: 0.96 } : { opacity: 0, y: 20 }}
                                animate={isSpecial ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={isSpecial
                                    ? { delay: index * 0.05 + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
                                    : { delay: index * 0.05, duration: 0.4 }
                                }
                                whileHover={isSpecial ? { y: -6, scale: 1.02, rotateY: 2 } : { y: -5, rotateY: 2 }}
                                className={`glass-card card-hover-glow p-6 flex flex-col justify-between relative overflow-hidden group ${isSpecial ? 'glow-gold-strong' : ''} ${!isAvailableToday ? 'opacity-50' : ''}`}
                                style={isSpecial ? { borderColor: 'rgba(212, 175, 55, 0.3)' } : {}}
                            >
                                {/* Cart Count Badge */}
                                {cartCount > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-3 left-3 bg-gold-500 text-dark-900 text-[11px] font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-10"
                                    >
                                        ×{cartCount}
                                    </motion.div>
                                )}

                                {/* Special Badge */}
                                {isSpecial && (
                                    <div className="absolute top-0 right-0 flex items-center gap-1 bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">
                                        <Sparkles size={12} />
                                        {t('todaysSpecial')}
                                    </div>
                                )}

                                {/* New Badge */}
                                {isNew && !isSpecial && (
                                    <div className="absolute top-0 right-0 flex items-center gap-1 bg-gradient-to-l from-ember-500 to-ember-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider">
                                        <Flame size={12} />
                                        New
                                    </div>
                                )}

                                <div>
                                    {/* Item Name & Price */}
                                    <div className="flex justify-between items-start mb-3 mt-1 gap-3">
                                        <h3 className="text-xl font-serif font-bold text-gold-200 group-hover:text-gold-100 transition-colors leading-snug">
                                            {item.name}
                                        </h3>
                                        <span className="text-gold-400 font-bold text-lg bg-gold-500/10 px-3 py-1 rounded-lg border border-gold-500/20 whitespace-nowrap shrink-0">
                                            ₹{item.price}
                                        </span>
                                    </div>

                                    <p className="text-gold-300/50 text-sm leading-relaxed mb-2">
                                        {item.description}
                                    </p>
                                    {!isAvailableToday && availDays.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-400/60 mb-2">
                                            <Calendar size={12} />
                                            {t('availableOn')} {availDays.join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Inline Quantity Selector */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center gap-1.5 glass-card-light px-2 py-1.5 rounded-xl">
                                        <button
                                            onClick={() => setQuantity(item.id, qty - 1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gold-400 hover:bg-gold-500/15 transition-colors"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-bold w-7 text-center text-gold-300 tabular-nums text-sm select-none">{qty}</span>
                                        <button
                                            onClick={() => setQuantity(item.id, qty + 1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gold-400 hover:bg-gold-500/15 transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <span className="text-gold-300/40 text-xs">
                                        {t('subtotal')}: <span className="text-gold-400 font-semibold">₹{item.price * qty}</span>
                                    </span>
                                </div>

                                {/* Add to Cart Button with "Added!" State */}
                                <button
                                    onClick={() => handleAddToCart(item)}
                                    disabled={isAdded || isOrderingLocked || !isAvailableToday}
                                    className={`w-full py-2.5 rounded-xl font-semibold text-sm tracking-wide flex justify-center items-center gap-2 transition-all duration-300 btn-shimmer ${isAdded
                                        ? 'bg-green-accent/20 text-green-accent border border-green-accent/30 cursor-default'
                                        : (isOrderingLocked || !isAvailableToday)
                                            ? 'border border-dark-500 text-gold-300/25 cursor-not-allowed'
                                            : isSpecial
                                                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/10'
                                                : 'border border-gold-600/30 text-gold-400 hover:bg-gold-500/10 hover:border-gold-500/50 hover:text-gold-300'
                                        }`}
                                >
                                    {isAdded ? (
                                        <>
                                            <Check size={16} />
                                            {t('added')}
                                        </>
                                    ) : isOrderingLocked ? (
                                        <>
                                            <Clock size={16} />
                                            {t('closed')}
                                        </>
                                    ) : !isAvailableToday ? (
                                        <>
                                            <Calendar size={16} />
                                            {t('notAvailableToday')}
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart size={16} />
                                            {t('addToCart')}
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Flying Item Animation */}
            <AnimatePresence>
                {flyingItem && (
                    <motion.div
                        initial={{
                            position: 'fixed',
                            left: flyingItem.x - 20,
                            top: flyingItem.y,
                            opacity: 1,
                            scale: 1,
                            zIndex: 100,
                        }}
                        animate={{
                            left: window.innerWidth - 80,
                            top: 20,
                            opacity: 0.3,
                            scale: 0.3,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                        className="pointer-events-none"
                    >
                        <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/40">
                            <ShoppingCart size={16} className="text-dark-900" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Combo Builder Popup */}
            <AnimatePresence>
                {comboPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass-card p-5 max-w-sm w-[90%] glow-gold-strong"
                        style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
                    >
                        <button
                            onClick={() => setComboPopup(null)}
                            className="absolute top-3 right-3 text-gold-300/40 hover:text-gold-300"
                        >
                            <X size={16} />
                        </button>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                <Zap size={18} className="text-gold-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gold-300 mb-1">{t('comboSuggestion')}</p>
                                <p className="text-xs text-gold-300/60 mb-3">{comboPopup.message}</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            addToCart(comboPopup.suggestItem, 1);
                                            setComboPopup(null);
                                        }}
                                        className="px-4 py-1.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 text-xs font-bold rounded-full btn-shimmer"
                                    >
                                        Add {comboPopup.suggest} — ₹{comboPopup.suggestItem.price}
                                    </button>
                                    <span className="text-[10px] text-green-accent font-medium">Save ₹{comboPopup.discount}!</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Menu;
