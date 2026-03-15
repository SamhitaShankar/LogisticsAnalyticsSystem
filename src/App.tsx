import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ComposedChart, Line, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  cream:        "#FDFBF7",
  forest:       "#2F4F4F",
  sage:         "#8E9775",
  forestLight:  "#3d6363",
  forestDark:   "#1e3535",
  sageLight:    "#b3bf9e",
  sageDark:     "#6b7258",
  parchment:    "#F5F0E8",
  parchmentDark:"#EDE6D6",
  ink:          "#1C2B2B",
  muted:        "#7a8a7a",
  white:        "#ffffff",
  red:          "#C0392B",
  redBg:        "#FDF2F0",
  amber:        "#B7860B",
  amberBg:      "#FBF7E9",
  green:        "#2F6B4A",
  greenBg:      "#EDF7F2",
  blue:         "#2E5B8A",
  blueBg:       "#EEF4FC",
} as const;

const F = {
  lora:      "'Lora', Georgia, serif",
  quicksand: "'Quicksand', sans-serif",
  syne:      "'Syne', sans-serif",
} as const;

// ─── API CONFIG ───────────────────────────────────────────────────────────────
const API_BASE_URL = "https://lavsam0104--supply-chain-ml-api-fastapi-app.modal.run";

async function callAPI<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  });
  const url = `${API_BASE_URL}${endpoint}${Object.keys(params).length ? "?" + qs.toString() : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as {detail?: string};
    throw new Error(errBody.detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── VALID DROPDOWN VALUES ────────────────────────────────────────────────────
const ALL_CITIES = ["Mumbai","Delhi","Chennai","Kolkata","Bangalore","Ahmedabad","Hyderabad","Jaipur","Lucknow","Pune"] as const;
type City = typeof ALL_CITIES[number];

const VALID_PRODUCTS    = ["PROD_001","PROD_002","PROD_003"] as const;
const VALID_VEHICLES    = ["Bike","Train","Truck","Van"] as const;
const VALID_WEATHER     = ["Clear","Fog","Rain","Storm"] as const;
const VALID_TRAFFIC     = ["Low","Medium","High"] as const;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type UserRole = "admin"|"port_authority"|"warehouse_manager"|"driver"|"analytics_officer";
type Screen   = "login"|"register"|"app";
type PageId   = "dashboard"|"shipments"|"inventory"|"analytics"|"lastmile"|"alerts"|"admin";
type ShipmentStatus = "delayed"|"in_transit"|"at_port"|"delivered"|"pending";
type Priority = "critical"|"high"|"medium"|"low";
type UserStatus = "active"|"inactive"|"pending";

interface User { name:string; email:string; role:UserRole; }
interface RoleMeta { id:string; label:string; icon:string; desc:string; }

interface Shipment { id:string; from:string; to:string; status:ShipmentStatus; driver:string; weight:string; cargo:string; eta:string; priority:Priority; }
interface InventoryItem { id:string; sku:string; name:string; warehouse:string; qty:number; min:number; max:number; unit:string; category:string; productId:string; }
interface AdminUser { id:string; name:string; email:string; role:UserRole; company:string; status:UserStatus; lastLogin:string; av:string; }
interface AuditEntry { id:number; user:string; action:string; time:string; type:string; icon:string; }
interface ServiceHealth { label:string; status:"online"|"warning"; uptime:string; ping:string; }
interface AlertItem { id:number; msg:string; time:string; dot:string; }
interface QuickAction { label:string; icon:string; page:PageId; }
interface ChartTooltipProps { active?:boolean; payload?:{name:string;value:number;color:string}[]; label?:string; }

// API Response Types
interface ForecastSummary { total_demand?:number; total_predicted_demand?:number; average_daily_demand?:number; }
interface ForecastPoint { predicted_demand?:number; upper_bound?:number; lower_bound?:number; date?:string; yhat?:number; yhat_upper?:number; yhat_lower?:number; demand?:number; }
interface ForecastResponse { forecast?:ForecastPoint[]; }

interface DelayPrediction {
  delay_probability?:number;   // already 0–100 (e.g. 41.54)
  risk_level?:string;
  recommendation?:string;
  will_be_delayed?:boolean;
  distance_km?:number;
}
interface CostPrediction {
  predicted_cost_inr?:number;
  distance_km?:number;
  cost_breakdown?:Record<string,number>;  // actual field name from API
  cost_category?:string;
}
interface PreDispatchResult { delay:DelayPrediction; cost:CostPrediction; }

interface RouteLeg {
  from?:string; to?:string;
  distance_km?:number;
  fuel_cost_inr?:number;   // actual field name from API
  path?:string[];
}
interface RouteResult {
  optimized_route?:string[]|string;
  route_details?:RouteLeg[];           // actual field name from API
  total_distance_km?:number;
  total_fuel_cost_inr?:number;         // actual field name from API
  estimated_time?:string;              // actual field: string "41h 5m"
  fuel_cost_per_km?:number;
}
interface ReorderResponse {
  reorder_now?:boolean;                // actual field name from API
  reorder_needed?:boolean;             // kept as fallback
  recommended_order_qty?:number;
  days_until_stockout?:number;
  days_until_reorder?:number;
  urgency?:string;                     // "Critical" / "High" etc (capitalized)
  reorder_date?:string;
  stockout_date?:string;
  reason?:string;
  reorder_point?:number;
  safety_stock?:number;
  effective_daily_demand?:number;
}
interface AnomalyShipmentResponse {
  is_anomaly?:boolean; severity?:string; anomaly_score?:number;
  alerts?:string[]; recommendation?:string;
  expected_cost?:number; actual_cost?:number; cost_deviation_pct?:number;
  expected_duration_hrs?:number; actual_duration_hrs?:number; time_deviation_pct?:number;
  distance_km?:number;
}
interface AnomalyInventoryResponse {
  is_anomaly?:boolean; severity?:string; anomaly_score?:number;
  alerts?:string[]; recommendation?:string;
  stock_difference?:number; loss_percentage?:number;
  expected_stock?:number; actual_stock?:number;
}
interface AnomalyRouteResponse {
  is_anomaly?:boolean; severity?:string; anomaly_score?:number;
  alerts?:string[]; recommendation?:string;
  expected_distance_km?:number; actual_distance_km?:number; distance_deviation_pct?:number;
  expected_cost_inr?:number; actual_cost_inr?:number; cost_deviation_pct?:number;
}
// Union for backward compat in ResultBanner
type AnomalyResponse = AnomalyShipmentResponse & AnomalyInventoryResponse & AnomalyRouteResponse & { flags?:string[]; message?:string; risk_level?:string; };

// ─── FONT LOADER ──────────────────────────────────────────────────────────────
function useFonts(): void {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Quicksand:wght@400;500;600;700&family=Syne:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      body { background: ${C.cream}; margin: 0; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: ${C.parchment}; }
      ::-webkit-scrollbar-thumb { background: ${C.sageLight}; border-radius: 3px; }
      input::placeholder { color: ${C.sageLight}; }
      select option { font-family: ${F.quicksand}; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    `;
    document.head.appendChild(style);
  }, []);
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
interface TagProps { children:React.ReactNode; color?:string; bg?:string; }
function Tag({ children, color=C.sage, bg }: TagProps): React.ReactElement {
  return <span style={{ fontFamily:F.syne, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color, background:bg??`${color}18`, padding:"3px 10px", borderRadius:3, display:"inline-block" }}>{children}</span>;
}

interface BtnProps { children:React.ReactNode; onClick?:()=>void; variant?:"primary"|"outline"|"ghost"|"danger"; style?:React.CSSProperties; disabled?:boolean; }
function Btn({ children, onClick, variant="primary", style:sx={}, disabled }: BtnProps): React.ReactElement {
  const base:React.CSSProperties = { fontFamily:F.quicksand, fontWeight:700, cursor:disabled?"not-allowed":"pointer", borderRadius:8, padding:"10px 20px", fontSize:13.5, display:"inline-flex", alignItems:"center", gap:6, transition:"all .18s", opacity:disabled?.5:1 };
  const variants:Record<string,React.CSSProperties> = {
    primary: { background:C.forest, color:C.cream, border:"none", boxShadow:`0 2px 8px ${C.forest}40` },
    outline: { background:"transparent", color:C.forest, border:`1.5px solid ${C.parchmentDark}` },
    ghost:   { background:"transparent", color:C.sage, border:"none" },
    danger:  { background:C.redBg, color:C.red, border:`1px solid ${C.red}30` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sx }}>{children}</button>;
}

interface CardProps { children:React.ReactNode; style?:React.CSSProperties; onClick?:()=>void; }
function Card({ children, style:sx={}, onClick }: CardProps): React.ReactElement {
  return <div onClick={onClick} style={{ background:C.white, border:`1px solid ${C.parchmentDark}`, borderRadius:12, padding:"20px 22px", ...sx }}>{children}</div>;
}

interface StatusBadgeProps { status:ShipmentStatus|UserStatus; }
function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const map:Record<string,{label:string;color:string;bg:string}> = {
    delayed:    {label:"Delayed",    color:C.red,   bg:C.redBg   },
    in_transit: {label:"In Transit", color:C.blue,  bg:C.blueBg  },
    at_port:    {label:"At Port",    color:C.amber, bg:C.amberBg },
    delivered:  {label:"Delivered",  color:C.green, bg:C.greenBg },
    pending:    {label:"Pending",    color:C.muted, bg:C.parchment},
    active:     {label:"Active",     color:C.green, bg:C.greenBg  },
    inactive:   {label:"Inactive",   color:C.muted, bg:C.parchment},
  };
  const m = map[status]??map.pending;
  return <Tag color={m.color} bg={m.bg}>{m.label}</Tag>;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps): React.ReactElement|null {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:C.white, border:`1px solid ${C.parchmentDark}`, borderRadius:8, padding:"10px 14px", boxShadow:`0 4px 20px ${C.forest}18`, fontFamily:F.quicksand }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6, fontFamily:F.syne }}>{label}</div>
      {payload.map(p=><div key={p.name} style={{ fontSize:13, color:p.color, fontWeight:600 }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}</div>)}
    </div>
  );
}

interface SpinnerProps { label?:string; small?:boolean; }
function Spinner({ label="Loading...", small=false }: SpinnerProps): React.ReactElement {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setSlow(true),5000); return ()=>clearTimeout(t); }, []);
  const sz = small ? 18 : 28;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:small?"8px":"24px" }}>
      <div style={{ width:sz, height:sz, border:`3px solid ${C.parchmentDark}`, borderTopColor:C.sage, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      {!small && <div style={{ fontFamily:F.quicksand, fontSize:13, color:C.muted }}>{label}</div>}
      {!small && slow && <div style={{ fontFamily:F.quicksand, fontSize:12, color:C.amber, background:C.amberBg, border:`1px solid ${C.amber}30`, borderRadius:8, padding:"7px 12px", textAlign:"center", maxWidth:280 }}>⏳ Server warming up (first request ~15–30s). Please wait…</div>}
    </div>
  );
}

