// Quick lead forms on the product pages. Each form posts its choice plus an
// email or mobile to /api/lead, protected by reCAPTCHA v3 (the page must load
// api.js?render=<site key>).
(function () {
  var SITE_KEY = window.__RECAPTCHA_SITE_KEY__ || '';

  function isLocal() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.indexOf('192.168') === 0;
  }

  function getToken() {
    if (isLocal()) return Promise.resolve('test_token_localhost');
    return new Promise(function (resolve, reject) {
      var tries = 0;
      if (window.__loadRecaptcha) window.__loadRecaptcha();
      (function wait() {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(function () {
            window.grecaptcha.execute(SITE_KEY, { action: 'submit' }).then(resolve, reject);
          });
        } else if (++tries > 100) {
          reject(new Error('reCAPTCHA is not loaded. Please refresh the page.'));
        } else {
          setTimeout(wait, 100);
        }
      })();
    });
  }

  // opts: { formId, source, getChoice(), getEmail(), getPhone() }
  window.wireLeadForm = function (opts) {
    var form = document.getElementById(opts.formId);
    if (!form) return;
    var btn = form.querySelector('button[type="submit"]');
    var btnText = btn.textContent;
    var msg = document.createElement('p');
    msg.className = 'text-sm font-medium mt-4';
    msg.setAttribute('role', 'status');
    msg.hidden = true;
    form.appendChild(msg);

    // bot trap (see middleware/honeypot.js): hidden from people, tempting to scripts
    var hp = document.createElement('div');
    hp.className = 'rx-hp'; hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden';
    hp.innerHTML = '<label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(hp);

    function show(text, ok) {
      msg.textContent = text;
      msg.style.color = ok ? '#16A34A' : '#DC2626';
      msg.hidden = false;
    }

    var started = false;
    form.addEventListener('focusin', function () {
      if (started) return; started = true;
      if (window.rexaTrack) window.rexaTrack('form_start', { source: opts.source }); // no PII
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Sending...';

      getToken()
        .then(function (token) {
          return fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: opts.source,
              choice: opts.getChoice(),
              email: opts.getEmail ? opts.getEmail() : '',
              phone: opts.getPhone ? opts.getPhone() : '',
              recaptchaToken: token,
              website: (hp.querySelector('input') || {}).value || ''
            })
          });
        })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) {
              var detail = body.errors && body.errors.length ? body.errors.join('. ') : body.message;
              throw new Error(detail || 'Something went wrong. Please try again.');
            }
            return body;
          });
        })
        .then(function (body) {
          show('✓ ' + body.message, true);
          if (window.rexaTrack) window.rexaTrack('generate_lead', { source: opts.source }); // no PII
          form.reset();
          btn.textContent = 'Request received';
        })
        .catch(function (err) {
          show(err.message || 'Something went wrong. Please try again.', false);
          btn.disabled = false;
          btn.textContent = btnText;
        });
    });
  };
})();
