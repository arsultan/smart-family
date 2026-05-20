/* ─────────────────────────────────────────────────
   ANAI MVP — App Logic
   State management, rendering, AI responses
───────────────────────────────────────────────── */

// ── Default Data ──────────────────────────────────
const defaults = {
  schedule: [
    { id: uid(), time: "08:00", title: "Школа", type: "school",   note: "До 14:10, затем обед и отдых" },
    { id: uid(), time: "15:00", title: "Домашняя работа", type: "homework", note: "2 задачи по математике" },
    { id: uid(), time: "17:00", title: "Шахматы",  type: "club",  note: "Взять тетрадь с партиями" },
    { id: uid(), time: "19:00", title: "Бассейн",  type: "sport", note: "Не забыть форму и полотенце" }
  ],
  messages: [
    {
      role: "anai",
      text: "Привет, Малик. Я рядом, если хочешь разобрать задачу или спокойно проверить план на день.",
      time: "09:10"
    }
  ],
  activity: [
    { icon: "help",      title: "Вопрос по дробям",            detail: "ANAI дал подсказку и попросил объяснить первый шаг.",   time: "11:20" },
    { icon: "chess",     title: "Напоминание о шахматах",      detail: "Мягкое напоминание за час до занятия.",                 time: "16:00" },
    { icon: "lightbulb", title: "Интерес к естествознанию",    detail: "Малик спросил, почему Луна меняет форму. 🌙",           time: "Вчера" }
  ]
};

// ── State ─────────────────────────────────────────
const state = loadState();

// ── DOM Refs ──────────────────────────────────────
const modeButtons    = document.querySelectorAll(".mode-button");
const navItems       = document.querySelectorAll(".nav-item");
const childNav       = document.querySelector(".child-nav");
const parentNav      = document.querySelector(".parent-nav");
const childBottomNav = document.querySelector("#childBottomNav");
const parentBottomNav= document.querySelector("#parentBottomNav");
const bottomNavItems = document.querySelectorAll(".bottom-nav-item");
const voiceButton    = document.querySelector("#voiceButton");
const orbIcon        = document.querySelector("#orbIcon");
const orbLabel       = document.querySelector("#orbLabel");
const voiceHint      = document.querySelector("#voiceHint");
const homeCards      = document.querySelector("#homeCards");
const messagesNode   = document.querySelector("#messages");
const typingNode     = document.querySelector("#typingIndicator");
const chatForm       = document.querySelector("#chatForm");
const chatInput      = document.querySelector("#chatInput");
const clearChat      = document.querySelector("#clearChat");
const scheduleForm   = document.querySelector("#scheduleForm");
const childTimeline  = document.querySelector("#childTimeline");
const parentTimeline = document.querySelector("#parentTimeline");
const activityList   = document.querySelector("#activityList");
const seeAllToday    = document.querySelector("#seeAllToday");

// ── Init ──────────────────────────────────────────
renderAll();

// ── Mode Switch ───────────────────────────────────
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    modeButtons.forEach(b => b.classList.toggle("active", b === btn));
    childNav.classList.toggle("hidden", mode !== "child");
    parentNav.classList.toggle("hidden", mode !== "parent");
    // Switch bottom nav panels
    childBottomNav?.classList.toggle("hidden", mode !== "child");
    parentBottomNav?.classList.toggle("hidden", mode !== "parent");
    const first = mode === "child" ? "child-home" : "parent-dashboard";
    // make sure matching nav is active
    const matchingNav = document.querySelector(`[data-screen="${first}"]`);
    navItems.forEach(n => n.classList.remove("active"));
    bottomNavItems.forEach(n => n.classList.remove("active"));
    matchingNav?.classList.add("active");
    // Also activate in bottom nav
    document.querySelectorAll(`.bottom-nav-item[data-screen="${first}"]`)
      .forEach(b => b.classList.add("active"));
    activateScreen(first);
  });
});

// ── Nav (sidebar) ─────────────────────────────────
navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    navItems.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    // Sync bottom nav
    bottomNavItems.forEach(n => n.classList.remove("active"));
    document.querySelectorAll(`.bottom-nav-item[data-screen="${btn.dataset.screen}"]`)
      .forEach(b => b.classList.add("active"));
    activateScreen(btn.dataset.screen);
  });
});

// ── Nav (bottom bar) ──────────────────────────
bottomNavItems.forEach(btn => {
  btn.addEventListener("click", () => {
    bottomNavItems.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    // Sync sidebar nav
    navItems.forEach(n => n.classList.remove("active"));
    document.querySelectorAll(`.nav-item[data-screen="${btn.dataset.screen}"]`)
      .forEach(n => n.classList.add("active"));
    activateScreen(btn.dataset.screen);
  });
});

