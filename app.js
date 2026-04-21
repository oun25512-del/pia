/* ==============================
   Preset appliances
   ============================== */
const PRESETS = [
  { name: "แอร์ 9000 BTU",    w: 900,  h: 8   },
  { name: "แอร์ 12000 BTU",   w: 1200, h: 8   },
  { name: "ตู้เย็น",           w: 150,  h: 24  },
  { name: "ทีวี 32\"",         w: 60,   h: 5   },
  { name: "ทีวี 55\"",         w: 120,  h: 5   },
  { name: "หลอด LED",          w: 10,   h: 8   },
  { name: "เครื่องซักผ้า",     w: 500,  h: 1   },
  { name: "เครื่องอบผ้า",      w: 2000, h: 1   },
  { name: "ไมโครเวฟ",          w: 1000, h: 0.5 },
  { name: "หม้อหุงข้าว",       w: 500,  h: 1   },
  { name: "เครื่องทำน้ำอุ่น",  w: 3500, h: 0.3 },
  { name: "พัดลม",             w: 50,   h: 8   },
  { name: "คอมพิวเตอร์",       w: 200,  h: 6   },
  { name: "โน้ตบุ๊ก",          w: 60,   h: 8   },
  { name: "เตารีด",            w: 1500, h: 0.5 },
  { name: "ปั๊มน้ำ",           w: 375,  h: 2   },
];

/* ==============================
   State
   ============================== */
let rows = [];

/* ==============================
   Helpers
   ============================== */
function uid() {
  return Math.random().toString(36).slice(2, 8);
}

/* ==============================
   Electricity bill calculation
   - PEA progressive tiers (2024)
   - Includes Ft surcharge & service fee
   - VAT 7%
   ============================== */
function calcBill(units, region) {
  const FT_RATE   = 0.9534;   // บาท/kWh  (Ft ปัจจุบัน)
  const SVC_FEE   = 38.22;    // บาท/เดือน
  const VAT       = 1.07;

  let energyCost = 0;

  if (region === "pea") {
    // PEA residential tiered rates
    const tiers = [
      { max: 15,       rate: 2.3488 },
      { max: 25,       rate: 2.9882 },
      { max: 35,       rate: 3.2405 },
      { max: 100,      rate: 3.6237 },
      { max: 150,      rate: 3.7171 },
      { max: 400,      rate: 4.2218 },
      { max: Infinity, rate: 4.4217 },
    ];
    let remaining = units;
    let prev = 0;
    for (const tier of tiers) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, tier.max - prev);
      energyCost += use * tier.rate;
      remaining  -= use;
      prev        = tier.max;
    }
  } else {
    // MEA residential tiered rates
    const tiers = [
      { max: 150,      rate: 3.2484 },
      { max: 400,      rate: 4.2218 },
      { max: Infinity, rate: 4.4217 },
    ];
    let remaining = units;
    let prev = 0;
    for (const tier of tiers) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, tier.max - prev);
      energyCost += use * tier.rate;
      remaining  -= use;
      prev        = tier.max;
    }
  }

  const ftCost    = units * FT_RATE;
  const subtotal  = energyCost + ftCost + SVC_FEE;
  return subtotal * VAT;
}

/* ==============================
   Add / Remove appliance rows
   ============================== */
function addRow(name = "", w = "", h = "", qty = 1) {
  rows.push({ id: uid(), name, w, h, qty });
  renderRows();
}

function removeRow(id) {
  rows = rows.filter(r => r.id !== id);
  renderRows();
}

function updateRow(id, field, value) {
  const row = rows.find(r => r.id === id);
  if (row) row[field] = value;
  calc();
}

function renderRows() {
  const list = document.getElementById("appliance-list");
  list.innerHTML = rows.map(r => `
    <div class="appliance-row" data-id="${r.id}">
      <input type="text"   value="${r.name}" placeholder="ชื่ออุปกรณ์"
             oninput="updateRow('${r.id}','name',this.value)" />
      <input type="number" value="${r.w}"    placeholder="วัตต์" min="0"
             oninput="updateRow('${r.id}','w',this.value)" />
      <input type="number" value="${r.h}"    placeholder="ชม." min="0" max="24" step="0.5"
             oninput="updateRow('${r.id}','h',this.value)" />
      <input type="number" value="${r.qty}"  min="1" max="99"
             oninput="updateRow('${r.id}','qty',this.value)" />
      <button class="del-btn" onclick="removeRow('${r.id}')">×</button>
    </div>
  `).join("");
  calc();
}

/* ==============================
   Main calculation & UI update
   ============================== */
