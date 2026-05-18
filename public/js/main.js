// ============================================================
// EventKraft — Client-side JavaScript
// ============================================================

(function() {
    function applyTheme(theme) {
        var nextTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem('ek-theme', nextTheme);

        document.querySelectorAll('[data-theme-toggle]').forEach(function(button) {
            var icon = button.querySelector('[data-theme-icon]');
            var label = button.querySelector('[data-theme-label]');
            button.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
            if (icon) icon.className = nextTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
            if (label) label.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
        });
    }

    window.EventKraftTheme = { apply: applyTheme };

    // Initialize global socket
    if (typeof io !== 'undefined') {
        window.socket = io();
    }

    document.addEventListener('DOMContentLoaded', () => {
        var initialTheme = document.documentElement.dataset.theme || localStorage.getItem('ek-theme') || 'light';
        applyTheme(initialTheme);
        document.querySelectorAll('[data-theme-toggle]').forEach(function(button) {
            button.addEventListener('click', function() {
                var currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
                applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
            });
        });

        // Auto-dismiss flash alerts after 5 seconds
        const alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(alert => {
            setTimeout(() => {
                if (typeof bootstrap === 'undefined') return;
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                bsAlert.close();
            }, 5000);
        });

        // Animate elements on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.ek-card, .ek-how-card, .stat-card').forEach(el => {
            el.style.opacity = '0';
            observer.observe(el);
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    });
})();
