# 🌐 ORBIT - Cloudflare Pages Deployment Guide

This folder contains all files required to upload and launch **ORBIT** online using **Cloudflare Pages**.

---

## ⚡ Method 1: Direct Drag & Drop Upload (Fastest - 1 Minute)

1. Log into your **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. Click **Workers & Pages** in the left sidebar.
3. Click **Create Application** ➔ select the **Pages** tab ➔ click **Upload Assets**.
4. Set Project Name to `orbit-suite` (or your preferred site name).
5. Drag and drop the **`public/`** folder (or `orbit_cloudflare_public.zip`).
6. Click **Deploy Site**. Your site will be live online instantly at `https://orbit-suite.pages.dev`!

---

## 🛠️ Method 2: Cloudflare Wrangler CLI

If you use Node.js / Wrangler CLI:
```bash
npx wrangler pages deploy cloudflare_deploy/public --project-name orbit-suite
```

---

## ⚙️ Backend API Engine Setup (For YouTube Extractor, AI BG Remover, PDF Tools, Invoice & CV Maker)

Because YouTube downloading (`yt-dlp`), Image Background Removal (`scikit-image` + `rembg`), and PDF Compilation (`reportlab`) run in Python:

1. **Deploy Backend to Render / Railway / Fly.io (100% Free)**:
   - Connect your GitHub repository containing the `Dockerfile` / `render.yaml` to **Render.com** or **Railway.app**.
   - Render will build the Python service automatically and give you a free API URL (e.g. `https://orbit-backend.onrender.com`).
2. **Link Cloudflare Pages Frontend to Backend**:
   - In `public/js/app.js`, update `API_BASE` if deploying frontend and backend on separate domains.
