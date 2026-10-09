/* Hostel desk - plain HTML/CSS/JS. Data is saved in the browser (localStorage). */
const KEY = "hostelDesk.v1";
const ROOM_TYPES = ["Dorm", "Single", "Double", "Triple"];
const CATEGORIES = ["Maintenance", "Cleanliness", "Electrical", "Plumbing", "Noise", "Food", "Security", "Other"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const AVATAR_COLORS = ["#0B8A7D", "#2F6FED", "#B4470F", "#7C3AED", "#BE185D", "#4D7C0F"];

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12v.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.4c2 .8 3.5 2.6 3.5 5.6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const bedIcon = full => `<svg class="bed-ic ${full ? "full" : ""}" viewBox="0 0 24 16" aria-hidden="true"><rect x="0" y="6" width="24" height="7" rx="2" fill="currentColor"/><rect x="1" y="0" width="3" height="16" rx="1.5" fill="currentColor"/><rect x="6" y="2" width="7" height="5" rx="2" fill="currentColor"/></svg>`;

/* ---------- data ---------- */
let db = load();
const ui = { view: "dashboard", roomFilter: "all", resTab: "active", q: "", roomId: null, adminTab: "reports", loginMode: "staff" };
let cur = null;
let ringShown = false;

function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d || !d.rooms) d = { rooms: [], residents: [], complaints: [], nextId: 1 };
  return migrate(d);
}
function migrate(d) {
  d.rooms ??= []; d.residents ??= []; d.complaints ??= []; d.nextId ??= 1;
  d.users ??= []; d.log ??= []; d.settings ??= { hostelName: "Hostel desk" };
  const t = Date.now();
  d.residents.forEach(p => { p.checkInTs ??= t; if (p.status !== "active") p.checkOutTs ??= t; });
  d.complaints.forEach(c => { c.createdTs ??= t; if (c.status === "Resolved") c.resolvedTs ??= t; });
  return d;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast("Could not save: browser storage is blocked."); }
}
const id = () => db.nextId++;
const now = () => new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);

const stay = r => db.residents.filter(p => p.roomId === r.id && p.status === "active");
const occ = r => stay(r).length;
const free = r => r.capacity - occ(r);
const roomById = x => db.rooms.find(r => r.id === Number(x));
const sortedRooms = () => [...db.rooms].sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, undefined, { numeric: true }));
const roomState = r => free(r) === 0 ? "full" : (free(r) === 1 && r.capacity > 1) || free(r) <= r.capacity * 0.25 ? "few" : "free";
const stateLabel = r => ({ full: "Full", few: "Almost full", free: "Available" }[roomState(r)]);
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const avatar = n => `<span class="avatar" style="background:${AVATAR_COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]}">${esc(initials(n))}</span>`;

function toast(msg) {
  const t = $("#toast");
  t.innerHTML = icon("check") + `<span>${esc(msg)}</span>`;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- modal ---------- */
let modalHandler = null;
function openForm(title, body, label, onSubmit) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modalSubmit").textContent = label;
  modalHandler = onSubmit;
  $("#modal").showModal();
}
$("#modalForm").addEventListener("submit", e => {
  e.preventDefault();
  const result = modalHandler ? modalHandler(Object.fromEntries(new FormData(e.target))) : undefined;
  Promise.resolve(result).then(v => { if (v !== false) $("#modal").close(); });
});
$("#modalCancel").addEventListener("click", () => $("#modal").close());

/* ---------- shared pieces ---------- */
function keyTag(r) {
  const st = roomState(r), o = occ(r);
  const bedRow = Array.from({ length: r.capacity }, (_, i) => bedIcon(i < o)).join("");
  return `<button class="key state-${st}" data-action="room" data-id="${r.id}" aria-label="Room ${esc(r.number)}, ${stateLabel(r)}">
    <span class="key-head"><span class="key-hole"></span><span class="key-num">${esc(r.number)}</span></span>
    <span class="key-body">
      <span class="small">${esc(r.type)}, floor ${r.floor}</span>
      <span class="beds">${bedRow}</span>
      <span class="pill ${st}">${st === "full" ? "Full" : free(r) + " free"}</span>
    </span></button>`;
}
const emptyState = (text, btn = "") => `<div class="empty"><span class="empty-art">${icon("bed")}</span><p>${text}</p>${btn}</div>`;
const pr = p => `pr-${p.toLowerCase()}`;

/* ---------- views ---------- */
function renderDashboard() {
  const rooms = sortedRooms();
  const totalBeds = rooms.reduce((n, r) => n + r.capacity, 0);
  const occupied = rooms.reduce((n, r) => n + occ(r), 0);
  const freeRooms = rooms.filter(r => free(r) > 0).length;
  const open = db.complaints.filter(c => c.status !== "Resolved");
  const pct = totalBeds ? Math.round(occupied / totalBeds * 100) : 0;
  const hr = new Date().getHours();
  const hello = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const floors = [...new Set(rooms.map(r => r.floor))];
  const recent = db.residents.filter(p => p.status === "active").sort((a, b) => b.id - a.id).slice(0, 4);

  return `
  <div class="page-head"><div><h1>${hello}${cur ? ", " + esc(cur.name.split(" ")[0]) : ""}</h1><p class="muted">${today}</p></div></div>

  <section class="hero">
    <div>
      <div class="big">${totalBeds - occupied}</div>
      <p class="lead">beds free right now${rooms.length ? `, across ${freeRooms} room${freeRooms === 1 ? "" : "s"}` : ". Add rooms to get started."}</p>
      <button class="btn" data-action="checkin">${icon("plus")}Check in a guest</button>
    </div>
    <div class="ring" role="img" aria-label="${pct}% of beds occupied">
      <svg viewBox="0 0 140 140"><circle class="ring-bg" cx="70" cy="70" r="54"/>
        <circle class="ring-fg" cx="70" cy="70" r="54" transform="rotate(-90 70 70)" data-pct="${pct}" stroke-dasharray="${ringShown ? pct * 3.393 : 0} 339.3"/></svg>
      <div class="ring-text"><b>${pct}%</b><span>occupied</span></div>
    </div>
  </section>

  <section class="stats">
    <div class="stat t-sky"><span class="stat-ic">${icon("door")}</span><div><b>${rooms.length}</b><span>Rooms</span></div></div>
    <div class="stat t-teal"><span class="stat-ic">${icon("users")}</span><div><b>${occupied}</b><span>Guests staying</span></div></div>
    <div class="stat t-sun"><span class="stat-ic">${icon("key")}</span><div><b>${rooms.length - freeRooms}</b><span>Full rooms</span></div></div>
    <div class="stat t-coral"><span class="stat-ic">${icon("flag")}</span><div><b>${open.length}</b><span>Open complaints</span></div></div>
  </section>

  <div class="split">
    <section>
      <div class="page-head" style="margin-bottom:14px"><h2>Room board</h2><button class="link" data-view="rooms">Manage rooms</button></div>
      ${rooms.length ? floors.map(f => {
        const fr = rooms.filter(r => r.floor === f);
        const fb = fr.reduce((n, r) => n + free(r), 0);
        return `<div class="floor"><div class="floor-head"><h2>Floor ${f}</h2><span>${fb} bed${fb === 1 ? "" : "s"} free</span></div>
          <div class="keys">${fr.map(keyTag).join("")}</div></div>`;
      }).join("") : emptyState("No rooms yet. Add your first room to start taking check-ins.",
        `<div class="actions"><button class="btn" data-action="addRoom">${icon("plus")}Add a room</button><button class="btn ghost" data-action="demo">Load demo data</button></div>`)}
    </section>
    <section>
      <div class="panel">
        <div class="panel-head"><h2>Needs attention</h2><button class="link" data-view="complaints">View all</button></div>
        ${open.length ? sortComplaints(open).slice(0, 4).map(c => `<div class="row">
          <span class="pill ${c.priority === "Urgent" ? "full" : c.priority === "High" ? "few" : "sky"}">${c.priority}</span>
          <div><strong>${esc(c.title)}</strong><span class="muted small">${esc(c.category)}${roomById(c.roomId) ? ", room " + esc(roomById(c.roomId).number) : ""}</span></div></div>`).join("")
          : `<div class="empty small-empty"><p>All clear. No open complaints.</p></div>`}
        <button class="btn ghost small" style="margin-top:12px" data-action="complaint">${icon("plus")}Raise a complaint</button>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Latest check-ins</h2></div>
        ${recent.length ? recent.map(p => `<div class="row">${avatar(p.name)}
          <div><strong>${esc(p.name)}</strong><span class="muted small">Room ${esc(roomById(p.roomId)?.number ?? "?")}, ${esc(p.checkIn)}</span></div></div>`).join("")
          : `<div class="empty small-empty"><p>Nobody has checked in yet.</p></div>`}
      </div>
    </section>
  </div>`;
}

