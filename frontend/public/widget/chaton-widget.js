/**
 * ChatOn Livechat Widget
 * Vanilla JS + inline CSS, no dependencies
 * Usage: <script src="https://your-domain.com/widget/chaton-widget.js" data-tenant="your-slug"></script>
 */
(function () {
  'use strict';

  // Read config from script tag
  var script = document.currentScript || document.querySelector('script[data-tenant]');
  if (!script) return;

  var TENANT_SLUG = script.getAttribute('data-tenant');
  if (!TENANT_SLUG) return;

  var API_BASE = script.getAttribute('data-api') || script.src.replace(/\/widget\/chaton-widget\.js.*/, '');

  // State
  var isOpen = false;
  var messages = [];
  var config = {};
  var shopName = 'Shop';
  var online = false;
  var visitorId = getVisitorId();
  var visitorName = localStorage.getItem('chaton_name') || '';
  var visitorEmail = localStorage.getItem('chaton_email') || '';
  var registered = !!(visitorName && visitorEmail);
  var unreadCount = 0;
  var pollInterval = null;
  var lastMsgCount = 0;

  function getVisitorId() {
    var id = localStorage.getItem('chaton_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
      localStorage.setItem('chaton_visitor_id', id);
    }
    return id;
  }

  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.chaton-bubble{position:fixed;z-index:99999;width:60px;height:60px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s}',
    '.chaton-bubble:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(0,0,0,.25)}',
    '.chaton-bubble svg{width:28px;height:28px;fill:#fff}',
    '.chaton-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;border-radius:50%;min-width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:2px solid #fff}',
    '.chaton-frame{position:fixed;z-index:99999;width:360px;height:520px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.2);overflow:hidden;display:flex;flex-direction:column;background:#fff;animation:chaton-slide-up .3s ease}',
    '@keyframes chaton-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
    '.chaton-header{padding:14px 16px;color:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '.chaton-header-name{font-size:15px;font-weight:600}',
    '.chaton-header-status{font-size:11px;opacity:.85}',
    '.chaton-close{margin-left:auto;cursor:pointer;background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px}',
    '.chaton-close:hover{background:rgba(255,255,255,.35)}',
    '.chaton-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}',
    '.chaton-msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.5;word-wrap:break-word}',
    '.chaton-msg-customer{align-self:flex-end;background:#3b82f6;color:#fff;border-bottom-right-radius:4px}',
    '.chaton-msg-agent,.chaton-msg-ai{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}',
    '.chaton-msg-system{align-self:center;background:#f1f5f9;color:#64748b;font-size:11px;border-radius:20px;padding:6px 12px}',
    '.chaton-input-area{padding:10px 12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;background:#fff;flex-shrink:0}',
    '.chaton-input{flex:1;border:1px solid #e2e8f0;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;resize:none;max-height:80px;font-family:inherit}',
    '.chaton-input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.15)}',
    '.chaton-send{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}',
    '.chaton-send:disabled{opacity:.4;cursor:not-allowed}',
    '.chaton-send svg{width:18px;height:18px;fill:#fff}',
    '.chaton-prechat{padding:24px;display:flex;flex-direction:column;gap:12px;flex:1;justify-content:center}',
    '.chaton-prechat h3{font-size:16px;font-weight:600;color:#1e293b;text-align:center;margin:0}',
    '.chaton-prechat p{font-size:12px;color:#64748b;text-align:center;margin:0}',
    '.chaton-prechat input{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:13px;outline:none;font-family:inherit}',
    '.chaton-prechat input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.15)}',
    '.chaton-prechat button{border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:600;color:#fff;cursor:pointer}',
    '.chaton-powered{text-align:center;padding:6px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9}',
    '@media(max-width:480px){.chaton-frame{width:100%!important;height:100%!important;border-radius:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important}}'
  ].join('\n');
  document.head.appendChild(style);

  // Fetch config
  fetch(API_BASE + '/api/livechat/config/' + TENANT_SLUG)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      config = data.config || {};
      shopName = data.shopName || 'Shop';
      online = data.online;
      createWidget();
    })
    .catch(function (err) {
      console.error('[ChatOn] Config error:', err);
      createWidget();
    });

  function getColor() {
    return config.color || '#3b82f6';
  }

  function getPosition() {
    return config.position || 'right';
  }

  function createWidget() {
    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'chaton-bubble';
    bubble.style.background = getColor();
    bubble.style.bottom = '20px';
    bubble.style[getPosition() === 'left' ? 'left' : 'right'] = '20px';
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    bubble.onclick = toggleChat;
    bubble.id = 'chaton-bubble';
    document.body.appendChild(bubble);

    // Badge
    var badge = document.createElement('div');
    badge.className = 'chaton-badge';
    badge.id = 'chaton-badge';
    badge.style.display = 'none';
    bubble.appendChild(badge);
  }

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      openChat();
    } else {
      closeChat();
    }
  }

  function openChat() {
    unreadCount = 0;
    updateBadge();
    var existing = document.getElementById('chaton-frame');
    if (existing) existing.remove();

    var frame = document.createElement('div');
    frame.className = 'chaton-frame';
    frame.id = 'chaton-frame';
    frame.style.bottom = '90px';
    frame.style[getPosition() === 'left' ? 'left' : 'right'] = '20px';

    // Header
    var header = document.createElement('div');
    header.className = 'chaton-header';
    header.style.background = getColor();
    header.innerHTML = '<div><div class="chaton-header-name">' + escapeHtml(shopName) + '</div>' +
      '<div class="chaton-header-status">' + (online ? 'Online' : 'Offline') + '</div></div>' +
      '<button class="chaton-close" id="chaton-close-btn">&times;</button>';
    frame.appendChild(header);

    if (!registered) {
      // Pre-chat form
      var prechat = document.createElement('div');
      prechat.className = 'chaton-prechat';
      prechat.innerHTML = '<h3>Xin chào!</h3>' +
        '<p>' + (config.welcome_text || 'Vui lòng nhập thông tin để bắt đầu chat') + '</p>' +
        '<input id="chaton-name" placeholder="Tên của bạn" value="' + escapeHtml(visitorName) + '">' +
        '<input id="chaton-email" type="email" placeholder="Email" value="' + escapeHtml(visitorEmail) + '">' +
        '<button id="chaton-start" style="background:' + getColor() + '">Bắt đầu chat</button>';
      frame.appendChild(prechat);

      var powered = document.createElement('div');
      powered.className = 'chaton-powered';
      powered.textContent = 'Powered by ChatOn';
      frame.appendChild(powered);
    } else {
      buildChatUI(frame);
    }

    document.body.appendChild(frame);

    // Event bindings
    setTimeout(function () {
      var closeBtn = document.getElementById('chaton-close-btn');
      if (closeBtn) closeBtn.onclick = function (e) { e.stopPropagation(); closeChat(); };

      var startBtn = document.getElementById('chaton-start');
      if (startBtn) {
        startBtn.onclick = function () {
          var nameInput = document.getElementById('chaton-name');
          var emailInput = document.getElementById('chaton-email');
          visitorName = (nameInput.value || '').trim();
          visitorEmail = (emailInput.value || '').trim();
          if (!visitorName) { nameInput.style.borderColor = '#ef4444'; return; }
          localStorage.setItem('chaton_name', visitorName);
          localStorage.setItem('chaton_email', visitorEmail);
          registered = true;
          openChat(); // rebuild with chat UI
        };
      }
    }, 50);

    // Start polling
    if (registered) {
      loadMessages();
      pollInterval = setInterval(loadMessages, 3000);
    }
  }

  function buildChatUI(frame) {
    var msgsDiv = document.createElement('div');
    msgsDiv.className = 'chaton-messages';
    msgsDiv.id = 'chaton-messages';
    frame.appendChild(msgsDiv);

    var inputArea = document.createElement('div');
    inputArea.className = 'chaton-input-area';
    inputArea.innerHTML = '<input class="chaton-input" id="chaton-input" placeholder="Nhập tin nhắn...">' +
      '<button class="chaton-send" id="chaton-send-btn" style="background:' + getColor() + '">' +
      '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>';
    frame.appendChild(inputArea);

    var powered = document.createElement('div');
    powered.className = 'chaton-powered';
    powered.textContent = 'Powered by ChatOn';
    frame.appendChild(powered);

    setTimeout(function () {
      var input = document.getElementById('chaton-input');
      var sendBtn = document.getElementById('chaton-send-btn');

      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });
        input.focus();
      }
      if (sendBtn) sendBtn.onclick = sendMessage;
    }, 50);
  }

  function closeChat() {
    isOpen = false;
    var frame = document.getElementById('chaton-frame');
    if (frame) frame.remove();
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function renderMessages() {
    var container = document.getElementById('chaton-messages');
    if (!container) return;

    container.innerHTML = '';
    messages.forEach(function (msg) {
      var div = document.createElement('div');
      div.className = 'chaton-msg chaton-msg-' + msg.from;
      div.textContent = msg.text;
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  }

  function loadMessages() {
    fetch(API_BASE + '/api/livechat/messages/' + visitorId + '?tenantSlug=' + TENANT_SLUG)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          var newCount = data.length;
          if (!isOpen && newCount > lastMsgCount && lastMsgCount > 0) {
            unreadCount += (newCount - lastMsgCount);
            updateBadge();
            playSound();
          }
          lastMsgCount = newCount;
          messages = data;
          renderMessages();
        }
      })
      .catch(function () {});
  }

  function sendMessage() {
    var input = document.getElementById('chaton-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Optimistic add
    messages.push({ from: 'customer', text: text, timestamp: new Date().toISOString() });
    renderMessages();

    fetch(API_BASE + '/api/livechat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: TENANT_SLUG,
        visitorId: visitorId,
        text: text,
        name: visitorName,
        email: visitorEmail,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.aiReply) {
          messages.push({ from: 'ai', text: data.aiReply, timestamp: new Date().toISOString() });
          renderMessages();
        }
      })
      .catch(function (err) {
        console.error('[ChatOn] Send error:', err);
      });
  }

  function updateBadge() {
    var badge = document.getElementById('chaton-badge');
    if (!badge) return;
    if (unreadCount > 0) {
      badge.style.display = 'flex';
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  function playSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
