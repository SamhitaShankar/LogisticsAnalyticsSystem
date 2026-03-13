import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
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

// ─── TYPES ────────────────────────────────────────────────────────────────────
type UserRole =
  | "admin" | "port_authority" | "warehouse_manager"
  | "driver" | "analytics_officer";

type Screen = "login" | "register" | "app";

type PageId =
  | "dashboard" | "shipments" | "inventory"
  | "analytics" | "lastmile" | "alerts" | "admin";

type ShipmentStatus =
  | "delayed" | "in_transit" | "at_port" | "delivered" | "pending";

type Priority = "critical" | "high" | "medium" | "low";

type UserStatus = "active" | "inactive" | "pending";

interface User {
  name:  string;
  email: string;
  role:  UserRole;
}

interface NavItem {
  id:     PageId;
  icon:   string;
  label:  string;
  badge?: number;
}

interface RoleMeta {
  id:    string;
  label: string;
  icon:  string;
  desc:  string;
}

interface Shipment {
  id:       string;
  from:     string;
  to:       string;
  status:   ShipmentStatus;
  driver:   string;
  weight:   string;
  cargo:    string;
  eta:      string;
  priority: Priority;
}

interface InventoryItem {
  id:        string;
  sku:       string;
  name:      string;
  warehouse: string;
  qty:       number;
  min:       number;
  max:       number;
  unit:      string;
  category:  string;
}

interface AdminUser {
  id:        string;
  name:      string;
  email:     string;
  role:      UserRole;
  company:   string;
  status:    UserStatus;
  lastLogin: string;
  av:        string;
}

interface AuditEntry {
  id:     number;
  user:   string;
  action: string;
  time:   string;
  type:   string;
  icon:   string;
}

interface ServiceHealth {
  label:  string;
  status: "online" | "warning";
  uptime: string;
  ping:   string;
}

interface KpiCard {
  label:  string;
  value:  string;
  change: string;
  up:     boolean;
  icon:   string;
  accent: string;
}

interface AlertItem {
  id:   number;
  msg:  string;
  time: string;
  dot:  string;
}

interface QuickAction {
  label: string;
  icon:  string;
  page:  PageId;
}

interface ChartTooltipProps {
  active?:  boolean;
  payload?: { name: string; value: number; color: string }[];
  label?:   string;
}

