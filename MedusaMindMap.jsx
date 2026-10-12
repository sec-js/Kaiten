import { useState, useEffect, useRef } from "react";

const PHASES = [
  {
    id: "initial-access",
    label: "Initial Access",
    tactic: "TA0001",
    color: "#FF4444",
    techniques: [
      { id: "T1190", name: "Exploit Public-Facing App", detail: "CVE-2023-48788 (Fortinet), CVE-2024-1709 (ScreenConnect), ProxyShell" },
      { id: "T1133", name: "External Remote Services", detail: "RDP with IAB-sourced credentials" },
      { id: "T1566", name: "Phishing", detail: "Spear-phishing with malicious attachments or credential-harvest links" },
    ],
    tools: ["ScreenConnect Exploit", "Fortinet SQLi", "IAB Creds"],
  },
  {
    id: "execution",
    label: "Execution",
    tactic: "TA0002",
    color: "#FF7700",
    techniques: [
      { id: "T1059.001", name: "PowerShell", detail: "Obfuscated encoded PS scripts for payload delivery" },
      { id: "T1047", name: "WMI", detail: "Remote execution and shadow copy deletion via WMIC" },
      { id: "T1569.002", name: "Service Execution", detail: "PsExec remote payload execution" },
    ],
    tools: ["PowerShell", "WMIC", "PsExec"],
  },
  {
    id: "persistence",
    label: "Persistence",
    tactic: "TA0003",
    color: "#FFAA00",
    techniques: [
      { id: "T1547.001", name: "Registry Run Keys", detail: "HKCU Run keys for startup execution" },
      { id: "T1136.002", name: "Create Domain Account", detail: "Rogue domain accounts for re-entry" },
    ],
    tools: ["reg.exe", "net user /add /domain"],
  },
  {
    id: "defense-evasion",
    label: "Defense Evasion",
    tactic: "TA0005",
    color: "#DDCC00",
    techniques: [
      { id: "T1562.001", name: "Disable Security Tools", detail: "BYOVD to kill EDR; Safe Mode reboot to bypass AV" },
      { id: "T1548.002", name: "UAC Bypass via COM", detail: "dllhost.exe COM object abuse for elevated execution" },
      { id: "T1027", name: "Obfuscated Scripts", detail: "Base64-encoded PS, packed binaries" },
      { id: "T1070.003", name: "Clear Command History", detail: "PS history and Windows event log wipe" },
    ],
    tools: ["BYOVD Driver", "dllhost.exe", "wevtutil"],
  },
  {
    id: "credential-access",
    label: "Credential Access",
    tactic: "TA0006",
    color: "#88CC00",
    techniques: [
      { id: "T1003.001", name: "LSASS Memory Dump", detail: "procdump.exe / comsvcs.dll MiniDump against lsass.exe" },
      { id: "T1528", name: "Steal Auth Tokens", detail: "Token impersonation for privilege escalation" },
    ],
    tools: ["procdump.exe", "comsvcs.dll", "Mimikatz"],
  },
  {
    id: "discovery",
    label: "Discovery",
    tactic: "TA0007",
    color: "#00BB44",
    techniques: [
      { id: "T1046", name: "Network Service Scan", detail: "Port scanning for lateral targets" },
      { id: "T1135", name: "Network Share Discovery", detail: "SMB share enumeration for lateral targets" },
      { id: "T1082", name: "System Info Discovery", detail: "OS/hostname/domain enumeration" },
      { id: "T1012", name: "Query Registry", detail: "Identify AV/EDR products deployed" },
    ],
    tools: ["ADRecon", "BloodHound", "net share", "nltest"],
  },
  {
    id: "lateral-movement",
    label: "Lateral Movement",
    tactic: "TA0008",
    color: "#0099CC",
    techniques: [
      { id: "T1021.001", name: "RDP", detail: "RDP pivot with harvested domain credentials" },
      { id: "T1569.002", name: "PsExec", detail: "Remote payload drop and execution" },
      { id: "T1047", name: "WMI Lateral Move", detail: "WMI remote command execution to adjacent hosts" },
    ],
    tools: ["mstsc.exe", "PsExec.exe", "wmic /node"],
  },
  {
    id: "exfiltration",
    label: "Exfiltration",
    tactic: "TA0010",
    color: "#0055FF",
    techniques: [
      { id: "T1567.002", name: "Exfil to Cloud Storage", detail: "Rclone from C:\\Windows\\AppCompat \u2192 put.io" },
      { id: "T1071.001", name: "HTTPS C2 Channel", detail: "Encrypted HTTPS tunnels blending with normal traffic" },
    ],
    tools: ["Rclone.exe", "put.io", "HTTPS Tunnel"],
  },
  {
    id: "impact",
    label: "Impact",
    tactic: "TA0040",
    color: "#AA00FF",
    techniques: [
      { id: "T1486", name: "Data Encrypted for Impact", detail: "AES-256 + RSA key protection; .medusa extension appended" },
      { id: "T1490", name: "Inhibit System Recovery", detail: "vssadmin delete shadows / WMI VSS deletion; ransom note drop" },
    ],
    tools: ["Medusa Encryptor", "vssadmin.exe", "!!!READ_ME_MEDUSA!!!.txt"],
  },
];

