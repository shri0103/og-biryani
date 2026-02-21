import React from 'react';
import { useTheme } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CartDrawer = ({ isOpen, onClose, cart, updateQuantity, removeFromCart }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[70] flex flex-col"
                        style={{
                            background: isDark
                                ? 'linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)'
                                : 'linear-gradient(180deg, #FFF8F0 0%, #FEF3E2 100%)',
                            borderLeft: isDark
                                ? '1px solid rgba(212, 175, 55, 0.15)'
                                : '1px solid rgba(194, 120, 45, 0.15)'
                        }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gold-600/15">
                            <div>
                                <h3 className="text-xl font-serif font-bold text-gradient-gold">Your Cart</h3>
                                <p className="text-xs text-gold-300/40 mt-1">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center border border-gold-600/20 text-gold-400 hover:text-gold-300 hover:border-gold-500/40 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                    <ShoppingBag size={40} className="text-gold-500/20" />
                                    <p className="text-gold-300/30 font-light">Cart is empty</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {cart.map(item => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20, height: 0 }}
                                            className="glass-card-light p-4 flex gap-4"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-serif font-bold text-gold-200 text-sm truncate">{item.name}</h4>
                                                <p className="text-[11px] text-gold-300/35 mt-0.5">{item.category}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    {/* Quantity */}
                                                    <div className="flex items-center gap-2 bg-dark-700/50 rounded-lg px-1.5 py-0.5">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="w-6 h-6 rounded flex items-center justify-center text-gold-400 hover:bg-gold-500/15"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="text-xs font-bold text-gold-300 w-4 text-center tabular-nums">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            disabled={item.quantity >= 20}
                                                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.quantity >= 20 ? 'text-gold-300/30 cursor-not-allowed bg-transparent' : 'text-gold-400 hover:bg-gold-500/15'}`}
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                    <span className="text-sm font-bold text-gold-400 tabular-nums">₹{item.price * item.quantity}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="self-start w-7 h-7 rounded-full flex items-center justify-center text-ember-500/40 hover:text-ember-500 hover:bg-ember-500/10 transition-all shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="p-6 border-t border-gold-600/15 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gold-300/60 font-serif">Total</span>
                                    <span className="text-2xl font-bold text-gradient-gold">₹{total}</span>
                                </div>
                                <Link
                                    to="/cart"
                                    onClick={onClose}
                                    className="w-full py-3.5 bg-gradient-to-r from-gold-600 to-gold-500 text-dark-900 font-bold rounded-xl flex justify-center items-center gap-2 btn-shimmer glow-gold-strong hover:from-gold-500 hover:to-gold-400 transition-all"
                                >
                                    Checkout
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
