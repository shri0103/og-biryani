import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Phone, CheckCircle, Plus, Minus, ShoppingBag, Clock, Download, Share2, Navigation, Tag, CalendarClock, AlertTriangle, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { useLang } from '../App';

const Cart = ({ cart, removeFromCart, updateQuantity, clearCart, orderCount = 0 }) => {
    const navigate = useNavigate();
    const { t, lang } = useLang();
    const [customerName, setCustomerName] = useState(localStorage.getItem('customerName') || '');
    const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('customerPhone') || '');
    const [customerId, setCustomerId] = useState(null);
    const [customerToken, setCustomerToken] = useState(localStorage.getItem('customerToken') || null);
    
    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPwd, setShowForgotPwd] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [isOrderingLocked, setIsOrderingLocked] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const receiptRef = useRef(null);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponApplied, setCouponApplied] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Schedule / Pre-order state
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Helper: get tomorrow's date as YYYY-MM-DD
    const getTomorrow = () => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };
    const getMaxDate = () => {
        const d = new Date(); d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    };
    const timeSlots = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'];

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = Math.round(total * couponDiscount / 100);
    const finalTotal = total - discountAmount;

    // Check auth status on mount
    useEffect(() => {
        if (customerToken) {
            axios.get(`${import.meta.env.VITE_API_URL}/auth/customer/me`, {
                headers: { Authorization: `Bearer ${customerToken}` }
            }).then(res => {
                setCustomerName(res.data.customer.name);
                setCustomerPhone(res.data.customer.phone);
                setCustomerId(res.data.customer.id);
            }).catch(() => {
                // Token invalid or expired
                setCustomerToken(null);
                localStorage.removeItem('customerToken');
            });
        }
    }, [customerToken]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        try {
            const endpoint = authMode === 'login' ? '/auth/customer/login' : '/auth/customer/signup';
            const payload = authMode === 'login' ? { phone: customerPhone, password: authPassword } : { name: customerName, phone: customerPhone, password: authPassword };
            const res = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, payload);
            
            setCustomerToken(res.data.token);
            localStorage.setItem('customerToken', res.data.token);
            setCustomerName(res.data.customer.name);
            setCustomerPhone(res.data.customer.phone);
            setCustomerId(res.data.customer.id);
            setShowAuthModal(false);
            setAuthPassword('');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setAuthLoading(false);
        }
    };


    // ─── Smart Ordering Lock ──────────────────────────
    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const h = now.getHours();
            setIsOrderingLocked(h < 6 || h >= 13); // Orders: 6 AM to 1 PM
        };
        checkTime();
        const interval = setInterval(checkTime, 30000);
        return () => clearInterval(interval);
    }, []);

    // Step 1: Validate and show confirmation
    const handlePlaceOrder = (e) => {
        e.preventDefault();
        const cleanPhone = customerPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
            setPhoneError('Enter a valid 10-digit Indian phone number');
            return;
        }
        setPhoneError('');
        setShowConfirm(true);
    };

    // Step 2: Confirm and place order
    const confirmAndPlaceOrder = async () => {
        setShowConfirm(false);
        setIsOrdering(true);

        localStorage.setItem('customerName', customerName);
        localStorage.setItem('customerPhone', customerPhone);

        const order = {
            items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
            total: finalTotal,
            customerName,
            customerPhone,
            customerId,
            ...(isScheduled && scheduledDate ? { scheduledDate, scheduledTime } : {})
        };

        try {
            const apiRes = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, order);
            const orderToken = apiRes.data.data.orderToken;

            // Save tracking token to localStorage so customer never loses it
            localStorage.setItem('lastOrderToken', orderToken);
            localStorage.setItem('lastOrderTime', new Date().toISOString());
            // Save cart items for Repeat Last Order feature
            localStorage.setItem('lastOrder', JSON.stringify(cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }))));

            const scheduleInfo = isScheduled && scheduledDate
                ? `\n\n📅 SCHEDULED ORDER\n🗓️ Date: ${new Date(scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}\n⏰ Time: ${scheduledTime || 'Any time (6AM–1PM)'}`
                : '';

            const message = `${t('waHeader')}\n━━━━━━━━━━━━━━━━━━\n📋 Order #${orderToken}${scheduleInfo}\n\n${t('waItems')}:\n` +
                cart.map(item => `  • ${item.quantity}× ${item.name} — ₹${item.price * item.quantity}`).join('\n') +
                (discountAmount > 0 ? `\n\n🏷️ ${t('discount')}: -₹${discountAmount} (${couponDiscount}%)` : '') +
                `\n\n${t('waTotal')}: ₹${finalTotal}\n${t('waName')}: ${customerName}\n${t('waPhone')}: ${customerPhone}` +
                `\n\n${t('waTrack')}: ${window.location.origin}/track/${orderToken}\n━━━━━━━━━━━━━━━━━━`;

            const whatsappUrl = `https://wa.me/919363164680?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            setOrderData({
                items: cart.map(item => ({ ...item })),
                total,
                customerName,
                customerPhone,
                date: new Date().toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true,
                }),
                orderNumber: orderToken,
            });

            setOrderComplete(true);
            clearCart();
            // No auto-redirect — customer uses the Track button on confirmation screen
        } catch (error) {
            console.error("Order failed:", error);
            alert("Order failed to save. Please try again or contact via WhatsApp directly.");
        } finally {
            setIsOrdering(false);
        }
    };

    const handleDownloadReceipt = () => {
        if (!orderData) return;
        try {
            const doc = new jsPDF({ unit: 'mm', format: [80, 200] }); // receipt-width
            const w = 80;
            let y = 10;

            // Header
            doc.setFillColor(26, 26, 46);
            doc.rect(0, 0, w, 200, 'F');
            doc.setTextColor(212, 175, 55);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('OG BIRIYANI', w / 2, y, { align: 'center' });
            y += 5;
            doc.setFontSize(7);
            doc.setTextColor(180, 160, 100);
            doc.text('Homemade Food · Prepared Daily Fresh', w / 2, y, { align: 'center' });
            y += 4;
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.line(8, y, w - 8, y);
            y += 5;

            // Order info
            doc.setFontSize(8);
            doc.setTextColor(200, 180, 120);
            doc.text(`Order #${orderData.orderNumber}`, w / 2, y, { align: 'center' });
            y += 4;
            doc.setFontSize(7);
            doc.setTextColor(160, 140, 90);
            doc.text(orderData.date || new Date().toLocaleDateString('en-IN'), w / 2, y, { align: 'center' });
            y += 6;

            // Items
            doc.setDrawColor(100, 90, 60);
            doc.setLineWidth(0.15);
            doc.line(8, y, w - 8, y);
            y += 4;
            doc.setFontSize(8);
            orderData.items.forEach(item => {
                doc.setTextColor(220, 200, 150);
                doc.text(`${item.quantity}× ${item.name}`, 8, y);
                doc.setTextColor(212, 175, 55);
                doc.text(`₹${item.price * item.quantity}`, w - 8, y, { align: 'right' });
                y += 5;
            });

            // Discount
            if (orderData.discount && orderData.discount > 0) {
                doc.setTextColor(52, 211, 153);
                doc.text('Discount', 8, y);
                doc.text(`-₹${orderData.discount}`, w - 8, y, { align: 'right' });
                y += 5;
            }

            // Total
            y += 1;
            doc.line(8, y, w - 8, y);
            y += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(212, 175, 55);
            doc.text('Total', 8, y);
            doc.text(`₹${orderData.total}`, w - 8, y, { align: 'right' });
            y += 7;

            // Customer info
            doc.line(8, y, w - 8, y);
            y += 4;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(160, 140, 90);
            doc.text(`Name: ${orderData.customerName}`, 8, y); y += 4;
            doc.text(`Phone: ${orderData.customerPhone}`, 8, y); y += 6;

            // Footer
            doc.setTextColor(130, 120, 80);
            doc.setFontSize(6);
            doc.text('Thank you for ordering with OG Biryani ❤', w / 2, y, { align: 'center' });
            y += 4;
            doc.text(`Track: ${window.location.origin}/track/${orderData.orderNumber}`, w / 2, y, { align: 'center' });

            doc.save(`OG-Biryani-Receipt-${orderData.orderNumber}.pdf`);
        } catch (err) {
            console.error('Receipt download failed:', err);
        }
    };

    // ─── Order Complete Screen with Receipt ────────────
    if (orderComplete && orderData) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-md mx-auto overflow-hidden"
            >
                {/* 🎊 Confetti Burst */}
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {Array.from({ length: 30 }).map((_, i) => {
                        const colors = ['#D4AF37', '#34D399', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#EF4444', '#06B6D4'];
                        const color = colors[i % colors.length];
                        const left = Math.random() * 100;
                        const delay = Math.random() * 1.2;
                        const size = 6 + Math.random() * 8;
                        const rotation = Math.random() * 360;
                        const isCircle = i % 3 === 0;
                        return (
                            <motion.div
                                key={i}
                                initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 1 }}
                                animate={{
                                    y: ['0vh', '110vh'],
                                    x: [0, (Math.random() - 0.5) * 200],
                                    opacity: [1, 1, 0],
                                    rotate: [0, rotation + 720],
                                    scale: [1, 0.5],
                                }}
                                transition={{ duration: 2.5 + Math.random() * 1.5, delay, ease: 'easeIn' }}
                                style={{
                                    position: 'absolute',
                                    left: `${left}%`,
                                    top: -10,
                                    width: size,
                                    height: isCircle ? size : size * 2.5,
                                    backgroundColor: color,
                                    borderRadius: isCircle ? '50%' : '2px',
                                }}
                            />
                        );
                    })}
                </div>

                <div className="w-20 h-20 rounded-full bg-green-accent/10 flex items-center justify-center glow-gold">
                    <CheckCircle className="w-12 h-12 text-green-accent" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-gradient-gold">{t('orderPlaced')}</h2>
                <p className="text-gold-300/60 font-light">Verify details on WhatsApp to confirm your order.</p>



                {/* Receipt Card */}
                <div
                    ref={receiptRef}
                    className="w-full glass-card p-6 text-left space-y-4"
                    style={{ borderColor: 'rgba(212, 175, 55, 0.25)' }}
                >
                    {/* Receipt Header */}
                    <div className="text-center border-b border-gold-700/20 pb-4">
                        <h3 className="text-2xl font-serif font-bold text-gradient-gold tracking-wider">OG BIRIYANI</h3>
                        <p className="text-[11px] text-gold-300/40 italic mt-1">Homemade Food · Prepared Daily Fresh</p>
                        <p className="text-[10px] text-gold-300/30 mt-2 font-mono">#{orderData.orderNumber}</p>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                        {orderData.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-gold-200/80">
                                    {item.quantity}× {item.name}
                                </span>
                                <span className="text-gold-400 font-semibold tabular-nums">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gold-700/20 pt-3 flex justify-between items-center">
                        <span className="font-serif text-lg text-gold-300">Total</span>
                        <span className="text-xl font-bold text-gradient-gold">₹{orderData.total}</span>
                    </div>

                    {/* Customer Info */}
                    <div className="border-t border-gold-700/20 pt-3 text-xs text-gold-300/40 space-y-1">
                        <p><span className="text-gold-300/60">Name:</span> {orderData.customerName}</p>
                        <p><span className="text-gold-300/60">Phone:</span> {orderData.customerPhone}</p>
                        <p><span className="text-gold-300/60">Date:</span> {orderData.date}</p>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-2">
                        <p className="text-[10px] text-gold-300/25">Thank you for ordering with OG Biryani ❤️</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Link
                        to={`/track/${orderData.orderNumber}`}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all text-sm"
                    >
                        <Navigation size={16} />
                        {t('trackMyOrder')}
                    </Link>
                    <button
                        onClick={handleDownloadReceipt}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 glass-card-light text-gold-400 hover:text-gold-300 hover:border-gold-500/40 transition-all font-medium text-sm"
                    >
                        <Download size={16} />
                        {t('downloadReceipt')}
                    </button>
                </div>
            </motion.div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center">
                    <ShoppingBag size={28} className="text-gold-500/30" />
                </div>
                <h2 className="text-2xl font-serif text-gold-300/40">{t('cartEmpty')}</h2>
                <p className="text-gold-300/30 text-sm font-light">{t('cartEmptyDesc')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">{t('yourCart')}</h2>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
            </div>

            {/* Ordering Locked Banner */}
            {isOrderingLocked && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 flex items-center gap-4 mb-6"
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



            {/* Cart Items */}
            <div className="space-y-3 mb-8">
                <AnimatePresence>
                    {cart.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0 }}
                            className="glass-card p-4 flex justify-between items-center gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="font-serif font-bold text-lg text-gold-200 truncate">{item.name}</h3>
                                <p className="text-xs text-gold-300/40 mt-0.5">{item.category}</p>
                                <p className="text-xs text-gold-500 mt-1 font-medium">₹{item.price} each</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2 glass-card-light px-2 py-1">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-gold-400 hover:bg-gold-500/15 transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="font-bold w-6 text-center text-gold-300 tabular-nums text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        disabled={item.quantity >= 20}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${item.quantity >= 20 ? 'text-gold-300/30 cursor-not-allowed bg-transparent' : 'text-gold-400 hover:bg-gold-500/15'}`}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {/* Price */}
                                <span className="font-bold text-gold-300 w-16 text-right tabular-nums">₹{item.price * item.quantity}</span>

                                {/* Remove */}
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-ember-500/60 hover:text-ember-500 hover:bg-ember-500/10 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Total */}
            <div className="glass-card p-5 mb-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gold-300/60">{t('subtotal')}</span>
                    <span className="text-gold-300 font-mono">₹{total}</span>
                </div>
                {couponApplied && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-green-accent">{t('discount')} ({couponDiscount}%)</span>
                        <span className="text-green-accent font-mono">-₹{discountAmount}</span>
                    </div>
                )}
                <div className="border-t border-gold-700/20 pt-2 flex justify-between items-center">
                    <span className="text-lg font-serif text-gold-300">{t('total')}</span>
                    <span className="text-2xl font-bold text-gradient-gold">₹{finalTotal}</span>
                </div>
            </div>

            {/* Coupon Code */}
            <div className="glass-card-light p-4 mb-8">
                <label className="text-xs text-gold-300/40 uppercase tracking-wider block mb-2">Promo Code</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500/30" />
                        <input
                            type="text"
                            value={couponCode}
                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                            disabled={!!couponApplied}
                            placeholder="Enter coupon code"
                            className="w-full px-4 pl-9 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm placeholder:text-gold-300/20 focus:outline-none focus:border-gold-500/50 font-mono uppercase disabled:opacity-50"
                        />
                    </div>
                    {couponApplied ? (
                        <button
                            onClick={() => { setCouponApplied(null); setCouponDiscount(0); setCouponCode(''); }}
                            className="px-4 py-2 text-xs font-semibold text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all"
                        >Remove</button>
                    ) : (
                        <button
                            onClick={async () => {
                                if (!couponCode.trim()) return;
                                setApplyingCoupon(true); setCouponError('');
                                try {
                                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/coupons/validate`, { code: couponCode });
                                    setCouponDiscount(res.data.data.discount_percent);
                                    setCouponApplied(res.data.data.code);
                                } catch (err) {
                                    setCouponError(err.response?.data?.error || 'Invalid coupon');
                                } finally { setApplyingCoupon(false); }
                            }}
                            disabled={applyingCoupon}
                            className="px-4 py-2 text-xs font-semibold bg-gold-500/15 text-gold-400 border border-gold-500/30 rounded-xl hover:bg-gold-500/25 transition-all disabled:opacity-50"
                        >{applyingCoupon ? '...' : t('apply')}</button>
                    )}
                </div>
                {couponError && <p className="text-red-400 text-xs mt-1.5">{couponError}</p>}
                {couponApplied && <p className="text-green-accent text-xs mt-1.5">✓ Coupon {couponApplied} applied — {couponDiscount}% off!</p>}
            </div>

            {/* Total Exceeded Banner */}
            {finalTotal > 5000 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card-light p-4 mb-6 border-red-500/30 bg-red-500/5"
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-red-400 mb-1">Catering Order Required</h4>
                            <p className="text-xs text-red-300/70 leading-relaxed">
                                Your order total exceeds the maximum website limit of <b>₹5,000</b>. For large catering orders, please call us directly to confirm availability and prep time.
                            </p>
                            <a href="tel:9363164680" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-all border border-red-500/20">
                                <Phone size={14} /> Call 93631 64680 to Order
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Order Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Auth Section */}
                <div className="glass-card p-4 flex justify-between items-center bg-dark-800/80">
                    <div>
                        {customerToken ? (
                            <div>
                                <p className="text-sm font-bold text-gold-300">Welcome back, {customerName}!</p>
                                <p className="text-xs text-gold-300/50">{customerPhone}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-bold text-gold-300">Save your details for next time?</p>
                                <p className="text-xs text-gold-300/50">Login or create an account</p>
                            </div>
                        )}
                    </div>
                    <div>
                        {customerToken ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomerToken(null);
                                    setCustomerId(null);
                                    localStorage.removeItem('customerToken');
                                }}
                                className="text-xs px-3 py-1 border border-gold-600/30 rounded text-gold-400 hover:bg-gold-500/10"
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowAuthModal(true)}
                                className="text-xs px-3 py-1 bg-gold-600 text-dark-900 rounded font-bold hover:bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                            >
                                Login / Signup
                            </button>
                        )}
                    </div>
                </div>

                {!customerToken && (
                    <>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('yourName')}
                                required
                                className="w-full p-4 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 placeholder-gold-300/30 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 font-light"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-300/30 text-sm">+91</div>
                            <input
                                type="tel"
                                placeholder={t('yourPhone')}
                                required
                                maxLength={10}
                                pattern="[6-9][0-9]{9}"
                                className={`w-full p-4 pl-12 bg-dark-700/50 border rounded-xl text-gold-200 placeholder-gold-300/30 focus:outline-none focus:ring-1 font-light ${phoneError
                                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                                    : 'border-gold-600/20 focus:border-gold-500/50 focus:ring-gold-500/20'
                                    }`}
                                value={customerPhone}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setCustomerPhone(val);
                                    if (phoneError && val.length === 10 && /^[6-9]/.test(val)) setPhoneError('');
                                }}
                            />
                            {phoneError && (
                                <p className="text-red-400 text-xs mt-1.5 ml-1">{phoneError}</p>
                            )}
                            {customerPhone.length > 0 && customerPhone.length < 10 && (
                                <p className="text-gold-300/30 text-xs mt-1.5 ml-1">{10 - customerPhone.length} digits remaining</p>
                            )}
                        </div>
                    </>
                )}


                {/* Schedule / Pre-Order Toggle */}
                <div className="glass-card-light p-4">
                    <button
                        type="button"
                        onClick={() => {
                            setIsScheduled(!isScheduled);
                            if (!isScheduled && !scheduledDate) setScheduledDate(getTomorrow());
                        }}
                        className={`w-full flex items-center gap-3 transition-all ${isScheduled ? 'text-gold-400' : 'text-gold-300/50 hover:text-gold-300/70'}`}
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isScheduled ? 'bg-gold-500/20' : 'bg-dark-700/50'
                            }`}>
                            <CalendarClock size={16} />
                        </div>
                        <div className="text-left flex-1">
                            <p className="text-sm font-semibold">Schedule for Later</p>
                            <p className="text-[10px] text-gold-300/35">Pre-order for tomorrow or day after</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-all ${isScheduled ? 'bg-gold-500' : 'bg-dark-600'
                            }`}>
                            <motion.div
                                animate={{ x: isScheduled ? 20 : 2 }}
                                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                        </div>
                    </button>

                    <AnimatePresence>
                        {isScheduled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 pt-3 border-t border-gold-600/10 space-y-3">
                                    {/* Date Picker */}
                                    <div>
                                        <label className="text-[10px] text-gold-300/40 uppercase tracking-wider block mb-1">Pickup Date</label>
                                        <input
                                            type="date"
                                            min={getTomorrow()}
                                            max={getMaxDate()}
                                            value={scheduledDate}
                                            onChange={e => setScheduledDate(e.target.value)}
                                            className="w-full p-3 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm focus:outline-none focus:border-gold-500/50"
                                        />
                                    </div>
                                    {/* Time Slot Selector */}
                                    <div>
                                        <label className="text-[10px] text-gold-300/40 uppercase tracking-wider block mb-1.5">Preferred Time</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {timeSlots.map(slot => (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => setScheduledTime(scheduledTime === slot ? '' : slot)}
                                                    className={`py-1.5 px-1 text-[11px] rounded-lg font-medium transition-all ${scheduledTime === slot
                                                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                                                        : 'bg-dark-700/30 text-gold-300/40 border border-transparent hover:border-gold-600/20'
                                                        }`}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    type="submit"
                    disabled={isOrdering || isOrderingLocked || finalTotal > 5000}
                    className={`w-full font-bold py-4 rounded-xl flex justify-center items-center gap-3 text-lg transition-all ${isOrderingLocked || finalTotal > 5000
                        ? 'bg-dark-600 text-gold-300/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 hover:from-gold-500 hover:to-gold-400 btn-shimmer glow-gold-strong disabled:opacity-50'
                        }`}
                >
                    {isOrdering ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                            {t('placing')}
                        </div>
                    ) : isOrderingLocked ? (
                        <div className="flex items-center gap-2">
                            <Clock size={20} />
                            {t('ordersClosedBanner')}
                        </div>
                    ) : finalTotal > 5000 ? (
                        <div className="flex items-center gap-2 text-red-400/80 text-sm">
                            <AlertTriangle size={18} />
                            Maximum order limit (₹5,000) exceeded
                        </div>
                    ) : (
                        <>
                            {t('placeOrderWhatsApp')} <Phone size={20} />
                        </>
                    )}
                </button>
            </form>

            {/* Auth Modal */}
            <AnimatePresence>
                {showAuthModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowAuthModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-card p-6 max-w-sm w-full space-y-5 relative"
                            style={{ borderColor: 'rgba(212, 175, 55, 0.4)' }}
                        >
                            <button
                                onClick={() => setShowAuthModal(false)}
                                className="absolute top-4 right-4 text-gold-300/50 hover:text-gold-300"
                            >
                                <Trash2 size={16} className="hidden" /> {/* just to import something or use an X icon if imported */}
                                ✕
                            </button>
                            <div className="text-center">
                                <h3 className="text-2xl font-serif font-bold text-gradient-gold">
                                    {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                                </h3>
                                <p className="text-xs text-gold-300/50 mt-1">
                                    {authMode === 'login' ? 'Login to access your saved details' : 'Join the OG Biryani family'}
                                </p>
                            </div>

                            <form onSubmit={handleAuth} className="space-y-3">
                                {authMode === 'signup' && (
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        required
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full p-3 bg-dark-900 border border-gold-600/20 rounded-xl text-gold-200 text-sm focus:border-gold-500/50 outline-none"
                                    />
                                )}
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-300/30 text-sm">+91</div>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        required
                                        maxLength={10}
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="w-full p-3 pl-11 bg-dark-900 border border-gold-600/20 rounded-xl text-gold-200 text-sm focus:border-gold-500/50 outline-none"
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        required
                                        value={authPassword}
                                        onChange={e => setAuthPassword(e.target.value)}
                                        className="w-full p-3 pr-10 bg-dark-900 border border-gold-600/20 rounded-xl text-gold-200 text-sm focus:border-gold-500/50 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-300/40 hover:text-gold-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {authMode === 'login' && (
                                    <div className="text-right mt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowForgotPwd(true)}
                                            className="text-[11px] text-gold-300/50 hover:text-gold-400 transition-colors"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}

                                {showForgotPwd && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 text-center mt-2"
                                    >
                                        <p className="mb-2">Message us on WhatsApp to reset your password.</p>
                                        <a 
                                            href={`https://wa.me/919363164680?text=${encodeURIComponent("Hi, I forgot my OG Biryani password. Please help me reset it.")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 bg-amber-500 text-dark-900 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-400 transition-colors"
                                        >
                                            <MessageCircle size={14} /> Contact Support
                                        </a>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 bg-gold-600 text-dark-900 font-bold rounded-xl btn-shimmer hover:bg-gold-500 disabled:opacity-50 mt-2"
                                >
                                    {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                                </button>
                            </form>

                            <div className="text-center text-xs text-gold-300/60 mt-4">
                                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => {
                                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                                        setAuthError('');
                                    }}
                                    className="text-gold-400 font-bold hover:underline"
                                >
                                    {authMode === 'login' ? 'Sign up' : 'Login'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-card p-6 max-w-md w-full space-y-5"
                            style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
                        >
                            <div className="text-center">
                                <h3 className="text-xl font-serif font-bold text-gradient-gold">Confirm Your Order</h3>
                                <p className="text-xs text-gold-300/40 mt-1">Review before sending on WhatsApp</p>
                            </div>
                            <div className="space-y-2 bg-dark-800/50 rounded-xl p-4">
                                {cart.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-gold-200/80">{item.quantity}× {item.name}</span>
                                        <span className="text-gold-400 font-semibold tabular-nums">₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-400">
                                        <span>Discount ({couponDiscount}%)</span>
                                        <span>-₹{discountAmount}</span>
                                    </div>
                                )}
                                <div className="border-t border-gold-700/20 pt-2 flex justify-between">
                                    <span className="font-serif text-gold-300">{t('total')}</span>
                                    <span className="font-bold text-gradient-gold text-lg">₹{finalTotal}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gold-300/50">
                                <p>👤 {customerName} &nbsp;|&nbsp; 📞 {customerPhone}</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmAndPlaceOrder}
                                    className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm hover:from-green-500 hover:to-green-400 transition-all btn-shimmer"
                                >
                                    ✅ Confirm & Send on WhatsApp
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full py-2.5 text-sm text-gold-300/50 hover:text-gold-300/80 transition-colors"
                                >
                                    ← Go Back & Edit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Cart;
