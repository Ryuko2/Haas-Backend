# 🚀 Haas Diagnostic - Modern Mobile App Setup

## This is an Expo-Based React Native App (Much Easier!)

Expo makes it **super easy** to run React Native apps without Android Studio or Xcode setup!

---

## 📱 Step 1: Install Expo Go on Your Phone

### Android:
Download from Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

### iPhone:
Download from App Store: https://apps.apple.com/app/expo-go/id982107779

---

## 💻 Step 2: Setup on Your Computer

### Navigate to this folder:
```bash
cd C:\Users\kevsv\OneDrive\Escritorio\Haas-diagnostic-system\mobile-app-expo
```

### Install dependencies:
```bash
npm install
```

### Start the app:
```bash
npm start
```

You'll see a QR code in the terminal!

---

## 📲 Step 3: Connect Your Phone

1. Make sure your phone and computer are on the **same WiFi network**
2. Open **Expo Go** app on your phone
3. **Scan the QR code** from the terminal
4. The app will load on your phone!

---

## 🎯 What You'll See

### Beautiful Material Design Dashboard:
- **Gradient header** with machine status
- **Status card** with color-coded machine state
- **Metric cards** with gradients:
  - Spindle speed
  - Feed rate
  - Parts count
  - Coolant level
- **Axes positions** with circular badges
- **Current tool** information
- **Alarms and maintenance alerts**

### Tools Screen:
- **Summary cards** showing active tools
- **Critical wear alerts**
- **Tool list** with life bars
- **Color-coded** by tool condition

---

## ⚙️ Configuration

### Update Backend URL

Edit `ModernDashboard.js` and `ToolsScreen.js`:

Find this line:
```javascript
const response = await fetch('http://localhost:3000/api/status');
```

Replace `localhost` with your computer's IP address:
```javascript
const response = await fetch('http://192.168.1.XXX:3000/api/status');
```

### How to find your IP:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.105)

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

---

## 🎨 Features

### Modern UI:
- ✅ Material Design inspired
- ✅ Gradient cards and headers
- ✅ Smooth animations
- ✅ Color-coded status
- ✅ Clean, professional layout

### Real-time Updates:
- ✅ Auto-updates every 2 seconds
- ✅ Pull-to-refresh
- ✅ Live machine data
- ✅ Connection indicator

### Responsive Design:
- ✅ Works on all screen sizes
- ✅ Adapts to phone/tablet
- ✅ Beautiful on any device

---

## 🔧 Troubleshooting

### Can't connect to backend?

1. **Check backend is running:**
   - Open http://localhost:3000 in browser on your computer
   - Should see API documentation

2. **Update IP address:**
   - Change `localhost` to your computer's IP in the code
   - Make sure phone and computer on same WiFi

3. **Check firewall:**
   - Windows Firewall might block port 3000
   - Temporarily disable or allow Node.js

### App won't load on phone?

1. **Check WiFi:**
   - Phone and computer must be on same network
   - Not 5GHz vs 2.4GHz issue

2. **Restart Expo:**
   - Press `Ctrl+C` in terminal
   - Run `npm start` again
   - Scan QR code again

3. **Clear cache:**
   ```bash
   npm start -c
   ```

---

## 📦 Building for Production

### Build APK (Android):
```bash
expo build:android
```

### Build IPA (iOS):
```bash
expo build:ios
```

### Submit to stores:
```bash
expo submit:android
expo submit:ios
```

---

## 🎯 Next Steps

1. ✅ Run `npm install`
2. ✅ Run `npm start`
3. ✅ Scan QR code with Expo Go
4. ✅ Update IP address for backend
5. ✅ Enjoy your beautiful dashboard!

---

## 💡 Why Expo is Better

- ✅ **No Android Studio** needed
- ✅ **No Xcode** needed
- ✅ **Faster development** - see changes instantly
- ✅ **Easy deployment** - one command to build
- ✅ **Cross-platform** - same code for iOS and Android

---

**Ready to see your beautiful dashboard? Run `npm start` now!** 🎉