function ErrBox({ msg, onRetry }: { msg:string; onRetry?:()=>void }): React.ReactElement {
  return (
    <div style={{ background:C.redBg, border:`1px solid ${C.red}30`, borderRadius:10, padding:"12px 16px", fontFamily:F.quicksand, fontSize:13, color:C.red, display:"flex", alignItems:"center", gap:10 }}>
      <span>⚠ {msg}</span>
      {onRetry && <button onClick={onRetry} style={{ marginLeft:"auto", fontFamily:F.quicksand, fontSize:12, fontWeight:700, color:C.red, background:"transparent", border:`1px solid ${C.red}40`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Retry</button>}
    </div>
  );
}

// ─── FORM FIELD HELPERS ───────────────────────────────────────────────────────
const inpBase: React.CSSProperties = {
  padding:"9px 12px", border:`1.5px solid ${C.parchmentDark}`, borderRadius:9,
  fontSize:13, outline:"none", fontFamily:F.quicksand, color:C.ink,
  background:C.white, width:"100%", boxSizing:"border-box"
};
const smallInp: React.CSSProperties = { ...inpBase, padding:"7px 10px", fontSize:12 };
const selBase: React.CSSProperties = { ...inpBase, cursor:"pointer" };

function LabeledField({ label, children }: { label:string; children:React.ReactNode }): React.ReactElement {
  return (
    <div>
      <label style={{ fontFamily:F.syne, fontSize:9, fontWeight:700, color:C.muted, display:"block", marginBottom:5, letterSpacing:1 }}>{label}</label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement> & { style?: React.CSSProperties }): React.ReactElement {
  return (
    <input {...props} style={{ ...inpBase, ...props.style }}
      onFocus={e=>(e.target.style.borderColor=C.sage)}
      onBlur={e=>(e.target.style.borderColor=C.parchmentDark)}
    />
  );
}

function FocusSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { style?: React.CSSProperties }): React.ReactElement {
  return (
    <select {...props} style={{ ...selBase, ...props.style }}
      onFocus={e=>(e.target.style.borderColor=C.sage)}
      onBlur={e=>(e.target.style.borderColor=C.parchmentDark)}
    />
  );
}

// ─── SHARED DATA ──────────────────────────────────────────────────────────────
const ROLES: RoleMeta[] = [
  { id:"port_authority",    label:"Port Authority",    icon:"⚓", desc:"Mumbai / Chennai Port" },
  { id:"warehouse_manager", label:"Warehouse Manager", icon:"🏭", desc:"Stock & Storage" },
  { id:"driver",            label:"Driver / Logistics",icon:"🚛", desc:"Last-Mile Delivery" },
  { id:"analytics_officer", label:"Analytics Officer", icon:"📊", desc:"Reports & KPIs" },
  { id:"admin",             label:"System Admin",      icon:"🛠", desc:"Full Access" },
];

const NAV_ITEMS: {id:PageId;icon:string;label:string;badge?:number}[] = [
  { id:"dashboard", icon:"⌂",  label:"Dashboard" },
  { id:"shipments", icon:"⊳",  label:"Shipments" },
  { id:"inventory", icon:"▦",  label:"Inventory" },
  { id:"analytics", icon:"≋",  label:"Analytics" },
  { id:"lastmile",  icon:"◉",  label:"Last Mile" },
  { id:"alerts",    icon:"⌁",  label:"Anomaly Monitor", badge:3 },
  { id:"admin",     icon:"⚙",  label:"Admin" },
];

// ─── ROUTE MAP ────────────────────────────────────────────────────────────────
interface MapNode { x:number; y:number; l:string; anchor:"start"|"end"|"middle"; dy?:number; }
function RouteMap(): React.ReactElement {
  const N: MapNode[] = [
    {x:42, y:14, l:"Delhi",     anchor:"middle", dy:-4},
    {x:16, y:30, l:"Jaipur",    anchor:"end",    dy:0 },
    {x:76, y:22, l:"Lucknow",   anchor:"start",  dy:0 },
    {x:88, y:37, l:"Kolkata",   anchor:"start",  dy:0 },
    {x:12, y:46, l:"Ahmedabad", anchor:"end",    dy:0 },
    {x:16, y:62, l:"Mumbai",    anchor:"end",    dy:0 },
    {x:26, y:67, l:"Pune",      anchor:"end",    dy:0 },
    {x:50, y:68, l:"Hyderabad", anchor:"middle", dy:-4},
    {x:34, y:84, l:"Bangalore", anchor:"middle", dy:5 },
    {x:66, y:81, l:"Chennai",   anchor:"middle", dy:5 },
  ];
  const E: [number,number][] = [
    [0,1],[0,2],[0,4],[1,4],[2,3],[3,9],[4,5],[5,6],[5,7],[6,7],[6,8],[7,8],[7,9],[8,9]
  ];
  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:C.parchment, borderRadius:12, overflow:"hidden", border:`1px solid ${C.parchmentDark}`, display:"flex", flexDirection:"column" }}>
      {/* Header row — completely outside the SVG so no overlap */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px 4px", flexShrink:0 }}>
        <div style={{ fontFamily:F.syne, fontSize:8.5, fontWeight:700, color:C.forest, letterSpacing:1.4 }}>LIVE ROUTE MAP — PAN INDIA</div>
        <div style={{ display:"flex", gap:10, fontFamily:F.quicksand, fontSize:10, color:C.muted }}>
          <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.red, display:"inline-block" }}/>Delayed</span>
          <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }}/>On Route</span>
        </div>
      </div>
      {/* SVG map fills remaining space */}
      <div style={{ flex:1, position:"relative", minHeight:0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ position:"absolute", inset:0 }}>
          {[20,40,60,80].map(v=><g key={v}>
            <line x1={v} y1="5" x2={v} y2="95" stroke={C.parchmentDark} strokeWidth=".3" opacity=".6"/>
            <line x1="5" y1={v} x2="95" y2={v} stroke={C.parchmentDark} strokeWidth=".3" opacity=".6"/>
          </g>)}
          {E.map(([a,b],i)=><line key={i} x1={N[a].x} y1={N[a].y} x2={N[b].x} y2={N[b].y} stroke={C.sage} strokeWidth="1" strokeDasharray="2.5,2" opacity=".55"/>)}
          <circle r="1.6" fill={C.red} opacity=".9"><animateMotion dur="4.5s" repeatCount="indefinite" path={`M${N[2].x},${N[2].y} L${N[3].x},${N[3].y}`}/></circle>
          <circle r="1.6" fill={C.green} opacity=".9"><animateMotion dur="6s" repeatCount="indefinite" path={`M${N[0].x},${N[0].y} L${N[5].x},${N[5].y}`}/></circle>
          <circle r="1.6" fill={C.green} opacity=".8"><animateMotion dur="7.5s" repeatCount="indefinite" path={`M${N[4].x},${N[4].y} L${N[8].x},${N[8].y}`}/></circle>
          {N.map((n,i)=>{
            const lx = n.anchor==="start" ? n.x+3.5 : n.anchor==="end" ? n.x-3.5 : n.x;
            const ly = n.dy ? n.y + n.dy : (n.anchor==="middle" ? n.y-3 : n.y+0.5);
            return (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r="2.8" fill={C.forest} stroke={C.cream} strokeWidth=".9"/>
                <circle cx={n.x} cy={n.y} r="1.1" fill={C.sageLight} opacity=".9"/>
                <text x={lx} y={ly} fontSize="3.8" fill={C.forest} fontFamily="sans-serif" fontWeight="600" textAnchor={n.anchor}>{n.l}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
interface LoginPageProps { onSwitch:()=>void; onLogin:(u:User)=>void; }
function LoginPage({ onSwitch, onLogin }: LoginPageProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const handleLogin = () => { if (!email||!pass){setErr("Please fill in all fields.");return;} onLogin({name:"Admin User",email,role:"admin"}); };
  const fieldInp:React.CSSProperties = { width:"100%", padding:"12px 14px", border:`1.5px solid ${C.parchmentDark}`, borderRadius:8, fontSize:14, outline:"none", background:C.white, boxSizing:"border-box", fontFamily:F.quicksand, color:C.ink };
  return (
    <div style={{ display:"flex", height:"100vh", background:C.cream }}>
      <div style={{ width:"42%", background:C.forest, position:"relative", display:"flex", flexDirection:"column", justifyContent:"center", padding:"64px 56px", overflow:"hidden" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.06 }}><defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,16 58,44 30,58 2,44 2,16" fill="none" stroke={C.cream} strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#hex)"/></svg>
        <div style={{ position:"absolute", right:-80, top:-80, width:340, height:340, borderRadius:"50%", border:`60px solid ${C.sage}18` }}/>
        <div style={{ position:"absolute", left:-40, bottom:-60, width:240, height:240, borderRadius:"50%", border:`40px solid ${C.sage}12` }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:56 }}>
            <div style={{ width:40, height:40, borderRadius:9, background:C.sage, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>⛓</div>
            <div><div style={{ fontFamily:F.lora, color:C.cream, fontWeight:700, fontSize:15 }}>Supply Chain System</div><div style={{ fontFamily:F.syne, color:C.sage, fontSize:9, letterSpacing:2 }}>PAN INDIA</div></div>
          </div>
          <div style={{ fontFamily:F.lora, color:C.cream, fontSize:40, fontWeight:700, lineHeight:1.15, marginBottom:20, fontStyle:"italic" }}>Track Every<br/>Mile. Every<br/>Shipment.</div>
          <div style={{ fontFamily:F.quicksand, color:`${C.cream}90`, fontSize:14.5, lineHeight:1.75, maxWidth:300 }}>Real-time visibility across Mumbai Port, Chennai Port, and India's entire logistics network.</div>
          <div style={{ marginTop:52, display:"flex", flexDirection:"column", gap:18 }}>
            {([["⚓","Port Intelligence","Live port entry, exit & turnaround"],["📦","Smart Inventory","AI-driven stock forecasting"],["🛣","Route Optimizer","48-hour delay prediction"]] as [string,string,string][]).map(([ic,t,d])=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${C.sage}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:`1px solid ${C.sage}40` }}>{ic}</div>
                <div><div style={{ fontFamily:F.quicksand, color:C.cream, fontWeight:700, fontSize:13 }}>{t}</div><div style={{ fontFamily:F.quicksand, color:`${C.cream}70`, fontSize:12 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontFamily:F.lora, fontSize:30, fontWeight:700, color:C.forest, marginBottom:8 }}>Welcome back</div>
            <div style={{ fontFamily:F.quicksand, color:C.muted, fontSize:14 }}>Sign in to continue to the dashboard</div>
          </div>
          {err && <div style={{ background:C.redBg, border:`1px solid ${C.red}30`, color:C.red, borderRadius:8, padding:"10px 14px", fontFamily:F.quicksand, fontSize:13, marginBottom:18 }}>{err}</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {([["EMAIL ADDRESS","email",email,setEmail,"you@company.com"],["PASSWORD","password",pass,setPass,"••••••••"]] as [string,string,string,React.Dispatch<React.SetStateAction<string>>,string][]).map(([lbl,type,val,set,ph])=>(
              <div key={lbl}>
                <label style={{ fontFamily:F.syne, fontSize:10, fontWeight:700, color:C.forest, display:"block", marginBottom:7, letterSpacing:1 }}>{lbl}</label>
                <input value={val} onChange={e=>set(e.target.value)} type={type} placeholder={ph} style={fieldInp} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/>
              </div>
            ))}
            <button onClick={handleLogin} style={{ width:"100%", padding:"14px", background:C.forest, color:C.cream, border:"none", borderRadius:9, fontFamily:F.quicksand, fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 20px ${C.forest}40` }}>Sign In →</button>
          </div>
          <div style={{ textAlign:"center", marginTop:28, fontFamily:F.quicksand, fontSize:13, color:C.muted }}>No account? <span onClick={onSwitch} style={{ color:C.sage, fontWeight:700, cursor:"pointer" }}>Create one</span></div>
          <div style={{ marginTop:28, padding:"15px 18px", background:C.parchment, borderRadius:12, border:`1px solid ${C.parchmentDark}` }}>
            <div style={{ fontFamily:F.syne, fontSize:9.5, fontWeight:700, color:C.forest, marginBottom:6, letterSpacing:1 }}>DEMO CREDENTIALS</div>
            <div style={{ fontFamily:F.quicksand, fontSize:13, color:C.ink }}>Email: <b>admin@scs.in</b> &nbsp;·&nbsp; Password: <b>demo123</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
interface RegisterPageProps { onSwitch:()=>void; onLogin:(u:User)=>void; }
function RegisterPage({ onSwitch, onLogin }: RegisterPageProps): React.ReactElement {
  const [step,setStep]=useState<1|2|3>(1);
  const [role,setRole]=useState<UserRole|"">("");
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const fieldInp:React.CSSProperties={width:"100%",padding:"11px 14px",border:`1.5px solid ${C.parchmentDark}`,borderRadius:9,fontSize:13.5,outline:"none",background:C.white,boxSizing:"border-box",fontFamily:F.quicksand,color:C.ink};
  return (
    <div style={{display:"flex",height:"100vh",background:C.cream}}>
      <div style={{width:"38%",background:C.forestDark,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"52px 48px",overflow:"hidden",position:"relative"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.04}}><defs><pattern id="grd" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0L0 0 0 30" fill="none" stroke={C.cream} strokeWidth=".8"/></pattern></defs><rect width="100%" height="100%" fill="url(#grd)"/></svg>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:60}}><span style={{fontSize:22}}>⛓</span><div style={{fontFamily:F.lora,color:C.cream,fontWeight:700,fontSize:15}}>Supply Chain System</div></div>
          <div style={{fontFamily:F.lora,color:C.cream,fontSize:28,fontWeight:700,lineHeight:1.2,marginBottom:14,fontStyle:"italic"}}>Join India's<br/>Logistics Network</div>
          <div style={{fontFamily:F.quicksand,color:`${C.cream}70`,fontSize:13.5,lineHeight:1.75}}>Get access to real-time tracking, inventory analytics, and intelligent route alerts.</div>
        </div>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.sage,letterSpacing:2,marginBottom:18}}>YOUR PROGRESS</div>
          {(["Select Your Role","Your Details","Set Password"] as const).map((l,i)=>{const n=i+1;const done=step>n;const on=step===n;return(
            <div key={l} style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:done?C.sage:on?`${C.sage}30`:`${C.cream}10`,border:on?`2px solid ${C.sage}`:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.syne,fontSize:11,fontWeight:700,color:done?C.cream:on?C.sageLight:`${C.cream}35`}}>{done?"✓":String(n).padStart(2,"0")}</div>
              <span style={{fontFamily:F.quicksand,color:on?C.cream:`${C.cream}45`,fontSize:13,fontWeight:on?700:400}}>{l}</span>
            </div>
          );})}
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:52}}>
        <div style={{width:"100%",maxWidth:480}}>
          {step===1&&<>
            <div style={{marginBottom:34}}><div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest,marginBottom:8}}>What's your role?</div><div style={{fontFamily:F.quicksand,color:C.muted,fontSize:14}}>Select the role that best describes you</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>
              {ROLES.map(r=><div key={r.id} onClick={()=>setRole(r.id as UserRole)} style={{padding:"18px 16px",border:role===r.id?`2px solid ${C.sage}`:`1.5px solid ${C.parchmentDark}`,borderRadius:12,cursor:"pointer",background:role===r.id?`${C.sage}12`:C.white,transition:"all .2s"}}><div style={{fontSize:24,marginBottom:9}}>{r.icon}</div><div style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:C.forest}}>{r.label}</div><div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,marginTop:2}}>{r.desc}</div></div>)}
            </div>
            <Btn onClick={()=>role&&setStep(2)} disabled={!role} style={{width:"100%",justifyContent:"center"}}>Continue →</Btn>
          </>}
          {step===2&&<>
            <div style={{marginBottom:34}}><div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest,marginBottom:8}}>Your Details</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
              {([["FULL NAME","text",name,setName],["EMAIL","email",email,setEmail]] as [string,string,string,React.Dispatch<React.SetStateAction<string>>][]).map(([lbl,type,val,set])=>(
                <div key={lbl}><label style={{fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.forest,display:"block",marginBottom:6,letterSpacing:1}}>{lbl}</label><input value={val} onChange={e=>set(e.target.value)} type={type} style={fieldInp} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/></div>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}><Btn variant="outline" onClick={()=>setStep(1)} style={{flex:1,justifyContent:"center"}}>← Back</Btn><Btn onClick={()=>name&&email&&setStep(3)} disabled={!name||!email} style={{flex:2,justifyContent:"center"}}>Continue →</Btn></div>
          </>}
          {step===3&&<>
            <div style={{marginBottom:34}}><div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest,marginBottom:8}}>Set Password</div></div>
            <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
              <div>
                <label style={{fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.forest,display:"block",marginBottom:6,letterSpacing:1}}>PASSWORD</label>
                <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="Min 8 characters" style={fieldInp} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}><Btn variant="outline" onClick={()=>setStep(2)} style={{flex:1,justifyContent:"center"}}>← Back</Btn><Btn onClick={()=>onLogin({name,email,role:role as UserRole})} style={{flex:2,justifyContent:"center"}}>Create Account ✓</Btn></div>
          </>}
          <div style={{textAlign:"center",marginTop:28,fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Already have an account? <span onClick={onSwitch} style={{color:C.sage,fontWeight:700,cursor:"pointer"}}>Sign in</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
const DASH_ALERTS: AlertItem[] = [
  {id:1,msg:"Shipment #SHP-4821 delayed — Mumbai to Delhi corridor",time:"2 min ago",dot:C.red},
  {id:2,msg:"Inventory LOW: Steel Rods (Warehouse A – Chennai)",    time:"11 min ago",dot:C.amber},
  {id:3,msg:"Driver Ramesh checked in at Mumbai Port",              time:"24 min ago",dot:C.blue},
  {id:4,msg:"Shipment #SHP-4802 delivered to Bangalore Hub",        time:"1 hr ago",  dot:C.green},
];
const QUICK_ACTIONS: QuickAction[] = [
  {label:"New Shipment",    icon:"➕",page:"shipments"},
  {label:"Forecast Demand", icon:"📈",page:"analytics"},
  {label:"Update Stock",    icon:"📦",page:"inventory"},
  {label:"Optimize Route",  icon:"🗺",page:"lastmile"},
  {label:"Assign Driver",   icon:"🚛",page:"shipments"},
  {label:"Check Anomalies", icon:"🔍",page:"alerts"},
];
const DASH_SHIPS: Shipment[] = [
  {id:"SHP-4821",from:"Mumbai Port",to:"Delhi Hub",status:"delayed",   driver:"Ramesh K.", weight:"4.2T",cargo:"Steel Rods",  eta:"2h 30m",priority:"critical"},
  {id:"SHP-4822",from:"Chennai Port",to:"Hyderabad",status:"in_transit",driver:"Suresh M.", weight:"2.1T",cargo:"Electronics",eta:"4h 10m",priority:"high"},
  {id:"SHP-4823",from:"Warehouse A",to:"Pune Depot",status:"at_port",  driver:"Vijay R.",  weight:"6.8T",cargo:"Textiles",   eta:"1h 05m",priority:"medium"},
  {id:"SHP-4824",from:"Kolkata Hub",to:"Lucknow",   status:"delivered", driver:"Kumar S.",  weight:"1.5T",cargo:"Spare Parts",eta:"Done",  priority:"low"},
];

interface DashboardPageProps { onNav:(p:PageId)=>void; }
function DashboardPage({ onNav }: DashboardPageProps): React.ReactElement {
  const [summaryData,    setSummaryData]    = useState<ForecastSummary|null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr,     setSummaryErr]     = useState("");
  // User-configurable inputs for the demand KPI
  const [dProduct,   setDProduct]   = useState(VALID_PRODUCTS[0]);
  const [dWarehouse, setDWarehouse] = useState<City>("Mumbai");
  const [dDays,      setDDays]      = useState(7);
  const [showConfig, setShowConfig] = useState(false);

  const loadSummary = useCallback(async (product:string, warehouse:string, days:number) => {
    setSummaryLoading(true); setSummaryErr(""); setSummaryData(null);
    try {
      const data = await callAPI<ForecastSummary>("/forecast/summary", {
        product_id:product, warehouse, days, is_promotion:0
      });
      setSummaryData(data);
    } catch(e) { setSummaryErr((e as Error).message); }
    finally { setSummaryLoading(false); }
  }, []);

  // Load on mount with defaults
  useEffect(()=>{ loadSummary(dProduct, dWarehouse, dDays); }, []);

  const totalDemand = summaryData?.total_demand ?? summaryData?.total_predicted_demand;
  const demandLabel = `${dDays}d Demand (${dWarehouse})`;

  const kpis = [
    {label:"Active Shipments",value:"1,284",change:"+12%",up:true,icon:"🚛",accent:C.forest,page:"shipments" as PageId},
    {label:"On-Time Delivery",value:"94.2%",change:"+2.1%",up:true,icon:"✅",accent:C.green,page:"analytics" as PageId},
    {label:demandLabel,
      value:summaryLoading?"…":summaryErr?"—":totalDemand!=null?String(totalDemand):"—",
      change:summaryLoading?"":summaryErr?"error":"+live",
      up:true,icon:"📈",accent:C.amber,page:"analytics" as PageId,live:true,configurable:true},
    {label:"Avg. Turnaround",value:"3.4 hr",change:"-18%",up:true,icon:"⏱",accent:C.sage,page:"analytics" as PageId},
  ];

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:34}}>
        <div>
          <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Good morning, Admin</div>
          <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13.5,marginTop:5}}>India Logistics Dashboard · Pan India Network</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {kpis.map(k=>{
          const isConfig = (k as {configurable?:boolean}).configurable;
          const isLive   = (k as {live?:boolean}).live;
          return (
            <div key={k.label} style={{position:"relative"}}>
              <div onClick={()=>!isConfig && onNav(k.page)}
                style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"20px 22px",cursor:isConfig?"default":"pointer",borderTop:`3px solid ${k.accent}`,transition:"box-shadow .2s"}}
                onMouseOver={e=>!isConfig&&((e.currentTarget as HTMLDivElement).style.boxShadow=`0 4px 20px ${C.forest}12`)}
                onMouseOut={e=>!isConfig&&((e.currentTarget as HTMLDivElement).style.boxShadow="none")}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div style={{width:40,height:40,background:`${k.accent}12`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>{k.icon}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {k.change&&<span style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:k.up?C.green:C.red,background:k.up?C.greenBg:C.redBg,padding:"3px 8px",borderRadius:3}}>{k.change}{isLive&&<span style={{marginLeft:3,opacity:.7,animation:"pulse 1.5s infinite"}}>●</span>}</span>}
                    {isConfig && (
                      <button onClick={e=>{e.stopPropagation();setShowConfig(v=>!v);}} style={{background:"none",border:`1px solid ${C.parchmentDark}`,borderRadius:6,padding:"2px 6px",cursor:"pointer",fontSize:12,color:C.muted}} title="Configure">⚙</button>
                    )}
                  </div>
                </div>
                {isLive&&summaryLoading?<Spinner small/>:<div style={{fontFamily:F.lora,fontSize:28,fontWeight:700,color:C.forest}}>{k.value}</div>}
                <div style={{fontFamily:F.quicksand,fontSize:12.5,color:C.muted,marginTop:4}}>{k.label}{isLive&&<span style={{marginLeft:6,fontFamily:F.syne,fontSize:9,color:C.sage}}>LIVE</span>}</div>
              </div>
              {/* Config popover */}
              {isConfig && showConfig && (
                <div style={{position:"absolute",top:"105%",right:0,zIndex:200,background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"16px",width:220,boxShadow:`0 8px 32px ${C.forest}18`}} onClick={e=>e.stopPropagation()}>
                  <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,marginBottom:10,letterSpacing:1}}>DEMAND FORECAST SETTINGS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                    <div>
                      <label style={{fontFamily:F.syne,fontSize:8.5,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>PRODUCT</label>
                      <FocusSelect value={dProduct} onChange={e=>setDProduct(e.target.value)} style={{...selBase,fontSize:12,padding:"6px 10px",width:"100%"}}>
                        {VALID_PRODUCTS.map(p=><option key={p}>{p}</option>)}
                      </FocusSelect>
                    </div>
                    <div>
                      <label style={{fontFamily:F.syne,fontSize:8.5,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>WAREHOUSE</label>
                      <FocusSelect value={dWarehouse} onChange={e=>setDWarehouse(e.target.value as City)} style={{...selBase,fontSize:12,padding:"6px 10px",width:"100%"}}>
                        {ALL_CITIES.map(c=><option key={c}>{c}</option>)}
                      </FocusSelect>
                    </div>
                    <div>
                      <label style={{fontFamily:F.syne,fontSize:8.5,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>DAYS</label>
                      <FocusSelect value={dDays} onChange={e=>setDDays(Number(e.target.value))} style={{...selBase,fontSize:12,padding:"6px 10px",width:"100%"}}>
                        {[7,14,21,30].map(d=><option key={d} value={d}>{d} days</option>)}
                      </FocusSelect>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn variant="outline" onClick={()=>setShowConfig(false)} style={{flex:1,justifyContent:"center",padding:"7px 10px",fontSize:12}}>Cancel</Btn>
                    <Btn onClick={()=>{loadSummary(dProduct,dWarehouse,dDays);setShowConfig(false);}} style={{flex:1,justifyContent:"center",padding:"7px 10px",fontSize:12}}>Apply</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:20,marginBottom:20}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15}}>Live Route Map</div>
            <span onClick={()=>onNav("shipments")} style={{fontFamily:F.quicksand,fontSize:12,color:C.sage,fontWeight:700,cursor:"pointer"}}>View Shipments →</span>
          </div>
          <div style={{height:256}}><RouteMap/></div>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15}}>Recent Alerts</div>
            <Tag color={C.red} bg={C.redBg}>3 Active</Tag>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {DASH_ALERTS.map(a=>(
              <div key={a.id} onClick={()=>onNav("alerts")} style={{display:"flex",gap:12,padding:"10px 12px",borderRadius:8,background:C.parchment,cursor:"pointer",border:`1px solid ${C.parchmentDark}`}} onMouseOver={e=>(e.currentTarget as HTMLDivElement).style.background=C.parchmentDark} onMouseOut={e=>(e.currentTarget as HTMLDivElement).style.background=C.parchment}>
                <div style={{width:8,height:8,borderRadius:"50%",background:a.dot,flexShrink:0,marginTop:5}}/>
                <div><div style={{fontFamily:F.quicksand,fontSize:12.5,color:C.ink}}>{a.msg}</div><div style={{fontFamily:F.syne,fontSize:10,color:C.muted,marginTop:3}}>{a.time}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.9fr",gap:20}}>
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15,marginBottom:16}}>Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {QUICK_ACTIONS.map(a=>(
              <button key={a.label} onClick={()=>onNav(a.page)} style={{padding:"14px 10px",background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:9,cursor:"pointer",textAlign:"center",fontFamily:F.quicksand,transition:"all .15s"}} onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.background=`${C.sage}18`;(e.currentTarget as HTMLButtonElement).style.borderColor=C.sage;}} onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.parchment;(e.currentTarget as HTMLButtonElement).style.borderColor=C.parchmentDark;}}>
                <div style={{fontSize:20,marginBottom:6}}>{a.icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:C.forest}}>{a.label}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 14px"}}>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15}}>Active Shipments</div>
            <span onClick={()=>onNav("shipments")} style={{fontFamily:F.quicksand,fontSize:12,color:C.sage,fontWeight:700,cursor:"pointer"}}>View All →</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`2px solid ${C.parchmentDark}`}}>{["Tracking ID","Route","Driver","ETA","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px 10px 18px",fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1}}>{h}</th>)}</tr></thead>
            <tbody>{DASH_SHIPS.map(s=><tr key={s.id} onClick={()=>onNav("shipments")} style={{borderBottom:`1px solid ${C.parchment}`,cursor:"pointer"}} onMouseOver={e=>(e.currentTarget as HTMLTableRowElement).style.background=C.parchment} onMouseOut={e=>(e.currentTarget as HTMLTableRowElement).style.background="transparent"}><td style={{padding:"12px 10px 12px 18px",fontFamily:F.syne,fontSize:12,fontWeight:700,color:C.forest}}>{s.id}</td><td style={{padding:"12px 10px"}}><div style={{fontFamily:F.quicksand,fontSize:12.5,fontWeight:600,color:C.ink}}>{s.from}</div><div style={{fontFamily:F.quicksand,fontSize:11,color:C.muted}}>→ {s.to}</div></td><td style={{padding:"12px 10px",fontFamily:F.quicksand,fontSize:12.5,color:C.ink}}>{s.driver}</td><td style={{padding:"12px 10px",fontFamily:F.quicksand,fontSize:12.5,fontWeight:700,color:s.status==="delayed"?C.red:s.eta==="Done"?C.green:C.ink}}>{s.eta}</td><td style={{padding:"12px 10px"}}><StatusBadge status={s.status}/></td></tr>)}</tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── SHIPMENTS PAGE ───────────────────────────────────────────────────────────
const INITIAL_SHIPMENTS: Shipment[] = [
  {id:"SHP-4821",from:"Mumbai Port",  to:"Delhi Warehouse",   status:"delayed",    driver:"Ramesh K.", weight:"4.2T",cargo:"Steel Rods",     eta:"2h 30m",priority:"critical"},
  {id:"SHP-4822",from:"Chennai Port", to:"Hyderabad Hub",     status:"in_transit", driver:"Suresh M.", weight:"2.1T",cargo:"Electronics",    eta:"4h 10m",priority:"high"},
  {id:"SHP-4823",from:"Warehouse A",  to:"Pune Depot",        status:"at_port",    driver:"Vijay R.",  weight:"6.8T",cargo:"Textiles",       eta:"1h 05m",priority:"medium"},
  {id:"SHP-4824",from:"Kolkata Hub",  to:"Lucknow Store",     status:"delivered",  driver:"Kumar S.",  weight:"1.5T",cargo:"Spare Parts",    eta:"Done",  priority:"low"},
  {id:"SHP-4825",from:"Mumbai Port",  to:"Jaipur Warehouse",  status:"in_transit", driver:"Anand P.",  weight:"3.3T",cargo:"Chemicals",      eta:"5h 20m",priority:"high"},
  {id:"SHP-4826",from:"Ahmedabad Hub",to:"Bangalore Depot",   status:"pending",    driver:"Manoj L.",  weight:"8.0T",cargo:"Food Grains",    eta:"—",     priority:"medium"},
  {id:"SHP-4827",from:"Delhi Warehouse",to:"Mumbai Port",     status:"in_transit", driver:"Pradeep N.",weight:"2.9T",cargo:"Auto Components",eta:"3h 45m",priority:"high"},
];

const PRI_STYLE:Record<Priority,{c:string;b:string}>={critical:{c:C.red,b:C.redBg},high:{c:C.amber,b:C.amberBg},medium:{c:C.sage,b:`${C.sage}18`},low:{c:C.green,b:C.greenBg}};

// New Shipment Modal — Pre-Dispatch Assessment + Creation
// Uses /delay and /cost with CORRECT param names
interface NewShipmentModalProps { onClose:()=>void; onAdd:(s:Shipment)=>void; }
function NewShipmentModal({ onClose, onAdd }: NewShipmentModalProps): React.ReactElement {
  const [origin,      setOrigin]      = useState<City>("Mumbai");
  const [dest,        setDest]        = useState<City>("Delhi");
  const [vehicle,     setVehicle]     = useState<typeof VALID_VEHICLES[number]>("Truck");
  const [weather,     setWeather]     = useState<typeof VALID_WEATHER[number]>("Clear");
  const [traffic,     setTraffic]     = useState<typeof VALID_TRAFFIC[number]>("Medium");
  const [hour,        setHour]        = useState(10);
  const [weightKg,    setWeightKg]    = useState(500);
  const [fuelPrice,   setFuelPrice]   = useState(100);
  const [driverCost,  setDriverCost]  = useState(1500);
  const [tollCharges, setTollCharges] = useState(500);
  // Shipment-specific fields
  const [driverName,  setDriverName]  = useState("");
  const [cargoType,   setCargoType]   = useState("");
  const [weightTon,   setWeightTon]   = useState("1.0");
  const [priority,    setPriority]    = useState<Priority>("medium");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<PreDispatchResult|null>(null);
  const [err,         setErr]         = useState("");
  const [added,       setAdded]       = useState(false);

  const handleAssess = async () => {
    if (origin===dest){setErr("Origin and destination must be different.");return;}
    setErr(""); setLoading(true); setResult(null);
    try {
      const [delay, cost] = await Promise.all([
        callAPI<DelayPrediction>("/delay", {
          origin, destination:dest, vehicle_type:vehicle,
          weather_condition:weather, traffic_condition:traffic, departure_hour:hour
        }),
        callAPI<CostPrediction>("/cost", {
          origin, destination:dest, vehicle_type:vehicle,
          traffic_condition:traffic, weight_kg:weightKg,
          fuel_price_per_litre:fuelPrice, driver_cost:driverCost, toll_charges:tollCharges
        }),
      ]);
      setResult({delay,cost});
    } catch(e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  const handleCreate = () => {
    if (!driverName.trim()||!cargoType.trim()){setErr("Please enter driver name and cargo type.");return;}
    const newShipment: Shipment = {
      id: `SHP-${(4828 + Math.floor(Math.random()*100)).toString()}`,
      from: `${origin} Hub`,
      to:   `${dest} Warehouse`,
      status: "pending",
      driver: driverName.trim(),
      weight: `${weightTon}T`,
      cargo:  cargoType.trim(),
      eta: "TBD",
      priority,
    };
    onAdd(newShipment);
    setAdded(true);
    setTimeout(()=>onClose(), 1000);
  };

  const dp = result?.delay;
  const cp = result?.cost;
  // Fix issue 4: delay_probability is already 0–100 (confirmed from API, e.g. 41.54)
  const rawProb = dp?.delay_probability ?? 0;
  const delayPct = rawProb;
  const isHighRisk = delayPct > 60;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,30,30,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(2px)"}}>
      <div style={{background:C.cream,borderRadius:16,padding:"28px 32px",width:620,maxHeight:"92vh",overflowY:"auto",boxShadow:`0 20px 60px ${C.forest}30`,border:`1px solid ${C.parchmentDark}`,animation:"fadeIn .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:22}}>
          <div style={{fontFamily:F.lora,fontSize:20,fontWeight:700,color:C.forest}}>New Shipment — Pre-Dispatch Assessment</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button>
        </div>

        {/* Shipment details */}
        <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:10,letterSpacing:1}}>SHIPMENT DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <LabeledField label="DRIVER NAME"><FocusInput value={driverName} onChange={e=>setDriverName(e.target.value)} placeholder="e.g. Arjun Sharma"/></LabeledField>
          <LabeledField label="CARGO TYPE"><FocusInput value={cargoType} onChange={e=>setCargoType(e.target.value)} placeholder="e.g. Electronics"/></LabeledField>
          <LabeledField label="WEIGHT (tonnes)"><FocusInput type="number" min={0.1} step={0.1} value={weightTon} onChange={e=>setWeightTon(e.target.value)}/></LabeledField>
          <LabeledField label="PRIORITY">
            <FocusSelect value={priority} onChange={e=>setPriority(e.target.value as Priority)}>
              {(["low","medium","high","critical"] as Priority[]).map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </FocusSelect>
          </LabeledField>
        </div>

        {/* Route & dispatch conditions */}
        <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:10,letterSpacing:1}}>ROUTE & DISPATCH CONDITIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <LabeledField label="ORIGIN"><FocusSelect value={origin} onChange={e=>setOrigin(e.target.value as City)}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
          <LabeledField label="DESTINATION"><FocusSelect value={dest} onChange={e=>setDest(e.target.value as City)}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
          <LabeledField label="VEHICLE TYPE"><FocusSelect value={vehicle} onChange={e=>setVehicle(e.target.value as typeof VALID_VEHICLES[number])}>{VALID_VEHICLES.map(v=><option key={v}>{v}</option>)}</FocusSelect></LabeledField>
          <LabeledField label="WEATHER CONDITION"><FocusSelect value={weather} onChange={e=>setWeather(e.target.value as typeof VALID_WEATHER[number])}>{VALID_WEATHER.map(w=><option key={w}>{w}</option>)}</FocusSelect></LabeledField>
          <LabeledField label="TRAFFIC CONDITION"><FocusSelect value={traffic} onChange={e=>setTraffic(e.target.value as typeof VALID_TRAFFIC[number])}>{VALID_TRAFFIC.map(t=><option key={t}>{t}</option>)}</FocusSelect></LabeledField>
          <LabeledField label="DEPARTURE HOUR (0–23)"><FocusInput type="number" min={0} max={23} value={hour} onChange={e=>setHour(Number(e.target.value))}/></LabeledField>
          <LabeledField label="CARGO WEIGHT (kg)"><FocusInput type="number" min={1} value={weightKg} onChange={e=>setWeightKg(Number(e.target.value))}/></LabeledField>
          <LabeledField label="FUEL PRICE (₹/litre)"><FocusInput type="number" min={50} value={fuelPrice} onChange={e=>setFuelPrice(Number(e.target.value))}/></LabeledField>
          <LabeledField label="DRIVER COST (₹)"><FocusInput type="number" min={0} value={driverCost} onChange={e=>setDriverCost(Number(e.target.value))}/></LabeledField>
          <LabeledField label="TOLL CHARGES (₹)"><FocusInput type="number" min={0} value={tollCharges} onChange={e=>setTollCharges(Number(e.target.value))}/></LabeledField>
        </div>

        {err && <ErrBox msg={err}/>}
        {loading && <div style={{margin:"16px 0"}}><Spinner label="Running pre-dispatch assessment…"/></div>}
        {added && <div style={{background:C.greenBg,border:`1px solid #b7e4ca`,borderRadius:10,padding:"12px 16px",fontFamily:F.quicksand,fontSize:13,color:C.green,marginBottom:8}}>✓ Shipment added successfully!</div>}

        {result && (
          <div style={{marginTop:14,animation:"fadeIn .2s ease"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:isHighRisk?C.redBg:C.greenBg,border:`1px solid ${isHighRisk?"#f5c6c2":"#b7e4ca"}`,borderRadius:12,padding:"16px"}}>
                <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:6}}>DELAY PROBABILITY</div>
                <div style={{fontFamily:F.lora,fontSize:30,fontWeight:700,color:isHighRisk?C.red:C.green}}>{delayPct.toFixed(1)}%</div>
                <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:4}}>{dp?.risk_level ?? ""} Risk</div>
                {dp?.recommendation && <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.ink,marginTop:8,background:"rgba(0,0,0,.05)",borderRadius:7,padding:"7px 10px"}}>{dp.recommendation}</div>}
              </div>
              <div style={{background:C.blueBg,border:`1px solid ${C.blue}20`,borderRadius:12,padding:"16px"}}>
                <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:6}}>ESTIMATED COST</div>
                <div style={{fontFamily:F.lora,fontSize:30,fontWeight:700,color:C.blue}}>₹{(cp?.predicted_cost_inr??0).toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
                <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:4}}>Total logistics cost</div>
                {cp?.distance_km && <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.ink,marginTop:8}}>{cp.distance_km} km route · {cp.cost_category ?? ""}</div>}
              </div>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <Btn variant="outline" onClick={onClose} style={{flex:1,justifyContent:"center"}}>Cancel</Btn>
          <Btn onClick={handleAssess} disabled={loading} style={{flex:1,justifyContent:"center"}}>🔍 Assess Risk & Cost</Btn>
          <Btn onClick={handleCreate} disabled={added} style={{flex:1,justifyContent:"center",background:added?C.green:C.forest}}>
            {added?"✓ Added!":"Create Shipment ✓"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ShipmentsPage(): React.ReactElement {
  const [shipments, setShipments] = useState<Shipment[]>(INITIAL_SHIPMENTS);
  const [search,   setSearch]   = useState("");
  const [sf,       setSf]       = useState("all");
  const [selId,    setSelId]    = useState<string|null>(null);
  const [newModal, setNewModal] = useState(false);

  const handleAddShipment = (s: Shipment) => {
    setShipments(prev => [s, ...prev]);
  };

  // Detail panel — Delay Risk
  const [dOrigin,  setDOrigin]  = useState<City>("Mumbai");
  const [dDest,    setDDest]    = useState<City>("Delhi");
  const [dVehicle, setDVehicle] = useState<typeof VALID_VEHICLES[number]>("Truck");
  const [dWeather, setDWeather] = useState<typeof VALID_WEATHER[number]>("Clear");
  const [dTraffic, setDTraffic] = useState<typeof VALID_TRAFFIC[number]>("Medium");
  const [dHour,    setDHour]    = useState(10);
  const [dRes,     setDRes]     = useState<DelayPrediction|null>(null);
  const [dLoading, setDLoading] = useState(false);
  const [dErr,     setDErr]     = useState("");

  // Detail panel — Cost
  const [cWeightKg,    setCWeightKg]    = useState(500);
  const [cFuel,        setCFuel]        = useState(100);
  const [cDriver,      setCDriver]      = useState(1500);
  const [cToll,        setCToll]        = useState(500);
  const [cRes,         setCRes]         = useState<CostPrediction|null>(null);
  const [cLoading,     setCLoading]     = useState(false);
  const [cErr,         setCErr]         = useState("");

  const counts = useMemo<Record<string,number>>(()=>{
    const m:Record<string,number>={all:shipments.length};
    (["in_transit","delayed","delivered","pending","at_port"] as ShipmentStatus[]).forEach(s=>(m[s]=shipments.filter(x=>x.status===s).length));
    return m;
  },[shipments]);

  const filtered = useMemo(()=>shipments.filter(s=>sf==="all"||s.status===sf).filter(s=>[s.id,s.driver,s.cargo].join(" ").toLowerCase().includes(search.toLowerCase())),[search,sf,shipments]);
  const S = selId ? shipments.find(s=>s.id===selId)??null : null;

  useEffect(()=>{setDRes(null);setCRes(null);setDErr("");setCErr("");},[selId]);

  const runDelay = async () => {
    if (dOrigin===dDest){setDErr("Origin and destination must differ.");return;}
    setDErr(""); setDLoading(true); setDRes(null);
    try {
      const d = await callAPI<DelayPrediction>("/delay",{
        origin:dOrigin, destination:dDest, vehicle_type:dVehicle,
        weather_condition:dWeather, traffic_condition:dTraffic, departure_hour:dHour
      });
      setDRes(d);
    } catch(e){setDErr((e as Error).message);}
    finally{setDLoading(false);}
  };

  const runCost = async () => {
    setCErr(""); setCLoading(true); setCRes(null);
    try {
      const d = await callAPI<CostPrediction>("/cost",{
        origin:dOrigin, destination:dDest, vehicle_type:dVehicle,
        traffic_condition:dTraffic, weight_kg:cWeightKg,
        fuel_price_per_litre:cFuel, driver_cost:cDriver, toll_charges:cToll
      });
      setCRes(d);
    } catch(e){setCErr((e as Error).message);}
    finally{setCLoading(false);}
  };

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Shipments</div>
          <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>Track and manage all active shipments across India</div>
        </div>
        <Btn onClick={()=>setNewModal(true)}>+ New Shipment</Btn>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {([["all","All"],["in_transit","In Transit"],["delayed","Delayed"],["at_port","At Port"],["delivered","Delivered"],["pending","Pending"]] as [string,string][]).map(([v,l])=>(
          <button key={v} onClick={()=>setSf(v)} style={{padding:"7px 16px",borderRadius:20,fontFamily:F.quicksand,fontSize:13,fontWeight:600,cursor:"pointer",border:sf===v?"none":`1px solid ${C.parchmentDark}`,background:sf===v?C.forest:"transparent",color:sf===v?C.cream:C.muted}}>
            {l} <span style={{opacity:.65,fontSize:11}}>({counts[v]??0})</span>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:S?"1fr 390px":"1fr",gap:20}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.parchmentDark}`,position:"relative"}}>
            <span style={{position:"absolute",left:34,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:16}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, driver or cargo..." style={{width:"100%",padding:"9px 12px 9px 36px",border:`1.5px solid ${C.parchmentDark}`,borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:F.quicksand,background:C.parchment,color:C.ink}} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.parchment}}>{["Tracking ID","From → To","Driver","Cargo","Weight","ETA","Priority","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"11px 16px",fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.muted,letterSpacing:.8,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(s=>{const pm=PRI_STYLE[s.priority];const isSel=selId===s.id;return(
              <tr key={s.id} onClick={()=>setSelId(isSel?null:s.id)} style={{borderBottom:`1px solid ${C.parchment}`,background:isSel?`${C.sage}10`:"transparent",cursor:"pointer"}} onMouseOver={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background=C.parchment;}} onMouseOut={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background="transparent";}}>
                <td style={{padding:"13px 16px",fontFamily:F.syne,fontSize:11.5,fontWeight:700,color:C.forest}}>{s.id}</td>
                <td style={{padding:"13px 16px"}}><div style={{fontFamily:F.quicksand,fontSize:13,fontWeight:600,color:C.ink}}>{s.from}</div><div style={{fontFamily:F.quicksand,fontSize:11,color:C.muted}}>→ {s.to}</div></td>
                <td style={{padding:"13px 16px",fontFamily:F.quicksand,fontSize:13,color:C.ink}}>{s.driver}</td>
                <td style={{padding:"13px 16px",fontFamily:F.quicksand,fontSize:13,color:C.ink}}>{s.cargo}</td>
                <td style={{padding:"13px 16px",fontFamily:F.quicksand,fontSize:13,fontWeight:600,color:C.forest}}>{s.weight}</td>
                <td style={{padding:"13px 16px",fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:s.status==="delayed"?C.red:s.eta==="Done"?C.green:C.forest}}>{s.eta}</td>
                <td style={{padding:"13px 16px"}}><Tag color={pm.c} bg={pm.b}>{s.priority}</Tag></td>
                <td style={{padding:"13px 16px"}}><StatusBadge status={s.status}/></td>
              </tr>
            );})}</tbody>
          </table>
          <div style={{padding:"10px 22px",borderTop:`1px solid ${C.parchmentDark}`,fontFamily:F.quicksand,fontSize:12,color:C.muted}}>Showing {filtered.length} of {shipments.length} shipments</div>
        </Card>

        {S && (
          <div style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:14,padding:"22px",height:"fit-content",maxHeight:"85vh",overflowY:"auto",animation:"fadeIn .15s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
              <div><div style={{fontFamily:F.syne,fontSize:13,fontWeight:700,color:C.forest}}>{S.id}</div><div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted}}>{S.cargo}</div></div>
              <button onClick={()=>setSelId(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {([["From",S.from],["To",S.to],["Driver",S.driver],["Weight",S.weight],["ETA",S.eta],["Status",S.status.replace("_"," ")]] as [string,string][]).map(([k,v])=>(
                <div key={k} style={{background:C.parchment,borderRadius:9,padding:"9px 12px"}}>
                  <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:3}}>{k.toUpperCase()}</div>
                  <div style={{fontFamily:F.quicksand,fontSize:12.5,fontWeight:700,color:C.forest,textTransform:"capitalize"}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Check Delay Risk */}
            <div style={{background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:12}}>CHECK DELAY RISK</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <LabeledField label="ORIGIN"><FocusSelect value={dOrigin} onChange={e=>setDOrigin(e.target.value as City)} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="DESTINATION"><FocusSelect value={dDest} onChange={e=>setDDest(e.target.value as City)} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="VEHICLE"><FocusSelect value={dVehicle} onChange={e=>setDVehicle(e.target.value as typeof VALID_VEHICLES[number])} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{VALID_VEHICLES.map(v=><option key={v}>{v}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="WEATHER"><FocusSelect value={dWeather} onChange={e=>setDWeather(e.target.value as typeof VALID_WEATHER[number])} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{VALID_WEATHER.map(w=><option key={w}>{w}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="TRAFFIC"><FocusSelect value={dTraffic} onChange={e=>setDTraffic(e.target.value as typeof VALID_TRAFFIC[number])} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{VALID_TRAFFIC.map(t=><option key={t}>{t}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="HOUR (0–23)"><FocusInput type="number" min={0} max={23} value={dHour} onChange={e=>setDHour(Number(e.target.value))} style={smallInp}/></LabeledField>
              </div>
              {dErr && <ErrBox msg={dErr}/>}
              {dLoading && <Spinner small/>}
              {dRes && (() => {
                const pct = dRes.delay_probability ?? 0;  // already 0–100
                const hi = pct > 60;
                return (
                <div style={{background:hi?C.redBg:C.greenBg,borderRadius:9,padding:"10px 12px",marginBottom:10,border:`1px solid ${hi?"#f5c6c2":"#b7e4ca"}`}}>
                  <div style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:hi?C.red:C.green}}>{pct.toFixed(1)}% delay risk</div>
                  <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:3}}>{dRes.risk_level??""} · {dRes.recommendation??""}</div>
                </div>
              );})()}
              <Btn onClick={runDelay} disabled={dLoading} style={{width:"100%",justifyContent:"center",padding:"8px 14px",fontSize:12}}>🔍 Check Delay Risk</Btn>
            </div>

            {/* Estimate Cost */}
            <div style={{background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:10}}>ESTIMATE SHIPMENT COST</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <LabeledField label="WEIGHT (kg)"><FocusInput type="number" min={1} value={cWeightKg} onChange={e=>setCWeightKg(Number(e.target.value))} style={smallInp}/></LabeledField>
                <LabeledField label="FUEL (₹/L)"><FocusInput type="number" min={50} value={cFuel} onChange={e=>setCFuel(Number(e.target.value))} style={smallInp}/></LabeledField>
                <LabeledField label="DRIVER COST (₹)"><FocusInput type="number" min={0} value={cDriver} onChange={e=>setCDriver(Number(e.target.value))} style={smallInp}/></LabeledField>
                <LabeledField label="TOLL (₹)"><FocusInput type="number" min={0} value={cToll} onChange={e=>setCToll(Number(e.target.value))} style={smallInp}/></LabeledField>
              </div>
              {cErr && <ErrBox msg={cErr}/>}
              {cLoading && <Spinner small/>}
              {cRes && (
                <div style={{background:C.blueBg,borderRadius:9,padding:"10px 12px",marginBottom:10,border:`1px solid ${C.blue}20`}}>
                  <div style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:C.blue}}>₹{(cRes.predicted_cost_inr??0).toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
                  {cRes.distance_km && <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:3}}>{cRes.distance_km} km · {cRes.cost_category??""}</div>}
                  {cRes.cost_breakdown && (
                    <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3}}>
                      {Object.entries(cRes.cost_breakdown).map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",fontFamily:F.quicksand,fontSize:11}}>
                          <span style={{color:C.muted,textTransform:"capitalize"}}>{k.replace(/_/g," ").replace(" inr","")}</span>
                          <span style={{color:C.blue,fontWeight:700}}>{typeof v === "number" && v > 1 ? `₹${Number(v).toLocaleString("en-IN",{maximumFractionDigits:0})}` : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Btn onClick={runCost} disabled={cLoading} style={{width:"100%",justifyContent:"center",padding:"8px 14px",fontSize:12}}>💰 Estimate Cost</Btn>
            </div>
          </div>
        )}
      </div>
      {newModal && <NewShipmentModal onClose={()=>setNewModal(false)} onAdd={handleAddShipment}/>}
    </div>
  );
}

// ─── INVENTORY PAGE ───────────────────────────────────────────────────────────
const ALL_INVENTORY: InventoryItem[] = [
  {id:"INV-001",sku:"STL-ROD-12",name:"Steel Rods 12mm",     warehouse:"Warehouse A – Chennai",   qty:340,  min:100,max:800,  unit:"units",category:"Raw Material",productId:"PROD_001"},
  {id:"INV-002",sku:"ELC-CAP-22",name:"Electronic Capacitors",warehouse:"Warehouse B – Mumbai",    qty:18,   min:50, max:500,  unit:"boxes",category:"Electronics", productId:"PROD_002"},
  {id:"INV-003",sku:"TXT-COT-XL",name:"Cotton Fabric XL",    warehouse:"Warehouse C – Ahmedabad", qty:620,  min:200,max:1000, unit:"rolls",category:"Textiles",     productId:"PROD_003"},
  {id:"INV-004",sku:"CHM-H2SO4", name:"Sulphuric Acid 98%",  warehouse:"Warehouse D – Hyderabad", qty:82,   min:40, max:200,  unit:"drums",category:"Chemicals",    productId:"PROD_001"},
  {id:"INV-005",sku:"AUT-BRK-44",name:"Brake Pads Set",      warehouse:"Warehouse E – Pune",      qty:9,    min:30, max:300,  unit:"sets", category:"Auto Parts",   productId:"PROD_002"},
  {id:"INV-006",sku:"FDG-RIC-25",name:"Rice (25kg Bags)",    warehouse:"Warehouse F – Kolkata",   qty:1200, min:300,max:2000, unit:"bags", category:"Food Grains",  productId:"PROD_003"},
  {id:"INV-007",sku:"PLS-PVC-10",name:"PVC Pipes 10ft",      warehouse:"Warehouse G – Bangalore", qty:455,  min:100,max:600,  unit:"pcs",  category:"Construction", productId:"PROD_001"},
  {id:"INV-008",sku:"ELC-WRE-CU",name:"Copper Wire Coil",    warehouse:"Warehouse H – Delhi",     qty:25,   min:40, max:250,  unit:"coils",category:"Electronics",  productId:"PROD_002"},
];

function InventoryPage(): React.ReactElement {
  const [cat,    setCat]    = useState("All");
  const [search, setSearch] = useState("");
  const [selId,  setSelId]  = useState<string|null>(null);
  const [modal,  setModal]  = useState(false);

  // Reorder state
  const [rStock,   setRStock]   = useState(50);
  const [rSales,   setRSales]   = useState(10);
  const [rLead,    setRLead]    = useState(5);
  const [rDelay,   setRDelay]   = useState(2);
  const [rPromo,   setRPromo]   = useState(0);
  const [rWarehouse,setRWarehouse]=useState<City>("Mumbai");
  const [rRes,     setRRes]     = useState<ReorderResponse|null>(null);
  const [rLoading, setRLoading] = useState(false);
  const [rErr,     setRErr]     = useState("");

  // Anomaly state
  const [aExpected, setAExpected] = useState(500);
  const [aActual,   setAActual]   = useState(490);
  const [aRes,      setARes]      = useState<AnomalyResponse|null>(null);
  const [aLoading,  setALoading]  = useState(false);
  const [aErr,      setAErr]      = useState("");

  const filtered = useMemo(()=>ALL_INVENTORY.filter(i=>cat==="All"||i.category===cat).filter(i=>(i.name+i.sku).toLowerCase().includes(search.toLowerCase())),[cat,search]);
  const S = selId ? ALL_INVENTORY.find(i=>i.id===selId)??null : null;

  useEffect(()=>{
    if (!S) return;
    setRStock(S.qty); setRSales(Math.max(1,Math.round(S.qty*0.03)));
    setAExpected(S.qty); setAActual(S.qty);
    setRRes(null); setARes(null); setRErr(""); setAErr("");
  },[S]);

  const runReorder = async () => {
    if (!S) return;
    setRErr(""); setRLoading(true); setRRes(null);
    try {
      const d = await callAPI<ReorderResponse>("/reorder",{
        product_id:S.productId, warehouse:rWarehouse,
        current_stock:rStock, daily_sales:rSales,
        lead_time_days:rLead, supplier_delay_days:rDelay, is_promotion:rPromo
      });
      setRRes(d);
    } catch(e){setRErr((e as Error).message);}
    finally{setRLoading(false);}
  };

  const runAnomaly = async () => {
    if (!S) return;
    setAErr(""); setALoading(true); setARes(null);
    try {
      const d = await callAPI<AnomalyResponse>("/anomaly/inventory",{
        product_id:S.productId, warehouse:rWarehouse,
        current_stock:rStock, daily_sales:rSales,
        expected_stock:aExpected, actual_stock:aActual
      });
      setARes(d);
    } catch(e){setAErr((e as Error).message);}
    finally{setALoading(false);}
  };

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Inventory</div>
          <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>Stock levels across all India warehouses</div>
        </div>
        <div style={{display:"flex",gap:10}}><Btn variant="outline">📤 Export</Btn><Btn onClick={()=>setModal(true)}>+ Add Item</Btn></div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {([["📦","Total SKUs","8","Across 8 warehouses",C.forest],["⚠","Low Stock","3","Need reorder now",C.red],["💰","Est. Value","₹2.4M","Current stock",C.sage],["🔄","Reorders","2","Auto-triggered",C.amber]] as [string,string,string,string,string][]).map(([ic,lb,vl,sb,co])=>(
          <div key={lb} style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderLeft:`3px solid ${co}`,borderRadius:14,padding:"18px 20px"}}>
            <div style={{fontSize:22,marginBottom:9}}>{ic}</div>
            <div style={{fontFamily:F.lora,fontSize:26,fontWeight:700,color:C.forest}}>{vl}</div>
            <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:3}}>{lb}</div>
            <div style={{fontFamily:F.syne,fontSize:9.5,color:co,marginTop:3,fontWeight:700}}>{sb}</div>
          </div>
        ))}
      </div>

      <div style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"14px 20px",marginBottom:16,display:"flex",gap:12}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:16}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SKU or item name..." style={{...inpBase,paddingLeft:34,background:C.parchment}} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/>
        </div>
        <FocusSelect value={cat} onChange={e=>setCat(e.target.value)} style={{...selBase,minWidth:180,width:"auto"}}>
          {["All","Raw Material","Electronics","Textiles","Chemicals","Auto Parts","Food Grains","Construction"].map(c=><option key={c}>{c}</option>)}
        </FocusSelect>
      </div>

      <div style={{display:"grid",gridTemplateColumns:S?"1fr 340px":"1fr",gap:20}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.parchment}}>{["SKU","Item Name","Warehouse","Quantity","Category","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"11px 18px",fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.muted,letterSpacing:.8}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(item=>{
              const low=item.qty<item.min; const warn=!low&&item.qty<item.min*1.5; const isSel=selId===item.id;
              const pct=Math.min(100,Math.round(item.qty/item.max*100)); const barC=low?C.red:warn?C.amber:C.sage;
              return (
                <tr key={item.id} onClick={()=>setSelId(isSel?null:item.id)} style={{borderBottom:`1px solid ${C.parchment}`,background:isSel?`${C.sage}10`:"transparent",cursor:"pointer"}} onMouseOver={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background=C.parchment;}} onMouseOut={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background="transparent";}}>
                  <td style={{padding:"13px 18px",fontFamily:F.syne,fontSize:11,fontWeight:700,color:C.forest}}>{item.sku}</td>
                  <td style={{padding:"13px 18px",fontFamily:F.quicksand,fontSize:13,fontWeight:600,color:C.ink}}>{item.name}</td>
                  <td style={{padding:"13px 18px",fontFamily:F.quicksand,fontSize:12,color:C.muted}}>{item.warehouse.split("–")[0].trim()}</td>
                  <td style={{padding:"13px 18px"}}>
                    <div style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:low?C.red:C.forest}}>{item.qty}<span style={{fontSize:11,color:C.muted,fontWeight:400}}> / {item.max} {item.unit}</span></div>
                    <div style={{marginTop:5,width:110,background:C.parchmentDark,borderRadius:20,height:5}}><div style={{width:`${pct}%`,height:"100%",background:barC,borderRadius:20}}/></div>
                  </td>
                  <td style={{padding:"13px 18px"}}><Tag color={C.sage}>{item.category}</Tag></td>
                  <td style={{padding:"13px 18px"}}>{low?<Tag color={C.red} bg={C.redBg}>Low Stock</Tag>:warn?<Tag color={C.amber} bg={C.amberBg}>Warning</Tag>:<Tag color={C.green} bg={C.greenBg}>Normal</Tag>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>

        {S && (
          <div style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:14,padding:"22px",height:"fit-content",maxHeight:"85vh",overflowY:"auto",animation:"fadeIn .15s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontFamily:F.quicksand,fontSize:15,fontWeight:700,color:C.forest}}>{S.name}</div>
                <div style={{fontFamily:F.syne,fontSize:9.5,color:C.muted,marginTop:3}}>{S.sku} · {S.productId}</div>
              </div>
              <button onClick={()=>setSelId(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button>
            </div>
            <div style={{background:S.qty<S.min?C.redBg:C.greenBg,borderRadius:11,padding:"14px 16px",marginBottom:14,border:`1px solid ${S.qty<S.min?"#f5c6c2":"#b7e4ca"}`}}>
              <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:6}}>CURRENT STOCK</div>
              <div style={{fontFamily:F.lora,fontSize:32,fontWeight:700,color:S.qty<S.min?C.red:C.green}}>{S.qty} <span style={{fontSize:14,fontWeight:400}}>{S.unit}</span></div>
              <div style={{marginTop:10,background:"rgba(0,0,0,.08)",borderRadius:20,height:7}}><div style={{width:`${Math.min(100,Math.round(S.qty/S.max*100))}%`,height:"100%",background:S.qty<S.min?C.red:C.sage,borderRadius:20}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontFamily:F.syne,fontSize:9,color:C.muted}}><span>MIN {S.min}</span><span>MAX {S.max}</span></div>
            </div>
            {([["Warehouse",S.warehouse],["Category",S.category]] as [string,string][]).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:C.parchment,borderRadius:9,marginBottom:8}}><span style={{fontFamily:F.syne,fontSize:9,color:C.muted,fontWeight:700}}>{k.toUpperCase()}</span><span style={{fontFamily:F.quicksand,fontSize:12.5,color:C.forest,fontWeight:700}}>{v}</span></div>)}

            {/* Reorder Check */}
            <div style={{background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"12px 14px",marginTop:12,marginBottom:10}}>
              <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:10}}>CHECK REORDER STATUS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <LabeledField label="WAREHOUSE"><FocusSelect value={rWarehouse} onChange={e=>setRWarehouse(e.target.value as City)} style={{...selBase,fontSize:12,padding:"7px 10px"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
                <LabeledField label="IS PROMOTION"><FocusSelect value={rPromo} onChange={e=>setRPromo(Number(e.target.value))} style={{...selBase,fontSize:12,padding:"7px 10px"}}><option value={0}>No</option><option value={1}>Yes</option></FocusSelect></LabeledField>
                {([["CURRENT STOCK",rStock,setRStock],["DAILY SALES",rSales,setRSales],["LEAD TIME (days)",rLead,setRLead],["SUPPLIER DELAY (days)",rDelay,setRDelay]] as [string,number,React.Dispatch<React.SetStateAction<number>>][]).map(([lbl,val,set])=>(
                  <LabeledField key={lbl} label={lbl}><FocusInput type="number" min={0} value={val} onChange={e=>set(Number(e.target.value))} style={smallInp}/></LabeledField>
                ))}
              </div>
              {rErr && <ErrBox msg={rErr}/>}
              {rLoading && <Spinner small/>}
              {rRes && (
                <div style={{background:(rRes.reorder_now??rRes.reorder_needed)?C.redBg:C.greenBg,borderRadius:9,padding:"10px 12px",marginBottom:10,border:`1px solid ${(rRes.reorder_now??rRes.reorder_needed)?"#f5c6c2":"#b7e4ca"}`,animation:(rRes.reorder_now??rRes.reorder_needed)&&rRes.urgency?.toLowerCase()==="critical"?"pulse 1s infinite":"none"}}>
                  <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:(rRes.reorder_now??rRes.reorder_needed)?C.red:C.green,marginBottom:5}}>{(rRes.reorder_now??rRes.reorder_needed)?"⚠ REORDER NEEDED":"✓ STOCK ADEQUATE"}</div>
                  {(rRes.reorder_now??rRes.reorder_needed) && rRes.recommended_order_qty && (
                    <div style={{fontFamily:F.quicksand,fontSize:12.5,color:C.ink}}>Order <b>{rRes.recommended_order_qty.toLocaleString("en-IN")}</b> units</div>
                  )}
                  {rRes.days_until_stockout != null && (
                    <div style={{fontFamily:F.quicksand,fontSize:12,color:(rRes.reorder_now??rRes.reorder_needed)?C.red:C.muted,marginTop:2,fontWeight:(rRes.reorder_now??rRes.reorder_needed)?700:400}}>
                      {(rRes.reorder_now??rRes.reorder_needed)
                        ? `Stockout in ${rRes.days_until_stockout.toFixed(1)} days`
                        : `~${rRes.days_until_stockout.toFixed(1)} days of stock remaining`}
                    </div>
                  )}
                  {rRes.reorder_date && <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:2}}>Reorder by: {rRes.reorder_date}</div>}
                  {rRes.stockout_date && <div style={{fontFamily:F.quicksand,fontSize:12,color:C.red,marginTop:2}}>Stockout by: {rRes.stockout_date}</div>}
                  {rRes.reason && <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.ink,marginTop:6,background:"rgba(0,0,0,.04)",borderRadius:6,padding:"5px 8px"}}>{rRes.reason}</div>}
                  {(rRes.reorder_now??rRes.reorder_needed) && rRes.urgency && (
                    <div style={{marginTop:6}}>
                      <Tag color={rRes.urgency.toLowerCase()==="critical"?C.red:rRes.urgency.toLowerCase()==="high"?C.amber:C.sage}>{rRes.urgency}</Tag>
                    </div>
                  )}
                </div>
              )}
              <Btn onClick={runReorder} disabled={rLoading} style={{width:"100%",justifyContent:"center",padding:"8px 14px",fontSize:12}}>🔄 Check Reorder Status</Btn>
            </div>

            {/* Anomaly Check */}
            <div style={{background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:10}}>CHECK INVENTORY ANOMALY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <LabeledField label="EXPECTED STOCK"><FocusInput type="number" min={0} value={aExpected} onChange={e=>{setAExpected(Number(e.target.value));setARes(null);}} style={smallInp}/></LabeledField>
                <LabeledField label="ACTUAL STOCK"><FocusInput type="number" min={0} value={aActual} onChange={e=>{setAActual(Number(e.target.value));setARes(null);}} style={smallInp}/></LabeledField>
              </div>
              {/* Show live discrepancy hint */}
              {(() => {
                const diff = aExpected - aActual;
                const pct = aExpected > 0 ? Math.abs(diff / aExpected * 100) : 0;
                if (pct === 0) return null;
                const isLoss = diff > 0;
                return (
                  <div style={{fontFamily:F.quicksand,fontSize:11.5,color:isLoss?C.red:C.amber,background:isLoss?C.redBg:C.amberBg,borderRadius:7,padding:"6px 10px",marginBottom:8,border:`1px solid ${isLoss?"#f5c6c2":C.amber+"30"}`}}>
                    {isLoss?"▼":"▲"} {pct.toFixed(1)}% {isLoss?"stock loss":"stock surplus"} ({Math.abs(diff)} units)
                  </div>
                );
              })()}
              {aErr && <ErrBox msg={aErr}/>}
              {aLoading && <Spinner small/>}
              {aRes && (() => {
                // The Isolation Forest uses multivariate analysis — anomaly_score < 0 means anomalous
                // Negative score = anomaly, positive = normal. is_anomaly is the definitive flag.
                const isAnom = aRes.is_anomaly;
                const score = aRes.anomaly_score;
                const discrepancyPct = aExpected > 0 ? Math.abs((aExpected - aActual) / aExpected * 100) : 0;
                return (
                  <div style={{marginBottom:10}}>
                    <div style={{background:isAnom?C.redBg:C.greenBg,borderRadius:9,padding:"10px 12px",border:`1px solid ${isAnom?"#f5c6c2":"#b7e4ca"}`}}>
                      <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:isAnom?C.red:C.green,marginBottom:5}}>{isAnom?"⚠ ANOMALY DETECTED":"✓ INVENTORY NORMAL"}</div>
                      {score!=null && (
                        <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,marginBottom:4}}>
                          Isolation Forest score: <b style={{color:isAnom?C.red:C.green}}>{score.toFixed(3)}</b>
                          <span style={{marginLeft:6,fontSize:10}}>({score < 0 ? "anomalous pattern" : "normal pattern"})</span>
                        </div>
                      )}
                      {aRes.severity && <div style={{marginTop:4,marginBottom:4}}><Tag color={aRes.severity==="critical"?C.red:aRes.severity==="high"?C.amber:C.sage}>{aRes.severity} severity</Tag></div>}
                      {(aRes.alerts??aRes.flags??[]).map((a,i)=><div key={i} style={{fontFamily:F.quicksand,fontSize:11.5,color:C.ink,marginTop:4}}>▸ {a}</div>)}
                    </div>
                    {/* Model caveat when expected==actual but flagged */}
                    {isAnom && discrepancyPct < 5 && (
                      <div style={{fontFamily:F.quicksand,fontSize:11,color:C.amber,background:C.amberBg,borderRadius:7,padding:"6px 10px",marginTop:6,border:`1px solid ${C.amber}30`}}>
                        ℹ Stock count matches, but the model detected an unusual pattern in the stock/sales ratio or consumption rate.
                      </div>
                    )}
                  </div>
                );
              })()}
              <Btn onClick={runAnomaly} disabled={aLoading} style={{width:"100%",justifyContent:"center",padding:"8px 14px",fontSize:12}}>🔍 Check Anomaly</Btn>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,30,30,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(2px)"}}>
          <div style={{background:C.cream,borderRadius:16,padding:"32px",width:460,boxShadow:`0 20px 60px ${C.forest}30`,border:`1px solid ${C.parchmentDark}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}><div style={{fontFamily:F.lora,fontSize:20,fontWeight:700,color:C.forest}}>Add Inventory Item</div><button onClick={()=>setModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {(["SKU Code","Item Name","Warehouse","Category","Quantity","Min Qty","Max Qty","Unit"] as string[]).map(l=>(
                <div key={l}><label style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,display:"block",marginBottom:5,letterSpacing:1}}>{l.toUpperCase()}</label><FocusInput type={["Quantity","Min Qty","Max Qty"].includes(l)?"number":"text"}/></div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:24}}><Btn variant="outline" onClick={()=>setModal(false)} style={{flex:1,justifyContent:"center"}}>Cancel</Btn><Btn onClick={()=>setModal(false)} style={{flex:2,justifyContent:"center"}}>Add Item ✓</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
const DEL_TREND=[{month:"Aug",onTime:88,delayed:12},{month:"Sep",onTime:90,delayed:10},{month:"Oct",onTime:87,delayed:13},{month:"Nov",onTime:92,delayed:8},{month:"Dec",onTime:89,delayed:11},{month:"Jan",onTime:93,delayed:7},{month:"Feb",onTime:91,delayed:9},{month:"Mar",onTime:94,delayed:6}];
const ROUTE_V=[{r:"Mumbai→Delhi",n:340},{r:"Chennai→Hyderabad",n:210},{r:"Delhi→Kolkata",n:180},{r:"Bangalore→Mumbai",n:156},{r:"Pune→Ahmedabad",n:98}];
const CARGO_M=[{name:"Auto Parts",v:28,c:C.forest},{name:"Food Grains",v:22,c:C.sage},{name:"Electronics",v:18,c:C.sageDark},{name:"Textiles",v:16,c:C.amber},{name:"Chemicals",v:10,c:C.red},{name:"Others",v:6,c:C.muted}];
const COST_D=[{month:"Aug",fuel:142,labor:98,misc:34},{month:"Sep",fuel:138,labor:102,misc:30},{month:"Oct",fuel:151,labor:95,misc:38},{month:"Nov",fuel:145,labor:100,misc:32},{month:"Dec",fuel:160,labor:108,misc:40},{month:"Jan",fuel:135,labor:96,misc:28},{month:"Feb",fuel:140,labor:99,misc:31},{month:"Mar",fuel:132,labor:94,misc:27}];
const ANA_K=[
  {l:"On-Time Rate",   v:"94.2%",ch:"+2.1%",up:true,ic:"✅",col:C.green     },
  {l:"Avg Turnaround", v:"3.4 hr",ch:"-18%", up:true,ic:"⏱", col:C.forest   },
  {l:"Delay Rate",     v:"5.8%",  ch:"-3.2%",up:true,ic:"🚦",col:C.amber     },
  {l:"Cost per km",    v:"₹42.6", ch:"-7%",  up:true,ic:"💰",col:C.sage      },
  {l:"Inv. Accuracy",  v:"98.7%", ch:"+0.4%",up:true,ic:"📦",col:C.sageDark  },
  {l:"Driver Util.",   v:"87.3%", ch:"+5.1%",up:true,ic:"🚛",col:C.forestLight},
];

function AnalyticsPage(): React.ReactElement {
  const [period,     setPeriod]     = useState("8M");
  const [fProduct,   setFProduct]   = useState(VALID_PRODUCTS[0]);
  const [fWarehouse, setFWarehouse] = useState<City>("Mumbai");
  const [fDays,      setFDays]      = useState(14);
  const [fPromo,     setFPromo]     = useState(0);
  const [fData,      setFData]      = useState<{day:string;predicted_demand:number;upper_bound:number;lower_bound:number}[]|null>(null);
  const [fLoading,   setFLoading]   = useState(false);
  const [fErr,       setFErr]       = useState("");

  const runForecast = async () => {
    setFErr(""); setFLoading(true); setFData(null);
    try {
      const raw = await callAPI<ForecastResponse|ForecastPoint[]>("/forecast",{
        product_id:fProduct, warehouse:fWarehouse, days:fDays, is_promotion:fPromo
      });
      const arr: ForecastPoint[] = Array.isArray(raw) ? raw : (raw.forecast ?? []);
      const series = arr.map((pt, i) => {
        const base = pt.predicted_demand ?? pt.yhat ?? pt.demand ?? 0;
        const upper = pt.upper_bound ?? pt.yhat_upper ?? base * 1.15;
        const lower = pt.lower_bound ?? pt.yhat_lower ?? base * 0.85;
        return {
          day: pt.date ? new Date(pt.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : `Day ${i+1}`,
          predicted_demand: Math.round(base),
          upper_bound: Math.round(upper),
          lower_bound: Math.max(0, Math.round(lower)),
        };
      });
      setFData(series);
    } catch(e) { setFErr((e as Error).message); }
    finally { setFLoading(false); }
  };

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Analytics & KPIs</div>
          <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>Performance insights across India's supply chain</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["1M","3M","8M","1Y"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"7px 16px",borderRadius:20,border:period===p?"none":`1px solid ${C.parchmentDark}`,background:period===p?C.forest:"transparent",color:period===p?C.cream:C.muted,fontFamily:F.quicksand,fontSize:13,fontWeight:600,cursor:"pointer"}}>{p}</button>)}
          <Btn variant="outline" style={{marginLeft:6}}>📥 Export</Btn>
        </div>
      </div>

      {/* Live Demand Forecast */}
      <Card style={{marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:16}}>Live Demand Forecast</div>
            <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:3}}>Facebook Prophet model (93% accuracy, MAPE 7.08%) — select product, warehouse & horizon</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <FocusSelect value={fProduct} onChange={e=>setFProduct(e.target.value)} style={{...selBase,width:"auto",padding:"8px 12px"}}>{VALID_PRODUCTS.map(p=><option key={p}>{p}</option>)}</FocusSelect>
            <FocusSelect value={fWarehouse} onChange={e=>setFWarehouse(e.target.value as City)} style={{...selBase,width:"auto",padding:"8px 12px"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect>
            <FocusSelect value={fDays} onChange={e=>setFDays(Number(e.target.value))} style={{...selBase,width:"auto",padding:"8px 12px"}}>{[7,14,21,30].map(d=><option key={d} value={d}>{d} days</option>)}</FocusSelect>
            <FocusSelect value={fPromo} onChange={e=>setFPromo(Number(e.target.value))} style={{...selBase,width:"auto",padding:"8px 12px"}}><option value={0}>No Promotion</option><option value={1}>Promotion On</option></FocusSelect>
            <Btn onClick={runForecast} disabled={fLoading} style={{padding:"8px 18px",fontSize:13}}>📈 Run Forecast</Btn>
          </div>
        </div>
        {fErr && <ErrBox msg={fErr} onRetry={runForecast}/>}
        {fLoading && <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner label="Running Prophet forecast…"/></div>}
        {fData && fData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={fData} margin={{top:5,right:20,left:0,bottom:5}}>
                <defs>
                  <linearGradient id="gConf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.sageLight} stopOpacity={.35}/><stop offset="95%" stopColor={C.sageLight} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.sage} stopOpacity={.25}/><stop offset="95%" stopColor={C.sage} stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark}/>
                <XAxis dataKey="day" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(fData.length/7)-1)}/>
                <YAxis tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="upper_bound" name="Upper bound" stroke="none" fill="url(#gConf)" strokeWidth={0}/>
                <Area type="monotone" dataKey="lower_bound" name="Lower bound" stroke="none" fill={C.cream} strokeWidth={0}/>
                <Line type="monotone" dataKey="predicted_demand" name="Forecast" stroke={C.sage} strokeWidth={2.5} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:20,marginTop:8,justifyContent:"center"}}>
              {([["Forecast",C.sage],["Confidence Band",C.sageLight]] as [string,string][]).map(([l,co])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:6,fontFamily:F.quicksand,fontSize:11,color:C.muted}}>
                  <span style={{width:20,height:3,background:co,display:"inline-block",borderRadius:2}}/>{l}
                </span>
              ))}
            </div>
          </>
        )}
        {!fData && !fLoading && !fErr && (
          <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",background:C.parchment,borderRadius:10,border:`1px dashed ${C.parchmentDark}`}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>📈</div><div style={{fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Select options above and click Run Forecast</div></div>
          </div>
        )}
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:22}}>
        {ANA_K.map(k=>(
          <Card key={k.l} style={{padding:"14px 16px",borderTop:`2px solid ${k.col}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
              <div style={{width:32,height:32,background:`${k.col}15`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{k.ic}</div>
              <Tag color={k.up?C.green:C.red} bg={k.up?C.greenBg:C.redBg}>{k.ch}</Tag>
            </div>
            <div style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:C.forest}}>{k.v}</div>
            <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,marginTop:3}}>{k.l}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.8fr 1fr",gap:20,marginBottom:20}}>
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:16,marginBottom:3}}>Delivery Performance Trend</div>
          <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginBottom:18}}>On-time vs delayed (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={DEL_TREND}>
              <defs>
                <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.sage} stopOpacity={.25}/><stop offset="95%" stopColor={C.sage} stopOpacity={0}/></linearGradient>
                <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={.12}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark}/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false} domain={[0,100]}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="onTime" name="On-Time" stroke={C.sage} strokeWidth={2.5} fill="url(#gO)" dot={{fill:C.sage,r:4}}/>
              <Area type="monotone" dataKey="delayed" name="Delayed" stroke={C.red} strokeWidth={2} fill="url(#gDel)" dot={{fill:C.red,r:3}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:16,marginBottom:3}}>Cargo Type Mix</div>
          <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginBottom:10}}>Distribution by category</div>
          <ResponsiveContainer width="100%" height={138}><PieChart><Pie data={CARGO_M} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="v">{CARGO_M.map((c,i)=><Cell key={i} fill={c.c}/>)}</Pie><Tooltip formatter={(v:number)=>`${v}%`}/></PieChart></ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 10px",marginTop:6}}>{CARGO_M.map(c=><div key={c.name} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:c.c,flexShrink:0}}/><span style={{fontFamily:F.quicksand,fontSize:11,color:C.muted}}>{c.name}</span><span style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginLeft:"auto"}}>{c.v}%</span></div>)}</div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:16,marginBottom:3}}>Top Routes by Volume</div>
          <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginBottom:18}}>Shipments this month</div>
          {ROUTE_V.map((r,i)=><div key={r.r} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontFamily:F.quicksand,fontSize:12.5,fontWeight:600,color:C.ink}}>{r.r}</span><span style={{fontFamily:F.syne,fontSize:11,fontWeight:700,color:[C.forest,C.sage,C.sageDark,C.amber,C.muted][i]}}>{r.n}</span></div><div style={{background:C.parchmentDark,borderRadius:20,height:6}}><div style={{width:`${Math.round(r.n/ROUTE_V[0].n*100)}%`,height:"100%",background:[C.forest,C.sage,C.sageDark,C.amber,C.muted][i],borderRadius:20}}/></div></div>)}
        </Card>
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:16,marginBottom:3}}>Monthly Cost Breakdown</div>
          <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginBottom:16}}>Fuel / Labor / Misc (₹ thousands)</div>
          <ResponsiveContainer width="100%" height={172}><BarChart data={COST_D}><CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark}/><XAxis dataKey="month" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="fuel" name="Fuel" stackId="a" fill={C.forest}/><Bar dataKey="labor" name="Labor" stackId="a" fill={C.sage}/><Bar dataKey="misc" name="Misc" stackId="a" fill={C.sageLight} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:8}}>{([["Fuel",C.forest],["Labor",C.sage],["Misc",C.sageLight]] as [string,string][]).map(([l,co])=><span key={l} style={{display:"flex",alignItems:"center",gap:5,fontFamily:F.quicksand,fontSize:11,color:C.muted}}><span style={{width:10,height:10,borderRadius:2,background:co,display:"inline-block"}}/>{l}</span>)}</div>
        </Card>
      </div>
    </div>
  );
}

// ─── LAST MILE PAGE ───────────────────────────────────────────────────────────
function LastMilePage(): React.ReactElement {
  const [warehouse, setWarehouse] = useState<City>("Mumbai");
  const [stops,     setStops]     = useState<City[]>([]);
  const [vehicle,   setVehicle]   = useState<typeof VALID_VEHICLES[number]>("Truck");
  const [traffic,   setTraffic]   = useState<typeof VALID_TRAFFIC[number]>("Medium");
  const [result,    setResult]    = useState<RouteResult|null>(null);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");

  const toggleStop = (city: City) => {
    if (city===warehouse) return;
    setStops(prev=>prev.includes(city)?prev.filter(c=>c!==city):[...prev,city]);
    setResult(null);
  };

  const runRoute = async () => {
    if (stops.length<1){setErr("Please select at least 1 delivery stop.");return;}
    setErr(""); setLoading(true); setResult(null);
    try {
      // CORRECT param: delivery_stops (comma-joined, no spaces)
      const d = await callAPI<RouteResult>("/route",{
        warehouse, delivery_stops:stops.join(","),
        vehicle_type:vehicle, traffic_condition:traffic
      });
      setResult(d);
    } catch(e){setErr((e as Error).message);}
    finally{setLoading(false);}
  };

  // Parse optimized_route — API returns string "Mumbai → Pune → Hyderabad → Ahmedabad"
  // Filter to only warehouse + selected stops (strip return-to-warehouse leg if present)
  const validCities = new Set([warehouse, ...stops]);
  const routeArr: string[] = (() => {
    if (!result?.optimized_route) return [];
    const raw = Array.isArray(result.optimized_route)
      ? result.optimized_route
      : (result.optimized_route as string).split(" → ").map(s=>s.trim()).filter(Boolean);
    return raw.filter(city => validCities.has(city as City));
  })();

  // API uses route_details not legs, fuel_cost_inr not cost_inr
  const legs: RouteLeg[] = result?.route_details ?? [];

  // Totals — all confirmed field names from API response
  const totalDist = result?.total_distance_km ?? 0;
  const totalCost = result?.total_fuel_cost_inr ?? 0;
  // estimated_time is a string "41h 5m" — display as-is, no conversion needed
  const estimatedTimeStr = result?.estimated_time ?? "";

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Last Mile Optimizer</div>
        <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>AI route optimization using Dijkstra's algorithm across India's city network</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:20}}>
        <Card>
          <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:16,letterSpacing:1}}>ROUTE CONFIGURATION</div>

          <div style={{marginBottom:14}}>
            <LabeledField label="ORIGIN WAREHOUSE">
              <FocusSelect value={warehouse} onChange={e=>{setWarehouse(e.target.value as City); setStops(prev=>prev.filter(c=>c!==e.target.value));}} style={{...selBase,width:"100%"}}>
                {ALL_CITIES.map(c=><option key={c}>{c}</option>)}
              </FocusSelect>
            </LabeledField>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,display:"block",marginBottom:8,letterSpacing:1}}>DELIVERY STOPS ({stops.length} selected)</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ALL_CITIES.filter(c=>c!==warehouse).map(c=>{
                const isSel=stops.includes(c);
                return <div key={c} onClick={()=>toggleStop(c)} style={{padding:"5px 12px",borderRadius:20,border:isSel?`2px solid ${C.sage}`:`1px solid ${C.parchmentDark}`,background:isSel?`${C.sage}18`:C.parchment,fontFamily:F.quicksand,fontSize:12,fontWeight:isSel?700:400,color:isSel?C.forest:C.muted,cursor:"pointer",transition:"all .15s"}}>{c}</div>;
              })}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
            <LabeledField label="VEHICLE TYPE">
              <FocusSelect value={vehicle} onChange={e=>setVehicle(e.target.value as typeof VALID_VEHICLES[number])} style={{...selBase,width:"100%"}}>
                {VALID_VEHICLES.map(v=><option key={v}>{v}</option>)}
              </FocusSelect>
            </LabeledField>
            <LabeledField label="TRAFFIC">
              <FocusSelect value={traffic} onChange={e=>setTraffic(e.target.value as typeof VALID_TRAFFIC[number])} style={{...selBase,width:"100%"}}>
                {VALID_TRAFFIC.map(t=><option key={t}>{t}</option>)}
              </FocusSelect>
            </LabeledField>
          </div>

          {err && <ErrBox msg={err}/>}
          <Btn onClick={runRoute} disabled={loading||stops.length<1} style={{width:"100%",justifyContent:"center",marginTop:10}}>
            {loading?"Optimizing…":"🗺 Optimize Route"}
          </Btn>
          {loading && <div style={{marginTop:12}}><Spinner label="Running Dijkstra route optimization…"/></div>}
        </Card>

        <div>
          {!result && !loading && (
            <Card style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:14}}>🗺</div><div style={{fontFamily:F.lora,fontSize:20,fontWeight:700,color:C.forest,marginBottom:8}}>Configure your route</div><div style={{fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Select a warehouse, add stops, and click Optimize Route</div></div>
            </Card>
          )}
          {result && (
            <div style={{animation:"fadeIn .2s ease"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:16}}>
                {([
                  ["📍","Total Distance", totalDist > 0 ? `${totalDist.toLocaleString("en-IN")} km` : "—", C.forest],
                  ["💰","Fuel Cost",       totalCost > 0 ? `₹${totalCost.toLocaleString("en-IN",{maximumFractionDigits:0})}` : "—", C.blue],
                  ["⏱","Est. Time",        estimatedTimeStr || "—", C.sage],
                ] as [string,string,string,string][]).map(([ic,lb,vl,co])=>(
                  <div key={lb} style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderTop:`3px solid ${co}`,borderRadius:12,padding:"16px 18px"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><span style={{fontSize:18}}>{ic}</span><span style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,letterSpacing:1}}>{lb.toUpperCase()}</span></div>
                    <div style={{fontFamily:F.lora,fontSize:24,fontWeight:700,color:co}}>{vl}</div>
                  </div>
                ))}
              </div>

              {routeArr.length>0 && (
                <Card style={{marginBottom:14}}>
                  <div style={{fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.forest,marginBottom:12}}>OPTIMISED ROUTE</div>
                  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>
                    {routeArr.map((city,i)=>(
                      <React.Fragment key={`${city}-${i}`}>
                        <div style={{padding:"6px 14px",borderRadius:20,background:i===0?C.forest:i===routeArr.length-1?C.green:`${C.sage}20`,color:i===0||i===routeArr.length-1?C.cream:C.forest,fontFamily:F.quicksand,fontSize:12.5,fontWeight:700,border:`1.5px solid ${i===0?C.forest:i===routeArr.length-1?C.green:C.sage}`}}>{city}</div>
                        {i<routeArr.length-1&&<span style={{color:C.sage,fontSize:16,fontWeight:700}}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </Card>
              )}

              {legs.length>0 && (
                <Card style={{padding:0,overflow:"hidden"}}>
                  <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.parchmentDark}`}}><div style={{fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.forest}}>ROUTE LEGS BREAKDOWN</div></div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:C.parchment}}>{["From","To","Distance","Fuel Cost"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 16px",fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,letterSpacing:.8}}>{h}</th>)}</tr></thead>
                    <tbody>{legs.map((leg,i)=>{
                      const from = leg.from ?? "";
                      const to   = leg.to ?? "";
                      const dist = leg.distance_km ?? 0;
                      const cost = leg.fuel_cost_inr ?? 0;   // confirmed field name
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.parchment}`}}>
                          <td style={{padding:"11px 16px",fontFamily:F.quicksand,fontSize:12.5,fontWeight:600,color:C.ink}}>{from}</td>
                          <td style={{padding:"11px 16px",fontFamily:F.quicksand,fontSize:12.5,color:C.ink}}>{to}</td>
                          <td style={{padding:"11px 16px",fontFamily:F.quicksand,fontSize:12.5,color:C.forest}}>{dist > 0 ? `${dist} km` : "—"}</td>
                          <td style={{padding:"11px 16px",fontFamily:F.quicksand,fontSize:12.5,color:C.blue}}>{cost > 0 ? `₹${cost.toLocaleString("en-IN",{maximumFractionDigits:0})}` : "—"}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ALERTS / ANOMALY PAGE ────────────────────────────────────────────────────
function AlertsPage(): React.ReactElement {
  const [tab, setTab] = useState<"shipment"|"inventory"|"route">("shipment");

  // Shipment anomaly — /anomaly/shipment
  // Correct params: origin, destination, vehicle_type, weather_condition, traffic_condition,
  //                 departure_hour, actual_cost, actual_duration_hrs, weight_kg
  const [sOrigin,  setSOrigin]  = useState<City>("Mumbai");
  const [sDest,    setSDest]    = useState<City>("Pune");
  const [sVehicle, setSVehicle] = useState<typeof VALID_VEHICLES[number]>("Truck");
  const [sWeather, setSWeather] = useState<typeof VALID_WEATHER[number]>("Clear");
  const [sTraffic, setSTraffic] = useState<typeof VALID_TRAFFIC[number]>("Low");
  const [sHour,    setSHour]    = useState(2);
  const [sCost,    setSCost]    = useState(150000);
  const [sDurHrs,  setSdurHrs]  = useState(48);
  const [sWeight,  setSWeight]  = useState(500);
  const [sResult,  setSResult]  = useState<AnomalyResponse|null>(null);
  const [sLoading, setSLoading] = useState(false);
  const [sErr,     setSErr]     = useState("");

  // Inventory anomaly — /anomaly/inventory
  // Correct params: product_id, warehouse, current_stock, daily_sales, expected_stock, actual_stock
  const [iProduct,   setIProduct]   = useState(VALID_PRODUCTS[0]);
  const [iWarehouse, setIWarehouse] = useState<City>("Mumbai");
  const [iCurr,      setICurr]      = useState(500);
  const [iSales,     setISales]     = useState(50);
  const [iExpected,  setIExpected]  = useState(500);
  const [iActual,    setIActual]    = useState(200);
  const [iResult,    setIResult]    = useState<AnomalyResponse|null>(null);
  const [iLoading,   setILoading]   = useState(false);
  const [iErr,       setIErr]       = useState("");

  // Route anomaly — /anomaly/route
  // Correct params: origin, destination, vehicle_type, traffic_condition,
  //                 actual_distance_km, actual_cost
  const [rOrigin,  setROrigin]  = useState<City>("Mumbai");
  const [rDest,    setRDest]    = useState<City>("Pune");
  const [rVehicle, setRVehicle] = useState<typeof VALID_VEHICLES[number]>("Truck");
  const [rTraffic, setRTraffic] = useState<typeof VALID_TRAFFIC[number]>("Low");
  const [rActDist, setRActDist] = useState(800);
  const [rActCost, setRActCost] = useState(50000);
  const [rResult,  setRResult]  = useState<AnomalyResponse|null>(null);
  const [rLoading, setRLoading] = useState(false);
  const [rErr,     setRErr]     = useState("");

  const runShipmentAnomaly = async () => {
    setSErr(""); setSLoading(true); setSResult(null);
    try {
      const d = await callAPI<AnomalyResponse>("/anomaly/shipment",{
        origin:sOrigin, destination:sDest, vehicle_type:sVehicle,
        weather_condition:sWeather, traffic_condition:sTraffic,
        departure_hour:sHour, actual_cost:sCost,
        actual_duration_hrs:sDurHrs, weight_kg:sWeight
      });
      setSResult(d);
    } catch(e){setSErr((e as Error).message);}
    finally{setSLoading(false);}
  };

  const runInventoryAnomaly = async () => {
    setIErr(""); setILoading(true); setIResult(null);
    try {
      const d = await callAPI<AnomalyResponse>("/anomaly/inventory",{
        product_id:iProduct, warehouse:iWarehouse,
        current_stock:iCurr, daily_sales:iSales,
        expected_stock:iExpected, actual_stock:iActual
      });
      setIResult(d);
    } catch(e){setIErr((e as Error).message);}
    finally{setILoading(false);}
  };

  const runRouteAnomaly = async () => {
    setRErr(""); setRLoading(true); setRResult(null);
    try {
      const d = await callAPI<AnomalyResponse>("/anomaly/route",{
        origin:rOrigin, destination:rDest, vehicle_type:rVehicle,
        traffic_condition:rTraffic,
        actual_distance_km:rActDist, actual_cost:rActCost
      });
      setRResult(d);
    } catch(e){setRErr((e as Error).message);}
    finally{setRLoading(false);}
  };

  // ── Alert string parser — based on real API responses ──────────────────────
  // Real patterns:
  //   "Cost is suspiciously low — 44.6% below expected"
  //   "Cost overrun: 177.8% above expected ₹1,800"
  //   "Unusual departure time: 2.00"
  //   "Unusual inventory pattern detected"
  //   "Route deviation: actual distance is 233.3% longer than expected 150km"
  interface ParsedAlert {
    icon: string; label: string;
    deviationPct?: number;
    direction?: "below"|"above"|"longer"|"shorter";
    expectedVal?: string;
    raw: string;
    kind: "deviation"|"time"|"plain";
  }

  function parseAlert(raw: string): ParsedAlert {
    // "Cost overrun: 177.8% above expected ₹1,800"
    const overrunPat = /^([\w\s]+?):\s*([\d,.]+)%\s+(above|below)\s+expected\s*([\S]+)/i;
    const m1 = raw.match(overrunPat);
    if (m1) {
      const field = m1[1].trim(); const pct = parseFloat(m1[2].replace(/,/g,""));
      const dir = m1[3].toLowerCase() as "above"|"below";
      return { icon: field.toLowerCase().includes("cost")?"💰": field.toLowerCase().includes("dist")?"📍":"⚠",
        label: field, deviationPct: dir==="below"?-pct:pct, direction: dir,
        expectedVal: m1[4].trim(), raw, kind:"deviation" };
    }
    // "Cost is suspiciously low — 44.6% below expected"
    const suspPat = /^([\w\s]+?)\s+is\s+suspiciously\s+\w+\s+[—–-]\s*([\d,.]+)%\s+(below|above)\s+expected/i;
    const m2 = raw.match(suspPat);
    if (m2) {
      const field = m2[1].trim(); const pct = parseFloat(m2[2].replace(/,/g,""));
      const dir = m2[3].toLowerCase() as "above"|"below";
      return { icon: field.toLowerCase().includes("cost")?"💰": field.toLowerCase().includes("dur")?"⏱":"⚠",
        label: field, deviationPct: dir==="below"?-pct:pct, direction: dir, raw, kind:"deviation" };
    }
    // "Route deviation: actual distance is X% longer than expected Ykm"
    const routePat = /route deviation.*?([\d,.]+)%\s+(longer|shorter).*?expected\s*([\d,.]+\s*\S+)/i;
    const m3 = raw.match(routePat);
    if (m3) {
      const pct = parseFloat(m3[1].replace(/,/g,"")); const dir = m3[2].toLowerCase() as "longer"|"shorter";
      return { icon:"🗺", label:"Route distance", deviationPct: dir==="longer"?pct:-pct,
        direction: dir, expectedVal: m3[3].trim(), raw, kind:"deviation" };
    }
    // "Unusual departure time: 2.00"
    const timePat = /unusual departure time[:\s]+([\d.:]+)/i;
    const m4 = raw.match(timePat);
    if (m4) {
      const t = m4[1].includes(":") ? m4[1] : m4[1].replace(/(\d+)\.(\d+)/, (_,h,m)=>`${h.padStart(2,"0")}:${m.padEnd(2,"0")}`);
      return { icon:"🕐", label:"Departure time", expectedVal: t, raw, kind:"time" };
    }
    return { icon:"⚠", label: raw, raw, kind:"plain" };
  }

  // Extended anomaly type to pick up structured fields from real API responses
  interface AnomalyRich extends AnomalyResponse {
    expected_cost?:number; cost_deviation_pct?:number;
    expected_duration_hrs?:number; time_deviation_pct?:number;
    actual_cost?:number; actual_duration_hrs?:number;
    expected_distance_km?:number; distance_deviation_pct?:number;
    actual_distance_km?:number; distance_deviation_km?:number;
    expected_cost_inr?:number; actual_cost_inr?:number;
    stock_difference?:number; loss_percentage?:number;
    recommendation?:string;
  }

  const ResultBanner = ({ result }: { result: AnomalyResponse }) => {
    const r        = result as AnomalyRich;
    const isAnom   = r.is_anomaly;
    const severity = r.severity ?? r.risk_level ?? "Normal";
    const score    = r.anomaly_score;
    const rawAlerts= r.alerts ?? r.flags ?? [];
    const parsed   = rawAlerts.map(parseAlert);

    // Build structured metric rows from top-level response fields (richest source of truth)
    interface MetricRow { icon:string; label:string; actual:string; expected:string; deviation:number; }
    const metrics: MetricRow[] = [];
    if (r.actual_cost != null && r.expected_cost != null)
      metrics.push({ icon:"💰", label:"Shipment Cost",
        actual:`₹${r.actual_cost.toLocaleString("en-IN",{maximumFractionDigits:0})}`,
        expected:`₹${r.expected_cost.toLocaleString("en-IN",{maximumFractionDigits:0})}`,
        deviation: r.cost_deviation_pct ?? 0 });
    if (r.actual_duration_hrs != null && r.expected_duration_hrs != null)
      metrics.push({ icon:"⏱", label:"Transit Duration",
        actual:`${r.actual_duration_hrs} hrs`, expected:`${r.expected_duration_hrs} hrs`,
        deviation: r.time_deviation_pct ?? 0 });
    if (r.actual_distance_km != null && r.expected_distance_km != null)
      metrics.push({ icon:"📍", label:"Route Distance",
        actual:`${r.actual_distance_km} km`, expected:`${r.expected_distance_km} km`,
        deviation: r.distance_deviation_pct ?? 0 });
    if (r.actual_cost_inr != null && r.expected_cost_inr != null)
      metrics.push({ icon:"💰", label:"Route Cost",
        actual:`₹${r.actual_cost_inr.toLocaleString("en-IN",{maximumFractionDigits:0})}`,
        expected:`₹${r.expected_cost_inr.toLocaleString("en-IN",{maximumFractionDigits:0})}`,
        deviation: r.cost_deviation_pct ?? 0 });
    if (r.stock_difference != null && r.stock_difference !== 0)
      metrics.push({ icon:"📦", label:"Stock Difference",
        actual: r.stock_difference < 0 ? String(r.stock_difference) : `+${r.stock_difference}`,
        expected:"0", deviation: r.loss_percentage ?? 0 });

    const hasMetrics = metrics.length > 0;
    const hasAlerts  = parsed.length > 0;

    return (
      <div style={{animation:"fadeIn .2s ease"}}>
        {/* Status header */}
        <div style={{background:isAnom?C.redBg:C.greenBg,border:`1px solid ${isAnom?"#f5c6c2":"#b7e4ca"}`,borderRadius:12,padding:"20px",marginBottom:(hasMetrics||hasAlerts)?12:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontFamily:F.lora,fontSize:24,fontWeight:700,color:isAnom?C.red:C.green}}>
              {isAnom?"⚠ Anomaly Detected":"✓ Normal — No Anomaly"}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {severity && severity.toLowerCase()!=="normal" && (
                <Tag color={severity.toLowerCase()==="critical"?C.red:severity.toLowerCase()==="high"?C.amber:C.sage}
                     bg={severity.toLowerCase()==="critical"?C.redBg:severity.toLowerCase()==="high"?C.amberBg:`${C.sage}18`}>
                  {severity}
                </Tag>
              )}
              {score!=null&&(
                <div style={{fontFamily:F.quicksand,fontSize:11,color:C.muted,background:C.parchment,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.parchmentDark}`}}>
                  IF score: <b style={{color:isAnom?C.red:C.green,fontFamily:F.syne}}>{Number(score).toFixed(4)}</b>
                </div>
              )}
            </div>
          </div>
          {r.recommendation && (
            <div style={{fontFamily:F.quicksand,fontSize:13,color:C.ink,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"7px 10px",marginTop:6}}>
              {r.recommendation}
            </div>
          )}
          {isAnom && !hasMetrics && !hasAlerts && (
            <div style={{fontFamily:F.quicksand,fontSize:12,color:C.muted,marginTop:6}}>
              The Isolation Forest model detected a statistically unusual pattern across the input combination.
            </div>
          )}
        </div>

        {/* Structured metric cards — actual vs expected with deviation bar */}
        {hasMetrics && (
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:hasAlerts?10:0}}>
            <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,letterSpacing:1}}>DEVIATION BREAKDOWN</div>
            {metrics.map((m,i)=>{
              const isOver  = m.deviation > 0;
              const isUnder = m.deviation < 0;
              const absDev  = Math.abs(m.deviation);
              // Use ratio for large deviations (≥50%), ± for small ones
              const devDisplay = absDev >= 50
                ? `${(absDev/100+1).toFixed(1)}×`
                : `${isOver?"+":""}${m.deviation.toFixed(1)}%`;
              const devColor = isOver ? C.red : isUnder ? C.amber : C.green;
              const devBg    = isOver ? C.redBg : isUnder ? C.amberBg : C.greenBg;
              return (
                <div key={i} style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:34,height:34,borderRadius:8,background:`${devColor}14`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{m.icon}</div>
                      <span style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:C.forest}}>{m.label}</span>
                    </div>
                    <div style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:devColor,background:devBg,padding:"4px 12px",borderRadius:8}}>
                      {devDisplay}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginBottom:8}}>
                    <div style={{flex:1,background:devBg,borderRadius:7,padding:"7px 10px",border:`1px solid ${devColor}25`}}>
                      <div style={{fontFamily:F.syne,fontSize:8,color:devColor,fontWeight:700,marginBottom:2}}>ACTUAL</div>
                      <div style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:devColor}}>{m.actual}</div>
                    </div>
                    <div style={{flex:1,background:C.greenBg,borderRadius:7,padding:"7px 10px",border:`1px solid ${C.green}25`}}>
                      <div style={{fontFamily:F.syne,fontSize:8,color:C.green,fontWeight:700,marginBottom:2}}>EXPECTED</div>
                      <div style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:C.green}}>{m.expected}</div>
                    </div>
                  </div>
                  {absDev > 0 && (
                    <>
                      <div style={{background:C.parchmentDark,borderRadius:20,height:4,overflow:"hidden"}}>
                        <div style={{width:`${Math.min(100,absDev/2)}%`,height:"100%",background:devColor,borderRadius:20}}/>
                      </div>
                      <div style={{fontFamily:F.quicksand,fontSize:10,color:C.muted,marginTop:3}}>
                        {isOver?`${absDev.toFixed(1)}% over baseline`:isUnder?`${absDev.toFixed(1)}% under baseline`:"Within baseline"}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Parsed alert strings when no structured data available */}
        {!hasMetrics && hasAlerts && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,letterSpacing:1}}>FLAGS</div>
            {parsed.map((p,i)=>(
              <div key={i} style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:10,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:34,height:34,borderRadius:8,background:`${C.red}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{p.icon}</div>
                {p.kind==="deviation" && p.deviationPct!=null ? (
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:4,textTransform:"uppercase"}}>{p.label}</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                      <span style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:p.deviationPct>0?C.red:C.amber}}>
                        {Math.abs(p.deviationPct)>=50?(Math.abs(p.deviationPct)/100+1).toFixed(1)+"×":`${p.deviationPct>0?"+":""}${p.deviationPct.toFixed(1)}%`}
                      </span>
                      <span style={{fontFamily:F.quicksand,fontSize:12,color:C.muted}}>
                        {p.direction} expected{p.expectedVal?` (expected: ${p.expectedVal})`:""}
                      </span>
                    </div>
                  </div>
                ) : p.kind==="time" ? (
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.muted,marginBottom:4}}>DEPARTURE TIME</div>
                    <div style={{fontFamily:F.lora,fontSize:22,fontWeight:700,color:C.amber}}>{p.expectedVal}</div>
                    <div style={{fontFamily:F.quicksand,fontSize:11,color:C.muted,marginTop:3}}>Normal window: 06:00 – 22:00</div>
                  </div>
                ) : (
                  <div style={{flex:1,fontFamily:F.quicksand,fontSize:13,color:C.ink,paddingTop:6}}>{p.label}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Anomaly Monitor</div>
          <div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>Isolation Forest–powered anomaly detection across shipments, inventory & routes</div>
        </div>
        <Tag color={C.red} bg={C.redBg}>3 Active Anomalies</Tag>
      </div>

      <div style={{display:"flex",gap:2,marginBottom:22,background:C.white,borderRadius:11,padding:4,border:`1px solid ${C.parchmentDark}`,width:"fit-content"}}>
        {([["shipment","📦 Shipment Fraud"],["inventory","🏭 Inventory"],["route","🛣 Route Deviation"]] as [typeof tab,string][]).map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"9px 22px",borderRadius:8,border:"none",background:tab===id?C.forest:"transparent",color:tab===id?C.cream:C.muted,fontFamily:F.quicksand,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="shipment" && (
        <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20}}>
          <Card>
            <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:16}}>SHIPMENT ANOMALY INPUTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <LabeledField label="ORIGIN"><FocusSelect value={sOrigin} onChange={e=>setSOrigin(e.target.value as City)} style={{...selBase,width:"100%"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="DESTINATION"><FocusSelect value={sDest} onChange={e=>setSDest(e.target.value as City)} style={{...selBase,width:"100%"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="VEHICLE TYPE"><FocusSelect value={sVehicle} onChange={e=>setSVehicle(e.target.value as typeof VALID_VEHICLES[number])} style={{...selBase,width:"100%"}}>{VALID_VEHICLES.map(v=><option key={v}>{v}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="WEATHER CONDITION"><FocusSelect value={sWeather} onChange={e=>setSWeather(e.target.value as typeof VALID_WEATHER[number])} style={{...selBase,width:"100%"}}>{VALID_WEATHER.map(w=><option key={w}>{w}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="TRAFFIC CONDITION"><FocusSelect value={sTraffic} onChange={e=>setSTraffic(e.target.value as typeof VALID_TRAFFIC[number])} style={{...selBase,width:"100%"}}>{VALID_TRAFFIC.map(t=><option key={t}>{t}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="DEPARTURE HOUR (0–23)"><FocusInput type="number" min={0} max={23} value={sHour} onChange={e=>setSHour(Number(e.target.value))}/></LabeledField>
              <LabeledField label="ACTUAL COST (₹)"><FocusInput type="number" min={0} value={sCost} onChange={e=>setSCost(Number(e.target.value))}/></LabeledField>
              <LabeledField label="ACTUAL DURATION (hrs)"><FocusInput type="number" min={0} step={0.5} value={sDurHrs} onChange={e=>setSdurHrs(Number(e.target.value))}/></LabeledField>
              <LabeledField label="WEIGHT (kg)"><FocusInput type="number" min={0} value={sWeight} onChange={e=>setSWeight(Number(e.target.value))}/></LabeledField>
            </div>
            {sErr && <div style={{marginTop:12}}><ErrBox msg={sErr}/></div>}
            {sLoading && <div style={{marginTop:12}}><Spinner label="Analyzing shipment…"/></div>}
            <div style={{marginTop:16}}>
              <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,background:C.amberBg,border:`1px solid ${C.amber}30`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>
                💡 <b>Demo:</b> Hour=2, Cost=₹150,000, Duration=48hrs on Mumbai→Pune → Critical result with 3 alerts
              </div>
              <Btn onClick={runShipmentAnomaly} disabled={sLoading} style={{width:"100%",justifyContent:"center"}}>🔍 Detect Shipment Anomaly</Btn>
            </div>
          </Card>
          <div>{sResult ? <ResultBanner result={sResult}/> : <Card style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📦</div><div style={{fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Configure inputs and run detection</div></div></Card>}</div>
        </div>
      )}

      {tab==="inventory" && (
        <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20}}>
          <Card>
            <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:16}}>INVENTORY ANOMALY INPUTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <LabeledField label="PRODUCT"><FocusSelect value={iProduct} onChange={e=>setIProduct(e.target.value)} style={{...selBase,width:"100%"}}>{VALID_PRODUCTS.map(p=><option key={p}>{p}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="WAREHOUSE"><FocusSelect value={iWarehouse} onChange={e=>setIWarehouse(e.target.value as City)} style={{...selBase,width:"100%"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="CURRENT STOCK"><FocusInput type="number" min={0} value={iCurr} onChange={e=>setICurr(Number(e.target.value))}/></LabeledField>
              <LabeledField label="DAILY SALES"><FocusInput type="number" min={0} value={iSales} onChange={e=>setISales(Number(e.target.value))}/></LabeledField>
              <LabeledField label="EXPECTED STOCK"><FocusInput type="number" min={0} value={iExpected} onChange={e=>setIExpected(Number(e.target.value))}/></LabeledField>
              <LabeledField label="ACTUAL STOCK"><FocusInput type="number" min={0} value={iActual} onChange={e=>setIActual(Number(e.target.value))}/></LabeledField>
            </div>
            {iErr && <div style={{marginTop:12}}><ErrBox msg={iErr}/></div>}
            {iLoading && <div style={{marginTop:12}}><Spinner label="Analyzing inventory…"/></div>}
            <div style={{marginTop:16}}>
              <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,background:C.amberBg,border:`1px solid ${C.amber}30`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>
                💡 <b>Demo:</b> Expected=500, Actual=200 → large discrepancy flags anomaly
              </div>
              <Btn onClick={runInventoryAnomaly} disabled={iLoading} style={{width:"100%",justifyContent:"center"}}>🔍 Detect Inventory Anomaly</Btn>
            </div>
          </Card>
          <div>{iResult ? <ResultBanner result={iResult}/> : <Card style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🏭</div><div style={{fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Configure inputs and run detection</div></div></Card>}</div>
        </div>
      )}

      {tab==="route" && (
        <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20}}>
          <Card>
            <div style={{fontFamily:F.syne,fontSize:10,fontWeight:700,color:C.forest,marginBottom:16}}>ROUTE ANOMALY INPUTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <LabeledField label="ORIGIN"><FocusSelect value={rOrigin} onChange={e=>setROrigin(e.target.value as City)} style={{...selBase,width:"100%"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="DESTINATION"><FocusSelect value={rDest} onChange={e=>setRDest(e.target.value as City)} style={{...selBase,width:"100%"}}>{ALL_CITIES.map(c=><option key={c}>{c}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="VEHICLE TYPE"><FocusSelect value={rVehicle} onChange={e=>setRVehicle(e.target.value as typeof VALID_VEHICLES[number])} style={{...selBase,width:"100%"}}>{VALID_VEHICLES.map(v=><option key={v}>{v}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="TRAFFIC CONDITION"><FocusSelect value={rTraffic} onChange={e=>setRTraffic(e.target.value as typeof VALID_TRAFFIC[number])} style={{...selBase,width:"100%"}}>{VALID_TRAFFIC.map(t=><option key={t}>{t}</option>)}</FocusSelect></LabeledField>
              <LabeledField label="ACTUAL DISTANCE (km)"><FocusInput type="number" min={0} value={rActDist} onChange={e=>setRActDist(Number(e.target.value))}/></LabeledField>
              <LabeledField label="ACTUAL COST (₹)"><FocusInput type="number" min={0} value={rActCost} onChange={e=>setRActCost(Number(e.target.value))}/></LabeledField>
            </div>
            {rErr && <div style={{marginTop:12}}><ErrBox msg={rErr}/></div>}
            {rLoading && <div style={{marginTop:12}}><Spinner label="Analyzing route…"/></div>}
            <div style={{marginTop:16}}>
              <div style={{fontFamily:F.quicksand,fontSize:11.5,color:C.muted,background:C.amberBg,border:`1px solid ${C.amber}30`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>
                💡 <b>Demo:</b> Mumbai→Pune, Distance=800km (actual ~155km), Cost=₹50,000 → route fraud flagged
              </div>
              <Btn onClick={runRouteAnomaly} disabled={rLoading} style={{width:"100%",justifyContent:"center"}}>🔍 Detect Route Anomaly</Btn>
            </div>
          </Card>
          <div>{rResult ? <ResultBanner result={rResult}/> : <Card style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🛣</div><div style={{fontFamily:F.quicksand,fontSize:13,color:C.muted}}>Configure inputs and run detection</div></div></Card>}</div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
const ALL_USERS: AdminUser[] = [
  {id:"USR-001",name:"Arjun Sharma",   email:"arjun@scs.in",       role:"admin",            company:"SCS HQ – Delhi",        status:"active",  lastLogin:"Today 09:30",av:"A"},
  {id:"USR-002",name:"Priya Menon",    email:"priya@mumbaiport.in", role:"port_authority",   company:"Mumbai Port Trust",     status:"active",  lastLogin:"Today 08:50",av:"P"},
  {id:"USR-003",name:"Ramesh Kumar",   email:"ramesh@mahindra.in",  role:"driver",           company:"Mahindra Logistics",    status:"active",  lastLogin:"Today 11:00",av:"R"},
  {id:"USR-004",name:"Suresh Pandian", email:"suresh@dhl.in",       role:"warehouse_manager",company:"DHL India – Bangalore", status:"inactive",lastLogin:"Mar 05",     av:"S"},
  {id:"USR-005",name:"Anitha P.",      email:"anitha@scs.in",       role:"analytics_officer",company:"SCS HQ – Delhi",        status:"active",  lastLogin:"Today 10:15",av:"A"},
  {id:"USR-006",name:"Vijay Mohan",    email:"vijay@chenport.in",   role:"port_authority",   company:"Chennai Port Trust",    status:"pending", lastLogin:"Never",      av:"V"},
];
const ROLE_META:Record<string,{label:string;c:string}>={admin:{label:"Admin",c:C.forest},port_authority:{label:"Port Authority",c:C.sageDark},warehouse_manager:{label:"Warehouse Mgr",c:C.amber},driver:{label:"Driver",c:C.green},analytics_officer:{label:"Analytics Officer",c:C.sage}};
const AUDIT:AuditEntry[]=[
  {id:1,user:"Arjun Sharma",  action:"Updated shipment SHP-4821 status to delayed",     time:"Today 11:45",   type:"update", icon:"✏"},
  {id:2,user:"Priya Menon",   action:"Added new port entry log for Mumbai Port Gate 5",  time:"Today 11:20",   type:"create", icon:"＋"},
  {id:3,user:"System",        action:"Auto-triggered reorder for INV-005 (Brake Pads)",  time:"Today 10:55",   type:"system", icon:"⚙"},
  {id:4,user:"Ramesh Kumar",  action:"Checked in at Mumbai Port — Gate 3",               time:"Today 10:15",   type:"checkin",icon:"◉"},
  {id:5,user:"Suresh Pandian",action:"Login failed (3 attempts) — IP flagged",           time:"Mar 09, 2:30pm",type:"warning",icon:"⚠"},
];
const SYS_H:ServiceHealth[]=[
  {label:"API Server (Modal)",status:"online", uptime:"99.9%",ping:"23ms"},
  {label:"MongoDB Atlas",     status:"online", uptime:"99.8%",ping:"48ms"},
  {label:"Redis Cache",       status:"online", uptime:"100%", ping:"5ms"},
  {label:"Socket.io",         status:"online", uptime:"99.7%",ping:"12ms"},
  {label:"Twilio SMS",        status:"warning",uptime:"98.2%",ping:"—"},
  {label:"Google Maps",       status:"online", uptime:"99.9%",ping:"67ms"},
];

function AdminPage(): React.ReactElement {
  const [tab,       setTab]       = useState("users");
  const [search,    setSearch]    = useState("");
  const [selId,     setSelId]     = useState<string|null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(()=>ALL_USERS.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase())),[search]);
  const S = selId ? ALL_USERS.find(u=>u.id===selId)??null : null;

  return (
    <div style={{flex:1,overflow:"auto",padding:"32px 36px",background:C.cream}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div><div style={{fontFamily:F.lora,fontSize:27,fontWeight:700,color:C.forest}}>Admin Panel</div><div style={{fontFamily:F.quicksand,color:C.muted,fontSize:13,marginTop:5}}>Manage users, roles, system health and audit logs</div></div>
        <Btn onClick={()=>setShowModal(true)}>+ Add User</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {([["👥","Total Users","6",C.forest],["🟢","Active Sessions","4",C.green],["⏳","Pending","1",C.amber],["⚡","Uptime","99.8%",C.sage]] as [string,string,string,string][]).map(([ic,lb,vl,co])=>(
          <Card key={lb} style={{borderTop:`2px solid ${co}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:F.lora,fontSize:26,fontWeight:700,color:C.forest}}>{vl}</div><div style={{fontFamily:F.quicksand,fontSize:12.5,color:C.muted,marginTop:4}}>{lb}</div></div>
              <div style={{width:42,height:42,background:`${co}12`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ic}</div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{display:"flex",gap:2,marginBottom:22,background:C.white,borderRadius:11,padding:4,border:`1px solid ${C.parchmentDark}`,width:"fit-content"}}>
        {([["users","Users"],["audit","Audit Log"],["system","System Health"]] as [string,string][]).map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"8px 22px",borderRadius:8,border:"none",background:tab===id?C.forest:"transparent",color:tab===id?C.cream:C.muted,fontFamily:F.quicksand,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      </div>

      {tab==="users" && (
        <div style={{display:"grid",gridTemplateColumns:S?"1fr 300px":"1fr",gap:20}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.parchmentDark}`,position:"relative"}}>
              <span style={{position:"absolute",left:34,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:16}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{...inpBase,paddingLeft:36,background:C.parchment}} onFocus={e=>(e.target as HTMLInputElement).style.borderColor=C.sage} onBlur={e=>(e.target as HTMLInputElement).style.borderColor=C.parchmentDark}/>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.parchment}}>{["User","Email","Role","Company","Status","Last Login"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 18px",fontFamily:F.syne,fontSize:9.5,fontWeight:700,color:C.muted,letterSpacing:.8}}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map(u=>{const rm=ROLE_META[u.role];const isSel=selId===u.id;return(
                <tr key={u.id} onClick={()=>setSelId(isSel?null:u.id)} style={{borderBottom:`1px solid ${C.parchment}`,background:isSel?`${C.sage}10`:"transparent",cursor:"pointer"}} onMouseOver={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background=C.parchment;}} onMouseOut={e=>{if(!isSel)(e.currentTarget as HTMLTableRowElement).style.background="transparent";}}>
                  <td style={{padding:"12px 18px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.syne,fontSize:12,color:C.cream,fontWeight:700}}>{u.av}</div><span style={{fontFamily:F.quicksand,fontSize:13,fontWeight:600,color:C.ink}}>{u.name}</span></div></td>
                  <td style={{padding:"12px 18px",fontFamily:F.quicksand,fontSize:12.5,color:C.muted}}>{u.email}</td>
                  <td style={{padding:"12px 18px"}}>{rm&&<Tag color={rm.c}>{rm.label}</Tag>}</td>
                  <td style={{padding:"12px 18px",fontFamily:F.quicksand,fontSize:12.5,color:C.ink}}>{u.company}</td>
                  <td style={{padding:"12px 18px"}}><StatusBadge status={u.status}/></td>
                  <td style={{padding:"12px 18px",fontFamily:F.quicksand,fontSize:12,color:C.muted}}>{u.lastLogin}</td>
                </tr>
              );})}</tbody>
            </table>
          </Card>
          {S && (
            <div style={{background:C.white,border:`1px solid ${C.parchmentDark}`,borderRadius:14,padding:"22px",height:"fit-content"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:46,height:46,borderRadius:"50%",background:C.forest,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.syne,fontSize:18,color:C.cream,fontWeight:700}}>{S.av}</div>
                  <div><div style={{fontFamily:F.quicksand,fontSize:15,fontWeight:700,color:C.forest}}>{S.name}</div><div style={{fontFamily:F.syne,fontSize:9,color:C.muted}}>{S.id}</div></div>
                </div>
                <button onClick={()=>setSelId(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button>
              </div>
              {([["Email",S.email],["Role",ROLE_META[S.role]?.label],["Company",S.company],["Last Login",S.lastLogin]] as [string,string][]).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:C.parchment,borderRadius:9,marginBottom:8}}><span style={{fontFamily:F.syne,fontSize:9,color:C.muted,fontWeight:700}}>{k.toUpperCase()}</span><span style={{fontFamily:F.quicksand,fontSize:12.5,color:C.forest,fontWeight:700}}>{v}</span></div>)}
              <div style={{marginBottom:12,marginTop:4}}><label style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,letterSpacing:1,display:"block",marginBottom:6}}>CHANGE ROLE</label><FocusSelect defaultValue={S.role} style={{...selBase,width:"100%"}}>{Object.entries(ROLE_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</FocusSelect></div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}><Btn style={{width:"100%",justifyContent:"center"}}>💾 Save Changes</Btn><Btn variant="danger" style={{width:"100%",justifyContent:"center"}}>Deactivate Account</Btn></div>
            </div>
          )}
        </div>
      )}

      {tab==="audit" && (
        <Card>
          <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15,marginBottom:18}}>System Audit Log</div>
          {AUDIT.map((log,i)=>(
            <div key={log.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<AUDIT.length-1?`1px solid ${C.parchment}`:"none"}}>
              <div style={{width:36,height:36,borderRadius:8,background:log.type==="warning"?C.redBg:C.parchment,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.syne,fontSize:16,color:log.type==="warning"?C.red:C.sage,flexShrink:0,border:`1px solid ${C.parchmentDark}`}}>{log.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:F.quicksand,fontSize:13,fontWeight:700,color:C.forest}}>{log.user}</span><span style={{fontFamily:F.syne,fontSize:10,color:C.muted}}>{log.time}</span></div>
                <div style={{fontFamily:F.quicksand,fontSize:12.5,color:C.muted,marginTop:3}}>{log.action}</div>
              </div>
              <Tag color={log.type==="warning"?C.red:C.sage}>{log.type}</Tag>
            </div>
          ))}
        </Card>
      )}

      {tab==="system" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <Card>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15,marginBottom:18}}>Service Status</div>
            {SYS_H.map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.parchment,borderRadius:9,marginBottom:10,border:`1px solid ${C.parchmentDark}`}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:s.status==="online"?C.green:C.amber,boxShadow:s.status==="online"?`0 0 0 3px ${C.greenBg}`:`0 0 0 3px ${C.amberBg}`}}/>
                <div style={{flex:1,fontFamily:F.quicksand,fontSize:13,fontWeight:600,color:C.ink}}>{s.label}</div>
                <div style={{fontFamily:F.syne,fontSize:10,color:C.muted}}>PING {s.ping}</div>
                <Tag color={s.status==="online"?C.green:C.amber} bg={s.status==="online"?C.greenBg:C.amberBg}>{s.uptime}</Tag>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{fontFamily:F.lora,fontWeight:600,color:C.forest,fontSize:15,marginBottom:18}}>System Actions</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {["🔄 Restart Services","🗄 Backup DB","📊 Run Report","🧹 Clear Cache","📧 Test Email","🔑 Rotate Keys"].map(l=>(
                <button key={l} style={{padding:"13px 10px",background:C.parchment,border:`1px solid ${C.parchmentDark}`,borderRadius:9,cursor:"pointer",fontFamily:F.quicksand,fontSize:12.5,fontWeight:600,color:C.forest}} onMouseOver={e=>{(e.currentTarget as HTMLButtonElement).style.background=`${C.sage}18`;(e.currentTarget as HTMLButtonElement).style.borderColor=C.sage;}} onMouseOut={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.parchment;(e.currentTarget as HTMLButtonElement).style.borderColor=C.parchmentDark;}}>{l}</button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {showModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,30,30,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(2px)"}}>
          <div style={{background:C.cream,borderRadius:16,padding:"32px",width:440,boxShadow:`0 20px 60px ${C.forest}30`,border:`1px solid ${C.parchmentDark}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}><div style={{fontFamily:F.lora,fontSize:20,fontWeight:700,color:C.forest}}>Add New User</div><button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted}}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {(["FULL NAME","EMAIL","PHONE","COMPANY"] as string[]).map(lbl=>(
                <div key={lbl}><label style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,display:"block",marginBottom:5,letterSpacing:1}}>{lbl}</label><FocusInput type={lbl==="EMAIL"?"email":lbl==="PHONE"?"tel":"text"}/></div>
              ))}
              <div><label style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.forest,display:"block",marginBottom:5,letterSpacing:1}}>ASSIGN ROLE</label><FocusSelect style={{...selBase,width:"100%"}}>{Object.entries(ROLE_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</FocusSelect></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22}}><Btn variant="outline" onClick={()=>setShowModal(false)} style={{flex:1,justifyContent:"center"}}>Cancel</Btn><Btn onClick={()=>setShowModal(false)} style={{flex:2,justifyContent:"center"}}>Create User ✓</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
