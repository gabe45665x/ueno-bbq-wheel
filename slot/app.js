const PRIZES = [
  {
    id: "crown", rank: "一獎", label: "皇冠禮",
    result: "恭喜抽中一獎  皇冠禮",
    reward: "平日每天可兌換一個 110 元便當共 5 個（限內用並留下每日用餐評論）",
    note: "最高獎項",
    asset: "./assets/prizes/crown.png", weight: 3, wheelScale: 0.95
  },
  {
    id: "vip-card", rank: "二獎", label: "VIP 卡",
    result: "恭喜抽中二獎  VIP 卡",
    reward: "平日每天可兌換一個 110 元便當共 3 個（限內用並留下每日用餐評論）",
    note: "會員資格",
    asset: "./assets/prizes/vip-card.png", weight: 5, wheelScale: 1.1
  },
  {
    id: "bento", rank: "三獎", label: "豪華便當",
    result: "恭喜抽中三獎  豪華便當",
    reward: "本次用餐升級雙主餐 + 加碼炭烤肋排",
    note: "人氣主餐",
    asset: "./assets/prizes/bento.png", weight: 50, wheelScale: 1.08
  },
  {
    id: "coupon", rank: "四獎", label: "折價券",
    result: "恭喜抽中四獎  折價券",
    reward: "15 元折價券，下次來店現場折抵",
    note: "下次折抵",
    asset: "./assets/prizes/coupon.png", weight: 100, wheelScale: 1.18
  },
  {
    id: "pork-belly", rank: "五獎", label: "五花肉",
    result: "恭喜抽中五獎  加菜五花肉",
    reward: "當月壽星可享加贈五花烤肉片一份（限當月使用）",
    note: "加菜獎",
    asset: "./assets/prizes/pork-belly.png", weight: 100, wheelScale: 1.02
  },
  {
    id: "ember-grill", rank: "未中獎", label: "熄火炭爐",
    result: "本次未中獎",
    reward: "很可惜，這次沒中獎。明天再來試試手氣！",
    note: "明日再試一次",
    asset: "./assets/prizes/ember-grill.png", weight: 500, wheelScale: 1.02
  }
];

// ===== 店家手動維護：各獎「兩個月限量／剩餘」=====
// 發完獎就把對應的 left 改小，再推上線即可。
// （此版無後端，是手動快照：所有客人看到的都是這裡的數字，不會自動扣。）
const PRIZE_STOCK = {
  "crown":      { quota: 3,   left: 3 },
  "vip-card":   { quota: 5,   left: 5 },
  "bento":      { quota: 50,  left: 50 },
  "coupon":     { quota: 100, left: 100 },
  "pork-belly": { quota: 100, left: 100 }
};

const BULB_COUNT = 18;
const SPIN_TURNS = 6;
const SPIN_DURATION_MS = 3000;
const sectorAngle = 360 / PRIZES.length;
const DAILY_KEY = "uenoSlotDate";
const PRIZE_KEY = "uenoSlotPrize";

const spinButton = document.getElementById("spinButton");
const resultLabel = document.getElementById("resultLabel");
const resultDetail = document.getElementById("resultDetail");
const resultIcon = document.getElementById("resultIcon");
const resultCS = document.getElementById("resultCS");
const prizeCards = document.getElementById("prizeCards");
const wheelRotator = document.querySelector("[data-wheel-rotator]");
const wheelTrack = document.querySelector("[data-wheel-track]");
const bulbRing = document.querySelector("[data-bulb-ring]");

let isSpinning = false;
let wheelRotation = 0;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hasSpunToday() {
  return localStorage.getItem(DAILY_KEY) === todayKey();
}

function buildPrizeCards() {
  prizeCards.innerHTML = "";
  for (const prize of PRIZES) {
    const article = document.createElement("article");
    article.className = "prize-card";
    article.dataset.prizeId = prize.id;
    const _st = PRIZE_STOCK[prize.id];
    const _stockLine = _st
      ? `<p class="prize-card__stock${_st.left === 0 ? " is-out" : ""}">${_st.left === 0 ? "已送完" : "剩餘 " + _st.left + " / " + _st.quota}</p>`
      : "";
    article.innerHTML = `
      <div class="prize-card__rank">${prize.rank}</div>
      <div class="prize-card__icon">
        <img src="${prize.asset}" alt="${prize.label}" />
      </div>
      <p class="prize-card__name">${prize.label}</p>
      <p class="prize-card__note">${prize.note}</p>
      ${_stockLine}
    `;
    prizeCards.appendChild(article);
  }
}

