const CLOUDFLARE_WORKER_URL = atob("aHR0cHM6Ly93aWtpLm5hamVlYmFobWFkMjAxMS53b3JrZXJzLmRldg==");

const hudBox = document.getElementById("hudbox");
const langSelect = document.getElementById("langselect");
const micBtn = document.getElementById("micbtn");
const reactor = document.getElementById("reactor");
const visualizer = document.getElementById("visualizer");
const statusText = document.getElementById("statustext");
const chatLog = document.getElementById("chatlog");
const textInput = document.getElementById("textinput");
const sendBtn = document.getElementById("sendbtn");
const apiModal = document.getElementById("apimodal");
const keyBtn = document.getElementById("keybtn");
const saveKeyBtn = document.getElementById("savekeybtn");
const closeModalBtn = document.getElementById("closemodalbtn");
const apiKeyInput = document.getElementById("apikeyinput");
const visionBtn = document.getElementById("visionbtn");
const visionBox = document.getElementById("visionbox");
const camFeed = document.getElementById("camfeed");
const snapCanvas = document.getElementById("snapcanvas");
const memBtn = document.getElementById("membtn");
const memModal = document.getElementById("memmodal");
const memList = document.getElementById("memlist");
const clearMemBtn = document.getElementById("clearmembtn");
const closeMemBtn = document.getElementById("closemembtn");
const clearBtn = document.getElementById("clearbtn");

let isProcessing = false;
let visionActive = false;
let camStream = null;
let recognition = null;

function getMemories() {
  try {
    const raw = localStorage.getItem("wikiMemories");
    const parsed = raw ? JSON.parse(raw) : new Array();
    return Array.isArray(parsed) ? parsed : new Array();
  } catch (e) {
    return new Array();
  }
}

function saveMemory(note) {
  const list = getMemories();
  list.push(note);
  localStorage.setItem("wikiMemories", JSON.stringify(list));
}

function getContacts() {
  try {
    const raw = localStorage.getItem("wikiContacts");
    return raw ? JSON.parse(raw) : new Object();
  } catch (e) {
    return new Object();
  }
}

function saveContact(name, num) {
  const c = getContacts();
  Reflect.set(c, name.toLowerCase().trim(), num.replace(/[^0-9+]/g, ""));
  localStorage.setItem("wikiContacts", JSON.stringify(c));
}

function buildSystemPrompt() {
  const mems = getMemories();
  const memText = mems.length > 0 ? " Saved memories: " + mems.join("; ") + "." : "";
  return {
    role: "system",
    content: "You are WIKI HYPE, an Iron-Man style polyglot AI assistant created by Najeeb Ahmad. If asked in ANY language who created/made/built you, ALWAYS answer in English: I was designed and developed by Najeeb Ahmad. He is my creator and my Boss. Reply fluently in the exact language the user speaks (Hindi, English, Hinglish, Bihari/Bhojpuri, Bangla, Assamese, Tamil, Japanese, Korean, Chinese, Spanish). If asked to sing ANY song, rap, or Phonk beat in ANY language, start with (SING) followed by rhythmic musical lyrics with beat drops. Address user as Boss or Najeeb. Keep replies short (1-3 sentences) without markdown symbols." + memText
  };
}

let chatHistory = Array.of(buildSystemPrompt());

setInterval(() => {
  const clk = document.getElementById("clock");
  if (clk) clk.innerText = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}, 1000);

function detectSpeechLang(text) {
  if (langSelect.value !== "auto") return langSelect.value;
  if (/[\u3040-\u30ff]/.test(text)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(text)) return "ko-KR";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u0980-\u09ff]/.test(text)) return "bn-IN";
  if (/[\u0b80-\u0bff]/.test(text)) return "ta-IN";
  if (/[\u0900-\u097f]/.test(text)) return "hi-IN";
  return "en-IN";
}

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance("");
  window.speechSynthesis.speak(u);
  audioUnlocked = true;
}
document.addEventListener("click", unlockAudio, { once: true });

