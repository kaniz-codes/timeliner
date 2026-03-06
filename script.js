//const STORAGE_KEY = "simple-timeline-events-v6";
const DATA_FILE_PATH = "./data.json";

let defaultEvents = [];
let events = [];

// DOM
const timelineList = document.getElementById("timelineList");
const timelineItemTemplate = document.getElementById("timelineItemTemplate");
const addEventForm = document.getElementById("addEventForm");
const formMessage = document.getElementById("formMessage");
const exportMessage = document.getElementById("exportMessage");
const emptyState = document.getElementById("emptyState");
const clearAllBtn = document.getElementById("clearAllBtn");

const eventEmojiInput = document.getElementById("eventEmoji");
const eventMonthInput = document.getElementById("eventMonth");
const eventTitleInput = document.getElementById("eventTitle");
const eventDetailsInput = document.getElementById("eventDetails");

const toggleAddBtn = document.getElementById("toggleAddBtn");
const addEventPanel = document.getElementById("addEventPanel");

const toggleExportBtnTop = document.getElementById("toggleExportBtnTop");
const exportDropdown = document.getElementById("exportDropdown");

const exportPngBtn = document.getElementById("exportPngBtn");
const exportJpgBtn = document.getElementById("exportJpgBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const copyEmbedBtn = document.getElementById("copyEmbedBtn");
const copyEmbedLinkBtn = document.getElementById("copyEmbedLinkBtn");

const timelineExportTarget = document.getElementById("timelineExportTarget");

// Helpers
function currentMonthString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthYear(monthValue) {
  const [year, month] = String(monthValue).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthValue;
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function safeEmoji(value) {
  const v = String(value || "").trim();
  return v || "✨";
}

function nextId() {
  return events.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1;
}

function sortEventsNewestFirst(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(`${a.month}-01T00:00:00`).getTime();
    const bTime = new Date(`${b.month}-01T00:00:00`).getTime();
    return bTime - aTime;
  });
}

function showMessage(targetEl, text, isError = false) {
  if (!targetEl) return;
  targetEl.textContent = text || "";
  targetEl.style.color = isError ? "#b91c1c" : "#6b7280";
}

