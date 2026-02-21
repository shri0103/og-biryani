import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChefHat, CheckCircle, Truck, Clock, ArrowLeft, Share2, Copy, Star, Send, MessageSquare, Bell, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { useLang } from '../App';

const API = import.meta.env.VITE_API_URL;

const STATUSES = ['Received', 'Preparing', 'Ready', 'Delivered'];

const STATUS_CONFIG = {
    Received: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-400', label: 'Order Received', desc: 'Your order has been received!' },
    Preparing: { icon: ChefHat, color: 'text-amber-400', bg: 'bg-amber-400', label: 'Being Prepared', desc: 'Our chef is preparing your meal 🍳' },
    Ready: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400', label: 'Ready for Pickup', desc: 'Your order is ready!' },
    Delivered: { icon: Truck, color: 'text-gold-400', bg: 'bg-gold-400', label: 'Delivered', desc: 'Enjoy your meal! 🎉' },
};

const DeliveryCountdown = ({ orderTime }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calcTime = () => {
            // Delivery window: 7:30 PM - 7:45 PM same day
            const ordered = new Date(orderTime);
            const deliveryStart = new Date(ordered);
            deliveryStart.setHours(19, 30, 0, 0);

            const now = new Date();
            const diff = deliveryStart - now;

            if (diff <= 0) {
                setTimeLeft('Arriving soon!');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff / (1000 * 60)) % 60);

            if (hours > 0) {
                setTimeLeft(`~${hours}h ${mins}m until delivery`);
            } else {
                setTimeLeft(`~${mins} minutes until delivery`);
            }
        };

        calcTime();
        const interval = setInterval(calcTime, 30000);
        return () => clearInterval(interval);
    }, [orderTime]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-light p-4 mb-6 flex items-center gap-3"
        >
            <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-gold-400" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gold-300">{timeLeft}</p>
                <p className="text-[10px] text-gold-300/30">Delivery window: 7:30 PM — 7:45 PM</p>
            </div>
        </motion.div>
    );
};