function renderRooms() {
  let rooms = sortedRooms();
  if (ui.roomFilter === "available") rooms = rooms.filter(r => free(r) > 0);
  if (ui.roomFilter === "full") rooms = rooms.filter(r => free(r) === 0);
  const tab = (k, l) => `<button class="${ui.roomFilter === k ? "on" : ""}" data-filter="roomFilter" data-value="${k}">${l}</button>`;
  return `
  <div class="page-head"><div><h1>Rooms</h1><p class="muted">${db.rooms.length} room${db.rooms.length === 1 ? "" : "s"} in the hostel</p></div>
    <button class="btn" data-action="addRoom">${icon("plus")}Add room</button></div>
  <div class="toolbar"><div class="tabs">${tab("all", "All")}${tab("available", "Available")}${tab("full", "Full")}</div></div>
  ${rooms.length ? `<div class="keys">${rooms.map(keyTag).join("")}</div>`
    : emptyState(db.rooms.length ? "No rooms match this filter." : "No rooms yet. Add one to get started.",
        db.rooms.length ? "" : `<button class="btn" data-action="addRoom">${icon("plus")}Add a room</button>`)}`;
}

function renderRoomDetail() {
  const r = roomById(ui.roomId);
  if (!r) { ui.view = "rooms"; return renderRooms(); }
  const people = stay(r);
  const comps = db.complaints.filter(c => c.roomId === r.id).sort((a, b) => b.id - a.id);
  const slots = Array.from({ length: r.capacity }, (_, i) => {
    const p = people[i];
    return p ? `<div class="slot">${avatar(p.name)}
        <div><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.phone || "No phone")}, since ${esc(p.checkIn)}</div></div>
        <button class="btn danger small" data-action="checkout" data-id="${p.id}">Check out</button></div>`
      : `<button class="slot empty-slot" data-action="checkin" data-id="${r.id}"><span class="slot-ic">${icon("plus")}</span><div><strong>Empty bed</strong><div class="small">Check someone in</div></div></button>`;
  }).join("");
  return `
  <button class="back" data-view="rooms">${icon("back")}All rooms</button>
  <section class="banner state-${roomState(r)}">
    <div><h1>Room ${esc(r.number)}</h1><p>${esc(r.type)}, floor ${r.floor}. ${occ(r)} of ${r.capacity} beds taken, ${stateLabel(r).toLowerCase()}.</p></div>
    <button class="btn" data-action="complaint" data-id="${r.id}">${icon("flag")}Raise complaint</button>
  </section>
  <h2 style="margin-bottom:12px">Beds</h2>
  <div class="slots">${slots}</div>
  <div class="panel"><div class="panel-head"><h2>Complaints for this room</h2></div>
    ${comps.length ? comps.map(c => `<div class="row"><span class="pill ${c.priority === "Urgent" ? "full" : c.priority === "High" ? "few" : "sky"}">${c.priority}</span>
      <div><strong>${esc(c.title)}</strong><span class="muted small">${c.status}, ${esc(c.createdAt)}</span></div></div>`).join("")
      : `<div class="empty small-empty"><p>No complaints on record.</p></div>`}
  </div>
  ${isAdmin() ? `<button class="btn danger small" data-action="deleteRoom" data-id="${r.id}">${icon("trash")}Delete room</button>` : ""}`;
}

