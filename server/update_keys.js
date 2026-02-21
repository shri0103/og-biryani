const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const keys = webpush.generateVAPIDKeys();
const envPath = path.join(__dirname, '.env');

let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

// Remove existing keys
envContent = envContent.replace(/^VAPID_PUBLIC_KEY=.*$/gm, '');
envContent = envContent.replace(/^VAPID_PRIVATE_KEY=.*$/gm, '');
// Remove empty lines left behind
envContent = envContent.replace(/\n\s*\n/g, '\n');

// Append new keys
const newContent = envContent.trim() + '\n' +
    `VAPID_PUBLIC_KEY=${keys.publicKey}\n` +
    `VAPID_PRIVATE_KEY=${keys.privateKey}\n`;

fs.writeFileSync(envPath, newContent);

console.log('✅ Updated .env with new VAPID keys');
console.log('Public:', keys.publicKey);
