# 🛸 ORBIT Dedicated Backend Engine Deployment Guide

To make **ORBIT** (`orbiteditt.netlify.app`) work like major downloader sites (SaveFrom, SnapInsta, VidsSave):
1. **Frontend**: Hosted on Netlify (`https://orbiteditt.netlify.app/?`).
2. **Backend Proxy / API Service**: Runs on a free cloud service (Render, Railway, or Vercel).
3. **User Experience**: One-click direct downloads with no redirects and zero CORS errors.

---

## 🚀 Option 1: 1-Click Free Deployment on Render (Recommended)

1. Sign up / Log in to [Render](https://render.com/).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository (or upload code using Render CLI/Blueprint).
4. Render will auto-detect `render.yaml` or you can manually configure:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.
6. Once deployed, Render gives you a public HTTPS URL (e.g., `https://orbit-backend.onrender.com`).

---

## ⚡ Option 2: 1-Click Deployment on Railway

1. Sign up on [Railway](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo** (or use `railway up` with Dockerfile).
3. Railway automatically detects `Dockerfile` or `Procfile`.
4. Under **Settings** > **Networking**, click **Generate Domain** to get your public HTTPS URL.

---

## 🔗 Connecting Backend to your Netlify Site (`orbiteditt.netlify.app`)

1. Open your Netlify site: `https://orbiteditt.netlify.app/?`
2. Click the **"⚙️ PROXY SETTINGS"** button in the header (or the yellow "PROXY NOT SET" badge).
3. Enter your backend URL: e.g. `https://orbit-backend.onrender.com`
4. Click **Connect & Save Proxy**.
5. The badge will instantly change to **🟢 PROXY CONNECTED**.
6. All video, reel, and audio downloads will now stream directly through your high-speed cloud backend!

---

## 🛡️ Anti-Block Parameters (Optional)

In your Render/Railway Environment Variables, you can optionally provide:
- `YT_PO_TOKEN`: Web/iOS Proof-of-Origin token to bypass YouTube bot checks.
- `YT_COOKIES_FILE`: Path to exported YouTube cookies (`cookies.txt`).
- `INSTAGRAM_COOKIE`: Instagram session cookie for private/restricted reels.
