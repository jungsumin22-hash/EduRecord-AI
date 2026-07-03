let KEYWORDS = {};
let TEMPLATES = {};
let selected = new Set();
let current = "전체";
let variant = 0;

const $ = (id) => document.getElementById(id);

async function loadData(){
  try{
    KEYWORDS = await fetch("data/keywords.json").then(r => r.json());
    TEMPLATES = await fetch("data/templates.json").then(r => r.json());
    init();
  }catch(e){
    $("keywordList").textContent = "데이터 파일을 불러오지 못했습니다. data 폴더가 index.html 옆에 있는지 확인하세요.";
    console.error(e);
  }
}

function allItems(){
  const arr = [];
  Object.entries(KEYWORDS).forEach(([cat, groups]) => {
    Object.entries(groups).forEach(([group, items]) => {
      items.forEach(label => arr.push({cat, group, label}));
    });
  });
  return arr;
}

function init(){
  renderTabs();
  renderList();
  renderSelected();
  $("search").addEventListener("input", renderList);
  $("autoPickBtn").addEventListener("click", autoPick);
  $("clearBtn").addEventListener("click", clearAll);
  $("generateBtn").addEventListener("click", generate);
  $("regenerateBtn").addEventListener("click", () => { variant++; generate(); });
}

function renderTabs(){
  $("tabs").innerHTML = "";
  ["전체", ...Object.keys(KEYWORDS)].forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab" + (cat === current ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => { current = cat; renderTabs(); renderList(); };
    $("tabs").appendChild(btn);
  });
}

function renderList(){
  const q = $("search").value.trim();
  const box = $("keywordList");
  box.innerHTML = "";

  const arr = allItems().filter(x =>
    (current === "전체" || x.cat === current) &&
    (!q || x.label.includes(q) || x.cat.includes(q) || x.group.includes(q))
  );

  const grouped = {};
  arr.forEach(x => {
    const key = x.cat + " · " + x.group;
    if(!grouped[key]) grouped[key] = [];
    grouped[key].push(x);
  });

  Object.entries(grouped).forEach(([group, items]) => {
    const title = document.createElement("div");
    title.className = "group";
    title.textContent = group;
    box.appendChild(title);

    items.forEach(x => {
      const key = makeKey(x);
      const chip = document.createElement("span");
      chip.className = "chip" + (selected.has(key) ? " on" : "");
      chip.textContent = x.label;
      chip.onclick = () => {
        selected.has(key) ? selected.delete(key) : selected.add(key);
        renderList();
        renderSelected();
      };
      box.appendChild(chip);
    });
  });

  if(!arr.length) box.innerHTML = '<div class="group">검색 결과가 없습니다.</div>';
}

function makeKey(x){ return x.cat + "||" + x.group + "||" + x.label; }

function selectedItems(){
  return [...selected].map(k => {
    const [cat, group, label] = k.split("||");
    return {cat, group, label};
  });
}

function renderSelected(){
  const box = $("selectedList");
  box.innerHTML = "";
  const arr = selectedItems();

  if(!arr.length) box.innerHTML = '<span class="chip">선택 없음</span>';

  arr.forEach(x => {
    const chip = document.createElement("span");
    chip.className = "chip on";
    chip.textContent = "× " + x.label;
    chip.onclick = () => {
      selected.delete(makeKey(x));
      renderList();
      renderSelected();
    };
    box.appendChild(chip);
  });

  renderProfile();
}

function score(){
  const s = {책임감:0, 리더십:0, 배려:0, 자기주도성:0, 성실성:0, 표현력:0, 성장가능성:0};
  selectedItems().forEach(x => {
    const l = x.label;
    if(x.cat.includes("리더십") || l.includes("반장") || l.includes("이끄")) { s.리더십 += 3; s.책임감 += 2; }
    if(x.cat.includes("교우") || l.includes("친구") || l.includes("배려")) { s.배려 += 3; }
    if(x.cat.includes("학습") || l.includes("수학") || l.includes("발표") || l.includes("질문")) { s.자기주도성 += 2; s.표현력 += 1; }
    if(x.cat.includes("학교생활") || l.includes("규칙") || l.includes("정리") || l.includes("맡은")) { s.성실성 += 2; s.책임감 += 2; }
    if(x.cat.includes("성장")) { s.성장가능성 += 3; }
  });
  return s;
}