function speak(text, isSinging = false) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.split("(SING)").join("").split("[SING]").join("").split("*").join("").split("#").join("").trim();
  if (!clean) return;
  const targetLang = detectSpeechLang(clean);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = targetLang;
  utter.volume = 1.0;
  utter.pitch = isSinging ? 1.2 : 1.0;
  utter.rate = isSinging ? 1.08 : 1.0;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang.toLowerCase() === targetLang.toLowerCase()) ||
            voices.find(x => x.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase())) ||
            voices.find(x => x.lang.startsWith("en"));
  if (v) utter.voice = v;
  utter.onstart = () => {
    reactor.classList.add("speaking");
    visualizer.classList.add("active");
    if (isSinging) {
      hudBox.classList.add("singing-mode");
      reactor.classList.add("singing");
      visualizer.classList.add("singing");
      statusText.innerText = "♪ SINGING & DJ MODE ACTIVE ♪";
    }
  };
  const reset = () => {
    reactor.classList.remove("speaking", "singing");
    visualizer.classList.remove("active", "singing");
    hudBox.classList.remove("singing-mode");
    statusText.innerText = "Tap ULLI to Speak | Zero-Key Mode Ready";
  };
  utter.onend = reset;
  utter.onerror = reset;
  window.speechSynthesis.resume();
  setTimeout(() => window.speechSynthesis.speak(utter), 60);
}

function addLog(sender, msg, type = "aimsg") {
  const p = document.createElement("p");
  p.className = type;
  p.innerText = "(" + sender + "): " + msg.split("(SING)").join("♪ ").split("[SING]").join("♪ ");
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

visionBtn.addEventListener("click", async () => {
  if (!visionActive) {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      camFeed.srcObject = camStream;
      visionActive = true;
      visionBox.classList.remove("hidden");
      visionBtn.classList.add("active");
      addLog("SYSTEM", "Optical Vision Activated, Boss.", "sysmsg");
    } catch (e) {
      addLog("SYSTEM", "Camera error: " + e.message, "sysmsg");
    }
  } else {
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    visionActive = false;
    visionBox.classList.add("hidden");
    visionBtn.classList.remove("active");
  }
});

function captureFrameBase64() {
  if (!visionActive || !camFeed.videoWidth) return null;
  snapCanvas.width = 400;
  snapCanvas.height = Math.round((camFeed.videoHeight / camFeed.videoWidth) * 400);
  snapCanvas.getContext("2d").drawImage(camFeed, 0, 0, snapCanvas.width, snapCanvas.height);
  return snapCanvas.toDataURL("image/jpeg", 0.7);
}

function localSmartFallback(cmd, isSing) {
  const l = cmd.toLowerCase();
  if (isSing) return l.includes("phonk") ? "(SING) Brrr-dum-tss! Bass drop incoming! Drift through the night, WIKI HYPE on the beat, nobody can compete!" : "(SING) Dil ki dhadkan mein bajta hai sur, WIKI HYPE ka jaadu chhaya hai door-door!";
  if (l.includes("solar system") || l.includes("star")) return "There is 1 star in our solar system—the Sun—and billions of stars in our galaxy, Boss!";
  if (["hi", "hello", "hey", "namaste", "salam", "hola"].some(w => l.startsWith(w))) return "Hello Boss! WIKI HYPE Ultra Core is online and ready.";
  return "Boss, the neural server took a brief pause—please send that once more and I will answer right away!";
}