// ── See All Today → goes to child-today ───────────
seeAllToday?.addEventListener("click", () => {
  navItems.forEach(n => n.classList.remove("active"));
  const todayBtn = document.querySelector('[data-screen="child-today"]');
  todayBtn?.classList.add("active");
  activateScreen("child-today");
});

// ── Voice Orb ─────────────────────────────────────
let isListening = false;
voiceButton.addEventListener("click", () => {
  isListening = !isListening;
  if (isListening) {
    voiceButton.classList.add("listening");
    orbIcon.textContent = "graphic_eq";
    orbLabel.textContent = "Слушаю...";
    voiceHint.textContent = "ANAI слушает — можно спросить про учёбу или расписание";
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    setTimeout(() => stopListening("Через час шахматы — лучше собрать тетрадь сейчас."), 2200);
  } else {
    stopListening();
  }
});

function stopListening(reply) {
  isListening = false;
  voiceButton.classList.remove("listening");
  orbIcon.textContent = "mic";
  orbLabel.textContent = "Говорить";
  if (reply) {
    voiceHint.textContent = "💬 " + reply;
    setTimeout(() => {
      voiceHint.textContent = "Нажми, чтобы спросить ANAI про учёбу, расписание или просто поговорить";
    }, 5000);
  } else {
    voiceHint.textContent = "Нажми, чтобы спросить ANAI про учёбу, расписание или просто поговорить";
  }
}

// ── Chat ──────────────────────────────────────────
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  chatInput.value = "";
  renderMessages();

  // Show typing indicator
  typingNode.classList.add("visible");
  messagesNode.scrollTop = messagesNode.scrollHeight;

  // Log activity
  state.activity.unshift({
    icon: "help",
    title: "Новый вопрос",
    detail: text.length > 80 ? text.slice(0, 80) + "…" : text,
    time: now()
  });

  setTimeout(() => {
    typingNode.classList.remove("visible");
    addMessage("anai", anaiReply(text));
    saveState();
    renderMessages();
    renderActivity();
  }, 1400 + Math.random() * 600);
});

clearChat.addEventListener("click", () => {
  state.messages = structuredClone(defaults.messages);
  saveState();
  renderMessages();
});

// ── Schedule Form ─────────────────────────────────
scheduleForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.querySelector("#activityTitle").value.trim();
  const time  = document.querySelector("#activityTime").value;
  const type  = document.querySelector("#activityType").value;
  if (!title || !time) return;

  state.schedule.push({ id: uid(), title, time, type, note: "ANAI напомнит спокойно и заранее" });
  state.schedule.sort((a, b) => a.time.localeCompare(b.time));

  state.activity.unshift({
    icon: "calendar_month",
    title: "Расписание обновлено",
    detail: `${title} добавлено на ${time}.`,
    time: now()
  });

  scheduleForm.reset();
  saveState();
  renderAll();
});

// ── Render All ────────────────────────────────────
function renderAll() {
  renderMessages();
  renderHomeCards();
  renderTimeline(childTimeline, false);
  renderTimeline(parentTimeline, true);
  renderActivity();
}

// ── Render: Messages ─────────────────────────────
function renderMessages() {
  messagesNode.innerHTML = state.messages.map(m => {
    if (m.role === "anai") {
      return `
        <div class="message anai">
          <div class="anai-avatar-row">
            <div class="anai-avatar-mini" aria-hidden="true">A</div>
            <span class="anai-name">ANAI</span>
          </div>
          <div class="message-bubble">${esc(m.text)}</div>
          <span class="message-time">${m.time}</span>
        </div>`;
    }
    return `
      <div class="message user">
        <div class="message-bubble">${esc(m.text)}</div>
        <span class="message-time">${m.time}</span>
      </div>`;
  }).join("");
  messagesNode.scrollTop = messagesNode.scrollHeight;
}

// ── Render: Home Cards ────────────────────────────
function renderHomeCards() {
  if (!homeCards) return;
  const items = state.schedule.slice(0, 4);
  const iconBg = { school: "sky", homework: "sage", club: "sand", sport: "accent" };
  homeCards.innerHTML = items.map(item => `
    <div class="info-card" role="listitem">
      <div class="card-icon-wrap ${iconBg[item.type] || 'sky'}">${iconFor(item.type)}</div>
      <div class="card-body">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.note)}</p>
      </div>
      <button class="card-chevron" aria-label="Подробнее">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  `).join("") || `<p style="color:var(--on-surface-variant);font-size:14px;">Расписание пустое. Родитель может добавить занятия.</p>`;
}

