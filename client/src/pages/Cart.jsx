import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Phone, CheckCircle, Plus, Minus, ShoppingBag, Clock, Download, Award, Share2, Navigation, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useLang } from '../App';

const Cart = ({ cart, removeFromCart, updateQuantity, clearCart, orderCount = 0 }) => {
    const navigate = useNavigate();
    const { t, lang } = useLang();
    const [customerName, setCustomerName] = useState(localStorage.getItem('customerName') || '');
    const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('customerPhone') || '');
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

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = Math.round(total * couponDiscount / 100);
    const finalTotal = total - discountAmount;
    const loyaltyThreshold = 5;
    const earnedReward = orderCount >= loyaltyThreshold;

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

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        // Validate phone
        const cleanPhone = customerPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
            setPhoneError('Enter a valid 10-digit Indian phone number');
            return;
        }
        setPhoneError('');
        setIsOrdering(true);

        localStorage.setItem('customerName', customerName);
        localStorage.setItem('customerPhone', customerPhone);

        const order = {
            items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
            total: finalTotal,
            customerName,
            customerPhone
        };

        try {
            const apiRes = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, order);
            const orderToken = apiRes.data.data.orderToken;

            // Save tracking token to localStorage so customer never loses it
            localStorage.setItem('lastOrderToken', orderToken);
            localStorage.setItem('lastOrderTime', new Date().toISOString());
            // Save cart items for Repeat Last Order feature
            localStorage.setItem('lastOrder', JSON.stringify(cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }))));

            const message = `${t('waHeader')}\n━━━━━━━━━━━━━━━━━━\n📋 Order #${orderToken}\n\n${t('waItems')}:\n` +
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

    const handleDownloadReceipt = async () => {
        if (!receiptRef.current) return;
        try {
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#1A1A2E',
                scale: 2,
                useCORS: true,
            });
            const link = document.createElement('a');
            link.download = `OG-Biryani-Receipt-${orderData?.orderNumber || 'order'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Receipt download failed:", err);
        }
    };

    // ─── Order Complete Screen with Receipt ────────────
    if (orderComplete && orderData) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-md mx-auto"
            >
                <div className="w-20 h-20 rounded-full bg-green-accent/10 flex items-center justify-center glow-gold">
                    <CheckCircle className="w-12 h-12 text-green-accent" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-gradient-gold">{t('orderPlaced')}</h2>
                <p className="text-gold-300/60 font-light">Verify details on WhatsApp to confirm your order.</p>

                {/* Loyalty Reward */}
                {earnedReward && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-4 flex items-center gap-3 glow-gold w-full"
                        style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}
                    >
                        <span className="text-2xl">🎉</span>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-green-accent">Congrats! You earned a free Coke!</p>
                            <p className="text-xs text-gold-300/40">Mention this at pickup/delivery to claim.</p>
                        </div>
                    </motion.div>
                )}

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

            {/* Loyalty Streak Badge */}
            {orderCount > 0 && (
                <div className="glass-card-light p-3 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center">
                        <Award size={16} className="text-gold-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gold-300/60">
                            Biryani Streak: <span className="text-gold-400 font-bold">{orderCount}</span> order{orderCount !== 1 ? 's' : ''}
                            {!earnedReward && <span className="text-gold-300/30"> — {loyaltyThreshold - orderCount} more for a free Coke!</span>}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1.5 bg-dark-700/50 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (orderCount / loyaltyThreshold) * 100)}%` }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
                            />
                        </div>
                    </div>
                </div>
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
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-gold-400 hover:bg-gold-500/15 transition-colors"
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

            {/* Order Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4">
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

                <button
                    type="submit"
                    disabled={isOrdering || isOrderingLocked}
                    className={`w-full font-bold py-4 rounded-xl flex justify-center items-center gap-3 text-lg transition-all ${isOrderingLocked
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
                    ) : (
                        <>
                            {t('placeOrderWhatsApp')} <Phone size={20} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default Cart;
