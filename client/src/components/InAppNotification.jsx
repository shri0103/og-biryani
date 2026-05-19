import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChefHat, CheckCircle, Truck, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ICONS = {
    Preparing: ChefHat,
    Ready: CheckCircle,
    Delivered: Truck
};

const MESSAGES = {
    Preparing: 'Your order is now being prepared!',
    Ready: 'Your order is ready for pickup!',
    Delivered: 'Your order has been delivered!'
};

export default function InAppNotification() {
    const [notifications, setNotifications] = useState([]);
    const prevOrdersRef = useRef({});
    const navigate = useNavigate();

    useEffect(() => {
        const checkOrderUpdates = async () => {
            const token = localStorage.getItem('customerToken');
            if (!token) return;

            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/customer/orders`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const currentOrders = res.data.data;
                const newOrdersMap = {};

                currentOrders.forEach(order => {
                    newOrdersMap[order.order_token] = order.status;
                    
                    // If we have previous state for this order and status changed
                    const prevStatus = prevOrdersRef.current[order.order_token];
                    if (prevStatus && prevStatus !== order.status) {
                        // Skip if changed back to Received or Cancelled
                        if (['Preparing', 'Ready', 'Delivered'].includes(order.status)) {
                            addNotification({
                                id: Date.now() + Math.random(),
                                orderToken: order.order_token,
                                status: order.status
                            });
                        }
                    }
                });

                prevOrdersRef.current = newOrdersMap;
            } catch (err) {
                // Silently ignore auth/network errors in background poll
            }
        };

        // Check initially after a delay
        setTimeout(checkOrderUpdates, 2000);
        
        // Poll every 10 seconds
        const interval = setInterval(checkOrderUpdates, 10000);
        return () => clearInterval(interval);
    }, []);

    const addNotification = (notif) => {
        setNotifications(prev => [...prev, notif]);
        
        // Auto remove after 6 seconds
        setTimeout(() => {
            removeNotification(notif.id);
        }, 6000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = (orderToken, id) => {
        removeNotification(id);
        navigate(`/track/${orderToken}`);
    };

    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {notifications.map(notif => {
                    const Icon = ICONS[notif.status] || Bell;
                    return (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className="bg-dark-800/95 backdrop-blur-md border border-gold-500/30 p-4 rounded-2xl shadow-2xl pointer-events-auto cursor-pointer max-w-sm w-72 flex items-start gap-3"
                            onClick={() => handleNotificationClick(notif.orderToken, notif.id)}
                            style={{
                                boxShadow: '0 10px 25px -5px rgba(212, 175, 55, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0">
                                <Icon size={20} className="text-gold-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-gold-200 font-bold text-sm">Order Update</h4>
                                <p className="text-gold-300/60 text-xs mt-0.5 leading-tight">
                                    {MESSAGES[notif.status] || `Status updated to ${notif.status}`}
                                </p>
                                <p className="text-[9px] text-gold-500/40 mt-1 font-mono uppercase">#{notif.orderToken}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                className="text-gold-300/30 hover:text-gold-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