// ── Render: Timeline ──────────────────────────────
function renderTimeline(node, editable) {
  if (!node) return;
  const typeClass = { school: "school", homework: "homework", club: "club", sport: "sport" };
  node.innerHTML = state.schedule.map(item => {
    const deleteBtn = editable
      ? `<button class="timeline-delete" data-delete="${item.id}" type="button" aria-label="Удалить ${esc(item.title)}">
           <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
         </button>`
      : "";
    return `
      <div class="timeline-item">
        <div class="timeline-time-col">
          <div class="timeline-dot ${typeClass[item.type] || ''}" aria-hidden="true">${iconFor(item.type)}</div>
          <span class="timeline-time">${item.time}</span>
        </div>
        <div class="timeline-card">
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.note)}</p>
        </div>
        ${deleteBtn}
      </div>`;
  }).join("") || `<p style="padding:24px;color:var(--on-surface-variant);font-size:14px;">Расписание пустое.</p>`;

  node.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.schedule = state.schedule.filter(i => i.id !== btn.dataset.delete);
      saveState();
      renderAll();
    });
  });
}

// ── Render: Activity ─────────────────────────────
function renderActivity() {
  if (!activityList) return;
  const iconMap = {
    help:          "help",
    chess:         "chess",
    lightbulb:     "lightbulb",
    calendar_month:"calendar_month"
  };
  activityList.innerHTML = state.activity.slice(0, 8).map(item => `
    <article class="activity-item">
      <div class="activity-icon-wrap">
        <span class="material-symbols-outlined">${iconMap[item.icon] || "info"}</span>
      </div>
      <div class="activity-content">
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.detail)}</span>
      </div>
      <div class="activity-time">${esc(item.time)}</div>
    </article>
  `).join("") || `<p style="padding:24px;color:var(--on-surface-variant);font-size:14px;">Активность пока не записана.</p>`;
}

// ── Screen Transition ─────────────────────────────
function activateScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.toggle("active", s.id === id);
  });
}

// ── ANAI Reply Engine ─────────────────────────────
function anaiReply(text) {
  const t = text.toLowerCase();

  // Math / fractions
  if (t.match(/дроб|fraction|числитель|знамен|процент/)) {
    return "Хороший вопрос. Давай без спешки: дробь показывает, на сколько равных частей разделили целое. Числитель — сколько частей взяли, знаменатель — сколько всего. Какой пример у тебя?";
  }
  // Chess / schedule / when
  if (t.match(/шах|расписани|когда|занятие|кружок/)) {
    return "Сегодня шахматы в 17:00. Лучше собрать тетрадь заранее — за 30 минут я мягко напомню подготовиться.";
  }
  // Tired / hard / can't
  if (t.match(/устал|сложно|не мог|не понима|трудно|помоги/)) {
    return "Понимаю, почему сейчас может быть тяжело. Давай сделаем маленький шаг: выберем одну задачу и разберём только начало. Это всегда легче, чем кажется.";
  }
  // Science / why
  if (t.match(/почему|как это|что такое|луна|природа|наука/)) {
    return "Это очень интересный вопрос! Мне нравится, что ты думаешь о таких вещах. Давай разберём вместе — расскажи, что ты уже знаешь об этом?";
  }
  // Frustrated
  if (t.match(/злюсь|бесит|надоел|не хочу/)) {
    return "Понимаю это чувство. Иногда мозгу нужна пауза. Может, сделаем перерыв на пару минут, а потом попробуем снова вместе?";
  }
  // Greeting
  if (t.match(/привет|здравствуй|hello|hi\b/)) {
    return "Привет! Рад тебя видеть. Что будем делать сегодня — учёба, расписание или просто поговорим?";
  }
  // Default
  return "Интересная мысль. Давай разберём вместе: сначала скажи, что уже понятно, а я помогу найти следующий шаг.";
}

// ── Helpers ──────────────────────────────────────
function iconFor(type) {
  return { school: "🏫", homework: "📘", club: "♟", sport: "🏊" }[type] || "•";
}

function now() {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function uid() {
  // crypto.randomUUID() requires HTTPS — use fallback over plain HTTP
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_) {}
  // RFC 4122 v4 UUID fallback (safe on HTTP / older iOS)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function addMessage(role, text) {
  state.messages.push({ role, text, time: now() });
}

function esc(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function loadState() {
  const saved = localStorage.getItem("anai-mvp-v2");
  if (!saved) return structuredClone(defaults);
  try { return { ...structuredClone(defaults), ...JSON.parse(saved) }; }
  catch { return structuredClone(defaults); }
}

function saveState() {
  localStorage.setItem("anai-mvp-v2", JSON.stringify(state));
}