// 獎勵詳情視窗：列出每個獎的圖、獎項、完整獎勵文字、限量／剩餘
function buildPrizeDetailModal() {
  const modal = document.createElement("div");
  modal.id = "prizeDetailModal";
  modal.className = "prize-detail";
  const rows = PRIZES.filter((p) => p.id !== "ember-grill").map((p) => {
    const st = PRIZE_STOCK[p.id];
    let stockHtml = "";
    if (st) {
      const pct = Math.max(0, Math.min(100, st.quota ? (st.left / st.quota) * 100 : 0));
      const leftTxt = st.left === 0 ? "已送完" : "剩餘 " + st.left;
      stockHtml =
        `<div class="pd-stock"><span>限量 ${st.quota}</span><span class="pd-left${st.left === 0 ? " is-out" : ""}">${leftTxt}</span></div>` +
        `<div class="pd-bar"><i style="width:${pct}%"></i></div>`;
    }
    return `<div class="pd-item"><img src="${p.asset}" alt="${p.label}">` +
      `<div class="pd-info"><div class="pd-head"><span class="pd-rank">${p.rank}</span><b>${p.label}</b></div>` +
      `<p class="pd-reward">${p.reward}</p>${stockHtml}</div></div>`;
  }).join("");
  modal.innerHTML =
    `<div class="pd-box"><div class="pd-title">🎁 獎勵詳情</div>` +
    `<button class="pd-close" type="button" aria-label="關閉">×</button>` +
    `<div class="pd-list">${rows}</div>` +
    `<p class="pd-foot">數量為兩個月限量，送完為止 · 中獎後請截圖傳官方客服核銷</p></div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("pd-close")) modal.classList.remove("open");
  });
  return modal;
}

function buildWheel() {
  wheelTrack.innerHTML = "";
  for (let index = 0; index < PRIZES.length; index += 1) {
    const prize = PRIZES[index];
    const prizeNode = document.createElement("div");
    prizeNode.className = "wheel-prize";
    prizeNode.style.setProperty("--angle", `${index * sectorAngle}deg`);
    prizeNode.innerHTML = `
      <img src="${prize.asset}" alt="${prize.label}" style="--wheel-scale:${prize.wheelScale};" />
    `;
    wheelTrack.appendChild(prizeNode);
  }
}

function buildBulbs() {
  bulbRing.innerHTML = "";
  for (let index = 0; index < BULB_COUNT; index += 1) {
    const bulb = document.createElement("span");
    bulb.className = "wheel-bulb";
    bulb.style.setProperty("--angle", `${index * (360 / BULB_COUNT)}deg`);
    bulbRing.appendChild(bulb);
  }
}

function weightedPick() {
  const total = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * total;
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}

function normalizeAngle(degrees) {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function setActivePrize(prizeId) {
  for (const card of prizeCards.children) {
    card.classList.toggle("is-active", card.dataset.prizeId === prizeId);
  }
}

// 套用抽獎結果：顯示獎勵內容 + 客服核銷提示，並（中獎時）記錄當日
function applyResult(prize, fromSpin) {
  resultLabel.textContent = prize.result;
  resultDetail.textContent = prize.reward;
  resultIcon.src = prize.asset;
  resultIcon.alt = prize.label;
  if (resultCS) {
    resultCS.textContent = prize.id === "ember-grill"
      ? ""
      : "📸 請截圖此畫面傳給官方客服核銷您的獎品";
  }
  setActivePrize(prize.id);
  if (fromSpin) {
    localStorage.setItem(DAILY_KEY, todayKey());
    localStorage.setItem(PRIZE_KEY, prize.id);
  }
}

function lockButtonForToday() {
  spinButton.disabled = true;
  spinButton.innerHTML = "<span>今日</span><span>已抽</span>";
}

// 同步設定輪盤轉角 + --spin（圖片靠 --spin 反向抵銷，永遠正立）
function setWheelToPrize(prizeIndex) {
  wheelRotation = normalizeAngle(-prizeIndex * sectorAngle);
  wheelRotator.style.transition = "none";
  wheelRotator.style.transform = `rotate(${wheelRotation}deg)`;
  wheelRotator.style.setProperty("--spin", `${wheelRotation}deg`);
}

function spinToPrize(prizeIndex) {
  return new Promise((resolve) => {
    const currentAngle = normalizeAngle(wheelRotation);
    const targetAngle = normalizeAngle(-prizeIndex * sectorAngle);
    const delta = (targetAngle - currentAngle + 360) % 360;
    const nextRotation = wheelRotation + SPIN_TURNS * 360 + delta;

    let done = false;
    const handleStop = () => {
      if (done) return;
      done = true;
      wheelRotator.removeEventListener("transitionend", handleStop);
      setWheelToPrize(prizeIndex);
      resolve();
    };

    wheelRotator.addEventListener("transitionend", handleStop, { once: true });
    // 先 reflow，確保 transition:none → 有過渡 能生效
    void wheelRotator.offsetWidth;
    wheelRotator.style.transition =
      `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.82, 0.18, 1),` +
      ` --spin ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.82, 0.18, 1)`;
    wheelRotator.style.transform = `rotate(${nextRotation}deg)`;
    wheelRotator.style.setProperty("--spin", `${nextRotation}deg`);
    wheelRotation = nextRotation;
    // 後備：即使 transitionend 沒觸發（部分環境）也能收尾
    setTimeout(handleStop, SPIN_DURATION_MS + 150);
  });
}

async function startSpin() {
  if (isSpinning) return;
  if (hasSpunToday()) { lockButtonForToday(); return; }

  isSpinning = true;
  spinButton.disabled = true;
  resultLabel.textContent = "抽獎中";
  resultDetail.textContent = "轉盤旋轉中";
  if (resultCS) resultCS.textContent = "";

  const selectedPrize = weightedPick();
  const prizeIndex = PRIZES.findIndex((prize) => prize.id === selectedPrize.id);

  await spinToPrize(prizeIndex);
  applyResult(selectedPrize, true);

  isSpinning = false;
  lockButtonForToday();
}

buildPrizeCards();
buildWheel();
buildBulbs();

// 獎勵詳情視窗 + 觸發按鈕
const prizeDetailModal = buildPrizeDetailModal();
{ const _b = document.getElementById("prizeDetailBtn"); if (_b) _b.addEventListener("click", () => prizeDetailModal.classList.add("open")); }

// 初始：若今日已抽過 → 轉到該獎項並恢復結果、鎖定；否則待機
const storedPrizeId = hasSpunToday() ? localStorage.getItem(PRIZE_KEY) : null;
const storedPrize = storedPrizeId ? PRIZES.find((p) => p.id === storedPrizeId) : null;
if (storedPrize) {
  setWheelToPrize(PRIZES.findIndex((p) => p.id === storedPrize.id));
  applyResult(storedPrize, false);
  lockButtonForToday();
} else {
  setWheelToPrize(5);
  setActivePrize("ember-grill");
  resultLabel.textContent = "待機中";
  resultDetail.textContent = "按下中心按鈕開始抽獎";
}

spinButton.addEventListener("click", startSpin);

// 背景音樂（沿用主遊戲的靜音設定）
(function () {
  const bgm = document.getElementById("bgm"), muteBtn = document.getElementById("muteBtn");
  if (!bgm) return;
  let started = false;
  const muted = () => localStorage.getItem("uenoMute") === "1";
  function icon() { if (muteBtn) muteBtn.textContent = (muted() || bgm.paused) ? "🔇" : "🔊"; }
  function start() {
    if (muted()) { icon(); return; }
    bgm.volume = 0.45;
    const p = bgm.play();
    if (p && p.then) { p.then(() => { started = true; icon(); }).catch(() => {}); } else { started = true; icon(); }
  }
  if (muteBtn) {
    muteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (bgm.paused) { localStorage.removeItem("uenoMute"); bgm.volume = 0.45; bgm.play().catch(function () {}); started = true; }
      else { bgm.pause(); localStorage.setItem("uenoMute", "1"); }
      icon();
    });
  }
  start();
  document.addEventListener("click", function () { if (!started && !muted()) start(); });
  document.addEventListener("touchstart", function () { if (!started && !muted()) start(); }, { passive: true });
  icon();
})();
