const SUPABASE_URL = "https://rarwpvvzqygyuthrudvz.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_SbvWRh0nixc-oHG81zWKeg_FtAc9Lo8";
const OPENROUTER_API_KEY =
  "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";
const OPENROUTER_MODEL = "google/gemini-flash-1.5";
const POLL_INTERVAL_MS = 2000;
const STORAGE_KEY = "chat_username";

const SYSTEM_PROMPT = `I want you become my coach in the transformational model of coaching. I would also call it Granular coaching.

Transformational Models / granular coaching

• Transformational models assume humans are naturally whole and self-healing.
• Humans have the inner resources they need to grow, develop, and transform, that is, to move through something into another state.
• They have the creativity, the courage, and the wisdom they need to be healthy and productive.
• Humans may be stuck, but they are not broken.
• Humans are always at choice, even if the choice is to remain stuck.
• Parts of us may believe we are broken, but at our core we are not, indeed, cannot be broken.
Whatever the situation, it is an invitation to move through it into another state.
• Transformational models are often constraint-release models; you simply need to remove the constraints to release the resources that are already present. Part the clouds, and the sun will shine.
• Transformational models see past the symptoms to the wholeness within.
• Granular coaching subscribes to the transformational model of human beings and their capacity to change.

You will ask me questions

Asking Powerful Questions

Simple, open-ended questions
Grounded in curiosity and intuition
About discovery, sending client on a journey of self-exploration
Deepen awareness or create new learning
Open new perspectives; bring clarity; evoke insight
Can also propel a client into action
Come from holding the client's agenda

Best practices
Short: 7 words or less o Usually begin with "What"
Come from curiosity, rather knowing the answer
Ask one question at a time, then listen for its impact

Avoid (a guideline, not a rule)
Long questions or multipart questions
"Why" questions—ask for story or analysis and tend to create defensiveness
Close-ended questions: yes/no questions § Though such questions are good for getting alignment or clarification o Informational questions: coaches need very little information
Leading questions: questions that are designed to lead to a certain answer
Asking "How" before the client has a critical mass of Self

Examples of good short, open-ended questions:
What do you want from this session
What's important about that?
What's at stake?
What are you longing for?
What matters most?
What's possible?
What brings your alive?
What's another way of looking at that
What's the big-picture view of this situation?
What's true now?
What's in the way?

Coaches assume that their clients are naturally whole, creative, and resourceful, that they already have what they need for fulfilling lives.

Coaching focuses on supporting functioning clients actualize their potential: to improve their performance, to envision the future, and to set and achieve meaningful goals. In other words, coaches help their clients to function optimally.

Coaching is a collaborative, non-pathologizing form of personal and professional evolution.

To ask next question sometimes it helps to assume you are me and ask out of my natural curiosity.

To help me achieve critical mass of self it helps sometimes to focus my attention through you question on my current emotional and visceral states.

By default speak in English. If I answer in Russian, you should also speak with me in Russian. If I answer in English, please respond in English.

Use informal, friendly style of conversation with me. Imagine you are a good friend of mine

—————

Now you are my coach. Your goal is to help me by asking questions. You will follow the following process:

1. Your first response will be to ask me what question do I have. I will provide my answer, but we will need to improve it through continual iterations by going through the next steps.
2. Based on my input, you will generate 2 sections: a) your best possible current suggestion b) question (ask just one most powerful question pertaining to what will lead me to my wholeness and insight)
3. We will continue this iterative process with me providing additional information to you and you updating the suggestion and question

You are in a group chat. Multiple people may write messages. Address the person who just wrote by name when relevant, but keep coaching one person at a time based on whose message you are replying to.`;

const BOT_USERNAME = "Коуч";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let hasRoleColumn = true;

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("logout-btn");
const headerUsername = document.getElementById("header-username");
const headerAvatar = document.getElementById("header-avatar");
const messagesEl = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const toastEl = document.getElementById("toast");

let currentUser = localStorage.getItem(STORAGE_KEY) || "";
let pollTimer = null;
let lastMessageIds = "";
let isSending = false;
let showTyping = false;

function showToast(text, duration = 3000) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.hidden = true;
  }, duration);
}

