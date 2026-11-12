const supabaseUrl = 'https://dhednhohxzpwcbtwwchw.supabase.co';
const supabaseKey = 'sb_publishable_RZdvcVIeoPE3eXqZO3iHRA_zRi0SBgX';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let submissions = [];

async function fetchLiveData() {
  const { data: subData } = await supabaseClient.from('submissions').select('*').order('created_at', { ascending: false });
  if (subData) submissions = subData;
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top: 0, behavior: "smooth"});
}

function toast(msg, ms = 3000) {
  let t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[m]));
}

// --- AUTH (Supabase Auth: the session is stored by supabase-js and survives a page refresh) ---
let dashboardOpen = false;

async function isAdmin() {
  const { data, error } = await supabaseClient.rpc("is_admin");
  return !error && data === true;
}

async function enterDashboard() {
  if (dashboardOpen) return;
  dashboardOpen = true;
  document.getElementById("adminNav").style.display = "none";
  showPage("dashboard");
  await fetchLiveData();
  loadDashboard();
}

function showLogin() {
  dashboardOpen = false;
  submissions = [];
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("adminNav").style.display = "flex";

  const passInput = document.getElementById("loginPassword");
  const icon = document.getElementById("eyeIcon");
  passInput.type = "password";
  icon.innerHTML = '<path d="M22 8C19.78 10.74 16.14 12.5 12 12.5C7.86 12.5 4.22 10.74 2 8"></path><path d="M12 12.5V16.5"></path><path d="M7.5 11.5L5.5 14.5"></path><path d="M16.5 11.5L18.5 14.5"></path>';

  showPage("login");
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  if (!document.getElementById("adminConfidentiality").checked) {
    toast("You must agree to the Strict Confidentiality Agreement before logging in.");
    return;
  }
  if (!email || !pass) {
    toast("Please enter your email and password.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if (error) {
    toast("Incorrect email or password.");
    return;
  }
  if (!(await isAdmin())) {
    await supabaseClient.auth.signOut();
    toast("This account doesn't have admin access.", 4000);
    return;
  }

  document.getElementById("adminConfidentiality").checked = false;
  await enterDashboard();
  toast("Welcome to the Admin Dashboard.");
}

async function handleLogout() {
  await supabaseClient.auth.signOut(); // the SIGNED_OUT listener below switches back to the login page
}

async function initAdmin() {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      const wasOpen = dashboardOpen;
      showLogin();
      if (wasOpen) toast("Successfully logged out.");
    }
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  // A student session in the same browser is not an admin session
  if (session && await isAdmin()) await enterDashboard();
  else showLogin();
  document.getElementById("authLoading").style.display = "none";

  // Table actions (data-* attributes instead of inline onclick keeps user-supplied text out of JS)
  const tbody = document.getElementById("adminTableBody");
  tbody.addEventListener("change", e => {
    if (e.target.matches(".status-select")) updateStatus(e.target.dataset.ref, e.target.value);
  });
  tbody.addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "view") viewSubmission(btn.dataset.ref);
    if (btn.dataset.action === "publish") openPublishModal(btn.dataset.ref);
  });
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
    const ref = escapeHtml(sub.ref_code);
    const opt = (v, label) => `<option value="${v}" ${sub.status === v ? "selected" : ""}>${label}</option>`;
    return `
      <tr>
        <td style="font-size:12px; color:var(--muted);">${dateStr}</td>
        <td><strong>${ref}</strong></td>
        <td><span style="font-size:12px;">${escapeHtml(sub.category)}</span></td>
        <td>
          <select class="status-select" data-ref="${ref}">
            ${opt("Received", "Received")}${opt("Under Review", "Under Review")}${opt("Responded", "Responded")}${opt("Archived", "Archived (Spam)")}
          </select>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn secondary" style="padding:6px 10px!important; font-size:11px;" data-action="view" data-ref="${ref}">View</button>
            <button class="btn primary" style="padding:6px 10px!important; font-size:11px;" data-action="publish" data-ref="${ref}">Publish</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function updateStatus(ref, newStatus) {
  const { error } = await supabaseClient.from('submissions').update({ status: newStatus }).eq('ref_code', ref);
  
  if (error) {
    toast("Error updating status.");
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
    return;
  }
  
  closeModal('publishModal');
  toast("Response successfully published to 'You Said. We Heard.'");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

initAdmin();