interface SidebarProps { active:PageId; onNav:(p:PageId)=>void; user:User|null; onLogout:()=>void; }
function Sidebar({ active, onNav, user, onLogout }: SidebarProps): React.ReactElement {
  return (
    <div style={{width:230,background:C.forest,display:"flex",flexDirection:"column",height:"100vh",flexShrink:0}}>
      <div style={{padding:"28px 24px 20px",borderBottom:`1px solid ${C.forestLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:8,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⛓</div>
          <div>
            <div style={{fontFamily:F.lora,color:C.cream,fontWeight:700,fontSize:14}}>Supply Chain</div>
            <div style={{fontFamily:F.syne,color:C.sage,fontSize:9,letterSpacing:2}}>SYSTEM · IN</div>
          </div>
        </div>
      </div>
      <div style={{padding:"16px 12px",flex:1,overflowY:"auto"}}>
        <div style={{fontFamily:F.syne,fontSize:9,fontWeight:700,color:C.sage,letterSpacing:2,padding:"0 12px",marginBottom:10}}>NAVIGATION</div>
        {NAV_ITEMS.map(n=>{const on=active===n.id;return(
          <div key={n.id} onClick={()=>onNav(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,marginBottom:3,cursor:"pointer",background:on?`${C.sage}25`:"transparent",borderLeft:on?`3px solid ${C.sage}`:"3px solid transparent",transition:"all .15s"}}>
            <span style={{fontSize:16,color:on?C.sageLight:C.muted,width:18,textAlign:"center"}}>{n.icon}</span>
            <span style={{fontFamily:F.quicksand,fontSize:13.5,color:on?C.cream:`${C.cream}80`,fontWeight:on?700:500,flex:1}}>{n.label}</span>
            {n.badge!==undefined&&<span style={{background:C.red,color:C.white,fontFamily:F.syne,fontSize:9,fontWeight:700,borderRadius:10,padding:"2px 6px"}}>{n.badge}</span>}
          </div>
        );})}
      </div>
      <div style={{padding:"14px 18px",borderTop:`1px solid ${C.forestLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.syne,fontSize:13,color:C.cream,fontWeight:700}}>{user?.name?.[0]?.toUpperCase()??"U"}</div>
          <div>
            <div style={{fontFamily:F.quicksand,color:C.cream,fontSize:12.5,fontWeight:600}}>{user?.name??"User"}</div>
            <div style={{fontFamily:F.syne,color:C.sage,fontSize:9,textTransform:"capitalize"}}>{user?.role?.replace(/_/g," ")}</div>
          </div>
        </div>
        <div onClick={onLogout} style={{fontFamily:F.quicksand,fontSize:12,color:`${C.red}cc`,cursor:"pointer",fontWeight:600,textAlign:"center",padding:"7px",background:`${C.red}12`,borderRadius:6,border:`1px solid ${C.red}25`}}>Sign Out</div>
      </div>
    </div>
  );
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────
interface MainLayoutProps { user:User; onLogout:()=>void; }
function MainLayout({ user, onLogout }: MainLayoutProps): React.ReactElement {
  const [page, setPage] = useState<PageId>("dashboard");
  const render = (): React.ReactElement => {
    switch(page) {
      case "dashboard": return <DashboardPage onNav={setPage}/>;
      case "shipments": return <ShipmentsPage/>;
      case "inventory": return <InventoryPage/>;
      case "analytics": return <AnalyticsPage/>;
      case "lastmile":  return <LastMilePage/>;
      case "alerts":    return <AlertsPage/>;
      case "admin":     return <AdminPage/>;
      default:          return <DashboardPage onNav={setPage}/>;
    }
  };
  return (
    <div style={{display:"flex",height:"100vh",background:C.cream}}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={onLogout}/>
      {render()}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(): React.ReactElement {
  useFonts();
  const [screen, setScreen] = useState<Screen>("login");
  const [user,   setUser]   = useState<User|null>(null);
  const handleLogin  = (u:User): void => { setUser(u); setScreen("app"); };
  const handleLogout = (): void       => { setUser(null); setScreen("login"); };
  if (screen==="app"&&user)  return <MainLayout user={user} onLogout={handleLogout}/>;
  if (screen==="register")   return <RegisterPage onSwitch={()=>setScreen("login")} onLogin={handleLogin}/>;
  return <LoginPage onSwitch={()=>setScreen("register")} onLogin={handleLogin}/>;
}



