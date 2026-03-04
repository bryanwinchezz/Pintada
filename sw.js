// O navegador exige isso para reconhecer o site como um App instalável.
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
    // Apenas deixa a navegação passar normalmente
});