import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Star, ChevronRight, Award, Share2, MapPin, Copy, Navigation, RotateCcw, X } from 'lucide-react';
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

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const target = new Date();
            target.setHours(12, 0, 0, 0);

            if (now > target) {
                target.setDate(target.getDate() + 1);
            }

            const diff = target - now;
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
            <div className="flex items-center gap-2 text-ember-500">
                <span className="w-2 h-2 rounded-full bg-ember-500 animate-pulse-dot" />
                <span className="text-sm font-medium tracking-wide uppercase">{t('ordersCloseAt')}</span>
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
    const reviews = [
        { id: 1, name: "Rahul K.", text: "Best Biryani in town! The aroma is just authentic.", rating: 5 },
        { id: 2, name: "Priya M.", text: "Loved the Chicken 65. Perfectly spicy and crispy.", rating: 5 },
        { id: 3, name: "Suresh R.", text: "Quality quantity and affordable price. A must try!", rating: 4 },
    ];

    return (
        <div className="w-full max-w-5xl px-4 mt-20">
            <div className="text-center mb-10">
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">{t('whatCustomersSay')}</h3>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.map((review, index) => (
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
                        <p className="text-gold-200/80 italic mb-4 leading-relaxed font-light">"{review.text}"</p>
                        <p className="text-gold-400 font-semibold text-sm tracking-wide">— {review.name}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const LoyaltyProgress = ({ orderCount }) => {
    const { t } = useLang();
    const threshold = 5;
    const progress = Math.min(100, (orderCount / threshold) * 100);
    const earned = orderCount >= threshold;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="w-full max-w-md glass-card p-5"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gold-500/10 flex items-center justify-center">
                    <Award size={18} className="text-gold-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gold-300">{t('biryaniStreak')}</p>
                    <p className="text-xs text-gold-300/40 leading-relaxed">
                        {earned
                            ? '🎉 You earned a free Coke! Claim at pickup.'
                            : `${orderCount}/${threshold} orders — ${threshold - orderCount} more for a free Coke!`
                        }
                    </p>
                </div>
            </div>
            <div className="h-2 bg-dark-700/50 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${earned
                        ? 'bg-gradient-to-r from-green-accent to-green-accent/70'
                        : 'bg-gradient-to-r from-gold-600 to-gold-400'
                        }`}
                />
            </div>
        </motion.div>
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
                <p className="text-lg md:text-xl text-gold-200 font-light">Orders Open <span className="font-semibold text-gold-400">6:00 AM – 12:00 PM</span></p>
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

            {/* Loyalty Progress */}
            {orderCount > 0 && <LoyaltyProgress orderCount={orderCount} />}

            {/* Repeat Last Order */}
            <RepeatLastOrder addToCart={addToCart} />

            {/* Reviews Section */}
            <Reviews />

            {/* Referral Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="glass-card p-6 w-full max-w-lg mx-auto"
            >
                <div className="text-center mb-4">
                    <h3 className="text-lg font-serif font-bold text-gradient-gold">Refer a Friend 🎁</h3>
                    <p className="text-xs text-gold-300/40 mt-1">Share your code & get a surprise treat on your next order!</p>
                </div>
                {(() => {
                    let code = localStorage.getItem('referralCode');
                    if (!code) {
                        code = 'OG' + Math.random().toString(36).substr(2, 6).toUpperCase();
                        localStorage.setItem('referralCode', code);
                    }
                    const referralLink = `${window.location.origin}?ref=${code}`;
                    return (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-3 bg-dark-700/50 px-4 py-3 rounded-xl border border-gold-600/20">
                                <span className="text-gold-400 font-bold text-lg tracking-widest font-mono">{code}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const msg = `Hey! Try OG Biriyani — amazing homemade biryani! Use my code ${code} for a special treat: ${referralLink}`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-accent/15 text-green-accent border border-green-accent/30 flex items-center justify-center gap-2 hover:bg-green-accent/25 transition-all"
                                >
                                    <Share2 size={14} />
                                    WhatsApp
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(referralLink);
                                        alert('Referral link copied!');
                                    }}
                                    className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gold-600/30 text-gold-400 flex items-center justify-center gap-2 hover:bg-gold-500/10 transition-all"
                                >
                                    <Copy size={14} />
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </motion.div>

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
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d80.2!3d13.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sChennai!5e0!3m2!1sen!2sin!4v1"
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
                            Chennai, Tamil Nadu
                        </div>
                        <a
                            href="https://maps.google.com/?q=Chennai,Tamil+Nadu"
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
