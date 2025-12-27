const API_BASE ="";

function el(id){
  return document.getElementById(id);
  }

function createCard(innerHTML) {
  const d =
  document.createElement("div");
  d.className = "card";
  d.innerHTML = innerHTML;
  return d;
}

async function loadliveScores() {
  try {
    const res = await fetch(`${API_BASE}/api/Livescores`);
    const json = await res.json();
    const data = json.data || [];
    const container = el("livescores");
    if(!container) return
    
    container.innerHTML = "";
    data.forEach(s=>{
      const html = `<h4>${s.match}</h4><p>Score: ${s.score}</p><p>Time: ${s.minute}</p>`;
      container.appendChild(createCard(html))
    });
  }catch (err) {
    console.error("loadliveScoresError:",err);
  }
}

async function loadPredictions() {
  try {
    const res = await fetch (`${API_BASE}/api/predictions`);
    const json = await res.json();
    const arr = json.data || [];
    const container = el("predictions");
    const select = el("prediction-select");
    
    if(container) container.innerHTML = "";
    if(select)select.innerHTML =
    '<option value= "">Select Package</option>';
    
    arr.forEach(p=>{
      const matchesDisplay
      =Array.isArray(p.matches)?
      p.matches.join(",") : p.matches;
      const html =`<h4>$
      {p.type}</h4><p>Matches: ${matchesDisplay}</p><p>Price:
      KES ${p.price}</p>`;
      if(container)container.appendChild(createCard(html));
      
      if(select) {
        const option =
        document.createElement("option");
        //Store price in the value so we can pay immediately
        option.value = p.price;
        option.textContent = `${p.type}
        - KES ${p.price}`;
        select.appendChild(option);
      }
    });
  }catch (err) {
    console.error("loadPredictionsError:", err);
  }
}

async function handleSTKPush(phone,amount) {
  try{
    const res = await fetch( `${API_BASE}/api/mpesa/stkpush`, {
      method: "POST",
      headers: {"Content-Type":
      "application/json"},
      body: JSON.stringify({phone,amount})
    });
    const json = await res.json();
    alert(json.status=== "ok"? "STK Push sent! Check your phone.": "Error:" + json.message);
  }catch (err) {
    alert("MPESA request failed");
  }
}

async function generateAd(prompt) {
  try {
    const res = await fetch(`${API_BASE}/api/generate-ad`, {
      method: "POST",
      headers: {"Content-Type":
      "application/json"},
      body: JSON.stringify({prompt})
    });
    const json = await res.json();
    
    if(json.status==="ok") {
      // Update the UI with the new ad text
      const adBox = el("ai-ad-box");
      if(adBox) {
        adBox.innerHTML = `
        <div class = "ad-card">
        <h4> Generate Ad</h4>
        <p>${json.ad}</p>
        </div>
        `;
      }
      alert("New AI Ad generated!");
    }
    
  }catch (err) {
    console.error("Error generating ad:", err);
    alert("Error generating ad.");
  }
}

document.addEventListener("click", (e)=>{
// 1. AI Ad Generator
if(e.target && e.target.id===
"gen-ad-btn"){
  const prompt =
  el("ad-prompt")?.value;
  generateAd(prompt);
}
// 2. VIP Package Buy Button
if(e.target && e.target.id=== "buy-btn"){
  const phone = 
  el("phone")?.value.trim();
  const amount =
  el("prediction-select")?.value; //Gets price from selection
  if(!phone || !amount) return
  alert("Select package and enter phone");
  handleSTKPush(phone,amount);
}

// 3. Direct STK Push Button
if(e.target && e.target.id===
"stk-push-btn"){
  const phone =
  el("mpesa-phone")?.value;
  const amount =
  el("mpesa-amount")?.value;
  if(!phone || !amount) return
  alert("Enter phone and amount");
  handleSTKPush(phone,amount);
}
});

function init() {
  loadliveScores();
  loadPredictions();
}

document.addEventListener("DOMContentLoaded",init);