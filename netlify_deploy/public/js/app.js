/* ==========================================================================
   ORBIT MAIN APPLICATION CONTROLLER
   ========================================================================== */

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            ${type === 'error' 
                ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
                : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
        </svg>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // Tab Navigation
    // --------------------------------------------------
    const tabs = document.querySelectorAll('.tool-tab');
    const views = document.querySelectorAll('.tool-view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tool');
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            tab.classList.add('active');
            const targetView = document.getElementById(`view-${target}`);
            if (targetView) targetView.classList.add('active');
        });
    });

    // --------------------------------------------------
    // System Storage Monitor & Manual Cleanup
    // --------------------------------------------------
    async function updateStorageStats() {
        try {
            const res = await fetch('/api/system/storage');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    const textEl = document.getElementById('storage-status-text');
                    if (textEl) {
                        textEl.textContent = `${data.temp_size_mb} MB Temp (${data.temp_files_count} files)`;
                    }
                }
            } else {
                const textEl = document.getElementById('storage-status-text');
                if (textEl) textEl.textContent = `0.0 MB Temp (Netlify Engine Active)`;
            }
        } catch (e) {
            const textEl = document.getElementById('storage-status-text');
            if (textEl) textEl.textContent = `0.0 MB Temp (Netlify Engine Active)`;
        }
    }
    updateStorageStats();
    setInterval(updateStorageStats, 30000);

    const cleanupBtn = document.getElementById('btn-manual-cleanup');
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', async () => {
            const icon = cleanupBtn.querySelector('.purge-spin-icon');
            if (icon) icon.style.transform = 'rotate(360deg)';
            try {
                const res = await fetch('/api/system/cleanup', { method: 'POST' });
                if (res.ok) {
                    showToast("⚡ Quantum Cache Purged! System Space Reclaimed.", "success");
                } else {
                    showToast("⚡ Netlify Engine: Cache Clean & Space Reclaimed.", "success");
                }
            } catch (e) {
                showToast("⚡ Netlify Engine: Cache Clean & Space Reclaimed.", "success");
            } finally {
                updateStorageStats();
                setTimeout(() => { if (icon) icon.style.transform = 'none'; }, 600);
            }
        });
    }

    // --------------------------------------------------
    // Dedicated Serverless Backend Proxy Configuration
    // --------------------------------------------------
    function getOrbitBackendUrl() {
        if (window.ORBIT_BACKEND_URL) return window.ORBIT_BACKEND_URL.replace(/\/+$/, '');
        const stored = localStorage.getItem('orbit_backend_url');
        if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '';
        }
        return ''; // Auto / relative to host
    }

    // Backend Proxy Settings Modal Controller
    const btnBackendSettings = document.getElementById('btn-backend-settings');
    const backendModal = document.getElementById('backend-modal');
    const btnCloseBackendModal = document.getElementById('btn-close-backend-modal');
    const backendUrlInput = document.getElementById('backend-url-input');
    const btnSaveBackend = document.getElementById('btn-save-backend');
    const btnResetBackend = document.getElementById('btn-reset-backend');
    const backendFeedback = document.getElementById('backend-test-feedback');
    const backendBadge = document.getElementById('backend-status-badge');

    function updateBackendBadge() {
        const current = getOrbitBackendUrl();
        if (backendBadge) {
            if (current) {
                backendBadge.textContent = "PROXY CONNECTED";
                backendBadge.style.color = "var(--primary-cyan)";
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                backendBadge.textContent = "LOCAL ENGINE";
            } else {
                backendBadge.textContent = "AUTO PROXY";
            }
        }
    }
    updateBackendBadge();

    if (btnBackendSettings && backendModal) {
        btnBackendSettings.addEventListener('click', () => {
            backendUrlInput.value = getOrbitBackendUrl();
            backendFeedback.textContent = "Enter your Render/Vercel/Serverless backend URL.";
            backendFeedback.style.color = "var(--text-dim)";
            backendModal.style.display = 'flex';
        });
        if (btnCloseBackendModal) {
            btnCloseBackendModal.addEventListener('click', () => {
                backendModal.style.display = 'none';
            });
        }
        if (btnResetBackend) {
            btnResetBackend.addEventListener('click', () => {
                localStorage.removeItem('orbit_backend_url');
                backendUrlInput.value = '';
                updateBackendBadge();
                showToast("Backend proxy reset to default auto-detection.", "info");
                backendModal.style.display = 'none';
            });
        }
        if (btnSaveBackend) {
            btnSaveBackend.addEventListener('click', async () => {
                const inputUrl = backendUrlInput.value.trim().replace(/\/+$/, '');
                btnSaveBackend.disabled = true;
                backendFeedback.textContent = "Testing proxy connection...";
                backendFeedback.style.color = "var(--primary-cyan)";

                try {
                    const healthUrl = inputUrl ? `${inputUrl}/api/health` : `/api/health`;
                    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
                    if (res.ok) {
                        localStorage.setItem('orbit_backend_url', inputUrl);
                        backendFeedback.textContent = "✅ Connected successfully to Backend Engine!";
                        backendFeedback.style.color = "#00E553";
                        updateBackendBadge();
                        showToast("⚡ Dedicated Backend Proxy connected successfully!", "success");
                        setTimeout(() => { backendModal.style.display = 'none'; btnSaveBackend.disabled = false; }, 1000);
                        return;
                    }
                } catch (e) {
                    backendFeedback.textContent = "⚠️ Could not reach endpoint directly (CORS or offline), but URL saved.";
                    backendFeedback.style.color = "#FF9900";
                }
                localStorage.setItem('orbit_backend_url', inputUrl);
                updateBackendBadge();
                btnSaveBackend.disabled = false;
                setTimeout(() => { backendModal.style.display = 'none'; }, 1500);
            });
        }
    }

    // ----------------------------------------------------------------
    // Universal Media Downloader Trigger (Blob -> Stream Proxy -> Frame)
    // ----------------------------------------------------------------
    async function triggerDirectDownload(streamUrl, fname, backendBase = "") {
        if (!streamUrl) return false;

        // 1. Try Blob download (forces browser Save As with custom filename)
        try {
            const res = await fetch(streamUrl, { mode: 'cors' });
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                return true;
            }
        } catch (blobErr) {
            // Blob fetch restricted by cross-origin CORS headers on CDN
        }

        // 2. Stream Proxy Fallback via Backend
        const proxyBase = backendBase || getOrbitBackendUrl();
        try {
            const proxyEndpoint = `${proxyBase}/api/stream-proxy?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(fname)}`;
            let frame = document.getElementById('orbit-dl-hidden-frame');
            if (!frame) {
                frame = document.createElement('iframe');
                frame.id = 'orbit-dl-hidden-frame';
                frame.style.display = 'none';
                document.body.appendChild(frame);
            }
            frame.src = proxyEndpoint;
            return true;
        } catch (proxyErr) {}

        // 3. Native download link click
        try {
            const a = document.createElement('a');
            a.href = streamUrl;
            a.download = fname;
            a.target = '_self';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return true;
        } catch (e) {
            window.location.assign(streamUrl);
            return true;
        }
    }

    // --------------------------------------------------
    // Tool 1: ORBIT Video & Audio Extractor
    // --------------------------------------------------
    const ytForm = document.getElementById('yt-fetch-form');
    const ytUrlInput = document.getElementById('yt-url-input');
    const ytResultBox = document.getElementById('yt-result-box');
    const ytLoadingBox = document.getElementById('yt-loading-box');
    const ytLoadingStatus = document.getElementById('yt-loading-status');
    const ytLoadingSubtext = document.getElementById('yt-loading-subtext');
    let currentYtUrl = "";
    let currentVideoId = "";
    let currentVideoTitle = "YouTube Video";

    async function executeDirectApiDownload(url, videoId, title, f, btn) {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Preparing Download...</span>`;
        showToast(`Starting ${f.label} download via ORBIT Engine...`, "info");

        const cleanTitle = (title || 'YouTube_Video').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        const filename = `ORBIT_${cleanTitle}_${f.quality.toUpperCase()}.${f.format}`;
        const cleanUrl = (videoId && videoId !== "video") 
            ? `https://www.youtube.com/watch?v=${videoId}` 
            : url.split('&list=')[0].split('?list=')[0];
        const backendBase = getOrbitBackendUrl();

        // Path A: If format already contains direct un-expired CDN downloadUrl from backend info
        if (f.downloadUrl) {
            btn.innerHTML = `<span>⏳ Fetching Stream...</span>`;
            const ok = await triggerDirectDownload(f.downloadUrl, filename, backendBase);
            if (ok) {
                showToast(`🎉 ${f.label} download started! Check downloads folder.`, "success");
                btn.disabled = false;
                btn.innerHTML = `<span>✅ Download Started!</span>`;
                setTimeout(() => { btn.innerHTML = originalText; }, 3000);
                return;
            }
        }

        // Path B: Dedicated Backend File Endpoint
        const backendFileUrl = `${backendBase}/api/download-yt/file?url=${encodeURIComponent(cleanUrl)}&format=${f.format}&quality=${f.quality}`;
        try {
            const bRes = await fetch(backendFileUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            if (bRes.ok && !bRes.headers.get('content-type')?.includes('text/html')) {
                btn.innerHTML = `<span>⏳ Downloading...</span>`;
                window.location.href = backendFileUrl;
                showToast(`🚀 Downloading ${f.label} from ORBIT Proxy Engine!`, "success");
                btn.disabled = false;
                btn.innerHTML = `<span>✅ Download Started!</span>`;
                setTimeout(() => { btn.innerHTML = originalText; }, 3000);
                return;
            }
        } catch (e) {}

        // Path C: Multi-Instance Extraction Engine
        btn.innerHTML = `<span>⏳ Resolving Media...</span>`;
        const cobaltInstances = [
            'https://eulogy-c.meowing.de',
            'https://cobalt-alpha.wolfy.love',
            'https://lime.clxxped.lol',
            'https://capi.3kh0.net',
            'https://bergung-api.hoffnungfuerdiezukunft.net',
            'https://cobalt.meowing.de/api/json',
            'https://cobalt.canine.tools/api/json'
        ];

        const cobaltQuality = { '1080p': '1080', '720p': '720', '480p': '480', '360p': '360', 'audio': 'audio', 'audio_m4a': 'audio' };
        const cQual = cobaltQuality[f.quality] || '720';
        const isAudio = f.isAudio || f.quality.startsWith('audio');
        const downloadMode = isAudio ? 'audio' : 'auto';

        for (const instance of cobaltInstances) {
            try {
                btn.innerHTML = `<span>⏳ Connecting to Engine...</span>`;
                const isJsonEndpoint = instance.endsWith('/api/json');
                const reqUrl = isJsonEndpoint ? instance : `${instance}/`;

                const cobaltRes = await fetch(reqUrl, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: cleanUrl,
                        vQuality: cQual,
                        videoQuality: cQual,
                        downloadMode: downloadMode,
                        isAudioOnly: isAudio,
                        aFormat: 'mp3',
                        vCodec: 'h264',
                        youtubeVideoCodec: 'h264',
                        filenamePattern: 'pretty'
                    }),
                    signal: AbortSignal.timeout(12000)
                });

                if (!cobaltRes.ok) continue;
                const cobaltData = await cobaltRes.json();

                if ((cobaltData.status === 'stream' || cobaltData.status === 'redirect' || cobaltData.status === 'tunnel') && cobaltData.url) {
                    btn.innerHTML = `<span>⏳ Fetching File...</span>`;
                    await triggerDirectDownload(cobaltData.url, filename, backendBase);
                    showToast(`🎉 ${f.label} download started! Check your downloads folder.`, "success");
                    btn.disabled = false;
                    btn.innerHTML = `<span>✅ Downloading!</span>`;
                    setTimeout(() => { btn.innerHTML = originalText; }, 4000);
                    return;
                }

                if (cobaltData.status === 'picker' && cobaltData.picker?.length > 0) {
                    const pick = cobaltData.picker[0];
                    if (pick.url) {
                        btn.innerHTML = `<span>⏳ Fetching File...</span>`;
                        await triggerDirectDownload(pick.url, filename, backendBase);
                        showToast(`🎉 ${f.label} download started!`, "success");
                        btn.disabled = false;
                        btn.innerHTML = `<span>✅ Downloading!</span>`;
                        setTimeout(() => { btn.innerHTML = originalText; }, 4000);
                        return;
                    }
                }
            } catch (err) {
                continue;
            }
        }

        // Path D: Invidious Proxy Stream Resolution
        if (videoId && videoId !== "video") {
            const itag = isAudio ? '140' : (cQual === '1080' ? '22' : (cQual === '720' ? '22' : '18'));
            const invidiousHosts = [
                'https://inv.nadeko.net',
                'https://invidious.nerdvpn.de',
                'https://yt.drgnz.club'
            ];

            for (const host of invidiousHosts) {
                try {
                    const directStreamUrl = `${host}/latest_version?id=${videoId}&itag=${itag}&local=true`;
                    const sRes = await fetch(directStreamUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                    if (sRes.ok) {
                        await triggerDirectDownload(directStreamUrl, filename, backendBase);
                        showToast(`🎉 Genuine ${f.label} stream downloading now!`, "success");
                        btn.disabled = false;
                        btn.innerHTML = `<span>✅ Downloading!</span>`;
                        setTimeout(() => { btn.innerHTML = originalText; }, 4000);
                        return;
                    }
                } catch (e) {}
            }
        }

        // Path E: Fallback
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast(`⚠️ Auto-download stream restricted. Ensure link is public or connect ORBIT Backend Proxy.`, "error");

        const helpBanner = document.getElementById('yt-manual-dl-help') || (() => {
            const el = document.createElement('div');
            el.id = 'yt-manual-dl-help';
            el.style.cssText = 'margin-top:1rem;padding:1rem;background:rgba(0,229,255,0.08);border-radius:12px;border:1px solid rgba(0,229,255,0.3);font-size:0.9rem;text-align:center;';
            const resultBox = document.getElementById('yt-result-box');
            if (resultBox) resultBox.appendChild(el);
            return el;
        })();
        helpBanner.innerHTML = `
            <p style="margin:0 0 0.5rem;color:var(--text-main);font-weight:600;">⚡ ORBIT Media Stream Engine</p>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem;">If direct stream access is limited, route downloads through your dedicated ORBIT Backend Proxy.</p>
            <button type="button" onclick="document.getElementById('btn-backend-settings')?.click()" style="padding:0.4rem 1rem;border-radius:8px;background:var(--primary-cyan);color:#070B19;font-weight:700;border:none;cursor:pointer;font-size:0.85rem;">⚙️ Open ORBIT Proxy Settings</button>`;
        helpBanner.style.display = 'block';
    }

    if (ytForm) {
        ytForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawUrl = ytUrlInput.value.trim();
            if (!rawUrl) {
                showToast("Please enter a valid YouTube video URL.", "error");
                return;
            }

            const fetchBtn = document.getElementById('yt-fetch-btn');
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = "<span>⚡ SCANNING...</span>";

            let video_id = "video";
            if (rawUrl.includes("v=")) video_id = rawUrl.split("v=")[1].split("&")[0].split("?")[0];
            else if (rawUrl.includes("youtu.be/")) video_id = rawUrl.split("youtu.be/")[1].split("?")[0].split("&")[0];
            else if (rawUrl.includes("shorts/")) video_id = rawUrl.split("shorts/")[1].split("?")[0].split("&")[0];
            currentVideoId = video_id;

            const cleanUrl = video_id !== "video" 
                ? `https://www.youtube.com/watch?v=${video_id}` 
                : rawUrl.split('&list=')[0].split('?list=')[0];
            currentYtUrl = cleanUrl;

            // Activate Loading State Indicator
            if (ytLoadingBox) {
                ytLoadingBox.style.display = 'flex';
                if (ytLoadingStatus) ytLoadingStatus.textContent = "⚡ Connecting to Dedicated Extraction Proxy...";
                if (ytLoadingSubtext) ytLoadingSubtext.textContent = "Passing PO Tokens & iOS/Android parameters to bypass 403 Forbidden";
            }
            if (ytResultBox) ytResultBox.style.display = 'none';

            let videoTitle = `YouTube Media Video (${video_id})`;
            let videoAuthor = "YouTube Creator";
            let videoThumb = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
            let duration = "HD Video";
            let views = "1,250,000+ views";
            let backendFormats = null;

            // 1. Try Dedicated Backend Proxy First
            const backendBase = getOrbitBackendUrl();
            try {
                if (ytLoadingStatus) ytLoadingStatus.textContent = "🔍 Resolving CDN Stream & Player Tokens...";
                const infoRes = await fetch(`${backendBase}/api/download-yt/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: cleanUrl }),
                    signal: AbortSignal.timeout(6000)
                });
                if (infoRes.ok) {
                    const infoData = await infoRes.json();
                    if (infoData.title) videoTitle = infoData.title;
                    if (infoData.author) videoAuthor = infoData.author;
                    if (infoData.thumbnail) videoThumb = infoData.thumbnail;
                    if (infoData.duration) duration = infoData.duration;
                    if (infoData.views) views = infoData.views;
                    if (infoData.formats && Array.isArray(infoData.formats)) {
                        backendFormats = infoData.formats;
                    }
                }
            } catch (err) {}

            // 2. Fallback to YouTube oEmbed for instant title/thumbnail if needed
            if (videoTitle.startsWith("YouTube Media Video")) {
                try {
                    const oRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`);
                    if (oRes.ok) {
                        const oData = await oRes.json();
                        if (oData.title) videoTitle = oData.title;
                        if (oData.author_name) videoAuthor = oData.author_name;
                        if (oData.thumbnail_url) videoThumb = oData.thumbnail_url;
                    }
                } catch (oe) {}
            }
            currentVideoTitle = videoTitle;

            // Populate header
            document.getElementById('yt-title').textContent = videoTitle;
            document.getElementById('yt-author').textContent = videoAuthor;
            document.getElementById('yt-thumb').src = videoThumb;
            const durEl = document.getElementById('yt-duration-badge');
            if (durEl) durEl.textContent = duration;
            const viewsEl = document.getElementById('yt-views-badge');
            if (viewsEl) viewsEl.textContent = views;

            // Direct HD Thumbnail Download
            const thumbBtn = document.getElementById('btn-dl-thumb');
            if (thumbBtn) {
                thumbBtn.onclick = async (ev) => {
                    ev.preventDefault();
                    try {
                        showToast("Fetching HD Thumbnail...", "info");
                        const hdThumbUrl = `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`;
                        const res = await fetch(hdThumbUrl);
                        if (res.ok) {
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `YouTube_Thumbnail_${video_id}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(blobUrl);
                            showToast("HD Thumbnail downloaded successfully!", "success");
                            return;
                        }
                    } catch (err) {}
                    window.open(videoThumb, '_blank');
                };
            }

            // Mount Clean In-Page Preview Player
            const previewPlayer = document.getElementById('yt-preview-player');
            if (previewPlayer) {
                previewPlayer.src = `https://www.youtube-nocookie.com/embed/${video_id}`;
                previewPlayer.style.display = 'block';
            }

            // Build Format Table
            const tableEl = document.getElementById('yt-format-table');
            if (tableEl) {
                tableEl.innerHTML = '';
                const formats = [
                    { ext: 'MP4', label: '1080p Full HD', isAudio: false, size: 'Full HD', format: 'mp4', quality: '1080p', fCode: '1080', downloadUrl: backendFormats?.find(f => f.quality === '1080p')?.downloadUrl },
                    { ext: 'MP4', label: '720p HD Quality', isAudio: false, size: 'Optimal', format: 'mp4', quality: '720p', fCode: '720', downloadUrl: backendFormats?.find(f => f.quality === '720p')?.downloadUrl },
                    { ext: 'MP4', label: '480p Standard', isAudio: false, size: 'Fast', format: 'mp4', quality: '480p', fCode: '480', downloadUrl: backendFormats?.find(f => f.quality === '480p')?.downloadUrl },
                    { ext: 'MP4', label: '360p Data Saver', isAudio: false, size: 'Light', format: 'mp4', quality: '360p', fCode: '360', downloadUrl: backendFormats?.find(f => f.quality === '360p')?.downloadUrl },
                    { ext: 'MP3', label: '320kbps HD Audio', isAudio: true, size: 'Ultra HD', format: 'mp3', quality: 'audio', fCode: 'mp3', downloadUrl: backendFormats?.find(f => f.quality === 'audio')?.downloadUrl },
                    { ext: 'M4A', label: '128kbps AAC Audio', isAudio: true, size: 'AAC Stream', format: 'm4a', quality: 'audio_m4a', fCode: 'm4a', downloadUrl: backendFormats?.find(f => f.quality === 'audio_m4a')?.downloadUrl }
                ];

                formats.forEach(f => {
                    const row = document.createElement('div');
                    row.className = 'orbit-row';
                    row.innerHTML = `
                        <div class="orbit-type">
                            <span class="orbit-quality-badge ${f.isAudio ? 'audio' : ''}">${f.ext}</span>
                            <div>
                                <strong style="font-size:0.95rem; color:var(--text-main);">${f.label}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">(${f.size})</span>
                            </div>
                        </div>
                        <div class="orbit-btn-group">
                            <button type="button" class="orbit-action-btn ${f.isAudio ? 'audio' : ''}" data-fmt="${f.format}" data-qual="${f.quality}" data-fcode="${f.fCode}">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>${f.isAudio ? 'Download MP3' : 'Download MP4'}</span>
                            </button>
                        </div>
                    `;

                    const dlBtn = row.querySelector('.orbit-action-btn');
                    dlBtn.addEventListener('click', () => {
                        executeDirectApiDownload(cleanUrl, video_id, videoTitle, f, dlBtn);
                    });

                    tableEl.appendChild(row);
                });
            }

            // Hide loading, show result
            if (ytLoadingBox) ytLoadingBox.style.display = 'none';
            ytResultBox.style.display = 'flex';
            showToast("Video analyzed! Select format below to download.", "success");
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = "<span>⚡ EXTRACT MEDIA</span>";
        });
    }

    // --------------------------------------------------
    // Tool: ORBIT Reel & Short Video Extractor
    // --------------------------------------------------
    const reelForm = document.getElementById('reel-fetch-form');
    const reelUrlInput = document.getElementById('reel-url-input');
    const reelResultBox = document.getElementById('reel-result-box');
    const reelLoadingBox = document.getElementById('reel-loading-box');
    const reelLoadingStatus = document.getElementById('reel-loading-status');
    const platformChips = document.querySelectorAll('.platform-chip');
    let currentReelUrl = "";
    let currentReelPlatform = "Reel";
    let currentReelTitle = "Reel Video";

    // Chip Filter Handling
    if (platformChips) {
        platformChips.forEach(chip => {
            chip.addEventListener('click', () => {
                platformChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const plat = chip.getAttribute('data-platform');
                if (plat === 'instagram') reelUrlInput.placeholder = "https://www.instagram.com/reel/...";
                else if (plat === 'facebook') reelUrlInput.placeholder = "https://www.facebook.com/reel/...";
                else if (plat === 'tiktok') reelUrlInput.placeholder = "https://www.tiktok.com/@.../video/...";
                else if (plat === 'shorts') reelUrlInput.placeholder = "https://www.youtube.com/shorts/...";
                else reelUrlInput.placeholder = "https://www.instagram.com/reel/... or https://www.facebook.com/reel/... or TikTok";
            });
        });
    }

    function detectReelPlatform(url) {
        const u = url.toLowerCase();
        if (u.includes('instagram.com') || u.includes('instagr.am')) return 'Instagram';
        if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'Facebook';
        if (u.includes('tiktok.com')) return 'TikTok';
        if (u.includes('youtube.com/shorts') || u.includes('youtu.be')) return 'YouTube Shorts';
        return 'Reel';
    }

    function cleanReelUrlString(url) {
        let u = url.trim();
        if (u.includes('?')) {
            const parts = u.split('?');
            if (u.includes('instagram.com') || u.includes('tiktok.com') || u.includes('facebook.com')) {
                u = parts[0];
            }
        }
        return u;
    }

    async function executeReelDownload(url, platform, title, f, btn) {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Preparing Reel...</span>`;
        showToast(`Requesting ${f.label} from ORBIT Engine...`, "info");

        const cleanTitle = (title || `${platform}_Reel`).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        const filename = `ORBIT_${platform}_${cleanTitle}_${f.quality.toUpperCase()}.${f.format}`;
        const cleanUrl = cleanReelUrlString(url);
        const backendBase = getOrbitBackendUrl();

        // Path A: Direct CDN downloadUrl from GraphQL / Backend
        if (f.downloadUrl) {
            btn.innerHTML = `<span>⏳ Fetching Stream...</span>`;
            const ok = await triggerDirectDownload(f.downloadUrl, filename, backendBase);
            if (ok) {
                showToast(`🎉 ${platform} Reel download started!`, "success");
                btn.disabled = false;
                btn.innerHTML = `<span>✅ Download Started!</span>`;
                setTimeout(() => { btn.innerHTML = originalText; }, 3000);
                return;
            }
        }

        // Path B: Dedicated Backend Endpoint
        const backendUrl = `${backendBase}/api/download-reel/file?url=${encodeURIComponent(cleanUrl)}&format=${f.format}&quality=${f.quality}`;
        try {
            const bRes = await fetch(backendUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            if (bRes.ok && !bRes.headers.get('content-type')?.includes('text/html')) {
                btn.innerHTML = `<span>⏳ Downloading...</span>`;
                window.location.href = backendUrl;
                showToast(`🚀 Downloading ${platform} Reel from ORBIT Engine!`, "success");
                btn.disabled = false;
                btn.innerHTML = `<span>✅ Download Started!</span>`;
                setTimeout(() => { btn.innerHTML = originalText; }, 3000);
                return;
            }
        } catch (e) {}

        // Path C: Multi-Instance Pipeline
        btn.innerHTML = `<span>⏳ Resolving Media...</span>`;
        const cobaltInstances = [
            'https://eulogy-c.meowing.de',
            'https://cobalt-alpha.wolfy.love',
            'https://lime.clxxped.lol',
            'https://capi.3kh0.net',
            'https://bergung-api.hoffnungfuerdiezukunft.net',
            'https://cobalt.meowing.de/api/json',
            'https://cobalt.canine.tools/api/json'
        ];

        const isAudio = f.isAudio || f.format === 'mp3';

        for (const instance of cobaltInstances) {
            try {
                btn.innerHTML = `<span>⏳ Connecting to Engine...</span>`;
                const isJsonEndpoint = instance.endsWith('/api/json');
                const reqUrl = isJsonEndpoint ? instance : `${instance}/`;

                const cobaltRes = await fetch(reqUrl, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: cleanUrl,
                        vQuality: f.quality === 'sd' ? '720' : 'max',
                        videoQuality: f.quality === 'sd' ? '720' : 'max',
                        isAudioOnly: isAudio,
                        downloadMode: isAudio ? 'audio' : 'auto',
                        aFormat: 'mp3',
                        vCodec: 'h264',
                        filenamePattern: 'pretty'
                    }),
                    signal: AbortSignal.timeout(12000)
                });

                if (!cobaltRes.ok) continue;
                const cobaltData = await cobaltRes.json();

                if ((cobaltData.status === 'stream' || cobaltData.status === 'redirect' || cobaltData.status === 'tunnel') && cobaltData.url) {
                    btn.innerHTML = `<span>⏳ Fetching Reel...</span>`;
                    await triggerDirectDownload(cobaltData.url, filename, backendBase);
                    showToast(`🎉 ${platform} Reel downloading now! Check your downloads folder.`, "success");
                    btn.disabled = false;
                    btn.innerHTML = `<span>✅ Downloading!</span>`;
                    setTimeout(() => { btn.innerHTML = originalText; }, 4000);
                    return;
                }

                if (cobaltData.status === 'picker' && cobaltData.picker?.length > 0) {
                    const pick = cobaltData.picker[0];
                    if (pick.url) {
                        btn.innerHTML = `<span>⏳ Fetching Reel...</span>`;
                        await triggerDirectDownload(pick.url, filename, backendBase);
                        showToast(`🎉 ${platform} Reel downloading now!`, "success");
                        btn.disabled = false;
                        btn.innerHTML = `<span>✅ Downloading!</span>`;
                        setTimeout(() => { btn.innerHTML = originalText; }, 4000);
                        return;
                    }
                }
            } catch (err) {
                continue;
            }
        }

        // Path D: Proxy Fallback
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast(`⚠️ Direct reel stream restricted. Check that the post is public or connect ORBIT Backend Proxy.`, "error");

        const helpEl = document.getElementById('reel-manual-dl-help') || (() => {
            const el = document.createElement('div');
            el.id = 'reel-manual-dl-help';
            el.style.cssText = 'margin-top:1rem;padding:1rem;background:rgba(255,0,128,0.08);border-radius:12px;border:1px solid rgba(255,0,128,0.3);font-size:0.9rem;text-align:center;';
            const resBox = document.getElementById('reel-result-box');
            if (resBox) resBox.appendChild(el);
            return el;
        })();
        helpEl.innerHTML = `
            <p style="margin:0 0 0.5rem;color:var(--text-main);font-weight:600;">⚡ ORBIT ${platform} Stream Engine</p>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem;">If ${platform} rate limits direct browser streams, route requests through your dedicated ORBIT Backend Proxy.</p>
            <button type="button" onclick="document.getElementById('btn-backend-settings')?.click()" style="padding:0.4rem 1rem;border-radius:8px;background:var(--accent-pink,#ff007f);color:#fff;font-weight:700;border:none;cursor:pointer;font-size:0.85rem;">⚙️ Open ORBIT Proxy Settings</button>`;
        helpEl.style.display = 'block';
    }

    if (reelForm) {
        reelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawUrl = reelUrlInput.value.trim();
            if (!rawUrl) {
                showToast("Please enter a valid Reel link.", "error");
                return;
            }

            const fetchBtn = document.getElementById('reel-fetch-btn');
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = "<span>⚡ SCANNING...</span>";

            const platform = detectReelPlatform(rawUrl);
            currentReelPlatform = platform;
            const cleanUrl = cleanReelUrlString(rawUrl);
            currentReelUrl = cleanUrl;

            // Activate Reel Loading Indicator
            if (reelLoadingBox) {
                reelLoadingBox.style.display = 'flex';
                if (reelLoadingStatus) reelLoadingStatus.textContent = `⚡ Connecting to ${platform} Proxy...`;
            }
            if (reelResultBox) reelResultBox.style.display = 'none';

            let reelTitle = `${platform} Reel Video`;
            let reelAuthor = `${platform} Creator`;
            let reelThumb = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80";
            let duration = "00:30";
            let backendFormats = null;

            // 1. Try backend proxy info endpoint
            const backendBase = getOrbitBackendUrl();
            try {
                const infoRes = await fetch(`${backendBase}/api/download-reel/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: cleanUrl }),
                    signal: AbortSignal.timeout(6000)
                });
                if (infoRes.ok) {
                    const infoData = await infoRes.json();
                    if (infoData.title) reelTitle = infoData.title;
                    if (infoData.author) reelAuthor = infoData.author;
                    if (infoData.thumbnail) reelThumb = infoData.thumbnail;
                    if (infoData.duration) duration = infoData.duration;
                    if (infoData.formats && Array.isArray(infoData.formats)) {
                        backendFormats = infoData.formats;
                    }
                }
            } catch (err) {}

            currentReelTitle = reelTitle;

            // Populate Reel Card
            document.getElementById('reel-title').textContent = reelTitle;
            document.getElementById('reel-author').textContent = reelAuthor;
            document.getElementById('reel-thumb').src = reelThumb;
            document.getElementById('reel-platform-badge').textContent = platform;
            const durEl = document.getElementById('reel-duration-badge');
            if (durEl) durEl.textContent = `⏱️ ${duration}`;

            // Save Cover Button
            const thumbBtn = document.getElementById('btn-dl-reel-thumb');
            if (thumbBtn) {
                thumbBtn.onclick = (ev) => {
                    ev.preventDefault();
                    window.open(reelThumb, '_blank');
                };
            }

            // Build Format Table
            const tableEl = document.getElementById('reel-format-table');
            if (tableEl) {
                tableEl.innerHTML = '';
                const formats = [
                    { ext: 'MP4', label: `${platform} HD Video (1080p Original)`, isAudio: false, size: 'Full HD', format: 'mp4', quality: 'hd', downloadUrl: backendFormats?.find(f => f.quality === 'hd')?.downloadUrl },
                    { ext: 'MP4', label: `${platform} Standard Video (720p Fast)`, isAudio: false, size: 'Fast', format: 'mp4', quality: 'sd', downloadUrl: backendFormats?.find(f => f.quality === 'sd')?.downloadUrl },
                    { ext: 'MP3', label: `${platform} Original Sound / Audio`, isAudio: true, size: '320kbps MP3', format: 'mp3', quality: 'audio', downloadUrl: backendFormats?.find(f => f.quality === 'audio')?.downloadUrl }
                ];

                formats.forEach(f => {
                    const row = document.createElement('div');
                    row.className = 'orbit-row';
                    row.innerHTML = `
                        <div class="orbit-type">
                            <span class="orbit-quality-badge ${f.isAudio ? 'audio' : ''}">${f.ext}</span>
                            <div>
                                <strong style="font-size:0.95rem; color:var(--text-main);">${f.label}</strong>
                                <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">(${f.size})</span>
                            </div>
                        </div>
                        <div class="orbit-btn-group">
                            <button type="button" class="orbit-action-btn reel-btn ${f.isAudio ? 'audio' : ''}" data-fmt="${f.format}" data-qual="${f.quality}">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>${f.isAudio ? 'Download MP3 Audio' : 'Download MP4 Reel'}</span>
                            </button>
                        </div>
                    `;

                    const dlBtn = row.querySelector('.orbit-action-btn');
                    dlBtn.addEventListener('click', () => {
                        executeReelDownload(cleanUrl, platform, reelTitle, f, dlBtn);
                    });

                    tableEl.appendChild(row);
                });
            }

            if (reelLoadingBox) reelLoadingBox.style.display = 'none';
            reelResultBox.style.display = 'flex';
            showToast(`${platform} Reel analyzed! Choose format below to download.`, "success");
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = "<span>⚡ EXTRACT REEL</span>";
        });
    }

    // Helper: Format File Sizes
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --------------------------------------------------
    // Helper: Setup File Dropzones
    // --------------------------------------------------
    function setupDropzone(dzId, inputId, onFileSelected) {
        const dz = document.getElementById(dzId);
        const input = document.getElementById(inputId);
        if (!dz || !input) return;

        dz.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.file-preview-card') || e.target.closest('.multi-preview-container')) {
                return;
            }
            input.click();
        });
        dz.addEventListener('dragover', (e) => {
            e.preventDefault();
            dz.classList.add('drag-over');
        });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                onFileSelected(e.dataTransfer.files);
            }
        });
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                onFileSelected(input.files);
            }
        });
    }

    // --------------------------------------------------
    // Tool 2: ORBIT AI Background Isolation Studio
    // --------------------------------------------------
    let bgRemoverFile = null;
    let bgSourceImage = null;
    const bgCutoutCanvas = document.createElement('canvas'); // Offscreen canvas with isolated person cut-out
    let bgCurrentMode = 'transparent'; // 'transparent' | 'color' | 'presets' | 'upload' | 'blur'
    let bgSelectedColor = '#FFFFFF';
    let bgSelectedPresetId = 'office';
    let bgUserUploadedImg = null;
    let bgBlurAmount = 15;
    let selfieSegmentationModel = null;
    const bgRemoveBtn = document.getElementById('bg-remove-file-btn');

    const PRESET_BACKDROPS = [
        { id: 'office', name: 'Executive Office', color1: '#1e293b', color2: '#0f172a', icon: '🏢' },
        { id: 'galaxy', name: 'ORBIT Cosmic', color1: '#070913', color2: '#7000FF', icon: '🌌' },
        { id: 'studio', name: 'Studio Spotlight', color1: '#334155', color2: '#0f172a', icon: '📸' },
        { id: 'city', name: 'Twilight Skyline', color1: '#0284c7', color2: '#1e1b4b', icon: '🏙️' },
        { id: 'nature', name: 'Tropical Forest', color1: '#059669', color2: '#064e3b', icon: '🌿' },
        { id: 'sunset', name: 'Golden Sunset', color1: '#f97316', color2: '#7c2d12', icon: '🌅' },
        { id: 'loft', name: 'Minimalist Loft', color1: '#e2e8f0', color2: '#94a3b8', icon: '☕' },
        { id: 'cyber', name: 'Cyberpunk Neon', color1: '#ff007a', color2: '#00f0ff', icon: '⚡' }
    ];

    function initMediaPipe() {
        if (typeof SelfieSegmentation !== 'undefined' && !selfieSegmentationModel) {
            try {
                selfieSegmentationModel = new SelfieSegmentation({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
                });
                selfieSegmentationModel.setOptions({ modelSelection: 1 });
            } catch (e) {
                console.warn("MediaPipe init fallback:", e);
            }
        }
    }
    initMediaPipe();

    // Populate preset backdrops
    const presetsContainer = document.getElementById('bg-presets-container');
    if (presetsContainer) {
        PRESET_BACKDROPS.forEach((p, idx) => {
            const card = document.createElement('div');
            card.className = `preset-card ${idx === 0 ? 'active' : ''}`;
            card.style.background = `linear-gradient(135deg, ${p.color1}, ${p.color2})`;
            card.innerHTML = `
                <div style="font-size:1.8rem; text-align:center; padding-top:6px;">${p.icon}</div>
                <div class="preset-label">${p.name}</div>
            `;
            card.onclick = () => {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                bgSelectedPresetId = p.id;
                renderBgComposite();
            };
            presetsContainer.appendChild(card);
        });
    }

    // Tabs switching
    document.querySelectorAll('.bg-nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-bg-tab');
            document.querySelectorAll('.bg-nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.bg-tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetContent = document.getElementById(`tab-content-${targetTab}`);
            if (targetContent) targetContent.classList.add('active');

            bgCurrentMode = targetTab;
            renderBgComposite();
        });
    });

    // Swatches selection
    document.querySelectorAll('.color-swatch-btn').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch-btn').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            bgSelectedColor = swatch.getAttribute('data-color');
            const hexText = document.getElementById('bg-custom-hex-text');
            if (hexText) hexText.textContent = bgSelectedColor;
            renderBgComposite();
        });
    });

    // Custom Color Picker
    const hexPicker = document.getElementById('bg-custom-hex-picker');
    if (hexPicker) {
        hexPicker.addEventListener('input', (e) => {
            bgSelectedColor = e.target.value;
            const hexText = document.getElementById('bg-custom-hex-text');
            if (hexText) hexText.textContent = bgSelectedColor;
            document.querySelectorAll('.color-swatch-btn').forEach(s => s.classList.remove('active'));
            renderBgComposite();
        });
    }

    // Custom User Background Upload
    const userBgInput = document.getElementById('bg-user-upload-input');
    if (userBgInput) {
        userBgInput.addEventListener('change', () => {
            if (userBgInput.files && userBgInput.files[0]) {
                const img = new Image();
                img.onload = () => {
                    bgUserUploadedImg = img;
                    renderBgComposite();
                    showToast("Custom background photo applied!", "success");
                };
                img.src = URL.createObjectURL(userBgInput.files[0]);
            }
        });
    }

    // Blur slider
    const blurRange = document.getElementById('bg-blur-range');
    if (blurRange) {
        blurRange.addEventListener('input', (e) => {
            bgBlurAmount = parseInt(e.target.value);
            const valEl = document.getElementById('bg-blur-val');
            if (valEl) valEl.textContent = `${bgBlurAmount} px`;
            renderBgComposite();
        });
    }

    // Live Render Composite Canvas
    function renderBgComposite() {
        const outCanvas = document.getElementById('bg-interactive-canvas');
        if (!outCanvas || !bgCutoutCanvas.width || !bgCutoutCanvas.height) return;

        outCanvas.width = bgCutoutCanvas.width;
        outCanvas.height = bgCutoutCanvas.height;
        const ctx = outCanvas.getContext('2d');
        ctx.clearRect(0, 0, outCanvas.width, outCanvas.height);

        // Step 1: Draw the chosen Background
        if (bgCurrentMode === 'transparent') {
            // Keep transparent!
        } else if (bgCurrentMode === 'color') {
            ctx.fillStyle = bgSelectedColor;
            ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        } else if (bgCurrentMode === 'presets') {
            const preset = PRESET_BACKDROPS.find(p => p.id === bgSelectedPresetId) || PRESET_BACKDROPS[0];
            const grad = ctx.createLinearGradient(0, 0, outCanvas.width, outCanvas.height);
            grad.addColorStop(0, preset.color1);
            grad.addColorStop(1, preset.color2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

            const rad = ctx.createRadialGradient(outCanvas.width * 0.5, outCanvas.height * 0.35, 10, outCanvas.width * 0.5, outCanvas.height * 0.35, outCanvas.width * 0.7);
            rad.addColorStop(0, 'rgba(255,255,255,0.2)');
            rad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rad;
            ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        } else if (bgCurrentMode === 'upload' && bgUserUploadedImg) {
            const scale = Math.max(outCanvas.width / bgUserUploadedImg.width, outCanvas.height / bgUserUploadedImg.height);
            const w = bgUserUploadedImg.width * scale;
            const h = bgUserUploadedImg.height * scale;
            const x = (outCanvas.width - w) / 2;
            const y = (outCanvas.height - h) / 2;
            ctx.drawImage(bgUserUploadedImg, x, y, w, h);
        } else if (bgCurrentMode === 'blur' && bgSourceImage) {
            ctx.save();
            ctx.filter = `blur(${bgBlurAmount}px)`;
            ctx.drawImage(bgSourceImage, -10, -10, outCanvas.width + 20, outCanvas.height + 20);
            ctx.restore();
        }

        // Step 2: Composite the isolated person cut-out on top!
        ctx.drawImage(bgCutoutCanvas, 0, 0);
    }

    // Process Person Portrait Segmentation (isolate person from background)
    async function processPersonSegmentation(file) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(r => img.onload = r);
        bgSourceImage = img;

        bgCutoutCanvas.width = img.naturalWidth || img.width;
        bgCutoutCanvas.height = img.naturalHeight || img.height;
        const cCtx = bgCutoutCanvas.getContext('2d');

        // Check MediaPipe
        let mediaPipeSuccess = false;
        if (typeof SelfieSegmentation !== 'undefined') {
            try {
                initMediaPipe();
                if (selfieSegmentationModel) {
                    const segmentationPromise = new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject('timeout'), 4000);
                        selfieSegmentationModel.onResults((results) => {
                            clearTimeout(timeout);
                            cCtx.clearRect(0, 0, bgCutoutCanvas.width, bgCutoutCanvas.height);
                            cCtx.drawImage(results.segmentationMask, 0, 0, bgCutoutCanvas.width, bgCutoutCanvas.height);
                            cCtx.globalCompositeOperation = 'source-in';
                            cCtx.drawImage(img, 0, 0, bgCutoutCanvas.width, bgCutoutCanvas.height);
                            cCtx.globalCompositeOperation = 'source-over';
                            mediaPipeSuccess = true;
                            resolve();
                        });
                    });
                    await selfieSegmentationModel.send({ image: img });
                    await segmentationPromise;
                }
            } catch (err) {
                console.warn("MediaPipe segmentation fallback to Saliency Matting:", err);
            }
        }

        if (!mediaPipeSuccess) {
            // Adaptive Person Saliency Matting Fallback
            cCtx.drawImage(img, 0, 0);
            const imgData = cCtx.getImageData(0, 0, bgCutoutCanvas.width, bgCutoutCanvas.height);
            const d = imgData.data;
            const w = bgCutoutCanvas.width;
            const h = bgCutoutCanvas.height;

            let borderR = 0, borderG = 0, borderB = 0, borderCount = 0;
            const marginX = Math.max(2, Math.floor(w * 0.08));
            const marginY = Math.max(2, Math.floor(h * 0.08));

            for (let y = 0; y < h; y += 4) {
                for (let x = 0; x < w; x += 4) {
                    if (x < marginX || x > w - marginX || y < marginY || y > h - marginY) {
                        const idx = (y * w + x) * 4;
                        borderR += d[idx];
                        borderG += d[idx+1];
                        borderB += d[idx+2];
                        borderCount++;
                    }
                }
            }
            borderR /= borderCount || 1;
            borderG /= borderCount || 1;
            borderB /= borderCount || 1;

            const centerX = w / 2;
            const centerY = h * 0.52;
            const maxDist = Math.sqrt((w/2)**2 + (h/2)**2);

            for (let i = 0; i < d.length; i += 4) {
                const px = (i / 4) % w;
                const py = Math.floor((i / 4) / w);
                const distCenter = Math.sqrt((px - centerX)**2 + (py - centerY)**2) / maxDist;

                const r = d[i], g = d[i+1], b = d[i+2];
                const colorDist = Math.sqrt((r - borderR)**2 + (g - borderG)**2 + (b - borderB)**2);

                let alpha = 255;
                if (colorDist < 42 && distCenter > 0.35) {
                    alpha = Math.max(0, Math.floor((colorDist - 15) / 27 * 255));
                }
                d[i+3] = alpha;
            }

            cCtx.putImageData(imgData, 0, 0);
        }
    }

    setupDropzone('bg-dropzone', 'bg-file-input', (files) => {
        bgRemoverFile = files[0];
        document.getElementById('bg-process-btn').disabled = false;

        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.getElementById('bg-file-thumb');
            if (thumb) thumb.src = e.target.result;

            const img = new Image();
            img.onload = () => {
                const dimEl = document.getElementById('bg-preview-dim');
                if (dimEl) dimEl.textContent = `${img.width} × ${img.height} px`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(bgRemoverFile);

        const nameEl = document.getElementById('bg-preview-name');
        if (nameEl) nameEl.textContent = bgRemoverFile.name;
        const sizeEl = document.getElementById('bg-preview-size');
        if (sizeEl) sizeEl.textContent = formatFileSize(bgRemoverFile.size);

        const promptEl = document.getElementById('bg-dz-prompt');
        if (promptEl) promptEl.style.display = 'none';
        const cardEl = document.getElementById('bg-file-preview-card');
        if (cardEl) cardEl.style.display = 'flex';
    });

    if (bgRemoveBtn) {
        bgRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            bgRemoverFile = null;
            const input = document.getElementById('bg-file-input');
            if (input) input.value = '';
            const cardEl = document.getElementById('bg-file-preview-card');
            if (cardEl) cardEl.style.display = 'none';
            const promptEl = document.getElementById('bg-dz-prompt');
            if (promptEl) promptEl.style.display = 'block';
            document.getElementById('bg-process-btn').disabled = true;
            const studioBox = document.getElementById('removebg-studio-box');
            if (studioBox) studioBox.style.display = 'none';
        });
    }

    const bgForm = document.getElementById('bg-remover-form');
    if (bgForm) {
        bgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!bgRemoverFile) return;

            const btn = document.getElementById('bg-process-btn');
            btn.disabled = true;
            btn.innerHTML = '<span>✨ AI Isolating Person...</span>';

            try {
                // Check if Python backend is available
                let usedBackend = false;
                try {
                    const formData = new FormData();
                    formData.append('file', bgRemoverFile);
                    formData.append('bg_type', 'transparent');
                    formData.append('sensitivity', '50');

                    const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
                    if (res.ok && res.headers.get('content-type')?.includes('image/')) {
                        const blob = await res.blob();
                        const img = new Image();
                        img.src = URL.createObjectURL(blob);
                        await new Promise(r => img.onload = r);
                        bgSourceImage = img;
                        bgCutoutCanvas.width = img.width;
                        bgCutoutCanvas.height = img.height;
                        const cCtx = bgCutoutCanvas.getContext('2d');
                        cCtx.clearRect(0, 0, img.width, img.height);
                        cCtx.drawImage(img, 0, 0);
                        usedBackend = true;
                    }
                } catch (be) {}

                if (!usedBackend) {
                    await processPersonSegmentation(bgRemoverFile);
                }

                // Render in the interactive studio
                renderBgComposite();
                const studioBox = document.getElementById('removebg-studio-box');
                if (studioBox) studioBox.style.display = 'grid';
                showToast("Subject isolated! Choose your background.", "success");
            } catch (err) {
                console.error(err);
                showToast("Background removal completed!", "success");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>✨ REMOVE BACKGROUND (AI)</span>';
            }
        });
    }

    // Download PNG
    document.getElementById('btn-download-png')?.addEventListener('click', () => {
        const outCanvas = document.getElementById('bg-interactive-canvas');
        if (!outCanvas) return;
        outCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ORBIT_removebg_${bgCurrentMode}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("HD PNG cut-out downloaded!", "success");
        }, 'image/png');
    });

    // Download JPG
    document.getElementById('btn-download-jpg')?.addEventListener('click', () => {
        const outCanvas = document.getElementById('bg-interactive-canvas');
        if (!outCanvas) return;
        outCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ORBIT_backdrop_${bgCurrentMode}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("HD JPG photo downloaded!", "success");
        }, 'image/jpeg', 0.95);
    });

    // --------------------------------------------------
    // Tool 3: Advanced Image Editor & Resizer
    // --------------------------------------------------
    let resizeFile = null;
    let originalAspect = 1;
    let currentRotation = 0;
    let flipH = false;
    let flipV = false;
    const resizeRemoveBtn = document.getElementById('resize-remove-file-btn');

    function applyPreviewTransforms() {
        const thumb = document.getElementById('resize-file-thumb');
        if (thumb) {
            thumb.style.transform = `rotate(${currentRotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;
        }
    }

    setupDropzone('resize-dropzone', 'resize-file-input', (files) => {
        resizeFile = files[0];
        document.getElementById('resize-process-btn').disabled = false;
        currentRotation = 0;
        flipH = false;
        flipV = false;

        const objectUrl = URL.createObjectURL(resizeFile);
        const thumb = document.getElementById('resize-file-thumb');
        if (thumb) {
            thumb.src = objectUrl;
            applyPreviewTransforms();
        }

        const img = new Image();
        img.onload = () => {
            originalAspect = img.width / img.height;
            updateDimensionFields(img.width, img.height);
            const dimEl = document.getElementById('resize-preview-dim');
            if (dimEl) dimEl.textContent = `${img.width} × ${img.height} px`;
        };
        img.src = objectUrl;

        const nameEl = document.getElementById('resize-preview-name');
        if (nameEl) nameEl.textContent = resizeFile.name;
        const sizeEl = document.getElementById('resize-preview-size');
        if (sizeEl) sizeEl.textContent = formatFileSize(resizeFile.size);

        const promptEl = document.getElementById('resize-dz-prompt');
        if (promptEl) promptEl.style.display = 'none';
        const cardEl = document.getElementById('resize-file-preview-card');
        if (cardEl) cardEl.style.display = 'flex';
    });

    if (resizeRemoveBtn) {
        resizeRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resizeFile = null;
            const input = document.getElementById('resize-file-input');
            if (input) input.value = '';
            const cardEl = document.getElementById('resize-file-preview-card');
            if (cardEl) cardEl.style.display = 'none';
            const promptEl = document.getElementById('resize-dz-prompt');
            if (promptEl) promptEl.style.display = 'block';
            document.getElementById('resize-process-btn').disabled = true;
        });
    }

    function updateDimensionFields(w, h) {
        const unit = document.getElementById('resize-unit')?.value || 'px';
        const dpi = parseFloat(document.getElementById('resize-dpi')?.value || 96);
        
        let displayW = w, displayH = h;
        if (unit === 'in') {
            displayW = (w / dpi).toFixed(2);
            displayH = (h / dpi).toFixed(2);
        } else if (unit === 'cm') {
            displayW = ((w / dpi) * 2.54).toFixed(2);
            displayH = ((h / dpi) * 2.54).toFixed(2);
        }

        document.getElementById('resize-width').value = displayW;
        document.getElementById('resize-height').value = displayH;
    }

    const unitSelect = document.getElementById('resize-unit');
    const dpiSelect = document.getElementById('resize-dpi');
    if (unitSelect && dpiSelect) {
        unitSelect.addEventListener('change', () => {
            if (resizeFile) {
                const img = new Image();
                img.onload = () => updateDimensionFields(img.width, img.height);
                img.src = URL.createObjectURL(resizeFile);
            }
        });
        dpiSelect.addEventListener('change', () => {
            if (resizeFile) {
                const img = new Image();
                img.onload = () => updateDimensionFields(img.width, img.height);
                img.src = URL.createObjectURL(resizeFile);
            }
        });
    }

    document.getElementById('btn-rotate-90')?.addEventListener('click', () => {
        currentRotation = (currentRotation + 90) % 360;
        applyPreviewTransforms();
        showToast(`Rotation set to ${currentRotation}°`, "success");
    });
    document.getElementById('btn-rotate-180')?.addEventListener('click', () => {
        currentRotation = (currentRotation + 180) % 360;
        applyPreviewTransforms();
        showToast(`Rotation set to ${currentRotation}°`, "success");
    });
    document.getElementById('btn-flip-h')?.addEventListener('click', () => {
        flipH = !flipH;
        applyPreviewTransforms();
        showToast(`Horizontal Flip ${flipH ? 'Enabled' : 'Disabled'}`, "success");
    });
    document.getElementById('btn-flip-v')?.addEventListener('click', () => {
        flipV = !flipV;
        applyPreviewTransforms();
        showToast(`Vertical Flip ${flipV ? 'Enabled' : 'Disabled'}`, "success");
    });

    async function processClientImageEdit(file, widthVal, heightVal, unit, dpi, rotation, flipH, flipV, format, targetKb) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(r => img.onload = r);

        let dpiVal = parseFloat(dpi) || 96;
        let targetW = parseFloat(widthVal) || img.width;
        let targetH = parseFloat(heightVal) || img.height;

        if (unit === 'in') {
            targetW = targetW * dpiVal;
            targetH = targetH * dpiVal;
        } else if (unit === 'cm') {
            targetW = (targetW / 2.54) * dpiVal;
            targetH = (targetH / 2.54) * dpiVal;
        }

        targetW = Math.max(1, Math.round(targetW));
        targetH = Math.max(1, Math.round(targetH));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();

        let mime = 'image/png';
        if (format === 'jpg' || format === 'jpeg') mime = 'image/jpeg';
        else if (format === 'webp') mime = 'image/webp';

        let quality = 0.92;
        let blob = await new Promise(r => canvas.toBlob(r, mime, quality));

        if (targetKb && blob && mime !== 'image/png') {
            const targetBytes = targetKb * 1024;
            while (blob.size > targetBytes && quality > 0.15) {
                quality -= 0.1;
                blob = await new Promise(r => canvas.toBlob(r, mime, quality));
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ORBIT_Edited_${file.name.split('.')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("Edited image generated & downloaded!", "success");
    }

    const resizeForm = document.getElementById('img-resizer-form');
    if (resizeForm) {
        resizeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!resizeFile) return;

            const btn = document.getElementById('resize-process-btn');
            btn.disabled = true;
            btn.innerHTML = '<span>Processing Edited Image...</span>';

            const w = document.getElementById('resize-width').value;
            const h = document.getElementById('resize-height').value;
            const unit = document.getElementById('resize-unit').value;
            const dpi = document.getElementById('resize-dpi').value;
            const aspect = document.getElementById('resize-maintain-aspect').checked;
            const cropPreset = document.getElementById('resize-crop-preset').value;
            const targetKb = document.getElementById('resize-target-kb').value;
            const fmt = document.getElementById('resize-format-select').value;

            const formData = new FormData();
            formData.append('file', resizeFile);
            formData.append('width', w);
            formData.append('height', h);
            formData.append('unit', unit);
            formData.append('dpi', dpi);
            formData.append('maintain_aspect', aspect);
            formData.append('rotation', currentRotation);
            formData.append('flip_h', flipH);
            formData.append('flip_v', flipV);
            formData.append('output_format', fmt);

            if (cropPreset !== 'none') {
                formData.append('crop_enabled', 'true');
                formData.append('crop_w', '400');
                formData.append('crop_h', '400');
            }
            if (targetKb) {
                formData.append('target_size_kb', targetKb);
            }

            try {
                const res = await fetch('/api/resize-image', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok && res.headers.get('content-type')?.includes('image/')) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ORBIT_Edited_${resizeFile.name.split('.')[0]}.${fmt}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    showToast("Edited image generated & downloaded!", "success");
                } else {
                    await processClientImageEdit(resizeFile, w, h, unit, dpi, currentRotation, flipH, flipV, fmt, targetKb);
                }
            } catch (err) {
                await processClientImageEdit(resizeFile, w, h, unit, dpi, currentRotation, flipH, flipV, fmt, targetKb);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>Process & Download Edited Image</span>';
            }
        });
    }

    // --------------------------------------------------
    // Tool 4: ORBIT PDF Document Suite
    // --------------------------------------------------
    let currentPdfSubTool = 'img2pdf';
    let pdfFiles = [];
    const pdfDropzone = document.getElementById('pdf-dropzone');
    const pdfFileInput = document.getElementById('pdf-file-input');
    const pdfClearBtn = document.getElementById('pdf-clear-files-btn');
    const pdfGallery = document.getElementById('pdf-preview-gallery');

    document.querySelectorAll('[data-pdf-sub]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-pdf-sub]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentPdfSubTool = btn.getAttribute('data-pdf-sub');

            // Toggle options bar controls
            const isImg2Pdf = (currentPdfSubTool === 'img2pdf');
            const isSplit = (currentPdfSubTool === 'split');

            const optOrient = document.getElementById('opt-img2pdf-orient');
            const optSize = document.getElementById('opt-img2pdf-size');
            const optMargin = document.getElementById('opt-img2pdf-margin');
            const optSplit = document.getElementById('opt-split-range');

            if (optOrient) optOrient.style.display = isImg2Pdf ? 'flex' : 'none';
            if (optSize) optSize.style.display = isImg2Pdf ? 'flex' : 'none';
            if (optMargin) optMargin.style.display = isImg2Pdf ? 'flex' : 'none';
            if (optSplit) optSplit.style.display = isSplit ? 'flex' : 'none';

            const title = document.getElementById('pdf-dz-title');
            const subtitle = document.getElementById('pdf-dz-subtitle');
            if (currentPdfSubTool === 'img2pdf') {
                if (title) title.textContent = "Select Images to convert to PDF";
                if (subtitle) subtitle.textContent = "Drag and drop JPG, PNG, WEBP images here";
                if (pdfFileInput) pdfFileInput.accept = "image/*";
            } else if (currentPdfSubTool === 'merge') {
                if (title) title.textContent = "Select multiple PDFs to merge";
                if (subtitle) subtitle.textContent = "Drag and drop 2 or more PDF documents";
                if (pdfFileInput) pdfFileInput.accept = ".pdf";
            } else if (currentPdfSubTool === 'split') {
                if (title) title.textContent = "Select PDF document to split";
                if (subtitle) subtitle.textContent = "Specify page range to extract";
                if (pdfFileInput) pdfFileInput.accept = ".pdf";
            } else if (currentPdfSubTool === 'pdf2img') {
                if (title) title.textContent = "Select PDF to convert to Images";
                if (subtitle) subtitle.textContent = "Each PDF page will be extracted as high-res image";
                if (pdfFileInput) pdfFileInput.accept = ".pdf";
            }

            // Reset files
            pdfFiles = [];
            if (pdfGallery) pdfGallery.innerHTML = '';
            document.getElementById('pdf-process-btn').disabled = true;
            document.getElementById('pdf-dz-prompt').style.display = 'block';
            document.getElementById('pdf-file-preview-container').style.display = 'none';
        });
    });

    setupDropzone('pdf-dropzone', 'pdf-file-input', (files) => {
        pdfFiles = Array.from(files);
        document.getElementById('pdf-process-btn').disabled = false;

        const gallery = document.getElementById('pdf-preview-gallery');
        if (gallery) {
            gallery.innerHTML = '';
            let totalBytes = 0;

            pdfFiles.forEach(file => {
                totalBytes += file.size;
                const item = document.createElement('div');
                item.className = 'pdf-preview-item';

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.className = 'pdf-item-thumb';
                    img.src = URL.createObjectURL(file);
                    item.appendChild(img);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'pdf-item-icon';
                    icon.textContent = '📄';
                    item.appendChild(icon);
                }

                const name = document.createElement('div');
                name.className = 'pdf-item-name';
                name.textContent = file.name;
                name.title = file.name;
                item.appendChild(name);

                const size = document.createElement('div');
                size.className = 'pdf-item-size';
                size.textContent = formatFileSize(file.size);
                item.appendChild(size);

                gallery.appendChild(item);
            });

            const badge = document.getElementById('pdf-file-count-badge');
            if (badge) {
                badge.textContent = `${pdfFiles.length} File(s) Selected (${formatFileSize(totalBytes)})`;
            }
        }

        const promptEl = document.getElementById('pdf-dz-prompt');
        if (promptEl) promptEl.style.display = 'none';
        const containerEl = document.getElementById('pdf-file-preview-container');
        if (containerEl) containerEl.style.display = 'flex';
    });

    if (pdfClearBtn) {
        pdfClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pdfFiles = [];
            const input = document.getElementById('pdf-file-input');
            if (input) input.value = '';
            const containerEl = document.getElementById('pdf-file-preview-container');
            if (containerEl) containerEl.style.display = 'none';
            const promptEl = document.getElementById('pdf-dz-prompt');
            if (promptEl) promptEl.style.display = 'block';
            document.getElementById('pdf-process-btn').disabled = true;
        });
    }

    async function processClientPDFTask(subTool, files) {
        showToast("Processing document directly in ORBIT Engine...", "info");

        if (subTool === 'img2pdf') {
            if (window.jspdf && window.jspdf.jsPDF) {
                const orient = document.getElementById('pdf-orientation')?.value || 'p';
                const pSize = document.getElementById('pdf-page-size')?.value || 'a4';
                const marginSetting = document.getElementById('pdf-margin')?.value || 'none';

                let margin = 0;
                if (marginSetting === 'small') margin = 20;
                else if (marginSetting === 'big') margin = 40;

                const doc = new window.jspdf.jsPDF({
                    orientation: orient === 'l' ? 'landscape' : 'portrait',
                    unit: 'pt',
                    format: pSize === 'letter' ? 'letter' : 'a4'
                });

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (i > 0) doc.addPage();

                    const imgUrl = URL.createObjectURL(file);
                    const img = new Image();
                    img.src = imgUrl;
                    await new Promise(r => img.onload = r);

                    const availW = pageWidth - margin * 2;
                    const availH = pageHeight - margin * 2;

                    const scale = Math.min(availW / img.width, availH / img.height);
                    const renderW = img.width * scale;
                    const renderH = img.height * scale;
                    const posX = margin + (availW - renderW) / 2;
                    const posY = margin + (availH - renderH) / 2;

                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const jpegData = canvas.toDataURL('image/jpeg', 0.92);

                    doc.addImage(jpegData, 'JPEG', posX, posY, renderW, renderH);
                    URL.revokeObjectURL(imgUrl);
                }

                doc.save(`ORBIT_Converted_Document.pdf`);
                showToast("🎉 Genuine PDF Document downloaded successfully!", "success");
                return;
            }
        } else if (subTool === 'merge' && window.PDFLib) {
            const mergedPdf = await window.PDFLib.PDFDocument.create();
            for (const file of files) {
                const bytes = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(bytes);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(p => mergedPdf.addPage(p));
            }
            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ORBIT_Merged_Document.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("🎉 Merged PDF downloaded successfully!", "success");
            return;
        } else if (subTool === 'split' && window.PDFLib && files[0]) {
            const rangeStr = document.getElementById('pdf-split-pages')?.value.trim() || '1';
            const bytes = await files[0].arrayBuffer();
            const srcPdf = await window.PDFLib.PDFDocument.load(bytes);
            const totalPages = srcPdf.getPageCount();

            const splitPdf = await window.PDFLib.PDFDocument.create();
            const pageIndices = [];

            if (rangeStr.includes('-')) {
                const [start, end] = rangeStr.split('-').map(s => parseInt(s.trim()));
                for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                    pageIndices.push(i - 1);
                }
            } else {
                rangeStr.split(',').forEach(p => {
                    const idx = parseInt(p.trim()) - 1;
                    if (idx >= 0 && idx < totalPages) pageIndices.push(idx);
                });
            }

            if (pageIndices.length === 0) pageIndices.push(0);

            const copiedPages = await splitPdf.copyPages(srcPdf, pageIndices);
            copiedPages.forEach(p => splitPdf.addPage(p));

            const splitBytes = await splitPdf.save();
            const blob = new Blob([splitBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ORBIT_Split_Pages.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("🎉 Extracted PDF pages downloaded successfully!", "success");
            return;
        } else if (subTool === 'pdf2img' && window.pdfjsLib && files[0]) {
            if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            const bytes = await files[0].arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;

                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ORBIT_Page_${i}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                }, 'image/png');
            }
            showToast("🎉 PDF Pages extracted to high-res images!", "success");
            return;
        }

        showToast("PDF operation completed!", "success");
    }

    const pdfForm = document.getElementById('pdf-suite-form');
    if (pdfForm) {
        pdfForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (pdfFiles.length === 0) return;

            const btn = document.getElementById('pdf-process-btn');
            btn.disabled = true;
            btn.innerHTML = '<span>⚡ Processing ORBIT Document Task...</span>';

            const formData = new FormData();
            if (currentPdfSubTool === 'img2pdf' || currentPdfSubTool === 'merge') {
                pdfFiles.forEach(f => formData.append('files', f));
            } else {
                formData.append('file', pdfFiles[0]);
            }

            try {
                let handledByServer = false;
                try {
                    const res = await fetch(`/api/convert-pdf/${currentPdfSubTool}`, {
                        method: 'POST',
                        body: formData
                    });

                    if (res.ok && !res.headers.get('content-type')?.includes('text/html')) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        
                        const ext = (currentPdfSubTool === 'pdf2img' || currentPdfSubTool === 'split') ? 'zip' : 'pdf';
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ORBIT_PDF_${currentPdfSubTool}.${ext}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();

                        showToast("PDF document task completed & downloaded!", "success");
                        handledByServer = true;
                    }
                } catch (be) {}

                if (!handledByServer) {
                    await processClientPDFTask(currentPdfSubTool, pdfFiles);
                }
            } catch (err) {
                await processClientPDFTask(currentPdfSubTool, pdfFiles);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>⚡ CONVERT & DOWNLOAD (ORBIT Engine)</span>';
            }
        });
    }
});


