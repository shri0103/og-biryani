import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, RefreshCw, Package, UtensilsCrossed, Plus, Save, Trash2, Edit3, X, ChevronRight, Lock, User, BarChart3, Star, Calendar, TrendingUp, DollarSign, ShoppingBag, Bell, Search, Filter, Volume2, Tag } from 'lucide-react';

// ─── Notification Sound (Web Audio API — pleasant loud chime) ────
const playNotificationSound = async () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();

        // Pleasant ascending arpeggio: C5 → E5 → G5 → C6 (like a doorbell)
        const playChime = (startTime) => {
            const freqs = [523, 659, 784, 1047]; // C5, E5, G5, C6
            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'triangle'; // Warm & smooth, not harsh
                const t = startTime + i * 0.12;
                gain.gain.setValueAtTime(0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
                osc.start(t);
                osc.stop(t + 0.35);
            });
        };

        // Play twice with a pause — ding-ding!
        playChime(ctx.currentTime);
        playChime(ctx.currentTime + 0.7);
    } catch (e) { console.warn('Sound failed:', e); }
};

const API = 'http://localhost:5000/api';
const STATUS_FLOW = ['Received', 'Preparing', 'Ready', 'Delivered'];
const STATUS_COLORS = {
    Received: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
    Preparing: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
    Ready: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-400' },
    Delivered: { bg: 'bg-gold-500/15', text: 'text-gold-400', border: 'border-gold-500/30', dot: 'bg-gold-500' },
};
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Admin = () => {
    const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // Notification state
    // Use a ref so fetchOrders always reads the latest value (avoids stale closure)
    const lastSeenMaxIdRef = useRef(parseInt(localStorage.getItem('adminLastSeenOrderId') || '0', 10));
    const [newOrderIds, setNewOrderIds] = useState(new Set());
    const [newOrderToast, setNewOrderToast] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const soundEnabledRef = useRef(true);
    const isFirstFetch = useRef(true);
    const fetchOrdersRef = useRef(null);

    // Order filter state
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState('today');
    const [searchQuery, setSearchQuery] = useState('');

    // Coupons state
    const [coupons, setCoupons] = useState([]);
    const [couponForm, setCouponForm] = useState({ code: '', discount_percent: '', max_uses: '100' });

    // Menu form state
    const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category: 'Main Course', tag: '', available_days: '' });
    const [editId, setEditId] = useState(null);
    const [showMenuForm, setShowMenuForm] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    // Verify token on mount
    useEffect(() => {
        if (token) {
            axios.get(`${API}/admin/verify`, { headers: { Authorization: `Bearer ${token}` } })
                .then(() => {
                    setIsAuthenticated(true);
                    fetchOrders();
                    fetchMenu();
                    fetchStats();
                })
                .catch(() => {
                    setToken('');
                    localStorage.removeItem('adminToken');
                });
        }
    }, []);

    // Auto-refresh orders — use ref to always call latest fetchOrders
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            if (fetchOrdersRef.current) fetchOrdersRef.current();
            fetchStats();
        }, 15000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const res = await axios.post(`${API}/admin/login`, loginForm);
            const { token: newToken } = res.data;
            setToken(newToken);
            localStorage.setItem('adminToken', newToken);
            setIsAuthenticated(true);
            fetchOrders();
            fetchMenu();
            fetchStats();
        } catch (err) {
            setLoginError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        setToken('');
        setIsAuthenticated(false);
        localStorage.removeItem('adminToken');
    };

    const fetchOrders = async () => {
        try {
            const tkn = localStorage.getItem('adminToken');
            const res = await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${tkn}` } });
            const fetched = res.data.data || [];

            // Detect new orders using ref (always current value)
            if (fetched.length > 0) {
                const maxId = Math.max(...fetched.map(o => o.id));
                const seenId = lastSeenMaxIdRef.current;

                if (isFirstFetch.current) {
                    // First load — mark all existing orders as seen if never visited
                    if (seenId === 0) {
                        lastSeenMaxIdRef.current = maxId;
                        localStorage.setItem('adminLastSeenOrderId', String(maxId));
                    } else if (maxId > seenId) {
                        // Show orders that arrived since last visit
                        const newIds = fetched.filter(o => o.id > seenId).map(o => o.id);
                        setNewOrderIds(new Set(newIds));
                    }
                    isFirstFetch.current = false;
                } else if (maxId > seenId) {
                    // Subsequent poll — new orders arrived
                    const newIds = fetched.filter(o => o.id > seenId).map(o => o.id);
                    setNewOrderIds(prev => new Set([...prev, ...newIds]));
                    // Play notification sound (use ref for latest value)
                    if (soundEnabledRef.current) playNotificationSound();
                    // Show toast
                    setNewOrderToast(`🔔 ${newIds.length} new order${newIds.length > 1 ? 's' : ''} received!`);
                    setTimeout(() => setNewOrderToast(null), 5000);
                    // Update ref so we don't re-trigger on next poll
                    lastSeenMaxIdRef.current = maxId;
                    localStorage.setItem('adminLastSeenOrderId', String(maxId));
                }
            }

            setOrders(fetched);
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    // Keep ref in sync so interval always calls the latest version
    fetchOrdersRef.current = fetchOrders;

    // Mark orders as seen when viewing Orders tab
    const markOrdersSeen = useCallback(() => {
        if (orders.length > 0) {
            const maxId = Math.max(...orders.map(o => o.id));
            lastSeenMaxIdRef.current = maxId;
            localStorage.setItem('adminLastSeenOrderId', String(maxId));
            setNewOrderIds(new Set());
        }
    }, [orders]);

    const fetchMenu = async () => {
        try {
            const res = await axios.get(`${API}/menu`);
            setMenuItems(res.data.data || []);
        } catch (err) {
            console.error('Error fetching menu:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const tkn = localStorage.getItem('adminToken');
            const res = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${tkn}` } });
            setStats(res.data.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const advanceStatus = async (orderId, currentStatus) => {
        const currentIdx = STATUS_FLOW.indexOf(currentStatus);
        if (currentIdx >= STATUS_FLOW.length - 1) return;
        const newStatus = STATUS_FLOW[currentIdx + 1];
        try {
            await axios.patch(`${API}/orders/${orderId}/status`, { status: newStatus }, { headers });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    // Bulk advance all today's orders from one status to next
    const bulkAdvance = async (fromStatus, toStatus) => {
        try {
            const res = await axios.patch(`${API}/orders/bulk-advance`, { fromStatus, toStatus }, { headers });
            if (res.data.data.updated > 0) {
                fetchOrders();
                fetchStats();
            }
        } catch (err) {
            console.error('Bulk advance error:', err);
        }
    };

    // Today's Special toggle
    const toggleSpecial = async (itemId) => {
        try {
            await axios.patch(`${API}/menu/${itemId}/special`, {}, { headers });
            fetchMenu();
        } catch (err) {
            console.error('Error toggling special:', err);
        }
    };

    // Menu CRUD
    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        const data = { ...menuForm, price: parseInt(menuForm.price) };
        try {
            if (editId) {
                await axios.put(`${API}/menu/${editId}`, data, { headers });
            } else {
                await axios.post(`${API}/menu`, data, { headers });
            }
            fetchMenu();
            resetMenuForm();
        } catch (err) {
            console.error('Error saving menu item:', err);
        }
    };

    const editMenuItem = (item) => {
        setMenuForm({
            name: item.name,
            description: item.description || '',
            price: String(item.price),
            category: item.category,
            tag: item.tag || '',
            available_days: item.available_days || '',
        });
        setEditId(item.id);
        setShowMenuForm(true);
    };

    const deleteMenuItem = async (id) => {
        if (!confirm('Delete this item?')) return;
        try {
            await axios.delete(`${API}/menu/${id}`, { headers });
            fetchMenu();
        } catch (err) {
            console.error('Error deleting menu item:', err);
        }
    };

    const resetMenuForm = () => {
        setMenuForm({ name: '', description: '', price: '', category: 'Main Course', tag: '', available_days: '' });
        setEditId(null);
        setShowMenuForm(false);
    };

    const toggleDay = (day) => {
        const days = menuForm.available_days ? menuForm.available_days.split(',').map(d => d.trim()).filter(Boolean) : [];
        const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
        setMenuForm(p => ({ ...p, available_days: updated.join(',') }));
    };

    // ─── Login Screen ───────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 w-full max-w-sm"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4 border border-gold-500/20">
                            <Lock size={28} className="text-gold-400" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-gradient-gold">Admin Login</h2>
                        <p className="text-gold-300/40 text-sm mt-1">Server-authenticated access</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1.5">Username</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500/40" />
                                <input
                                    type="text"
                                    value={loginForm.username}
                                    onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))}
                                    className="w-full px-4 pl-10 py-3 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 transition-colors"
                                    placeholder="admin"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1.5">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500/40" />
                                <input
                                    type="password"
                                    value={loginForm.password}
                                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                                    className="w-full px-4 pl-10 py-3 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {loginError && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-red-400 text-sm text-center bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                            >
                                {loginError}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl flex justify-center items-center gap-2 btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all disabled:opacity-50"
                        >
                            {loginLoading ? (
                                <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // ─── Admin Dashboard ─────────────────────────────────
    return (
        <div className="container mx-auto px-2 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">Admin Dashboard</h2>
                    <p className="text-gold-300/40 text-sm mt-1">Manage orders, menu & analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { const next = !soundEnabled; setSoundEnabled(next); soundEnabledRef.current = next; }}
                        title={soundEnabled ? 'Mute notifications' : 'Enable notification sound'}
                        className={`p-2 rounded-xl transition-all ${soundEnabled ? 'text-gold-400 glass-card-light' : 'text-gold-300/30 border border-transparent hover:border-gold-600/20'}`}
                    >
                        <Volume2 size={16} />
                    </button>
                    <button
                        onClick={() => playNotificationSound()}
                        title="Test notification sound"
                        className="px-3 py-2 rounded-xl text-xs font-medium text-gold-400 glass-card-light hover:text-gold-300 transition-all"
                    >
                        Test 🔔
                    </button>
                    <button
                        onClick={() => { fetchOrders(); fetchMenu(); fetchStats(); }}
                        className="px-4 py-2 glass-card-light text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center gap-2 rounded-xl"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-xl transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* New Order Toast */}
            <AnimatePresence>
                {newOrderToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="mb-4 p-4 rounded-xl bg-green-accent/10 border border-green-accent/30 flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-accent/20 flex items-center justify-center shrink-0 animate-pulse">
                            <Bell size={18} className="text-green-accent" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-green-accent">{newOrderToast}</p>
                            <p className="text-[10px] text-gold-300/40">Click the Orders tab to view</p>
                        </div>
                        <button onClick={() => { setActiveTab('orders'); markOrdersSeen(); setNewOrderToast(null); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-accent/20 text-green-accent border border-green-accent/30 hover:bg-green-accent/30 transition-all">
                            View
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'orders', label: 'Orders', icon: Package },
                    { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
                    { id: 'coupons', label: 'Coupons', icon: Tag },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id === 'orders') markOrdersSeen();
                        }}
                        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-gold-500/15 text-gold-400 border border-gold-500/40 glow-gold'
                            : 'text-gold-300/50 border border-transparent hover:text-gold-300/80 hover:border-gold-600/20'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {/* Notification badge on Orders tab */}
                        {tab.id === 'orders' && newOrderIds.size > 0 && activeTab !== 'orders' && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-green-accent text-dark-900 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-green-accent/30">
                                {newOrderIds.size}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ Dashboard Tab ═══ */}
            {activeTab === 'dashboard' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {stats ? (
                        <>
                            {/* Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass-card p-5 text-center">
                                    <ShoppingBag size={24} className="text-blue-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gold-200">{stats.today?.total_orders || 0}</p>
                                    <p className="text-xs text-gold-300/40 mt-1">Today's Orders</p>
                                </div>
                                <div className="glass-card p-5 text-center">
                                    <DollarSign size={24} className="text-green-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gradient-gold">₹{stats.today?.total_revenue || 0}</p>
                                    <p className="text-xs text-gold-300/40 mt-1">Today's Revenue</p>
                                </div>
                                <div className="glass-card p-5 text-center">
                                    <TrendingUp size={24} className="text-amber-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gold-200">{stats.allTime?.total_orders || 0}</p>
                                    <p className="text-xs text-gold-300/40 mt-1">All-Time Orders</p>
                                </div>
                                <div className="glass-card p-5 text-center">
                                    <DollarSign size={24} className="text-gold-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gradient-gold">₹{stats.allTime?.total_revenue || 0}</p>
                                    <p className="text-xs text-gold-300/40 mt-1">All-Time Revenue</p>
                                </div>
                            </div>

                            {/* Popular Items + Status Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Popular Items */}
                                <div className="glass-card p-5">
                                    <h4 className="font-serif font-bold text-gold-300 mb-4 flex items-center gap-2">
                                        <Star size={16} className="text-gold-500" /> Popular Items
                                    </h4>
                                    {stats.popularItems?.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.popularItems.map((item, i) => {
                                                const maxCount = stats.popularItems[0].count;
                                                return (
                                                    <div key={item.name} className="flex items-center gap-3">
                                                        <span className="text-xs text-gold-300/40 w-4 font-mono">#{i + 1}</span>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="text-gold-200">{item.name}</span>
                                                                <span className="text-gold-400 font-semibold">{item.count}×</span>
                                                            </div>
                                                            <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                                                    className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gold-300/30 text-sm">No data yet</p>
                                    )}
                                </div>

                                {/* Status Breakdown */}
                                <div className="glass-card p-5">
                                    <h4 className="font-serif font-bold text-gold-300 mb-4 flex items-center gap-2">
                                        <Package size={16} className="text-gold-500" /> Today's Status
                                    </h4>
                                    {stats.statusBreakdown?.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.statusBreakdown.map(s => {
                                                const style = STATUS_COLORS[s.status] || STATUS_COLORS.Received;
                                                return (
                                                    <div key={s.status} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                                            <span className={`text-sm ${style.text}`}>{s.status}</span>
                                                        </div>
                                                        <span className="text-gold-200 font-bold">{s.count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gold-300/30 text-sm">No orders today</p>
                                    )}
                                </div>
                            </div>

                            {/* Weekly Trend */}
                            {stats.weekly?.length > 0 && (
                                <div className="glass-card p-5">
                                    <h4 className="font-serif font-bold text-gold-300 mb-4 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-gold-500" /> Last 7 Days
                                    </h4>
                                    <div className="flex items-end gap-2 h-32">
                                        {stats.weekly.map(day => {
                                            const maxRev = Math.max(...stats.weekly.map(d => d.revenue));
                                            const height = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                                            return (
                                                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-[10px] text-gold-400 font-mono">₹{day.revenue}</span>
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${Math.max(height, 4)}%` }}
                                                        className="w-full bg-gradient-to-t from-gold-600 to-gold-400 rounded-t-md"
                                                        style={{ minHeight: '4px' }}
                                                    />
                                                    <span className="text-[9px] text-gold-300/40">
                                                        {new Date(day.day).toLocaleDateString('en-IN', { weekday: 'short' })}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="glass-card p-12 text-center">
                            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gold-300/40">Loading stats...</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ Orders Tab ═══ */}
            {activeTab === 'orders' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {/* Bulk Action Buttons */}
                    {orders.length > 0 && (() => {
                        const todayOrders = orders.filter(o => {
                            const d = new Date(o.created_at);
                            const today = new Date();
                            return d.toDateString() === today.toDateString();
                        });
                        const receivedCount = todayOrders.filter(o => o.status === 'Received').length;
                        const preparingCount = todayOrders.filter(o => o.status === 'Preparing').length;
                        const readyCount = todayOrders.filter(o => o.status === 'Ready').length;

                        return (receivedCount > 0 || preparingCount > 0 || readyCount > 0) ? (
                            <div className="glass-card p-4">
                                <p className="text-xs text-gold-300/40 uppercase tracking-wider mb-3 font-medium">⚡ Bulk Actions — Update All Today's Orders</p>
                                <div className="flex flex-wrap gap-2">
                                    {receivedCount > 0 && (
                                        <button
                                            onClick={() => bulkAdvance('Received', 'Preparing')}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all flex items-center gap-2"
                                        >
                                            Mark All Preparing
                                            <span className="bg-blue-500/20 px-2 py-0.5 rounded-full text-xs">{receivedCount}</span>
                                        </button>
                                    )}
                                    {preparingCount > 0 && (
                                        <button
                                            onClick={() => bulkAdvance('Preparing', 'Ready')}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-2"
                                        >
                                            Mark All Ready
                                            <span className="bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">{preparingCount}</span>
                                        </button>
                                    )}
                                    {readyCount > 0 && (
                                        <button
                                            onClick={() => bulkAdvance('Ready', 'Delivered')}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gold-500/15 text-gold-400 border border-gold-500/30 hover:bg-gold-500/25 transition-all flex items-center gap-2"
                                        >
                                            Mark All Delivered
                                            <span className="bg-gold-500/20 px-2 py-0.5 rounded-full text-xs">{readyCount}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null;
                    })()}

                    {/* Filter Controls */}
                    <div className="glass-card-light p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-gold-300/40 shrink-0" />
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-dark-700/60 border border-gold-600/20 text-gold-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-gold-500/40"
                            >
                                <option value="all">All Status</option>
                                {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Date Filter */}
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gold-300/40 shrink-0" />
                            <select
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="bg-dark-700/60 border border-gold-600/20 text-gold-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-gold-500/40"
                            >
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-300/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name or phone..."
                                className="w-full bg-dark-700/60 border border-gold-600/20 text-gold-300 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-gold-500/40 placeholder:text-gold-300/20"
                            />
                        </div>
                        {/* Results count */}
                        <span className="text-[10px] text-gold-300/30 shrink-0 self-center">
                            {(() => {
                                let filtered = orders;
                                if (filterStatus !== 'all') filtered = filtered.filter(o => o.status === filterStatus);
                                if (filterDate === 'today') filtered = filtered.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
                                else if (filterDate === 'week') { const w = Date.now() - 7 * 24 * 60 * 60 * 1000; filtered = filtered.filter(o => new Date(o.created_at).getTime() > w); }
                                if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); filtered = filtered.filter(o => (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').includes(q)); }
                                return `${filtered.length} orders`;
                            })()}
                        </span>
                    </div>

                    {orders.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <Package size={40} className="text-gold-500/20 mx-auto mb-3" />
                            <p className="text-gold-300/40 font-light">No orders yet</p>
                        </div>
                    ) : (() => {
                        // Apply filters
                        let filtered = orders;
                        if (filterStatus !== 'all') filtered = filtered.filter(o => o.status === filterStatus);
                        if (filterDate === 'today') filtered = filtered.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
                        else if (filterDate === 'week') { const w = Date.now() - 7 * 24 * 60 * 60 * 1000; filtered = filtered.filter(o => new Date(o.created_at).getTime() > w); }
                        if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); filtered = filtered.filter(o => (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').includes(q)); }

                        if (filtered.length === 0) return (
                            <div className="glass-card p-8 text-center">
                                <Search size={32} className="text-gold-500/20 mx-auto mb-3" />
                                <p className="text-gold-300/40 font-light">No orders match your filters</p>
                            </div>
                        );

                        return filtered.map(order => {
                            const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.Received;
                            const currentIdx = STATUS_FLOW.indexOf(order.status || 'Received');
                            const canAdvance = currentIdx < STATUS_FLOW.length - 1;
                            let parsedItems = [];
                            try { parsedItems = JSON.parse(order.items); } catch { }

                            const isNew = newOrderIds.has(order.id);

                            return (
                                <motion.div
                                    key={order.id}
                                    layout
                                    className={`glass-card p-5 space-y-3 relative ${isNew ? 'ring-1 ring-green-accent/40 shadow-lg shadow-green-accent/10' : ''}`}
                                >
                                    {/* Top Row */}
                                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs bg-gold-500/10 text-gold-400 px-2.5 py-1 rounded-lg font-bold">
                                                #{order.id}
                                            </span>
                                            {isNew && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-accent/20 text-green-accent border border-green-accent/30 uppercase tracking-wider animate-pulse">
                                                    ✦ New
                                                </span>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gold-200 text-sm">{order.customer_name || 'Guest'}</p>
                                                <p className="text-xs text-gold-300/40">{order.customer_phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gold-400 font-bold">₹{order.total_amount || order.total}</span>
                                            {order.order_token && (
                                                <span className="text-[10px] text-gold-300/30 font-mono bg-dark-600/50 px-2 py-0.5 rounded">{order.order_token}</span>
                                            )}
                                            <span className="text-xs text-gold-300/30">
                                                {order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="text-xs text-gold-300/50 bg-dark-700/30 p-3 rounded-lg">
                                        {parsedItems.length > 0 ? parsedItems.map((item, i) => (
                                            <span key={i}>
                                                {item.quantity || 1}× {item.name}
                                                {i < parsedItems.length - 1 ? ' • ' : ''}
                                            </span>
                                        )) : order.items}
                                    </div>

                                    {/* Status Pipeline */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {STATUS_FLOW.map((status, idx) => {
                                            const isActive = idx <= currentIdx;
                                            const isCurrent = status === (order.status || 'Received');
                                            const style = STATUS_COLORS[status];
                                            return (
                                                <React.Fragment key={status}>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive
                                                        ? `${style.bg} ${style.text} border ${style.border}`
                                                        : 'bg-dark-700/30 text-gold-300/25 border border-transparent'
                                                        } ${isCurrent ? 'ring-1 ring-offset-1 ring-offset-dark-800 ring-current' : ''}`}>
                                                        {isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />}
                                                        {status}
                                                    </div>
                                                    {idx < STATUS_FLOW.length - 1 && (
                                                        <ChevronRight size={12} className={isActive ? 'text-gold-300/40' : 'text-gold-300/15'} />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}

                                        {canAdvance && (
                                            <button
                                                onClick={() => advanceStatus(order.id, order.status || 'Received')}
                                                className="ml-auto px-4 py-1.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 text-xs font-bold rounded-full btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all"
                                            >
                                                → {STATUS_FLOW[currentIdx + 1]}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        });
                    })()}
                </motion.div>
            )}

            {/* ═══ Menu Tab ═══ */}
            {activeTab === 'menu' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {/* Add Button */}
                    <button
                        onClick={() => { resetMenuForm(); setShowMenuForm(true); }}
                        className="w-full py-3 border-2 border-dashed border-gold-600/30 rounded-xl text-gold-400 hover:text-gold-300 hover:border-gold-500/40 font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={16} />
                        Add New Menu Item
                    </button>

                    {/* Add/Edit Form */}
                    <AnimatePresence>
                        {showMenuForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <form onSubmit={handleMenuSubmit} className="glass-card p-5 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-serif font-bold text-gold-300">
                                            {editId ? 'Edit Item' : 'New Item'}
                                        </h4>
                                        <button type="button" onClick={resetMenuForm} className="text-gold-300/40 hover:text-gold-300">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={menuForm.name}
                                                onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 text-sm"
                                                placeholder="Item name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1">Price (₹)</label>
                                            <input
                                                type="number"
                                                value={menuForm.price}
                                                onChange={e => setMenuForm(p => ({ ...p, price: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 text-sm"
                                                placeholder="250"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1">Description</label>
                                        <textarea
                                            value={menuForm.description}
                                            onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 text-sm resize-none"
                                            rows="2"
                                            placeholder="Delicious item..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1">Category</label>
                                            <select
                                                value={menuForm.category}
                                                onChange={e => setMenuForm(p => ({ ...p, category: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 focus:outline-none focus:border-gold-500/50 text-sm"
                                            >
                                                <option value="Main Course">Main Course</option>
                                                <option value="Appetizer">Appetizer</option>
                                                <option value="Dessert">Dessert</option>
                                                <option value="Combo">Combo</option>
                                                <option value="Beverage">Beverage</option>
                                                <option value="Side">Side</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-1">Tag (optional)</label>
                                            <select
                                                value={menuForm.tag}
                                                onChange={e => setMenuForm(p => ({ ...p, tag: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-lg text-gold-200 focus:outline-none focus:border-gold-500/50 text-sm"
                                            >
                                                <option value="">None</option>
                                                <option value="New">🆕 New</option>
                                                <option value="Hot">🔥 Hot</option>
                                                <option value="Bestseller">⭐ Bestseller</option>
                                                <option value="Special">✨ Special</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Available Days */}
                                    <div>
                                        <label className="text-xs text-gold-300/50 uppercase tracking-wider block mb-2">Available Days (empty = every day)</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {ALL_DAYS.map(day => {
                                                const selected = menuForm.available_days?.split(',').map(d => d.trim()).includes(day);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={day}
                                                        onClick={() => toggleDay(day)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selected
                                                            ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                                                            : 'bg-dark-700/30 text-gold-300/30 border border-transparent hover:border-gold-600/20'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl flex justify-center items-center gap-2 btn-shimmer hover:from-gold-500 hover:to-gold-400 transition-all text-sm"
                                    >
                                        <Save size={16} />
                                        {editId ? 'Update Item' : 'Add Item'}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Menu Items List */}
                    {menuItems.map(item => (
                        <motion.div
                            key={item.id}
                            layout
                            className="glass-card p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <h4 className="font-serif font-bold text-gold-200 text-sm truncate">{item.name}</h4>
                                    <span className="text-[10px] text-gold-300/40 bg-gold-500/10 px-2 py-0.5 rounded-full shrink-0">{item.category}</span>
                                    {item.tag && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.tag === 'Hot' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                            item.tag === 'New' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                                                item.tag === 'Bestseller' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                                    item.tag === 'Special' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                                                        'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                                            }`}>
                                            {item.tag === 'Hot' ? '🔥' : item.tag === 'New' ? '🆕' : item.tag === 'Bestseller' ? '⭐' : item.tag === 'Special' ? '✨' : ''} {item.tag}
                                        </span>
                                    )}
                                    {item.is_today_special === 1 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30">⭐ Today's Special</span>
                                    )}
                                    {item.available_days && (
                                        <span className="text-[10px] text-gold-300/30 flex items-center gap-1">
                                            <Calendar size={10} /> {item.available_days}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gold-300/40 truncate">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-gold-400 font-bold text-sm mr-1">₹{item.price}</span>
                                <button
                                    onClick={() => toggleSpecial(item.id)}
                                    title="Set as Today's Special"
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${item.is_today_special ? 'text-gold-400 bg-gold-500/15' : 'text-gold-400/30 hover:text-gold-400 hover:bg-gold-500/10'}`}
                                >
                                    <Star size={14} fill={item.is_today_special ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                    onClick={() => editMenuItem(item)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gold-400/60 hover:text-gold-300 hover:bg-gold-500/10 transition-all"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => deleteMenuItem(item.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* ═══ Coupons Tab ═══ */}
            {activeTab === 'coupons' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Create Coupon Form */}
                    <div className="glass-card p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider">Create Coupon</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Code (e.g. SAVE15)"
                                value={couponForm.code}
                                onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                className="px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50 font-mono uppercase"
                            />
                            <input
                                type="number"
                                placeholder="Discount %"
                                value={couponForm.discount_percent}
                                onChange={e => setCouponForm(p => ({ ...p, discount_percent: e.target.value }))}
                                className="px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50"
                            />
                            <input
                                type="number"
                                placeholder="Max Uses"
                                value={couponForm.max_uses}
                                onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))}
                                className="px-4 py-2.5 bg-dark-700/50 border border-gold-600/20 rounded-xl text-gold-200 text-sm placeholder:text-gold-300/25 focus:outline-none focus:border-gold-500/50"
                            />
                        </div>
                        <button
                            onClick={async () => {
                                if (!couponForm.code || !couponForm.discount_percent) return;
                                try {
                                    await axios.post('http://localhost:5000/api/coupons', couponForm, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setCouponForm({ code: '', discount_percent: '', max_uses: '100' });
                                    // Refresh coupons
                                    const res = await axios.get('http://localhost:5000/api/coupons', {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    setCoupons(res.data.data || []);
                                } catch (err) {
                                    alert(err.response?.data?.error || 'Failed to create coupon');
                                }
                            }}
                            className="px-6 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl btn-shimmer text-sm flex items-center gap-2"
                        >
                            <Plus size={16} /> Create Coupon
                        </button>
                    </div>

                    {/* Coupon List */}
                    <div className="space-y-3">
                        {coupons.length === 0 ? (
                            <div className="glass-card p-8 text-center">
                                <Tag size={32} className="text-gold-500/20 mx-auto mb-3" />
                                <p className="text-gold-300/40 font-light">No coupons yet</p>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await axios.get('http://localhost:5000/api/coupons', {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            setCoupons(res.data.data || []);
                                        } catch { }
                                    }}
                                    className="mt-3 text-xs text-gold-400 underline underline-offset-4"
                                >
                                    Refresh
                                </button>
                            </div>
                        ) : (
                            coupons.map(coupon => (
                                <div key={coupon.id} className="glass-card p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-gold-400 text-sm bg-gold-500/10 px-3 py-1 rounded-lg">
                                            {coupon.code}
                                        </span>
                                        <div>
                                            <p className="text-sm text-gold-200 font-semibold">{coupon.discount_percent}% off</p>
                                            <p className="text-[10px] text-gold-300/30">
                                                {coupon.used_count}/{coupon.max_uses} uses • {coupon.is_active ? '✓ Active' : '✗ Inactive'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await axios.delete(`http://localhost:5000/api/coupons/${coupon.id}`, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                setCoupons(prev => prev.filter(c => c.id !== coupon.id));
                                            } catch { }
                                        }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Admin;
