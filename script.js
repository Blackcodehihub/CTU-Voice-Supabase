// --- 1. CONNECT TO SUPABASE ---
const supabaseUrl = 'https://dhednhohxzpwcbtwwchw.supabase.co';
const supabaseKey = 'sb_publishable_RZdvcVIeoPE3eXqZO3iHRA_zRi0SBgX';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedCategory = "";
let submissions = [];
let publishedResponses = [];

// --- 2. FETCH LIVE DATA ON LOAD ---
async function fetchLiveData() {
  const { data: respData } = await supabaseClient.from('responses').select('*').order('created_at', { ascending: false });
  if (respData) publishedResponses = respData;
  updateHeardSection();

  const { data: subData } = await supabaseClient.from('submissions').select('*').order('created_at', { ascending: false });
  if (subData) submissions = subData;
  updateTrends();
}

// Clean SVG icons for the trend cards instead of emojis
const categoryIcons = {
  "Academic Concern": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  "Institutional Concern": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="M3 21h18"/><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>`,
  "Personal Experience": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  "Emotional Well-being": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  "Identity & Belonging": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>`,
  "Suggestion / Improvement": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
  "Appeal / Request": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  "Other": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:4px; color:var(--teal);"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`
};

document.querySelectorAll(".option").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".option").forEach(x => x.classList.remove("selected"));
  b.classList.add("selected"); 
  selectedCategory = b.dataset.cat;
}));

function toggleMenu() {
  const nav = document.getElementById("navLinks");
  const overlay = document.getElementById("navOverlay");
  nav.classList.toggle("active");
  overlay.classList.toggle("active");
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top: 0, behavior: "smooth"});
  
  document.querySelectorAll('.nav-links button[data-target]').forEach(btn => {
    if (btn.dataset.target === id) btn.classList.add('active-link');
    else btn.classList.remove('active-link');
  });
  
  const nav = document.getElementById("navLinks");
  const overlay = document.getElementById("navOverlay");
  if(nav && nav.classList.contains("active")) {
     nav.classList.remove("active");
     overlay.classList.remove("active");
  }

  if (id === 'submit') {
    const formDiv = document.getElementById("submitFormContainer");
    const successDiv = document.getElementById("submitSuccessContainer");
    if (formDiv && successDiv) {
      formDiv.classList.remove("hidden");
      successDiv.classList.add("hidden");
      
      document.getElementById("story").value = "";
      document.getElementById("intent").selectedIndex = 0;
      document.querySelectorAll(".privacyCheck").forEach(c => c.checked = false);
      document.querySelectorAll(".option").forEach(x => x.classList.remove("selected"));
      selectedCategory = "";
    }
  }
}

function toast(msg, ms = 3000) {
  let t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

const PROFANITY_MSG = "Your message contains inappropriate language. Please rephrase it. If you need to quote a word, mask it with asterisks (e.g. f***).";

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "CV-" + s + "-" + Math.floor(10 + Math.random() * 90);
}

function updateTrends() {
  const container = document.getElementById("trendContainer");
  if (!container) return;
  const defaultCategories = ["Academic Concern", "Institutional Concern", "Personal Experience", "Emotional Well-being", "Identity & Belonging"];
  const total = submissions.length;
  let trends = [];

  if (total === 0) {
    trends = defaultCategories.map(cat => ({ category: cat, percent: 0 }));
  } else {
    const counts = {};
    submissions.forEach(sub => { counts[sub.category] = (counts[sub.category] || 0) + 1; });
    trends = Object.keys(counts).map(cat => ({ category: cat, percent: Math.round((counts[cat] / total) * 100) })).sort((a, b) => b.percent - a.percent);
    if (trends.length < 5) {
      const existingCats = trends.map(t => t.category);
      for (const cat of defaultCategories) {
        if (!existingCats.includes(cat)) trends.push({ category: cat, percent: 0 });
        if (trends.length === 5) break;
      }
    }
    trends = trends.slice(0, 5);
  }

  container.innerHTML = trends.map(t => `
    <div class="card">
      <h3 style="display:flex; align-items:center;">${categoryIcons[t.category] || ""} ${t.category}</h3>
      <strong>${t.percent}%</strong>
      <div class="trend"><span style="width:${t.percent}%"></span></div>
    </div>
  `).join("");
}

function updateHeardSection() {
  const container = document.getElementById("heardContainer");
  if (!container) return;

  if (publishedResponses.length === 0) {
    container.innerHTML = `<p class="muted" style="padding: 20px; text-align: center; background: #fff; border: 1px dashed var(--line); border-radius: 12px; width: 100%;">No university responses have been published yet.</p>`;
    return;
  }

  container.innerHTML = publishedResponses.map(r => `
    <div class="card">
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.concern)}</p>
      <span class="status ${escapeHtml(r.statusclass)}">${escapeHtml(r.statuslabel)}</span>
    </div>
  `).join("");
}