const SVG_W = 1100;
const SVG_H = 860;
const CX = 550;
const CY = 430;
const PHASE_R = 240;
const NODE_W = 130;
const NODE_H = 46;
const TECH_W = 120;
const TECH_H = 36;
const TECH_EXTRA = 150;
const HEX_R = 54;
const MAX_HALF_SPREAD = (25 * Math.PI) / 180;

const PHASE_DATA = PHASES.map((phase, i) => {
  const angle = ((i / PHASES.length) * 360 - 90) * (Math.PI / 180);
  const px = CX + PHASE_R * Math.cos(angle);
  const py = CY + PHASE_R * Math.sin(angle);
  return { ...phase, angle, px, py };
});

function hexPath(cx, cy, r) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return `M${pts.join(" L")} Z`;
}

function boxEdge(cx, cy, W, H, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const eps = 1e-9;
  if (Math.abs(cos) < eps) return { x: cx, y: cy + (sin > 0 ? H / 2 : -H / 2) };
  if (Math.abs(sin) < eps) return { x: cx + (cos > 0 ? W / 2 : -W / 2), y: cy };
  const t = Math.min((W / 2) / Math.abs(cos), (H / 2) / Math.abs(sin));
  return { x: cx + cos * t, y: cy + sin * t };
}

function getTechNodes(phaseIdx) {
  const pd = PHASE_DATA[phaseIdx];
  const N = pd.techniques.length;
  return pd.techniques.map((tech, j) => {
    const frac = N > 1 ? j / (N - 1) : 0.5;
    const techAngle = pd.angle + (frac - 0.5) * 2 * MAX_HALF_SPREAD;
    const tx = pd.px + TECH_EXTRA * Math.cos(techAngle);
    const ty = pd.py + TECH_EXTRA * Math.sin(techAngle);
    const lineStart = boxEdge(pd.px, pd.py, NODE_W, NODE_H, techAngle);
    const lineEnd = boxEdge(tx, ty, TECH_W, TECH_H, techAngle + Math.PI);
    return { ...tech, tx, ty, techAngle, lineStart, lineEnd };
  });
}

