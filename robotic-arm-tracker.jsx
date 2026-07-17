import React, { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Robotic Arm Build Tracker — blueprint-style project companion      */
/*  MakerWorld model 1134925 · Robotic Arm with Servo & Arduino        */
/* ------------------------------------------------------------------ */

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const T = {
  bg: "#0C1826",
  panel: "#122238",
  panelHi: "#18304C",
  line: "#23405F",
  ink: "#DCEBFA",
  dim: "#7FA0C0",
  cyan: "#5CC8FF",
  green: "#63E6A8",
  amber: "#FFB454",
  red: "#FF7B7B",
};

const uid = () => Math.random().toString(36).slice(2, 10);

const STL_NAMES = [
  "Alt_Govde.stl",
  "Alt_Kapak.stl",
  "Alt_Kasa.stl",
  "Alt_Kol.stl",
  "Bilek.stl",
  "Disli.stl",
  "El.stl",
  "El_Ust.stl",
  "Jack_Cover.stl",
  "Mil_1.stl",
  "Mil_2.stl",
  "Mil_3.stl",
  "Mil_Disli.stl",
  "On_Kol.stl",
  "Parmak X 2.stl",
  "Parmak_2 X 2.stl",
  "Parmak_Disli X 2.stl",
  "Servo_Cable_Holder.stl",
  "Servo_Disli.stl",
  "Tabla_Alt.stl",
];

const DEFAULT_STL = STL_NAMES.map((name, i) => ({
  id: `stl${i + 1}`,
  name,
  done: false,
}));

const DEFAULT_ELEC = [
  { id: "e1", name: "1 × Arduino Uno or Arduino Mega", done: false },
  { id: "e2", name: "1 × Mini Breadboard", done: false },
  { id: "e3", name: "4 × MG995 or MG996R Servo (180°)", done: false },
  { id: "e4", name: "3 × MG90S Servo (180°)", done: false },
  { id: "e5", name: "1 × KCD1 Rocker Switch", done: false },
  { id: "e6", name: "1 × 608 Bearing", done: false },
  { id: "e7", name: "2 × 6203 Bearing", done: false },
  { id: "e8", name: "1 × 5V 10A Power Supply", done: false },
  { id: "e9", name: "Various M3 Bolts (M3×6 / M3×10 / M3×14)", done: false },
  { id: "e10", name: "Jumper Cables", done: false },
];

const PARTS_KEY = "robotarm:parts";
const CODE_KEY = "robotarm:code";
const NOTES_KEY = "robotarm:notes";
const IMG_PREFIX = "robotarm:img:";

/* ---------------------------- storage ----------------------------- */

async function sGet(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function sSet(key, val) {
  try {
    await window.storage.set(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}
async function sDel(key) {
  try {
    await window.storage.delete(key);
  } catch {}
}

/* --------------------------- UI atoms ----------------------------- */

const styles = {
  app: {
    minHeight: "100vh",
    background: `${T.bg}
      `,
    backgroundImage: `linear-gradient(${T.line}22 1px, transparent 1px),
      linear-gradient(90deg, ${T.line}22 1px, transparent 1px)`,
    backgroundSize: "28px 28px",
    color: T.ink,
    fontFamily: "'Chakra Petch', sans-serif",
    paddingBottom: 60,
  },
  mono: { fontFamily: "'IBM Plex Mono', monospace" },
  panel: {
    background: T.panel,
    border: `1px solid ${T.line}`,
    borderRadius: 10,
    padding: 18,
  },
  input: {
    background: T.bg,
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    color: T.ink,
    padding: "9px 11px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: {
    background: T.cyan,
    color: "#06263C",
    border: "none",
    borderRadius: 6,
    padding: "9px 16px",
    fontFamily: "'Chakra Petch', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  ghostBtn: {
    background: "transparent",
    color: T.dim,
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    padding: "8px 14px",
    fontFamily: "'Chakra Petch', sans-serif",
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
};

function Eyebrow({ children, color = T.cyan }) {
  return (
    <div
      style={{
        ...styles.mono,
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: T.bg,
          border: `1px solid ${T.line}`,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width .35s ease",
          }}
        />
      </div>
      <span style={{ ...styles.mono, fontSize: 12, color: T.dim, minWidth: 74, textAlign: "right" }}>
        {value}/{total} · {pct}%
      </span>
    </div>
  );
}

/* ------------------------- checklist row -------------------------- */

function ChecklistRow({ item, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  const commit = () => {
    const v = draft.trim();
    if (v) onRename(v);
    else setDraft(item.name);
    setEditing(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderBottom: `1px solid ${T.line}55`,
        background: item.done ? `${T.green}0D` : "transparent",
        borderRadius: 6,
      }}
    >
      <button
        onClick={onToggle}
        aria-label={item.done ? "Mark not done" : "Mark done"}
        style={{
          width: 22,
          height: 22,
          minWidth: 22,
          borderRadius: 5,
          border: `2px solid ${item.done ? T.green : T.line}`,
          background: item.done ? T.green : "transparent",
          color: "#06263C",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          padding: 0,
        }}
      >
        {item.done ? "✓" : ""}
      </button>

      {editing ? (
        <input
          autoFocus
          style={{ ...styles.input, padding: "6px 8px" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      ) : (
        <span
          onClick={() => {
            setDraft(item.name);
            setEditing(true);
          }}
          title="Click to rename"
          style={{
            flex: 1,
            fontSize: 14,
            cursor: "text",
            color: item.done ? T.dim : T.ink,
            textDecoration: item.done ? "line-through" : "none",
            textDecorationColor: `${T.dim}88`,
          }}
        >
          {item.name}
        </span>
      )}

      <button
        onClick={onDelete}
        title="Remove"
        style={{
          background: "transparent",
          border: "none",
          color: T.dim,
          cursor: "pointer",
          fontSize: 15,
          padding: "2px 6px",
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* -------------------------- page: parts --------------------------- */

function PartsPage({ parts, setParts, save }) {
  const [newName, setNewName] = useState("");
  const [newSection, setNewSection] = useState("elec");

  const mutate = (fn) => {
    setParts((p) => {
      const next = fn(structuredClone(p));
      save(next);
      return next;
    });
  };

  const addPart = () => {
    const v = newName.trim();
    if (!v) return;
    mutate((p) => {
      p[newSection].push({ id: uid(), name: v, done: false });
      return p;
    });
    setNewName("");
  };

  const section = (key, title, hint, color) => {
    const list = parts[key];
    const done = list.filter((i) => i.done).length;
    return (
      <div style={{ ...styles.panel, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <Eyebrow color={color}>{title}</Eyebrow>
            <div style={{ ...styles.mono, fontSize: 12, color: T.dim, marginBottom: 10 }}>{hint}</div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <ProgressBar value={done} total={list.length} color={color} />
        </div>
        {list.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={() =>
              mutate((p) => {
                const it = p[key].find((x) => x.id === item.id);
                it.done = !it.done;
                return p;
              })
            }
            onRename={(name) =>
              mutate((p) => {
                p[key].find((x) => x.id === item.id).name = name;
                return p;
              })
            }
            onDelete={() =>
              mutate((p) => {
                p[key] = p[key].filter((x) => x.id !== item.id);
                return p;
              })
            }
          />
        ))}
        {list.length === 0 && (
          <div style={{ ...styles.mono, fontSize: 12, color: T.dim, padding: 8 }}>
            Nothing here yet — add a part below.
          </div>
        )}
      </div>
    );
  };

  const total = parts.stl.length + parts.elec.length;
  const totalDone = parts.stl.filter((i) => i.done).length + parts.elec.filter((i) => i.done).length;

  return (
    <div>
      <div style={{ ...styles.panel, marginBottom: 18, background: T.panelHi }}>
        <Eyebrow>Overall build readiness</Eyebrow>
        <ProgressBar value={totalDone} total={total} color={T.cyan} />
      </div>

      {section("stl", "Printed parts — 20 STL files", "Click a name to rename it to match the real STL filename. Check off each part when it comes off the printer.", T.amber)}
      {section("elec", "Electronics & hardware", "Everything from the MakerWorld bill of materials. Check off as parts arrive.", T.green)}

      <div style={styles.panel}>
        <Eyebrow>Add a missing part</Eyebrow>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <input
            style={{ ...styles.input, flex: "1 1 220px" }}
            placeholder="e.g. 2 × M3 nyloc nuts"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPart()}
          />
          <select
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            style={{ ...styles.input, width: "auto", flex: "0 0 auto" }}
          >
            <option value="elec">Electronics & hardware</option>
            <option value="stl">Printed parts</option>
          </select>
          <button style={styles.btn} onClick={addPart}>
            Add part
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- page: video --------------------------- */

function VideoPage() {
  return (
    <div>
      <div style={{ ...styles.panel, marginBottom: 18 }}>
        <Eyebrow>Assembly video</Eyebrow>
        <p style={{ fontSize: 14, color: T.dim, marginTop: 4, lineHeight: 1.55 }}>
          Full build walkthrough by the designer, Emre Kalem. The source code and circuit
          schematics are linked in the video description on YouTube.
        </p>
        <div
          style={{
            position: "relative",
            paddingTop: "56.25%",
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${T.line}`,
            marginTop: 10,
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/CHV36hu9z3E"
            title="Robotic Arm Assembly Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <a
            href="https://www.youtube.com/watch?v=CHV36hu9z3E"
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}
          >
            Open on YouTube ↗
          </a>
          <a
            href="https://makerworld.com/en/models/1134925-robotic-arm-with-servo-arduino"
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.ghostBtn, textDecoration: "none", display: "inline-block", color: T.cyan, borderColor: T.cyan }}
          >
            MakerWorld model page ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- page: code --------------------------- */

function CodePage({ snippets, setSnippets, save }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const mutate = (fn) => {
    setSnippets((s) => {
      const next = fn([...s]);
      save(next);
      return next;
    });
  };

  const submit = () => {
    const t = title.trim() || "Untitled sketch";
    const b = body;
    if (!b.trim()) return;
    if (editingId) {
      mutate((s) => s.map((x) => (x.id === editingId ? { ...x, title: t, body: b } : x)));
      setEditingId(null);
    } else {
      mutate((s) => [{ id: uid(), title: t, body: b, ts: Date.now() }, ...s]);
    }
    setTitle("");
    setBody("");
  };

  const copy = async (sn) => {
    try {
      await navigator.clipboard.writeText(sn.body);
      setCopiedId(sn.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div>
      <div style={{ ...styles.panel, marginBottom: 18 }}>
        <Eyebrow>{editingId ? "Edit sketch" : "Save a sketch"}</Eyebrow>
        <p style={{ fontSize: 13, color: T.dim, margin: "4px 0 10px", lineHeight: 1.5 }}>
          Paste the Arduino code from the video description here (or your own versions) so it's
          always one tap away.
        </p>
        <input
          style={{ ...styles.input, marginBottom: 10 }}
          placeholder="Title — e.g. robot_arm_main.ino"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          style={{ ...styles.input, minHeight: 180, resize: "vertical", lineHeight: 1.5 }}
          placeholder={`// Paste Arduino code here\n#include <Servo.h>\n...`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button style={styles.btn} onClick={submit}>
            {editingId ? "Save changes" : "Save sketch"}
          </button>
          {editingId && (
            <button
              style={styles.ghostBtn}
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setBody("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {snippets.length === 0 && (
        <div style={{ ...styles.panel, ...styles.mono, fontSize: 13, color: T.dim }}>
          No code saved yet. Grab the sketch from the video description and store it here.
        </div>
      )}

      {snippets.map((sn) => (
        <div key={sn.id} style={{ ...styles.panel, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ ...styles.mono, fontSize: 14, fontWeight: 600, color: T.cyan }}>
              {sn.title}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.ghostBtn} onClick={() => copy(sn)}>
                {copiedId === sn.id ? "Copied ✓" : "Copy"}
              </button>
              <button
                style={styles.ghostBtn}
                onClick={() => {
                  setEditingId(sn.id);
                  setTitle(sn.title);
                  setBody(sn.body);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Edit
              </button>
              <button
                style={{ ...styles.ghostBtn, color: T.red, borderColor: `${T.red}66` }}
                onClick={() => mutate((s) => s.filter((x) => x.id !== sn.id))}
              >
                Delete
              </button>
            </div>
          </div>
          <pre
            style={{
              ...styles.mono,
              fontSize: 12.5,
              lineHeight: 1.55,
              background: T.bg,
              border: `1px solid ${T.line}`,
              borderRadius: 6,
              padding: 12,
              marginTop: 10,
              overflowX: "auto",
              whiteSpace: "pre",
              color: T.ink,
            }}
          >
            {sn.body}
          </pre>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- page: notes -------------------------- */

function resizeImage(file, maxDim = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function NotesPage({ notes, setNotes, save, imgCache, setImgCache }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState([]); // [{id, dataUrl}]
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const mutate = (fn) => {
    setNotes((n) => {
      const next = fn([...n]);
      save(next);
      return next;
    });
  };

  const handleFiles = async (files) => {
    setBusy(true);
    const added = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const dataUrl = await resizeImage(f);
        added.push({ id: uid(), dataUrl });
      } catch {}
    }
    setPending((p) => [...p, ...added]);
    setBusy(false);
  };

  const addNote = async () => {
    if (!text.trim() && pending.length === 0) return;
    const imgIds = [];
    for (const img of pending) {
      const ok = await sSet(IMG_PREFIX + img.id, img.dataUrl);
      if (ok) {
        imgIds.push(img.id);
        setImgCache((c) => ({ ...c, [img.id]: img.dataUrl }));
      }
    }
    mutate((n) => [
      { id: uid(), text: text.trim(), images: imgIds, ts: Date.now() },
      ...n,
    ]);
    setText("");
    setPending([]);
  };

  const deleteNote = (note) => {
    note.images.forEach((imgId) => sDel(IMG_PREFIX + imgId));
    mutate((n) => n.filter((x) => x.id !== note.id));
  };

  const fmt = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div style={{ ...styles.panel, marginBottom: 18 }}>
        <Eyebrow>New build log entry</Eyebrow>
        <textarea
          style={{ ...styles.input, minHeight: 110, resize: "vertical", fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, lineHeight: 1.55, marginTop: 6 }}
          placeholder="What did you get done today? Base assembled, servo horns fitted, wiring started…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {pending.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {pending.map((img) => (
              <div key={img.id} style={{ position: "relative" }}>
                <img
                  src={img.dataUrl}
                  alt="attachment preview"
                  style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.line}` }}
                />
                <button
                  onClick={() => setPending((p) => p.filter((x) => x.id !== img.id))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: T.red,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                    lineHeight: "20px",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button style={styles.ghostBtn} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Processing…" : "＋ Add photos"}
          </button>
          <button style={styles.btn} onClick={addNote}>
            Save entry
          </button>
        </div>
      </div>

      {notes.length === 0 && (
        <div style={{ ...styles.panel, ...styles.mono, fontSize: 13, color: T.dim }}>
          Your build log is empty. Add your first entry above — photos of your printed parts are a
          great start.
        </div>
      )}

      {notes.map((note) => (
        <div key={note.id} style={{ ...styles.panel, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ ...styles.mono, fontSize: 11.5, color: T.amber, letterSpacing: "0.08em" }}>
              {fmt(note.ts)}
            </span>
            <button
              style={{ ...styles.ghostBtn, color: T.red, borderColor: `${T.red}66`, padding: "5px 10px" }}
              onClick={() => deleteNote(note)}
            >
              Delete
            </button>
          </div>
          {note.text && (
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "10px 0 0", whiteSpace: "pre-wrap" }}>
              {note.text}
            </p>
          )}
          {note.images.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {note.images.map((imgId) =>
                imgCache[imgId] ? (
                  <a key={imgId} href={imgCache[imgId]} target="_blank" rel="noreferrer">
                    <img
                      src={imgCache[imgId]}
                      alt="build progress"
                      style={{
                        maxWidth: 220,
                        maxHeight: 220,
                        borderRadius: 8,
                        border: `1px solid ${T.line}`,
                        display: "block",
                      }}
                    />
                  </a>
                ) : (
                  <div
                    key={imgId}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 8,
                      border: `1px dashed ${T.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...styles.mono,
                      fontSize: 11,
                      color: T.dim,
                    }}
                  >
                    loading…
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ app ------------------------------- */

const PAGES = [
  { id: "parts", label: "Parts checklist", num: "01" },
  { id: "video", label: "Instructions", num: "02" },
  { id: "code", label: "Code", num: "03" },
  { id: "notes", label: "Build log", num: "04" },
];

export default function RoboticArmTracker() {
  const [page, setPage] = useState("parts");
  const [loaded, setLoaded] = useState(false);
  const [parts, setParts] = useState({ stl: DEFAULT_STL, elec: DEFAULT_ELEC });
  const [snippets, setSnippets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [imgCache, setImgCache] = useState({});

  useEffect(() => {
    (async () => {
      const [p, c, n] = await Promise.all([sGet(PARTS_KEY), sGet(CODE_KEY), sGet(NOTES_KEY)]);
      if (p && p.stl && p.elec) {
        // Upgrade old placeholder names ("STL Part 01") to real filenames, keeping check states
        let changed = false;
        p.stl = p.stl.map((item, i) => {
          if (/^STL Part \d+$/.test(item.name) && STL_NAMES[i]) {
            changed = true;
            return { ...item, name: STL_NAMES[i] };
          }
          return item;
        });
        if (changed) sSet(PARTS_KEY, p);
        setParts(p);
      }
      if (Array.isArray(c)) setSnippets(c);
      if (Array.isArray(n)) {
        setNotes(n);
        // hydrate images lazily
        const ids = n.flatMap((x) => x.images || []);
        for (const id of ids) {
          sGet(IMG_PREFIX + id).then((v) => {
            if (v) setImgCache((cache) => ({ ...cache, [id]: v }));
          });
        }
      }
      setLoaded(true);
    })();
  }, []);

  const saveParts = useCallback((v) => sSet(PARTS_KEY, v), []);
  const saveCode = useCallback((v) => sSet(CODE_KEY, v), []);
  const saveNotes = useCallback((v) => sSet(NOTES_KEY, v), []);

  const totalItems = parts.stl.length + parts.elec.length;
  const totalDone = parts.stl.filter((i) => i.done).length + parts.elec.filter((i) => i.done).length;
  const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div style={styles.app}>
      <style>{FONT_CSS}</style>

      {/* header */}
      <header
        style={{
          borderBottom: `1px solid ${T.line}`,
          background: `${T.panel}EE`,
          padding: "22px 20px 0",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <Eyebrow>Project file · MW-1134925 · 6-axis</Eyebrow>
              <h1
                style={{
                  margin: "0 0 4px",
                  fontSize: "clamp(22px, 4.5vw, 32px)",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                Robotic Arm <span style={{ color: T.cyan }}>Build Tracker</span>
              </h1>
              <div style={{ ...styles.mono, fontSize: 12, color: T.dim }}>
                Servo &amp; Arduino · design by Emre Kalem
              </div>
            </div>
            <div style={{ textAlign: "right", paddingBottom: 4 }}>
              <div style={{ ...styles.mono, fontSize: 11, color: T.dim, letterSpacing: "0.18em" }}>
                READINESS
              </div>
              <div style={{ ...styles.mono, fontSize: 30, fontWeight: 600, color: pct === 100 ? T.green : T.amber, lineHeight: 1.1 }}>
                {pct}%
              </div>
            </div>
          </div>

          {/* nav */}
          <nav style={{ display: "flex", gap: 4, marginTop: 16, overflowX: "auto" }}>
            {PAGES.map((p) => {
              const active = page === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPage(p.id)}
                  style={{
                    background: active ? T.bg : "transparent",
                    border: `1px solid ${active ? T.line : "transparent"}`,
                    borderBottom: active ? `1px solid ${T.bg}` : "1px solid transparent",
                    borderRadius: "8px 8px 0 0",
                    color: active ? T.cyan : T.dim,
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontFamily: "'Chakra Petch', sans-serif",
                    fontWeight: 600,
                    fontSize: 13.5,
                    whiteSpace: "nowrap",
                    display: "flex",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ ...styles.mono, fontSize: 10, color: active ? T.amber : `${T.dim}99` }}>
                    {p.num}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* body */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "22px 20px 0" }}>
        {!loaded ? (
          <div style={{ ...styles.panel, ...styles.mono, fontSize: 13, color: T.dim }}>
            Loading your saved progress…
          </div>
        ) : (
          <>
            {page === "parts" && <PartsPage parts={parts} setParts={setParts} save={saveParts} />}
            {page === "video" && <VideoPage />}
            {page === "code" && <CodePage snippets={snippets} setSnippets={setSnippets} save={saveCode} />}
            {page === "notes" && (
              <NotesPage
                notes={notes}
                setNotes={setNotes}
                save={saveNotes}
                imgCache={imgCache}
                setImgCache={setImgCache}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
