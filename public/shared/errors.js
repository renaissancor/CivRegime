/**
 * User-facing error toast notifications.
 * Auto-dismisses after 5 seconds.
 */
function showError(msg) {
  let container = document.getElementById('error-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'error-toast-container';
    Object.assign(container.style, {
      position: 'fixed', top: '16px', right: '16px', zIndex: '9999',
      display: 'flex', flexDirection: 'column', gap: '8px',
    });
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: '#742a2a', color: '#feb2b2', padding: '12px 16px',
    borderRadius: '6px', fontSize: '13px', border: '1px solid #9b2c2c',
    maxWidth: '360px', boxShadow: '0 4px 12px rgba(0,0,0,.4)',
    fontFamily: 'system-ui, sans-serif',
  });
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
