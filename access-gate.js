/* ═══════════════════════════════════════════════════════════
   MEDYATRA — ACCESS GATE
   Locks treatment finder / disease tools behind ₹99 / ₹199 plans.
   The AI Symptom Checker on the homepage is NEVER gated — it
   does not include this script.

   HOW UNLOCK WORKS:
   • Razorpay → real payment confirmed by Razorpay's own servers,
     auto-unlocks instantly + logs payment_id for your records.
   • UPI → user pays via QR, submits their UPI transaction ID,
     it's logged to your Google Sheet + you get an email alert
     (via your existing Apps Script). You verify the payment in
     your UPI app (10 seconds), mark the row "Verified" in the
     sheet, and the customer enters their phone number here to
     redeem — the gate checks your sheet and unlocks them.

   This is the strongest gate possible on a static site without
   a paid backend. It is NOT bank-grade security — a technically
   determined person could bypass client-side checks. For a
   ₹99–₹199 consumer product this is the standard, reasonable
   approach (same as most small Indian D2C sites use).
   ═══════════════════════════════════════════════════════════ */

(function () {
  // ── CONFIG — edit these ──
  var SHEETS_URL   = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; // same URL used on pricing.html
  var RAZORPAY_KEY = 'YOUR_RAZORPAY_KEY_ID_HERE';         // from dashboard.razorpay.com → Settings → API Keys
  var UPI_ID       = '9717019785@fam';
  var PLANS = {
    starter: { name: 'Starter Plan',  amountINR: 99,  label: '₹99'  },
    popular: { name: 'Popular Plan',  amountINR: 199, label: '₹199' }
  };
  var STORAGE_KEY = 'medyatra_access_v1';

  // ── ACCESS CHECK ──
  function getAccess() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setAccess(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
  function hasValidAccess() {
    var a = getAccess();
    if (!a || !a.unlocked) return false;
    // Optional: 365-day access window from unlock date
    if (a.unlockedAt) {
      var days = (Date.now() - a.unlockedAt) / 86400000;
      if (days > 365) return false;
    }
    return true;
  }

  // ── BUILD PAYWALL OVERLAY ──
  function buildOverlay() {
    var upiStarter = 'upi://pay?pa=' + UPI_ID + '&pn=MedYatra&am=99&cu=INR&tn=MedYatra+Starter+Plan';
    var upiPopular  = 'upi://pay?pa=' + UPI_ID + '&pn=MedYatra&am=199&cu=INR&tn=MedYatra+Popular+Plan';
    var qrStarter = 'https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=' + encodeURIComponent(upiStarter);
    var qrPopular  = 'https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=' + encodeURIComponent(upiPopular);

    var wrap = document.createElement('div');
    wrap.id = 'mg-overlay';
    wrap.innerHTML =
      '<style>' +
      '#mg-overlay{position:fixed;inset:0;z-index:5000;background:rgba(6,20,18,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.2rem;font-family:"Inter","DM Sans",sans-serif}' +
      '.mg-card{background:#fff;width:100%;max-width:880px;max-height:92vh;overflow-y:auto;border-radius:26px;box-shadow:0 30px 90px rgba(0,0,0,.4);position:relative}' +
      '.mg-hero{background:linear-gradient(135deg,#0f766e,#115e59);padding:2rem 2.2rem;color:#fff;text-align:center;border-radius:26px 26px 0 0}' +
      '.mg-hero h2{font:800 1.7rem/1.25 "Playfair Display",Georgia,serif;margin-bottom:.5rem}' +
      '.mg-hero p{font-size:.95rem;color:rgba(255,255,255,.82);max-width:520px;margin:0 auto}' +
      '.mg-free{display:inline-flex;align-items:center;gap:6px;background:rgba(45,212,191,.18);border:1px solid rgba(45,212,191,.4);color:#5eead4;border-radius:30px;padding:5px 14px;font-size:.76rem;font-weight:700;margin-top:.9rem}' +
      '.mg-body{padding:1.8rem 2.2rem 2.2rem}' +
      '.mg-plans{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:1.6rem}' +
      '@media(max-width:640px){.mg-plans{grid-template-columns:1fr}}' +
      '.mg-plan{border:2px solid #e2e8f0;border-radius:18px;padding:1.3rem;position:relative;cursor:pointer;transition:all .18s}' +
      '.mg-plan:hover{border-color:#2dd4bf}' +
      '.mg-plan.on{border-color:#0d9488;background:#f0fdfa;box-shadow:0 6px 20px rgba(13,148,136,.15)}' +
      '.mg-badge{position:absolute;top:-11px;right:16px;background:#0d9488;color:#fff;font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:4px 11px;border-radius:20px}' +
      '.mg-plan-name{font:700 1.05rem/1 "Playfair Display",Georgia,serif;color:#0f172a;margin-bottom:6px}' +
      '.mg-plan-price{font:800 2.1rem/1 "Playfair Display",Georgia,serif;color:#0f766e;margin-bottom:.6rem}' +
      '.mg-plan-price span{font-size:.9rem;font-weight:600;color:#94a3b8}' +
      '.mg-plan ul{list-style:none;margin:0;padding:0}' +
      '.mg-plan li{font-size:.85rem;color:#475569;padding:4px 0;padding-left:22px;position:relative}' +
      '.mg-plan li::before{content:"✓";position:absolute;left:0;color:#0d9488;font-weight:800}' +
      '.mg-tabs{display:flex;gap:8px;margin-bottom:1.2rem;border-bottom:2px solid #f1f5f9}' +
      '.mg-tab{padding:10px 18px;font-size:.88rem;font-weight:700;color:#94a3b8;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px}' +
      '.mg-tab.on{color:#0f766e;border-color:#0d9488}' +
      '.mg-pane{display:none}' +
      '.mg-pane.on{display:block}' +
      '.mg-qr-row{display:flex;gap:1.6rem;align-items:center;flex-wrap:wrap;justify-content:center;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:16px;padding:1.4rem}' +
      '.mg-qr-row img{border-radius:10px;background:#fff;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,.08)}' +
      '.mg-upi-id{font-weight:700;color:#0f766e;background:#fff;border:1px solid #ccfbf1;border-radius:8px;padding:6px 12px;display:inline-block;margin-top:6px;font-size:.92rem}' +
      '.mg-steps{font-size:.85rem;color:#475569;line-height:1.85;margin:0;padding-left:1.1rem}' +
      '.mg-field{margin-top:1rem}' +
      '.mg-field label{display:block;font-size:.82rem;font-weight:700;color:#475569;margin-bottom:5px}' +
      '.mg-field input{width:100%;border:2px solid #e2e8f0;border-radius:10px;padding:11px 13px;font-size:.92rem;outline:none}' +
      '.mg-field input:focus{border-color:#2dd4bf}' +
      '.mg-btn{width:100%;margin-top:1rem;background:#0d9488;color:#fff;border:none;border-radius:12px;padding:14px;font-size:.95rem;font-weight:800;cursor:pointer;transition:background .18s}' +
      '.mg-btn:hover{background:#0f766e}' +
      '.mg-btn.rzp{background:#0f172a}' +
      '.mg-btn.rzp:hover{background:#1e293b}' +
      '.mg-note{font-size:.78rem;color:#94a3b8;text-align:center;margin-top:.8rem;line-height:1.6}' +
      '.mg-msg{font-size:.85rem;border-radius:10px;padding:.8rem 1rem;margin-top:1rem;display:none}' +
      '.mg-msg.ok{display:block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}' +
      '.mg-msg.wait{display:block;background:#fffbeb;border:1px solid #fde68a;color:#92400e}' +
      '.mg-close{position:absolute;top:14px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer}' +
      '.mg-redeem{margin-top:1.6rem;border-top:1px solid #e2e8f0;padding-top:1.4rem}' +
      '.mg-redeem summary{cursor:pointer;font-size:.85rem;font-weight:700;color:#0f766e}' +
      '</style>' +

      '<div class="mg-card">' +
        '<div class="mg-hero">' +
          '<button class="mg-close" onclick="document.getElementById(\'mg-overlay\').remove();document.body.style.overflow=\'\'">✕</button>' +
          '<h2>Unlock Full Treatment &amp; Cost Finder</h2>' +
          '<p>Browse every treatment, disease match and hospital cost breakdown in one place. One-time payment, lifetime access.</p>' +
          '<div class="mg-free">🤖 AI Symptom Checker stays 100% free — always</div>' +
        '</div>' +
        '<div class="mg-body">' +

          '<div class="mg-plans">' +
            '<div class="mg-plan on" id="mg-plan-starter" onclick="mgSelectPlan(\'starter\')">' +
              '<div class="mg-plan-name">Starter</div>' +
              '<div class="mg-plan-price">₹99</div>' +
              '<ul>' +
                '<li>Full treatment &amp; disease search</li>' +
                '<li>India vs USA cost comparison</li>' +
                '<li>Hospital shortlist per condition</li>' +
                '<li>Lifetime access</li>' +
              '</ul>' +
            '</div>' +
            '<div class="mg-plan" id="mg-plan-popular" onclick="mgSelectPlan(\'popular\')">' +
              '<div class="mg-badge">Most Popular</div>' +
              '<div class="mg-plan-name">Popular</div>' +
              '<div class="mg-plan-price">₹199</div>' +
              '<ul>' +
                '<li>Everything in Starter</li>' +
                '<li>Priority WhatsApp support</li>' +
                '<li>Personalised hospital shortlist</li>' +
                '<li>Visa letter checklist</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +

          '<div class="mg-tabs">' +
            '<div class="mg-tab on" id="mg-tab-upi" onclick="mgTab(\'upi\')">📱 Pay via UPI</div>' +
            '<div class="mg-tab" id="mg-tab-rzp" onclick="mgTab(\'rzp\')">💳 Card / Netbanking</div>' +
          '</div>' +

          '<div class="mg-pane on" id="mg-pane-upi">' +
            '<div class="mg-qr-row">' +
              '<img id="mg-qr-img" src="' + qrStarter + '" width="180" height="180" alt="MedYatra UPI QR code"/>' +
              '<div>' +
                '<div style="font-size:.82rem;color:#475569">Scan with any UPI app, or pay directly to</div>' +
                '<div class="mg-upi-id">' + UPI_ID + '</div>' +
                '<ol class="mg-steps">' +
                  '<li>Scan the QR or tap it on mobile</li>' +
                  '<li>Confirm the amount shown is <strong id="mg-amt-txt">₹99</strong></li>' +
                  '<li>Complete payment in your UPI app</li>' +
                  '<li>Copy the transaction / UTR number and paste below</li>' +
                '</ol>' +
              '</div>' +
            '</div>' +
            '<div class="mg-field"><label>Your Phone Number *</label><input id="mg-phone" type="tel" placeholder="+91 9XXXXXXXXX"/></div>' +
            '<div class="mg-field"><label>UPI Transaction ID / UTR Number *</label><input id="mg-txn" type="text" placeholder="e.g. 407618382930"/></div>' +
            '<button class="mg-btn" onclick="mgSubmitUPI()">Submit Payment for Verification →</button>' +
            '<div class="mg-msg" id="mg-upi-msg"></div>' +
            '<div class="mg-note">Verification is usually done within a few minutes during business hours. You will get an access code on WhatsApp — enter it below once received.</div>' +

            '<details class="mg-redeem"><summary>Already have an access code? Redeem it here</summary>' +
              '<div class="mg-field"><label>Phone Number used for payment</label><input id="mg-redeem-phone" type="tel" placeholder="+91 9XXXXXXXXX"/></div>' +
              '<div class="mg-field"><label>Access Code</label><input id="mg-redeem-code" type="text" placeholder="e.g. MY-7Q3F9"/></div>' +
              '<button class="mg-btn" style="background:#115e59" onclick="mgRedeem()">Unlock My Access →</button>' +
              '<div class="mg-msg" id="mg-redeem-msg"></div>' +
            '</details>' +
          '</div>' +

          '<div class="mg-pane" id="mg-pane-rzp">' +
            '<p style="font-size:.9rem;color:#475569;margin-bottom:1rem">Pay instantly with any card, UPI or net banking via Razorpay — unlocks automatically the moment payment succeeds.</p>' +
            '<button class="mg-btn rzp" onclick="mgPayRazorpay()">Pay <span id="mg-rzp-amt">₹99</span> with Razorpay →</button>' +
            '<div class="mg-msg" id="mg-rzp-msg"></div>' +
            '<div class="mg-note">🔒 Secured by Razorpay · Visa, Mastercard, RuPay, UPI &amp; all major banks accepted</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
  }

  // ── STATE ──
  window.mgSelectedPlan = 'starter';

  window.mgSelectPlan = function (key) {
    window.mgSelectedPlan = key;
    document.getElementById('mg-plan-starter').className = 'mg-plan' + (key === 'starter' ? ' on' : '');
    document.getElementById('mg-plan-popular').className = 'mg-plan' + (key === 'popular' ? ' on' : '');
    var p = PLANS[key];
    var qrData = 'upi://pay?pa=' + UPI_ID + '&pn=MedYatra&am=' + p.amountINR + '&cu=INR&tn=MedYatra+' + p.name.replace(/\s/g, '+');
    document.getElementById('mg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=' + encodeURIComponent(qrData);
    document.getElementById('mg-amt-txt').textContent = p.label;
    document.getElementById('mg-rzp-amt').textContent = p.label;
  };

  window.mgTab = function (which) {
    document.getElementById('mg-tab-upi').className = 'mg-tab' + (which === 'upi' ? ' on' : '');
    document.getElementById('mg-tab-rzp').className = 'mg-tab' + (which === 'rzp' ? ' on' : '');
    document.getElementById('mg-pane-upi').className = 'mg-pane' + (which === 'upi' ? ' on' : '');
    document.getElementById('mg-pane-rzp').className = 'mg-pane' + (which === 'rzp' ? ' on' : '');
  };

  // ── SUBMIT UPI PAYMENT FOR MANUAL VERIFICATION ──
  window.mgSubmitUPI = function () {
    var phone = document.getElementById('mg-phone').value.trim();
    var txn   = document.getElementById('mg-txn').value.trim();
    var msg   = document.getElementById('mg-upi-msg');
    if (!phone || !txn) {
      msg.className = 'mg-msg wait';
      msg.textContent = 'Please enter both your phone number and the transaction ID.';
      return;
    }
    var plan = PLANS[window.mgSelectedPlan];
    var code = 'MY-' + Math.random().toString(36).slice(2, 7).toUpperCase();

    if (SHEETS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      fetch(SHEETS_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PAYMENT',
          timestamp: new Date().toISOString(),
          phone: phone,
          plan: plan.name,
          amount: plan.label,
          paymentMethod: 'UPI',
          txnReference: txn,
          upiId: UPI_ID,
          accessCode: code,
          status: 'Pending Verification',
          source: 'Access Gate — ' + location.pathname
        })
      }).catch(function () {});
    }

    msg.className = 'mg-msg ok';
    msg.textContent = '✅ Submitted! We\'re verifying your payment now — your access code (' + code + ') will be sent to your WhatsApp shortly. Keep this window open or check back with your code above.';
  };

  // ── REDEEM ACCESS CODE (owner has manually verified in the sheet) ──
  window.mgRedeem = function () {
    var phone = document.getElementById('mg-redeem-phone').value.trim();
    var code  = document.getElementById('mg-redeem-code').value.trim().toUpperCase();
    var msg   = document.getElementById('mg-redeem-msg');
    if (!phone || !code) {
      msg.className = 'mg-msg wait';
      msg.textContent = 'Enter your phone number and access code.';
      return;
    }
    if (SHEETS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      // Fallback for testing without backend wired up yet
      unlockAccess('upi-manual', code);
      msg.className = 'mg-msg ok';
      msg.textContent = 'Unlocked! Redirecting...';
      setTimeout(function () { location.reload(); }, 900);
      return;
    }
    msg.className = 'mg-msg wait';
    msg.textContent = 'Checking...';
    fetch(SHEETS_URL + '?action=verifyCode&phone=' + encodeURIComponent(phone) + '&code=' + encodeURIComponent(code))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.valid) {
          unlockAccess('upi-manual', code);
          msg.className = 'mg-msg ok';
          msg.textContent = '✅ Unlocked! Reloading...';
          setTimeout(function () { location.reload(); }, 900);
        } else {
          msg.className = 'mg-msg wait';
          msg.textContent = 'Code not verified yet, or details don\'t match. Please wait a few minutes and try again, or WhatsApp +91 9717019785.';
        }
      })
      .catch(function () {
        msg.className = 'mg-msg wait';
        msg.textContent = 'Could not reach the server. Please try again or WhatsApp +91 9717019785.';
      });
  };

  // ── RAZORPAY CHECKOUT ──
  window.mgPayRazorpay = function () {
    var msg = document.getElementById('mg-rzp-msg');
    if (RAZORPAY_KEY === 'YOUR_RAZORPAY_KEY_ID_HERE') {
      msg.className = 'mg-msg wait';
      msg.textContent = 'Razorpay isn\'t connected yet — please use the UPI tab, or contact us on WhatsApp +91 9717019785.';
      return;
    }
    var plan = PLANS[window.mgSelectedPlan];
    var options = {
      key: RAZORPAY_KEY,
      amount: plan.amountINR * 100, // paise
      currency: 'INR',
      name: 'MedYatra',
      description: plan.name + ' — Treatment Finder Access',
      handler: function (response) {
        unlockAccess('razorpay', response.razorpay_payment_id);
        if (SHEETS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
          fetch(SHEETS_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'PAYMENT',
              timestamp: new Date().toISOString(),
              plan: plan.name,
              amount: plan.label,
              paymentMethod: 'Razorpay',
              txnReference: response.razorpay_payment_id,
              status: 'Paid — Razorpay Verified',
              source: 'Access Gate — ' + location.pathname
            })
          }).catch(function () {});
        }
        location.reload();
      },
      theme: { color: '#0d9488' }
    };
    if (typeof Razorpay === 'undefined') {
      msg.className = 'mg-msg wait';
      msg.textContent = 'Payment library still loading — please try again in a moment.';
      return;
    }
    var rzp = new Razorpay(options);
    rzp.open();
  };

  function unlockAccess(method, ref) {
    setAccess({ unlocked: true, method: method, ref: ref, plan: window.mgSelectedPlan, unlockedAt: Date.now() });
  }

  // ── INIT ──
  function init() {
    if (hasValidAccess()) return; // already unlocked, do nothing
    // Load Razorpay checkout script quietly (harmless if unused)
    var s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(s);
    buildOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
