import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Search, Package, Clock, ChevronRight, Star, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLang } from '../App';

const STATUS_COLORS = {
    Received: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    Preparing: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    Ready: 'text-green-400 bg-green-500/15 border-green-500/30',
    Delivered: 'text-gold-400 bg-gold-500/15 border-gold-500/30',
};

const InlineReview = ({ order }) => {
    const { t } = useLang();
    const [expanded, setExpanded] = useState(false);
    const [rating, setRating] = useState(order.rating || 0);
    const [feedback, setFeedback] = useState(order.feedback || '');
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(order.rating > 0);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/orders/${order.order_token}/feedback`, { rating, feedback });
            setSubmitted(true);
            setExpanded(false);
        } catch (err) {
            console.error('Feedback error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Already reviewed — show stars
    if (submitted) {
        return (
            <div className="flex items-center gap-2 pt-2 border-t border-gold-700/15">
                <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={s <= rating ? 'text-gold-400 fill-gold-400' : 'text-dark-500'} />
                    ))}
                </div>
                <span className="text-[10px] text-gold-300/40">Your review</span>
            </div>
        );
    }

    return (
        <div className="pt-2 border-t border-gold-700/15">
            {!expanded ? (
                <button
                    onClick={() => setExpanded(true)}
                    className="flex items-center gap-2 text-xs text-gold-400/70 hover:text-gold-400 transition-colors w-full justify-center py-1"
                >
                    <Star size={12} />
                    Rate this order
                </button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                >
                    {/* Stars */}
                    <div className="flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button
                                key={s}
                                onMouseEnter={() => setHoverRating(s)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(s)}
                                className="transition-transform hover:scale-125"
                            >
                                <Star
                                    size={22}
                                    className={`transition-colors ${s <= (hoverRating || rating) ? 'text-gold-400 fill-gold-400' : 'text-dark-500 hover:text-gold-500/30'}`}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Feedback text */}
                    <AnimatePresence>
                        {rating > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <textarea
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="Tell us about your experience..."
                                    className="w-full px-3 py-2 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 text-xs placeholder:text-gold-300/20 focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
                                    rows={2}
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => { setExpanded(false); setRating(0); setFeedback(''); }}
                                        className="flex-1 py-2 text-xs text-gold-300/40 hover:text-gold-300/60 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex-1 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-lg btn-shimmer flex items-center justify-center gap-1.5 text-xs"
                                    >
                                        {submitting ? (
                                            <div className="w-3 h-3 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                                        ) : (
                                            <><Send size={11} /> Submit</>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
};

const OrderHistory = () => {
    const { t } = useLang();
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!phone.trim() || phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/history/${phone.trim()}`);
            setOrders(res.data.data || []);
        } catch (err) {
            setError('Could not fetch orders. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">{t('orderHistory')}</h2>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
                <p className="text-gold-300/40 text-sm mt-3">{t('enterPhone')}</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="glass-card p-5 mb-6">
                <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-2">{t('phone')}</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500/40" />
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-4 pl-10 py-3 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                            placeholder="Enter 10-digit number"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                        ) : (
                            <><Search size={16} /> {t('search')}</>
                        )}
                    </button>
                </div>
                {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-2">
                        {error}
                    </motion.p>
                )}
            </form>

            {/* Results */}
            <AnimatePresence mode="wait">
                {orders !== null && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {orders.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <Package size={40} className="text-gold-500/20 mx-auto mb-3" />
                                <p className="text-gold-300/40 font-light">{t('noOrders')}</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gold-300/30">{orders.length} order{orders.length > 1 ? 's' : ''} found</p>
                                {orders.map((order, idx) => {
                                    let items = [];
                                    try { items = JSON.parse(order.items); } catch { }
                                    const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.Received;

                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.08 }}
                                            className="glass-card p-5 space-y-3"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs bg-gold-500/10 text-gold-400 px-2.5 py-1 rounded-lg font-bold">
                                                        #{order.id}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gold-400 font-bold">₹{order.total_amount || order.total}</p>
                                                    <p className="text-[10px] text-gold-300/30 flex items-center gap-1 justify-end">
                                                        <Clock size={10} />
                                                        {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gold-300/50 bg-dark-700/30 p-3 rounded-lg">
                                                {items.map((item, i) => (
                                                    <span key={i}>{item.quantity || 1}× {item.name}{i < items.length - 1 ? ' • ' : ''}</span>
                                                ))}
                                            </div>
                                            {order.status === 'Delivered' && order.order_token && (
                                                <InlineReview order={order} />
                                            )}
                                            {order.order_token && order.status !== 'Delivered' && (
                                                <Link
                                                    to={`/track/${order.order_token}`}
                                                    className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-gold-400 border border-gold-500/20 rounded-lg hover:bg-gold-500/10 transition-all"
                                                >
                                                    {t('trackOrder')} <ChevronRight size={12} />
                                                </Link>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderHistory;