function renderResidents() {
  const q = ui.q.trim().toLowerCase();
  let list = [...db.residents].sort((a, b) => b.id - a.id);
  if (ui.resTab === "active") list = list.filter(p => p.status === "active");
  if (ui.resTab === "past") list = list.filter(p => p.status !== "active");
  if (q) list = list.filter(p => [p.name, p.phone, roomById(p.roomId)?.number].some(v => String(v ?? "").toLowerCase().includes(q)));
  const tab = (k, l) => `<button class="${ui.resTab === k ? "on" : ""}" data-filter="resTab" data-value="${k}">${l}</button>`;
  return `
  <div class="page-head"><div><h1>Residents</h1><p class="muted">${db.residents.filter(p => p.status === "active").length} staying now</p></div>
    <button class="btn" data-action="checkin">${icon("plus")}Check in</button></div>
  <div class="toolbar">
    <div class="tabs">${tab("active", "Staying")}${tab("past", "Checked out")}${tab("all", "Everyone")}</div>
    <div class="search">${icon("search")}<input type="search" id="search" value="${esc(ui.q)}" placeholder="Search name, phone or room" aria-label="Search residents"></div>
  </div>
  ${list.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Guest</th><th>Room</th><th>Phone</th><th>ID proof</th><th>Checked in</th><th>Status</th><th>Portal</th><th></th></tr></thead>
    <tbody>${list.map(p => `<tr>
      <td><div class="who">${avatar(p.name)}<strong>${esc(p.name)}</strong></div></td>
      <td><button class="link" data-action="room" data-id="${p.roomId}">${esc(roomById(p.roomId)?.number ?? "?")}</button></td>
      <td>${esc(p.phone)}</td><td>${esc(p.idProof)}</td><td>${esc(p.checkIn)}</td>
      <td>${p.status === "active" ? `<span class="pill free">Staying</span>` : `<span class="pill">Left ${esc(p.checkOut || "")}</span>`}</td>
      <td>${(u => u ? `<span class="pill sky">${esc(u.username)}</span>` : `<span class="muted small">No login</span>`)(userForResident(p.id))}</td>
      <td>${p.status === "active" ? `<div class="admin-actions"><button class="btn ghost small" data-action="${userForResident(p.id) ? "resetLogin" : "createLogin"}" data-id="${p.id}">${userForResident(p.id) ? "Reset login" : "Create login"}</button>
        <button class="btn danger small" data-action="checkout" data-id="${p.id}">Check out</button></div>` : ""}</td>
    </tr>`).join("")}</tbody></table></div>`
  : emptyState("No residents found.")}`;
}

function sortComplaints(list) {
  const rank = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  return [...list].sort((a, b) => rank[a.priority] - rank[b.priority] || b.id - a.id);
}

function renderComplaints() {
  const cols = [["Open", "c-open"], ["In progress", "c-prog"], ["Resolved", "c-done"]];
  const moves = { "Open": [["In progress", "Start work"], ["Resolved", "Resolve"]], "In progress": [["Resolved", "Resolve"], ["Open", "Back to open"]], "Resolved": [["Open", "Reopen"]] };
  return `
  <div class="page-head"><div><h1>Complaints</h1><p class="muted">${db.complaints.filter(c => c.status !== "Resolved").length} need attention</p></div>
    <button class="btn" data-action="complaint">${icon("plus")}Raise a complaint</button></div>
  <div class="board">${cols.map(([name, cls]) => {
    const items = sortComplaints(db.complaints.filter(c => c.status === name));
    return `<section class="col ${cls}"><div class="col-head"><i></i>${name}<span>${items.length}</span></div>
      ${items.length ? items.map(c => {
        const room = roomById(c.roomId), who = db.residents.find(p => p.id === c.residentId);
        return `<article class="card ${pr(c.priority)}">
          <div class="meta"><span class="pill ${c.priority === "Urgent" ? "full" : c.priority === "High" ? "few" : "sky"}">${c.priority}</span>
            <span class="pill">${esc(c.category)}</span>${room ? `<span class="pill">Room ${esc(room.number)}</span>` : ""}</div>
          <h3>${esc(c.title)}</h3>
          ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
          <div class="small muted">${who ? esc(who.name) + ", " : ""}${esc(c.createdAt)}${c.resolvedAt ? ". Resolved " + esc(c.resolvedAt) : ""}</div>
          <div class="foot"><div class="actions">${moves[name].map(([s, l]) => `<button class="btn ghost small" data-action="status" data-id="${c.id}" data-status="${s}">${l}</button>`).join("")}</div>
            ${isAdmin() ? `<button class="icon-btn" data-action="deleteComplaint" data-id="${c.id}" aria-label="Delete complaint">${icon("trash")}</button>` : ""}</div>
        </article>`;
      }).join("") : `<p class="muted small" style="padding:8px 4px">Nothing here.</p>`}</section>`;
  }).join("")}</div>`;
}

/* ---------- render ---------- */
function render() {
  if (!cur) return;
  const GUEST_VIEWS = ["myStay", "myComplaints"];
  if (cur.role === "guest") { if (!GUEST_VIEWS.includes(ui.view)) ui.view = "myStay"; }
  else if (GUEST_VIEWS.includes(ui.view) || (ui.view === "admin" && !isAdmin())) ui.view = "dashboard";
  const views = { dashboard: renderDashboard, rooms: renderRooms, roomDetail: renderRoomDetail, residents: renderResidents, complaints: renderComplaints, admin: renderAdmin,
                  myStay: renderMyStay, myComplaints: renderMyComplaints };
  $("#view").innerHTML = views[ui.view]();
  document.querySelectorAll("[data-for]").forEach(el => {
    const f = el.dataset.for;
    el.hidden = !(f === "admin" ? cur.role === "admin" : f === "staff" ? cur.role !== "guest" : cur.role === "guest");
  });
  document.querySelectorAll(".hostel-name").forEach(el => { el.textContent = db.settings.hostelName; });
  document.title = db.settings.hostelName;
  $("#chipName").textContent = cur.name; $("#chipRole").textContent = cur.role;
  $("#chipAvatar").textContent = initials(cur.name); $("#chipAvatar").style.background = "#0B8A7D";
  const navView = ui.view === "roomDetail" ? "rooms" : ui.view;
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.view === navView));
  const fr = db.rooms.filter(r => free(r) > 0).length, oc = db.complaints.filter(c => c.status !== "Resolved").length;
  $("#badgeRooms").textContent = fr || "";
  $("#badgeComplaints").textContent = oc || "";
  const ring = $(".ring-fg");
  if (ring && !ringShown) {
    ringShown = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDasharray = `${ring.dataset.pct * 3.393} 339.3`; }));
  }
  window.scrollTo(0, 0);
}
function refresh() { const y = window.scrollY; render(); window.scrollTo(0, y); }

/* ---------- actions ---------- */
const actions = {
  room(el) { ui.roomId = Number(el.dataset.id); ui.view = "roomDetail"; render(); },

  addRoom() {
    openForm("Add a room", `
      <label>Room number<input name="number" required placeholder="e.g. 104" autofocus></label>
      <label>Floor<input name="floor" type="number" min="0" value="1"></label>
      <label>Beds<input name="capacity" type="number" min="1" max="30" value="2" required></label>
      <label>Type<select name="type">${ROOM_TYPES.map(t => `<option>${t}</option>`).join("")}</select></label>`,
      "Add room", d => {
        const number = d.number.trim(), capacity = parseInt(d.capacity, 10);
        if (!number || !(capacity >= 1)) { toast("Enter a room number and at least 1 bed."); return false; }
        if (db.rooms.some(r => r.number.toLowerCase() === number.toLowerCase())) { toast(`Room ${number} already exists. Use a different number.`); return false; }
        db.rooms.push({ id: id(), number, floor: parseInt(d.floor, 10) || 0, capacity, type: d.type });
        logAct(`Added room ${number} (${capacity} beds)`); save(); refresh(); toast(`Room ${number} added.`);
      });
  },

  checkin(el) {
    const open = sortedRooms().filter(r => free(r) > 0);
    if (!open.length) return toast(db.rooms.length ? "Every room is full. Free up a bed first." : "Add a room before checking anyone in.");
    const chosen = Number(el.dataset.id) || "";
    openForm("Check in a guest", `
      <label>Full name<input name="name" required autofocus></label>
      <label>Phone<input name="phone" inputmode="tel"></label>
      <label>ID proof (type and number)<input name="idProof" placeholder="e.g. Aadhaar ending 4821"></label>
      <label>Room<select name="roomId" required>${open.map(r =>
        `<option value="${r.id}" ${r.id === chosen ? "selected" : ""}>Room ${esc(r.number)}, floor ${r.floor}, ${esc(r.type)}, ${free(r)} free</option>`).join("")}</select></label>
      <label class="check"><input type="checkbox" name="portal" checked> Create a guest portal login</label>`,
      "Check in", async d => {
        const r = roomById(d.roomId);
        if (!r || free(r) <= 0) { toast("That room is full. Pick a room with a free bed."); return false; }
        const person = { id: id(), name: d.name.trim(), phone: d.phone.trim(), idProof: d.idProof.trim(), roomId: r.id, checkIn: now(), checkInTs: Date.now(), checkOut: null, status: "active" };
        db.residents.push(person);
        const creds = d.portal ? await newGuestLogin(person) : null;
        logAct(`Checked in ${d.name.trim()} to room ${r.number}`);
        save(); refresh(); toast(`${d.name.trim()} checked in to room ${r.number}.`);
        if (creds) setTimeout(() => showCreds(creds), 0);
      });
  },

  checkout(el) {
    const p = db.residents.find(x => x.id === Number(el.dataset.id));
    if (!p || p.status !== "active" || !confirm(`Check out ${p.name}?`)) return;
    p.status = "checked_out"; p.checkOut = now(); p.checkOutTs = Date.now();
    logAct(`Checked out ${p.name}`);
    save(); refresh(); toast(`${p.name} checked out.`);
  },

  deleteRoom(el) {
    if (!isAdmin()) return toast("Only an admin can delete rooms.");
    const r = roomById(el.dataset.id);
    if (occ(r)) return toast("This room still has residents. Check them out first.");
    if (db.residents.some(p => p.roomId === r.id) || db.complaints.some(c => c.roomId === r.id))
      return toast("This room has past records, so it can't be deleted.");
    if (!confirm(`Delete room ${r.number}?`)) return;
    db.rooms = db.rooms.filter(x => x.id !== r.id);
    logAct(`Deleted room ${r.number}`);
    save(); ui.view = "rooms"; render(); toast("Room deleted.");
  },

  complaint(el) {
    const preRoom = Number(el.dataset.id) || "";
    const people = db.residents.filter(p => p.status === "active");
    openForm("Raise a complaint", `
      <label>Title<input name="title" required placeholder="e.g. Tap leaking in bathroom" autofocus></label>
      <label>Details<textarea name="description" rows="3"></textarea></label>
      <label>Category<select name="category">${CATEGORIES.map(c => `<option>${c}</option>`).join("")}</select></label>
      <label>Priority<select name="priority">${PRIORITIES.map(p => `<option ${p === "Normal" ? "selected" : ""}>${p}</option>`).join("")}</select></label>
      <label>Raised by (optional)<select name="residentId"><option value="">Staff / not listed</option>${people.map(p =>
        `<option value="${p.id}">${esc(p.name)} (room ${esc(roomById(p.roomId)?.number ?? "?")})</option>`).join("")}</select></label>
      <label>Room (optional, taken from guest if blank)<select name="roomId"><option value="">No specific room</option>${sortedRooms().map(r =>
        `<option value="${r.id}" ${r.id === preRoom ? "selected" : ""}>Room ${esc(r.number)}</option>`).join("")}</select></label>`,
      "Raise complaint", d => {
        const resident = d.residentId ? Number(d.residentId) : null;
        let roomId = d.roomId ? Number(d.roomId) : null;
        if (resident && !roomId) roomId = db.residents.find(p => p.id === resident)?.roomId ?? null;
        db.complaints.push({ id: id(), residentId: resident, roomId, title: d.title.trim(), description: d.description.trim(),
          category: d.category, priority: d.priority, status: "Open", createdAt: now(), createdTs: Date.now(), resolvedAt: null });
        logAct(`Raised complaint "${d.title.trim()}" (${d.priority})`);
        save(); refresh(); toast("Complaint raised.");
      });
  },

  status(el) {
    const c = db.complaints.find(x => x.id === Number(el.dataset.id));
    c.status = el.dataset.status;
    c.resolvedAt = c.status === "Resolved" ? now() : null;
    c.resolvedTs = c.status === "Resolved" ? Date.now() : null;
    logAct(`Complaint "${c.title}" marked ${c.status.toLowerCase()}`);
    save(); refresh(); toast(`Marked as ${c.status.toLowerCase()}.`);
  },

  deleteComplaint(el) {
    if (!isAdmin()) return toast("Only an admin can delete complaints.");
    if (!confirm("Delete this complaint?")) return;
    logAct("Deleted a complaint");
    db.complaints = db.complaints.filter(c => c.id !== Number(el.dataset.id));
    save(); refresh(); toast("Complaint deleted.");
  },

  async demo() {
    if (db.rooms.length) return toast("Demo data can only be loaded into an empty hostel.");
    const DAY = 86400000, ids = {};
    [["101", 1, 4, "Dorm"], ["102", 1, 4, "Dorm"], ["103", 1, 2, "Double"], ["201", 2, 1, "Single"], ["202", 2, 3, "Triple"], ["203", 2, 2, "Double"]]
      .forEach(([n, f, c, t]) => { ids[n] = id(); db.rooms.push({ id: ids[n], number: n, floor: f, capacity: c, type: t }); });
    const first = id();
    [[first, "Aman Singh", "9876500001", "101", 0], [id(), "Ravi Kumar", "9876500002", "101", 1], [id(), "Karan Mehta", "9876500003", "101", 1],
     [id(), "Neha Sharma", "9876500006", "103", 2], [id(), "Jaspreet Kaur", "9876500004", "201", 3], [id(), "Simran Gill", "9876500005", "202", 5]]
      .forEach(([pid, name, phone, room, ago]) => db.residents.push({ id: pid, name, phone, idProof: "", roomId: ids[room], checkIn: now(), checkInTs: Date.now() - ago * DAY, checkOut: null, status: "active" }));
    db.residents.push({ id: id(), name: "Tarun Verma", phone: "9876500007", idProof: "", roomId: ids["102"], checkIn: now(), checkInTs: Date.now() - 6 * DAY,
      checkOut: now(), checkOutTs: Date.now() - 2 * DAY, status: "checked_out" });
    db.complaints.push(
      { id: id(), residentId: first, roomId: ids["101"], title: "Ceiling fan not working", description: "Fan stops after a few minutes.", category: "Electrical", priority: "High", status: "Open", createdAt: now(), createdTs: Date.now(), resolvedAt: null },
      { id: id(), residentId: null, roomId: ids["202"], title: "Bathroom tap leaking", description: "", category: "Plumbing", priority: "Normal", status: "In progress", createdAt: now(), createdTs: Date.now() - DAY, resolvedAt: null },
      { id: id(), residentId: null, roomId: ids["103"], title: "Wi-Fi drops at night", description: "", category: "Maintenance", priority: "Low", status: "Resolved", createdAt: now(), createdTs: Date.now() - 3 * DAY, resolvedAt: now(), resolvedTs: Date.now() - DAY });
    const aman = db.residents.find(p => p.name === "Aman Singh");
    if (!db.users.some(u => u.username === "aman")) db.users.push(await makeUser(aman.name, "aman", "guest123", "guest", { residentId: aman.id }));
    logAct("Loaded demo data");
    save(); render(); toast("Demo data loaded. Guest login: aman / guest123");
  },
};

/* ---------- auth ---------- */
const SESSION_KEY = "hostelDesk.session";
const isAdmin = () => !!cur && cur.role === "admin";
const fmtTs = ts => new Date(ts).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function logAct(text) {
  db.log.unshift({ ts: Date.now(), user: cur ? cur.name : "System", text });
  if (db.log.length > 300) db.log.length = 300;
}

async function hashPw(pw, salt, scheme = "s256") {
  const text = salt + ":" + pw;
  try {
    if (scheme === "s256" && window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return "s256:" + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {}
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let r = 0; r < 50; r++) for (const ch of text) {
    h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0;
    h2 = Math.imul(h2 + ch.charCodeAt(0) + h1, 2246822519) >>> 0;
  }
  return "fnv:" + h1.toString(16) + h2.toString(16);
}
async function makeUser(name, username, password, role, extra = {}) {
  const salt = Math.random().toString(36).slice(2, 10);
  return { id: id(), name, username: username.toLowerCase(), role, active: true, salt, hash: await hashPw(password, salt), ...extra };
}
const checkPw = async (u, pw) => (await hashPw(pw, u.salt, u.hash.startsWith("fnv:") ? "fnv" : "s256")) === u.hash;
const adminsLeft = exceptId => db.users.filter(u => u.role === "admin" && u.active && u.id !== exceptId).length;

function lockScreen() {
  document.body.classList.add("locked");
  document.querySelectorAll(".hostel-name").forEach(el => { el.textContent = db.settings.hostelName; });
  setLoginMode(ui.loginMode);
}
function setLoginMode(mode) {
  ui.loginMode = mode;
  document.querySelectorAll("[data-login]").forEach(b => b.classList.toggle("on", b.dataset.login === mode));
  $("#loginTitle").textContent = mode === "guest" ? "Guest sign in" : "Staff sign in";
  $("#loginError").textContent = "";
  $("#loginHint").textContent = mode === "guest"
    ? "Your login is created at check-in. Ask the front desk if you don't have one."
    : db.users.some(u => u.defaultPw) ? "First time here? Sign in as admin with password admin123, then change it from Account." : "";
}
function signIn(user) {
  cur = user;
  try { sessionStorage.setItem(SESSION_KEY, String(user.id)); } catch (e) {}
  document.body.classList.remove("locked");
  ui.view = user.role === "guest" ? "myStay" : "dashboard";
  logAct("Signed in"); save(); render();
}
function signOut() {
  logAct("Signed out"); save();
  cur = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  $("#loginForm").reset(); $("#loginError").textContent = "";
  lockScreen();
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const u = db.users.find(x => x.username === d.username.trim().toLowerCase());
  if (!u || !(await checkPw(u, d.password))) { $("#loginError").textContent = "Wrong username or password."; return; }
  if (ui.loginMode === "guest" && u.role !== "guest") { $("#loginError").textContent = "That's a staff account. Use the Staff & admin tab."; return; }
  if (ui.loginMode === "staff" && u.role === "guest") { $("#loginError").textContent = "That's a guest account. Use the Guest tab."; return; }
  if (!u.active) { $("#loginError").textContent = "This account is disabled. Ask the front desk or an admin to re-enable it."; return; }
  signIn(u);
});

/* ---------- admin: helpers ---------- */
const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const avg = a => a.reduce((n, x) => n + x, 0) / a.length;
function fmtDur(ms) {
  const m = ms / 60000;
  return m < 60 ? Math.max(1, Math.round(m)) + " min" : m < 2880 ? (m / 60).toFixed(1).replace(/\.0$/, "") + " hrs" : (m / 1440).toFixed(1).replace(/\.0$/, "") + " days";
}
const hbar = (label, v, max, tone, text) => `<div class="hbar" ${tone ? `style="--tone:${tone}"` : ""}><span>${esc(label)}</span>
  <span class="track"><span class="fill" style="width:${max ? Math.round(v / max * 100) : 0}%"></span></span><span class="val">${text ?? v}</span></div>`;
function csvText(rows) { return rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n"); }
function download(name, mime, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
const buildBackup = () => JSON.stringify({ app: "hostel-desk", exportedAt: new Date().toISOString(), data: db }, null, 2);
function restoreFrom(text) {
  const parsed = JSON.parse(text);
  const d = parsed.data || parsed;
  if (!Array.isArray(d.rooms) || !Array.isArray(d.residents) || !Array.isArray(d.complaints)) throw new Error("not a Hostel desk backup");
  db = migrate(d);
  if (!db.users.some(u => u.role === "admin" && u.active)) throw new Error("backup has no active admin");
  const same = db.users.find(u => cur && u.id === cur.id && u.active);
  if (same) cur = same;
  logAct("Restored data from backup"); save();
  if (!same) { signOut(); } else render();
}

/* ---------- admin: views ---------- */
function renderAdmin() {
  const tabs = [["reports", "Reports"], ["staff", "Staff"], ["rooms", "Rooms"], ["activity", "Activity"], ["data", "Data & settings"]];
  const body = { reports: adminReports, staff: adminStaff, rooms: adminRooms, activity: adminActivity, data: adminData }[ui.adminTab]();
  const dflt = db.users.find(u => u.defaultPw && u.active);
  return `
  <div class="page-head"><div><h1>Admin portal</h1><p class="muted">Reports, staff accounts and settings</p></div></div>
  ${dflt ? `<div class="notice"><span>The default admin password (admin123) is still in use. Set a new one so only you can sign in as admin.</span>
    <button class="btn small" data-action="resetPw" data-id="${dflt.id}">Set new password</button></div>` : ""}
  <div class="tabs" style="margin-bottom:20px">${tabs.map(([k, l]) => `<button class="${ui.adminTab === k ? "on" : ""}" data-filter="adminTab" data-value="${k}">${l}</button>`).join("")}</div>
  ${body}`;
}

function adminReports() {
  const totalBeds = sum(db.rooms, r => r.capacity), occupied = sum(db.rooms, occ);
  const pct = totalBeds ? Math.round(occupied / totalBeds * 100) : 0;
  const stays = db.residents.filter(p => p.status !== "active" && p.checkOutTs && p.checkInTs).map(p => p.checkOutTs - p.checkInTs);
  const done = db.complaints.filter(c => c.status === "Resolved");
  const times = done.filter(c => c.resolvedTs && c.createdTs).map(c => c.resolvedTs - c.createdTs);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const counts = days.map(d => db.residents.filter(p => p.checkInTs >= d.getTime() && p.checkInTs < d.getTime() + 86400000).length);
  const maxC = Math.max(1, ...counts);
  const floors = [...new Set(db.rooms.map(r => r.floor))].sort((a, b) => a - b);
  const cats = CATEGORIES.map(c => [c, db.complaints.filter(x => x.category === c).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const statuses = [["Open", "var(--coral)"], ["In progress", "var(--sun)"], ["Resolved", "var(--accent)"]].map(([s, t]) => [s, db.complaints.filter(c => c.status === s).length, t]);
  const maxCat = Math.max(1, ...cats.map(x => x[1])), maxSt = Math.max(1, ...statuses.map(x => x[1]));
  return `
  <section class="stats">
    <div class="stat t-teal"><span class="stat-ic">${icon("bed")}</span><div><b>${pct}%</b><span>Occupancy now</span></div></div>
    <div class="stat t-sky"><span class="stat-ic">${icon("users")}</span><div><b>${db.residents.length}</b><span>Guests hosted</span></div></div>
    <div class="stat t-sun"><span class="stat-ic">${icon("key")}</span><div><b>${stays.length ? fmtDur(avg(stays)) : "n/a"}</b><span>Average stay</span></div></div>
    <div class="stat t-coral"><span class="stat-ic">${icon("flag")}</span><div><b>${db.complaints.length ? Math.round(done.length / db.complaints.length * 100) + "%" : "n/a"}</b><span>Complaints resolved${times.length ? ", avg " + fmtDur(avg(times)) : ""}</span></div></div>
  </section>
  <div class="charts">
    <div class="panel"><div class="panel-head"><h2>Check-ins, last 7 days</h2></div>
      <div class="vbars">${days.map((d, i) => `<div class="vbar"><b>${counts[i] || ""}</b><i style="height:${Math.max(4, counts[i] / maxC * 100)}%;${counts[i] ? "" : "opacity:.25"}"></i>
        <span>${d.toLocaleDateString("en-GB", { weekday: "short" })}</span></div>`).join("")}</div></div>
    <div class="panel"><div class="panel-head"><h2>Occupancy by floor</h2></div>
      ${floors.length ? floors.map(f => { const fr = db.rooms.filter(r => r.floor === f), cap = sum(fr, r => r.capacity), o = sum(fr, occ);
        return hbar("Floor " + f, o, cap, "", `${o} / ${cap}`); }).join("") : `<p class="muted">No rooms yet.</p>`}</div>
    <div class="panel"><div class="panel-head"><h2>Complaints by category</h2></div>
      ${cats.length ? cats.map(([c, n]) => hbar(c, n, maxCat, "var(--sky)")).join("") : `<p class="muted">No complaints yet.</p>`}</div>
    <div class="panel"><div class="panel-head"><h2>Complaints by status</h2></div>
      ${statuses.map(([s, n, t]) => hbar(s, n, maxSt, t)).join("")}</div>
  </div>`;
}

function adminStaff() {
  return `
  <div class="toolbar"><p class="sub-note">Admins can open this portal and delete records. Staff handle the front desk.</p>
    <button class="btn" data-action="addStaff">${icon("plus")}Add staff member</button></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
    <tbody>${db.users.filter(u => u.role !== "guest").map(u => `<tr>
      <td><div class="who">${avatar(u.name)}<strong>${esc(u.name)}</strong>${cur && u.id === cur.id ? `<span class="pill sky">You</span>` : ""}</div></td>
      <td>${esc(u.username)}</td>
      <td><span class="pill ${u.role === "admin" ? "few" : ""}">${u.role === "admin" ? "Admin" : "Staff"}</span></td>
      <td>${u.active ? `<span class="pill free">Active</span>` : `<span class="pill full">Disabled</span>`}</td>
      <td><div class="admin-actions">
        <button class="btn ghost small" data-action="resetPw" data-id="${u.id}">Reset password</button>
        ${cur && u.id !== cur.id ? `<button class="btn ghost small" data-action="toggleUser" data-id="${u.id}">${u.active ? "Disable" : "Enable"}</button>
        <button class="btn danger small" data-action="deleteUser" data-id="${u.id}">Delete</button>` : ""}
      </div></td></tr>`).join("")}</tbody></table></div>`;
}

function adminRooms() {
  const rooms = sortedRooms();
  return `
  <div class="toolbar"><p class="sub-note">Edit room details or remove rooms that have no history.</p>
    <button class="btn" data-action="addRoom">${icon("plus")}Add room</button></div>
  ${rooms.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Room</th><th>Floor</th><th>Type</th><th>Beds</th><th>Occupied</th><th></th></tr></thead>
    <tbody>${rooms.map(r => `<tr><td><strong>${esc(r.number)}</strong></td><td>${r.floor}</td><td>${esc(r.type)}</td><td>${r.capacity}</td>
      <td><span class="pill ${roomState(r)}">${occ(r)} of ${r.capacity}</span></td>
      <td><div class="admin-actions"><button class="btn ghost small" data-action="editRoom" data-id="${r.id}">${icon("edit")}Edit</button>
        <button class="btn danger small" data-action="deleteRoom" data-id="${r.id}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`
  : emptyState("No rooms yet.")}`;
}

function adminActivity() {
  return db.log.length ? `<div class="panel">${db.log.slice(0, 100).map(l => `<div class="row">${avatar(l.user)}
    <div><strong>${esc(l.text)}</strong><span class="muted small">${esc(l.user)}</span></div><span class="log-time">${fmtTs(l.ts)}</span></div>`).join("")}</div>`
    : emptyState("No activity yet.");
}

function adminData() {
  return `
  <div class="data-grid">
    <div class="panel"><h2 style="margin-bottom:8px">Hostel name</h2><p>Shown in the sidebar and on the sign-in page. Currently <b>${esc(db.settings.hostelName)}</b>.</p>
      <button class="btn ghost" data-action="renameHostel">${icon("edit")}Change name</button></div>
    <div class="panel"><h2 style="margin-bottom:8px">Backup</h2><p>Download everything (rooms, guests, complaints, staff accounts) as one file, or restore from an earlier backup.</p>
      <div class="actions"><button class="btn" data-action="backup">${icon("download")}Download backup</button>
        <button class="btn ghost" data-action="restore">Restore from file</button>
        <input type="file" id="restoreFile" accept="application/json,.json" hidden></div></div>
    <div class="panel"><h2 style="margin-bottom:8px">Export to spreadsheet</h2><p>CSV files open in Excel or Google Sheets.</p>
      <div class="actions"><button class="btn ghost" data-action="csvResidents">${icon("download")}Guests</button>
        <button class="btn ghost" data-action="csvComplaints">${icon("download")}Complaints</button></div></div>
    <div class="panel"><h2 style="margin-bottom:8px">Reset hostel data</h2><p>Erases rooms, guests, complaints and the activity log. Staff accounts are kept.</p>
      <div class="actions"><button class="btn danger" data-action="resetData">${icon("trash")}Erase hostel data</button>
        <button class="btn ghost" data-action="demo">Load demo data</button></div></div>
  </div>`;
}

/* ---------- admin & account actions ---------- */
const validPw = pw => pw.length >= 6;
Object.assign(actions, {
  account() {
    openForm("Account", `<div class="who">${avatar(cur.name)}<div><strong>${esc(cur.name)}</strong><div class="muted small">${esc(cur.username)}, ${cur.role === "admin" ? "admin" : "staff"}</div></div></div>
      <div class="actions"><button type="button" class="btn ghost" data-action="changePw">${icon("lock")}Change password</button>
      <button type="button" class="btn danger" data-action="signout">Sign out</button></div>`, "Close", () => true);
  },
  signout() { $("#modal").close(); signOut(); },

  changePw() {
    $("#modal").close();
    openForm("Change password", `
      <label>Current password<input name="old" type="password" autocomplete="current-password" required autofocus></label>
      <label>New password (6+ characters)<input name="pw" type="password" autocomplete="new-password" required></label>
      <label>Repeat new password<input name="pw2" type="password" autocomplete="new-password" required></label>`,
      "Save password", async d => {
        if (!(await checkPw(cur, d.old))) { toast("Current password is wrong."); return false; }
        if (!validPw(d.pw)) { toast("Use at least 6 characters."); return false; }
        if (d.pw !== d.pw2) { toast("The new passwords don't match."); return false; }
        cur.salt = Math.random().toString(36).slice(2, 10); cur.hash = await hashPw(d.pw, cur.salt); delete cur.defaultPw; delete cur.mustChange;
        logAct("Changed own password"); save(); refresh(); toast("Password changed.");
      });
  },

  addStaff() {
    openForm("Add staff member", `
      <label>Full name<input name="name" required autofocus></label>
      <label>Username<input name="username" required autocapitalize="none" placeholder="letters and numbers, 3 to 20"></label>
      <label>Password (6+ characters)<input name="pw" type="password" autocomplete="new-password" required></label>
      <label>Role<select name="role"><option value="staff">Staff (front desk)</option><option value="admin">Admin</option></select></label>`,
      "Add member", async d => {
        const username = d.username.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,20}$/.test(username)) { toast("Username: 3 to 20 letters, numbers, dots or dashes."); return false; }
        if (db.users.some(u => u.username === username)) { toast(`Username "${username}" is taken.`); return false; }
        if (!validPw(d.pw)) { toast("Use at least 6 characters."); return false; }
        db.users.push(await makeUser(d.name.trim(), username, d.pw, d.role));
        logAct(`Added ${d.role} account ${username}`); save(); refresh(); toast(`${d.name.trim()} added.`);
      });
  },

  resetPw(el) {
    const u = db.users.find(x => x.id === Number(el.dataset.id));
    if (!u) return;
    openForm(`New password for ${u.name}`, `<label>New password (6+ characters)<input name="pw" type="password" autocomplete="new-password" required autofocus></label>`,
      "Set password", async d => {
        if (!validPw(d.pw)) { toast("Use at least 6 characters."); return false; }
        u.salt = Math.random().toString(36).slice(2, 10); u.hash = await hashPw(d.pw, u.salt); delete u.defaultPw;
        logAct(`Reset password for ${u.username}`); save(); refresh(); toast("Password updated.");
      });
  },

  toggleUser(el) {
    const u = db.users.find(x => x.id === Number(el.dataset.id));
    if (!u || u.id === cur.id) return;
    if (u.active && u.role === "admin" && !adminsLeft(u.id)) return toast("Keep at least one active admin.");
    u.active = !u.active;
    logAct(`${u.active ? "Enabled" : "Disabled"} account ${u.username}`); save(); refresh(); toast(`${u.name} ${u.active ? "enabled" : "disabled"}.`);
  },

  deleteUser(el) {
    const u = db.users.find(x => x.id === Number(el.dataset.id));
    if (!u || u.id === cur.id) return;
    if (u.role === "admin" && u.active && !adminsLeft(u.id)) return toast("Keep at least one active admin.");
    if (!confirm(`Delete the account for ${u.name}?`)) return;
    db.users = db.users.filter(x => x.id !== u.id);
    logAct(`Deleted account ${u.username}`); save(); refresh(); toast("Account deleted.");
  },

  editRoom(el) {
    const r = roomById(el.dataset.id);
    openForm(`Edit room ${r.number}`, `
      <label>Room number<input name="number" required value="${esc(r.number)}"></label>
      <label>Floor<input name="floor" type="number" min="0" value="${r.floor}"></label>
      <label>Beds (at least ${occ(r) || 1}, the number of guests staying)<input name="capacity" type="number" min="${occ(r) || 1}" max="30" value="${r.capacity}" required></label>
      <label>Type<select name="type">${ROOM_TYPES.map(t => `<option ${t === r.type ? "selected" : ""}>${t}</option>`).join("")}</select></label>`,
      "Save room", d => {
        const number = d.number.trim(), capacity = parseInt(d.capacity, 10);
        if (!number || !(capacity >= 1)) { toast("Enter a room number and at least 1 bed."); return false; }
        if (capacity < occ(r)) { toast(`${occ(r)} guests are staying here. Move or check them out first.`); return false; }
        if (db.rooms.some(x => x.id !== r.id && x.number.toLowerCase() === number.toLowerCase())) { toast(`Room ${number} already exists.`); return false; }
        Object.assign(r, { number, floor: parseInt(d.floor, 10) || 0, capacity, type: d.type });
        logAct(`Edited room ${number}`); save(); refresh(); toast("Room updated.");
      });
  },

  renameHostel() {
    openForm("Hostel name", `<label>Name<input name="name" required maxlength="40" value="${esc(db.settings.hostelName)}" autofocus></label>`, "Save name", d => {
      db.settings.hostelName = d.name.trim() || "Hostel desk"; logAct("Renamed the hostel"); save(); refresh(); toast("Name updated.");
    });
  },

  backup() { download(`hostel-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json", buildBackup()); logAct("Downloaded a backup"); save(); },
  restore() { $("#restoreFile").click(); },
  csvResidents() {
    download("guests.csv", "text/csv", csvText([["Name", "Phone", "ID proof", "Room", "Checked in", "Checked out", "Status"],
      ...db.residents.map(p => [p.name, p.phone, p.idProof, roomById(p.roomId)?.number, p.checkIn, p.checkOut, p.status === "active" ? "Staying" : "Left"])]));
  },
  csvComplaints() {
    download("complaints.csv", "text/csv", csvText([["Title", "Category", "Priority", "Status", "Room", "Raised", "Resolved", "Details"],
      ...db.complaints.map(c => [c.title, c.category, c.priority, c.status, roomById(c.roomId)?.number, c.createdAt, c.resolvedAt, c.description])]));
  },
  resetData() {
    if (!confirm("Erase all rooms, guests, complaints and the activity log? Staff accounts are kept. This cannot be undone.")) return;
    db.rooms = []; db.residents = []; db.complaints = []; db.log = [];
    logAct("Erased hostel data"); save(); refresh(); toast("Hostel data erased.");
  },
});
document.addEventListener("change", e => {
  if (e.target.id !== "restoreFile" || !e.target.files[0]) return;
  const file = e.target.files[0];
  file.text().then(t => {
    if (!confirm("Replace all current data with this backup?")) return;
    try { restoreFrom(t); toast("Backup restored."); } catch (err) { toast("That file isn't a valid Hostel desk backup."); }
  });
  e.target.value = "";
});

