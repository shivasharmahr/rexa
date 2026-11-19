/* ==========================================================================
   Raksha — Rexa's on-site assistant   (pairs with assets/raksha.css)
   - Self-contained: injects its own markup, works on every page, never throws
     into other page scripts.
   - Runs entirely in the browser. Nothing typed into the chat is sent anywhere.
     (Analytics, if present, only ever receives a topic id — never free text.)
   - Knowledge below mirrors the live site copy. Only state what the site says.
   ========================================================================== */
(function () {
  'use strict';

  // Resolve asset/offers URLs from this script's own location so it works from any route.
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var BASE = SRC ? SRC.replace(/[^\/]*$/, '') : '/assets/';
  function assetUrl(name) { return BASE + name; }
  function offersUrl() { try { return new URL('../offers.json', BASE).href; } catch (e) { return '/offers.json'; } }

  /* ---- Safe analytics wrapper (window.rexaTrack is optional) ---- */
  function track(name, params) { try { window.rexaTrack && window.rexaTrack(name, params || {}); } catch (e) {} }

  function store(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) {} }
    };
  }
  var session = store('sessionStorage');

  /* ======================================================================
     Personas: who is Raksha helping? Chosen in the chat (or confirmed from the page the
     visitor is on), remembered in this browser only (30 days), never sent anywhere.
     ====================================================================== */
  var PERSONA_KEY = 'rexa_raksha_persona_v1';
  var PERSONA_TTL = 30 * 24 * 60 * 60 * 1000;
  // label = picker title, hint = one-line description, as = reads naturally after "as" / "continue as"
  var PERSONAS = {
    biz:     { label: 'Business owner',       as: 'a business owner',            hint: 'Protect your company and assets',   icon: '🏭' },
    hr:      { label: 'HR or people team',    as: 'an HR or people team member', hint: 'Employee benefits and wellness',    icon: '👥' },
    fam:     { label: 'Individual or family', as: 'an individual or family',     hint: 'Health, motor, travel and home',    icon: '👨‍👩‍👧' },
    cust:    { label: 'Existing customer',    as: 'an existing customer',        hint: 'Claims, renewals and support',      icon: '🎧' },
    explore: { label: 'Just exploring',       as: 'someone just exploring',      hint: 'See everything we offer',           icon: '🔍' }
  };
  var PERSONA_ORDER = ['biz', 'hr', 'fam', 'cust', 'explore'];
  // Page the visitor is on -> topic name, likely persona, and a relevant nudge (real topics only)
  var PAGE_CTX = {
    'corporate-risk':     { topic: 'Corporate Risk', persona: 'biz', teaser: 'Questions on directors’ liability or cyber cover? I’m happy to help.' },
    'employee-benefits':  { topic: 'Employee Benefits', persona: 'hr', teaser: 'Setting up group health for your team? I can guide you.' },
    'wellness-and-value': { topic: 'Wellness and Value', persona: 'hr', teaser: 'Planning a wellness programme for your team? I can help.' },
    'retail-insurance':   { topic: 'Personal and Family Cover', persona: 'fam', teaser: 'Choosing health or motor cover? I can help you compare.' },
    'contact':            { topic: 'the Contact page', persona: 'cust', teaser: 'Not sure who to speak to? I’ll point you to the right person.' },
    'grievance':          { topic: 'the Grievance page', persona: 'cust', teaser: 'Need to raise or escalate a concern? I’ll guide you through it.' }
  };
  var DEFAULT_TEASER = "Hello, I’m Raksha. How may I help you today?";
  function pageCtx() {
    var seg = '';
    try { seg = (location.pathname || '').replace(/\/+$/, '').split('/').pop().replace(/\.html$/i, '').toLowerCase(); } catch (e) {}
    return PAGE_CTX[seg] || null;
  }
  var personaMem = null; // survives blocked storage for this page view
  function personaRead() {
    var raw = null;
    try { raw = window.localStorage.getItem(PERSONA_KEY); } catch (e) {}
    if (!raw) { try { raw = window.sessionStorage.getItem(PERSONA_KEY); } catch (e2) {} }
    var o = null;
    if (raw) { try { o = JSON.parse(raw); } catch (e3) { o = null; } }
    if (!o) o = personaMem;
    if (!o || !PERSONAS[o.p] || typeof o.t !== 'number' || Date.now() - o.t > PERSONA_TTL) return null;
    return o;
  }
  function personaWrite(p) {
    var o = { p: p, t: Date.now() }, raw = JSON.stringify(o);
    personaMem = o;
    try { window.localStorage.setItem(PERSONA_KEY, raw); } catch (e) {}
    try { window.sessionStorage.setItem(PERSONA_KEY, raw); } catch (e2) {}
  }
  function personaClear() {
    personaMem = null;
    try { window.localStorage.removeItem(PERSONA_KEY); } catch (e) {}
    try { window.sessionStorage.removeItem(PERSONA_KEY); } catch (e2) {}
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function init() {
    if (document.getElementById('rohiniWidget')) return; // exactly one widget per page

    /* ======================================================================
       Knowledge
       ====================================================================== */
    var CLAIMS_TEL = 'tel:+917009670090';
    var CLAIMS_LINE = '<b>24×7 claims helpline:</b> 7009 670 090';
    var HELP_LINE = 'Keep your policy number and a short description of what happened ready when you call.';
    var claimLinks = [
      { href: CLAIMS_TEL, label: 'Call our claims helpline', primary: true },
      { href: '/contact?interest=claims&from=raksha', label: 'Message our claims team' }
    ];
    function claimNode(crumb, lines) {
      return {
        crumb: crumb, parent: 'claim_type',
        bot: lines.concat([CLAIMS_LINE + '<br>' + HELP_LINE]),
        links: claimLinks,
        options: [{ icon: '📝', label: 'Unhappy with an outcome?', hint: 'How to raise a complaint', to: 'grievance' }]
      };
    }
    function product(crumb, parent, lines, href, linkLabel, extra) {
      var links = [{ href: href, label: linkLabel }];
      if (extra) links = links.concat(extra);
      return { crumb: crumb, parent: parent, bot: lines, links: links, options: [], closing: true };
    }
    var GAP = { href: '/corporate-risk#benchmark', label: 'Request a gap analysis', primary: true };
    var PLAN = { href: '/employee-benefits#design-plan', label: 'Design a benefits plan', primary: true };
    var WELL = { href: '/wellness-and-value#upgrade-plan', label: 'Consult a wellness expert →', primary: true };
    var QUOTE = { href: '/retail-insurance#get-quote', label: 'Request a callback', primary: true };
    // keys understood by contact.html: corporate, benefits, wellness, retail, claims, policy-review, general
    function ADV(key, primary) { return { href: '/contact?interest=' + key + '&from=raksha', label: 'Speak to an advisor', primary: !!primary }; }
    var CLOSING = 'Is there anything else I can help you with?';
    var persona = null; // who Raksha is helping right now (see PERSONAS)

    var TREE = {
      root: {
        crumb: 'Home',
        bot: ['What would you like to look at?'],
        options: [
          { icon: '🛡️', label: 'Explore our cover', hint: 'Business, benefits and personal', to: 'products_menu' },
          { icon: '🚨', label: 'Claims help', hint: '24×7 claims helpline', to: 'claim_type' },
          { icon: '🔍', label: 'Review my policy', hint: 'Free, confidential gap analysis', to: 'audit' },
          { icon: '🎧', label: 'Speak to an advisor', hint: 'Call, email or message us', to: 'contact_advisor' },
          { icon: '🏢', label: 'About Rexa', hint: 'Who we are', to: 'about_rexa' },
          { icon: '📝', label: 'Raise a complaint', hint: 'How to raise and escalate', to: 'grievance' }
        ]
      },

      products_menu: {
        crumb: 'Our cover', parent: 'root',
        bot: ['Which area would you like to explore?'],
        options: [
          { icon: '🏭', label: 'Corporate risk', hint: 'Assets, liability and cyber', to: 'corp_menu' },
          { icon: '👥', label: 'Employee benefits', hint: 'Group health, accident and life', to: 'ben_menu' },
          { icon: '💚', label: 'Wellness programmes', hint: 'Health camps, ambulance and more', to: 'well_menu' },
          { icon: '👨‍👩‍👧', label: 'Personal and family', hint: 'Health, motor, travel and home', to: 'retail_menu' }
        ]
      },

      /* ---- Corporate risk & liability ---- */
      corp_menu: {
        crumb: 'Corporate risk', parent: 'products_menu',
        bot: ['Rexa underwrites bespoke Property, Liability and Cyber structures for complex businesses. Pick a cover to see what it does:'],
        links: [{ href: '/corporate-risk', label: 'See all corporate cover →' }],
        options: [
          { icon: '👔', label: 'Directors & Officers (D&O)', to: 'corp_do' },
          { icon: '💻', label: 'Cyber liability', to: 'corp_cyber' },
          { icon: '✍️', label: 'Professional indemnity', to: 'corp_pi' },
          { icon: '🔥', label: 'Fire & asset protection', to: 'corp_fire' },
          { icon: '🚢', label: 'Marine & transit', to: 'corp_marine' },
          { icon: '🏗️', label: 'Engineering risk', to: 'corp_eng' }
        ]
      },
      corp_do: product('D&O', 'corp_menu',
        ['<b>Directors & Officers (D&O)</b> protects your board and leadership from personal financial loss arising from shareholder suits, regulatory investigations and management errors — including legal defence costs and regulatory fines.'],
        '/corporate-risk#directors-officers', 'D&O details →', [GAP]),
      corp_cyber: product('Cyber liability', 'corp_menu',
        ['<b>Cyber Liability</b> covers the financial fallout of data breaches, ransomware extortion and the resulting business interruption — including extortion payments and incident response costs.'],
        '/corporate-risk#cyber-liability', 'Cyber details →', [GAP]),
      corp_pi: product('Professional indemnity', 'corp_menu',
        ['<b>Professional Indemnity</b> defends against client claims of negligence, errors or omissions in the professional or technology services you provide — including breach of contract and IP infringement.'],
        '/corporate-risk#professional-indemnity', 'Professional indemnity details →', [GAP]),
      corp_fire: product('Fire & assets', 'corp_menu',
        ['<b>Fire & Asset Protection</b> safeguards infrastructure, inventory and equipment against fire, natural disasters (earthquakes, floods) and riots — including plant & machinery.',
         'Business interruption (FLOP) is typically an add-on or a separate policy rather than part of a standard fire policy — an advisor can structure it for you.'],
        '/corporate-risk#fire-assets', 'Fire & asset details →', [GAP]),
      corp_marine: product('Marine & transit', 'corp_menu',
        ['<b>Marine & Transit</b> protects goods in transit — inland, air and overseas — against damage, theft and jettison, with open marine cover and inland transit options.'],
        '/corporate-risk#marine', 'Marine details →', [GAP]),
      corp_eng: product('Engineering risk', 'corp_menu',
        ['<b>Engineering Risk</b> cover is tailored to complex infrastructure projects, construction sites and machinery breakdown — including Contractor\'s All Risk (CAR) and Erection All Risk (EAR).'],
        '/corporate-risk#engineering', 'Engineering details →', [GAP]),

      /* ---- Employee benefits ---- */
      ben_menu: {
        crumb: 'Employee benefits', parent: 'products_menu',
        bot: ["Modular cover designed to protect your people — with dedicated, human-led claims support so your HR team isn't left chasing."],
        links: [{ href: '/employee-benefits', label: 'See the benefits portfolio →' }],
        options: [
          { icon: '🏥', label: 'Group health (GMC)', hint: 'Hospitalisation cover for your team', to: 'ben_gmc' },
          { icon: '🛟', label: 'Group personal accident (GPA)', hint: 'Accidental death & disability', to: 'ben_gpa' },
          { icon: '❤️', label: 'Term life & super top-ups', hint: 'Family security & higher limits', to: 'ben_life' },
          { icon: '💚', label: 'Wellness programmes', hint: 'Health camps, telemedicine & more', to: 'well_menu' }
        ]
      },
      ben_gmc: product('Group health', 'ben_menu',
        ['<b>Group Health (GMC)</b> is customised hospitalisation cover with access to network hospitals. Features include Day-1 pre-existing disease cover, maternity & newborn cover and dependent-parent inclusion.',
         'A GMC policy typically needs a minimum group of around 7–10 employees, depending on the insurer — we help smaller teams find the right entry point.'],
        '/employee-benefits#group-health', 'Group health details →', [PLAN]),
      ben_gpa: product('Group accident', 'ben_menu',
        ['<b>Group Personal Accident (GPA)</b> gives employees worldwide, 24×7 financial protection against accidents — accidental death benefit, permanent total/partial disability and loss-of-income replacement.'],
        '/employee-benefits#group-accident', 'GPA details →', [PLAN]),
      ben_life: product('Term life & top-ups', 'ben_menu',
        ['<b>Group Term Life (GTL)</b> provides financial security for your employees\' families, with a corporate buffer for critical illness.',
         '<b>Voluntary super top-ups</b> let the company provide a base cover while employees choose to pay a small premium to raise their own limit.'],
        '/employee-benefits#term-life', 'Term life details →', [PLAN]),

      /* ---- Wellness & value additions ---- */
      well_menu: {
        crumb: 'Wellness', parent: 'products_menu',
        bot: ['Rexa builds proactive health programmes into your benefits to keep teams healthy and manage long-term premium costs. Which are you curious about?'],
        links: [{ href: '/wellness-and-value', label: 'See wellness & value additions →' }],
        options: [
          { icon: '🏭', label: 'Occupational health centres', hint: 'OHC setup for campuses & plants', to: 'well_ohc' },
          { icon: '🚑', label: 'Ambulance services', hint: '24×7 emergency response', to: 'well_amb' },
          { icon: '🩺', label: 'Health camps', hint: 'On-site screenings & check-ups', to: 'well_camp' },
          { icon: '🧠', label: 'Mental wellness', hint: 'Counselling & support', to: 'well_mind' },
          { icon: '📱', label: 'Telemedicine', hint: '24/7 digital doctor access', to: 'well_tele' }
        ]
      },
      well_ohc: product('OHC setup', 'well_menu',
        ['<b>Occupational Health Centres</b> are on-site or partner facilities for preventive care and screenings. Large manufacturing units can be legally required to have one — Rexa helps design the infrastructure, source medical equipment and provide certified staff.'],
        '/wellness-and-value', 'Wellness details →', [WELL]),
      well_amb: product('Ambulance services', 'well_menu',
        ['<b>24×7 emergency ambulance services</b> for rapid medical response and safe transport to hospital. Dedicated ambulance retainers may involve specialised vendor fees, which we negotiate on your behalf.'],
        '/wellness-and-value', 'Wellness details →', [WELL]),
      well_camp: product('Health camps', 'well_menu',
        ['<b>Health camps</b> bring awareness campaigns and on-site medical camps — annual check-ups, eye and dental clinics — to promote preventive health and screenings.',
         'Standard check-up camps can often be negotiated into your Group Mediclaim base premium as value-adds.'],
        '/wellness-and-value', 'Wellness details →', [WELL]),
      well_mind: product('Mental wellness', 'well_menu',
        ['<b>Mental wellness programmes</b> offer confidential counselling, stress management and emotional-support services for employee well-being and resilience.'],
        '/wellness-and-value', 'Wellness details →', [WELL]),
      well_tele: product('Telemedicine', 'well_menu',
        ['<b>Telemedicine</b> gives employees 24/7 digital access to certified doctors for minor ailments, alongside their group health cover.'],
        '/employee-benefits', 'Employee benefits →', [WELL]),

      /* ---- Personal & family ---- */
      retail_menu: {
        crumb: 'Personal & family', parent: 'products_menu',
        bot: ['For individuals and families we compare policies across insurers, and a dedicated claims advocate is there if a dispute arises. What do you want to protect?'],
        links: [{ href: '/retail-insurance', label: 'See personal cover →' }],
        options: [
          { icon: '❤️‍🩹', label: 'Health insurance', hint: 'Self & family', to: 'ret_health' },
          { icon: '🚗', label: 'Motor insurance', hint: 'Car & two-wheeler', to: 'ret_motor' },
          { icon: '✈️', label: 'Travel insurance', hint: 'Domestic & international', to: 'ret_travel' },
          { icon: '🏠', label: 'Home insurance', hint: 'Property & contents', to: 'ret_home' },
          { icon: '🛟', label: 'Personal accident', hint: 'Accidental death & disability', to: 'ret_pa' },
          { icon: '☀️', label: 'Rooftop solar & loan protect', hint: 'Specialised home covers', to: 'ret_solar' }
        ]
      },
      ret_health: {
        crumb: 'Health insurance', parent: 'retail_menu',
        bot: ['<b>Health insurance</b> gives individuals and families comprehensive medical cover against rising healthcare costs, with cashless hospitalisation networks.',
              'A <b>Family Floater</b> covers you, your spouse, dependent children (and sometimes parents) under one shared sum insured for a single premium. You can also port an existing health policy without losing benefits such as waiting-period credits.'],
        links: [{ href: '/retail-insurance#health', label: 'Compare health plans →' }, QUOTE],
        options: [{ icon: '👥', label: 'Cover for my employees instead?', hint: 'Group health (GMC)', to: 'ben_gmc' }]
      },
      ret_motor: product('Motor insurance', 'retail_menu',
        ['<b>Motor insurance</b> covers mandatory third-party liability and comprehensive own-damage for your car or two-wheeler, with add-ons such as zero depreciation available.'],
        '/retail-insurance#motor', 'Get a motor quote →', [QUOTE]),
      ret_travel: product('Travel insurance', 'retail_menu',
        ['<b>Travel insurance</b> secures domestic or international trips against flight delays, lost baggage and sudden medical emergencies abroad.'],
        '/retail-insurance#travel', 'Explore travel covers →', [QUOTE]),
      ret_home: product('Home insurance', 'retail_menu',
        ['<b>Home insurance</b> protects your property and valuable contents against fire, burglary, natural disasters and unforeseen damage.'],
        '/retail-insurance#home', 'Protect your home →', [QUOTE]),
      ret_pa: product('Personal accident', 'retail_menu',
        ['<b>Personal accident cover</b> provides financial stability for your family in the event of accidental death or permanent/partial disability.'],
        '/retail-insurance#personal-accident', 'View PA plans →', [QUOTE]),
      ret_solar: product('Rooftop solar & more', 'retail_menu',
        ['<b>Specialised covers</b> protect modern home investments such as rooftop solar panels, and include loan protection insurance.'],
        '/retail-insurance#rooftop-solar', 'See specialised covers →', [QUOTE]),

      /* ---- Claims ---- */
      claim_type: {
        crumb: 'Claims help', parent: 'root',
        bot: ["Sorry you need to make a claim — let's get it moving. Our dedicated in-house claims desk handles the paperwork and coordinates with the insurer. Which cover is it for?"],
        links: claimLinks,
        options: [
          { icon: '🏥', label: 'Health', hint: 'Hospital & medical', to: 'claim_health' },
          { icon: '🚗', label: 'Motor', hint: 'Accident & vehicle damage', to: 'claim_motor' },
          { icon: '🏭', label: 'Business property / liability', hint: 'Fire, marine, engineering, cyber', to: 'claim_business' },
          { icon: '❤️', label: 'Life / personal accident', hint: 'Life & accident', to: 'claim_life' }
        ]
      },
      claim_health: claimNode('Health claim', ['For a health claim, reach out as early as you can — ideally at or before admission to a network hospital — so we can help with the insurer and cashless process.']),
      claim_motor: claimNode('Motor claim', ['For a motor claim, tell us as soon as it is safe to do so. Our desk coordinates the insurer and the surveyor so you are not left chasing.']),
      claim_business: claimNode('Business claim', ['For fire, property, marine, engineering or liability losses, report the loss early. Our loss assessors manage the insurer, the surveyor and the paperwork so operations can resume quickly.']),
      claim_life: claimNode('Life / PA claim', ['For a life or personal accident claim, our claims desk guides you through the paperwork. Call us and we will walk you through what is needed.']),

      /* ---- Policy review ---- */
      audit: {
        crumb: 'Policy review', parent: 'root',
        bot: ['Hidden exclusions are the most expensive items on a balance sheet. Rexa runs deep-dive underwriting audits of existing contracts to spot underinsured assets and hidden exclusions in Cyber, D&O and Property covers.',
              'Share your current policies for a <b>free, confidential gap analysis</b> and premium benchmark against the market.'],
        links: [GAP, PLAN, ADV('policy-review')],
        options: [], closing: true
      },

      /* ---- About ---- */
      about_rexa: {
        crumb: 'About Rexa', parent: 'root',
        bot: ['Rexa Insurance Broking Services is an IRDA-licensed direct broker (Licence No. 611 · Life & General), based in Chennai with a branch in Bengaluru, serving clients since 2017.',
              'As a broker we work for you — not any single insurer — and negotiate across 50+ leading insurers for the right cover at a fair premium.'],
        links: [{ href: '/about', label: 'More about Rexa →' }],
        options: [{ icon: '👔', label: "Who's on the leadership team?", hint: 'Our Key Management Persons', to: 'about_team' }]
      },
      about_team: {
        crumb: 'Leadership', parent: 'about_rexa',
        bot: ['Our Key Management Persons: <b>R. Chitra</b> (Director & Principal Officer), <b>N. Ravichandran</b> (Founder · Director), <b>Manish Chavan</b>, <b>Sathyanarayana K</b> and <b>V C Moulieswara Reddy</b>.'],
        links: [{ href: '/about#team', label: 'Meet the team →' }],
        options: []
      },

      /* ---- Contact, grievance, privacy ---- */
      contact_advisor: {
        crumb: 'Speak to an advisor', parent: 'root',
        bot: [
          '<b>Head Office (Chennai)</b><br>G4, Swathi Court, 22/43 Vijayaraghava Road, T Nagar, Chennai – 600017<br>+91 44 4867 8884 · +91 7540 071535',
          '<b>Branch (Bengaluru)</b><br>2nd Floor, 409, ITI Layout 3rd Phase, Phase 3, Nayanda Halli, Bengaluru, Karnataka 560039<br>+91 9986 969637',
          '<b>Email:</b> info@rexabroking.com<br>' + CLAIMS_LINE
        ],
        links: [
          { href: '/contact?interest=general&from=raksha', label: 'Request an advisory call', primary: true },
          { href: 'tel:+914448678884', label: 'Call Chennai' },
          { href: 'tel:+919986969637', label: 'Call Bengaluru' },
          { href: CLAIMS_TEL, label: 'Claims helpline' },
          { href: 'mailto:info@rexabroking.com', label: 'Email us' }
        ],
        options: [], closing: true
      },
      grievance: {
        crumb: 'Grievance', parent: 'root',
        bot: ['Raise it with us first — email <b>info@rexabroking.com</b> or call <b>+91 44 4867 8884</b>, quoting your policy or proposal number. We aim to acknowledge every complaint within <b>2 working days</b> and resolve it within <b>14 working days</b>.',
              "Still not satisfied? You can escalate to IRDAI's Bima Bharosa portal, the IRDAI Grievance Call Centre (155255 / 1800-4254-732) or the Insurance Ombudsman."],
        links: [
          { href: '/grievance', label: 'Full grievance process →', primary: true },
          { href: 'mailto:info@rexabroking.com', label: 'Email us' },
          { href: 'tel:+914448678884', label: 'Call us' }
        ],
        options: []
      },
      privacy: {
        crumb: 'Privacy', parent: 'root',
        bot: ['Our Privacy Policy explains what we collect and how it is used. This chat runs in your browser — what you type here is not sent to us.'],
        links: [{ href: '/privacy', label: 'Read the Privacy Policy →' }],
        options: []
      },
      fallback: {
        crumb: 'Not sure', parent: 'root',
        bot: ["I'm sorry, I don't have that information. An advisor will be glad to help."],
        links: [ADV('general', true)],
        options: [
          { icon: '🛡️', label: 'Explore our cover', to: 'products_menu' },
          { icon: '🚨', label: 'Claims help', to: 'claim_type' },
          { icon: '🎧', label: 'Contact details', to: 'contact_advisor' }
        ]
      }
    };


    /* ======================================================================
       Persona flow: picker -> intent -> recommendations. Every cover named here already
       exists on the site; the one-line "why" text paraphrases the site's own copy.
       ====================================================================== */
    function pOpt(icon, label, hint, to, intent) { return { icon: icon, label: label, hint: hint, to: to, intent: intent }; }
    var INTENTS = {
      biz: { q: 'What would you like help with?', opts: [
        pOpt('🔥', 'Assets and operations', 'Fire, property, business interruption', 'corp_fire', 'assets-operations'),
        pOpt('💻', 'Leadership and cyber', 'Directors, cyber, professional cover', 'rec:biz:lead', 'leadership-cyber'),
        pOpt('🚢', 'Cargo and projects', 'Marine, transit, construction', 'rec:biz:cargo', 'cargo-projects'),
        pOpt('🔍', 'Review my policies', 'Free, confidential gap analysis', 'audit', 'policy-review')
      ] },
      hr: { q: 'What would you like help with?', opts: [
        pOpt('🏥', 'Group health', 'Hospital cover for your team', 'ben_gmc', 'group-health'),
        pOpt('🛟', 'Accident and life', "Cover for employees' families", 'rec:hr:cover', 'accident-life'),
        pOpt('💚', 'Wellness programme', 'Health camps, telemedicine and more', 'well_menu', 'wellness'),
        pOpt('🔍', 'Review our benefits', 'Free gap analysis and benchmark', 'review_hr', 'policy-review')
      ] },
      fam: { q: 'What would you like to protect?', opts: [
        pOpt('❤️‍🩹', 'Health cover', 'For you and your family', 'ret_health', 'health'),
        pOpt('🚗', 'Car or bike', 'Motor insurance', 'ret_motor', 'motor'),
        pOpt('✈️', 'Travel', 'Domestic and international trips', 'ret_travel', 'travel'),
        pOpt('🏠', 'Home and solar', 'Home, rooftop solar, loan cover', 'rec:fam:home', 'home-solar'),
        pOpt('🛟', 'Personal accident', 'Accidental death and disability', 'ret_pa', 'personal-accident')
      ] },
      cust: { q: 'How may I assist you today?', opts: [
        pOpt('🚨', 'Make a claim', '24×7 claims helpline', 'claim_type', 'claim'),
        pOpt('🛡️', 'Renewal or policy help', 'Speak to our team', 'cust_policy', 'renewal-policy'),
        pOpt('📝', 'Raise a complaint', 'How to raise and escalate', 'grievance', 'complaint'),
        pOpt('🎧', 'Speak to someone', 'Call, email or message', 'contact_advisor', 'advisor')
      ] }
    };
    function rc(icon, label, why, to) { return { icon: icon, label: label, hint: why, to: to }; }
    var RECCARD = {
      corp_fire:  rc('🔥', 'Fire and asset protection', 'Safeguards infrastructure, inventory and equipment against fire and natural disasters.', 'corp_fire'),
      corp_do:    rc('👔', 'D&O (directors and officers)', 'Protects your board from personal financial loss.', 'corp_do'),
      corp_cyber: rc('💻', 'Cyber liability', 'Covers data breaches, ransomware extortion and business interruption.', 'corp_cyber'),
      corp_pi:    rc('✍️', 'Professional indemnity', 'Defends against client claims of errors or negligence.', 'corp_pi'),
      corp_marine:rc('🚢', 'Marine and transit', 'Protects goods in transit, inland, by air and overseas.', 'corp_marine'),
      corp_eng:   rc('🏗️', 'Engineering risk', 'Covers construction projects, sites and machinery breakdown.', 'corp_eng'),
      ben_gmc:    rc('🏥', 'Group health', 'Hospital cover with network hospitals for your employees.', 'ben_gmc'),
      ben_gpa:    rc('🛟', 'Group personal accident', 'Worldwide, 24×7 protection against accidental death or disability.', 'ben_gpa'),
      ben_life:   rc('❤️', 'Term life and top-ups', "Financial security for your employees' families.", 'ben_life'),
      well_menu:  rc('💚', 'Wellness programmes', 'Health camps, telemedicine and on-site care for your team.', 'well_menu'),
      ret_health: rc('❤️‍🩹', 'Health insurance', 'Medical cover for you and your family, with cashless hospitals.', 'ret_health'),
      ret_motor:  rc('🚗', 'Motor insurance', 'Third-party and own-damage cover for your car or two-wheeler.', 'ret_motor'),
      ret_home:   rc('🏠', 'Home insurance', 'Protects your home and contents against fire, burglary and natural disasters.', 'ret_home'),
      ret_solar:  rc('☀️', 'Rooftop solar and loan cover', 'Cover for solar panels, plus loan protection.', 'ret_solar'),
      claim_type: rc('🚨', 'Make a claim', 'Our claims desk handles the paperwork with the insurer.', 'claim_type'),
      cust_policy:rc('🛡️', 'Renewal or policy help', 'An advisor can help with renewals and policy questions.', 'cust_policy'),
      grievance:  rc('📝', 'Raise a complaint', 'How to raise it with us, and escalate if needed.', 'grievance')
    };
    var RECS = {
      'rec:biz': ['corp_fire', 'corp_do', 'corp_cyber'],
      'rec:biz:lead': ['corp_do', 'corp_cyber', 'corp_pi'],
      'rec:biz:cargo': ['corp_marine', 'corp_eng', 'corp_fire'],
      'rec:hr': ['ben_gmc', 'ben_gpa', 'well_menu'],
      'rec:hr:cover': ['ben_gpa', 'ben_life', 'ben_gmc'],
      'rec:fam': ['ret_health', 'ret_motor', 'ret_home'],
      'rec:fam:home': ['ret_home', 'ret_solar'],
      'rec:cust': ['claim_type', 'cust_policy', 'grievance']
    };
    var RECLINKS = {
      biz: [GAP, ADV('corporate')],
      hr: [PLAN, ADV('benefits')],
      fam: [QUOTE, ADV('retail')],
      cust: [{ href: CLAIMS_TEL, label: 'Call our claims helpline', primary: true }, ADV('general')]
    };

    function personaNode(id) {
      var P = PERSONAS, ctx = pageCtx(), m;
      if (id === 'who') {
        return {
          crumb: 'Who I am helping', noWho: true,
          bot: ["Hello, I'm Raksha, Rexa's assistant. May I ask who you are, so I can show the most relevant cover?"],
          options: PERSONA_ORDER.map(function (k) { return { icon: P[k].icon, label: P[k].label, hint: P[k].hint, to: 'persona:' + k + ':picker' }; }),
          cardsClass: 'personas',
          foot: (persona || personaRead()) ? [{ label: 'Forget my choice', to: 'forget' }] : null
        };
      }
      if (id === 'hint') {
        var pc = ctx && P[ctx.persona];
        if (!pc) return personaNode('who');
        return { crumb: 'Welcome', noWho: true, bot: ["You're viewing " + ctx.topic + '. Are you here as ' + pc.as + '?'],
          chips: [{ label: 'Yes', to: 'persona:' + ctx.persona + ':page', primary: true }, { label: 'No, someone else', to: 'who' }] };
      }
      if (id === 'welcome') {
        var st = personaRead();
        if (!st) return personaNode('who');
        return { crumb: 'Welcome back', noWho: true, bot: ['Welcome back. Shall we continue as ' + P[st.p].as + '?'],
          chips: [{ label: 'Yes, continue', to: 'persona:' + st.p + ':memory', primary: true }, { label: 'Change', to: 'who' }] };
      }
      if (id === 'root' && persona && persona !== 'explore' && INTENTS[persona]) {
        return { crumb: 'Home', bot: [INTENTS[persona].q], options: INTENTS[persona].opts,
          chips: [{ label: 'Recommended for you', to: 'rec:' + persona, primary: true }],
          more: { label: 'Other topics', items: [{ label: 'Explore all cover', to: 'products_menu' }, { label: 'About Rexa', to: 'about_rexa' }] } };
      }
      if ((m = /^intent:(\w+)$/.exec(id)) && INTENTS[m[1]]) {
        return { crumb: 'What I can help with', bot: [INTENTS[m[1]].q], options: INTENTS[m[1]].opts,
          chips: [{ label: 'Show me everything', to: 'products_menu' }] };
      }
      if (RECS[id]) {
        return { crumb: 'Recommended', parent: 'root', rec: true, bot: ["Based on what you've told me, these may suit you:"],
          options: RECS[id].map(function (k) { return RECCARD[k]; }), cardsClass: 'recs',
          links: RECLINKS[id.split(':')[1]], linksAfter: true, closing: true };
      }
      if (id === 'review_hr') {
        return { crumb: 'Review our benefits', parent: 'root',
          bot: ['Share your existing policies for a free, confidential gap analysis and premium benchmark.',
                'We can also design a flexible health and wellness programme that attracts talent and removes admin work.'],
          links: [PLAN, ADV('policy-review')], options: [], closing: true };
      }
      if (id === 'cust_policy') {
        return { crumb: 'Renewal or policy help', parent: 'root',
          bot: ['For renewals and policy questions, please speak to an advisor. Keep your policy number handy.'],
          links: [ADV('policy-review', true), { href: 'tel:+914448678884', label: 'Call Chennai' }, { href: 'mailto:info@rexabroking.com', label: 'Email us' }],
          options: [], closing: true };
      }
      return null;
    }

    /* ---- Free-text routing: ordered, first match wins. Short words match on word boundaries. ---- */
    var KEYWORDS = [
      ['offers', ['offer', 'discount', 'deal', 'promo', 'coupon', 'cashback']],
      ['root', ['hello', 'hi', 'hey', 'namaste', 'start', 'menu']],
      ['grievance', ['grievance', 'complaint', 'complain', 'ombudsman', 'bima bharosa', 'escalate', 'mis-sell', 'misselling', 'not satisfied', 'unhappy']],
      ['privacy', ['privacy', 'data protection', 'cookie', 'personal data']],
      ['claim_health', ['health claim', 'medical claim', 'hospital', 'cashless', 'reimbursement']],
      ['claim_motor', ['motor claim', 'car claim', 'bike claim', 'vehicle claim', 'car accident', 'vehicle damage']],
      ['claim_life', ['death claim', 'life claim', 'nominee', 'pa claim', 'accident claim']],
      ['claim_business', ['fire claim', 'property claim', 'marine claim', 'theft claim', 'burglary claim', 'business claim', 'surveyor', 'loss assessor']],
      ['claim_type', ['claim', 'settlement', 'settle']],
      ['audit', ['audit', 'gap analysis', 'gap', 'benchmark', 'review my policy', 'current policy', 'existing policy', 'exclusion', 'underinsured']],
      ['corp_cyber', ['cyber', 'ransomware', 'data breach', 'hack']],
      ['corp_do', ['d&o', 'd & o', 'directors', 'officers']],
      ['corp_pi', ['professional indemnity', 'indemnity', 'e&o', 'errors and omissions', 'errors & omissions']],
      ['corp_fire', ['fire', 'property', 'asset', 'flop', 'business interruption', 'riot', 'earthquake', 'flood']],
      ['corp_marine', ['marine', 'cargo', 'transit', 'shipment', 'logistics']],
      ['corp_eng', ['engineering', 'contractor', 'construction', 'erection', 'machinery breakdown']],
      ['corp_menu', ['corporate', 'liability', 'commercial', 'business insurance', 'company insurance']],
      ['ben_gmc', ['gmc', 'group health', 'mediclaim', 'group mediclaim', 'employee health', 'pre-existing', 'maternity', 'dependent parents']],
      ['ben_gpa', ['gpa', 'group personal accident', 'group accident']],
      ['ben_life', ['term life', 'gtl', 'group term', 'super top', 'top-up', 'top up', 'critical illness', 'life insurance']],
      ['ben_menu', ['employee benefit', 'benefits', 'hr']],
      ['well_tele', ['telemedicine', 'tele-consult', 'teleconsult', 'doctor consult']],
      ['well_ohc', ['ohc', 'occupational']],
      ['well_amb', ['ambulance']],
      ['well_camp', ['health camp', 'camp', 'checkup', 'check-up', 'screening']],
      ['well_mind', ['mental', 'counsel', 'stress']],
      ['well_menu', ['wellness']],
      ['ret_motor', ['motor', 'car insurance', 'bike', 'two-wheeler', 'two wheeler', 'vehicle', 'zero dep']],
      ['ret_travel', ['travel', 'trip', 'flight', 'baggage']],
      ['ret_pa', ['personal accident', 'accident']],
      ['ret_solar', ['solar', 'rooftop', 'loan protect', 'loan']],
      ['ret_home', ['home insurance', 'house', 'home']],
      ['ret_health', ['health insurance', 'family floater', 'floater', 'health', 'port']],
      ['retail_menu', ['retail', 'personal insurance', 'family', 'individual', 'myself']],
      ['about_team', ['leaders', 'leader', 'leadership', 'founder', 'principal officer', 'director', 'kmp', 'team', 'management']],
      ['about_rexa', ['about', 'who are you', 'who is rexa', 'licence', 'license', 'irda', 'irdai', 'broker', 'company', 'since']],
      ['contact_advisor', ['located', 'where are you', 'renew', 'renewal', 'policy status', 'check my policy', 'contact', 'phone', 'number', 'email', 'mail', 'talk', 'speak', 'human', 'advisor', 'adviser', 'agent', 'address', 'office', 'location', 'call', 'chennai', 'bengaluru', 'bangalore', 'callback', 'reach']],
      ['products_menu', ['product', 'cover', 'coverage', 'insurance', 'policy', 'policies', 'what do you', 'services', 'plans']]
    ];
    function hasWord(t, w) {
      if (/^[a-z0-9]{1,4}$/.test(w)) return new RegExp('(^|[^a-z0-9])' + w + '($|[^a-z0-9])').test(t);
      return t.indexOf(w) !== -1;
    }
    function globalRoute(text) {
      var t = text.toLowerCase();
      for (var i = 0; i < KEYWORDS.length; i++) {
        var words = KEYWORDS[i][1];
        for (var j = 0; j < words.length; j++) if (hasWord(t, words[j])) return KEYWORDS[i][0];
      }
      return 'fallback';
    }
    // When we know who is asking, settle ambiguous words in their favour ("health", "accident", "insurance"...).
    // Specific answers (claims, complaints, audits, named covers) are never overridden.
    var PERSONA_ROUTE = {
      hr:   { remap: { ret_health: 'ben_gmc', ret_pa: 'ben_gpa', products_menu: 'ben_menu', retail_menu: 'ben_menu' },
              words: [['ben_life', ['life', 'term']], ['well_camp', ['camp', 'checkup', 'check-up']], ['ben_gmc', ['insurance']]] },
      fam:  { remap: { products_menu: 'retail_menu' }, words: [['ret_motor', ['car']]] },
      biz:  { remap: { products_menu: 'corp_menu' }, words: [] },
      cust: { remap: {}, words: [['claim_type', ['claim', 'claims']], ['contact_advisor', ['renew', 'renewal', 'expiry', 'expire']]] }
    };
    function routeFreeText(text) {
      var g = globalRoute(text), R = persona && PERSONA_ROUTE[persona];
      if (!R) return g;
      var t = text.toLowerCase();
      if (g === 'fallback' || g === 'products_menu') {
        for (var i = 0; i < R.words.length; i++) {
          for (var j = 0; j < R.words[i][1].length; j++) if (hasWord(t, R.words[i][1][j])) return R.words[i][0];
        }
      }
      return R.remap[g] || g;
    }

    /* ======================================================================
       Offers (optional; offers.json is `[]` today → nothing offer-related renders)
       ====================================================================== */
    var OFFERS = [];
    function mmdd(s) { return (+s.slice(0, 2)) * 100 + (+s.slice(3, 5)); }
    function offerLive(o) {
      try {
        if (!o || o.active === false || !o.window) return false;
        var now = new Date(), today = (now.getMonth() + 1) * 100 + now.getDate();
        var from = mmdd(o.window[0]), to = mmdd(o.window[1]);
        return from <= to ? (today >= from && today <= to) : (today >= from || today <= to);
      } catch (e) { return false; }
    }
    function activeOffers() { return OFFERS.filter(offerLive); }

    function dynamicNode(id) {
      var pn = personaNode(id);
      if (pn) return pn;
      if (id === 'offers') {
        var live = activeOffers();
        if (!live.length) {
          return { crumb: 'Offers', parent: 'root', bot: ['No offers are running right now. Our advisors always negotiate the best available premium for you.'], links: [ADV('general', true)], options: [] };
        }
        return {
          crumb: "Today's offers", parent: 'root',
          bot: [live.length === 1 ? 'There is one offer running at the moment.' : 'There are ' + live.length + ' offers running at the moment.'],
          options: live.map(function (o) { return { icon: o.icon || '🎁', label: o.title, hint: o.short, badge: o.badge, to: 'offer:' + o.id }; })
        };
      }
      if (id.slice(0, 6) === 'offer:') {
        var o = OFFERS.filter(function (x) { return x.id === id.slice(6); })[0];
        if (!o || !offerLive(o)) return { crumb: 'Offer ended', parent: 'offers', bot: ['I am sorry, that offer has ended. An advisor will be glad to help.'], links: [ADV('general', true)], options: [] };
        return { crumb: o.title, parent: 'offers', bot: o.lines || [], links: o.links || [], options: [] };
      }
      return null;
    }
    function resolve(id) { return dynamicNode(id) || TREE[id] || null; }
    function decorateRoot(node) {
      var live = activeOffers();
      if (!live.length) return node;
      var clone = {}; for (var k in node) clone[k] = node[k];
      clone.promo = { title: 'Limited-time offer' + (live.length === 1 ? '' : 's'), text: live[0].teaser || live[0].title };
      clone.options = [{ icon: '🎉', label: "Today's offers", hint: live.length + ' live right now', badge: 'New', to: 'offers' }].concat(node.options);
      return clone;
    }
    function crumbTrail(id) {
      var trail = [], cur = id, guard = 0;
      while (cur && guard++ < 12) { var n = resolve(cur); if (!n) break; trail.unshift({ id: cur, label: n.crumb || cur }); cur = n.parent; }
      return trail;
    }

    /* ======================================================================
       Markup
       ====================================================================== */
    /* ---- Inline stroke-icon set (Lucide-style, 24px grid, 1.75 stroke) — replaces emoji for the new theme ---- */
    var SVGS = {
      shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
      alert: '<path d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
      headset: '<path d="M3 14v-2a9 9 0 0118 0v2"/><path d="M21 14v3a2 2 0 01-2 2h-2v-6h2a2 2 0 012 2zM3 14v3a2 2 0 002 2h2v-6H5a2 2 0 00-2 2z"/>',
      building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/>',
      file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
      factory: '<path d="M2 20a2 2 0 002 2h16a2 2 0 002-2V8l-7 5V8l-7 5V4a2 2 0 00-2-2H4a2 2 0 00-2 2z"/><path d="M17 18h1M12 18h1M7 18h1"/>',
      users: '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
      heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0016.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7z"/>',
      pulse: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0016.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7z"/><path d="M3.2 12h4.3l1.5-2.5 3 5 1.5-2.5h5.3"/>',
      briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
      pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',
      flame: '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.2.4-2.4 1-3 0 1.4.9 2.5 2.5 2.5z"/>',
      ship: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 18l1.6-6.5-9-3.5-9 3.5L4.6 18M12 8V3h4"/>',
      hardhat: '<path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/><path d="M10 10V5a1 1 0 011-1h2a1 1 0 011 1v5M4 15v-3a6 6 0 016-6M14 6a6 6 0 016 6v3"/>',
      medical: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>',
      buoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3"/>',
      ambulance: '<path d="M10 10H6M8 8v4"/><path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h2"/><path d="M19 18h2a1 1 0 001-1v-3.7a1 1 0 00-.2-.6l-3.1-4.1a1 1 0 00-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
      steth: '<path d="M11 2v2M5 2v2"/><path d="M5 3H4a2 2 0 00-2 2v4a6 6 0 0012 0V5a2 2 0 00-2-2h-1"/><path d="M8 15a6 6 0 006 6 6 6 0 006-6v-3"/><circle cx="20" cy="10" r="2"/>',
      smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
      phoneapp: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
      car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 002 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
      plane: '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
      home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>',
      chat: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
      chevron: '<path d="M9 18l6-6-6-6"/>',
      back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
      arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
      send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
      phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
      mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
      close: '<path d="M18 6L6 18M6 6l12 12"/>',
      restart: '<path d="M3 12a9 9 0 109-9 9.8 9.8 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/>'
    };
    function svg(name, size, cls) {
      var n = size || 20;
      return '<svg class="roh-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="' + n + '" height="' + n + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (SVGS[name] || SVGS.chat) + '</svg>';
    }
    // emoji used by the knowledge tree -> [icon, tint tone]. Tones: indigo=corporate, rose=benefits, green=wellness, sky=personal, red=claims, navy=advisor, slate=about, amber=grievance/offers
    var EMO = {
      '🛡': ['shield', 'navy'], '🚨': ['alert', 'red'], '🔍': ['search', 'navy'], '🎧': ['headset', 'navy'], '🏢': ['building', 'slate'], '📝': ['file', 'amber'],
      '🏭': ['factory', 'indigo'], '👔': ['briefcase', 'indigo'], '💻': ['lock', 'indigo'], '✍': ['pen', 'indigo'], '🔥': ['flame', 'indigo'], '🚢': ['ship', 'indigo'], '🏗': ['hardhat', 'indigo'],
      '👥': ['users', 'rose'], '🏥': ['medical', 'rose'], '🛟': ['buoy', 'rose'], '❤': ['heart', 'rose'],
      '💚': ['pulse', 'green'], '🚑': ['ambulance', 'green'], '🩺': ['steth', 'green'], '🧠': ['smile', 'green'], '📱': ['phoneapp', 'green'],
      '❤‍🩹': ['heart', 'sky'], '🚗': ['car', 'sky'], '✈': ['plane', 'sky'], '🏠': ['home', 'sky'], '☀': ['sun', 'sky'], '👨‍👩‍👧': ['users', 'sky'],
      '🎉': ['gift', 'amber'], '🎁': ['gift', 'amber'], '💬': ['chat', 'slate']
    };
    function iconFor(e) {
      var m = EMO[String(e || '💬').replace(/️/g, '')] || EMO['💬'];
      return '<span class="ic tone-' + m[1] + '" aria-hidden="true">' + svg(m[0], 20) + '</span>';
    }
    // tree link labels carry emoji/arrows as text decoration; the new theme draws them as icons instead
    function linkIcon(href) { return /^tel:/.test(href) ? 'phone' : /^mailto:/.test(href) ? 'mail' : 'arrow'; }
    function cleanLabel(l) { return String(l).replace(/^[\s‍️←-⇿☀-➿\u{1F000}-\u{1FFFF}]+/u, '').replace(/\s*[→›»]\s*$/, ''); }

    var AV = assetUrl('raksha-avatar-sm.webp'), AV_PNG = assetUrl('raksha-avatar-sm.png');
    var FACE_W = assetUrl('raksha-face-v2.webp'), FACE_PNG = assetUrl('raksha-face-v2.png');
    function face() {
      return '<span class="roh-face" aria-hidden="true"><picture><source srcset="' + FACE_W + '" type="image/webp"><img src="' + FACE_PNG + '" alt="" width="176" height="254" loading="lazy" decoding="async"></picture></span>';
    }

    function teaserText() { var c = pageCtx(); return c && c.teaser ? c.teaser : DEFAULT_TEASER; }

    var root = document.createElement('div');
    root.id = 'rohiniWidget';
    root.innerHTML =
      '<div class="roh-dock">' +
        '<button type="button" class="roh-launcher" id="rohLauncher" aria-label="Chat with Raksha, Rexa\'s assistant" title="' + esc(teaserText()) + '" aria-haspopup="dialog" aria-controls="rohModal">' +
          '<span class="roh-launcher-label" aria-hidden="true">Chat with Raksha</span>' +
          '<span class="roh-launcher-figure"><span class="roh-waves" aria-hidden="true"><i></i><i></i><i></i></span><span class="roh-launcher-aura" aria-hidden="true"></span><picture><source srcset="' + assetUrl('raksha-figure-v2.webp') + '" type="image/webp"><img src="' + assetUrl('raksha-figure-v2.png') + '" alt="" width="160" height="511" decoding="async"></picture><span class="roh-launcher-unread" aria-hidden="true">1</span></span>' +
        '</button>' +
      '</div>' +
      '<div class="roh-overlay" id="rohOverlay">' +
        '<div class="roh-modal" id="rohModal" role="dialog" aria-modal="true" aria-labelledby="rohTitle" tabindex="-1">' +
          '<span class="roh-grip" aria-hidden="true"></span>' +
          '<div class="roh-head">' + face() +
            '<div class="roh-head-info"><div class="roh-head-eyebrow">Rexa\'s Assistant</div><div class="roh-head-name" id="rohTitle">Raksha</div><div class="roh-head-sub">Here to give you <b>suraksha</b></div></div>' +
            '<div class="roh-head-actions">' +
              '<button type="button" id="rohHome" aria-label="Start over and choose who I am helping" title="Start over">' + svg('restart', 18) + '</button>' +
              '<button type="button" id="rohClose" aria-label="Close chat">' + svg('close', 18) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="roh-whorow" id="rohWhoRow" hidden><button type="button" class="roh-who" id="rohWho"><span class="roh-who-lbl">Helping:</span><b class="roh-who-name" id="rohWhoName"></b><span class="roh-who-sep" aria-hidden="true">·</span><span class="roh-who-chg">Change</span></button></div>' +
          '<nav class="roh-crumbs" id="rohCrumbs" aria-label="Chat topics"></nav>' +
          '<div class="roh-body" id="rohBody" aria-live="polite"></div>' +
          '<form class="roh-inputrow" id="rohForm" autocomplete="off">' +
            '<input class="roh-input" id="rohInput" type="text" maxlength="180" enterkeyhint="send" aria-label="Type your question" placeholder="Or just type what you\'re looking for…">' +
            '<button type="submit" class="roh-send" id="rohSend" aria-label="Send">' + svg('send', 18) + '</button>' +
          '</form>' +
          '<p class="roh-foot">Raksha answers from this website · Not a substitute for your policy documents</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    var $ = function (id) { return root.querySelector('#' + id); };
    var launcher = $('rohLauncher'), overlay = $('rohOverlay'), modal = $('rohModal');
    var body = $('rohBody'), crumbsBox = $('rohCrumbs'), input = $('rohInput');
    var whoRow = $('rohWhoRow'), whoBtn = $('rohWho'), whoName = $('rohWhoName');
    if (window.matchMedia && matchMedia('(max-width: 640px)').matches) input.setAttribute('placeholder', 'Type what you need…');
    var html = document.documentElement;
    var opener = null, isOpen = false, token = 0, timer = null;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var promoDismissed = session.get('rexa_rohini_promo_x') === '1';
    // pause the launcher pulse while the tab is hidden
    document.addEventListener('visibilitychange', function () { root.classList.toggle('is-tab-hidden', document.hidden); });

    function setTalking(on) { Array.prototype.forEach.call(root.querySelectorAll('.roh-face'), function (f) { f.classList.toggle('talking', on); }); }

    function renderCrumbs(id) {
      var trail = crumbTrail(id);
      if (trail.length < 2) { crumbsBox.hidden = true; crumbsBox.innerHTML = ''; return; }
      crumbsBox.hidden = false;
      var parent = trail[trail.length - 2];
      crumbsBox.innerHTML = '<button type="button" class="back" data-to="' + parent.id + '">' + svg('back', 15) + '<span>Back</span></button>' +
        '<span class="path">' + trail.map(function (c, i) {
          var sep = i > 0 ? '<span class="sep" aria-hidden="true">›</span>' : '';
          return i === trail.length - 1 ? sep + '<span class="cur" aria-current="page">' + esc(c.label) + '</span>' : sep + '<button type="button" data-to="' + c.id + '">' + esc(c.label) + '</button>';
        }).join('') + '</span>';
    }
    crumbsBox.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-to]'); if (b) goTo(b.getAttribute('data-to'));
    });

    var currentId = 'root', pendingRender = null, safety = null;

    function cleanText(t) { return String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80); }
    function updateWho(node) {
      var show = !!(persona && PERSONAS[persona] && !(node && node.noWho));
      whoRow.hidden = !show;
      if (show) {
        var nm = PERSONAS[persona].label;
        whoName.textContent = nm;
        whoBtn.setAttribute('aria-label', 'Helping: ' + nm + '. Change who I am helping');
      }
    }
    function setPersona(p, source) {
      if (!PERSONAS[p]) return;
      persona = p; personaWrite(p);
      track('raksha_persona', { persona: p, source: source });
    }
    function entryId() {
      if (personaRead()) return 'welcome';
      var ctx = pageCtx();
      return ctx && PERSONAS[ctx.persona] ? 'hint' : 'who';
    }

    function goTo(id, userText) {
      var m;
      if (id === 'forget') { personaClear(); persona = null; id = 'who'; }
      else if ((m = /^persona:(\w+):(\w+)$/.exec(id))) {
        setPersona(m[1], m[2]);
        id = (m[1] === 'explore' || m[2] === 'memory') ? 'root' : 'intent:' + m[1];
      }
      currentId = id;
      var node = resolve(id) || TREE.fallback;
      if (id === 'root') node = decorateRoot(node);
      var my = ++token; clearTimeout(timer); clearTimeout(safety); pendingRender = null;
      renderCrumbs(id); updateWho(node); setTalking(true);
      body.scrollTop = 0;

      // The visitor's choice appears straight away, followed by a short typing indicator.
      var step = document.createElement('div'); step.className = 'roh-step'; step.setAttribute('tabindex', '-1');
      step.innerHTML = (userText ? '<div class="roh-user"><span class="roh-user-bubble">' + esc(userText) + '</span></div>' : '') +
        '<div class="roh-botrow roh-typing-row"><span class="roh-avatar">' + face() + '</span><div class="roh-bubbles"><div class="roh-bubble roh-typing" role="status" aria-label="Raksha is typing"><span></span><span></span><span></span></div></div></div>';
      body.innerHTML = ''; body.appendChild(step);

      var lines = [].concat(node.bot || []);
      var done = false;
      function render() {
        if (done || my !== token) return;      // guard: runs once, and only for the latest screen
        done = true; clearTimeout(timer); clearTimeout(safety); pendingRender = null;
        setTalking(false);
        var convo = lines.map(function (l, i) { return '<div class="roh-bubble" style="animation-delay:' + (i * 90) + 'ms">' + l + '</div>'; }).join('');
        var linksHtml = '';
        if (node.links && node.links.length) {
          linksHtml = '<div class="roh-links">' + node.links.map(function (l) {
            var ext = /^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : '';
            return '<a href="' + l.href + '"' + ext + (l.primary ? ' class="primary"' : '') + '>' + (/^(tel|mailto):/.test(l.href) ? svg(linkIcon(l.href), 16) : '') + '<span>' + cleanLabel(l.label) + '</span>' + (/^(tel|mailto):/.test(l.href) ? '' : svg('arrow', 15)) + '</a>';
          }).join('') + '</div>';
        }
        if (!node.linksAfter) convo += linksHtml;
        if (node.options && node.options.length) {
          convo += '<div class="roh-cards' + (node.cardsClass ? ' ' + node.cardsClass : '') + '">' + node.options.map(function (o, i) {
            return '<button type="button" class="roh-card' + (o.badge ? ' has-badge' : '') + '" data-idx="' + i + '">' + (o.badge ? '<span class="roh-badge">' + esc(o.badge) + '</span>' : '') + iconFor(o.icon) + '<span class="txt"><span class="ttl">' + esc(o.label) + '</span>' + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</span>' + svg('chevron', 16, 'chev') + '</button>';
          }).join('') + '</div>';
        }
        function chipHtml(c, i, attr) { return '<button type="button" class="roh-chip' + (c.primary ? ' primary' : '') + '" ' + attr + '="' + i + '">' + esc(c.label) + '</button>'; }
        if (node.chips && node.chips.length) convo += '<div class="roh-chips">' + node.chips.map(function (c, i) { return chipHtml(c, i, 'data-ci'); }).join('') + '</div>';
        if (node.more && node.more.items) convo += '<div class="roh-more"><span class="roh-more-lbl">' + esc(node.more.label) + '</span><div class="roh-chips">' + node.more.items.map(function (c, i) { return chipHtml(c, i, 'data-mi'); }).join('') + '</div></div>';
        if (node.linksAfter) convo += linksHtml;
        if (node.closing) convo += '<div class="roh-bubble roh-closing">' + CLOSING + '</div>';
        if (node.foot && node.foot.length) convo += '<div class="roh-foot-actions">' + node.foot.map(function (f, i) { return '<button type="button" class="roh-textbtn" data-fi="' + i + '">' + esc(f.label) + '</button>'; }).join('') + '</div>';

        var botRow = document.createElement('div'); botRow.className = 'roh-botrow';
        botRow.innerHTML = '<span class="roh-avatar">' + face() + '</span><div class="roh-bubbles">' + convo + '</div>';
        var typingRow = step.querySelector('.roh-typing-row');
        if (typingRow) step.replaceChild(botRow, typingRow); else step.appendChild(botRow);
        if (node.promo && !promoDismissed) {
          var pr = document.createElement('div'); pr.className = 'roh-promo'; pr.id = 'rohPromo';
          pr.innerHTML = '<span class="roh-promo-ic" aria-hidden="true">' + svg('gift', 22) + '</span><div class="roh-promo-txt"><span class="roh-promo-title">' + esc(node.promo.title) + '</span><span class="roh-promo-sub">' + esc(node.promo.text) + '</span></div><button type="button" class="roh-promo-cta" data-to="offers">See offer</button><button type="button" class="roh-promo-x" aria-label="Dismiss offer">' + svg('close', 12) + '</button>';
          step.insertBefore(pr, step.firstChild);
        }

        function pick(o) {
          if (!o) return;
          var lbl = cleanText(o.label);
          track('raksha_option', { label: lbl.slice(0, 60), to: o.to, persona: persona || '' });
          if (o.intent) track('raksha_intent', { persona: persona || '', intent: o.intent });
          Array.prototype.forEach.call(step.querySelectorAll('.roh-card, .roh-chip, .roh-textbtn'), function (x) { x.disabled = true; });
          goTo(o.to, lbl);
        }
        function wire(sel, attr, list) {
          Array.prototype.forEach.call(step.querySelectorAll(sel), function (b) {
            b.addEventListener('click', function () { pick(list && list[+b.getAttribute(attr)]); });
          });
        }
        wire('.roh-card', 'data-idx', node.options);
        wire('.roh-chip[data-ci]', 'data-ci', node.chips);
        wire('.roh-chip[data-mi]', 'data-mi', node.more && node.more.items);
        wire('.roh-textbtn', 'data-fi', node.foot);
        var promoEl = step.querySelector('#rohPromo');
        if (promoEl) {
          promoEl.querySelector('.roh-promo-x').addEventListener('click', function () { promoDismissed = true; session.set('rexa_rohini_promo_x', '1'); promoEl.remove(); });
          promoEl.querySelector('.roh-promo-cta').addEventListener('click', function () { goTo('offers'); });
        }

        // Focus: after a tap or Enter on a choice, move to the first new option (or the message area) so keyboard and
        // screen-reader users land in the new content. While someone is typing, leave the cursor in the box.
        var ae = document.activeElement;
        if (ae !== input && (ae === document.body || ae === modal || body.contains(ae) || ae.disabled)) {
          var first = step.querySelector('.roh-card:not(:disabled), .roh-chip:not(:disabled)');
          try { (first || step).focus({ preventScroll: true }); } catch (err) {}
        }
        body.scrollTop = 0;
      }
      pendingRender = render;
      if (reduce) { render(); return; }
      timer = setTimeout(render, 350);
      safety = setTimeout(render, 1800);        // never stuck, even if timers are throttled
    }
    // Background tabs throttle timers; show the reply the moment the tab is visible again.
    document.addEventListener('visibilitychange', function () { if (!document.hidden && pendingRender) pendingRender(); });
    whoBtn.addEventListener('click', function () { goTo('who'); });

    // Link analytics + close the sheet so same-page anchors are visible
    body.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.roh-links a'); if (!a) return;
      var href = (a.getAttribute('href') || '').slice(0, 100);
      track('raksha_link_click', { href: href, persona: persona || '' });
      var cur = resolve(currentId);
      if (cur && cur.rec) track('raksha_recommendation_click', { persona: persona || '', href: href });
      closeModal(true);
    });

    /* ---- Open / close, focus trap, scroll lock ---- */
    function focusables() {
      return Array.prototype.filter.call(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])'), function (el) { return el.offsetParent !== null; });
    }
    function fitViewport() {
      var vv = window.visualViewport;
      if (!vv || !isOpen) return;
      overlay.style.height = vv.height + 'px'; overlay.style.top = vv.offsetTop + 'px'; overlay.style.bottom = 'auto';
    }
    function resetViewport() { overlay.style.height = ''; overlay.style.top = ''; overlay.style.bottom = ''; }
    if (window.visualViewport) { visualViewport.addEventListener('resize', fitViewport); visualViewport.addEventListener('scroll', fitViewport); }

    /* ---- Launcher attention: greeting bubble shows, tucks away, then re-appears a couple of times with a wave (never once she has been opened) ---- */
    var popTimers = [];
    function later(fn, ms) { popTimers.push(setTimeout(fn, ms)); }
    function wave() { if (isOpen || document.hidden) return; root.classList.remove('is-wave'); void root.offsetWidth; root.classList.add('is-wave'); later(function () { root.classList.remove('is-wave'); }, 1400); }
    function showBubble() { if (isOpen || document.hidden) return; root.classList.remove('is-compact'); wave(); }
    function hideBubble() { root.classList.add('is-compact'); }
    (function attention() { if (!reduce) later(wave, 2600); })();   // one friendly head-tip on arrival; the waves keep the launcher alive
    function stopAttention() { popTimers.forEach(clearTimeout); popTimers = []; root.classList.add('is-compact', 'is-seen'); root.classList.remove('is-wave'); }

    function openModal(source) {
      if (isOpen) return;
      session.set('rexa_raksha_auto_v1', '1');
      isOpen = true; opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : launcher;
      root.classList.add('is-open'); stopAttention(); html.classList.add('roh-lock');
      if (!body.children.length) goTo(entryId());
      track('raksha_open', { source: source || 'launcher', persona: persona || '' });
      fitViewport();
      setTimeout(function () {
        // On touch devices focusing the input would raise the keyboard over the chat; focus the dialog instead.
        if (window.matchMedia && matchMedia('(pointer: coarse)').matches) modal.focus(); else input.focus();
      }, 60);
    }
    function closeModal(skipFocus) {
      if (!isOpen) return;
      isOpen = false; root.classList.remove('is-open'); html.classList.remove('roh-lock'); resetViewport();
      if (skipFocus !== true && opener && opener.focus) { try { opener.focus(); } catch (e) {} }
    }
    launcher.addEventListener('click', function () { openModal('launcher'); });
    $('rohClose').addEventListener('click', function () { closeModal(); });
    $('rohHome').addEventListener('click', function () { goTo('who'); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1], active = document.activeElement;
        if (e.shiftKey && (active === first || active === modal)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        else if (!modal.contains(active)) { e.preventDefault(); first.focus(); }
      }
    });

    $('rohForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim(); if (!val) return;
      input.value = '';
      var topic = routeFreeText(val);
      track('raksha_search', { topic: topic === 'fallback' ? 'no_match' : topic, persona: persona || '' }); // never the typed text
      goTo(topic, val);
    });

    /* ---- Step out of the way while someone is filling in a page form (mobile keyboards, submit buttons) ---- */
    var awayTimer = null;
    function isField(el) { return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !root.contains(el); }
    document.addEventListener('focusin', function (e) { if (isField(e.target)) { clearTimeout(awayTimer); root.classList.add('is-away'); } });
    document.addEventListener('focusout', function (e) {
      if (!isField(e.target)) return;
      clearTimeout(awayTimer); awayTimer = setTimeout(function () { if (!isField(document.activeElement)) root.classList.remove('is-away'); }, 200);
    });


    /* ---- Load offers in the background; if any are live, badge the launcher (no-op while offers.json is empty) ---- */
    try {
      fetch(offersUrl(), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (data) {
        OFFERS = Array.isArray(data) ? data : [];
        if (activeOffers().length && !launcher.querySelector('.roh-launcher-badge')) {
          var b = document.createElement('span'); b.className = 'roh-launcher-badge'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = svg('gift', 12); (launcher.querySelector('.roh-launcher-avatar') || launcher).appendChild(b);
        }
      }).catch(function () {});
    } catch (e) {}

    /* ---- Proactive open (once per browser session) -------------------------------------------
       Raksha opens by herself only after real interest is shown, never on arrival:
         1. Homepage: the visitor has scrolled past the last product group AND has spent 10s+ on the page
            (2s grace so it does not land mid-scroll), or
         2. Any page: 30s of ACTIVE time (tab visible, with at least one scroll/tap/mouse move).
       Never on the contact, grievance, privacy or terms pages, never while typing in a field, never over the
       lead pop-up or the cookie banner, and never again once she has been opened or closed this session. */
    (function proactiveOpen() {
      var seg = ''; try { seg = (location.pathname || '').replace(/\/+$/, '').split('/').pop().replace(/\.html$/i, '').toLowerCase(); } catch (e) {}
      if (/^(contact|grievance|privacy|terms)$/.test(seg)) return;
      if (session.get('rexa_raksha_auto_v1') === '1') return;
      var DWELL_SEC = 30, MIN_SEC_AFTER_SCROLL = 10, GRACE_MS = 2000;
      var active = 0, interacted = false, passedProducts = false, armed = false, fired = false, tick = null;
      var lastGroup = document.getElementById('cluster-wellness');   // last product group on the homepage

      ['scroll', 'touchstart', 'mousemove', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, function () { interacted = true; }, { passive: true, once: true });
      });
      function checkScroll() {
        if (passedProducts || !lastGroup) return;
        var r = lastGroup.getBoundingClientRect();
        if (r.bottom < window.innerHeight * 0.9 && window.scrollY > 0) passedProducts = true;
      }
      window.addEventListener('scroll', checkScroll, { passive: true });

      function blocked() {
        if (isOpen || document.hidden) return true;
        if (isField(document.activeElement)) return true;
        var lead = document.getElementById('leadModal');
        if (lead && lead.classList.contains('open')) return true;
        if (document.querySelector('.rx-consent')) return true;            // cookie banner is showing
        return false;
      }
      function fire() {
        if (fired || blocked()) return;
        fired = true; clearInterval(tick);
        session.set('rexa_raksha_auto_v1', '1');
        openModal('auto');
      }
      tick = setInterval(function () {
        if (fired) return;
        if (session.get('rexa_raksha_auto_v1') === '1') { fired = true; clearInterval(tick); return; }   // opened manually
        if (document.hidden) return;
        active += 1;
        if (!interacted) return;
        if (passedProducts && active >= MIN_SEC_AFTER_SCROLL) {
          if (!armed) { armed = true; setTimeout(fire, GRACE_MS); } else if (!blocked()) { fire(); }
        } else if (active >= DWELL_SEC) {
          fire();
        }
      }, 1000);
    })();

    // Test/automation hook (also handy in the console)
    window.rohiniWidget = { open: function () { openModal('api'); }, close: function () { closeModal(); }, goTo: goTo, route: routeFreeText, tree: TREE, persona: function () { return persona; }, resolve: resolve };
  }

  /* ---- Bootstrap (last, so every helper above is defined) ---- */
  function start() {
    try { init(); } catch (err) { if (window.console && console.warn) console.warn('Raksha did not start:', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
