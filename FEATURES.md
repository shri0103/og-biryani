# 🍚 OG Biriyani — Complete Feature List

> Premium Biryani ordering PWA built with React + Node.js + MySQL (Aiven)

---

## 📱 Progressive Web App (PWA)
- **Installable** — Add to Home Screen on Android/iOS, looks like a native app
- **Service Worker** — Offline caching, background sync
- **Web Push Notifications** — Real-time order status alerts (VAPID-powered)
- **Responsive Design** — Mobile-first, works on all screen sizes

---

## 🏠 Home Page
- **Hero Section** — Animated gradient headline with CTA buttons
- **Countdown Timer** — Live countdown to daily ordering cutoff (creates urgency)
- **Track Last Order** — Quick-access card showing last order token (from localStorage)
- **Repeat Last Order** — One-tap reorder from previous order items
- **Customer Reviews** — Live reviews fetched from API (4+ star ratings)
- **Location & Contact** — Map link, phone, share button
- **Order Counter** — Shows total orders placed as social proof

---

## 🍛 Menu Page
- **Dynamic Menu** — Items fetched from MySQL database in real-time
- **Category Filter** — Filter by All / Main Course / Appetizer / Combo / Drinks
- **Search Bar** — Live search by item name and description
- **Food Photos** — Image display on menu cards with admin-uploaded URLs
- **Lazy Image Loading** — Blur-to-sharp transition with `loading="lazy"` + `decoding="async"`
- **Item Tags** — Visual badges: "New", "Hot", "Special Combo"
- **Today's Special** — Highlighted daily special item set by admin
- **Star Ratings** — Average rating per item from customer reviews
- **Quantity Selector** — ± buttons to adjust quantity before adding to cart
- **Add-to-Cart Animation** — Flying item animation into cart icon
- **Combo Suggestions** — Smart popup suggesting combos when adding items
- **Smart Ordering Lock** — Disables ordering after 6 PM (configurable)
- **Day-Based Availability** — Items can be set to appear only on certain days
- **Pull-to-Refresh** — Touch gesture to refresh menu (mobile-native feel)
- **Image Optimization** — Responsive `sizes` attribute, `decoding="async"`, height clamping

---

## 🛒 Cart Page
- **Item List** — Shows all added items with quantity, price, subtotal
- **Quantity Adjust** — ± buttons to modify quantities in cart
- **Remove Items** — Swipe or click to remove individual items
- **Cart Persistence** — Cart saved in localStorage across sessions
- **Customer Details** — Name & phone input (persisted in localStorage)
- **Order Scheduling** — Pick a future date and time for delivery
- **Coupon System** — Apply discount codes (validated against backend)
- **Order Confirmation Modal** — Review order summary before placing
- **WhatsApp Confirmation** — Sends formatted bilingual order summary via WhatsApp
- **PDF Receipt** — Download professional PDF receipt after ordering (jsPDF)
- **Share Receipt** — Share order details via Web Share API
- **Floating Cart Bar** — Sticky bottom bar showing cart count + total on all pages

---

## 📦 Order Tracking Page
- **Token-Based Tracking** — Track by unique order token (no login required)
- **Status Stepper** — Visual timeline: Received → Preparing → Ready → Delivered
- **Animated Progress Bar** — Gradient progress bar filling based on current status
- **Push Notifications** — Subscribe to get browser notifications on status changes
- **Order Details** — Shows items, total, timestamps, customer info
- **Order Cancellation** — Cancel within 10 minutes if status is still "Received"
- **Auto-Refresh** — Polls for status updates periodically

---

## 📋 Order History Page
- **Phone Lookup** — View all past orders by phone number
- **Order Cards** — Each order shows items, total, status, date
- **Rating & Feedback** — Submit 1-5 star rating + text feedback per order
- **Re-order** — One-click reorder from any past order
- **Lazy Loaded** — Code-split chunk, loaded only when visited

---

## 🔐 Admin Dashboard
- **Secure Login** — JWT-based authentication with bcrypt-hashed passwords
- **Token Verification** — Auto-verify stored tokens on page load

### Menu Management
- **Add/Edit/Delete Items** — Full CRUD for menu items
- **Image URLs** — Upload food photo URLs per item
- **Tags** — Assign tags (New, Hot, Special Combo)
- **Today's Special** — Set/clear daily special item
- **Enable/Disable Items** — Toggle item visibility without deleting
- **Day Availability** — Set which days each item appears

### Order Management
- **Live Order Feed** — All orders in real-time, newest first
- **Status Updates** — Change individual order status with one click
- **Bulk Advance** — Move ALL today's orders to next status in one click
- **Order Search** — Filter orders by status, customer name, phone

### Analytics Dashboard
- **Today's Stats** — Orders count, revenue, average order value
- **All-Time Stats** — Total orders, total revenue
- **Popular Items** — Top 5 most ordered items
- **Weekly Trend Chart** — SVG line chart of orders over last 7 days
- **Status Breakdown** — CSS conic-gradient pie chart of today's order statuses
- **Peak Hours** — Hourly order distribution for today
- **Repeat Customers** — Top 10 returning customers by order count
- **Monthly Revenue** — Weekly revenue breakdown for last 30 days
- **Review Stats** — Average rating + total review count

