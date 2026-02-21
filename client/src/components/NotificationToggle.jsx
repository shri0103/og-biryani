import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationToggle() {
    const [permission, setPermission] = useState('default'); // 'default', 'granted', 'denied'
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setPermission(Notification.permission);

            // Check if already subscribed
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) setSubscription(sub);
                });
            });
        }
    }, []);

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        setIsSubscribing(true);

        try {
            // 1. Request Permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // 2. Get VAPID Key
            /* 
             * Note: Ensure your server has VAPID_PUBLIC_KEY set in .env 
             * and the endpoint /api/push/vapid-key returns { publicKey: '...' }
             */
            console.log('Fetching VAPID key...');
            const keyRes = await fetch('/api/push/vapid-key');
            const { publicKey } = await keyRes.json();

            console.log('VAPID Key from server:', publicKey);

            if (!publicKey) throw new Error('No VAPID public key returned from server');

            // 3. Check and Unsubscribe Existing Subscription
            const registration = await navigator.serviceWorker.ready;
            const existingSub = await registration.pushManager.getSubscription();

            if (existingSub) {
                console.log('Unsubscribing existing subscription...');
                await existingSub.unsubscribe();
            }

            const convertedKey = urlBase64ToUint8Array(publicKey);
            console.log('Converted applicationServerKey:', convertedKey);

            // 4. Subscribe via Service Worker
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });

            setSubscription(sub);

            // 5. Send Subscription to Server
            // We pass orderToken: null for now as this is a generic subscription button
            // You might want to pass a specific token if available in context
            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify({ subscription: sub, orderToken: null }),
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('User subscribed to push notifications');
        } catch (err) {
            console.error('Failed to subscribe:', err);
            // Optional: Show a toast or error state
        } finally {
            setIsSubscribing(false);
        }
    };

    const unsubscribeUser = async () => {
        setIsSubscribing(true);
        try {
            if (subscription) {
                await subscription.unsubscribe();
                setSubscription(null);
                // Verify permission state (it remains granted usually, but subscription is gone)
                console.log('User unsubscribed');
            }
        } catch (err) {
            console.error('Failed to unsubscribe', err);
        } finally {
            setIsSubscribing(false);
        }
    };


    const handleClick = () => {
        if (permission === 'denied') {
            alert('Notifications are blocked. Please enable them in your browser settings (click the lock/tune icon in the address bar).');
            return;
        }

        if (permission === 'granted' && subscription) {
            unsubscribeUser();
        } else {
            subscribeUser();
        }
    };

    if (!('Notification' in window)) return null;

    return (
        <div className="relative flex items-center justify-center">
            <button
                onClick={handleClick}
                disabled={isSubscribing}
                title={permission === 'granted' ? 'Notifications Active' : 'Enable Notifications'}
                className={`
        relative p-2 rounded-full border transition-all
        ${permission === 'granted'
                        ? 'border-gold-500/50 text-gold-400 bg-gold-500/10'
                        : 'border-gold-600/30 text-gold-400/70 hover:text-gold-300 hover:border-gold-500/50'}
      `}
            >
                <AnimatePresence mode="wait">
                    {permission === 'granted' ? (
                        <motion.div
                            key="active"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <BellRing size={18} className="sm:w-5 sm:h-5" />
                        </motion.div>
                    ) : permission === 'denied' ? (
                        <motion.div
                            key="denied"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <BellOff size={18} className="sm:w-5 sm:h-5" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="default"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <Bell size={18} className="sm:w-5 sm:h-5" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pulse effect if not yet granted to encourage clicking */}
                {permission === 'default' && (
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
                    </span>
                )}
            </button>
        </div>
    );
}