// --- 3. SAVE SUBMISSION TO CLOUD DB WITH SPAM FILTERS ---
async function submitStory() {
  const story = document.getElementById("story").value.trim();
  const checks = [...document.querySelectorAll(".privacyCheck")];
  
  if(!selectedCategory) { toast("Please choose a concern category."); return; }
  
  if(story.length < 30) { 
    toast("Please write at least 30 characters to explain the situation clearly."); 
    return; 
  }
  
  // --- PROFANITY FILTER ---
  if (containsProfanity(story)) {
    toast(PROFANITY_MSG, 6000);
    document.getElementById("story").focus();
    return;
  }

  // --- SPAM DEFENSE 3.0 ---
  const textWithoutSpaces = story.replace(/\s/g, '');
  const uniqueChars = new Set(textWithoutSpaces).size;
  
  const isRepeatingChar = /(.)\1{5,}/.test(story); 
  const hasLongNonsenseWord = story.split(/\s+/).some(word => word.length > 20);
  const hasTooManyConsonants = /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(story);
  
  const words = story.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words).size;
  const isRepeatedWords = words.length > 5 && (uniqueWords / words.length) < 0.4;
  
  if (uniqueChars < 5 || isRepeatingChar || hasLongNonsenseWord || hasTooManyConsonants || isRepeatedWords) { 
    toast("Spam pattern detected. Please write a valid, meaningful concern."); 
    return; 
  }
  // -----------------------
  
  if(!checks.every(x => x.checked)) { toast("Please complete the privacy confirmations."); return; }
  
  const ref = code();
  const intent = document.getElementById("intent").value;
  
  const { error } = await supabaseClient.from('submissions').insert([
    { ref_code: ref, category: selectedCategory, intent: intent, story: story, status: "Received" }
  ]);

  if (error) {
    // Server-side filter (database trigger) caught something the browser check missed
    if (String(error.message).includes("PROFANITY_REJECTED")) {
      toast(PROFANITY_MSG, 6000);
      return;
    }
    toast("Error saving submission. Please try again.");
    console.error(error);
    return;
  }
  
  fetchLiveData(); 
  
  document.getElementById("submitFormContainer").classList.add("hidden");
  
  document.getElementById("submitSuccessContainer").innerHTML = `
    <div class="container formWrap" style="padding-top: 20px;">
      <div class="panel center animate-on-scroll is-visible" style="max-width:550px; margin:auto; border-top: 4px solid var(--green);">
        <div style="background: #e8f5e9; color: var(--green); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="eyebrow" style="color: var(--green);">Securely Received</div>
        <h2 style="margin-top: 5px;">Thank you for speaking up.</h2>
        <p class="muted">Your identity is protected, and your voice has been securely added to the system.</p>
        
        <div class="refBox" style="background: #f8fafc; border: 2px dashed var(--line); border-radius: 16px; margin: 25px 0; padding: 25px;">
          <div class="small muted" style="text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 5px;">Your Anonymous Tracking Code</div>
          <div class="ref" style="font-size: 32px; color: var(--navy); letter-spacing: 3px;">${ref}</div>
          <p class="small muted" style="margin-top: 10px;">Save this code or take a screenshot. You will need it to check for updates or responses from the university.</p>
        </div>
        
        <div class="actions" style="justify-content:center; gap: 15px;">
          <button class="btn primary" onclick="showPage('track'); document.getElementById('trackCode').value='${ref}'; trackSubmission();">Track Status Now</button>
          <button class="btn secondary" onclick="showPage('home')">Return Home</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("submitSuccessContainer").classList.remove("hidden");
  
  toast("Anonymous submission securely received.");
}

// --- 4. FETCH TRACKING STATUS DIRECTLY FROM CLOUD ---
async function trackSubmission() {
  const ref = document.getElementById("trackCode").value.trim().toUpperCase();
  const result = document.getElementById("trackResult");
  
  const { data: item, error } = await supabaseClient.from('submissions').select('*').eq('ref_code', ref).single();
  
  result.classList.remove("hidden");
  
  if(error || !item) {
    result.innerHTML = "<div class='notice animate-on-scroll is-visible'>No submission was found for that reference code. Check that it was entered correctly.</div>";
    return;
  }
  
  let statusClass = "review";
  if (item.status === "Received") statusClass = "received";
  if (item.status === "Responded") statusClass = "responded";
  if (item.status === "Archived") statusClass = "archived";
  
  result.innerHTML = `<div class="panel animate-on-scroll is-visible"><div style="display:flex;justify-content:space-between"><h3>${escapeHtml(item.category)}</h3><span class="status ${statusClass}">${escapeHtml(item.status)}</span></div><p class="small muted">Reference: ${escapeHtml(item.ref_code)}</p><p>${escapeHtml(item.story)}</p><hr style="border:0;border-top:1px solid var(--line)"><b>What happens next?</b><p class="small muted">Your concern may be reviewed individually and/or considered as part of recurring anonymous patterns.</p></div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[m]));
}

function initScrollObserver() {
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -20px 0px" };
  const observer = new IntersectionObserver((entries) => {
    let delay = 0;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setTimeout(() => { entry.target.classList.add('is-visible'); }, delay);
        delay += 100; 
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  document.querySelectorAll('.animate-on-scroll').forEach((el) => { observer.observe(el); });
}

// Call on startup
fetchLiveData();
initScrollObserver();