### Coupon Management
- **Create Coupons** — Set code, discount %, max uses
- **View All Coupons** — List with usage stats
- **Delete Coupons** — Remove expired or unwanted codes

### Push Notification Management
- **VAPID Configuration** — Web Push setup for order status alerts

---

## 🌐 Multi-Language Support
- **English / Tamil Toggle** — Switch language from navbar
- **Persisted Preference** — Language choice saved in localStorage
- **Full Translation** — All customer-facing text translated to Tamil
- **Bilingual WhatsApp** — Order confirmations sent in both languages

---

## 🎨 UI / UX Features
- **Dark Theme** — Rich dark-blue base with gold accents (default)
- **Light Theme** — Warm saffron & terracotta palette (togglable)
- **Theme Persistence** — Theme choice saved in localStorage
- **Glassmorphism Cards** — Frosted glass effect with backdrop blur
- **Gold Gradient Text** — Premium gold gradient for headings
- **Framer Motion Animations** — Page transitions, hover effects, toast notifications
- **Smooth Page Transitions** — AnimatePresence with slide/fade animations
- **Scroll-to-Top Button** — Gold floating button, appears after 300px scroll
- **Custom Scrollbar** — Gold gradient scrollbar matching theme
- **Skeleton Loading** — Shimmer placeholders while content loads
- **Toast Notifications** — Animated success/info toasts
- **404 Page** — Custom "not found" page with navigation
- **Back Button** — Context-aware back navigation on sub-pages
- **Ornamental Dividers** — Gold gradient decorative line dividers

---

## 🎉 Festival-Themed UI
- **Auto-Detection** — Detects Diwali, Ramadan, Pongal, Christmas, Eid by date
- **Festival Banner** — Animated greeting banner with emoji
- **Floating Particles** — 12 themed emoji particles floating across screen
- **Theme Overrides** — Festival-specific color scheme for gradients, glows, borders
- **Body Class** — Auto-applies `theme-diwali`, `theme-ramadan`, etc.

---

## ⚡ Performance
- **Code Splitting** — Admin, OrderHistory, OrderTrack lazy-loaded via `React.lazy`
- **Suspense Fallback** — Spinner shown while lazy chunks load
- **Image Lazy Loading** — Native `loading="lazy"` + blur placeholder
- **Gzip Compression** — Server-side response compression
- **Static Asset Caching** — Vite-built assets with content hashes
- **DB Keep-Alive Ping** — `SELECT 1` every 4 hours prevents Aiven auto-pause
- **TCP Keep-Alive** — `enableKeepAlive` on MySQL pool prevents ECONNRESET

---

## 🔒 Security
- **Helmet.js** — 15+ HTTP security headers (X-Frame-Options, HSTS, etc.)
- **CORS** — Whitelist-based origin validation
- **Rate Limiting** — Global (200/15min), Login (20/15min), Orders (10/15min)
- **JWT Auth** — Token-based admin authentication with 8h expiry
- **bcrypt Passwords** — 12-round salted password hashing
- **Input Sanitization** — All user inputs trimmed, length-limited, stripped of `<>`
- **Phone Validation** — Regex-based phone number validation
- **Safe Error Responses** — Never leaks database internals to client
- **Request Size Limit** — 10KB max payload to prevent abuse
- **Crash Protection** — `unhandledRejection` + `uncaughtException` handlers
- **Graceful Shutdown** — Clean database close on SIGINT

---

## 🔍 SEO
- **Dynamic Page Titles** — `usePageTitle` hook sets `document.title` per route
- **Meta Description** — Rich description for search engines
- **Open Graph Tags** — `og:title`, `og:description`, `og:type`, `og:url`, `og:image`
- **Semantic HTML** — Proper heading hierarchy, semantic elements
- **Google Fonts** — Cormorant Garamond (serif) + Outfit (sans-serif)

---

## 🗄️ Backend & Database
- **Express.js Server** — RESTful API with organized route structure
- **MySQL (Aiven Cloud)** — Managed cloud database with SSL
- **Auto-Migration** — New columns added safely with `ALTER TABLE` + error handling
- **Seed Data** — Auto-seeds menu items, sample reviews, default coupons, admin user
- **Connection Pool** — mysql2 pool with 5 connections, 30s timeout, keep-alive

---

## 📦 Deployment
- **Render** — Server deployed on Render (auto-deploy from GitHub)
- **Vite Build** — Optimized production build with tree-shaking + code splitting
- **SPA Catch-All** — Server serves `index.html` for all non-API routes
- **Static Serving** — Express serves built frontend from `client/dist`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Framer Motion, Axios |
| Styling | Tailwind CSS v4, Custom CSS, Google Fonts |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0 (Aiven Cloud) |
| Auth | JWT, bcryptjs |
| Push | web-push (VAPID) |
| PDF | jsPDF |
| Security | Helmet, CORS, express-rate-limit |
| Deployment | Render, GitHub |
