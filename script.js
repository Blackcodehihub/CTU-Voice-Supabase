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

const categoryIcons = {
  "Academic Concern": "🎓", "Institutional Concern": "🏛️", "Personal Experience": "👥",
  "Emotional Well-being": "♥", "Identity & Belonging": "◎", "Suggestion / Improvement": "💡",
  "Appeal / Request": "📣", "Other": "•••"
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

  // Refresh form logic to hide success message and empty fields for next user
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

function toast(msg) {
  let t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

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
      <h3>${categoryIcons[t.category] || "📌"} ${t.category}</h3>
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
  
  result.innerHTML = `<div class="panel animate-on-scroll is-visible"><div style="display:flex;justify-content:space-between"><h3>${item.category}</h3><span class="status ${statusClass}">${item.status}</span></div><p class="small muted">Reference: ${item.ref_code}</p><p>${escapeHtml(item.story)}</p><hr style="border:0;border-top:1px solid var(--line)"><b>What happens next?</b><p class="small muted">Your concern may be reviewed individually and/or considered as part of recurring anonymous patterns.</p></div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[m]));
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  const isConfidentialityChecked = document.getElementById("adminConfidentiality").checked;
  
  if (!isConfidentialityChecked) {
    toast("You must agree to the Strict Confidentiality Agreement before logging in.");
    return;
  }
  
  if (email === "admin@ctu.edu.ph" && pass === "admin123") {
    document.getElementById("mainNav").style.display = "none";
    showPage('dashboard');
    await fetchLiveData(); 
    loadDashboard();
    
    document.getElementById("adminConfidentiality").checked = false;
    
    toast("Welcome to the Admin Dashboard.");
  } else {
    toast("Incorrect email or password.");
  }
}

function handleLogout() {
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("mainNav").style.display = "flex";
  
  const passInput = document.getElementById("loginPassword");
  const icon = document.getElementById("eyeIcon");
  passInput.type = "password";
  icon.innerHTML = '<path d="M22 8C19.78 10.74 16.14 12.5 12 12.5C7.86 12.5 4.22 10.74 2 8"></path><path d="M12 12.5V16.5"></path><path d="M7.5 11.5L5.5 14.5"></path><path d="M16.5 11.5L18.5 14.5"></path>';
  
  showPage('home');
  toast("Successfully logged out.");
}

function togglePasswordVisibility() {
  const passInput = document.getElementById("loginPassword");
  const icon = document.getElementById("eyeIcon");
  
  if (passInput.type === "password") {
    passInput.type = "text";
    icon.innerHTML = '<path d="M2 12c2.22-2.74 5.86-4.5 10-4.5s7.78 1.76 10 4.5c-2.22 2.74-5.86 4.5-10 4.5s-7.78-1.76-10-4.5z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    passInput.type = "password";
    icon.innerHTML = '<path d="M22 8C19.78 10.74 16.14 12.5 12 12.5C7.86 12.5 4.22 10.74 2 8"></path><path d="M12 12.5V16.5"></path><path d="M7.5 11.5L5.5 14.5"></path><path d="M16.5 11.5L18.5 14.5"></path>';
  }
}

function loadDashboard() {
  const total = submissions.length;
  const received = submissions.filter(s => s.status === "Received").length;
  const review = submissions.filter(s => s.status === "Under Review").length;
  const responded = submissions.filter(s => s.status === "Responded").length;
  const archived = submissions.filter(s => s.status === "Archived").length;

  document.getElementById("adminMetrics").innerHTML = `
    <div class="card" style="border-left:4px solid var(--navy);"><h3>Total Feedback</h3><p style="font-size:24px; font-weight:900; color:var(--navy); margin:5px 0;">${total}</p></div>
    <div class="card" style="border-left:4px solid #a32d3c;"><h3>Received</h3><p style="font-size:24px; font-weight:900; color:#a32d3c; margin:5px 0;">${received}</p></div>
    <div class="card" style="border-left:4px solid #8a6100;"><h3>Under Review</h3><p style="font-size:24px; font-weight:900; color:#8a6100; margin:5px 0;">${review}</p></div>
    <div class="card" style="border-left:4px solid #377d22;"><h3>Responded</h3><p style="font-size:24px; font-weight:900; color:#377d22; margin:5px 0;">${responded}</p></div>
    <div class="card" style="border-left:4px solid #68758a;"><h3>Spam / Archived</h3><p style="font-size:24px; font-weight:900; color:#68758a; margin:5px 0;">${archived}</p></div>
  `;

  const catFilter = document.getElementById("filterCategory").value;
  const statFilter = document.getElementById("filterStatus").value;

  const filtered = submissions.filter(s => {
    const matchCat = catFilter === "All" || s.category === catFilter;
    const matchStat = statFilter === "All" || s.status === statFilter;
    return matchCat && matchStat;
  });

  const tbody = document.getElementById("adminTableBody");
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="center muted" style="padding:30px;">No submissions match your filters.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = filtered.map(sub => {
    const dateStr = new Date(sub.created_at).toLocaleDateString();
    return `
      <tr>
        <td style="font-size:12px; color:var(--muted);">${dateStr}</td>
        <td><strong>${sub.ref_code}</strong></td>
        <td><span style="font-size:12px;">${sub.category}</span></td>
        <td>
          <select class="status-select" onchange="updateStatus('${sub.ref_code}', this.value)">
            <option value="Received" ${sub.status === 'Received' ? 'selected' : ''}>Received</option>
            <option value="Under Review" ${sub.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option value="Responded" ${sub.status === 'Responded' ? 'selected' : ''}>Responded</option>
            <option value="Archived" ${sub.status === 'Archived' ? 'selected' : ''}>Archived (Spam)</option>
          </select>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn secondary" style="padding:6px 10px!important; font-size:11px;" onclick="viewSubmission('${sub.ref_code}')">View</button>
            <button class="btn primary" style="padding:6px 10px!important; font-size:11px;" onclick="openPublishModal('${sub.ref_code}')">Publish</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// --- 5. UPDATE STATUS IN CLOUD ---
async function updateStatus(ref, newStatus) {
  const { error } = await supabaseClient.from('submissions').update({ status: newStatus }).eq('ref_code', ref);
  
  if (error) {
    toast("Error updating status.");
    console.error(error);
  } else {
    await fetchLiveData(); 
    loadDashboard(); 
    toast(`Status updated to ${newStatus}`);
  }
}

function viewSubmission(ref) {
  const item = submissions.find(s => s.ref_code === ref);
  if(!item) return;

  document.getElementById("viewCategory").textContent = item.category;
  document.getElementById("viewRef").textContent = item.ref_code;
  document.getElementById("viewDate").textContent = new Date(item.created_at).toLocaleDateString();
  document.getElementById("viewIntent").textContent = item.intent;
  document.getElementById("viewStory").textContent = item.story;
  
  document.getElementById("viewModal").classList.add("active");
}

function openPublishModal(ref) {
  const item = submissions.find(s => s.ref_code === ref);
  if(!item) return;

  document.getElementById("pubTitle").value = ""; 
  document.getElementById("pubConcern").value = "";
  
  document.getElementById("publishModal").classList.add("active");
}

// --- 6. PUBLISH TO CLOUD DB ---
async function publishResponse() {
  const title = document.getElementById("pubTitle").value.trim();
  const concern = document.getElementById("pubConcern").value.trim();
  const label = document.getElementById("pubStatusLabel").value;

  if(!title || !concern) {
    toast("Please fill out both the title and the concern summary.");
    return;
  }

  let statusClass = "review";
  if(label === "Action underway" || label === "Support shared" || label === "Policy updated") statusClass = "responded";

  const { error } = await supabaseClient.from('responses').insert([
    { title: title, concern: concern, statuslabel: label, statusclass: statusClass }
  ]);

  if (error) {
    toast("Error publishing response.");
    console.error(error);
    return;
  }
  
  await fetchLiveData(); 
  closeModal('publishModal');
  toast("Response successfully published to 'You Said. We Heard.'");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
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