// ─── FONT LOADER ──────────────────────────────────────────────────────────────
function useFonts(): void {
  useEffect(() => {
    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Quicksand:wght@400;500;600;700&family=Syne:wght@400;600;700;800&display=swap";
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
    `;
    document.head.appendChild(style);
  }, []);
}

// ─── SHARED DATA ──────────────────────────────────────────────────────────────
const ROLES: RoleMeta[] = [
  { id: "port_authority",    label: "Port Authority",    icon: "⚓", desc: "Chennai / Ennore Port" },
  { id: "warehouse_manager", label: "Warehouse Manager", icon: "🏭", desc: "Stock & Storage" },
  { id: "driver",            label: "Driver / Logistics",icon: "🚛", desc: "Last-Mile Delivery" },
  { id: "analytics_officer", label: "Analytics Officer", icon: "📊", desc: "Reports & KPIs" },
  { id: "admin",             label: "System Admin",      icon: "🛠", desc: "Full Access" },
];

const NAV: NavItem[] = [
  { id: "dashboard", icon: "⌂",  label: "Dashboard" },
  { id: "shipments", icon: "⊳",  label: "Shipments" },
  { id: "inventory", icon: "▦",  label: "Inventory" },
  { id: "analytics", icon: "≋",  label: "Analytics" },
  { id: "lastmile",  icon: "◉",  label: "Last Mile" },
  { id: "alerts",    icon: "⌁",  label: "Alerts", badge: 3 },
  { id: "admin",     icon: "⚙",  label: "Admin" },
];

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
interface TagProps {
  children: React.ReactNode;
  color?:   string;
  bg?:      string;
}
function Tag({ children, color = C.sage, bg }: TagProps): React.ReactElement {
  return (
    <span style={{ fontFamily: F.syne, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color, background: bg ?? `${color}18`, padding: "3px 10px", borderRadius: 3, display: "inline-block" }}>
      {children}
    </span>
  );
}

interface BtnProps {
  children:  React.ReactNode;
  onClick?:  () => void;
  variant?:  "primary" | "outline" | "ghost" | "danger";
  style?:    React.CSSProperties;
  disabled?: boolean;
}
function Btn({ children, onClick, variant = "primary", style: sx = {}, disabled }: BtnProps): React.ReactElement {
  const base: React.CSSProperties = { fontFamily: F.quicksand, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, padding: "10px 20px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6, transition: "all .18s", opacity: disabled ? .5 : 1 };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.forest, color: C.cream, border: "none", boxShadow: `0 2px 8px ${C.forest}40` },
    outline: { background: "transparent", color: C.forest, border: `1.5px solid ${C.parchmentDark}` },
    ghost:   { background: "transparent", color: C.sage, border: "none" },
    danger:  { background: C.redBg, color: C.red, border: `1px solid ${C.red}30` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sx }}>{children}</button>;
}

interface CardProps {
  children: React.ReactNode;
  style?:   React.CSSProperties;
  onClick?: () => void;
}
function Card({ children, style: sx = {}, onClick }: CardProps): React.ReactElement {
  return (
    <div onClick={onClick} style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 12, padding: "20px 22px", ...sx }}>
      {children}
    </div>
  );
}

interface StatusBadgeProps { status: ShipmentStatus | UserStatus; }
function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    delayed:    { label: "Delayed",    color: C.red,   bg: C.redBg },
    in_transit: { label: "In Transit", color: C.blue,  bg: C.blueBg },
    at_port:    { label: "At Port",    color: C.amber, bg: C.amberBg },
    delivered:  { label: "Delivered",  color: C.green, bg: C.greenBg },
    pending:    { label: "Pending",    color: C.muted, bg: C.parchment },
    active:     { label: "Active",     color: C.green, bg: C.greenBg },
    inactive:   { label: "Inactive",   color: C.muted, bg: C.parchment },
  };
  const m = map[status] ?? map.pending;
  return <Tag color={m.color} bg={m.bg}>{m.label}</Tag>;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 8, padding: "10px 14px", boxShadow: `0 4px 20px ${C.forest}18`, fontFamily: F.quicksand }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, fontFamily: F.syne }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>)}
    </div>
  );
}

interface SidebarProps {
  active:   PageId;
  onNav:    (p: PageId) => void;
  user:     User | null;
  onLogout: () => void;
}
function Sidebar({ active, onNav, user, onLogout }: SidebarProps): React.ReactElement {
  return (
    <div style={{ width: 230, background: C.forest, display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: `1px solid ${C.forestLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⛓</div>
          <div>
            <div style={{ fontFamily: F.lora, color: C.cream, fontWeight: 700, fontSize: 14 }}>Supply Chain</div>
            <div style={{ fontFamily: F.syne, color: C.sage, fontSize: 9, letterSpacing: 2 }}>SYSTEM · TN</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 2, padding: "0 12px", marginBottom: 10 }}>NAVIGATION</div>
        {NAV.map(n => {
          const on = active === n.id;
          return (
            <div key={n.id} onClick={() => onNav(n.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, marginBottom: 3, cursor: "pointer", background: on ? `${C.sage}25` : "transparent", borderLeft: on ? `3px solid ${C.sage}` : "3px solid transparent", transition: "all .15s" }}>
              <span style={{ fontSize: 16, color: on ? C.sageLight : C.muted, width: 18, textAlign: "center" }}>{n.icon}</span>
              <span style={{ fontFamily: F.quicksand, fontSize: 13.5, color: on ? C.cream : `${C.cream}80`, fontWeight: on ? 700 : 500, flex: 1 }}>{n.label}</span>
              {n.badge !== undefined && <span style={{ background: C.red, color: C.white, fontFamily: F.syne, fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "2px 6px" }}>{n.badge}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.forestLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 13, color: C.cream, fontWeight: 700 }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <div style={{ fontFamily: F.quicksand, color: C.cream, fontSize: 12.5, fontWeight: 600 }}>{user?.name ?? "User"}</div>
            <div style={{ fontFamily: F.syne, color: C.sage, fontSize: 9, textTransform: "capitalize" }}>{user?.role?.replace(/_/g, " ")}</div>
          </div>
        </div>
        <div onClick={onLogout} style={{ fontFamily: F.quicksand, fontSize: 12, color: `${C.red}cc`, cursor: "pointer", fontWeight: 600, textAlign: "center", padding: "7px", background: `${C.red}12`, borderRadius: 6, border: `1px solid ${C.red}25` }}>Sign Out</div>
      </div>
    </div>
  );
}

// ─── ROUTE MAP ────────────────────────────────────────────────────────────────
interface MapNode { x: number; y: number; l: string; }
function RouteMap(): React.ReactElement {
  const N: MapNode[] = [{ x: 14, y: 62, l: "Chennai" }, { x: 52, y: 30, l: "Ennore" }, { x: 74, y: 56, l: "Coimbatore" }, { x: 60, y: 79, l: "Madurai" }, { x: 30, y: 80, l: "Trichy" }, { x: 84, y: 26, l: "Salem" }];
  const E: [number, number][] = [[0, 1], [0, 2], [0, 4], [1, 5], [2, 3], [4, 3], [4, 2], [5, 2]];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: C.parchment, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.parchmentDark}` }}>
      <div style={{ position: "absolute", top: 10, left: 14, fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.forest, letterSpacing: 1.5 }}>LIVE ROUTE MAP — TAMIL NADU</div>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => <g key={v}><line x1={v} y1="0" x2={v} y2="100" stroke={C.parchmentDark} strokeWidth=".4" /><line x1="0" y1={v} x2="100" y2={v} stroke={C.parchmentDark} strokeWidth=".4" /></g>)}
        {E.map(([a, b], i) => <line key={i} x1={N[a].x} y1={N[a].y} x2={N[b].x} y2={N[b].y} stroke={C.sage} strokeWidth=".9" strokeDasharray="2,2" opacity=".6" />)}
        <circle r="1.8" fill={C.red}><animateMotion dur="4s" repeatCount="indefinite" path={`M${N[0].x},${N[0].y} L${N[2].x},${N[2].y}`} /></circle>
        <circle r="1.8" fill={C.green}><animateMotion dur="6s" repeatCount="indefinite" path={`M${N[1].x},${N[1].y} L${N[5].x},${N[5].y}`} /></circle>
        {N.map((n, i) => <g key={i}><circle cx={n.x} cy={n.y} r="2.5" fill={C.forest} stroke={C.cream} strokeWidth=".8" /><text x={n.x + 3} y={n.y - 2} fontSize="3.5" fill={C.forest} fontFamily="sans-serif">{n.l}</text></g>)}
      </svg>
      <div style={{ position: "absolute", bottom: 10, right: 12, display: "flex", gap: 12, fontFamily: F.quicksand, fontSize: 10, color: C.muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, display: "inline-block" }} />Delayed</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />On Route</span>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
interface LoginPageProps {
  onSwitch: () => void;
  onLogin:  (u: User) => void;
}
function LoginPage({ onSwitch, onLogin }: LoginPageProps): React.ReactElement {
  const [email, setEmail] = useState<string>("");
  const [pass,  setPass]  = useState<string>("");
  const [err,   setErr]   = useState<string>("");

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", border: `1.5px solid ${C.parchmentDark}`, borderRadius: 8, fontSize: 14, outline: "none", background: C.white, boxSizing: "border-box", fontFamily: F.quicksand, color: C.ink };

  const handleLogin = (): void => {
    if (!email || !pass) { setErr("Please fill in all fields."); return; }
    onLogin({ name: "Admin User", email, role: "admin" });
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.cream }}>
      {/* Left panel */}
      <div style={{ width: "42%", background: C.forest, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 56px", overflow: "hidden" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .06 }}>
          <defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,16 58,44 30,58 2,44 2,16" fill="none" stroke={C.cream} strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
        <div style={{ position: "absolute", right: -80, top: -80, width: 340, height: 340, borderRadius: "50%", border: `60px solid ${C.sage}18` }} />
        <div style={{ position: "absolute", left: -40, bottom: -60, width: 240, height: 240, borderRadius: "50%", border: `40px solid ${C.sage}12` }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⛓</div>
            <div><div style={{ fontFamily: F.lora, color: C.cream, fontWeight: 700, fontSize: 15 }}>Supply Chain System</div><div style={{ fontFamily: F.syne, color: C.sage, fontSize: 9, letterSpacing: 2 }}>TAMIL NADU</div></div>
          </div>
          <div style={{ fontFamily: F.lora, color: C.cream, fontSize: 40, fontWeight: 700, lineHeight: 1.15, marginBottom: 20, fontStyle: "italic" }}>Track Every<br />Mile. Every<br />Shipment.</div>
          <div style={{ fontFamily: F.quicksand, color: `${C.cream}90`, fontSize: 14.5, lineHeight: 1.75, maxWidth: 300 }}>Real-time visibility across Chennai Port, Ennore Port, and Tamil Nadu's entire logistics network.</div>
          <div style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 18 }}>
            {([ ["⚓","Port Intelligence","Live port entry, exit & turnaround"], ["📦","Smart Inventory","AI-driven stock forecasting"], ["🛣","Route Optimizer","48-hour delay prediction"] ] as [string,string,string][]).map(([ic, t, d]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.sage}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1px solid ${C.sage}40` }}>{ic}</div>
                <div><div style={{ fontFamily: F.quicksand, color: C.cream, fontWeight: 700, fontSize: 13 }}>{t}</div><div style={{ fontFamily: F.quicksand, color: `${C.cream}70`, fontSize: 12 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: F.lora, fontSize: 30, fontWeight: 700, color: C.forest, marginBottom: 8 }}>Welcome back</div>
            <div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 14 }}>Sign in to your account to continue</div>
          </div>
          {err && <div style={{ background: C.redBg, border: `1px solid ${C.red}30`, color: C.red, borderRadius: 8, padding: "10px 14px", fontFamily: F.quicksand, fontSize: 13, marginBottom: 18 }}>{err}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {([ ["EMAIL ADDRESS", "email", email, setEmail, "you@company.com"], ["PASSWORD", "password", pass, setPass, "••••••••"] ] as [string, string, string, React.Dispatch<React.SetStateAction<string>>, string][]).map(([lbl, type, val, set, ph]) => (
              <div key={lbl}>
                <label style={{ fontFamily: F.syne, fontSize: 10, fontWeight: 700, color: C.forest, display: "block", marginBottom: 7, letterSpacing: 1 }}>{lbl}</label>
                <input value={val} onChange={e => set(e.target.value)} type={type} placeholder={ph} style={inputStyle} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} />
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: F.quicksand, fontSize: 13, color: C.muted, cursor: "pointer" }}><input type="checkbox" style={{ accentColor: C.sage }} /> Remember me</label>
              <span style={{ fontFamily: F.quicksand, fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 700 }}>Forgot password?</span>
            </div>
            <button onClick={handleLogin} style={{ width: "100%", padding: "14px", background: C.forest, color: C.cream, border: "none", borderRadius: 9, fontFamily: F.quicksand, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 20px ${C.forest}40` }}>Sign In →</button>
          </div>
          <div style={{ textAlign: "center", marginTop: 28, fontFamily: F.quicksand, fontSize: 13, color: C.muted }}>No account? <span onClick={onSwitch} style={{ color: C.sage, fontWeight: 700, cursor: "pointer" }}>Create one</span></div>
          <div style={{ marginTop: 28, padding: "15px 18px", background: C.parchment, borderRadius: 12, border: `1px solid ${C.parchmentDark}` }}>
            <div style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, marginBottom: 6, letterSpacing: 1 }}>DEMO CREDENTIALS</div>
            <div style={{ fontFamily: F.quicksand, fontSize: 13, color: C.ink }}>Email: <b>admin@scs.in</b> &nbsp;·&nbsp; Password: <b>demo123</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
interface RegisterPageProps {
  onSwitch: () => void;
  onLogin:  (u: User) => void;
}
function RegisterPage({ onSwitch, onLogin }: RegisterPageProps): React.ReactElement {
  const [step,    setStep]    = useState<1 | 2 | 3>(1);
  const [role,    setRole]    = useState<UserRole | "">("");
  const [name,    setName]    = useState<string>("");
  const [email,   setEmail]   = useState<string>("");
  const [phone,   setPhone]   = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [pass,    setPass]    = useState<string>("");

  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", border: `1.5px solid ${C.parchmentDark}`, borderRadius: 9, fontSize: 13.5, outline: "none", background: C.white, boxSizing: "border-box", fontFamily: F.quicksand, color: C.ink };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.cream }}>
      {/* Left panel */}
      <div style={{ width: "38%", background: C.forestDark, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 48px", overflow: "hidden", position: "relative" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .04 }}>
          <defs><pattern id="grd" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0L0 0 0 30" fill="none" stroke={C.cream} strokeWidth=".8" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grd)" />
        </svg>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 60 }}><span style={{ fontSize: 22 }}>⛓</span><div style={{ fontFamily: F.lora, color: C.cream, fontWeight: 700, fontSize: 15 }}>Supply Chain System</div></div>
          <div style={{ fontFamily: F.lora, color: C.cream, fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 14, fontStyle: "italic" }}>Join Tamil Nadu's<br />Logistics Network</div>
          <div style={{ fontFamily: F.quicksand, color: `${C.cream}70`, fontSize: 13.5, lineHeight: 1.75 }}>Get access to real-time tracking, inventory analytics, and intelligent route alerts.</div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 2, marginBottom: 18 }}>YOUR PROGRESS</div>
          {(["Select Your Role", "Your Details", "Set Password"] as const).map((l, i) => {
            const n = i + 1;
            const done = step > n, on = step === n;
            return (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? C.sage : on ? `${C.sage}30` : `${C.cream}10`, border: on ? `2px solid ${C.sage}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 11, fontWeight: 700, color: done ? C.cream : on ? C.sageLight : `${C.cream}35` }}>
                  {done ? "✓" : String(n).padStart(2, "0")}
                </div>
                <span style={{ fontFamily: F.quicksand, color: on ? C.cream : `${C.cream}45`, fontSize: 13, fontWeight: on ? 700 : 400 }}>{l}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 52 }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {step === 1 && <>
            <div style={{ marginBottom: 34 }}><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest, marginBottom: 8 }}>What's your role?</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 14 }}>Select the role that best describes you</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              {ROLES.map(r => (
                <div key={r.id} onClick={() => setRole(r.id as UserRole)} style={{ padding: "18px 16px", border: role === r.id ? `2px solid ${C.sage}` : `1.5px solid ${C.parchmentDark}`, borderRadius: 12, cursor: "pointer", background: role === r.id ? `${C.sage}12` : C.white, transition: "all .2s" }}>
                  <div style={{ fontSize: 24, marginBottom: 9 }}>{r.icon}</div>
                  <div style={{ fontFamily: F.quicksand, fontSize: 13, fontWeight: 700, color: C.forest }}>{r.label}</div>
                  <div style={{ fontFamily: F.quicksand, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{r.desc}</div>
                </div>
              ))}
            </div>
            <Btn onClick={() => role && setStep(2)} disabled={!role} style={{ width: "100%", justifyContent: "center" }}>Continue →</Btn>
          </>}
          {step === 2 && <>
            <div style={{ marginBottom: 34 }}><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest, marginBottom: 8 }}>Your Details</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 14 }}>Tell us about yourself</div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              {([["FULL NAME","text",name,setName,"Karthik Rajan"],["EMAIL","email",email,setEmail,"you@company.com"],["PHONE","tel",phone,setPhone,"+91 98765 43210"],["COMPANY","text",company,setCompany,"TVS Logistics"]] as [string,string,string,React.Dispatch<React.SetStateAction<string>>,string][]).map(([lbl,type,val,set,ph]) => (
                <div key={lbl}><label style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, display: "block", marginBottom: 6, letterSpacing: 1 }}>{lbl}</label><input value={val} onChange={e => set(e.target.value)} type={type} placeholder={ph} style={inp} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} /></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: "center" }}>← Back</Btn><Btn onClick={() => name && email && setStep(3)} disabled={!name || !email} style={{ flex: 2, justifyContent: "center" }}>Continue →</Btn></div>
          </>}
          {step === 3 && <>
            <div style={{ marginBottom: 34 }}><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest, marginBottom: 8 }}>Set Password</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 14 }}>Choose a strong password</div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, display: "block", marginBottom: 6, letterSpacing: 1 }}>PASSWORD</label>
                <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="Min 8 characters" style={inp} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} />
                <div style={{ marginTop: 8, display: "flex", gap: 3 }}>{[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: pass.length >= i * 3 ? (i <= 1 ? C.red : i <= 2 ? C.amber : i <= 3 ? C.sage : C.green) : C.parchmentDark }} />)}</div>
                <div style={{ fontFamily: F.quicksand, fontSize: 11, color: C.muted, marginTop: 4 }}>{pass.length === 0 ? "Enter a password" : pass.length < 6 ? "Weak" : pass.length < 10 ? "Fair" : "Strong ✓"}</div>
              </div>
              <div><label style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, display: "block", marginBottom: 6, letterSpacing: 1 }}>CONFIRM PASSWORD</label><input type="password" placeholder="Re-enter password" style={inp} /></div>
              <div style={{ background: C.parchment, border: `1px solid ${C.parchmentDark}`, borderRadius: 12, padding: "15px 17px" }}>
                <div style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, marginBottom: 9, letterSpacing: 1 }}>ACCOUNT SUMMARY</div>
                {([["Role", ROLES.find(r => r.id === role)?.label ?? "—"],["Name", name || "—"],["Email", email || "—"]] as [string,string][]).map(([k,v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted }}>{k}</span><span style={{ fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 700, color: C.forest }}>{v}</span></div>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" onClick={() => setStep(2)} style={{ flex: 1, justifyContent: "center" }}>← Back</Btn><Btn onClick={() => onLogin({ name, email, role: role as UserRole })} style={{ flex: 2, justifyContent: "center" }}>Create Account ✓</Btn></div>
          </>}
          <div style={{ textAlign: "center", marginTop: 28, fontFamily: F.quicksand, fontSize: 13, color: C.muted }}>Already have an account? <span onClick={onSwitch} style={{ color: C.sage, fontWeight: 700, cursor: "pointer" }}>Sign in</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
const KPI_CARDS: KpiCard[] = [
  { label:"Active Shipments",   value:"1,284",  change:"+12%",  up:true,  icon:"🚛", accent:C.forest },
  { label:"On-Time Delivery",   value:"94.2%",  change:"+2.1%", up:true,  icon:"✅", accent:C.green },
  { label:"Inventory Accuracy", value:"98.7%",  change:"-0.3%", up:false, icon:"📦", accent:C.amber },
  { label:"Avg. Turnaround",    value:"3.4 hr", change:"-18%",  up:true,  icon:"⏱",  accent:C.sage },
];
const ALERTS_DATA: AlertItem[] = [
  { id:1, msg:"Shipment #SHP-4821 delayed at Ennore Port", time:"2 min ago",  dot:C.red   },
  { id:2, msg:"Inventory LOW: Steel Rods (Warehouse B)",  time:"11 min ago", dot:C.amber },
  { id:3, msg:"Driver Ramesh checked in at Chennai Port", time:"24 min ago", dot:C.blue  },
  { id:4, msg:"Shipment #SHP-4802 delivered successfully",time:"1 hr ago",   dot:C.green },
];
const QUICK_ACTIONS: QuickAction[] = [
  { label:"New Shipment",    icon:"➕", page:"shipments" },
  { label:"Track Package",   icon:"📍", page:"shipments" },
  { label:"Update Stock",    icon:"📦", page:"inventory" },
  { label:"Generate Report", icon:"📊", page:"analytics" },
  { label:"Assign Driver",   icon:"🚛", page:"lastmile"  },
  { label:"Send Alert",      icon:"🔔", page:"alerts"    },
];
const DASH_SHIPS: Shipment[] = [
  { id:"SHP-4821", from:"Chennai Port", to:"Coimbatore",  status:"delayed",    driver:"Ramesh K.", weight:"4.2T", cargo:"Steel Rods",  eta:"2h 30m", priority:"critical" },
  { id:"SHP-4822", from:"Ennore Port",  to:"Madurai Hub", status:"in_transit", driver:"Suresh M.", weight:"2.1T", cargo:"Electronics", eta:"4h 10m", priority:"high"     },
  { id:"SHP-4823", from:"Warehouse A",  to:"Salem Depot", status:"at_port",    driver:"Vijay R.",  weight:"6.8T", cargo:"Textiles",    eta:"1h 05m", priority:"medium"   },
  { id:"SHP-4824", from:"Trichy Hub",   to:"Chennai",     status:"delivered",  driver:"Kumar S.",  weight:"1.5T", cargo:"Spare Parts", eta:"Done",   priority:"low"      },
];

interface DashboardPageProps { onNav: (p: PageId) => void; }
function DashboardPage({ onNav }: DashboardPageProps): React.ReactElement {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: C.cream }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 34 }}>
        <div>
          <div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest }}>Good morning, Admin</div>
          <div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 13.5, marginTop: 5 }}>Wednesday, 11 March 2026 · Tamil Nadu Logistics Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 8, padding: "9px 16px", fontFamily: F.quicksand, fontSize: 13, color: C.muted, cursor: "pointer" }}>🔍 Search</div>
          <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 8, padding: "9px 14px", cursor: "pointer", position: "relative" }}>🔔<span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: C.red, borderRadius: "50%", border: `2px solid ${C.cream}` }} /></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {KPI_CARDS.map(k => (
          <div key={k.label} onClick={() => k.label.includes("Shipment") ? onNav("shipments") : k.label.includes("Inventory") ? onNav("inventory") : onNav("analytics")}
            style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 12, padding: "20px 22px", cursor: "pointer", borderTop: `3px solid ${k.accent}`, transition: "box-shadow .2s" }}
            onMouseOver={e => (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${C.forest}12`}
            onMouseOut={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, background: `${k.accent}12`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{k.icon}</div>
              <span style={{ fontFamily: F.syne, fontSize: 10, fontWeight: 700, color: k.up ? C.green : C.red, background: k.up ? C.greenBg : C.redBg, padding: "3px 8px", borderRadius: 3 }}>{k.change}</span>
            </div>
            <div style={{ fontFamily: F.lora, fontSize: 28, fontWeight: 700, color: C.forest }}>{k.value}</div>
            <div style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15 }}>Live Route Map</div><span onClick={() => onNav("shipments")} style={{ fontFamily: F.quicksand, fontSize: 12, color: C.sage, fontWeight: 700, cursor: "pointer" }}>View Shipments →</span></div><div style={{ height: 256 }}><RouteMap /></div></Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15 }}>Recent Alerts</div><Tag color={C.red} bg={C.redBg}>3 Active</Tag></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ALERTS_DATA.map(a => <div key={a.id} onClick={() => onNav("alerts")} style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8, background: C.parchment, cursor: "pointer", border: `1px solid ${C.parchmentDark}` }} onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = C.parchmentDark} onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = C.parchment}><div style={{ width: 8, height: 8, borderRadius: "50%", background: a.dot, flexShrink: 0, marginTop: 5 }} /><div><div style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.ink }}>{a.msg}</div><div style={{ fontFamily: F.syne, fontSize: 10, color: C.muted, marginTop: 3 }}>{a.time}</div></div></div>)}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.9fr", gap: 20 }}>
        <Card>
          <div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15, marginBottom: 16 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {QUICK_ACTIONS.map(a => <button key={a.label} onClick={() => onNav(a.page)} style={{ padding: "14px 10px", background: C.parchment, border: `1px solid ${C.parchmentDark}`, borderRadius: 9, cursor: "pointer", textAlign: "center", fontFamily: F.quicksand, transition: "all .15s" }} onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = `${C.sage}18`; (e.currentTarget as HTMLButtonElement).style.borderColor = C.sage; }} onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = C.parchment; (e.currentTarget as HTMLButtonElement).style.borderColor = C.parchmentDark; }}><div style={{ fontSize: 20, marginBottom: 6 }}>{a.icon}</div><div style={{ fontSize: 12, fontWeight: 600, color: C.forest }}>{a.label}</div></button>)}
          </div>
        </Card>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px 14px" }}><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15 }}>Active Shipments</div><span onClick={() => onNav("shipments")} style={{ fontFamily: F.quicksand, fontSize: 12, color: C.sage, fontWeight: 700, cursor: "pointer" }}>View All →</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `2px solid ${C.parchmentDark}` }}>{["Tracking ID","Route","Driver","ETA","Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 10px 10px 18px", fontFamily: F.syne, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>{h}</th>)}</tr></thead>
            <tbody>{DASH_SHIPS.map(s => <tr key={s.id} onClick={() => onNav("shipments")} style={{ borderBottom: `1px solid ${C.parchment}`, cursor: "pointer" }} onMouseOver={e => (e.currentTarget as HTMLTableRowElement).style.background = C.parchment} onMouseOut={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}><td style={{ padding: "12px 10px 12px 18px", fontFamily: F.syne, fontSize: 12, fontWeight: 700, color: C.forest }}>{s.id}</td><td style={{ padding: "12px 10px" }}><div style={{ fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{s.from}</div><div style={{ fontFamily: F.quicksand, fontSize: 11, color: C.muted }}>→ {s.to}</div></td><td style={{ padding: "12px 10px", fontFamily: F.quicksand, fontSize: 12.5, color: C.ink }}>{s.driver}</td><td style={{ padding: "12px 10px", fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 700, color: s.status === "delayed" ? C.red : s.eta === "Done" ? C.green : C.ink }}>{s.eta}</td><td style={{ padding: "12px 10px 12px 10px" }}><StatusBadge status={s.status} /></td></tr>)}</tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── SHIPMENTS PAGE ───────────────────────────────────────────────────────────
const ALL_SHIPMENTS: Shipment[] = [
  { id:"SHP-4821", from:"Chennai Port",  to:"Coimbatore Warehouse", status:"delayed",    driver:"Ramesh K.",  weight:"4.2T", cargo:"Steel Rods",      eta:"2h 30m", priority:"critical" },
  { id:"SHP-4822", from:"Ennore Port",   to:"Madurai Hub",          status:"in_transit", driver:"Suresh M.",  weight:"2.1T", cargo:"Electronics",     eta:"4h 10m", priority:"high"     },
  { id:"SHP-4823", from:"Warehouse A",   to:"Salem Depot",          status:"at_port",    driver:"Vijay R.",   weight:"6.8T", cargo:"Textiles",        eta:"1h 05m", priority:"medium"   },
  { id:"SHP-4824", from:"Trichy Hub",    to:"Chennai Store",        status:"delivered",  driver:"Kumar S.",   weight:"1.5T", cargo:"Spare Parts",     eta:"Done",   priority:"low"      },
  { id:"SHP-4825", from:"Chennai Port",  to:"Vellore Warehouse",    status:"in_transit", driver:"Anand P.",   weight:"3.3T", cargo:"Chemicals",       eta:"5h 20m", priority:"high"     },
  { id:"SHP-4826", from:"Ennore Port",   to:"Tirunelveli Depot",    status:"pending",    driver:"Manoj L.",   weight:"8.0T", cargo:"Food Grains",     eta:"—",      priority:"medium"   },
  { id:"SHP-4827", from:"Madurai Hub",   to:"Coimbatore Warehouse", status:"in_transit", driver:"Pradeep N.", weight:"2.9T", cargo:"Auto Components", eta:"3h 45m", priority:"high"     },
];

const PRI_STYLE: Record<Priority, { c: string; b: string }> = {
  critical: { c:C.red,   b:C.redBg   },
  high:     { c:C.amber, b:C.amberBg },
  medium:   { c:C.sage,  b:`${C.sage}18` },
  low:      { c:C.green, b:C.greenBg },
};

const TIMELINE = [
  { step:"Order Placed",      done:true,  time:"09:00 AM"     },
  { step:"Picked Up",         done:true,  time:"10:15 AM"     },
  { step:"At Origin Port",    done:true,  time:"11:30 AM"     },
  { step:"In Transit",        done:true,  time:"01:00 PM"     },
  { step:"Approaching Dest.", done:false, time:"Est. 3:30 PM" },
  { step:"Delivered",         done:false, time:"Est. 4:00 PM" },
];

function ShipmentsPage(): React.ReactElement {
  const [search, setSearch] = useState<string>("");
  const [sf,     setSf]     = useState<string>("all");
  const [selId,  setSelId]  = useState<string | null>(null);

  const counts = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = { all: ALL_SHIPMENTS.length };
    (["in_transit","delayed","delivered","pending","at_port"] as ShipmentStatus[]).forEach(s => (m[s] = ALL_SHIPMENTS.filter(x => x.status === s).length));
    return m;
  }, []);

  const filtered = useMemo<Shipment[]>(() => ALL_SHIPMENTS.filter(s => sf === "all" || s.status === sf).filter(s => [s.id, s.driver, s.cargo].join(" ").toLowerCase().includes(search.toLowerCase())), [search, sf]);
  const S = selId ? ALL_SHIPMENTS.find(s => s.id === selId) ?? null : null;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: C.cream }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest }}>Shipments</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 13, marginTop: 5 }}>Track and manage all active shipments across Tamil Nadu</div></div>
        <Btn>+ New Shipment</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {([ ["all","All"],["in_transit","In Transit"],["delayed","Delayed"],["at_port","At Port"],["delivered","Delivered"],["pending","Pending"] ] as [string,string][]).map(([v,l]) => <button key={v} onClick={() => setSf(v)} style={{ padding: "7px 16px", borderRadius: 20, fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, cursor: "pointer", border: sf === v ? "none" : `1px solid ${C.parchmentDark}`, background: sf === v ? C.forest : "transparent", color: sf === v ? C.cream : C.muted }}>{l} <span style={{ opacity:.65, fontSize:11 }}>({counts[v] ?? 0})</span></button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: S ? "1fr 360px" : "1fr", gap: 20 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.parchmentDark}`, position: "relative" }}>
            <span style={{ position: "absolute", left: 34, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 16 }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, driver or cargo..." style={{ width: "100%", padding: "9px 12px 9px 36px", border: `1.5px solid ${C.parchmentDark}`, borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: F.quicksand, background: C.parchment, color: C.ink }} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: C.parchment }}>{["Tracking ID","From → To","Driver","Cargo","Weight","ETA","Priority","Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: .8, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(s => {
              const pm = PRI_STYLE[s.priority]; const isSel = selId === s.id;
              return <tr key={s.id} onClick={() => setSelId(isSel ? null : s.id)} style={{ borderBottom: `1px solid ${C.parchment}`, background: isSel ? `${C.sage}10` : "transparent", cursor: "pointer" }} onMouseOver={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = C.parchment; }} onMouseOut={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}><td style={{ padding: "13px 16px", fontFamily: F.syne, fontSize: 11.5, fontWeight: 700, color: C.forest }}>{s.id}</td><td style={{ padding: "13px 16px" }}><div style={{ fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, color: C.ink }}>{s.from}</div><div style={{ fontFamily: F.quicksand, fontSize: 11, color: C.muted }}>→ {s.to}</div></td><td style={{ padding: "13px 16px", fontFamily: F.quicksand, fontSize: 13, color: C.ink }}>{s.driver}</td><td style={{ padding: "13px 16px", fontFamily: F.quicksand, fontSize: 13, color: C.ink }}>{s.cargo}</td><td style={{ padding: "13px 16px", fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, color: C.forest }}>{s.weight}</td><td style={{ padding: "13px 16px", fontFamily: F.quicksand, fontSize: 13, fontWeight: 700, color: s.status === "delayed" ? C.red : s.eta === "Done" ? C.green : C.forest }}>{s.eta}</td><td style={{ padding: "13px 16px" }}><Tag color={pm.c} bg={pm.b}>{s.priority}</Tag></td><td style={{ padding: "13px 16px" }}><StatusBadge status={s.status} /></td></tr>;
            })}</tbody>
          </table>
          <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.parchmentDark}`, fontFamily: F.quicksand, fontSize: 12, color: C.muted }}>Showing {filtered.length} of {ALL_SHIPMENTS.length} shipments</div>
        </Card>
        {S && (
          <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 14, padding: "22px", height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><div><div style={{ fontFamily: F.syne, fontSize: 13, fontWeight: 700, color: C.forest }}>{S.id}</div><div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted }}>{S.cargo}</div></div><button onClick={() => setSelId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button></div>
            <div style={{ background: C.parchment, borderRadius: 11, height: 128, position: "relative", overflow: "hidden", border: `1px solid ${C.parchmentDark}`, marginBottom: 16 }}>
              <svg width="100%" height="100%" viewBox="0 0 200 120"><line x1="40" y1="90" x2="160" y2="30" stroke={C.sage} strokeWidth="2" strokeDasharray="5,3"/><circle cx="40" cy="90" r="6" fill={C.forest} stroke={C.cream} strokeWidth="2"/><text x="48" y="94" fontSize="7" fill={C.forest} fontFamily="sans-serif">{S.from.split(" ")[0]}</text><circle cx="160" cy="30" r="6" fill={C.green} stroke={C.cream} strokeWidth="2"/><text x="120" y="26" fontSize="7" fill={C.forest} fontFamily="sans-serif">{S.to.split(" ")[0]}</text><circle r="5" fill={C.amber} stroke={C.cream} strokeWidth="2"><animateMotion dur="3s" repeatCount="indefinite" path="M-55,28 L55,-28"/></circle></svg>
              <div style={{ position: "absolute", bottom: 8, left: 10, fontFamily: F.syne, fontSize: 9, color: C.forest, fontWeight: 700 }}>LIVE TRACKING</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>{([ ["From",S.from],["To",S.to],["Driver",S.driver],["Weight",S.weight],["ETA",S.eta],["Priority",S.priority] ] as [string,string][]).map(([k,v]) => <div key={k} style={{ background: C.parchment, borderRadius: 9, padding: "9px 12px" }}><div style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.muted, marginBottom: 3 }}>{k.toUpperCase()}</div><div style={{ fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 700, color: C.forest, textTransform: k === "Priority" ? "capitalize" : "none" }}>{v}</div></div>)}</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.forest, marginBottom: 12 }}>SHIPMENT TIMELINE</div>
              {TIMELINE.map((t, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: t.done ? C.forest : C.parchmentDark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 8, color: C.cream, fontWeight: 700 }}>{t.done ? "✓" : ""}</div>{i < TIMELINE.length - 1 && <div style={{ width: 1.5, height: 16, background: t.done ? C.sage : C.parchmentDark, marginTop: 2 }} />}</div><div><div style={{ fontFamily: F.quicksand, fontSize: 12, fontWeight: 600, color: t.done ? C.forest : C.muted }}>{t.step}</div><div style={{ fontFamily: F.quicksand, fontSize: 11, color: C.muted }}>{t.time}</div></div></div>)}
            </div>
            <Btn style={{ width: "100%", justifyContent: "center" }}>📲 Send WhatsApp Alert</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INVENTORY PAGE ───────────────────────────────────────────────────────────
const ALL_INVENTORY: InventoryItem[] = [
  { id:"INV-001", sku:"STL-ROD-12", name:"Steel Rods 12mm",      warehouse:"Warehouse A – Chennai",    qty:340,  min:100, max:800,  unit:"units", category:"Raw Material"  },
  { id:"INV-002", sku:"ELC-CAP-22", name:"Electronic Capacitors", warehouse:"Warehouse B – Coimbatore", qty:18,   min:50,  max:500,  unit:"boxes", category:"Electronics"   },
  { id:"INV-003", sku:"TXT-COT-XL", name:"Cotton Fabric XL",      warehouse:"Warehouse C – Tirupur",    qty:620,  min:200, max:1000, unit:"rolls", category:"Textiles"      },
  { id:"INV-004", sku:"CHM-H2SO4",  name:"Sulphuric Acid 98%",    warehouse:"Warehouse A – Chennai",    qty:82,   min:40,  max:200,  unit:"drums", category:"Chemicals"     },
  { id:"INV-005", sku:"AUT-BRK-44", name:"Brake Pads Set",        warehouse:"Warehouse D – Madurai",    qty:9,    min:30,  max:300,  unit:"sets",  category:"Auto Parts"    },
  { id:"INV-006", sku:"FDG-RIC-25", name:"Rice (25kg Bags)",       warehouse:"Warehouse E – Trichy",     qty:1200, min:300, max:2000, unit:"bags",  category:"Food Grains"   },
  { id:"INV-007", sku:"PLS-PVC-10", name:"PVC Pipes 10ft",         warehouse:"Warehouse B – Coimbatore", qty:455,  min:100, max:600,  unit:"pcs",   category:"Construction"  },
  { id:"INV-008", sku:"ELC-WRE-CU", name:"Copper Wire Coil",       warehouse:"Warehouse A – Chennai",    qty:25,   min:40,  max:250,  unit:"coils", category:"Electronics"   },
];

function InventoryPage(): React.ReactElement {
  const [cat,    setCat]    = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [selId,  setSelId]  = useState<string | null>(null);
  const [modal,  setModal]  = useState<boolean>(false);

  const filtered = useMemo<InventoryItem[]>(() => ALL_INVENTORY.filter(i => cat === "All" || i.category === cat).filter(i => (i.name + i.sku).toLowerCase().includes(search.toLowerCase())), [cat, search]);
  const S = selId ? ALL_INVENTORY.find(i => i.id === selId) ?? null : null;
  const inp: React.CSSProperties = { padding: "9px 12px", border: `1.5px solid ${C.parchmentDark}`, borderRadius: 9, fontSize: 13, outline: "none", fontFamily: F.quicksand, color: C.ink, background: C.white, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: C.cream }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest }}>Inventory</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 13, marginTop: 5 }}>Stock levels across all Tamil Nadu warehouses</div></div>
        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline">📤 Export</Btn><Btn onClick={() => setModal(true)}>+ Add Item</Btn></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        {([ ["📦","Total SKUs","8","Across 5 warehouses",C.forest],["⚠","Low Stock","3","Need reorder now",C.red],["💰","Est. Value","₹2.4M","Current stock",C.sage],["🔄","Reorders","2","Auto-triggered",C.amber] ] as [string,string,string,string,string][]).map(([ic,lb,vl,sb,co]) => <div key={lb} style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderLeft: `3px solid ${co}`, borderRadius: 14, padding: "18px 20px" }}><div style={{ fontSize: 22, marginBottom: 9 }}>{ic}</div><div style={{ fontFamily: F.lora, fontSize: 26, fontWeight: 700, color: C.forest }}>{vl}</div><div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted, marginTop: 3 }}>{lb}</div><div style={{ fontFamily: F.syne, fontSize: 9.5, color: co, marginTop: 3, fontWeight: 700 }}>{sb}</div></div>)}
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", gap: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 16 }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or item name..." style={{ ...inp, paddingLeft: 34, background: C.parchment }} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} />
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inp, minWidth: 180, width: "auto", cursor: "pointer" }}>
          {["All","Raw Material","Electronics","Textiles","Chemicals","Auto Parts","Food Grains","Construction"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: S ? "1fr 310px" : "1fr", gap: 20 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: C.parchment }}>{["SKU","Item Name","Warehouse","Quantity","Category","Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "11px 18px", fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: .8 }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(item => {
              const low = item.qty < item.min, warn = !low && item.qty < item.min * 1.5, isSel = selId === item.id;
              const pct = Math.min(100, Math.round(item.qty / item.max * 100));
              const barC = low ? C.red : warn ? C.amber : C.sage;
              return <tr key={item.id} onClick={() => setSelId(isSel ? null : item.id)} style={{ borderBottom: `1px solid ${C.parchment}`, background: isSel ? `${C.sage}10` : "transparent", cursor: "pointer" }} onMouseOver={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = C.parchment; }} onMouseOut={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}><td style={{ padding: "13px 18px", fontFamily: F.syne, fontSize: 11, fontWeight: 700, color: C.forest }}>{item.sku}</td><td style={{ padding: "13px 18px", fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</td><td style={{ padding: "13px 18px", fontFamily: F.quicksand, fontSize: 12, color: C.muted }}>{item.warehouse.split("–")[0].trim()}</td><td style={{ padding: "13px 18px" }}><div style={{ fontFamily: F.quicksand, fontSize: 13, fontWeight: 700, color: low ? C.red : C.forest }}>{item.qty}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> / {item.max} {item.unit}</span></div><div style={{ marginTop: 5, width: 110, background: C.parchmentDark, borderRadius: 20, height: 5 }}><div style={{ width: `${pct}%`, height: "100%", background: barC, borderRadius: 20 }} /></div></td><td style={{ padding: "13px 18px" }}><Tag color={C.sage}>{item.category}</Tag></td><td style={{ padding: "13px 18px" }}>{low ? <Tag color={C.red} bg={C.redBg}>Low Stock</Tag> : warn ? <Tag color={C.amber} bg={C.amberBg}>Warning</Tag> : <Tag color={C.green} bg={C.greenBg}>Normal</Tag>}</td></tr>;
            })}</tbody>
          </table>
        </Card>
        {S && <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 14, padding: "22px", height: "fit-content" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><div><div style={{ fontFamily: F.quicksand, fontSize: 15, fontWeight: 700, color: C.forest }}>{S.name}</div><div style={{ fontFamily: F.syne, fontSize: 9.5, color: C.muted, marginTop: 3 }}>{S.sku}</div></div><button onClick={() => setSelId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button></div>
          <div style={{ background: S.qty < S.min ? C.redBg : C.greenBg, borderRadius: 11, padding: "16px 18px", marginBottom: 14, border: `1px solid ${S.qty < S.min ? "#f5c6c2" : "#b7e4ca"}` }}>
            <div style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.muted, marginBottom: 6 }}>CURRENT STOCK</div>
            <div style={{ fontFamily: F.lora, fontSize: 34, fontWeight: 700, color: S.qty < S.min ? C.red : C.green }}>{S.qty} <span style={{ fontSize: 15, fontWeight: 400 }}>{S.unit}</span></div>
            <div style={{ marginTop: 10, background: "rgba(0,0,0,.08)", borderRadius: 20, height: 7 }}><div style={{ width: `${Math.min(100, Math.round(S.qty / S.max * 100))}%`, height: "100%", background: S.qty < S.min ? C.red : C.sage, borderRadius: 20 }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: F.syne, fontSize: 9, color: C.muted }}><span>MIN {S.min}</span><span>MAX {S.max}</span></div>
          </div>
          {([ ["Warehouse", S.warehouse], ["Category", S.category] ] as [string,string][]).map(([k,v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.parchment, borderRadius: 9, marginBottom: 8 }}><span style={{ fontFamily: F.syne, fontSize: 9, color: C.muted, fontWeight: 700 }}>{k.toUpperCase()}</span><span style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.forest, fontWeight: 700 }}>{v}</span></div>)}
          <Btn variant="danger" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>🔄 Trigger Reorder</Btn>
        </div>}
      </div>

      {modal && <div style={{ position: "fixed", inset: 0, background: "rgba(15,30,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
        <div style={{ background: C.cream, borderRadius: 16, padding: "32px", width: 460, boxShadow: `0 20px 60px ${C.forest}30`, border: `1px solid ${C.parchmentDark}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}><div style={{ fontFamily: F.lora, fontSize: 20, fontWeight: 700, color: C.forest }}>Add Inventory Item</div><button onClick={() => setModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{([ ["SKU Code","text"],["Item Name","text"],["Warehouse","text"],["Category","text"],["Quantity","number"],["Min Qty","number"],["Max Qty","number"],["Unit","text"] ] as [string,string][]).map(([l,t]) => <div key={l}><label style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.forest, display: "block", marginBottom: 5, letterSpacing: 1 }}>{l.toUpperCase()}</label><input type={t} style={inp} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} /></div>)}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}><Btn variant="outline" onClick={() => setModal(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn><Btn onClick={() => setModal(false)} style={{ flex: 2, justifyContent: "center" }}>Add Item ✓</Btn></div>
        </div>
      </div>}
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
const DEL_TREND = [
  { month:"Aug",onTime:88,delayed:12 },{ month:"Sep",onTime:90,delayed:10 },
  { month:"Oct",onTime:87,delayed:13 },{ month:"Nov",onTime:92,delayed:8  },
  { month:"Dec",onTime:89,delayed:11 },{ month:"Jan",onTime:93,delayed:7  },
  { month:"Feb",onTime:91,delayed:9  },{ month:"Mar",onTime:94,delayed:6  },
];
const ROUTE_V = [{ r:"Chennai→CBE",n:340 },{ r:"Ennore→MDU",n:210 },{ r:"Chennai→Salem",n:180 },{ r:"Trichy→Chennai",n:156 },{ r:"CBE→TNV",n:98 }];
const CARGO_M = [{ name:"Auto Parts",v:28,c:C.forest },{ name:"Food Grains",v:22,c:C.sage },{ name:"Electronics",v:18,c:C.sageDark },{ name:"Textiles",v:16,c:C.amber },{ name:"Chemicals",v:10,c:C.red },{ name:"Others",v:6,c:C.muted }];
const COST_D  = [{ m:"Aug",fuel:142,labor:98,misc:34 },{ m:"Sep",fuel:138,labor:102,misc:30 },{ m:"Oct",fuel:151,labor:95,misc:38 },{ m:"Nov",fuel:145,labor:100,misc:32 },{ m:"Dec",fuel:160,labor:108,misc:40 },{ m:"Jan",fuel:135,labor:96,misc:28 },{ m:"Feb",fuel:140,labor:99,misc:31 },{ m:"Mar",fuel:132,labor:94,misc:27 }];
const ANA_K = [
  { l:"On-Time Rate",v:"94.2%",ch:"+2.1%",up:true, ic:"✅",col:C.green     },
  { l:"Avg Turnaround",v:"3.4 hr",ch:"-18%",up:true,ic:"⏱", col:C.forest   },
  { l:"Delay Rate",v:"5.8%",ch:"-3.2%",up:true,    ic:"🚦",col:C.amber     },
  { l:"Cost per km",v:"₹42.6",ch:"-7%",up:true,    ic:"💰",col:C.sage      },
  { l:"Inv. Accuracy",v:"98.7%",ch:"+0.4%",up:true,ic:"📦",col:C.sageDark  },
  { l:"Driver Util.",v:"87.3%",ch:"+5.1%",up:true, ic:"🚛",col:C.forestLight},
];

function AnalyticsPage(): React.ReactElement {
  const [period, setPeriod] = useState<string>("8M");
  const costData = COST_D.map(d => ({ ...d, month: d.m }));
  const routeCols = [C.forest, C.sage, C.sageDark, C.amber, C.muted];
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: C.cream }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest }}>Analytics & KPIs</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 13, marginTop: 5 }}>Performance insights across Tamil Nadu's supply chain</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          {["1M","3M","8M","1Y"].map(p => <button key={p} onClick={() => setPeriod(p)} style={{ padding: "7px 16px", borderRadius: 20, border: period === p ? "none" : `1px solid ${C.parchmentDark}`, background: period === p ? C.forest : "transparent", color: period === p ? C.cream : C.muted, fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p}</button>)}
          <Btn variant="outline" style={{ marginLeft: 6 }}>📥 Export</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 22 }}>
        {ANA_K.map(k => <Card key={k.l} style={{ padding: "14px 16px", borderTop: `2px solid ${k.col}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}><div style={{ width: 32, height: 32, background: `${k.col}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{k.ic}</div><Tag color={k.up ? C.green : C.red} bg={k.up ? C.greenBg : C.redBg}>{k.ch}</Tag></div><div style={{ fontFamily: F.lora, fontSize: 22, fontWeight: 700, color: C.forest }}>{k.v}</div><div style={{ fontFamily: F.quicksand, fontSize: 11.5, color: C.muted, marginTop: 3 }}>{k.l}</div></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 16, marginBottom: 3 }}>Delivery Performance Trend</div>
          <div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted, marginBottom: 18 }}>On-time vs delayed (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEL_TREND}>
              <defs><linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.sage} stopOpacity={.25}/><stop offset="95%" stopColor={C.sage} stopOpacity={0}/></linearGradient><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={.12}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark}/><XAxis dataKey="month" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} domain={[0,100]}/><Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="onTime" name="On-Time" stroke={C.sage} strokeWidth={2.5} fill="url(#gO)" dot={{ fill:C.sage, r:4 }}/>
              <Area type="monotone" dataKey="delayed" name="Delayed" stroke={C.red} strokeWidth={2} fill="url(#gD)" dot={{ fill:C.red, r:3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 16, marginBottom: 3 }}>Cargo Type Mix</div>
          <div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted, marginBottom: 10 }}>Distribution by category</div>
          <ResponsiveContainer width="100%" height={138}><PieChart><Pie data={CARGO_M} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="v">{CARGO_M.map((c, i) => <Cell key={i} fill={c.c}/>)}</Pie><Tooltip formatter={(v: number) => `${v}%`}/></PieChart></ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px", marginTop: 6 }}>{CARGO_M.map(c => <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: c.c, flexShrink: 0 }}/><span style={{ fontFamily: F.quicksand, fontSize: 11, color: C.muted }}>{c.name}</span><span style={{ fontFamily: F.syne, fontSize: 10, fontWeight: 700, color: C.forest, marginLeft: "auto" }}>{c.v}%</span></div>)}</div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 16, marginBottom: 3 }}>Top Routes by Volume</div>
          <div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted, marginBottom: 18 }}>Shipments this month</div>
          {ROUTE_V.map((r, i) => <div key={r.r} style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{r.r}</span><span style={{ fontFamily: F.syne, fontSize: 11, fontWeight: 700, color: routeCols[i] }}>{r.n}</span></div><div style={{ background: C.parchmentDark, borderRadius: 20, height: 6 }}><div style={{ width: `${Math.round(r.n / ROUTE_V[0].n * 100)}%`, height: "100%", background: routeCols[i], borderRadius: 20 }}/></div></div>)}
        </Card>
        <Card>
          <div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 16, marginBottom: 3 }}>Monthly Cost Breakdown</div>
          <div style={{ fontFamily: F.quicksand, fontSize: 12, color: C.muted, marginBottom: 16 }}>Fuel / Labor / Misc (₹ thousands)</div>
          <ResponsiveContainer width="100%" height={172}><BarChart data={costData}><CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark}/><XAxis dataKey="month" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="fuel" name="Fuel" stackId="a" fill={C.forest}/><Bar dataKey="labor" name="Labor" stackId="a" fill={C.sage}/><Bar dataKey="misc" name="Misc" stackId="a" fill={C.sageLight} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>{([ ["Fuel",C.forest],["Labor",C.sage],["Misc",C.sageLight] ] as [string,string][]).map(([l,co]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.quicksand, fontSize: 11, color: C.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: co, display: "inline-block" }}/>{l}</span>)}</div>
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
const ALL_USERS: AdminUser[] = [
  { id:"USR-001", name:"Karthik Rajan",  email:"karthik@scs.in",  role:"admin",             company:"SCS HQ",            status:"active",   lastLogin:"Today 09:30", av:"K" },
  { id:"USR-002", name:"Meena Devi",     email:"meena@ennore.in", role:"port_authority",    company:"Ennore Port Trust", status:"active",   lastLogin:"Today 08:50", av:"M" },
  { id:"USR-003", name:"Ramesh Kumar",   email:"ramesh@tvs.in",   role:"driver",            company:"TVS Logistics",     status:"active",   lastLogin:"Today 11:00", av:"R" },
  { id:"USR-004", name:"Suresh Pandian", email:"suresh@dhl.in",   role:"warehouse_manager", company:"DHL Tamil Nadu",    status:"inactive", lastLogin:"Mar 05",      av:"S" },
  { id:"USR-005", name:"Anitha P.",      email:"anitha@scs.in",   role:"analytics_officer", company:"SCS HQ",            status:"active",   lastLogin:"Today 10:15", av:"A" },
  { id:"USR-006", name:"Vijay Mohan",    email:"vijay@chen.port", role:"port_authority",    company:"Chennai Port Trust",status:"pending",  lastLogin:"Never",       av:"V" },
];
const ROLE_META: Record<string, { label: string; c: string }> = {
  admin:             { label:"Admin",             c:C.forest  },
  port_authority:    { label:"Port Authority",    c:C.sageDark},
  warehouse_manager: { label:"Warehouse Mgr",     c:C.amber   },
  driver:            { label:"Driver",            c:C.green   },
  analytics_officer: { label:"Analytics Officer", c:C.sage    },
};
const AUDIT: AuditEntry[] = [
  { id:1, user:"Karthik Rajan",  action:"Updated shipment SHP-4821 status to delayed",    time:"Today 11:45",    type:"update",  icon:"✏"  },
  { id:2, user:"Meena Devi",     action:"Added new port entry log for Ennore",             time:"Today 11:20",    type:"create",  icon:"＋" },
  { id:3, user:"System",         action:"Auto-triggered reorder for INV-005 (Brake Pads)", time:"Today 10:55",    type:"system",  icon:"⚙"  },
  { id:4, user:"Ramesh Kumar",   action:"Checked in at Chennai Port — Gate 3",             time:"Today 10:15",    type:"checkin", icon:"◉"  },
  { id:5, user:"Suresh Pandian", action:"Login failed (3 attempts) — IP flagged",          time:"Mar 09, 2:30pm", type:"warning", icon:"⚠"  },
];
const SYS_H: ServiceHealth[] = [
  { label:"API Server",    status:"online",  uptime:"99.9%", ping:"23ms" },
  { label:"MongoDB Atlas", status:"online",  uptime:"99.8%", ping:"48ms" },
  { label:"Redis Cache",   status:"online",  uptime:"100%",  ping:"5ms"  },
  { label:"Socket.io",     status:"online",  uptime:"99.7%", ping:"12ms" },
  { label:"Twilio SMS",    status:"warning", uptime:"98.2%", ping:"—"    },
  { label:"Google Maps",   status:"online",  uptime:"99.9%", ping:"67ms" },
];