export default function MedusaMindMap() {
  const [selected, setSelected] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);
  const [runAll, setRunAll] = useState(false);
  const [runStep, setRunStep] = useState(-1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!runAll) return;
    let step = 0;
    const advance = () => {
      if (step < PHASE_DATA.length) {
        setRunStep(step);
        setSelected(PHASE_DATA[step]);
        setSelectedTech(null);
        step++;
        timerRef.current = setTimeout(advance, 1800);
      } else {
        setRunAll(false);
        setRunStep(-1);
      }
    };
    advance();
    return () => clearTimeout(timerRef.current);
  }, [runAll]);

  const selectedIdx = selected ? PHASE_DATA.findIndex((p) => p.id === selected.id) : -1;
  const techNodes = selectedIdx >= 0 ? getTechNodes(selectedIdx) : [];

  const handlePhaseClick = (pd) => {
    if (selected?.id === pd.id) {
      setSelected(null);
      setSelectedTech(null);
    } else {
      setSelected(pd);
      setSelectedTech(null);
    }
  };

  const handleTechClick = (tn, e) => {
    e.stopPropagation();
    setSelectedTech(selectedTech?.id === tn.id ? null : tn);
  };

  const reset = () => {
    setSelected(null);
    setSelectedTech(null);
    setRunAll(false);
    setRunStep(-1);
    clearTimeout(timerRef.current);
  };

  return (
    <div style={{
      background: "#080C14",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: "#C8D8E8",
      padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
        @keyframes dash { to { stroke-dashoffset: -24; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes techAppear { from{opacity:0} to{opacity:1} }
        .tech-branch { animation: techAppear 0.25s ease forwards; opacity: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #334; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: "#FF4444", letterSpacing: 3, textTransform: "uppercase" }}>
            ⬡ AttackIQ — Medusa Ransomware
          </div>
          <div style={{ fontSize: 11, color: "#556", letterSpacing: 2, marginTop: 3 }}>
            THREAT MIND MAP · MITRE ATT&CK v16 · DOUBLE EXTORTION MODEL
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setRunAll(true); setSelected(null); setSelectedTech(null); }}
            disabled={runAll}
            style={{ background: runAll ? "#1a2a1a" : "#0d1f0d", border: "1px solid #00FF88", color: "#00FF88", padding: "8px 16px", fontSize: 11, fontFamily: "inherit", cursor: runAll ? "not-allowed" : "pointer", letterSpacing: 1, borderRadius: 3 }}
          >
            {runAll ? "▶ RUNNING..." : "▶ RUN EMULATION"}
          </button>
          <button
            onClick={reset}
            style={{ background: "#100", border: "1px solid #FF4444", color: "#FF4444", padding: "8px 16px", fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: 1, borderRadius: 3 }}
          >
            ✕ RESET
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {runAll && (
        <div style={{ height: 3, background: "#111", marginBottom: 16, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${((runStep + 1) / PHASE_DATA.length) * 100}%`,
            background: "linear-gradient(90deg,#FF4444,#AA00FF)",
            transition: "width 0.4s",
          }} />
        </div>
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
        {/* SVG Mind Map */}
        <div style={{ flex: "1 1 auto", background: "#060A12", border: "1px solid #1a2535", borderRadius: 6, overflow: "hidden" }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0d1420" strokeWidth="1" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-strong">
                <feGaussianBlur stdDeviation="7" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

            {/* Spokes from center hex to phase nodes */}
            {PHASE_DATA.map((pd, i) => {
              const isActive = selected?.id === pd.id || runStep === i;
              const from = { x: CX + HEX_R * Math.cos(pd.angle), y: CY + HEX_R * Math.sin(pd.angle) };
              const to = boxEdge(pd.px, pd.py, NODE_W, NODE_H, pd.angle + Math.PI);
              return (
                <line
                  key={pd.id + "-spoke"}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isActive ? pd.color : "#1e2d42"}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 0.8 : 0.4}
                  strokeDasharray={isActive ? "6 3" : "none"}
                  style={isActive ? { animation: "dash 1.2s linear infinite" } : {}}
                />
              );
            })}

            {/* Technique sub-branches (selected phase only) */}
            {techNodes.map((tn, j) => {
              const isSel = selectedTech?.id === tn.id;
              const name = tn.name.length > 17 ? tn.name.slice(0, 17) + "…" : tn.name;
              return (
                <g
                  key={tn.id}
                  className="tech-branch"
                  style={{ animationDelay: `${j * 0.06}s`, cursor: "pointer" }}
                  onClick={(e) => handleTechClick(tn, e)}
                >
                  <line
                    x1={tn.lineStart.x} y1={tn.lineStart.y}
                    x2={tn.lineEnd.x} y2={tn.lineEnd.y}
                    stroke={selected?.color}
                    strokeWidth={isSel ? 1.5 : 1}
                    opacity={0.45}
                    strokeDasharray="4 3"
                  />
                  {isSel && (
                    <rect
                      x={tn.tx - TECH_W / 2 - 3} y={tn.ty - TECH_H / 2 - 3}
                      width={TECH_W + 6} height={TECH_H + 6} rx={5}
                      fill="none" stroke={selected?.color} strokeWidth={1.5} opacity={0.35}
                      style={{ animation: "pulse 1s ease-in-out infinite" }}
                    />
                  )}
                  <rect
                    x={tn.tx - TECH_W / 2} y={tn.ty - TECH_H / 2}
                    width={TECH_W} height={TECH_H} rx={3}
                    fill={isSel ? `${selected?.color}28` : "#0d1525"}
                    stroke={isSel ? selected?.color : `${selected?.color}55`}
                    strokeWidth={isSel ? 1.5 : 1}
                    filter={isSel ? "url(#glow)" : "none"}
                  />
                  <rect
                    x={tn.tx - TECH_W / 2} y={tn.ty - TECH_H / 2}
                    width={3} height={TECH_H} rx={1}
                    fill={selected?.color} opacity={0.7}
                  />
                  <text
                    x={tn.tx - TECH_W / 2 + 8} y={tn.ty - 5}
                    fill={selected?.color} fontSize={8} fontWeight={700} letterSpacing={0.5}
                  >{tn.id}</text>
                  <text
                    x={tn.tx - TECH_W / 2 + 8} y={tn.ty + 8}
                    fill={isSel ? "#fff" : "#8AAAC0"} fontSize={8.5} fontWeight={600}
                  >{name}</text>
                </g>
              );
            })}

            {/* Phase nodes */}
            {PHASE_DATA.map((pd, i) => {
              const isSel = selected?.id === pd.id;
              const isRun = runStep === i;
              const nx = pd.px - NODE_W / 2;
              const ny = pd.py - NODE_H / 2;
              return (
                <g key={pd.id} onClick={() => handlePhaseClick(pd)} style={{ cursor: "pointer" }}>
                  {(isSel || isRun) && (
                    <rect
                      x={nx - 4} y={ny - 4} width={NODE_W + 8} height={NODE_H + 8} rx={6}
                      fill="none" stroke={pd.color} strokeWidth={2} opacity={0.4}
                      style={{ animation: "pulse 1s ease-in-out infinite" }}
                    />
                  )}
                  <rect
                    x={nx} y={ny} width={NODE_W} height={NODE_H} rx={4}
                    fill={isSel || isRun ? `${pd.color}22` : "#0e1525"}
                    stroke={isSel || isRun ? pd.color : "#1e2d42"}
                    strokeWidth={isSel || isRun ? 2 : 1}
                    filter={isSel ? "url(#glow)" : "none"}
                  />
                  <rect x={nx} y={ny} width={4} height={NODE_H} rx={2} fill={pd.color} />
                  <text x={nx + 10} y={ny + 17} fill={pd.color} fontSize={9} fontWeight={700} letterSpacing={1}>{pd.tactic}</text>
                  <text x={nx + 10} y={ny + 33} fill={isSel || isRun ? "#fff" : "#9BAAC0"} fontSize={11} fontWeight={600}>{pd.label}</text>
                  <text x={nx + NODE_W - 8} y={ny + NODE_H - 6} fill={pd.color} fontSize={9} textAnchor="end" opacity={0.7}>{pd.techniques.length}T</text>
                  {isRun && (
                    <circle cx={nx + NODE_W - 8} cy={ny + 12} r={4} fill={pd.color}
                      style={{ animation: "pulse 0.6s ease-in-out infinite" }} />
                  )}
                </g>
              );
            })}

            {/* Center hexagon */}
            <g filter="url(#glow-strong)">
              <path d={hexPath(CX, CY, HEX_R + 10)} fill="none" stroke="#FF4444" strokeWidth={1} opacity={0.12} />
              <path d={hexPath(CX, CY, HEX_R)} fill="#0a0e1c" stroke="#FF4444" strokeWidth={2} />
            </g>
            <text x={CX} y={CY - 10} textAnchor="middle" fill="#FF4444" fontSize={9} fontFamily="'Orbitron',monospace" fontWeight={900} letterSpacing={2}>MEDUSA</text>
            <text x={CX} y={CY + 3} textAnchor="middle" fill="#FF4444" fontSize={9} fontFamily="'Orbitron',monospace" fontWeight={900} letterSpacing={2}>RANSOM</text>
            <text x={CX} y={CY + 16} textAnchor="middle" fill="#FF444466" fontSize={7} letterSpacing={3}>WARE</text>
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{
          width: 280,
          flexShrink: 0,
          background: "#060A12",
          border: "1px solid #1a2535",
          borderRadius: 6,
          padding: 16,
          overflowY: "auto",
          maxHeight: "calc(100vh - 180px)",
        }}>
          {selected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 13, color: selected.color, fontWeight: 700 }}>{selected.label}</div>
                  <div style={{ fontSize: 10, color: "#445", letterSpacing: 1 }}>{selected.tactic}</div>
                </div>
              </div>

              {selectedTech && (
                <div style={{ background: `${selected.color}12`, border: `1px solid ${selected.color}44`, borderRadius: 4, padding: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#556", letterSpacing: 1, marginBottom: 6 }}>SELECTED TECHNIQUE</div>
                  <div style={{ color: selected.color, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{selectedTech.id}</div>
                  <div style={{ color: "#C8D8E8", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{selectedTech.name}</div>
                  <div style={{ color: "#6a7f96", fontSize: 10, lineHeight: 1.5 }}>{selectedTech.detail}</div>
                </div>
              )}

              <div style={{ fontSize: 10, color: "#556", letterSpacing: 1, marginBottom: 8, borderBottom: "1px solid #1a2535", paddingBottom: 6 }}>
                TECHNIQUES ({selected.techniques.length})
              </div>
              {selected.techniques.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTech(selectedTech?.id === t.id ? null : t)}
                  style={{
                    borderLeft: `3px solid ${selectedTech?.id === t.id ? selected.color : selected.color + "55"}`,
                    padding: "7px 10px",
                    margin: "6px 0",
                    background: selectedTech?.id === t.id ? `${selected.color}12` : "rgba(255,255,255,0.04)",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: selected.color, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{t.id}</div>
                  <div style={{ color: "#C8D8E8", fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{t.name}</div>
                  <div style={{ color: "#6a7f96", fontSize: 10, lineHeight: 1.5 }}>{t.detail}</div>
                </div>
              ))}

              <div style={{ fontSize: 10, color: "#556", letterSpacing: 1, margin: "14px 0 8px", borderBottom: "1px solid #1a2535", paddingBottom: 6 }}>
                TOOLS / ARTIFACTS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.tools.map((tool) => (
                  <span key={tool} style={{
                    background: `${selected.color}18`,
                    border: `1px solid ${selected.color}44`,
                    color: selected.color,
                    padding: "3px 8px",
                    borderRadius: 3,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  }}>{tool}</span>
                ))}
              </div>

              <div style={{ marginTop: 16, background: "#0a1020", border: "1px solid #1a2535", borderRadius: 4, padding: 10 }}>
                <div style={{ fontSize: 9, color: "#556", letterSpacing: 1, marginBottom: 6 }}>DETECTION PRIORITY</div>
                <div style={{ width: "100%", height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    borderRadius: 3,
                    width: ["initial-access", "impact", "exfiltration", "defense-evasion"].includes(selected.id) ? "90%" :
                      ["credential-access", "lateral-movement"].includes(selected.id) ? "75%" : "55%",
                    background: `linear-gradient(90deg, ${selected.color}88, ${selected.color})`,
                    transition: "width 0.5s",
                  }} />
                </div>
                <div style={{ fontSize: 9, color: "#445", marginTop: 4 }}>
                  {["initial-access", "impact", "exfiltration"].includes(selected.id) ? "CRITICAL" :
                    ["credential-access", "lateral-movement", "defense-evasion"].includes(selected.id) ? "HIGH" : "MEDIUM"}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "#334", fontSize: 11, textAlign: "center", paddingTop: 60, lineHeight: 2 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⬡</div>
              <div style={{ letterSpacing: 2 }}>SELECT A NODE</div>
              <div style={{ fontSize: 10, marginTop: 8 }}>OR RUN EMULATION</div>
              <div style={{ marginTop: 40, textAlign: "left" }}>
                <div style={{ fontSize: 9, color: "#556", letterSpacing: 1, marginBottom: 10 }}>MIND MAP PHASES</div>
                {PHASE_DATA.map((pd) => (
                  <div
                    key={pd.id}
                    onClick={() => handlePhaseClick(pd)}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: "pointer" }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: pd.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#4a5a6a" }}>{pd.tactic}</span>
                    <span style={{ fontSize: 10, color: "#6a8a9a" }}>{pd.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 14, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: "#334", letterSpacing: 1 }}>LEGEND:</div>
        {[
          { color: "#00FFAA", label: "Active Branch" },
          { color: "#FF4444", label: "Critical Phase" },
          { color: "#1e2d42", label: "Inactive Spoke" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 2, background: l.color }} />
            <span style={{ fontSize: 9, color: "#445", letterSpacing: 0.5 }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#223", letterSpacing: 1 }}>
          CISA AA25-071A · MITRE ATT&CK v16 · {PHASES.reduce((a, p) => a + p.techniques.length, 0)} TECHNIQUES MAPPED
        </div>
      </div>
    </div>
  );
}
