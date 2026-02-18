import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

const GALLERY_ITEMS = [
    { id: 1, title: 'Chicken Biryani', desc: 'Fragrant basmati rice with tender chicken', emoji: '🍗', gradient: 'from-amber-600/40 to-orange-600/40' },
    { id: 2, title: 'Egg Biryani', desc: 'Classic biryani with perfectly boiled eggs', emoji: '🥚', gradient: 'from-yellow-600/40 to-amber-600/40' },
    { id: 3, title: 'MT Biryani', desc: 'Aromatic mutton biryani cooked on slow flame', emoji: '🍖', gradient: 'from-red-600/40 to-amber-600/40' },
    { id: 4, title: 'Chicken 65', desc: 'Spicy deep-fried chicken appetizer', emoji: '🌶️', gradient: 'from-red-600/40 to-rose-600/40' },
    { id: 5, title: 'Special Combo', desc: 'MT Biryani + Omelette + 7UP — best deal!', emoji: '🎉', gradient: 'from-gold-600/40 to-amber-600/40' },
    { id: 6, title: 'Fresh Ingredients', desc: 'Only the freshest spices and herbs used daily', emoji: '🌿', gradient: 'from-green-600/40 to-emerald-600/40' },
    { id: 7, title: 'Home Kitchen', desc: 'Prepared in our hygienic home kitchen', emoji: '🏠', gradient: 'from-blue-600/40 to-indigo-600/40' },
    { id: 8, title: 'Happy Customers', desc: 'Serving smiles every day since day one', emoji: '😊', gradient: 'from-pink-600/40 to-purple-600/40' },
];

const Gallery = () => {
    const [selectedIdx, setSelectedIdx] = useState(null);

    const goNext = () => setSelectedIdx(prev => (prev + 1) % GALLERY_ITEMS.length);
    const goPrev = () => setSelectedIdx(prev => (prev - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold">Gallery</h2>
                <div className="ornament-divider mt-3">
                    <span className="text-gold-500/40">✦</span>
                </div>
                <p className="text-gold-300/40 text-sm mt-3">A peek into our kitchen and dishes</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {GALLERY_ITEMS.map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.08 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => setSelectedIdx(idx)}
                        className="cursor-pointer group"
                    >
                        <div className={`aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-6xl md:text-7xl relative overflow-hidden border border-white/5`}>
                            <span className="relative z-10 group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-4">
                                <p className="text-white text-xs font-semibold">{item.title}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedIdx !== null && (() => {
                    const item = GALLERY_ITEMS[selectedIdx];
                    return (
                        <motion.div
                            key="lightbox"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-dark-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                            onClick={() => setSelectedIdx(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="relative max-w-md w-full"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Close */}
                                <button
                                    onClick={() => setSelectedIdx(null)}
                                    className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-dark-700 border border-gold-500/30 flex items-center justify-center text-gold-400 hover:bg-dark-600 transition-colors z-10"
                                >
                                    <X size={18} />
                                </button>

                                {/* Image */}
                                <div className={`aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-8xl md:text-9xl border border-white/5`}>
                                    <motion.span
                                        key={selectedIdx}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring' }}
                                    >
                                        {item.emoji}
                                    </motion.span>
                                </div>

                                {/* Info */}
                                <div className="mt-4 text-center">
                                    <h3 className="text-xl font-serif font-bold text-gradient-gold">{item.title}</h3>
                                    <p className="text-sm text-gold-300/50 mt-1">{item.desc}</p>
                                    <p className="text-[10px] text-gold-300/20 mt-2">{selectedIdx + 1} / {GALLERY_ITEMS.length}</p>
                                </div>

                                {/* Nav */}
                                <div className="flex justify-between mt-4">
                                    <button
                                        onClick={goPrev}
                                        className="px-4 py-2 glass-card-light text-gold-400 text-sm flex items-center gap-2 hover:text-gold-300 transition-colors rounded-xl"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className="px-4 py-2 glass-card-light text-gold-400 text-sm flex items-center gap-2 hover:text-gold-300 transition-colors rounded-xl"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default Gallery;
