/**
 * TikSave — TikTok Video Downloader App Logic
 */
(function () {
    'use strict';

    // DOM Elements
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewSection = document.getElementById('previewSection');
    const errorToast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    const logoLink = document.getElementById('logoLink');
    const downloadAnother = document.getElementById('downloadAnother');

    // Preview elements
    const previewThumb = document.getElementById('previewThumb');
    const previewDuration = document.getElementById('previewDuration');
    const previewQuality = document.getElementById('previewQuality');
    const previewTitle = document.getElementById('previewTitle');
    const authorAvatar = document.getElementById('authorAvatar');
    const authorName = document.getElementById('authorName');
    const authorUsername = document.getElementById('authorUsername');
    const statLikes = document.getElementById('statLikes');
    const statComments = document.getElementById('statComments');
    const statShares = document.getElementById('statShares');
    const statPlays = document.getElementById('statPlays');
    const dlHD = document.getElementById('dlHD');
    const dlSD = document.getElementById('dlSD');

    let currentVideoData = null;
    let isDownloading = false;

    // ---- Utility Functions ----

    function resetToHome() {
        urlInput.value = '';
        previewSection.classList.remove('visible');
        downloadAnother.classList.remove('visible');
        currentVideoData = null;
        urlInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    }

    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorToast.classList.add('show');
        setTimeout(() => {
            errorToast.classList.remove('show');
        }, 4000);
    }

    function setLoading(loading) {
        if (loading) {
            downloadBtn.classList.add('loading');
            downloadBtn.disabled = true;
        } else {
            downloadBtn.classList.remove('loading');
            downloadBtn.disabled = false;
        }
    }

    // ---- Core Functions ----

    async function fetchVideoInfo(url) {
        setLoading(true);
        previewSection.classList.remove('visible');

        try {
            const response = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch video info');
            }

            currentVideoData = result.data;
            renderPreview(result.data);
        } catch (err) {
            showError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function renderPreview(data) {
        // Thumbnail
        previewThumb.src = data.thumbnail;
        previewThumb.alt = data.title;

        // Duration
        previewDuration.textContent = formatDuration(data.duration);

        // Quality badge
        previewQuality.textContent = data.isHD ? 'HD' : 'SD';
        previewQuality.style.background = data.isHD ? 'var(--accent-primary)' : 'var(--text-muted)';

        // Author
        if (data.author.avatar) {
            authorAvatar.src = data.author.avatar;
            authorAvatar.style.display = 'block';
        } else {
            authorAvatar.style.display = 'none';
        }
        authorName.textContent = data.author.name;
        authorUsername.textContent = data.author.username ? `@${data.author.username}` : '';

        // Title
        previewTitle.textContent = data.title || 'TikTok Video';

        // Stats
        statLikes.textContent = formatNumber(data.stats.likes);
        statComments.textContent = formatNumber(data.stats.comments);
        statShares.textContent = formatNumber(data.stats.shares);
        statPlays.textContent = formatNumber(data.stats.plays);

        // Download buttons
        if (data.hdUrl) {
            dlHD.style.display = 'flex';
        } else {
            dlHD.style.display = 'none';
        }

        if (data.sdUrl && data.sdUrl !== data.hdUrl) {
            dlSD.style.display = 'flex';
        } else {
            dlSD.style.display = 'none';
        }

        // Show card with animation
        previewSection.classList.add('visible');

        // Scroll to preview
        setTimeout(() => {
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    function getFormattedDateTime() {
        const now = new Date();
        const y = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `${y}${mo}${d}_${h}${mi}${s}`;
    }

    function triggerDownload(videoUrl, quality) {
        if (!videoUrl) {
            showError('Download URL is not available.');
            return;
        }

        const username = currentVideoData?.author?.username || 'unknown';
        const datetime = getFormattedDateTime();
        const filename = `${username}_${datetime}_tiksave`;

        isDownloading = true;

        // Use the proxy endpoint
        const downloadUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;

        // Navigate to the download URL — the server sends Content-Disposition: attachment,
        // so the browser will download the file instead of navigating away.
        // This works reliably on both desktop and mobile browsers.
        window.location.href = downloadUrl;

        // Show "Download another video" button after a brief delay
        setTimeout(() => {
            isDownloading = false;
            downloadAnother.classList.add('visible');
        }, 1500);
    }

    // ---- Event Listeners ----

    downloadBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please paste a TikTok video link.');
            urlInput.focus();
            return;
        }
        fetchVideoInfo(url);
    });

    // Enter key support
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            downloadBtn.click();
        }
    });

    // HD download
    dlHD.addEventListener('click', () => {
        if (currentVideoData) {
            triggerDownload(currentVideoData.hdUrl, 'HD');
        }
    });

    // SD download
    dlSD.addEventListener('click', () => {
        if (currentVideoData) {
            triggerDownload(currentVideoData.sdUrl, 'SD');
        }
    });

    // Logo click — return to home (only when not downloading)
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isDownloading) {
            resetToHome();
        }
    });

    // Download another video
    downloadAnother.addEventListener('click', () => {
        resetToHome();
    });

    // Auto-paste on focus (if clipboard API is available)
    urlInput.addEventListener('focus', async () => {
        if (!urlInput.value && navigator.clipboard && navigator.clipboard.readText) {
            try {
                const text = await navigator.clipboard.readText();
                if (text && /tiktok\.com/i.test(text)) {
                    urlInput.value = text;
                    urlInput.select();
                }
            } catch {
                // Clipboard permission denied — ignore silently
            }
        }
    });
})();
