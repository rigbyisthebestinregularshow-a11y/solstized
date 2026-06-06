let uvReadyPromise = null;

function registerUltraviolet() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Ultraviolet requires service worker support.');
    return Promise.reject(new Error('Service workers are not supported.'));
  }

  if (uvReadyPromise) return uvReadyPromise;

  console.log('[UV] Attempting to register service worker at /uv/sw-init.js with scope /');
  console.log('[UV] Current origin:', location.origin);

  // Check if SW file is accessible first
  uvReadyPromise = fetch('/uv/sw-init.js', { method: 'HEAD' })
    .then(res => {
      if (!res.ok) {
        throw new Error('SW file not found: ' + res.status);
      }
      console.log('[UV] SW file is accessible');
      return true;
    })
    .catch(err => {
      console.warn('[UV] Could not verify SW file accessibility:', err);
      return true; // Continue anyway
    })
    .then(() => {
      return navigator.serviceWorker.register('/uv/sw-init.js', { scope: '/' });
    })
    .then((reg) => {
      console.log('[UV] Service worker registered successfully');
      console.log('[UV] Registration scope:', reg.scope);
      return navigator.serviceWorker.ready;
    })
    .then((registration) => {
      console.log('[UV] Service worker is ready');
      console.log('[UV] Active worker:', registration.active ? 'YES' : 'NO');
      console.log('[UV] Controller:', navigator.serviceWorker.controller ? 'YES' : 'NO');
      return registration;
    })
    .catch((error) => {
      console.error('[UV] Registration error:', error.message);
      // Try to get any existing registrations
      return navigator.serviceWorker.getRegistrations()
        .then(regs => {
          if (regs.length > 0) {
            console.log('[UV] Using existing registration');
            return regs[0];
          }
          console.warn('[UV] No service worker available');
          return null;
        })
        .catch(() => null);
    });

  return uvReadyPromise;
}

function openUltravioletUrl(target) {
  let url;
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    if (!target.includes('.')) target = target + '.com';
    target = 'https://' + target;
  }

  try {
    url = new URL(target);
  } catch (error) {
    console.error('[UV] Invalid URL:', target);
    throw new Error('Invalid URL; use a full address like https://example.com');
  }

  console.log('[UV] Opening URL:', url.href);

  return registerUltraviolet().then(async (reg) => {
    console.log('[UV] Registration ready:', reg ? 'YES' : 'NO');
    console.log('[UV] Current controller:', navigator.serviceWorker.controller ? 'ACTIVE' : 'NONE');

    // If no controller yet, wait for it (max 5 seconds)
    if (!navigator.serviceWorker.controller) {
      console.log('[UV] Waiting for service worker to control this page...');
      await new Promise((resolve) => {
        let done = false;
        const timeout = setTimeout(() => {
          if (!done) {
            done = true;
            console.warn('[UV] Timeout waiting for controller');
            resolve();
          }
        }, 5000);
        
        const onController = () => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('controllerchange', onController);
          console.log('[UV] Service worker is now controlling this page');
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onController);
      });
    } else {
      console.log('[UV] Service worker is already controlling this page');
    }

    // Navigate to the proxy URL - the service worker will intercept this
    const proxyUrl = '/service/' + encodeURIComponent(url.href);
    console.log('[UV] Navigating to proxy URL:', proxyUrl);
    window.location.href = proxyUrl;
  }).catch(err => {
    console.error('[UV] Error opening URL:', err);
    throw err;
  });
}

window.ultraviolet = {
  register: registerUltraviolet,
  openUrl: openUltravioletUrl,
};

if ('serviceWorker' in navigator) {
  registerUltraviolet().catch(() => {});
}