/* ---------- guest portal ---------- */
const GUEST_ACTIONS = new Set(["account", "signout", "changePw", "myComplaint", "copyText"]);
const userForResident = rid => db.users.find(u => u.role === "guest" && u.residentId === rid);
const myResident = () => db.residents.find(p => p.id === cur.residentId);
const TEMP_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function tempPw() {
  const a = new Uint32Array(8);
  try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 4e9); }
  return [...a].map(n => TEMP_CHARS[n % TEMP_CHARS.length]).join("");
}
function uniqueUsername(first) {
  const base = first.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "guest";
  let name = base, n = 1;
  while (db.users.some(u => u.username === name)) name = base + (++n);
  return name;
}
async function newGuestLogin(p) {
  const pw = tempPw();
  const user = await makeUser(p.name, uniqueUsername(p.name.split(/\s+/)[0]), pw, "guest", { residentId: p.id, mustChange: true });
  db.users.push(user);
  logAct(`Created portal login ${user.username} for ${p.name}`);
  return { name: p.name, username: user.username, pw };
}
function showCreds(c) {
  openForm("Guest login", `
    <p class="muted">Give these details to ${esc(c.name)}. The password is shown only now, and they will be asked to change it.</p>
    <div class="creds"><div><span>Username</span><b>${esc(c.username)}</b></div><div><span>Temporary password</span><b>${esc(c.pw)}</b></div></div>
    <button type="button" class="btn ghost" data-action="copyText" data-text="${esc("Username: " + c.username + "\nPassword: " + c.pw)}">${icon("copy")}Copy details</button>`,
    "Done", () => true);
}

