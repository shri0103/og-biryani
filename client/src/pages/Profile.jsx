import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Package, Phone, CalendarClock, ChevronRight, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLang } from '../App';

export default function Profile() {
    const { t } = useLang();
    const navigate = useNavigate();
    
    const [customerToken, setCustomerToken] = useState(localStorage.getItem('customerToken') || null);
    const [customerData, setCustomerData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth Form State
    const [authMode, setAuthMode] = useState('login');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPwd, setShowForgotPwd] = useState(false);

    useEffect(() => {
        if (customerToken) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [customerToken]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/customer/me`, {
                headers: { Authorization: `Bearer ${customerToken}` }
            });
            setCustomerData(res.data.customer);
            
            // Fetch orders
            const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL}/customer/orders`, {
                headers: { Authorization: `Bearer ${customerToken}` }
            });
            setOrders(ordersRes.data.data);
        } catch (err) {
            console.error(err);
            handleLogout();
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        try {
            const endpoint = authMode === 'login' ? '/auth/customer/login' : '/auth/customer/signup';
            const payload = authMode === 'login' ? { phone, password } : { name, phone, password };
            const res = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, payload);
            
            setCustomerToken(res.data.token);
            localStorage.setItem('customerToken', res.data.token);
            localStorage.setItem('customerName', res.data.customer.name);
            localStorage.setItem('customerPhone', res.data.customer.phone);
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        setCustomerToken(null);
        setCustomerData(null);
        setOrders([]);
        localStorage.removeItem('customerToken');
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!customerToken) {
        return (
            <div className="max-w-md mx-auto mt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 md:p-8 space-y-6"
                    style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-4 glow-gold">
                            <User size={32} className="text-gold-400" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-gradient-gold">
                            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-sm text-gold-300/60 mt-2">
                            {authMode === 'login' ? 'Login to view your orders and earn points' : 'Join OG Biryani for faster checkouts'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'signup' && (
                            <div className="space-y-1">
                                <label className="text-xs text-gold-300/40 uppercase tracking-wider pl-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-3.5 bg-dark-800/50 border border-gold-600/20 rounded-xl text-gold-200 focus:outline-none focus:border-gold-500/50"
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs text-gold-300/40 uppercase tracking-wider pl-1">Phone Number</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-300/30 text-sm">+91</div>
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full p-3.5 pl-12 bg-dark-800/50 border border-gold-600/20 rounded-xl text-gold-200 focus:outline-none focus:border-gold-500/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gold-300/40 uppercase tracking-wider pl-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full p-3.5 pr-12 bg-dark-800/50 border border-gold-600/20 rounded-xl text-gold-200 focus:outline-none focus:border-gold-500/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gold-300/40 hover:text-gold-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {authMode === 'login' && (
                                <div className="text-right pt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowForgotPwd(true)}
                                        className="text-xs text-gold-300/50 hover:text-gold-400 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </div>

                        {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}

                        {showForgotPwd && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-200 text-center"
                            >
                                <p className="mb-2">To reset your password, please message us on WhatsApp with your registered phone number.</p>
                                <a 
                                    href={`https://wa.me/919363164680?text=${encodeURIComponent("Hi, I forgot my OG Biryani password for my phone number. Please help me reset it.")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 bg-amber-500 text-dark-900 px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-amber-400 transition-colors"
                                >
                                    <MessageCircle size={14} /> Contact Support
                                </a>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl btn-shimmer glow-gold-strong hover:from-gold-500 hover:to-gold-400 transition-all mt-4 disabled:opacity-50"
                        >
                            {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                        </button>
                    </form>

                    <div className="text-center text-sm text-gold-300/60 pt-4 border-t border-gold-600/10">
                        {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                                setAuthError('');
                            }}
                            className="text-gold-400 font-bold hover:text-gold-300 hover:underline transition-all"
                        >
                            {authMode === 'login' ? 'Create one' : 'Login here'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6"
                style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
            >
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-dark-800 rounded-full border-2 border-gold-500/30 flex items-center justify-center text-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <User size={36} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-gradient-gold">{customerData?.name}</h2>
                        <div className="flex items-center gap-2 text-gold-300/60 mt-1">
                            <Phone size={14} />
                            <span>{customerData?.phone}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </motion.div>

            {/* Order History */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h3 className="text-xl font-serif font-bold text-gold-200 mb-4 flex items-center gap-2">
                    <Package className="text-gold-500" />
                    My Orders
                </h3>
                
                {orders.length === 0 ? (
                    <div className="glass-card-light p-10 text-center">
                        <p className="text-gold-300/50 mb-4">You haven't placed any orders yet.</p>
                        <Link to="/menu" className="inline-flex px-6 py-2 bg-gold-600/20 text-gold-400 rounded-full font-medium hover:bg-gold-600/30 transition-all">
                            Browse Menu
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {orders.map(order => {
                            const items = JSON.parse(order.items);
                            return (
                                <Link 
                                    to={`/track/${order.order_token}`} 
                                    key={order.id}
                                    className="glass-card p-5 hover:border-gold-500/40 transition-all group block cursor-pointer"
                                    style={{ borderColor: 'rgba(212, 175, 55, 0.15)' }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-xs font-mono text-gold-500/70 bg-gold-500/10 px-2 py-1 rounded">#{order.order_token}</span>
                                            <p className="text-[11px] text-gold-300/40 mt-2">
                                                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-gold-300 block">₹{order.total_amount}</span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                                order.status === 'Delivered' ? 'text-green-400' :
                                                order.status === 'Cancelled' ? 'text-red-400' :
                                                'text-amber-400'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-gold-600/10 pt-3">
                                        <p className="text-sm text-gold-200/80 truncate">
                                            {items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-between items-center text-gold-400 group-hover:text-gold-300 text-xs font-medium">
                                        View Details
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
