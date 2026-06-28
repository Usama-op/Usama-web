// Theme Management (persisted across pages via localStorage)
function initTheme() {
    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (err) {
        savedTheme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);

    try {
        localStorage.setItem('theme', newTheme);
    } catch (err) {
        // Storage unavailable (e.g. private browsing) - theme just won't persist
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme (must happen before paint-sensitive content shows)
    initTheme();

    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('copy', function(e) { e.preventDefault(); });
    document.addEventListener('cut', function(e) { e.preventDefault(); });
    document.addEventListener('selectstart', function(e) { e.preventDefault(); });

    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Parallax effect for the hero card (only present on the Home page)
    const heroCard = document.querySelector('.hero-card');
    if (heroCard) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            heroCard.style.transform = `translateY(${rate}px)`;
        }, { passive: true });
    }

    document.addEventListener('keydown', function(e) {
        const key = (e.key || '').toLowerCase();
        const isModifier = e.ctrlKey || e.metaKey;
        if (isModifier && (key === 'c' || key === 'u' || key === 's')) {
            e.preventDefault();
        }
    });
});
