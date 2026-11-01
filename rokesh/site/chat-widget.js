// Embeddable WhatsApp chat button. Usage:
// <script src="https://YOUR-SITE/chat-widget.js" data-phone="919876543210" data-text="Hi!" data-label="Chat with us" async></script>
(function () {
  var s = document.currentScript; if (!s) return;
  var phone = (s.getAttribute('data-phone') || '').replace(/\D/g, '');
  if (!phone) return;
  var a = document.createElement('a');
  a.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(s.getAttribute('data-text') || '');
  a.target = '_blank'; a.rel = 'noopener';
  a.textContent = s.getAttribute('data-label') || 'Chat on WhatsApp';
  a.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#25d366;color:#fff;font:600 14px system-ui,sans-serif;padding:12px 18px;border-radius:99px;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25)';
  document.body.appendChild(a);
})();