function AdminPage(): React.ReactElement {
  const [tab,      setTab]      = useState<string>("users");
  const [search,   setSearch]   = useState<string>("");
  const [selId,    setSelId]    = useState<string | null>(null);
  const [showModal,setShowModal]= useState<boolean>(false);

  const filtered = useMemo<AdminUser[]>(() => ALL_USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())), [search]);
  const S = selId ? ALL_USERS.find(u => u.id === selId) ?? null : null;
  const inp: React.CSSProperties = { padding: "9px 12px", border: `1.5px solid ${C.parchmentDark}`, borderRadius: 9, fontSize: 13, outline: "none", fontFamily: F.quicksand, color: C.ink, background: C.white, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: C.cream }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><div style={{ fontFamily: F.lora, fontSize: 27, fontWeight: 700, color: C.forest }}>Admin Panel</div><div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 13, marginTop: 5 }}>Manage users, roles, system health and audit logs</div></div>
        <Btn onClick={() => setShowModal(true)}>+ Add User</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        {([ ["👥","Total Users","6",C.forest],["🟢","Active Sessions","4",C.green],["⏳","Pending","1",C.amber],["⚡","Uptime","99.8%",C.sage] ] as [string,string,string,string][]).map(([ic,lb,vl,co]) => <Card key={lb} style={{ borderTop: `2px solid ${co}` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontFamily: F.lora, fontSize: 26, fontWeight: 700, color: C.forest }}>{vl}</div><div style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.muted, marginTop: 4 }}>{lb}</div></div><div style={{ width: 42, height: 42, background: `${co}12`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ic}</div></div></Card>)}
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 22, background: C.white, borderRadius: 11, padding: 4, border: `1px solid ${C.parchmentDark}`, width: "fit-content" }}>
        {([ ["users","Users"],["audit","Audit Log"],["system","System Health"] ] as [string,string][]).map(([id,l]) => <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: tab === id ? C.forest : "transparent", color: tab === id ? C.cream : C.muted, fontFamily: F.quicksand, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>{l}</button>)}
      </div>

      {tab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: S ? "1fr 300px" : "1fr", gap: 20 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.parchmentDark}`, position: "relative" }}>
              <span style={{ position: "absolute", left: 34, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 16 }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ ...inp, paddingLeft: 36, background: C.parchment }} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.parchment }}>{["User","Email","Role","Company","Status","Last Login"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 18px", fontFamily: F.syne, fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: .8 }}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map(u => { const rm = ROLE_META[u.role]; const isSel = selId === u.id; return <tr key={u.id} onClick={() => setSelId(isSel ? null : u.id)} style={{ borderBottom: `1px solid ${C.parchment}`, background: isSel ? `${C.sage}10` : "transparent", cursor: "pointer" }} onMouseOver={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = C.parchment; }} onMouseOut={e => { if (!isSel) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}><td style={{ padding: "12px 18px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 12, color: C.cream, fontWeight: 700 }}>{u.av}</div><span style={{ fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, color: C.ink }}>{u.name}</span></div></td><td style={{ padding: "12px 18px", fontFamily: F.quicksand, fontSize: 12.5, color: C.muted }}>{u.email}</td><td style={{ padding: "12px 18px" }}>{rm && <Tag color={rm.c}>{rm.label}</Tag>}</td><td style={{ padding: "12px 18px", fontFamily: F.quicksand, fontSize: 12.5, color: C.ink }}>{u.company}</td><td style={{ padding: "12px 18px" }}><StatusBadge status={u.status}/></td><td style={{ padding: "12px 18px", fontFamily: F.quicksand, fontSize: 12, color: C.muted }}>{u.lastLogin}</td></tr>; })}</tbody>
            </table>
          </Card>
          {S && <div style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 14, padding: "22px", height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 46, height: 46, borderRadius: "50%", background: C.forest, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 18, color: C.cream, fontWeight: 700 }}>{S.av}</div><div><div style={{ fontFamily: F.quicksand, fontSize: 15, fontWeight: 700, color: C.forest }}>{S.name}</div><div style={{ fontFamily: F.syne, fontSize: 9, color: C.muted }}>{S.id}</div></div></div><button onClick={() => setSelId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button></div>
            {([ ["Email",S.email],["Role",ROLE_META[S.role]?.label],["Company",S.company],["Last Login",S.lastLogin] ] as [string,string][]).map(([k,v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: C.parchment, borderRadius: 9, marginBottom: 8 }}><span style={{ fontFamily: F.syne, fontSize: 9, color: C.muted, fontWeight: 700 }}>{k.toUpperCase()}</span><span style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.forest, fontWeight: 700 }}>{v}</span></div>)}
            <div style={{ marginBottom: 12, marginTop: 4 }}><label style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.forest, letterSpacing: 1, display: "block", marginBottom: 6 }}>CHANGE ROLE</label><select defaultValue={S.role} style={{ ...inp, cursor: "pointer" }}>{Object.entries(ROLE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Btn style={{ width: "100%", justifyContent: "center" }}>💾 Save Changes</Btn><Btn variant="danger" style={{ width: "100%", justifyContent: "center" }}>Deactivate Account</Btn></div>
          </div>}
        </div>
      )}
      {tab === "audit" && <Card><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15, marginBottom: 18 }}>System Audit Log</div>{AUDIT.map((log, i) => <div key={log.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < AUDIT.length - 1 ? `1px solid ${C.parchment}` : "none" }}><div style={{ width: 36, height: 36, borderRadius: 8, background: log.type === "warning" ? C.redBg : C.parchment, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.syne, fontSize: 16, color: log.type === "warning" ? C.red : C.sage, flexShrink: 0, border: `1px solid ${C.parchmentDark}` }}>{log.icon}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: F.quicksand, fontSize: 13, fontWeight: 700, color: C.forest }}>{log.user}</span><span style={{ fontFamily: F.syne, fontSize: 10, color: C.muted }}>{log.time}</span></div><div style={{ fontFamily: F.quicksand, fontSize: 12.5, color: C.muted, marginTop: 3 }}>{log.action}</div></div><Tag color={log.type === "warning" ? C.red : C.sage}>{log.type}</Tag></div>)}</Card>}
      {tab === "system" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15, marginBottom: 18 }}>Service Status</div>{SYS_H.map(s => <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.parchment, borderRadius: 9, marginBottom: 10, border: `1px solid ${C.parchmentDark}` }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: s.status === "online" ? C.green : C.amber, boxShadow: s.status === "online" ? `0 0 0 3px ${C.greenBg}` : `0 0 0 3px ${C.amberBg}` }} /><div style={{ flex: 1, fontFamily: F.quicksand, fontSize: 13, fontWeight: 600, color: C.ink }}>{s.label}</div><div style={{ fontFamily: F.syne, fontSize: 10, color: C.muted }}>PING {s.ping}</div><Tag color={s.status === "online" ? C.green : C.amber} bg={s.status === "online" ? C.greenBg : C.amberBg}>{s.uptime}</Tag></div>)}</Card>
        <Card><div style={{ fontFamily: F.lora, fontWeight: 600, color: C.forest, fontSize: 15, marginBottom: 18 }}>System Actions</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{["🔄 Restart Services","🗄 Backup DB","📊 Run Report","🧹 Clear Cache","📧 Test Email","🔑 Rotate Keys"].map(l => <button key={l} style={{ padding: "13px 10px", background: C.parchment, border: `1px solid ${C.parchmentDark}`, borderRadius: 9, cursor: "pointer", fontFamily: F.quicksand, fontSize: 12.5, fontWeight: 600, color: C.forest }} onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = `${C.sage}18`; (e.currentTarget as HTMLButtonElement).style.borderColor = C.sage; }} onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = C.parchment; (e.currentTarget as HTMLButtonElement).style.borderColor = C.parchmentDark; }}>{l}</button>)}</div></Card>
      </div>}

      {showModal && <div style={{ position: "fixed", inset: 0, background: "rgba(15,30,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
        <div style={{ background: C.cream, borderRadius: 16, padding: "32px", width: 440, boxShadow: `0 20px 60px ${C.forest}30`, border: `1px solid ${C.parchmentDark}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}><div style={{ fontFamily: F.lora, fontSize: 20, fontWeight: 700, color: C.forest }}>Add New User</div><button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{([ ["FULL NAME","text"],["EMAIL","email"],["PHONE","tel"],["COMPANY","text"] ] as [string,string][]).map(([lbl,type]) => <div key={lbl}><label style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.forest, display: "block", marginBottom: 5, letterSpacing: 1 }}>{lbl}</label><input type={type} style={inp} onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.sage} onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.parchmentDark}/></div>)}<div><label style={{ fontFamily: F.syne, fontSize: 9, fontWeight: 700, color: C.forest, display: "block", marginBottom: 5, letterSpacing: 1 }}>ASSIGN ROLE</label><select style={{ ...inp, cursor: "pointer" }}>{Object.entries(ROLE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div></div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}><Btn variant="outline" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn><Btn onClick={() => setShowModal(false)} style={{ flex: 2, justifyContent: "center" }}>Create User ✓</Btn></div>
        </div>
      </div>}
    </div>
  );
}