function stars(n){ return "★".repeat(Math.min(5, Math.ceil(n / 2))); }

function renderProfile(){
  const arr = Object.entries(score()).sort((a,b)=>b[1]-a[1]).filter(x=>x[1] > 0);
  $("profileBox").innerHTML = arr.length
    ? arr.map(([k,v]) => `<b>${k}</b> ${stars(v)}<br>`).join("")
    : "아직 선택한 키워드가 없습니다.";
}

function autoPick(){
  const memo = $("memo").value;
  allItems().forEach(x => {
    const core = x.label.replace(/하는|있는|함|을|를|이|가|에게|에서/g, "").slice(0, 4);
    if(core && memo.includes(core)) selected.add(makeKey(x));
  });
  renderList();
  renderSelected();
}

function clearAll(){
  selected.clear();
  $("memo").value = "";
  $("student").value = "";
  $("resultArea").textContent = "생성 버튼을 누르면 결과가 표시됩니다.";
  renderList();
  renderSelected();
}

function byteLen(s){ return new Blob([s]).size; }

function get(cat){ return selectedItems().filter(x => x.cat === cat).map(x => x.label); }
function one(arr, fallback){
  if(!arr.length) return fallback;
  return arr[variant % arr.length];
}

function convertGrowth(label){
  if(!label) return "";
  return TEMPLATES.growthMap[label] || `${label} 모습을 보이며, 관련 경험을 통해 긍정적인 방향으로 성장하고 있음.`;
}

function polish(text){
  return text
    .replace(/\s+/g, " ")
    .replace(/\.+/g, ".")
    .replace(/함 태도/g, "하는 태도")
    .replace(/하는 태도가 태도가/g, "하는 태도가")
    .trim();
}

function generateText(){
  const role = one(get("리더십"), "");
  const learn = one(get("학습"), one(get("장점"), "학습 활동에 성실하게 참여하는"));
  const life = one(get("학교생활"), "학교생활에서 기본적인 약속을 지키려는");
  const rel = one(get("교우관계"), "친구들과 원만하게 어울리며 협력하는");
  const art = one(get("예체능·창의"), "");
  const self = one(get("자기관리·진로"), "");
  const growth = convertGrowth(one(get("성장 포인트"), ""));

  const parts = [];

  if(role){
    parts.push(`${role} 모습을 바탕으로 학급의 여러 활동에 책임감 있게 참여하며, 친구들의 의견을 살피고 공동체 안에서 자신의 역할을 성실히 수행함.`);
  }else{
    parts.push("학교생활 전반에서 자신에게 주어진 일을 차분히 수행하며, 학급의 흐름을 살피고 필요한 활동에 성실하게 참여함.");
  }

  parts.push(`${learn} 태도가 나타나며, 배운 내용을 자신의 방식으로 이해하고 표현하려는 노력이 꾸준함.`);
  parts.push(`${rel} 모습이 자연스럽게 나타나고, ${life} 태도로 안정적인 학교생활을 이어감.`);

  if(art) parts.push(`${art} 과정에서 자신의 생각과 감수성을 구체적으로 드러내며 활동의 완성도를 높이려는 모습이 보임.`);
  if(self) parts.push(`${self} 태도를 바탕으로 자신의 강점과 부족한 점을 돌아보며 자기관리 역량을 키워 가고 있음.`);
  if(growth) parts.push(growth);

  parts.push("현재의 성실함과 관계 맺는 태도를 바탕으로 앞으로도 학습과 생활 전반에서 꾸준한 성장이 기대되는 학생임.");

  return polish(parts.join(" "));
}

function generate(){
  const text = generateText();
  const warning = byteLen(text) > Number($("targetBytes").value) + 170
    ? `<div class="warning">목표 byte보다 조금 깁니다. 필요하면 문장을 일부 줄여 사용하세요.</div>`
    : "";

  $("resultArea").innerHTML = `
    <div class="result">
      <div class="result-top">
        <span>최종 추천 · ${byteLen(text)} byte</span>
        <button class="copy" id="copyBtn">복사</button>
      </div>
      <div class="txt">${text}</div>
      ${warning}
    </div>
  `;

  $("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.querySelector(".txt").textContent);
    alert("복사했어요.");
  };
}

loadData();
