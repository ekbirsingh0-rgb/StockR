import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhFOA3ZfWJx4wZlxFsq-vvoNd9Q6kGd3A",
  authDomain: "stock-r-97a12.firebaseapp.com",
  projectId: "stock-r-97a12",
  storageBucket: "stock-r-97a12.firebasestorage.app",
  messagingSenderId: "636807135465",
  appId: "1:636807135465:web:be4a933368f910d59eb078",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP_NUMBER = "918968342222";

const SEED_PRODUCTS = [
  { name: "WR4500", variant: "20L", opening: 23 },
  { name: "WR4500", variant: "10L", opening: 98 },
  { name: "WR4500", variant: "5L", opening: 11 },
  { name: "WR4500", variant: "1Kg", opening: 25 },
  { name: "SBR", variant: "50L", opening: 25 },
  { name: "SBR", variant: "20L", opening: 45 },
  { name: "SBR", variant: "10L", opening: 49 },
  { name: "SBR", variant: "5L", opening: 4 },
  { name: "SBR", variant: "1Kg", opening: 9 },
  { name: "FLEX", variant: "30L", opening: 16 },
  { name: "TOPSHIF LD", variant: "20L", opening: 14 },
  { name: "TOPSHIF LD", variant: "10L", opening: 12 },
  { name: "TOPSHIF LDEZY", variant: "20L", opening: 49 },
  { name: "TOPSHIF LDEZY", variant: "10L", opening: 13 },
  { name: "IVORY", variant: "1Kg", opening: 97 },
  { name: "IVORY WHITE", variant: "5Kg", opening: 6 },
  { name: "TR BLACK", variant: "1Kg", opening: 15 },
  { name: "DR HCLT", variant: "1Kg", opening: 6 },
  { name: "SL GREY", variant: "1Kg", opening: 9 },
  { name: "SL GREY", variant: "5Kg", opening: 3 },
  { name: "WHITE", variant: "1Kg", opening: 1 },
  { name: "BLACK", variant: "5Kg", opening: 6 },
  { name: "WHITE", variant: "5Kg", opening: 1 },
  { name: "COFFEE BROWN", variant: "5Kg", opening: 1 },
  { name: "WR4200", variant: "5L", opening: 1 },
  { name: "WR4200", variant: "1Kg", opening: 3 },
  { name: "ADDA SBR", variant: "Litre", opening: 29 },
  { name: "PROXY", variant: "5Kg", opening: 17 },
  { name: "DITUPRO", variant: "20L", opening: 4 },
  { name: "DITUPRO", variant: "5L", opening: 3 },
  { name: "VT", variant: "40Kg", opening: 16 },
  { name: "VT", variant: "20Kg", opening: 105 },
  { name: "V WHITE", variant: "20Kg", opening: 171 },
  { name: "CT", variant: "20Kg", opening: 493 },
  { name: "CT WHITE", variant: "20Kg", opening: 60 },
  { name: "CT WHITE", variant: "40Kg", opening: 55 },
  { name: "NT", variant: "20Kg", opening: 333 },
  { name: "N WHITE", variant: "40Kg", opening: 100 },
  { name: "XT", variant: "40Kg", opening: 12 },
  { name: "XT WHITE", variant: "20Kg", opening: 2 },
  { name: "MICROKRETE", variant: "40Kg", opening: 18 },
  { name: "ULTIMA WHITE", variant: "20Kg", opening: 25 },
];

const today = () => new Date().toISOString().split("T")[0];
const stockColor = (q) => q <= 0 ? "#ef4444" : q <= 5 ? "#f59e0b" : "#22c55e";
const sendWhatsApp = (message) => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");

