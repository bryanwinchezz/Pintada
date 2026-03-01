// ==========================================
// js/theme.js - MODO ESCURO E CLARO
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    localStorage.setItem('pintada_theme', theme);
}

const savedTheme = localStorage.getItem('pintada_theme');
if (savedTheme) setTheme(savedTheme);
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}