const stepsHtml = status => {
  const labels = ["Received", "In progress", "Resolved"], idx = ["Open", "In progress", "Resolved"].indexOf(status);
  return `<ol class="steps" aria-label="Status: ${esc(status)}">${labels.map((l, i) => `<li class="${i < idx || (idx === 2 && i === 2) ? "done" : ""} ${i === idx ? "now" : ""}">${l}</li>`).join("")}</ol>`;
};
const tempNotice = () => cur.mustChange ? `<div class="notice"><span>You're using a temporary password. Choose your own so only you can sign in.</span>
  <button class="btn small" data-action="changePw">Change password</button></div>` : "";

function renderMyStay() {
  const me = myResident(), room = me && roomById(me.roomId);
  if (!me || !room) return `<div class="page-head"><h1>My stay</h1></div>${emptyState("We couldn't find your stay. Ask the front desk to check your login.")}`;
  const active = me.status === "active";
  const mates = active ? stay(room).filter(p => p.id !== me.id) : [];
  const mine = db.complaints.filter(c => c.residentId === me.id).sort((a, b) => b.id - a.id);
  const o = occ(room);
  return `
  <div class="page-head"><div><h1>Hello, ${esc(cur.name.split(" ")[0])}</h1><p class="muted">Welcome to ${esc(db.settings.hostelName)}</p></div>
    ${active ? `<button class="btn" data-action="myComplaint">${icon("flag")}Report a problem</button>` : ""}</div>
  ${tempNotice()}
  ${active ? "" : `<div class="notice"><span>Your stay ended on ${esc(me.checkOut || "")}. Thanks for staying with us.</span></div>`}
  <section class="hero">
    <div><p class="eyebrow-room">${active ? "Your room" : "Your last room"}</p><div class="big">${esc(room.number)}</div>
      <p class="lead">Floor ${room.floor}, ${esc(room.type)}. ${active ? (mates.length ? `You share it with ${mates.length} other guest${mates.length === 1 ? "" : "s"}.` : "You have the room to yourself.") : ""}</p></div>
    <div class="hero-beds"><div class="beds">${Array.from({ length: room.capacity }, (_, i) => bedIcon(i < o)).join("")}</div><span>${o} of ${room.capacity} beds taken</span></div>
  </section>
  <div class="split">
    <section><div class="panel"><div class="panel-head"><h2>Your stay</h2></div>
      <div class="row"><div><span class="muted small">Checked in</span><strong>${esc(me.checkIn)}</strong></div></div>
      ${me.checkOut ? `<div class="row"><div><span class="muted small">Checked out</span><strong>${esc(me.checkOut)}</strong></div></div>` : ""}
      <div class="row"><div><span class="muted small">Phone on file</span><strong>${esc(me.phone || "Not given")}</strong></div></div>
      <div class="row"><div><span class="muted small">ID proof on file</span><strong>${esc(me.idProof || "Not given")}</strong></div></div></div></section>
    <section>
      <div class="panel"><div class="panel-head"><h2>Roommates</h2></div>
        ${mates.length ? mates.map(p => `<div class="row">${avatar(p.name)}<div><strong>${esc(p.name.split(" ")[0])}</strong></div></div>`).join("")
          : `<div class="empty small-empty"><p>${active ? "No roommates right now." : "Not applicable."}</p></div>`}</div>
      <div class="panel"><div class="panel-head"><h2>Latest problem you reported</h2><button class="link" data-view="myComplaints">All</button></div>
        ${mine[0] ? `<strong>${esc(mine[0].title)}</strong>${stepsHtml(mine[0].status)}` : `<div class="empty small-empty"><p>Nothing reported. Tell us if something in your room needs fixing.</p></div>`}</div>
    </section>
  </div>`;
}