const FeedbackForm = ({ token, existingRating, existingFeedback }) => {
    const { t } = useLang();
    const [rating, setRating] = useState(existingRating || 0);
    const [feedback, setFeedback] = useState(existingFeedback || '');
    const [submitted, setSubmitted] = useState(existingRating > 0);
    const [submitting, setSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/orders/${token}/feedback`, { rating, feedback });
            setSubmitted(true);
        } catch (err) {
            console.error('Feedback error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 text-center"
            >
                <div className="text-3xl mb-2">🙏</div>
                <p className="text-sm font-semibold text-gold-300">{t('thanksFeedback')}</p>
                <div className="flex justify-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={16} className={s <= rating ? 'text-gold-400 fill-gold-400' : 'text-dark-500'} />
                    ))}
                </div>
                {feedback && <p className="text-xs text-gold-300/40 mt-2 italic">"{feedback}"</p>}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 space-y-4"
        >
            <div className="text-center">
                <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider">{t('rateYourOrder')}</h3>
                <p className="text-xs text-gold-300/30 mt-1">Your feedback helps us improve</p>
            </div>

            {/* Star Rating */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                    <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(s)}
                        className="transition-transform hover:scale-125"
                    >
                        <Star
                            size={28}
                            className={`transition-colors ${s <= (hoverRating || rating) ? 'text-gold-400 fill-gold-400' : 'text-dark-500 hover:text-gold-500/30'}`}
                        />
                    </button>
                ))}
            </div>

            {/* Feedback Text */}
            {rating > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder={t('feedbackPlaceholder')}
                        className="w-full px-4 py-3 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm placeholder:text-gold-300/20 focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
                        rows={3}
                    />
                </motion.div>
            )}

            {/* Submit */}
            {rating > 0 && (
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl btn-shimmer flex items-center justify-center gap-2 text-sm hover:from-gold-500 hover:to-gold-400 transition-all disabled:opacity-50"
                >
                    {submitting ? (
                        <div className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                    ) : (
                        <><Send size={14} /> {t('submitFeedback')}</>
                    )}
                </button>
            )}
        </motion.div>
    );
};

const OrderTrack = () => {
    const { t } = useLang();
    const { token } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [pushStatus, setPushStatus] = useState('idle'); // idle, subscribed, denied, unsupported

    const fetchOrder = async () => {
        try {
            const res = await axios.get(`${API}/orders/track/${token}`);
            setOrder(res.data.data);
            setError(null);
        } catch (err) {
            setError('Order not found. Please check your tracking link.');
        } finally {
            setLoading(false);
        }
    };

    // Subscribe to push notifications for this order
    const subscribeToPush = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setPushStatus('unsupported');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setPushStatus('denied');
                return;
            }

            const reg = await navigator.serviceWorker.ready;

            // Get VAPID public key from server
            const vapidRes = await axios.get(`${API}/push/vapid-key`);
            const vapidKey = vapidRes.data.publicKey;
            console.log('Push: Received VAPID Key:', vapidKey);

            if (!vapidKey) {
                console.error('Push: No VAPID key received');
                return;
            }

            // Check existing subscription
            const existingSub = await reg.pushManager.getSubscription();
            if (existingSub) {
                // If it exists, unsubscribe first to ensure we use the correct key
                console.log('Push: Unsubscribing existing subscription...');
                await existingSub.unsubscribe();
            }

            // Convert VAPID key to Uint8Array
            const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
            const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
            const raw = atob(base64);
            const applicationServerKey = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) applicationServerKey[i] = raw.charCodeAt(i);

            console.log('Push: Converted Key (first 10 bytes):', applicationServerKey.slice(0, 10));

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            console.log('Push: Subscription successful:', subscription);

            // Send subscription to server with order token
            await axios.post(`${API}/push/subscribe`, {
                subscription: subscription.toJSON(),
                orderToken: token,
            });

            setPushStatus('subscribed');
        } catch (err) {
            console.error('Push subscription failed:', err);
            // Check for specific error types
            if (err.name === 'AbortError') {
                console.error('Push: AbortError - likely VAPID key mismatch or invalid format.');
                // Try one more time with a hard unregister if possible?
                // For now, just log it.
            }
            setPushStatus('denied');
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [token]);

    // Auto-subscribe to push after order loads
    useEffect(() => {
        if (order && order.status !== 'Delivered' && pushStatus === 'idle') {
            subscribeToPush();
        }
    }, [order]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const msg = `Track my OG Biriyani order: ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleDownloadReceipt = () => {
        if (!order) return;
        try {
            const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
            const w = 80;
            let y = 10;
            const items = (() => { try { return JSON.parse(order.items); } catch { return []; } })();

            doc.setFillColor(26, 26, 46);
            doc.rect(0, 0, w, 200, 'F');
            doc.setTextColor(212, 175, 55);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('OG BIRIYANI', w / 2, y, { align: 'center' });
            y += 5;
            doc.setFontSize(7);
            doc.setTextColor(180, 160, 100);
            doc.text('Homemade Food \u00b7 Prepared Daily Fresh', w / 2, y, { align: 'center' });
            y += 4;
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.line(8, y, w - 8, y);
            y += 5;

            doc.setFontSize(8);
            doc.setTextColor(200, 180, 120);
            doc.text(`Order #${order.order_token}`, w / 2, y, { align: 'center' });
            y += 4;
            doc.setFontSize(7);
            doc.setTextColor(160, 140, 90);
            doc.text(new Date(order.created_at).toLocaleDateString('en-IN'), w / 2, y, { align: 'center' });
            y += 6;

            doc.setDrawColor(100, 90, 60);
            doc.setLineWidth(0.15);
            doc.line(8, y, w - 8, y);
            y += 4;
            doc.setFontSize(8);
            items.forEach(item => {
                doc.setTextColor(220, 200, 150);
                doc.text(`${item.quantity}\u00d7 ${item.name}`, 8, y);
                doc.setTextColor(212, 175, 55);
                doc.text(`\u20b9${item.price * item.quantity}`, w - 8, y, { align: 'right' });
                y += 5;
            });

            y += 1;
            doc.line(8, y, w - 8, y);
            y += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(212, 175, 55);
            doc.text('Total', 8, y);
            doc.text(`\u20b9${order.total_amount}`, w - 8, y, { align: 'right' });
            y += 7;

            doc.line(8, y, w - 8, y);
            y += 4;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(160, 140, 90);
            doc.text(`Name: ${order.customer_name}`, 8, y); y += 4;
            doc.text(`Status: ${order.status}`, 8, y); y += 6;

            doc.setTextColor(130, 120, 80);
            doc.setFontSize(6);
            doc.text('Thank you for ordering with OG Biryani \u2764', w / 2, y, { align: 'center' });

            doc.save(`OG-Biryani-Receipt-${order.order_token}.pdf`);
        } catch (err) {
            console.error('Receipt download failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                <p className="text-gold-400/60 font-light tracking-wide">Finding your order...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-ember-500/10 flex items-center justify-center">
                    <Package size={28} className="text-ember-500/50" />
                </div>
                <h2 className="text-xl font-serif text-gold-300/60">{error}</h2>
                <Link to="/" className="text-gold-500 text-sm hover:text-gold-400 transition-colors underline underline-offset-4">
                    Go Home
                </Link>
            </div>
        );
    }

    const currentIndex = STATUSES.indexOf(order.status);
    const items = JSON.parse(order.items || '[]');
    const isDelivered = order.status === 'Delivered';

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">{t('orderTracking')}</h2>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
                <p className="text-gold-300/40 text-xs mt-3 font-mono">#{order.order_token}</p>
                {order.scheduled_date && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-gold-500/10 border border-gold-500/20 rounded-full text-gold-400 text-xs">
                        <span>📅</span>
                        <span>Scheduled: {new Date(order.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                        {order.scheduled_time && <span>at {order.scheduled_time}</span>}
                    </div>
                )}
                {pushStatus === 'subscribed' && (
                    <p className="text-[10px] text-green-400/60 mt-1 flex items-center justify-center gap-1">
                        <Bell size={10} /> Notifications enabled
                    </p>
                )}
                {pushStatus === 'denied' && (
                    <button
                        onClick={subscribeToPush}
                        className="text-[10px] text-gold-300/30 mt-1 flex items-center justify-center gap-1 hover:text-gold-300/50 transition-colors"
                    >
                        <Bell size={10} /> Enable notifications
                    </button>
                )}
            </div>

            {/* Estimated Delivery Countdown */}
            {!isDelivered && <DeliveryCountdown orderTime={order.created_at} />}

            {/* Status Stepper */}
            <div className="glass-card p-6 mb-6">
                {/* Animated Progress Bar */}
                <div className="relative h-2 rounded-full bg-dark-600 mb-6 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentIndex / (STATUSES.length - 1)) * 100}%` }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, #3B82F6, #F59E0B, #22C55E, #D4AF37)',
                            boxShadow: '0 0 12px rgba(212,175,55,0.4)',
                        }}
                    />
                </div>
                <div className="space-y-0">
                    {STATUSES.map((status, index) => {
                        const config = STATUS_CONFIG[status];
                        const Icon = config.icon;
                        const isActive = index <= currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                            <div key={status} className="flex items-start gap-4">
                                {/* Dot + Line */}
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            scale: isCurrent ? [1, 1.2, 1] : 1,
                                            opacity: isActive ? 1 : 0.25,
                                        }}
                                        transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? `${config.bg}/20` : 'bg-dark-600'
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? config.color : 'text-gold-300/20'} />
                                    </motion.div>
                                    {index < STATUSES.length - 1 && (
                                        <div className={`w-0.5 h-10 ${isActive ? config.bg + '/40' : 'bg-dark-600'}`} />
                                    )}
                                </div>

                                {/* Label */}
                                <div className={`pt-2 pb-6 ${isActive ? '' : 'opacity-30'}`}>
                                    <p className={`font-semibold text-sm ${isActive ? config.color : 'text-gold-300/40'}`}>
                                        {config.label}
                                    </p>
                                    {isCurrent && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs text-gold-300/50 mt-1"
                                        >
                                            {config.desc}
                                        </motion.p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Order Summary */}
            <div className="glass-card p-5 mb-6 space-y-3">
                <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider">Order Summary</h3>
                {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                        <span className="text-gold-200/80">{item.quantity}× {item.name}</span>
                        <span className="text-gold-400 font-semibold tabular-nums">₹{item.price * item.quantity}</span>
                    </div>
                ))}
                <div className="border-t border-gold-700/20 pt-2 flex justify-between">
                    <span className="font-serif text-gold-300">Total</span>
                    <span className="font-bold text-gradient-gold">₹{order.total_amount}</span>
                </div>
            </div>

            {/* Info */}
            {!isDelivered && (
                <div className="glass-card-light p-4 mb-6 flex items-center gap-3">
                    <Clock size={16} className="text-gold-400/60 shrink-0" />
                    <p className="text-xs text-gold-300/50">
                        Auto-updates every 10 seconds. Delivery between <span className="text-gold-400 font-semibold">7:30 PM – 7:45 PM</span>
                    </p>
                </div>
            )}

            {/* Customer Feedback — only after delivery */}
            {isDelivered && (
                <div className="mb-6">
                    <FeedbackForm token={token} existingRating={order.rating} existingFeedback={order.feedback} />
                </div>
            )}

            {/* Share & Download Buttons */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-3 glass-card-light flex items-center justify-center gap-2 text-sm text-green-400 hover:bg-green-400/10 transition-colors"
                >
                    <Share2 size={16} />
                    Share
                </button>
                <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3 glass-card-light flex items-center justify-center gap-2 text-sm text-gold-400 hover:bg-gold-500/10 transition-colors"
                >
                    <Copy size={16} />
                    {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                    onClick={handleDownloadReceipt}
                    className="flex-1 py-3 glass-card-light flex items-center justify-center gap-2 text-sm text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                    <Download size={16} />
                    Receipt
                </button>
            </div>

            {/* Navigation Links */}
            <div className="flex gap-3">
                <Link to="/history" className="flex-1 py-2.5 glass-card-light flex items-center justify-center gap-2 text-xs text-gold-300/50 hover:text-gold-300/80 transition-colors">
                    <MessageSquare size={14} />
                    Order History
                </Link>
                <Link to="/menu" className="flex-1 py-2.5 glass-card-light flex items-center justify-center gap-2 text-xs text-gold-300/50 hover:text-gold-300/80 transition-colors">
                    Order Again →
                </Link>
            </div>
        </div>
    );
};

export default OrderTrack;