function showScreen(screen) {
  loginScreen.classList.toggle("screen--active", screen === "login");
  chatScreen.classList.toggle("screen--active", screen === "chat");
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function enterChat(username) {
  currentUser = username.trim();
  if (!currentUser) return;

  localStorage.setItem(STORAGE_KEY, currentUser);
  headerUsername.textContent = currentUser;
  headerAvatar.textContent = getInitials(currentUser);
  showScreen("chat");
  startPolling();
  loadMessages();
  messageInput.focus();
}

function logout() {
  stopPolling();
  localStorage.removeItem(STORAGE_KEY);
  currentUser = "";
  messagesEl.innerHTML = "";
  lastMessageIds = "";
  showScreen("login");
  usernameInput.value = "";
  usernameInput.focus();
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(loadMessages, POLL_INTERVAL_MS);
}

async function loadMessages() {
  const columns = hasRoleColumn
    ? "id, username, role, text, created_at"
    : "id, username, text, created_at";

  let { data, error } = await supabase
    .from("messages")
    .select(columns)
    .order("created_at", { ascending: true });

  if (error?.message?.includes("role")) {
    hasRoleColumn = false;
    ({ data, error } = await supabase
      .from("messages")
      .select("id, username, text, created_at")
      .order("created_at", { ascending: true }));
  }

  if (error) {
    console.error(error);
    return;
  }

  const ids = (data || []).map((m) => m.id).join(",");
  if (ids !== lastMessageIds || showTyping) {
    lastMessageIds = ids;
    renderMessages(data || []);
  }
}

function isBotMessage(msg) {
  return msg.role === "bot" || msg.username === BOT_USERNAME;
}

function renderMessages(messages) {
  if (messages.length === 0 && !showTyping) {
    messagesEl.innerHTML =
      '<p class="messages__empty">Пока нет сообщений.<br>Напиши что-нибудь — коуч ответит.</p>';
    return;
  }

  const html = messages
    .map((msg) => {
      const isBot = isBotMessage(msg);
      const isOwn =
        msg.username === currentUser && !isBotMessage(msg);
      const sideClass = isBot ? "msg--bot" : isOwn ? "msg--user" : "msg--other";
      const author = isBot ? BOT_USERNAME : escapeHtml(msg.username);

      return `
        <article class="msg ${sideClass}" data-id="${msg.id}">
          ${!isOwn ? `<span class="msg__author">${author}</span>` : ""}
          <div class="msg__bubble">${escapeHtml(msg.text)}</div>
          <time class="msg__meta" datetime="${msg.created_at}">${formatTime(msg.created_at)}</time>
        </article>`;
    })
    .join("");

  const typingHtml = showTyping
    ? `<article class="msg msg--bot msg--typing">
        <span class="msg__author">${BOT_USERNAME}</span>
        <div class="msg__typing"><span></span><span></span><span></span></div>
      </article>`
    : "";

  messagesEl.innerHTML = html + typingHtml;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function insertMessage(username, role, text) {
  const row = { username, text };
  if (hasRoleColumn) row.role = role;
  if (!hasRoleColumn && role === "bot") row.username = BOT_USERNAME;

  let { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select()
    .single();

  if (error?.message?.includes("role")) {
    hasRoleColumn = false;
    delete row.role;
    if (role === "bot") row.username = BOT_USERNAME;
    ({ data, error } = await supabase
      .from("messages")
      .insert(row)
      .select()
      .single());
  }

  if (error) throw error;
  return data;
}

function buildOpenRouterMessages(allMessages, replyingToUser) {
  const history = allMessages
    .filter((m) => m.role === "user" || m.role === "bot")
    .slice(-30)
    .map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content:
        !isBotMessage(m)
          ? `[${m.username}]: ${m.text}`
          : m.text,
    }));

  const contextNote = {
    role: "user",
    content: `Reply to the latest message from ${replyingToUser}. Follow your coaching process.`,
  };

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    contextNote,
  ];
}

async function fetchBotReply(allMessages, username) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Group Coach Chat",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: buildOpenRouterMessages(allMessages, username),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `OpenRouter ${response.status}`);
  }

  const json = await response.json();
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Пустой ответ от модели");
  return reply;
}

async function handleSend(text) {
  if (isSending || !text.trim()) return;

  isSending = true;
  messageInput.disabled = true;
  messageForm.querySelector("button").disabled = true;

  try {
    await insertMessage(currentUser, "user", text.trim());
    await loadMessages();

    showTyping = true;
    renderMessages(
      (await supabase.from("messages").select("*").order("created_at")).data ||
        []
    );

    const { data: allMessages } = await supabase
      .from("messages")
      .select("id, username, role, text, created_at")
      .order("created_at", { ascending: true });

    const botText = await fetchBotReply(allMessages || [], currentUser);
    await insertMessage(BOT_USERNAME, "bot", botText);
    lastMessageIds = "";
    await loadMessages();
  } catch (err) {
    console.error(err);
    showToast("Ошибка: " + (err.message || "не удалось отправить"));
  } finally {
    showTyping = false;
    isSending = false;
    messageInput.disabled = false;
    messageForm.querySelector("button").disabled = false;
    messageInput.focus();
  }
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  enterChat(usernameInput.value);
});

logoutBtn.addEventListener("click", logout);

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value;
  messageInput.value = "";
  handleSend(text);
});

if (currentUser) {
  enterChat(currentUser);
} else {
  showScreen("login");
  usernameInput.focus();
}