export default function StockManager() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ qty: "", note: "", date: today() });
  const [editForm, setEditForm] = useState({ name: "", variant: "" });
  const [search, setSearch] = useState("");
  const [newProd, setNewProd] = useState({ name: "", variant: "", opening: "" });
  const [filterDate, setFilterDate] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, "products"), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(docs);
      setLoading(false);
      if (docs.length === 0 && !seeded) { setSeeded(true); seedProducts(); }
    });
    const unsubT = onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc")),
      snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubP(); unsubT(); };
  }, []);

  const seedProducts = async () => {
    for (const p of SEED_PRODUCTS) {
      const ref = await addDoc(collection(db, "products"), { name: p.name, variant: p.variant, opening: p.opening });
      if (p.opening > 0) {
        await addDoc(collection(db, "transactions"), {
          productId: ref.id, type: "in", qty: p.opening,
          note: "Opening stock", date: "2026-05-08", createdAt: new Date().toISOString()
        });
      }
    }
  };

  const currentStock = useMemo(() => {
    const stock = {};
    products.forEach(p => stock[p.id] = 0);
    transactions.forEach(t => {
      if (stock[t.productId] === undefined) stock[t.productId] = 0;
      stock[t.productId] += t.type === "in" ? t.qty : -t.qty;
    });
    return stock;
  }, [products, transactions]);

  const showToast = (msg, color = "#22c55e") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3500);
  };

  const lowStockItems = useMemo(() => products.filter(p => (currentStock[p.id] || 0) <= 5), [products, currentStock]);
  const todayTx = transactions.filter(t => t.date === today());
  const totalInToday = todayTx.filter(t => t.type === "in").reduce((s, t) => s + t.qty, 0);
  const totalOutToday = todayTx.filter(t => t.type === "out").reduce((s, t) => s + t.qty, 0);
  const allTimeIn = transactions.filter(t => t.type === "in").reduce((s, t) => s + t.qty, 0);
  const allTimeOut = transactions.filter(t => t.type === "out").reduce((s, t) => s + t.qty, 0);

  const filtered = useMemo(() => {
    let list = products.filter(p => `${p.name} ${p.variant}`.toLowerCase().includes(search.toLowerCase()));
    if (lowStockFilter) list = list.filter(p => (currentStock[p.id] || 0) <= 5);
    if (sortBy === "high") list = [...list].sort((a, b) => (currentStock[b.id] || 0) - (currentStock[a.id] || 0));
    else if (sortBy === "low") list = [...list].sort((a, b) => (currentStock[a.id] || 0) - (currentStock[b.id] || 0));
    else list = [...list].sort((a, b) => `${a.name}${a.variant}`.localeCompare(`${b.name}${b.variant}`));
    return list;
  }, [products, search, sortBy, lowStockFilter, currentStock]);

  const filteredTx = useMemo(() =>
    transactions.filter(t => !filterDate || t.date === filterDate),
    [transactions, filterDate]);

  const openModal = (type, productId) => { setModal({ type, productId }); setForm({ qty: "", note: "", date: today() }); };
  const openEditModal = (product) => { setModal({ type: "edit", product }); setEditForm({ name: product.name, variant: product.variant }); };

  const submitEdit = async () => {
    if (!editForm.name.trim()) return;
    await updateDoc(doc(db, "products", modal.product.id), {
      name: editForm.name.toUpperCase().trim(),
      variant: editForm.variant.trim(),
    });
    setModal(null);
    showToast("Product name updated ✓");
  };

  const submitTx = async () => {
    const qty = parseInt(form.qty);
    if (!qty || qty <= 0) return;
    if (modal.type === "out" && (currentStock[modal.productId] || 0) < qty) {
      showToast("Not enough stock!", "#ef4444"); return;
    }
    await addDoc(collection(db, "transactions"), {
      productId: modal.productId, type: modal.type, qty,
      note: form.note, date: form.date, createdAt: new Date().toISOString()
    });
    if (modal.type === "out") {
      const newQty = (currentStock[modal.productId] || 0) - qty;
      const p = products.find(x => x.id === modal.productId);
      if (newQty <= 5) {
        showToast(`⚠️ ${p?.name} is low! Sending WhatsApp alert...`, "#f59e0b");
        setTimeout(() => {
          const msg = `⚠️ *LOW STOCK ALERT*\n📦 ${p?.name} ${p?.variant}\n🔢 Remaining: *${newQty} units*\n📅 Date: ${form.date}\n\nPlease reorder soon.\n_Sent from STOCKR App_`;
          sendWhatsApp(msg);
        }, 800);
      }
    }
    setModal(null);
    showToast(modal.type === "in" ? "Stock added ✓" : "Stock removed ✓");
  };

  const addProduct = async () => {
    if (!newProd.name.trim()) return;
    const opening = parseInt(newProd.opening) || 0;
    const ref = await addDoc(collection(db, "products"), { name: newProd.name.toUpperCase(), variant: newProd.variant, opening });
    if (opening > 0) {
      await addDoc(collection(db, "transactions"), {
        productId: ref.id, type: "in", qty: opening, note: "Opening stock", date: today(), createdAt: new Date().toISOString()
      });
    }
    setNewProd({ name: "", variant: "", opening: "" });
    setView("dashboard");
    showToast("Product added ✓");
  };

  const sendDailyReport = (dateStr) => {
    const dayTx = transactions.filter(t => t.date === dateStr);
    const dayIn = dayTx.filter(t => t.type === "in").reduce((s, t) => s + t.qty, 0);
    const dayOut = dayTx.filter(t => t.type === "out").reduce((s, t) => s + t.qty, 0);
    let msg = `📦 *STOCKR DAILY REPORT*\n📅 Date: ${dateStr}\n━━━━━━━━━━━━━━━━\n`;
    msg += `✅ Total IN: *${dayIn}*\n📤 Total OUT: *${dayOut}*\n📊 Transactions: *${dayTx.length}*\n━━━━━━━━━━━━━━━━\n`;
    if (lowStockItems.length > 0) {
      msg += `⚠️ LOW STOCK (${lowStockItems.length} items):\n`;
      lowStockItems.forEach(p => { msg += `  ${(currentStock[p.id]||0)===0?"🔴":"🟡"} ${p.name} ${p.variant}: *${currentStock[p.id]||0}*\n`; });
      msg += `━━━━━━━━━━━━━━━━\n`;
    }
    if (dayTx.length > 0) {
      msg += `📋 Movements:\n`;
      dayTx.slice(0, 8).forEach(t => {
        const p = products.find(x => x.id === t.productId);
        msg += `  ${t.type==="in"?"⬇️":"⬆️"} ${p?.name} ${p?.variant}: ${t.type==="in"?"+":"-"}${t.qty}\n`;
      });
    }
    msg += `_Sent from STOCKR App_`;
    sendWhatsApp(msg);
  };

  const sendLowStockAlert = () => {
    if (lowStockItems.length === 0) { showToast("All stock levels are OK!", "#22c55e"); return; }
    let msg = `⚠️ *LOW STOCK ALERT*\n📅 ${today()}\n━━━━━━━━━━━━━━━━\n`;
    lowStockItems.forEach(p => {
      const qty = currentStock[p.id] || 0;
      msg += `${qty === 0 ? "🔴 EMPTY" : "🟡 LOW"} — ${p.name} ${p.variant}: *${qty} left*\n`;
    });
    msg += `━━━━━━━━━━━━━━━━\n_Sent from STOCKR App_`;
    sendWhatsApp(msg);
  };

  const getProduct = (id) => products.find(p => p.id === id);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}body{background:#0f1117}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#1a1d27}::-webkit-scrollbar-thumb{background:#3b3f52;border-radius:2px}
    .btn{cursor:pointer;border:none;font-family:inherit;transition:all 0.15s}.btn:active{transform:scale(0.97)}
    .card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:12px}
    .tag-in{background:#052e16;color:#4ade80;border:1px solid #166534;border-radius:4px;padding:2px 8px;font-size:11px}
    .tag-out{background:#2d0c0c;color:#f87171;border:1px solid #7f1d1d;border-radius:4px;padding:2px 8px;font-size:11px}
    .nav-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;padding:7px 11px;border-radius:8px;transition:all 0.15s}
    .nav-active{background:#252836;color:#fff}.nav-inactive{color:#6b7280}.nav-inactive:hover{color:#9ca3af}
    .prod-row{border-bottom:1px solid #1e2130;transition:background 0.1s}.prod-row:hover{background:#1e2130}
    .input-field{background:#252836;border:1px solid #3b3f52;border-radius:8px;color:#e8e8e8;font-family:inherit;font-size:14px;padding:10px 14px;width:100%;transition:border 0.15s}.input-field:focus{border-color:#6366f1;outline:none}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:50;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
    .modal{background:#1a1d27;border:1px solid #2a2d3e;border-radius:16px;padding:26px;width:380px;max-width:95vw}
    .pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    .spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .sort-btn{background:#1a1d27;border:1px solid #2a2d3e;color:#9ca3af;border-radius:8px;padding:6px 11px;font-size:11px;cursor:pointer;font-family:inherit;transition:all 0.15s}.sort-btn:hover{border-color:#6366f1;color:#fff}
    .sort-active{background:#252836;border-color:#6366f1!important;color:#fff!important}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);border-radius:10px;padding:12px 22px;font-size:13px;font-family:'DM Mono',monospace;z-index:100;animation:fadeup 0.3s ease;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
    @keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    .edit-btn{background:none;border:1px solid transparent;border-radius:5px;color:#3b3f52;padding:3px 6px;font-size:11px;cursor:pointer;transition:all 0.15s}.edit-btn:hover{border-color:#6366f1;color:#a5b4fc}
    @media(max-width:640px){.hide-mobile{display:none!important}.stat-grid{grid-template-columns:1fr 1fr!important}}
  `;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0f1117", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <style>{css}</style>
      <div className="spin" style={{ width:40, height:40, border:"3px solid #2a2d3e", borderTop:"3px solid #6366f1", borderRadius:"50%" }} />
      <div style={{ color:"#6b7280", fontFamily:"'DM Mono',monospace", fontSize:13 }}>Connecting to Firebase...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", color:"#e8e8e8", fontFamily:"'DM Mono','Courier New',monospace" }}>
      <style>{css}</style>
      {toast && <div className="toast" style={{ background:toast.color, color:"#fff" }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ background:"#13151f", borderBottom:"1px solid #1e2130", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"sticky", top:0, zIndex:40 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>📦</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:"#fff" }}>STOCKR</span>
          <span style={{ fontSize:9, background:"#052e16", color:"#4ade80", border:"1px solid #166534", borderRadius:4, padding:"2px 6px" }}>LIVE</span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          {[["dashboard","📊","Stock"],["log","📋","Log"],["report","📨","Report"],["add-product","➕","Add"]].map(([v,icon,label]) => (
            <button key={v} onClick={() => setView(v)} className={`nav-btn ${view===v?"nav-active":"nav-inactive"}`}>
              {icon} <span className="hide-mobile">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div style={{ padding:"16px", maxWidth:1100, margin:"0 auto" }}>

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <div>
            <div className="stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
              {[
                { label:"Products", val:products.length, icon:"📦", color:"#6366f1", click:null },
                { label:"IN Today", val:totalInToday, icon:"⬇️", color:"#22c55e", click:null },
                { label:"OUT Today", val:totalOutToday, icon:"⬆️", color:"#f59e0b", click:null },
                { label:"Low Stock →", val:lowStockItems.length, icon:"⚠️", color:"#ef4444",
                  click:() => { setLowStockFilter(true); setSortBy("low"); showToast(`Showing ${lowStockItems.length} low stock items`, "#f59e0b"); }
                },
              ].map(s => (
                <div key={s.label} className="card" onClick={s.click || undefined}
                  style={{ padding:"14px 16px", cursor:s.click?"pointer":"default" }}
                  onMouseEnter={e => s.click && (e.currentTarget.style.borderColor="#ef4444")}
                  onMouseLeave={e => s.click && (e.currentTarget.style.borderColor="#2a2d3e")}>
                  <div style={{ fontSize:18, marginBottom:5 }}>{s.icon}</div>
                  <div style={{ fontSize:22, fontWeight:500, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.val}</div>
                  <div style={{ fontSize:10, color:"#6b7280", marginTop:2, letterSpacing:"0.08em", textTransform:"uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Low stock banner */}
            {lowStockItems.length > 0 && (
              <div style={{ background:"#2d1b00", border:"1px solid #92400e", borderRadius:10, padding:"11px 16px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span className="pulse">⚠️</span>
                  <span style={{ fontSize:13, color:"#fbbf24" }}><strong>{lowStockItems.length} items</strong> running low — reorder needed</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn" onClick={() => { setLowStockFilter(!lowStockFilter); setSortBy("low"); }}
                    style={{ background:lowStockFilter?"#92400e":"#1a1d27", color:"#fbbf24", border:"1px solid #92400e", borderRadius:8, padding:"6px 12px", fontSize:12 }}>
                    {lowStockFilter ? "Show All" : "View Low Stock"}
                  </button>
                  <button className="btn" onClick={sendLowStockAlert}
                    style={{ background:"#25d366", color:"#fff", border:"none", borderRadius:8, padding:"6px 12px", fontSize:12 }}>
                    📲 WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Search + Sort */}
            <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:160 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#6b7280" }}>🔍</span>
                <input className="input-field" style={{ paddingLeft:36 }} placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#6b7280" }}>Sort:</span>
                {[["name","A–Z"],["high","High → Low"],["low","Low → High"]].map(([val,label]) => (
                  <button key={val} onClick={() => { setSortBy(val); setLowStockFilter(false); }}
                    className={`sort-btn ${sortBy===val && !lowStockFilter?"sort-active":""}`}>{label}</button>
                ))}
                {lowStockFilter && (
                  <button onClick={() => setLowStockFilter(false)} className="sort-btn sort-active" style={{ borderColor:"#f59e0b!important", color:"#fbbf24!important" }}>
                    ⚠️ Low Only ✕
                  </button>
                )}
              </div>
            </div>

            {/* Product table */}
            <div className="card" style={{ overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 80px 140px", padding:"10px 16px", background:"#13151f", fontSize:10, letterSpacing:"0.1em", color:"#6b7280", textTransform:"uppercase" }}>
                <span>Product</span><span>Size</span><span>Stock</span><span className="hide-mobile">Status</span><span style={{ textAlign:"right" }}>Actions</span>
              </div>
              <div style={{ maxHeight:"58vh", overflowY:"auto" }}>
                {filtered.map(p => {
                  const qty = currentStock[p.id] || 0;
                  return (
                    <div key={p.id} className="prod-row" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 80px 140px", padding:"10px 16px", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:500, color:"#e8e8e8" }}>{p.name}</span>
                        <button className="edit-btn" onClick={() => openEditModal(p)} title="Edit name/variant">✏️</button>
                      </div>
                      <span style={{ fontSize:12, color:"#9ca3af" }}>{p.variant}</span>
                      <span style={{ fontSize:19, fontFamily:"'Syne',sans-serif", fontWeight:700, color:stockColor(qty) }}>{qty}</span>
                      <span className="hide-mobile">
                        {qty <= 0
                          ? <span style={{ fontSize:9, background:"#2d0c0c", color:"#f87171", border:"1px solid #7f1d1d", borderRadius:4, padding:"2px 7px" }}>EMPTY</span>
                          : qty <= 5
                            ? <span className="pulse" style={{ fontSize:9, background:"#2d1b00", color:"#fbbf24", border:"1px solid #92400e", borderRadius:4, padding:"2px 7px" }}>LOW</span>
                            : <span style={{ fontSize:9, background:"#052e16", color:"#4ade80", border:"1px solid #166534", borderRadius:4, padding:"2px 7px" }}>OK</span>}
                      </span>
                      <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                        <button className="btn" onClick={() => openModal("in", p.id)} style={{ background:"#052e16", color:"#4ade80", border:"1px solid #166534", borderRadius:6, padding:"5px 10px", fontSize:12 }}>IN</button>
                        <button className="btn" onClick={() => openModal("out", p.id)} style={{ background:"#2d0c0c", color:"#f87171", border:"1px solid #7f1d1d", borderRadius:6, padding:"5px 10px", fontSize:12 }}>OUT</button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>No products found</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── LOG ── */}
        {view === "log" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#fff" }}>Transaction Log</h2>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="date" className="input-field" style={{ width:150 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                {filterDate && <button className="btn" onClick={() => setFilterDate("")} style={{ color:"#6b7280", fontSize:12, background:"none", padding:"4px 8px", border:"1px solid #2a2d3e", borderRadius:6 }}>✕</button>}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
              {[
                { label:"All Time IN", val:`+${allTimeIn}`, color:"#22c55e" },
                { label:"All Time OUT", val:`-${allTimeOut}`, color:"#f87171" },
                { label:"Transactions", val:transactions.length, color:"#6366f1" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding:"14px 16px" }}>
                  <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 70px 70px 2fr 90px", padding:"10px 16px", background:"#13151f", fontSize:10, letterSpacing:"0.1em", color:"#6b7280", textTransform:"uppercase" }}>
                <span>Product</span><span>Size</span><span>Type</span><span>Qty</span><span className="hide-mobile">Note</span><span>Date</span>
              </div>
              <div style={{ maxHeight:"65vh", overflowY:"auto" }}>
                {filteredTx.length === 0 && <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>No transactions yet</div>}
                {filteredTx.map(t => {
                  const p = getProduct(t.productId);
                  return (
                    <div key={t.id} className="prod-row" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 70px 70px 2fr 90px", padding:"10px 16px", alignItems:"center" }}>
                      <span style={{ fontSize:13, color:"#e8e8e8" }}>{p?.name||"—"}</span>
                      <span style={{ fontSize:12, color:"#9ca3af" }}>{p?.variant||"—"}</span>
                      <span><span className={t.type==="in"?"tag-in":"tag-out"}>{t.type.toUpperCase()}</span></span>
                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:t.type==="in"?"#4ade80":"#f87171" }}>{t.type==="in"?"+":"-"}{t.qty}</span>
                      <span className="hide-mobile" style={{ fontSize:12, color:"#6b7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.note||"—"}</span>
                      <span style={{ fontSize:11, color:"#6b7280" }}>{t.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── REPORT ── */}
        {view === "report" && (() => {
          const rDate = filterDate || today();
          const rTx = transactions.filter(t => t.date === rDate);
          const rIn = rTx.filter(t => t.type === "in").reduce((s, t) => s + t.qty, 0);
          const rOut = rTx.filter(t => t.type === "out").reduce((s, t) => s + t.qty, 0);
          return (
            <div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#fff", marginBottom:14 }}>Daily Report</h2>

              <div className="card" style={{ padding:"18px 20px", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:7 }}>Report Date</label>
                    <input type="date" className="input-field" style={{ width:180 }} value={rDate} onChange={e => setFilterDate(e.target.value)} />
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <button className="btn" onClick={() => sendDailyReport(rDate)}
                      style={{ background:"#25d366", color:"#fff", border:"none", borderRadius:10, padding:"11px 18px", fontSize:13, fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
                      📲 Send Daily Report
                    </button>
                    <button className="btn" onClick={sendLowStockAlert}
                      style={{ background:"#2d1b00", color:"#fbbf24", border:"1px solid #92400e", borderRadius:10, padding:"11px 18px", fontSize:13, fontFamily:"inherit" }}>
                      ⚠️ Send Low Stock Alert
                    </button>
                  </div>
                </div>
                <div style={{ marginTop:12, fontSize:11, color:"#6b7280" }}>
                  📱 Opens WhatsApp to <strong style={{ color:"#9ca3af" }}>+91 89683 42222</strong> — tap Send to deliver
                </div>
              </div>

              {/* Stats for selected date */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
                {[
                  { label:`IN on ${rDate}`, val:rIn, color:"#22c55e" },
                  { label:`OUT on ${rDate}`, val:rOut, color:"#f87171" },
                  { label:"Low Stock Now", val:lowStockItems.length, color:"#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Low stock list */}
              {lowStockItems.length > 0 && (
                <div className="card" style={{ padding:"16px 20px", marginBottom:14 }}>
                  <div style={{ fontSize:11, color:"#f59e0b", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>⚠️ Low Stock Items</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {lowStockItems.map(p => {
                      const qty = currentStock[p.id] || 0;
                      return (
                        <div key={p.id} style={{ display:"flex", justifyContent:"space-between", background:"#13151f", borderRadius:8, padding:"9px 14px", alignItems:"center" }}>
                          <span style={{ fontSize:13 }}>{p.name} <span style={{ color:"#6b7280" }}>{p.variant}</span></span>
                          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:stockColor(qty), fontSize:18 }}>{qty}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day movements */}
              <div className="card" style={{ overflow:"hidden" }}>
                <div style={{ padding:"11px 16px", background:"#13151f", fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Movements on {rDate} ({rTx.length})
                </div>
                <div style={{ maxHeight:"35vh", overflowY:"auto" }}>
                  {rTx.length === 0
                    ? <div style={{ padding:30, textAlign:"center", color:"#6b7280" }}>No movements on this date</div>
                    : rTx.map(t => {
                        const p = getProduct(t.productId);
                        return (
                          <div key={t.id} className="prod-row" style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", alignItems:"center" }}>
                            <span style={{ fontSize:13 }}>{p?.name} <span style={{ color:"#6b7280" }}>{p?.variant}</span></span>
                            <span><span className={t.type==="in"?"tag-in":"tag-out"}>{t.type==="in"?"+":"-"}{t.qty}</span></span>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── ADD PRODUCT ── */}
        {view === "add-product" && (
          <div style={{ maxWidth:460 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#fff", marginBottom:18 }}>Add New Product</h2>
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[
                  { label:"Product Name *", placeholder:"e.g. WR4500", key:"name" },
                  { label:"Variant / Size", placeholder:"e.g. 20L, 5Kg", key:"variant" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>{f.label}</label>
                    <input className="input-field" placeholder={f.placeholder} value={newProd[f.key]} onChange={e => setNewProd(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Opening Stock</label>
                  <input className="input-field" type="number" placeholder="0" value={newProd.opening} onChange={e => setNewProd(p => ({ ...p, opening: e.target.value }))} />
                </div>
                <button className="btn" onClick={addProduct} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", borderRadius:10, padding:13, fontSize:14, fontFamily:"inherit", marginTop:4 }}>
                  Add Product →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {modal.type === "edit" && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:"#1e2130", border:"1px solid #3b3f52", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✏️</div>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#fff" }}>Edit Product</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>Rename or change variant</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                  <div>
                    <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Product Name</label>
                    <input className="input-field" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Variant / Size</label>
                    <input className="input-field" value={editForm.variant} onChange={e => setEditForm(f => ({ ...f, variant: e.target.value }))} />
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:4 }}>
                    <button className="btn" onClick={() => setModal(null)} style={{ flex:1, background:"#252836", color:"#9ca3af", borderRadius:10, padding:12, fontFamily:"inherit", fontSize:14 }}>Cancel</button>
                    <button className="btn" onClick={submitEdit} style={{ flex:2, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", borderRadius:10, padding:12, fontFamily:"inherit", fontSize:14 }}>Save →</button>
                  </div>
                </div>
              </>
            )}

            {(modal.type === "in" || modal.type === "out") && (() => {
              const p = getProduct(modal.productId);
              const isIn = modal.type === "in";
              const qty = currentStock[modal.productId] || 0;
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:isIn?"#052e16":"#2d0c0c", border:`1px solid ${isIn?"#166534":"#7f1d1d"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                      {isIn?"⬇️":"⬆️"}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#fff" }}>Stock {isIn?"IN":"OUT"}</div>
                      <div style={{ fontSize:12, color:"#6b7280" }}>{p?.name} · {p?.variant}</div>
                    </div>
                  </div>
                  <div style={{ background:"#13151f", borderRadius:8, padding:"10px 16px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"#6b7280" }}>Current stock</span>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:stockColor(qty) }}>{qty}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                    <div>
                      <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Quantity *</label>
                      <input className="input-field" type="number" min="1" placeholder="Enter quantity" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} autoFocus />
                    </div>
                    <div>
                      <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Date</label>
                      <input className="input-field" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", display:"block", marginBottom:7 }}>Note (optional)</label>
                      <input className="input-field" placeholder="e.g. delivery from supplier" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:4 }}>
                      <button className="btn" onClick={() => setModal(null)} style={{ flex:1, background:"#252836", color:"#9ca3af", borderRadius:10, padding:12, fontFamily:"inherit", fontSize:14 }}>Cancel</button>
                      <button className="btn" onClick={submitTx} style={{ flex:2, background:isIn?"linear-gradient(135deg,#166534,#15803d)":"linear-gradient(135deg,#7f1d1d,#991b1b)", color:"#fff", borderRadius:10, padding:12, fontFamily:"inherit", fontSize:14 }}>
                        Confirm {isIn?"IN":"OUT"} →
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