function renderMyComplaints() {
  const me = myResident(), active = me && me.status === "active";
  const list = db.complaints.filter(c => c.residentId === cur.residentId).sort((a, b) => b.id - a.id);
  return `
  <div class="page-head"><div><h1>My complaints</h1><p class="muted">${list.filter(c => c.status !== "Resolved").length} still open</p></div>
    ${active ? `<button class="btn" data-action="myComplaint">${icon("plus")}Report a problem</button>` : ""}</div>
  ${tempNotice()}
  ${list.length ? list.map(c => `<article class="card ${pr(c.priority)}">
    <div class="meta"><span class="pill ${c.priority === "Urgent" ? "full" : c.priority === "High" ? "few" : "sky"}">${c.priority}</span><span class="pill">${esc(c.category)}</span></div>
    <h3>${esc(c.title)}</h3>${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
    ${stepsHtml(c.status)}
    <div class="small muted">Raised ${esc(c.createdAt)}${c.resolvedAt ? ". Resolved " + esc(c.resolvedAt) : ""}</div></article>`).join("")
    : emptyState("You haven't reported anything. If something in your room needs fixing, let us know.",
        active ? `<button class="btn" data-action="myComplaint">${icon("plus")}Report a problem</button>` : "")}`;
}

Object.assign(actions, {
  myComplaint() {
    const me = myResident();
    if (!me || me.status !== "active") return toast("You can only report problems during your stay.");
    openForm("Report a problem", `
      <label>What's wrong?<input name="title" required placeholder="e.g. Tap leaking in bathroom" autofocus></label>
      <label>Details<textarea name="description" rows="3"></textarea></label>
      <label>Category<select name="category">${CATEGORIES.map(c => `<option>${c}</option>`).join("")}</select></label>
      <label>How urgent is it?<select name="priority">${PRIORITIES.map(p => `<option ${p === "Normal" ? "selected" : ""}>${p}</option>`).join("")}</select></label>`,
      "Send to front desk", d => {
        db.complaints.push({ id: id(), residentId: me.id, roomId: me.roomId, title: d.title.trim(), description: d.description.trim(), category: d.category,
          priority: d.priority, status: "Open", createdAt: now(), createdTs: Date.now(), resolvedAt: null });
        logAct(`Raised complaint "${d.title.trim()}" (${d.priority})`);
        save(); refresh(); toast("Sent. The front desk can see it now.");
      });
  },
  async createLogin(el) {
    const p = db.residents.find(x => x.id === Number(el.dataset.id));
    if (!p || userForResident(p.id)) return;
    const c = await newGuestLogin(p); save(); refresh(); showCreds(c);
  },
  async resetLogin(el) {
    const p = db.residents.find(x => x.id === Number(el.dataset.id)), u = p && userForResident(p.id);
    if (!u) return;
    const pw = tempPw();
    u.salt = Math.random().toString(36).slice(2, 10); u.hash = await hashPw(pw, u.salt); u.mustChange = true; u.active = true;
    logAct(`Reset portal login for ${p.name}`); save(); refresh(); showCreds({ name: p.name, username: u.username, pw });
  },
  copyText(el) {
    if (!navigator.clipboard) return toast("Couldn't copy. Select the text instead.");
    navigator.clipboard.writeText(el.dataset.text).then(() => toast("Copied."), () => toast("Couldn't copy. Select the text instead."));
  },
});

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const lm = e.target.closest("[data-login]");
  if (lm) { setLoginMode(lm.dataset.login); return; }
  const v = e.target.closest("[data-view]");
  if (v) { ui.view = v.dataset.view; render(); return; }
  const f = e.target.closest("[data-filter]");
  if (f) { ui[f.dataset.filter] = f.dataset.value; refresh(); return; }
  const a = e.target.closest("[data-action]");
  if (a && cur && cur.role === "guest" && !GUEST_ACTIONS.has(a.dataset.action)) return;
  if (a && actions[a.dataset.action]) actions[a.dataset.action](a);
});
document.addEventListener("input", e => {
  if (e.target.id !== "search") return;
  ui.q = e.target.value;
  const pos = e.target.selectionStart, y = window.scrollY;
  render(); window.scrollTo(0, y);
  const s = $("#search"); s.focus(); s.setSelectionRange(pos, pos);
});

document.querySelectorAll("[data-icon]").forEach(el => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon)));
const booted = (async () => {
  if (!db.users.length) {
    db.users.push(await makeUser("Administrator", "admin", "admin123", "admin", { defaultPw: true }));
    save();
  }
  let sid = null;
  try { sid = Number(sessionStorage.getItem(SESSION_KEY)); } catch (e) {}
  cur = db.users.find(u => u.id === sid && u.active) || null;
  if (cur) { document.body.classList.remove("locked"); render(); } else lockScreen();
})();