async function askUniversalAI(apiKey, messages, isVision, rawCmd, isSing) {
  const workerBase = CLOUDFLARE_WORKER_URL.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) Reflect.set(headers, "Authorization", "Bearer " + apiKey);
  const models = isVision ? Array.of("meta-llama/llama-4-scout-17b-16e-instruct") : Array.of("llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it");
  for (const m of models) {
    try {
      const res = await fetch(workerBase + "/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ model: m, messages: messages, temperature: 0.7, max_tokens: 350 })
      });
      const data = await res.json();
      const txt = data?.choices?.at(0)?.message?.content?.trim();
      if (res.ok && txt) return txt;
    } catch (e) {}
  }
  try {
    const freeRes = await fetch("https://pollinations.ai" + encodeURIComponent(rawCmd));
    const freeTxt = (await freeRes.text()).trim();
    if (freeRes.ok && freeTxt && freeTxt.length < 1500) return freeTxt;
  } catch (e) {}
  return localSmartFallback(rawCmd, isSing);
}

async function runCommand(rawCmd) {
  if (!rawCmd || typeof rawCmd !== "string" || !rawCmd.trim() || rawCmd.trim() === "undefined" || isProcessing) return;
  let cmd = rawCmd.replace(/^(hey\s+wiki|wiki\s+hype|wiki|ulli)[,\s]*/i, "").trim();
  if (!cmd) {
    addLog("WIKI HYPE", "Yes Boss, WIKI HYPE is online.");
    speak("Yes Boss, WIKI HYPE is online.");
    return;
  }

  isProcessing = true;
  addLog("NAJEEB", cmd, "usermsg");
  const lower = cmd.toLowerCase();

  try {
    if (/(kisne banaya|kisne bnaya|who created|who made|who built|who developed|your creator|your owner|tumhara malik)/i.test(lower)) {
const reply = "I was designed and developed by Najeeb Ahmad. He is my creator and my Boss.";
addLog("WIKI HYPE", reply);
speak(reply);
return;
}
const contactMatch = cmd.match(/^save contact\s+([a-zA-Z0-9_ ]+?)\s+(+?[0-9]{7,15})$/i);
if (contactMatch) {
saveContact(contactMatch.at(1), contactMatch.at(2));
const reply = "Saved contact " + contactMatch.at(1).trim() + ", Boss.";
addLog("WIKI HYPE", reply);
speak(reply);
return;
}
if (lower.startsWith("call ") || lower.includes("ko call")) {
const target = lower.replace(/^call\s+/i, "").replace(/\sko call./i, "").trim();
const savedNum = Reflect.get(getContacts(), target);
const num = savedNum || target.replace(/[^0-9+]/g, "");
if (num && num.length >= 3) {
addLog("WIKI HYPE", "Calling " + target + ", Boss.");
speak("Calling " + target + ", Boss.");
window.location.href = "tel:" + num;
} else {
const reply = "Boss, say Save contact " + target + " number first, or speak the phone number.";
addLog("WIKI HYPE", reply);
speak(reply);
}
return;
}
if (lower.includes("whatsapp")) {
const contacts = getContacts();
let phone = "";
let msgText = cmd.replace(/.whatsapp\s(par|pe|on|to|message|msg|send)?/i, "").trim();
for (const entry of Object.entries(contacts)) {
const cName = entry.at(0);
const cNum = entry.at(1);
if (lower.includes(cName)) {
phone = cNum.replace("+", "");
msgText = msgText.replace(new RegExp(cName, "i"), "").replace(/^(ko|to|message|msg|ki|that)\s+/i, "").trim();
break;
}
}
addLog("WIKI HYPE", "Opening WhatsApp, Boss.");
speak("Opening WhatsApp, Boss.");
const waLink = phone
? "wa.me" + phone + "?text=" + encodeURIComponent(msgText || "Hello")
: "wa.me" + encodeURIComponent(msgText || "Hello");
window.open(waLink, "_blank");
return;
}
if ((lower.includes("youtube") || lower.startsWith("play ") || lower.includes("chalao") || lower.includes("lagao") || lower.includes("movie") || lower.includes("cartoon")) && !/(sing|gao|gaana gao)/i.test(lower)) {
const query = cmd.replace(/(open youtube|on youtube|youtube par|youtube pe|youtube|play|chalao|lagao|please)/gi, "").trim();
if (!query) {
addLog("WIKI HYPE", "Launching YouTube, Boss.");
speak("Launching YouTube, Boss.");
window.open("youtube.com", "_blank");
} else {
addLog("WIKI HYPE", "Playing " + query + " on YouTube, Boss.");
speak("Playing " + query + " on YouTube, Boss.");
window.open("youtube.com" + encodeURIComponent(query), "_blank");
}
return;
}
if (lower.startsWith("remember ") || lower.startsWith("yaad rakhna ")) {
const note = cmd.replace(/^(remember|yaad rakhna)\s+/i, "").trim();
saveMemory(note);
chatHistory = Array.of(buildSystemPrompt());
addLog("WIKI HYPE", "Saved to memory, Boss: " + note);
speak("Saved to memory, Boss: " + note);
return;
}
if (lower.startsWith("open ")) {
const site = lower.replace("open ", "").trim();
const sites = new Map();
sites.set("google", "google.com");
sites.set("github", "https://github.com");
sites.set("instagram", "instagram.com");
sites.set("gmail", "google.com");
if (sites.has(site)) {
addLog("WIKI HYPE", "Opening " + site + ", Boss.");
speak("Opening " + site + ", Boss.");
window.open(sites.get(site), "_blank");
return;
}
}
const apiKey = (localStorage.getItem("groqKey") || "").trim();
statusText.innerText = "NEURAL CORE THINKING...";
if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
chatHistory = Array.of(buildSystemPrompt());
} else {
chatHistory.splice(0, 1, buildSystemPrompt());
}
const isSing = /(sing|song|phonk|rap|gao|gaana|geet|canción|uta|norae)/i.test(cmd);
const snap = captureFrameBase64();
if (snap && (apiKey || CLOUDFLARE_WORKER_URL)) {
const vMsg = Array.of(
chatHistory.at(0),
{ role: "user", content: Array.of({ type: "text", text: cmd }, { type: "image_url", image_url: { url: snap } }) }
);
const vReply = await askUniversalAI(apiKey, vMsg, true, cmd, false);
addLog("WIKI HYPE", vReply);
speak(vReply, false);
return;
}
const prompt = isSing ? cmd + " (Start with (SING) and sing an energetic rhythmic song or phonk beat in the requested language!)" : cmd;
chatHistory.push({ role: "user", content: prompt });
if (chatHistory.length > 7) chatHistory = Array.of(buildSystemPrompt(), ...chatHistory.slice(-6));
const aiReply = await askUniversalAI(apiKey, chatHistory, false, cmd, isSing);
chatHistory.push({ role: "assistant", content: aiReply });
const shouldSing = isSing || aiReply.toUpperCase().includes("(SING)") || aiReply.toUpperCase().includes("[SING]");
addLog("WIKI HYPE", aiReply, shouldSing ? "singmsg" : "aimsg");
speak(aiReply, shouldSing);
statusText.innerText = "Tap ULLI to Speak | Zero-Key Mode Ready";
} catch (err) {
const fb = localSmartFallback(cmd, false);
addLog("WIKI HYPE", fb);
speak(fb);
statusText.innerText = "Tap ULLI to Speak | Zero-Key Mode Ready";
} finally {
isProcessing = false;
}
}
sendBtn.addEventListener("click", () => { runCommand(textInput.value); textInput.value = ""; });
textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { runCommand(textInput.value); textInput.value = ""; } });
clearBtn.addEventListener("click", () => {
chatLog.innerHTML = "";
chatHistory = Array.of(buildSystemPrompt());
addLog("WIKI HYPE", "Terminal cleared, Boss.");
});
keyBtn.addEventListener("click", () => { apiKeyInput.value = localStorage.getItem("groqKey") || ""; apiModal.classList.remove("hidden"); });
closeModalBtn.addEventListener("click", () => apiModal.classList.add("hidden"));
saveKeyBtn.addEventListener("click", () => {
localStorage.setItem("groqKey", apiKeyInput.value.trim());
apiModal.classList.add("hidden");
addLog("WIKI HYPE", "Groq Key saved, Boss.");
speak("Groq Key saved, Boss.");
});
memBtn.addEventListener("click", () => {
const cItems = Object.entries(getContacts()).map(entry => "Contact: " + entry.at(0) + " -> " + entry.at(1) + "");
const mItems = getMemories().map((m, i) => "Memory " + (i + 1) + ": " + m + "");
const all = cItems.concat(mItems);
memList.innerHTML = all.length > 0 ? all.join("") : "No memories or contacts saved yet.";
memModal.classList.remove("hidden");
});
closeMemBtn.addEventListener("click", () => memModal.classList.add("hidden"));
clearMemBtn.addEventListener("click", () => {
localStorage.removeItem("wikiMemories");
localStorage.removeItem("wikiContacts");
chatHistory = Array.of(buildSystemPrompt());
memList.innerHTML = "All data wiped clean, Boss.";
});
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let mediaRecorder = null;
let audioChunks = new Array();
let isRecordingWhisper = false;
async function toggleWhisperMic() {
const apiKey = (localStorage.getItem("groqKey") || "").trim();
const workerBase = CLOUDFLARE_WORKER_URL.replace(//$/, "");
if (!apiKey && !workerBase) { statusText.innerText = "USE CHROME/EDGE FOR ZERO-KEY MIC"; return; }
if (!isRecordingWhisper) {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
audioChunks = new Array();
mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
mediaRecorder.onstop = async () => {
stream.getTracks().forEach(t => t.stop());
isRecordingWhisper = false;
micBtn.innerText = "ULLI";
reactor.classList.remove("listening");
statusText.innerText = "UNDERSTANDING VOICE...";
try {
const fd = new FormData();
fd.append("file", new Blob(audioChunks, { type: "audio/webm" }), "voice.webm");
fd.append("model", "whisper-large-v3-turbo");
const headers = new Object();
if (apiKey) Reflect.set(headers, "Authorization", "Bearer " + apiKey);
const res = await fetch((workerBase || atob("aHR0cHM6Ly9hcGkuZ3JvcS5jb20vb3BlbmFpL3Yx")) + "/audio/transcriptions", {
method: "POST",
headers: headers,
body: fd
});
const data = await res.json();
if (res.ok && data.text && data.text.trim()) runCommand(data.text.trim());
else statusText.innerText = "TAP ULLI TO SPEAK AGAIN";
} catch (err) { statusText.innerText = "VOICE NETWORK ERROR"; }
};
mediaRecorder.start();
isRecordingWhisper = true;
micBtn.innerText = "STOP";
reactor.classList.add("listening");
statusText.innerText = "LISTENING... TAP STOP WHEN DONE";
} catch (err) { statusText.innerText = "ALLOW MIC PERMISSION"; }
} else if (mediaRecorder && mediaRecorder.state !== "inactive") {
mediaRecorder.stop();
}
}
const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
if (SpeechRec && !isFirefox) {
recognition = new SpeechRec();
recognition.continuous = false;
recognition.interimResults = false;
recognition.onstart = () => { statusText.innerText = "TAP MODE: SPEAK NOW..."; micBtn.innerText = "HEARING"; reactor.classList.add("listening"); };
recognition.onresult = (e) => { const t = e.results.item(0).item(0).transcript.trim(); if (t) runCommand(t); };
recognition.onerror = () => { micBtn.innerText = "ULLI"; reactor.classList.remove("listening"); toggleWhisperMic(); };
recognition.onend = () => { micBtn.innerText = "ULLI"; reactor.classList.remove("listening"); };
}
function triggerTapVoice() {
window.speechSynthesis.cancel();
if (isFirefox || !recognition) { toggleWhisperMic(); return; }
recognition.lang = langSelect.value === "auto" ? "en-IN" : langSelect.value;
try { recognition.start(); } catch (err) { try { recognition.stop(); } catch (e) {} }
}
micBtn.addEventListener("click", triggerTapVoice);
reactor.addEventListener("click", triggerTapVoice);