function canUseStorage() {
  try {
    const k = "__timeline_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function sanitizeEvent(raw, fallbackId) {
  if (!raw || typeof raw !== "object") return null;

  const title = String(raw.title || "").trim();
  const month = String(raw.month || "").trim();
  const details = String(raw.details || "").trim();
  const emoji = safeEmoji(raw.emoji);
  const expanded = Boolean(raw.expanded);

  if (!title || !/^\d{4}-\d{2}$/.test(month)) return null;

  const d = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  return {
    id: Number(raw.id) || fallbackId,
    emoji,
    title,
    month,
    details,
    expanded
  };
}

function cloneEvents(list) {
  return list.map((e) => ({ ...e }));
}

function normalizeEvents(input) {
  const cleaned = Array.isArray(input)
    ? input.map((e, i) => sanitizeEvent(e, i + 1)).filter(Boolean)
    : [];

  return sortEventsNewestFirst(cleaned);
}

async function loadDefaultEventsFromFile() {
  try {
    const res = await fetch(DATA_FILE_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_FILE_PATH}`);

    const data = await res.json();
    const rawEvents = Array.isArray(data) ? data : data.events;

    const cleaned = normalizeEvents(rawEvents);
    if (!cleaned.length) throw new Error("No valid events found in data.json");

    defaultEvents = cleaned;
  } catch (err) {
    console.error("Could not load data.json:", err);

    defaultEvents = normalizeEvents([
      {
        id: 1,
        emoji: "🚀",
        title: "Today!",
        month: currentMonthString(),
        details: "A good day to add a new milestone.",
        expanded: false
      }
    ]);
  }
}

function saveEvents() {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("Could not save events:", err);
    showMessage(formMessage, "Could not save locally in this browser.", true);
  }
}

function loadEventsFromStorageOrDefaults() {
  if (!canUseStorage()) {
    events = cloneEvents(defaultEvents);
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      events = cloneEvents(defaultEvents);
      saveEvents();
      return;
    }

    const parsed = JSON.parse(raw);
    const cleaned = normalizeEvents(parsed);

    if (!cleaned.length) {
      events = cloneEvents(defaultEvents);
      saveEvents();
      return;
    }

    events = cleaned;
  } catch (err) {
    console.error("Could not load saved events:", err);
    events = cloneEvents(defaultEvents);
    saveEvents();
  }
}

function renderTimeline() {
  timelineList.innerHTML = "";

  if (!events.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  events.forEach((event) => {
    const node = timelineItemTemplate.content.cloneNode(true);

    const item = node.querySelector(".timeline-item");
    const emojiDot = node.querySelector(".emoji-dot");
    const card = node.querySelector(".event-card");
    const titleEl = node.querySelector(".event-title-text");
    const dateInlineEl = node.querySelector(".event-date-inline");
    const detailsEl = node.querySelector(".event-details");
    const detailsTextEl = node.querySelector(".event-details-text");

    item.dataset.id = String(event.id);
    emojiDot.textContent = safeEmoji(event.emoji);
    titleEl.textContent = event.title;
    dateInlineEl.textContent = formatMonthYear(event.month);
    detailsTextEl.textContent = event.details || "No extra details.";

    if (event.expanded) {
      card.setAttribute("aria-expanded", "true");
      detailsEl.classList.remove("hidden");
    } else {
      card.setAttribute("aria-expanded", "false");
      detailsEl.classList.add("hidden");
    }

    card.addEventListener("click", () => {
      event.expanded = !event.expanded;
      saveEvents();
      renderTimeline();
    });

    timelineList.appendChild(node);
  });
}

function resetFormDefaults() {
  eventEmojiInput.value = "";
  eventMonthInput.value = currentMonthString();
  eventTitleInput.value = "";
  eventDetailsInput.value = "";
}

function setPanelOpen(button, panel, open) {
  if (!button || !panel) return;
  button.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;

  const textEl = button.querySelector(".toggle-btn-text");
  if (textEl) textEl.textContent = open ? "Hide" : "Show";
}

/* Export dropdown */
function setExportDropdownOpen(open) {
  if (!toggleExportBtnTop || !exportDropdown) return;

  toggleExportBtnTop.setAttribute("aria-expanded", String(open));
  exportDropdown.hidden = !open;

  const textEl = toggleExportBtnTop.querySelector(".toggle-btn-text");
  if (textEl) textEl.textContent = open ? "Hide Export" : "Export";

  if (!open) {
    setTimeout(() => showMessage(exportMessage, ""), 120);
  }
}

function bindPanelToggles() {
  setPanelOpen(toggleAddBtn, addEventPanel, false);
  setExportDropdownOpen(false);

  toggleAddBtn?.addEventListener("click", () => {
    const isOpen = toggleAddBtn.getAttribute("aria-expanded") === "true";
    setPanelOpen(toggleAddBtn, addEventPanel, !isOpen);
  });

  toggleExportBtnTop?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = toggleExportBtnTop.getAttribute("aria-expanded") === "true";
    setExportDropdownOpen(!isOpen);
  });

  exportDropdown?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    setExportDropdownOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setExportDropdownOpen(false);
  });
}

function bindForm() {
  addEventForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const emoji = safeEmoji(eventEmojiInput.value);
    const month = String(eventMonthInput.value || "").trim();
    const title = String(eventTitleInput.value || "").trim();
    const details = String(eventDetailsInput.value || "").trim();

    if (!title) {
      showMessage(formMessage, "Please add a title.", true);
      setPanelOpen(toggleAddBtn, addEventPanel, true);
      return;
    }

    if (!month) {
      showMessage(formMessage, "Please select month and year.", true);
      setPanelOpen(toggleAddBtn, addEventPanel, true);
      return;
    }

    const newEvent = {
      id: nextId(),
      emoji,
      title,
      month,
      details,
      expanded: true
    };

    events.push(newEvent);
    events = sortEventsNewestFirst(events);
    saveEvents();
    renderTimeline();

    showMessage(formMessage, `Saved locally: ${title}`);
    resetFormDefaults();
    setPanelOpen(toggleAddBtn, addEventPanel, false);
  });

  clearAllBtn?.addEventListener("click", () => {
    const confirmed = window.confirm("Clear all saved timeline events and restore data.json defaults?");
    if (!confirmed) return;

    events = cloneEvents(defaultEvents);
    saveEvents();
    renderTimeline();
    showMessage(formMessage, "Timeline reset to data.json defaults.");
    setPanelOpen(toggleAddBtn, addEventPanel, false);
  });
}

/* ---------- Export + Embed ---------- */
function applyEmbedModeIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const isEmbedMode = params.get("embed") === "1";
  document.body.classList.toggle("embed-mode", isEmbedMode);
}

function getEmbedUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("embed", "1");
  return url.toString();
}

function getEmbedCode() {
  const url = getEmbedUrl();
  return `<iframe src="${url}" title="Timeline Embed" width="100%" height="700" style="border:0; border-radius:12px; overflow:hidden;" loading="lazy"></iframe>`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("Copy failed");
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadTextFile(text, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function buildExportPayload() {
  return {
    events: events.map((event) => ({
      id: event.id,
      emoji: event.emoji,
      title: event.title,
      month: event.month,
      details: event.details,
      expanded: event.expanded
    }))
  };
}

function exportAsJson() {
  try {
    const payload = buildExportPayload();
    const json = JSON.stringify(payload, null, 2);
    downloadTextFile(json, "data.json", "application/json;charset=utf-8");
    showMessage(exportMessage, "Downloaded updated data.json.");
  } catch (err) {
    console.error(err);
    showMessage(exportMessage, "JSON export failed.", true);
  }
}

async function captureTimelineCanvas() {
  if (typeof html2canvas === "undefined") throw new Error("html2canvas not loaded");
  if (!timelineExportTarget) throw new Error("Export target not found");

  return html2canvas(timelineExportTarget, {
    backgroundColor: "#ffffff",
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    logging: false
  });
}

async function exportAsImage(type) {
  try {
    showMessage(exportMessage, `Preparing ${type.toUpperCase()}...`);
    const canvas = await captureTimelineCanvas();

    if (type === "jpg" || type === "jpeg") {
      const url = canvas.toDataURL("image/jpeg", 0.95);
      downloadDataUrl(url, "timeline-export.jpg");
      showMessage(exportMessage, "Downloaded JPG.");
      return;
    }

    const url = canvas.toDataURL("image/png");
    downloadDataUrl(url, "timeline-export.png");
    showMessage(exportMessage, "Downloaded PNG.");
  } catch (err) {
    console.error(err);
    showMessage(exportMessage, "Export failed.", true);
  }
}

async function exportAsPdf() {
  try {
    if (!window.jspdf?.jsPDF) throw new Error("jsPDF not loaded");

    showMessage(exportMessage, "Preparing PDF...");
    const canvas = await captureTimelineCanvas();
    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const scaledHeight = (imgHeight * usableWidth) / imgWidth;

    if (scaledHeight <= usableHeight) {
      pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight);
    } else {
      const pageCanvas = document.createElement("canvas");
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas slicing failed");

      const sliceHeightPx = Math.floor((usableHeight * imgWidth) / usableWidth);
      pageCanvas.width = imgWidth;

      let offsetY = 0;
      let pageIndex = 0;

      while (offsetY < imgHeight) {
        const currentSliceHeight = Math.min(sliceHeightPx, imgHeight - offsetY);
        pageCanvas.height = currentSliceHeight;

        ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, offsetY, imgWidth, currentSliceHeight,
          0, 0, imgWidth, currentSliceHeight
        );

        const sliceData = pageCanvas.toDataURL("image/png");
        const sliceHeightPt = (currentSliceHeight * usableWidth) / imgWidth;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(sliceData, "PNG", margin, margin, usableWidth, sliceHeightPt);

        offsetY += currentSliceHeight;
        pageIndex += 1;
      }
    }

    pdf.save("timeline-export.pdf");
    showMessage(exportMessage, "Downloaded PDF.");
  } catch (err) {
    console.error(err);
    showMessage(exportMessage, "PDF export failed.", true);
  }
}

function bindExportTools() {
  exportPngBtn?.addEventListener("click", async () => {
    await exportAsImage("png");
  });

  exportJpgBtn?.addEventListener("click", async () => {
    await exportAsImage("jpg");
  });

  exportPdfBtn?.addEventListener("click", async () => {
    await exportAsPdf();
  });

  exportJsonBtn?.addEventListener("click", () => {
    exportAsJson();
  });

  copyEmbedBtn?.addEventListener("click", async () => {
    try {
      await copyTextToClipboard(getEmbedCode());
      showMessage(exportMessage, "Embed code copied.");
    } catch (err) {
      console.error(err);
      showMessage(exportMessage, "Could not copy embed code.", true);
    }
  });

  copyEmbedLinkBtn?.addEventListener("click", async () => {
    try {
      await copyTextToClipboard(getEmbedUrl());
      showMessage(exportMessage, "Embed link copied.");
    } catch (err) {
      console.error(err);
      showMessage(exportMessage, "Could not copy embed link.", true);
    }
  });
}

async function init() {
  applyEmbedModeIfNeeded();
  await loadDefaultEventsFromFile();
  loadEventsFromStorageOrDefaults();
  bindPanelToggles();
  bindForm();
  bindExportTools();
  renderTimeline();
  resetFormDefaults();
  showMessage(formMessage, "Your timeline is saved locally in this browser.");
  showMessage(exportMessage, "");
}

init();