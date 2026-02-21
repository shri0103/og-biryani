import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Star, ChevronRight, Share2, MapPin, Copy, Navigation, RotateCcw, X } from 'lucide-react';
import { useLang } from '../App';

const TrackLastOrder = () => {
    const { t } = useLang();
    const [token, setToken] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('lastOrderToken');
        const time = localStorage.getItem('lastOrderTime');
        if (saved && time) {
            // Only show if order was placed within last 24 hours
            const hoursSince = (Date.now() - new Date(time).getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) setToken(saved);
        }
    }, []);

    if (!token || dismissed) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md glass-card p-4 relative"
            style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}
        >
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-3 right-3 text-gold-300/30 hover:text-gold-300/60 transition-colors"
            >
                <X size={14} />
            </button>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-accent/10 flex items-center justify-center shrink-0">
                    <Navigation size={18} className="text-green-accent" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-green-accent">{t('activeOrder')}</p>
                    <p className="text-[10px] text-gold-300/30 font-mono">#{token}</p>
                </div>
            </div>
            <Link
                to={`/track/${token}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-accent/20 to-green-accent/10 text-green-accent border border-green-accent/30 rounded-xl text-sm font-semibold hover:from-green-accent/30 transition-all"
            >
                <Navigation size={14} />
                {t('trackMyOrder')}
            </Link>
        </motion.div>
    );
};

const RepeatLastOrder = ({ addToCart }) => {
    const { t } = useLang();
    const [lastOrder, setLastOrder] = useState(null);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('lastOrder');
        if (saved) {
            try { setLastOrder(JSON.parse(saved)); } catch { }
        }
    }, []);

    if (!lastOrder || lastOrder.length === 0 || !addToCart) return null;

    const handleRepeat = () => {
        lastOrder.forEach(item => addToCart(item, item.quantity));
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="w-full max-w-md glass-card p-4"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gold-500/10 flex items-center justify-center">
                    <RotateCcw size={16} className="text-gold-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gold-300">{t('repeatLastOrder')}</p>
                    <p className="text-xs text-gold-300/40">{lastOrder.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
                </div>
            </div>
            <button
                onClick={handleRepeat}
                disabled={added}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${added
                    ? 'bg-green-accent/15 text-green-accent border border-green-accent/30'
                    : 'bg-gold-500/15 text-gold-400 border border-gold-500/30 hover:bg-gold-500/25'
                    }`}
            >
                {added ? '✓ ' + t('addedToCart') : <><RotateCcw size={14} /> {t('orderAgain')}</>}
            </button>
        </motion.div>
    );
};

const CountdownTimer = () => {
    const { t } = useLang();
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const h = now.getHours();
            const currentlyOpen = h >= 6 && h < 13; // 6 AM to 1 PM
            setIsOpen(currentlyOpen);

            const target = new Date();
            if (currentlyOpen) {
                // Count down to closing time (1 PM today)
                target.setHours(13, 0, 0, 0);
            } else {
                // Count down to opening time (6 AM)
                target.setHours(6, 0, 0, 0);
                if (h >= 13) {
                    // After 1 PM — next opening is tomorrow 6 AM
                    target.setDate(target.getDate() + 1);
                }
                // Before 6 AM — target is today 6 AM (already set)
            }

            const diff = Math.max(0, target - now);
            setTimeLeft({
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const TimeBox = ({ value, label }) => (
        <div className="flex flex-col items-center">
            <div className="glass-card-light px-4 py-3 min-w-[70px] text-center glow-gold">
                <span className="text-2xl md:text-3xl font-bold text-gold-300 font-sans tabular-nums">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-500/60 mt-2 font-medium">{label}</span>
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-4">
            <div className={`flex items-center gap-2 ${isOpen ? 'text-ember-500' : 'text-green-accent'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse-dot ${isOpen ? 'bg-ember-500' : 'bg-green-accent'}`} />
                <span className="text-sm font-medium tracking-wide uppercase">
                    {isOpen ? t('ordersCloseAt') : t('ordersReopenAt')}
                </span>
            </div>
            <div className="flex gap-3">
                <TimeBox value={timeLeft.hours} label={t('hours')} />
                <span className="text-gold-500/40 text-2xl font-light self-start mt-3">:</span>
                <TimeBox value={timeLeft.minutes} label={t('minutes')} />
                <span className="text-gold-500/40 text-2xl font-light self-start mt-3">:</span>
                <TimeBox value={timeLeft.seconds} label={t('seconds')} />
            </div>
        </div>
    );
};

const Reviews = () => {
    const { t } = useLang();
    const [reviews, setReviews] = React.useState([
        { id: 1, customer_name: "Rahul K.", feedback: "Best Biryani in town! The aroma is just authentic.", rating: 5 },
        { id: 2, customer_name: "Priya M.", feedback: "Loved the Chicken 65. Perfectly spicy and crispy.", rating: 5 },
        { id: 3, customer_name: "Suresh R.", feedback: "Quality quantity and affordable price. A must try!", rating: 4 },
    ]);

    React.useEffect(() => {
        const API = import.meta.env.VITE_API_URL;
        fetch(`${API}/reviews/latest`)
            .then(r => r.json())
            .then(data => {
                if (data.data && data.data.length > 0) {
                    setReviews(data.data.map((r, i) => ({ ...r, id: i + 1 })));
                }
            })
            .catch(() => { });
    }, []);

    return (
        <div className="w-full max-w-5xl px-4 mt-20">
            <div className="text-center mb-10">
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">{t('whatCustomersSay')}</h3>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.slice(0, 6).map((review, index) => (
                    <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.15 }}
                        whileHover={{ y: -4 }}
                        className="glass-card p-6 relative group"
                    >
                        {/* Floating quote */}
                        <span className="absolute -top-3 -left-1 text-5xl text-gold-500/10 font-serif leading-none select-none">"</span>

                        <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={14}
                                    className={i < review.rating ? 'text-gold-400 fill-gold-400' : 'text-dark-500'}
                                />
                            ))}
                        </div>
                        <p className="text-gold-200/80 italic mb-4 leading-relaxed font-light">"{review.feedback}"</p>
                        <p className="text-gold-400 font-semibold text-sm tracking-wide">— {review.customer_name}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};


