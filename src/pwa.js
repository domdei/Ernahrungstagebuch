import { ui } from './state.js';

let deferredPrompt = null;

export function bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        if (ui.installButton) {
            ui.installButton.classList.remove('hidden');
        }
    });

    if (ui.installButton) {
        ui.installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                return;
            }

            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            ui.installButton.classList.add('hidden');
        });
    }
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (!installingWorker) {
                    return;
                }

                installingWorker.addEventListener('statechange', () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.info('Service Worker-Update installiert und aktiv.');
                    }
                });
            });
        }).catch((error) => {
            console.error('Service Worker konnte nicht registriert werden:', error);
        });
    });
}
