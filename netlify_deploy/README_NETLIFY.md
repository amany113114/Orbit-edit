# 🌐 ORBIT - Netlify Deployment Guide

This package contains all files configured specifically for **Netlify**.

---

## ⚡ Method 1: Netlify Drop (1-Click Drag & Drop - 30 Seconds)

1. Log into your **[Netlify Dashboard](https://app.netlify.com/)**.
2. Go to **Sites** ➔ scroll down to **"Want to deploy a new site without connecting to Git? Drag and drop your site folder here"** ([app.netlify.com/drop](https://app.netlify.com/drop)).
3. Unzip **`orbit_netlify_deploy.zip`** and drag the extracted `public/` folder into Netlify Drop.
4. **Done!** Your site will immediately be live online with a free SSL certificate!

---

## 🛠️ Method 2: Netlify CLI

If you use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=netlify_deploy/public
```

---

## ⚙️ Backend API Engine Setup (Render / Railway)

Because Python functions (`yt-dlp`, `pillow`, `scikit-image`, `reportlab`) handle video, image background removal, and PDF compilation:
1. Connect the repository to **[Render.com](https://render.com/)** or **Railway.app** (Free tier).
2. Update `_redirects` or `API_BASE` to route `/api/*` requests directly to your backend URL!