function calc() {
  const days   = parseInt(document.getElementById("days").value) || 30;
  const region = document.getElementById("region").value;

  let totalKwh = 0;

  const items = rows.map(r => {
    const w   = parseFloat(r.w)   || 0;
    const h   = parseFloat(r.h)   || 0;
    const qty = parseInt(r.qty)   || 1;
    const kwh = (w / 1000) * h * days * qty;
    totalKwh += kwh;
    return { name: r.name || "ไม่ระบุ", kwh };
  });

  const bill    = calcBill(totalKwh, region);
  const FT_RATE = 0.9534;
  const SVC_FEE = 38.22;

  // Summary cards
  document.getElementById("total-units").textContent = totalKwh.toFixed(1);
  document.getElementById("total-baht").textContent  = bill.toFixed(0);
  document.getElementById("per-day").textContent     = (bill / days).toFixed(1);

  // Rate breakdown
  const rawBill    = bill / 1.07;
  const ftCost     = totalKwh * FT_RATE;
  const energyCost = rawBill - ftCost - SVC_FEE;
  const vatCost    = bill - rawBill;

  document.getElementById("rate-breakdown").innerHTML = `
    <div class="rate-row"><span>ค่าพลังงานไฟฟ้า</span><span>${energyCost.toFixed(2)} บาท</span></div>
    <div class="rate-row"><span>ค่า Ft</span><span>${ftCost.toFixed(2)} บาท</span></div>
    <div class="rate-row"><span>ค่าบริการ</span><span>${SVC_FEE.toFixed(2)} บาท</span></div>
    <div class="rate-row"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>${vatCost.toFixed(2)} บาท</span></div>
    <div class="rate-row"><span>รวมทั้งหมด</span><span class="accent">${bill.toFixed(2)} บาท</span></div>
  `;

  // Bar chart (top 6 consumers)
  const barSection = document.getElementById("bar-section");
  if (items.length > 0 && totalKwh > 0) {
    const sorted = [...items].sort((a, b) => b.kwh - a.kwh).slice(0, 6);
    barSection.innerHTML =
      `<div class="bar-section-label">สัดส่วนการใช้พลังงาน</div>` +
      sorted.map(it => `
        <div class="bar-row">
          <span class="bar-name">${it.name}</span>
          <div class="bar-bg">
            <div class="bar-fill" style="width:${((it.kwh / totalKwh) * 100).toFixed(1)}%"></div>
          </div>
          <span class="bar-val">${it.kwh.toFixed(1)} kWh</span>
        </div>
      `).join("");
  } else {
    barSection.innerHTML = "";
  }
}

/* ==============================
   AI recommendation (Anthropic API)
   ============================== */

// วาง Anthropic API Key ของคุณที่นี่
// รับได้ที่ https://console.anthropic.com/
const ANTHROPIC_API_KEY = "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";

async function askAI() {
  const btn    = document.getElementById("ai-btn");
  const output = document.getElementById("ai-output");
  const days   = parseInt(document.getElementById("days").value) || 30;
  const region = document.getElementById("region").value;

  // ตรวจสอบว่าใส่ API Key หรือยัง
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.startsWith("sk-ant-xxx")) {
    output.style.display = "block";
    output.innerHTML = `
      <p style="color:#c0392b;font-weight:500">⚠ กรุณาใส่ Anthropic API Key ก่อนใช้งาน</p>
      <p style="margin-top:6px">เปิดไฟล์ <code>app.js</code> แล้วแก้ไขบรรทัด:<br>
      <code>const ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxxxxxx";</code><br>
      เป็น API Key จริงของคุณจาก <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></p>`;
    return;
  }

  // Build appliance summary for prompt
  let totalKwh = 0;
  const lines = rows.map(r => {
    const w   = parseFloat(r.w)   || 0;
    const h   = parseFloat(r.h)   || 0;
    const qty = parseInt(r.qty)   || 1;
    const kwh = (w / 1000) * h * days * qty;
    totalKwh += kwh;
    return `- ${r.name || "ไม่ระบุ"}: ${w}W × ${h}ชม/วัน × ${qty}เครื่อง = ${kwh.toFixed(1)} kWh/เดือน`;
  });

  const bill = calcBill(totalKwh, region);

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประหยัดพลังงานในประเทศไทย

ข้อมูลการใช้ไฟฟ้าของผู้ใช้:
${lines.join("\n")}
รวม: ${totalKwh.toFixed(1)} kWh/เดือน ≈ ${bill.toFixed(0)} บาท/เดือน (การไฟฟ้า: ${region.toUpperCase()})

กรุณาวิเคราะห์และให้คำแนะนำประหยัดพลังงาน โดยตอบเป็นภาษาไทย กระชับ ใช้งานได้จริง แบ่งเป็น:
1. อุปกรณ์ที่กินไฟมากที่สุดที่ควรปรับ (2-3 อย่าง)
2. เคล็ดลับประหยัดไฟที่ทำได้ทันที (3-4 ข้อ)
3. ประมาณการค่าไฟที่ประหยัดได้ต่อเดือน
ตอบสั้น กระชับ ไม่เกิน 200 คำ ไม่ต้องมีคำนำ`;

  btn.disabled     = true;
  btn.textContent  = "กำลังวิเคราะห์...";
  output.style.display = "block";
  output.innerHTML = `<p style="color:var(--color-text-secondary)">AI กำลังวิเคราะห์การใช้ไฟฟ้าของคุณ...</p>`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.find(c => c.type === "text")?.text || "ไม่สามารถรับคำแนะนำได้";

    output.innerHTML = text
      .split("\n")
      .filter(l => l.trim())
      .map(l => `<p>${l}</p>`)
      .join("");

  } catch (err) {
    console.error("AI error:", err);
    output.innerHTML = `<p style="color:#c0392b">เกิดข้อผิดพลาด: ${err.message}</p>`;
  }

  btn.disabled    = false;
  btn.textContent = "✦ ขอคำแนะนำใหม่จาก AI";
}

/* ==============================
   Init — preset buttons & default rows
   ============================== */
(function init() {
  const grid = document.getElementById("presets");
  PRESETS.forEach(p => {
    const btn = document.createElement("button");
    btn.className   = "preset-btn";
    btn.textContent = p.name;
    btn.onclick     = () => addRow(p.name, p.w, p.h, 1);
    grid.appendChild(btn);
  });

  // Default sample appliances
  addRow("แอร์ 9000 BTU",  900,  8,  1);
  addRow("ตู้เย็น",         150,  24, 1);
  addRow("ทีวี 40\"",       80,   5,  1);
  addRow("หลอด LED",        10,   8,  5);

  // Re-calc when region or days change
  document.getElementById("region").addEventListener("change", calc);
  document.getElementById("days").addEventListener("input", calc);
})();