// ─── PLACEHOLDER ──────────────────────────────────────────────────────────────
interface PlaceholderProps { title: string; icon: string; desc: string; }
function PlaceholderPage({ title, icon, desc }: PlaceholderProps): React.ReactElement {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.cream }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>{icon}</div>
        <div style={{ fontFamily: F.lora, fontSize: 24, fontWeight: 700, color: C.forest, marginBottom: 8, fontStyle: "italic" }}>{title}</div>
        <div style={{ fontFamily: F.quicksand, color: C.muted, fontSize: 14 }}>{desc}</div>
        <div style={{ marginTop: 20, padding: "10px 22px", background: C.parchment, border: `1px solid ${C.parchmentDark}`, borderRadius: 8, fontFamily: F.syne, fontSize: 11, fontWeight: 700, color: C.sage, letterSpacing: 1, display: "inline-block" }}>COMING SOON</div>
      </div>
    </div>
  );
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────
interface MainLayoutProps { user: User; onLogout: () => void; }
function MainLayout({ user, onLogout }: MainLayoutProps): React.ReactElement {
  const [page, setPage] = useState<PageId>("dashboard");
  const renderPage = (): React.ReactElement => {
    switch (page) {
      case "dashboard": return <DashboardPage onNav={setPage} />;
      case "shipments": return <ShipmentsPage />;
      case "inventory": return <InventoryPage />;
      case "analytics": return <AnalyticsPage />;
      case "admin":     return <AdminPage />;
      case "lastmile":  return <PlaceholderPage title="Last Mile Optimizer" icon="📍" desc="Route optimization and driver management." />;
      case "alerts":    return <PlaceholderPage title="Alerts Centre" icon="🔔" desc="Full alert management dashboard." />;
      default:          return <DashboardPage onNav={setPage} />;
    }
  };
  return (
    <div style={{ display: "flex", height: "100vh", background: C.cream }}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={onLogout} />
      {renderPage()}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(): React.ReactElement {
  useFonts();
  const [screen, setScreen] = useState<Screen>("login");
  const [user,   setUser]   = useState<User | null>(null);

  const handleLogin  = (u: User): void => { setUser(u); setScreen("app"); };
  const handleLogout = ():        void  => { setUser(null); setScreen("login"); };

  if (screen === "app" && user) return <MainLayout user={user} onLogout={handleLogout} />;
  if (screen === "register")    return <RegisterPage onSwitch={() => setScreen("login")} onLogin={handleLogin} />;
  return <LoginPage onSwitch={() => setScreen("register")} onLogin={handleLogin} />;
}
