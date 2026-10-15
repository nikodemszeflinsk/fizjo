/*
 * Adres publicznego API Studio Widok (Cloudflare Worker). Uzupełniany po wdrożeniu, np.
 * window.STUDIO_API = 'https://studio-widok-api.TWOJA-NAZWA.workers.dev';
 * Pusty adres oznacza, że funkcje chmurowe (formularz startowy, podpis SMS) są wyłączone.
 * Na localhost można podać adres w adresie strony: ?api=http://127.0.0.1:8788
 */
window.STUDIO_API = window.STUDIO_API || 'https://studio-widok-api.nikodemszeflinsk.workers.dev';
