/* ===========================================================
   REXA — site interactions
   =========================================================== */

// Footer copyright year — always current, no manual updates needed
document.querySelectorAll('.copy-year').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// Mobile nav toggle
document.addEventListener('click', e => {
  if (e.target.closest('.nav-toggle')) {
    document.querySelector('.nav-links')?.classList.toggle('open');
  }
});

// Scroll reveal — stagger-grid children fire simultaneously so CSS delay staggers them
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      if (window.ScrollDebugger?.enabled) {
        console.log(`[REVEAL] Element visible at ${(en.intersectionRatio * 100).toFixed(0)}%`, {
          element: en.target.className,
          top: en.boundingClientRect.top,
          bottom: en.boundingClientRect.bottom,
          inViewport: en.boundingClientRect.top < window.innerHeight,
        });
      }
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Industry cards highlight on scroll — same visual as :hover, triggered as each
// card passes through the vertical center band of the viewport
(function industryCardsHighlight(){
  const cards = document.querySelectorAll('.ind-card');
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => en.target.classList.toggle('is-active', en.isIntersecting));
  }, { rootMargin: '-30% 0px -50% 0px' });

  cards.forEach(card => io.observe(card));
})();

// Client logos gain colour as they scroll into view, then stay coloured —
// each card/logo turns from grayscale to full colour once, the first time it
// crosses into the viewport, cascading left-to-right within a row via a CSS
// transition-delay (see .cgrid-card / .fc-client rules in styles.css).
(function logoColorReveal(){
  const clientGrid = document.querySelector('.client-grid');
  const featuredClients = document.querySelector('.featured-clients');
  if (!clientGrid && !featuredClients) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('logo-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.35 });

  clientGrid?.querySelectorAll('.cgrid-card').forEach(card => io.observe(card));
  if (featuredClients) io.observe(featuredClients);
})();

// Hero headline (R2) — "More than a / broker." is static and fades/rises in
// on load; "Your risk / partner." then types in, one line at a time. Both
// halves use fixed, hardcoded line breaks (not natural word-wrap) so the
// headline reads as the same four lines on every viewport, not just
// whichever ones happen to fit a given column width. .tw-measure (real text)
// reserves the correct height for the typed half; it's hidden only once the
// animated overlay is ready, so there's never a gap.
(function initTypewriter(){
  const staticLine = document.getElementById('tw-static');
  const measure = document.querySelector('#hero-hl .tw-measure');
  const el = document.getElementById('tw-visible');
  if (!el || !measure) return;

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.setAttribute('aria-hidden', 'true');

  const lineTexts = ['Your risk', 'partner.'];
  const spans = [];
  lineTexts.forEach((text, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    const s = document.createElement('span');
    s.className = 'accent';
    el.appendChild(s);
    spans.push({ s, text });
  });
  measure.style.visibility = 'hidden';

  // Lead paragraph, CTAs and social proof stay hidden until the headline
  // is fully typed, then fade in together (staggered via CSS).
  const followup = document.getElementById('hero-followup');
  function revealFollowup() { followup?.classList.add('in'); }

  if (prefersReducedMotion) {
    // Show text instantly for accessibility
    staticLine?.classList.add('in');
    spans.forEach(({ s, text }) => s.textContent = text);
    revealFollowup();
    return;
  }

  staticLine?.classList.add('in');

  let li = 0, ci = 0;
  const typewriterStart = performance.now();

  function tick(){
    if (li >= spans.length) return;
    const { s, text } = spans[li];
    if (ci < text.length) {
      s.textContent += text[ci++];
      const elapsed = performance.now() - typewriterStart;
      if (window.ScrollDebugger?.enabled && (ci === 1 || ci % 5 === 0)) {
        console.log(`[TYPEWRITER] Char ${ci} of ${text.length} at ${elapsed.toFixed(0)}ms`);
      }
      setTimeout(tick, 45);
    } else {
      li++; ci = 0;
      if (li < spans.length) {
        if (window.ScrollDebugger?.enabled) {
          console.log(`[TYPEWRITER] Line ${li} complete`);
        }
        setTimeout(tick, 180);
      } else {
        if (window.ScrollDebugger?.enabled) {
          const totalTime = performance.now() - typewriterStart;
          console.log(`[TYPEWRITER] Complete in ${totalTime.toFixed(0)}ms`);
        }
        revealFollowup();
      }
    }
  }
  setTimeout(tick, 400);
})();

// Promo announcement bar (will be populated by initRohini with active offers)
function updatePromoBar() {
  const bar = document.getElementById('promoBar');
  const barText = document.getElementById('promoBarText');
  if (!bar || !barText || OFFERS.length === 0) return;

  const live = activeOffers();
  if (live.length === 0) {
    bar.style.display = 'none';
    return;
  }

  const offer = live[0];
  barText.innerHTML = `<span class="promo-emoji">${offer.icon}</span><strong>${offer.badge}:</strong> ${offer.teaser}`;

  // Smooth fade-in transition
  bar.style.display = 'block';
  setTimeout(() => { bar.style.opacity = '1'; }, 10);

  const openBtn = document.getElementById('promoOpen');
  const dismiss = document.getElementById('promoDismiss');
  const KEY = 'rexa_promo_dismissed';

  try { if (localStorage.getItem(KEY) === '1') bar.classList.add('is-hidden'); } catch(e){}

  openBtn?.addEventListener('click', () => {
    if (window.rohiniWidget) {
      document.body.classList.add('roh-open');
      setTimeout(() => document.getElementById('rohInput')?.focus(), 260);
    }
  });

  dismiss?.addEventListener('click', () => {
    bar.style.opacity = '0';
    setTimeout(() => bar.classList.add('is-hidden'), 600);
    try { localStorage.setItem(KEY, '1'); } catch(e){}
  });
}

/* ---- Contact form -> API backend ----------------------------------------
   Now handled by contact.html with reCAPTCHA v3 bot protection.
   Form submission is intercepted in contact.html with complete
   validation, sanitization, rate limiting, and email sending.
   ------------------------------------------------------------------- */

// Toast helper
function toast(text){
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = text;
  requestAnimationFrame(()=> t.classList.add('show'));
  clearTimeout(t._timer);
  t._timer = setTimeout(()=> t.classList.remove('show'), 3200);
}

/* ===========================================================
   QUOTE WIZARD
   A live, interactive multi-step flow with indicative pricing.
   Indicative only — not a binding quote.
   =========================================================== */
(function quoteWizard(){
  const root = document.getElementById('wizard');
  if(!root) return;

  // --- Product catalogue: base rate is annual premium per ₹1 of sum insured (very rough, illustrative) ---
  const PRODUCTS = {
    property: { label:'Property & Asset',   icon:'\u{1F3E2}', desc:'Fire, all-risk, burglary', rate:0.0011, min:6000 },
    liability:{ label:'Liability',           icon:'\u{2696}\u{FE0F}', desc:'D&O, indemnity, cyber', rate:0.0016, min:9000 },
    marine:   { label:'Marine & Transit',    icon:'\u{1F6A2}', desc:'Cargo, hull, logistics', rate:0.0009, min:5000 },
    motor:    { label:'Motor & Fleet',       icon:'\u{1F699}', desc:'Cars, trucks, fleets', rate:0.0028, min:4000 },
    health:   { label:'Group Health',        icon:'\u{1F3E5}', desc:'Mediclaim for your team', rate:0.0000, min:0, perHead:5200 },
    life:     { label:'Group Life & PA',     icon:'\u{1F465}', desc:'Term life & accident', rate:0.0000, min:0, perHead:1400 },
  };

  // --- Industry risk multipliers ---
  const INDUSTRIES = {
    'Technology / SaaS':0.9, 'Retail & FMCG':1.0, 'Manufacturing':1.25, 'Construction':1.45,
    'Healthcare':1.15, 'Logistics & Transport':1.3, 'Hospitality':1.1, 'Energy & Power':1.5,
    'Financial Services':1.2, 'Education':0.85, 'Real Estate':1.05, 'Other':1.0
  };

  const state = {
    step: 0,
    products: new Set(),
    industry: 'Technology / SaaS',
    team: 25,
    sumInsured: 50,   // in ₹ Lakh
    claimYears: 3,    // claim-free years -> discount
    name:'', company:'', email:'', phone:''
  };

  const fmtINR = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const lakh = l => l >= 100 ? (l/100).toFixed(l%100? 2:0)+' Cr' : l+' L';

  // --- Pricing engine ---
  function calc(){
    const lines = [];
    let gross = 0;
    const indMult = INDUSTRIES[state.industry] || 1;
    const sumRupees = state.sumInsured * 100000;

    state.products.forEach(key => {
      const p = PRODUCTS[key];
      let prem;
      if(p.perHead){
        prem = p.perHead * state.team * indMult;
      } else {
        prem = Math.max(p.min, sumRupees * p.rate) * indMult;
      }
      gross += prem;
      lines.push({ label:p.label, prem });
    });

    // Claim-free discount: up to 15%
    const discPct = Math.min(state.claimYears * 0.05, 0.15);
    const discount = gross * discPct;
    const net = gross - discount;
    const gst = net * 0.18;
    const total = net + gst;
    return { lines, gross, discount, discPct, gst, total };
  }

  // --- Render live estimate panel ---
  function renderEstimate(){
    const box = document.getElementById('estimate');
    if(!box) return;
    if(state.products.size === 0){
      box.innerHTML = `<div class="e-lab">Your estimate</div>
        <div class="e-amt">₹—</div>
        <div class="e-empty">Pick what you want to cover to see a live indicative premium.</div>`;
      return;
    }
    const r = calc();
    const rows = r.lines.map(l => `<div class="e-row"><span>${l.label}</span><span>${fmtINR(l.prem)}</span></div>`).join('');
    const disc = r.discount>0 ? `<div class="e-row"><span>Claim-free discount (${Math.round(r.discPct*100)}%)</span><span>−${fmtINR(r.discount)}</span></div>` : '';
    box.innerHTML = `
      <div class="e-lab">Indicative annual premium</div>
      <div class="e-amt" id="eAmt">${fmtINR(r.total)}</div>
      <div class="e-per">incl. 18% GST · ${state.industry}</div>
      <div class="e-list">
        ${rows}
        ${disc}
        <div class="e-row"><span>GST (18%)</span><span>${fmtINR(r.gst)}</span></div>
        <div class="e-row" style="font-weight:700;color:#fff;border-bottom:none"><span>Total</span><span>${fmtINR(r.total)}</span></div>
      </div>
      <div class="e-note">Indicative figure generated from the details you entered. Final premium is confirmed by a licensed Rexa advisor after underwriting.</div>`;
    const amt = document.getElementById('eAmt');
    if(amt){ amt.animate([{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:250,easing:'ease'}); }
  }

  // --- Step 1 markup: product picker ---
  function buildProducts(){
    const grid = root.querySelector('#optProducts');
    grid.innerHTML = Object.entries(PRODUCTS).map(([k,p]) => `
      <div class="opt" data-prod="${k}">
        <span class="oic">${p.icon}</span>
        <span><span class="otitle">${p.label}</span><span class="odesc">${p.desc}</span></span>
        <span class="otick">✓</span>
      </div>`).join('');
    grid.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => {
      const k = o.dataset.prod;
      if(state.products.has(k)){ state.products.delete(k); o.classList.remove('sel'); }
      else { state.products.add(k); o.classList.add('sel'); }
      renderEstimate(); updateNav();
    }));
  }

  // --- Step 2 markup: details ---
  function buildDetails(){
    const sel = root.querySelector('#fIndustry');
    sel.innerHTML = Object.keys(INDUSTRIES).map(i => `<option ${i===state.industry?'selected':''}>${i}</option>`).join('');
    sel.addEventListener('change', e => { state.industry = e.target.value; renderEstimate(); });

    const team = root.querySelector('#fTeam'), teamV = root.querySelector('#fTeamV');
    team.value = state.team; teamV.textContent = state.team + ' people';
    team.addEventListener('input', e => { state.team = +e.target.value; teamV.textContent = state.team + ' people'; renderEstimate(); });

    const si = root.querySelector('#fSum'), siV = root.querySelector('#fSumV');
    si.value = state.sumInsured; siV.textContent = '₹' + lakh(state.sumInsured);
    si.addEventListener('input', e => { state.sumInsured = +e.target.value; siV.textContent = '₹' + lakh(state.sumInsured); renderEstimate(); });

    const cy = root.querySelector('#fClaim'), cyV = root.querySelector('#fClaimV');
    cy.value = state.claimYears; cyV.textContent = state.claimYears + (state.claimYears===1?' year':' years');
    cy.addEventListener('input', e => { state.claimYears = +e.target.value; cyV.textContent = state.claimYears + (state.claimYears===1?' year':' years'); renderEstimate(); });
  }

  // --- Step 3: contact fields bind ---
  function bindContact(){
    ['name','company','email','phone'].forEach(f => {
      const el = root.querySelector('#q_'+f);
      el.value = state[f];
      el.addEventListener('input', e => { state[f] = e.target.value; updateNav(); });
    });
  }

  // --- Navigation between steps ---
  const steps = [...root.querySelectorAll('.wz-step')];
  const pips = [...root.querySelectorAll('.wz-progress .pip')];

  function canAdvance(){
    if(state.step === 0) return state.products.size > 0;
    if(state.step === 2) return state.name.trim() && /\S+@\S+\.\S+/.test(state.email);
    return true;
  }

  function updateNav(){
    const next = root.querySelector('#wzNext');
    if(next) next.disabled = !canAdvance();
  }

  function show(i){
    state.step = i;
    steps.forEach((s,idx) => s.classList.toggle('active', idx===i));
    pips.forEach((p,idx) => { p.classList.toggle('done', idx<i); p.classList.toggle('active', idx===i); });
    const back = root.querySelector('#wzBack'), next = root.querySelector('#wzNext');
    if(back) back.style.visibility = i===0 ? 'hidden' : 'visible';
    if(next) next.textContent = i===2 ? 'Get my quote' : 'Continue';
    updateNav();
    root.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function finish(){
    const r = calc();
    const ref = 'RX-' + Math.floor(100000 + Math.random()*899999);
    const res = root.querySelector('#wzResult');
    res.querySelector('#resAmt').textContent = fmtINR(r.total);
    res.querySelector('#resRef').textContent = ref;
    res.querySelector('#resProducts').textContent = [...state.products].map(k=>PRODUCTS[k].label).join(', ');
    res.querySelector('#resName').textContent = state.name.split(' ')[0] || 'there';
    // hide controls, show result
    steps.forEach(s => s.classList.remove('active'));
    res.classList.add('active');
    root.querySelector('.wz-nav').style.display = 'none';
    pips.forEach(p => { p.classList.add('done'); p.classList.remove('active'); });
    toast('Quote ready — reference ' + ref);
  }

  root.querySelector('#wzNext').addEventListener('click', () => {
    if(!canAdvance()) return;
    if(state.step < 2) show(state.step + 1);
    else finish();
  });
  root.querySelector('#wzBack').addEventListener('click', () => { if(state.step>0) show(state.step-1); });
  root.querySelector('#wzRestart')?.addEventListener('click', () => location.reload());

  // init
  buildProducts(); buildDetails(); bindContact();
  renderEstimate(); show(0);
})();


/* ===========================================================
   ROHINI — guided finder & assistant
   Not a chat log — a step-based "help me find it" tool that
   lives in a full modal, driven by a rule-based decision tree.
   Injects its own markup so it works unchanged on every page
   that loads app.js.
   =========================================================== */

// Offers configuration
let OFFERS = [];

const mmdd = s => (+s.slice(0,2)) * 100 + (+s.slice(3,5));
function offerLive(o) {
  if (o.active === false) return false;
  const now = new Date();
  const today = (now.getMonth() + 1) * 100 + now.getDate();
  const from = mmdd(o.window[0]), to = mmdd(o.window[1]);
  return from <= to ? (today >= from && today <= to) : (today >= from || today <= to);
}
const activeOffers = () => OFFERS.filter(offerLive);

// Load offers then initialize Raksha
async function initOffers() {
  try {
    const r = await fetch('offers.json');
    OFFERS = await r.json();
    console.log('✓ Offers loaded from offers.json', OFFERS.length);
  } catch (e) {
    try {
      const offersEnv = window.__OFFERS_CONFIG__ || '[]';
      OFFERS = JSON.parse(offersEnv);
      console.log('✓ Offers loaded from environment variable', OFFERS.length);
    } catch (err) {
      console.error('Failed to load offers:', err);
      OFFERS = [];
    }
  }
  initRohini();
}

function initRohini() {

  const TEL = 'tel:+914448678884';
  const MAIL = 'mailto:info@rexabroking.com';

  /* ---- Decision tree ---- */
  const TREE = {
    root: {
      crumb: 'Home',
      bot: ["Hi, I'm Raksha 👋 What are you trying to do today?"],
      options: [
        { icon:'🗂️', label:'Explore our products', hint:'See everything we cover', to:'products_menu' },
        { icon:'🏢', label:'About Rexa', hint:'Who we are & how we work', to:'about_rexa' },
        { icon:'🎧', label:'Talk to a human advisor', hint:'Call, email or message our team', to:'contact_advisor' },
      ],
    },
    claim_type: {
      crumb: 'File a claim', parent: 'root',
      bot: "Sorry to hear you need to file a claim — let's get this moving. Which policy is this for?",
      options: [
        { icon:'🏥', label:'Health', hint:'Hospital & medical claims', to:'claim_health' },
        { icon:'🚗', label:'Motor', hint:'Accident & vehicle damage', to:'claim_motor' },
        { icon:'❤️', label:'Life / Personal Accident', hint:'Life & PA claims', to:'claim_life' },
        { icon:'🏠', label:'Property / Liability', hint:'Fire, burglary & liability', to:'claim_property' },
      ],
    },
    claim_health: {
      crumb: 'Health claim', parent: 'claim_type',
      bot: ['For a health claim: keep your policy number, hospital bills and discharge summary ready.', "For cashless treatment, ask the hospital's insurance desk to raise a pre-authorisation request quoting your policy number — our claims desk supports you end to end."],
      links: [{ href:TEL, label:'📞 Call the claims desk' }, { href:'contact.html', label:'Message our claims team →' }],
      options: [],
    },
    claim_motor: {
      crumb: 'Motor claim', parent: 'claim_type',
      bot: ["For a motor claim: note the FIR (if applicable), photograph the damage, and don't get the vehicle repaired before it's surveyed.", 'Call us right after the incident — our team helps arrange the surveyor and coordinates with the garage.'],
      links: [{ href:TEL, label:'📞 Call the claims desk' }, { href:'contact.html', label:'Message our claims team →' }],
      options: [],
    },
    claim_life: {
      crumb: 'Life / PA claim', parent: 'claim_type',
      bot: 'For a life or personal accident claim, our claims desk guides the nominee through documentation — death certificate, policy documents and a claim form. We handle the paperwork with care.',
      links: [{ href:TEL, label:'📞 Call the claims desk' }, { href:'contact.html', label:'Message our claims team →' }],
      options: [],
    },
    claim_property: {
      crumb: 'Property claim', parent: 'claim_type',
      bot: 'For property, fire, burglary or liability claims, report the loss as soon as it is safe to do so — early notice helps the surveyor assess damage accurately. Our claims desk handles the insurer coordination for you.',
      links: [{ href:TEL, label:'📞 Call the claims desk' }, { href:'contact.html', label:'Message our claims team →' }],
      options: [],
    },
    products_menu: {
      crumb: 'Explore products', parent: 'root',
      bot: 'We deal in two categories — General Insurance and Life & Employee Benefits. Which would you like to explore?',
      options: [
        { icon:'🏭', label:'General Insurance', hint:'Property, liability, marine, motor', to:'products_general' },
        { icon:'👥', label:'Life & Benefits', hint:'Health, life, accident, wellness', to:'products_life' },
      ],
    },
    products_general: {
      crumb: 'General insurance', parent: 'products_menu',
      bot: ['Under General Insurance we place: Fire, Industrial All-Risk, Burglary, Office Package, Marine Cargo, and Motor & Fleet cover.', 'On the liability side: Directors & Officers, Professional Indemnity, Cyber, Crime, Errors & Omissions, and Public Liability — plus StartupSecure, a bundled stack for SaaS and fintech teams.'],
      links: [{ href:'general.html', label:'See all general cover →' }],
      options: [],
    },
    products_life: {
      crumb: 'Life & benefits', parent: 'products_menu',
      bot: 'Under Life & Benefits: Group Health, Group Term Life, Personal Accident, Super Top-up (health cover up to ₹20L), Wellness (tele-consults & health checks), and Flexible Benefits (tax-saving multi-wallet cards).',
      links: [{ href:'life.html', label:'See the full benefits kit →' }],
      options: [],
    },
    about_rexa: {
      crumb: 'About Rexa', parent: 'root',
      bot: ['Rexa Insurance Broking Services is an IRDA-licensed direct broker (No. 611), based in Chennai and placing risk since 2017.', 'We work across 11+ insurer partners and 17 industries, with a 24×7 claims desk. As brokers, we work for you — not any single insurer.'],
      links: [{ href:'about.html', label:'More about Rexa →' }],
      options: [{ icon:'👔', label:"Who's on the leadership team?", hint:'Meet our KMPs', to:'about_team' }],
    },
    about_team: {
      crumb: 'Leadership', parent: 'about_rexa',
      bot: 'Our leadership brings 35+ years each from HDFC ERGO, Oriental Insurance, government service and more — R. Chitra (Director & Principal Officer), N. Ravichandran (Founder), Manish Chavan and Mahendran (Operations Head).',
      links: [{ href:'about.html#team', label:'Meet the team →' }],
      options: [],
    },
    contact_advisor: {
      crumb: 'Talk to an advisor', parent: 'root',
      bot: [
        "📍 <b>Head Office (Chennai)</b><br>G4, Swathi Court, 22/43 Vijayaraghava Road, T Nagar, Chennai – 600017",
        "📞 +91 44 4867 8884 · +91 7540 071535",
        "📍 <b>Branch (Bangalore)</b><br>2nd Floor, 409, ITI Layout 3rd Phase, Phase 3, Nayanda Halli, Bengaluru, Karnataka 560039",
        "📞 +91 9986 969637 · +91 9945 509306",
        "✉️ <b>Email:</b> info@rexabroking.com | <b>Claims Helpline (24×7):</b> 7009670090"
      ],
      links: [
        { href:TEL, label:'📞 Call Chennai Head Office' },
        { href:'tel:+919945509306', label:'📞 Call Bangalore Branch' },
        { href:'tel:+917009670090', label:'📞 Claims Helpline (24×7)' },
        { href:MAIL, label:'✉️ Email us' },
        { href:'contact.html', label:'📝 Fill contact form →' },
      ],
      options: [],
    },
    fallback: {
      crumb: 'Search results', parent: 'root',
      bot: "I didn't quite catch that — but here's what I can help with right now:",
      options: [
        { icon:'🎧', label:'Talk to a human advisor', to:'contact_advisor' },
      ],
    },
  };

  /* ---- Free-text keyword routing (checked in order, first match wins) ---- */
  const KEYWORDS = [
    { to: 'offers',            words: ['offer', 'offers', 'discount', 'deal', 'promo', 'coupon', 'sale', 'cashback'] },
    { to: 'claim_health',      words: ['health claim', 'medical claim', 'hospital bill', 'cashless'] },
    { to: 'claim_motor',       words: ['motor claim', 'car accident', 'vehicle claim', 'accident claim', 'car claim', 'bike claim'] },
    { to: 'claim_life',        words: ['life claim', 'death claim', 'nominee', 'personal accident claim'] },
    { to: 'claim_property',    words: ['property claim', 'fire claim', 'burglary claim', 'theft claim'] },
    { to: 'claim_type',        words: ['claim', 'file a claim', 'how to claim'] },
    { to: 'contact_advisor',   words: ['check my policy', 'policy status', 'is my policy active', 'check policy', 'renew'] },
    { to: 'products_life',     words: ['health insurance', 'life insurance', 'term life', 'employee benefit', 'group health', 'wellness', 'personal accident'] },
    { to: 'products_general',  words: ['general insurance', 'fire insurance', 'marine', 'motor insurance', 'liability', 'cyber insurance', 'property insurance'] },
    { to: 'products_menu',     words: ['product', 'what do you offer', 'what do you cover', 'services'] },
    { to: 'about_team',        words: ['leadership', 'founder', 'ceo', 'principal officer'] },
    { to: 'about_rexa',        words: ['about', 'who are you', 'license', 'irda', 'company'] },
    { to: 'contact_advisor',   words: ['contact', 'phone number', 'email', 'talk to someone', 'human', 'advisor', 'agent', 'address', 'office', 'call'] },
  ];

  function routeFreeText(text) {
    const t = text.toLowerCase();
    for (const k of KEYWORDS) { if (k.words.some(w => t.includes(w))) return k.to; }
    return 'fallback';
  }

  /* ---- Dynamic (data-driven) nodes for offers ---- */
  function buildDynamicNode(id) {
    if (id === 'offers') {
      const live = activeOffers();
      if (!live.length) {
        return {
          crumb: 'Offers', parent: 'root',
          bot: ["No themed offers are running this week — but our advisors always negotiate the best available premium for you, every time.", "Want me to connect you with an advisor?"],
          links: [{ href:'contact.html', label:'Talk to an advisor →' }],
          options: [],
        };
      }
      return {
        crumb: "Today's offers", parent: 'root',
        bot: live.length === 1
          ? "Here's what's running right now 🎉 Tap it for the details:"
          : `We've got ${live.length} offers live right now 🎉 Tap any to see the details:`,
        options: live.map(o => ({ icon:o.icon, label:o.title, hint:o.short, badge:o.badge, to:'offer:'+o.id })),
      };
    }
    if (id.slice(0, 6) === 'offer:') {
      const o = OFFERS.find(x => x.id === id.slice(6));
      if (!o || !offerLive(o)) {
        return {
          crumb: 'Offer ended', parent: 'offers',
          bot: "Sorry — that offer has wrapped up. Here's what else we can do for you:",
          links: [{ href:'contact.html', label:'Talk to an advisor →' }],
          options: [],
        };
      }
      return { crumb: o.title, parent: 'offers', bot: o.lines, links: o.links, options: [] };
    }
    return null;
  }

  function resolve(id) { return buildDynamicNode(id) || TREE[id] || null; }

  // Root gets a proactive offer mention + an "offers" card when something is live
  function decorateRoot(node) {
    const live = activeOffers();
    if (!live.length) return node;
    const clone = Object.assign({}, node);
    clone.bot = (Array.isArray(node.bot) ? node.bot.slice() : [node.bot]);
    clone.promo = {
      title: `Limited-time offer${live.length === 1 ? '' : 's'}`,
      text: live[0].teaser,
    };
    clone.options = [
      { icon:'🎉', label:"Today's offers", hint:`${live.length} live right now`, badge:'New', to:'offers' },
      ...node.options,
    ];
    return clone;
  }

  function crumbTrail(id) {
    const trail = [];
    let cur = id, guard = 0;
    while (cur && guard++ < 12) {
      const n = resolve(cur);
      if (!n) break;
      trail.unshift({ id: cur, label: n.crumb || cur });
      cur = n.parent;
    }
    return trail;
  }

  /* ---- Build widget markup ---- */
  const FACE = '<span class="roh-face"><img src="assets/raksha-avatar-face.png" alt="Raksha" class="roh-face-img"></span>';
  const LAUNCHER_FIGURE = '<img src="assets/raksha-avatar.png" alt="Raksha" class="roh-launcher-img">';
  const wrap = document.createElement('div');
  wrap.id = 'rohiniWidget';
  const liveOffers = activeOffers();
  const teaserText = liveOffers.length
    ? `🎉 Offer alert! ${liveOffers[0].teaser} Tap to see.`
    : "Hi, I'm Raksha 👋 Need help finding the right cover?";
  wrap.innerHTML = `
    <button class="roh-teaser" id="rohTeaser">${teaserText}</button>
    <button class="roh-launcher" id="rohLauncher" aria-label="Ask Raksha">
      ${LAUNCHER_FIGURE}
      <span class="roh-launcher-dot"></span>
      ${liveOffers.length ? '<span class="roh-launcher-badge">🎁</span>' : ''}
    </button>`;
  document.body.appendChild(wrap);

  const overlay = document.createElement('div');
  overlay.className = 'roh-overlay';
  overlay.id = 'rohOverlay';
  overlay.innerHTML = `
    <div class="roh-modal" role="dialog" aria-label="Raksha — Rexa assistant">
      <div class="roh-modal-head">
        ${FACE}
        <div class="roh-mh-info">
          <div class="roh-mh-name">Raksha</div>
          <div class="roh-mh-sub"><span class="dot"></span>Rexa Assistant · Here to give you suraksha</div>
        </div>
        <div class="roh-mh-actions">
          <button id="rohHome" aria-label="Start over" title="Start over">⌂</button>
          <button id="rohModalClose" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="roh-crumbs" id="rohCrumbs"></div>
      <div class="roh-modal-body" id="rohBody"></div>
      <div class="roh-inputrow">
        <input type="text" id="rohInput" maxlength="180" placeholder="Or just type what you're looking for…" autocomplete="off">
        <button class="roh-send" id="rohSend" aria-label="Send">➤</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const launcher = wrap.querySelector('#rohLauncher');
  const teaser = wrap.querySelector('#rohTeaser');
  const body = overlay.querySelector('#rohBody');
  const crumbsBox = overlay.querySelector('#rohCrumbs');
  const closeBtn = overlay.querySelector('#rohModalClose');
  const homeBtn = overlay.querySelector('#rohHome');
  const input = overlay.querySelector('#rohInput');
  const sendBtn = overlay.querySelector('#rohSend');
  const faces = () => document.querySelectorAll('.roh-face');

  function setTalking(on) { faces().forEach(f => f.classList.toggle('talking', on)); }

  // Dismissible promo banner state (persists for the session)
  let promoDismissed = false;
  try { promoDismissed = sessionStorage.getItem('rexa_rohini_promo_x') === '1'; } catch (e) {}

  function renderCrumbs(id) {
    const trail = crumbTrail(id);
    crumbsBox.innerHTML = trail.map((c, i) => {
      const isLast = i === trail.length - 1;
      const sep = i > 0 ? '<span class="sep">›</span>' : '';
      return isLast
        ? `${sep}<span class="cur">${c.label}</span>`
        : `${sep}<button data-to="${c.id}">${c.label}</button>`;
    }).join('');
    crumbsBox.querySelectorAll('button[data-to]').forEach(b => {
      b.addEventListener('click', () => goTo(b.dataset.to));
    });
  }

  function goTo(id, queryTag) {
    let node = resolve(id) || TREE.fallback;
    if (id === 'root') node = decorateRoot(node);
    renderCrumbs(id);
    setTalking(true);
    body.innerHTML = `<div class="roh-botrow"><span class="roh-avatar">${FACE}</span><div class="roh-bubbles"><div class="roh-bubble roh-typing"><span></span><span></span><span></span></div></div></div>`;
    body.scrollTop = 0;

    const lines = Array.isArray(node.bot) ? node.bot : [node.bot];
    const delay = 400 + Math.min(lines.join(' ').length * 5, 500);

    setTimeout(() => {
      setTalking(false);
      const step = document.createElement('div');
      step.className = 'roh-step';

      let html = '';
      // Dismissible promotional banner, pinned above the conversation
      if (node.promo && !promoDismissed) {
        html += `<div class="roh-promo" id="rohPromo">
            <span class="roh-promo-ic">🎉</span>
            <div class="roh-promo-txt"><span class="roh-promo-title">${node.promo.title}</span><span class="roh-promo-sub">${node.promo.text}</span></div>
            <button class="roh-promo-cta" data-to="offers" type="button">See offer <span class="arr">→</span></button>
            <button class="roh-promo-x" type="button" aria-label="Dismiss offer">✕</button>
          </div>`;
      }
      // User's typed question shown as a sent (right-aligned) chat bubble
      if (queryTag) html += `<div class="roh-user"><span class="roh-user-bubble">${queryTag}</span></div>`;

      // Bot reply — avatar + one bubble per line, then any links/cards, all in the chat column
      let convo = lines.map((l, i) => `<div class="roh-bubble" style="animation-delay:${i * 90}ms">${l}</div>`).join('');

      if (node.links && node.links.length) {
        convo += `<div class="roh-links">${node.links.map(l =>
          `<a href="${l.href}" ${l.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${l.label}</a>`
        ).join('')}</div>`;
      }
      if (node.options && node.options.length) {
        convo += `<div class="roh-cards">${node.options.map((o, i) =>
          `<button class="roh-card${o.badge ? ' has-badge' : ''}" data-idx="${i}">${o.badge ? `<span class="roh-badge">${o.badge}</span>` : ''}<span class="ic">${o.icon || '💬'}</span><span class="ttl">${o.label}</span>${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</button>`
        ).join('')}</div>`;
      }

      html += `<div class="roh-botrow"><span class="roh-avatar">${FACE}</span><div class="roh-bubbles">${convo}</div></div>`;
      step.innerHTML = html;
      body.innerHTML = '';
      body.appendChild(step);

      step.querySelectorAll('.roh-card').forEach(b => {
        b.addEventListener('click', () => {
          step.querySelectorAll('.roh-card').forEach(x => x.disabled = true);
          goTo(node.options[+b.dataset.idx].to);
        });
      });

      const promoEl = step.querySelector('#rohPromo');
      if (promoEl) {
        promoEl.querySelector('.roh-promo-x').addEventListener('click', () => {
          promoDismissed = true;
          try { sessionStorage.setItem('rexa_rohini_promo_x', '1'); } catch (e) {}
          promoEl.classList.add('closing');
          setTimeout(() => promoEl.remove(), 260);
        });
        promoEl.querySelector('.roh-promo-cta').addEventListener('click', e => goTo(e.currentTarget.dataset.to));
      }
    }, delay);
  }

  /* ---- Open / close ---- */
  function openModal() {
    document.body.classList.add('roh-open');
    teaser.classList.remove('show');
    try { sessionStorage.setItem('rexa_rohini_seen', '1'); } catch (e) {}
    if (!body.children.length) goTo('root');
    setTimeout(() => input.focus(), 260);
  }
  function closeModal() { document.body.classList.remove('roh-open'); }

  launcher.addEventListener('click', openModal);
  teaser.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  homeBtn.addEventListener('click', () => goTo('root'));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('roh-open')) closeModal(); });

  function submitText() {
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    goTo(routeFreeText(val), val);
  }
  sendBtn.addEventListener('click', submitText);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitText(); });

  /* ---- One-time nudge bubble (offer promo takes priority) ---- */
  let seen = false, offerNudged = false;
  try { seen = sessionStorage.getItem('rexa_rohini_seen') === '1'; } catch (e) {}
  try { offerNudged = sessionStorage.getItem('rexa_rohini_offernudge') === '1'; } catch (e) {}
  const shouldNudge = liveOffers.length ? !offerNudged : !seen;
  if (shouldNudge) {
    setTimeout(() => {
      if (!document.body.classList.contains('roh-open')) teaser.classList.add('show');
      if (liveOffers.length) { try { sessionStorage.setItem('rexa_rohini_offernudge', '1'); } catch (e) {} }
    }, 3200);
  }

  /* ---- Auto-open once the visitor has genuinely scrolled through the page ---- */
  const SCROLL_TRIGGER = 0.35;
  let scrollArmed = true;
  window.addEventListener('scroll', () => {
    if (!scrollArmed) return;
    let shown = false;
    try { shown = sessionStorage.getItem('rexa_rohini_autoshown') === '1'; } catch (e) {}
    if (shown || document.body.classList.contains('roh-open')) { scrollArmed = false; return; }
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    if (window.scrollY / scrollable >= SCROLL_TRIGGER) {
      scrollArmed = false;
      try { sessionStorage.setItem('rexa_rohini_autoshown', '1'); } catch (e) {}
      openModal();
    }
  }, { passive: true });

  // Populate promo bar with active offers
  updatePromoBar();
}

// Initialize Raksha
initOffers();
