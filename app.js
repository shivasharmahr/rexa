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

// Scroll reveal is handled by the shared motion system (assets/motion.js + assets/motion.css).

// Interactive Solution Matrix — tabbed panels (Corporate / Benefits / Wellness & Retail)
(function solutionMatrix(){
  const tabs = document.querySelectorAll('.matrix-tab');
  const panels = document.querySelectorAll('.matrix-panel');
  if (!tabs.length) return;

  function activate(name) {
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.tab)));

  // Deep link support: /#solutions-wellness, /#solutions-retail, /#solutions-benefits, /#solutions-corporate
  const hash = window.location.hash.replace('#solutions-', '');
  if (['corporate', 'benefits', 'wellness', 'retail'].includes(hash)) {
    activate(hash === 'retail' ? 'wellness' : hash);
    document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();

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


/* Raksha (the on-site assistant) now lives in assets/raksha.js + assets/raksha.css and loads on every page. */

// Bio Modal functionality
(function initBioModal() {
  const modal = document.getElementById('bioModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.bio-modal-close');
  const readMoreButtons = document.querySelectorAll('.team-read-more');

  const openBio = (bioId) => {
    document.querySelectorAll('.bio-content').forEach(el => el.style.display = 'none');
    const bioContent = document.getElementById('bio' + bioId);
    if (bioContent) {
      bioContent.style.display = 'block';
      modal.classList.add('open');
    }
  };

  const closeBio = () => {
    modal.classList.remove('open');
  };

  readMoreButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const bioId = btn.closest('[data-bio]')?.getAttribute('data-bio');
      if (bioId === 'manish') openBio('Manish');
      if (bioId === 'sathya') openBio('Sathya');
    });
  });

  closeBtn.addEventListener('click', closeBio);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeBio();
  });
})();