const Home = ({ orderCount = 0, addToCart }) => {
    const { t } = useLang();
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-14 py-10">
            {/* Track Last Order */}
            <TrackLastOrder />
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="space-y-6"
            >
                {/* Brand Name */}
                <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-[0.1em] text-gradient-gold drop-shadow-lg">
                    OG BIRIYANI
                </h1>

                {/* Ornament */}
                <div className="ornament-divider">
                    <span className="text-gold-500/50 text-lg">✦</span>
                </div>

                {/* Tagline */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-xl md:text-2xl italic text-gold-300/70 font-serif font-light"
                >
                    {t('homemadeFood')}
                </motion.h2>

                {/* Countdown Timer */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="flex justify-center mt-8"
                >
                    <CountdownTimer />
                </motion.div>
            </motion.div>

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="glass-card px-8 py-6 text-center glow-gold"
            >
                <p className="text-lg md:text-xl text-gold-200 font-light">Orders Open <span className="font-semibold text-gold-400">6:00 AM – 1:00 PM</span></p>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-600/30 to-transparent my-3" />
                <p className="text-base md:text-lg font-semibold text-green-accent flex items-center justify-center gap-2">
                    <Clock size={16} />
                    Delivery: 7:30 PM — 7:45 PM
                </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
            >
                <Link
                    to="/menu"
                    className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold text-lg rounded-full btn-shimmer glow-gold-strong hover:from-gold-500 hover:to-gold-400 transition-all"
                >
                    {t('viewMenu')}
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </motion.div>

            {/* Repeat Last Order */}
            <RepeatLastOrder addToCart={addToCart} />

            {/* Reviews Section */}
            <Reviews />

            {/* Google Maps Location */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="w-full max-w-2xl mx-auto"
            >
                <h3 className="text-xl font-serif font-bold text-gradient-gold text-center mb-4">{t('findUs')} 📍</h3>
                <div className="glass-card overflow-hidden rounded-2xl">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.5!2d76.95!3d11.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba859af2f461b59%3A0x5e3e9b0a7d1b4b0!2sSelvapuram%2C%20Coimbatore%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1"
                        width="100%"
                        height="250"
                        style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(1.1) contrast(0.9)' }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="OG Biriyani Location"
                    />
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gold-300/50 text-sm">
                            <MapPin size={14} className="text-gold-500" />
                            Selvapuram, Coimbatore
                        </div>
                        <a
                            href="https://maps.google.com/?q=Selvapuram,Coimbatore,Tamil+Nadu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gold-400 hover:text-gold-300 font-medium flex items-center gap-1 transition-colors"
                        >
                            Get Directions
                            <ArrowRight size={12} />
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
