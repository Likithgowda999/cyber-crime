import { useState, useEffect, useMemo, useRef } from "react";
import { HashRouter, Routes, Route, NavLink, Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

/* ------------------------------------------------------------------ */
/*  Constants & simulated data                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "cairp_incidents_v1";
const MAP_CENTER = [14.4644, 75.9218]; // Davangere

const CATEGORIES = [
  "Theft",
  "Harassment",
  "Accident",
  "Cyber Fraud",
  "Suspicious Activity",
  "Vandalism",
  "Other",
];

const STATUSES = ["Reported", "Under Review", "Resolved"];

const SEED_INCIDENTS = [
  {
    id: "seed-1",
    type: "Theft",
    title: "Mobile phone snatched near bus stand",
    description:
      "A two-wheeler rider snatched a mobile phone from a pedestrian near the KSRTC bus stand around evening hours.",
    date: "2026-09-12",
    time: "18:45",
    location: "KSRTC Bus Stand, Davangere",
    lat: 14.4667,
    lng: 75.9231,
    contact: "",
    status: "Under Review",
    seeded: true,
  },
  {
    id: "seed-2",
    type: "Accident",
    title: "Two-wheeler collision at junction",
    description:
      "Minor collision between two bikes at a busy junction. No serious injuries reported, traffic was blocked for a short time.",
    date: "2026-09-18",
    time: "09:20",
    location: "PB Road Junction",
    lat: 14.4589,
    lng: 75.9169,
    contact: "",
    status: "Resolved",
    seeded: true,
  },
  {
    id: "seed-3",
    type: "Harassment",
    title: "Eve-teasing near college road",
    description:
      "A group of unknown persons was passing comments at students walking towards the college gate.",
    date: "2026-09-25",
    time: "16:10",
    location: "Near Hi-Tech College Road",
    lat: 14.4712,
    lng: 75.9054,
    contact: "",
    status: "Reported",
    seeded: true,
  },
  {
    id: "seed-4",
    type: "Cyber Fraud",
    title: "Fake bank KYC call",
    description:
      "Resident received a call asking for OTP and card details in the name of a bank KYC update. No money lost.",
    date: "2026-10-02",
    time: "11:30",
    location: "Vidyanagar, Davangere",
    lat: 14.4531,
    lng: 75.9298,
    contact: "",
    status: "Reported",
    seeded: true,
  },
  {
    id: "seed-5",
    type: "Suspicious Activity",
    title: "Unknown person loitering near ATM",
    description:
      "An unknown person was seen watching customers at an ATM kiosk late at night for a long time.",
    date: "2026-10-08",
    time: "22:15",
    location: "MCC B Block ATM",
    lat: 14.4703,
    lng: 75.9189,
    contact: "",
    status: "Under Review",
    seeded: true,
  },
  {
    id: "seed-6",
    type: "Vandalism",
    title: "Public bench damaged in park",
    description:
      "Benches and a dustbin were found broken in the public park early in the morning.",
    date: "2026-10-14",
    time: "06:40",
    location: "Kunduwada Kere Park",
    lat: 14.4776,
    lng: 75.9342,
    contact: "",
    status: "Resolved",
    seeded: true,
  },
];

const SAFETY_TIPS = {
  Theft: [
    "Keep phones and wallets in inner pockets and avoid displaying them in crowded places.",
    "Do not leave bags or helmets unattended on vehicles.",
    "Park vehicles in well-lit, supervised areas and use a steering or wheel lock.",
    "Note down the IMEI of your phone so it can be blocked if stolen.",
  ],
  Harassment: [
    "Move to a crowded or well-lit place and stay calm.",
    "Note the time, place and description of the person to share with authorities.",
    "Inform a trusted person or college authority immediately.",
    "Women can call the Women Helpline 181 at any time.",
  ],
  "Cyber Fraud": [
    "Never share OTP, PIN, CVV or passwords with anyone, including people claiming to be from a bank.",
    "Avoid clicking links in unknown SMS, WhatsApp or e-mail messages.",
    "If money is lost, call the national cyber crime helpline 1930 immediately.",
    "Report the incident on the national cyber crime portal (cybercrime.gov.in).",
  ],
  "Road Accident": [
    "Switch on hazard lights and move to a safe place if possible.",
    "Call 108 for ambulance and 112 for police assistance.",
    "Do not move a seriously injured person unless there is danger from fire or traffic.",
    "Take photos of the scene and vehicle numbers if it is safe to do so.",
  ],
  "Suspicious Activity": [
    "Do not confront the person; keep a safe distance.",
    "Note appearance, vehicle number and direction of movement.",
    "Inform the police through 112 if you feel there is a threat.",
  ],
  "General Safety": [
    "Share your live location with family when travelling late.",
    "Save emergency numbers on speed dial.",
    "Trust your instincts; leave any situation that feels unsafe.",
    "Keep your phone charged before going out.",
  ],
};

const EMERGENCY_NUMBERS = [
  { name: "National Emergency", number: "112" },
  { name: "Police", number: "100" },
  { name: "Fire", number: "101" },
  { name: "Ambulance", number: "108" },
  { name: "Women Helpline", number: "181" },
  { name: "Cyber Crime Helpline", number: "1930" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable; ignore */
    }
  }, [key, value]);

  return [value, setValue];
}

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const todayISO = () => new Date().toISOString().slice(0, 10);

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ------------------------------------------------------------------ */
/*  Map component (Leaflet + OpenStreetMap)                            */
/* ------------------------------------------------------------------ */

function MapView({ incidents = [], pickable = false, picked = null, onPick, height = 420 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pickMarkerRef = useRef(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // create map once
  useEffect(() => {
    const map = L.map(containerRef.current).setView(MAP_CENTER, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (pickable) {
      map.on("click", (e) => {
        if (onPickRef.current) onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      pickMarkerRef.current = null;
    };
  }, [pickable]);

  // incident markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    incidents.forEach((inc) => {
      if (typeof inc.lat !== "number" || typeof inc.lng !== "number") return;
      const html =
        `<strong>${escapeHtml(inc.title)}</strong><br/>` +
        `<span>${escapeHtml(inc.type)} &middot; ${escapeHtml(inc.status)}</span><br/>` +
        `<small>${escapeHtml(formatDate(inc.date))} ${escapeHtml(inc.time)}</small><br/>` +
        `<small>${escapeHtml(inc.location)}</small>`;
      L.marker([inc.lat, inc.lng], { icon: markerIcon }).bindPopup(html).addTo(layer);
    });
  }, [incidents]);

  // picked location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }
    if (picked) {
      pickMarkerRef.current = L.marker([picked.lat, picked.lng], { icon: markerIcon }).addTo(map);
    }
  }, [picked, pickable]);

  return <div ref={containerRef} className="map-box" style={{ height }} />;
}

/* ------------------------------------------------------------------ */
/*  Small shared components                                            */
/* ------------------------------------------------------------------ */

function Navbar() {
  return (
    <header className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>Citizen Safety &amp; Awareness Portal &middot; Academic Demonstration</span>
          <span className="topbar-help">
            Emergency: <strong>112</strong> &nbsp;|&nbsp; Police: <strong>100</strong> &nbsp;|&nbsp; Cyber Crime: <strong>1930</strong>
          </span>
        </div>
      </div>
      <div className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand">
            <span className="brand-icon" aria-hidden="true"></span>
            <span className="brand-text">
              <span className="brand-name">Crime Assistance Platform</span>
              <span className="brand-sub">Incident Reporting &amp; Safety Information</span>
            </span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/report">Report</NavLink>
            <NavLink to="/incidents">Incidents</NavLink>
            <NavLink to="/map">Map</NavLink>
            <NavLink to="/safety">Safety</NavLink>
          </nav>
          <Link to="/report" className="btn btn-primary btn-sm nav-cta">Report Incident</Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col footer-about">
          <h4>Crime Assistance Platform</h4>
          <p>
            A web-based platform to report incidents, view reports on a map and read safety guidance. Built with
            React.js, React Router, Leaflet and OpenStreetMap.
          </p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/report">Report an Incident</Link>
          <Link to="/incidents">View Incidents</Link>
          <Link to="/map">Incident Map</Link>
          <Link to="/safety">Safety Information</Link>
        </div>
        <div className="footer-col">
          <h4>Emergency Numbers</h4>
          <span>Emergency &mdash; <strong>112</strong></span>
          <span>Police &mdash; <strong>100</strong></span>
          <span>Ambulance &mdash; <strong>108</strong></span>
          <span>Cyber Crime &mdash; <strong>1930</strong></span>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          Academic project &mdash; Bapuji Institute of Hi-Tech Education, Davangere. Uses simulated data and is not
          connected to police or any emergency service.
        </p>
      </div>
    </footer>
  );
}

function IncidentCard({ incident, onDelete }) {
  return (
    <article className="card incident-card">
      <div className="incident-top">
        <span className={`tag tag-${slug(incident.type)}`}>{incident.type}</span>
        <span className={`status status-${slug(incident.status)}`}>{incident.status}</span>
      </div>
      <h3>{incident.title}</h3>
      <p className="incident-desc">{incident.description}</p>
      <ul className="incident-meta">
        <li><span className="meta-label">Date</span>{formatDate(incident.date)} at {incident.time}</li>
        <li><span className="meta-label">Location</span>{incident.location}</li>
        {incident.contact && <li><span className="meta-label">Reporter</span>{incident.contact}</li>}
      </ul>
      {onDelete && !incident.seeded && (
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(incident.id)}>
          Delete
        </button>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Pages                                                              */
/* ------------------------------------------------------------------ */

function Home({ incidents }) {
  const counts = useMemo(() => {
    const c = {};
    CATEGORIES.forEach((cat) => (c[cat] = 0));
    incidents.forEach((i) => {
      c[i.type] = (c[i.type] || 0) + 1;
    });
    return c;
  }, [incidents]);

  const recent = useMemo(
    () => [...incidents].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 3),
    [incidents]
  );

  return (
    <>
      <section className="hero">
        <span className="hero-badge">Citizen Safety Portal</span>
        <h1>Crime Assistance &amp; Incident Reporting Platform</h1>
        <p>
          Report incidents, see what is happening around you and learn how to stay safe &mdash; all in one simple place.
        </p>
        <div className="hero-actions">
          <Link to="/report" className="btn btn-primary">Report an Incident</Link>
          <Link to="/incidents" className="btn btn-light">View Incidents</Link>
        </div>
      </section>

      <section className="section">
        <h2>Summary</h2>
        <div className="stats">
          <div className="card stat stat-total">
            <span className="stat-number">{incidents.length}</span>
            <span className="stat-label">Total Reports</span>
          </div>
          {CATEGORIES.map((cat) => (
            <div className="card stat" key={cat}>
              <span className="stat-number">{counts[cat] || 0}</span>
              <span className="stat-label">{cat}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent Incidents</h2>
          <Link to="/incidents">See all →</Link>
        </div>
        <div className="grid">
          {recent.map((i) => (
            <IncidentCard key={i.id} incident={i} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Emergency Numbers</h2>
        <div className="emergency-grid">
          {EMERGENCY_NUMBERS.map((e) => (
            <div className="card emergency" key={e.name}>
              <span className="emergency-number">{e.number}</span>
              <span>{e.name}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ReportIncident({ addIncident }) {
  const navigate = useNavigate();
  const empty = {
    type: "",
    title: "",
    description: "",
    date: todayISO(),
    time: "",
    location: "",
    contact: "",
  };
  const [form, setForm] = useState(empty);
  const [coords, setCoords] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.type) er.type = "Please select an incident type.";
    if (form.title.trim().length < 5) er.title = "Title must be at least 5 characters.";
    if (form.description.trim().length < 15) er.description = "Please describe the incident (at least 15 characters).";
    if (!form.date) er.date = "Date is required.";
    else if (form.date > todayISO()) er.date = "Date cannot be in the future.";
    if (!form.time) er.time = "Time is required.";
    if (!form.location.trim()) er.location = "Location is required.";
    return er;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length > 0) return;

    addIncident({
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      contact: form.contact.trim(),
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      status: "Reported",
      seeded: false,
    });
    navigate("/incidents", { state: { justReported: true } });
  };

  return (
    <section className="section">
      <h2>Report an Incident</h2>
      <p className="muted">
        Fields marked * are required. This is a demonstration &mdash; your report is saved only in this browser.
      </p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <label>
            Incident Type *
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="">-- Select --</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.type && <span className="error">{errors.type}</span>}
          </label>

          <label>
            Title *
            <input name="title" value={form.title} onChange={handleChange} placeholder="Short summary" maxLength={100} />
            {errors.title && <span className="error">{errors.title}</span>}
          </label>
        </div>

        <label>
          Description *
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            placeholder="What happened? Give as many details as you can."
          />
          {errors.description && <span className="error">{errors.description}</span>}
        </label>

        <div className="form-row">
          <label>
            Date *
            <input type="date" name="date" max={todayISO()} value={form.date} onChange={handleChange} />
            {errors.date && <span className="error">{errors.date}</span>}
          </label>
          <label>
            Time *
            <input type="time" name="time" value={form.time} onChange={handleChange} />
            {errors.time && <span className="error">{errors.time}</span>}
          </label>
        </div>

        <div className="form-row">
          <label>
            Location *
            <input name="location" value={form.location} onChange={handleChange} placeholder="Area, landmark or address" />
            {errors.location && <span className="error">{errors.location}</span>}
          </label>
          <label>
            Contact Name (optional)
            <input name="contact" value={form.contact} onChange={handleChange} placeholder="Your name" />
          </label>
        </div>

        <div className="pick-box">
          <p className="pick-title">
            Pick the location on the map (optional)
            {coords && (
              <span className="coords"> &mdash; {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
            )}
          </p>
          <MapView pickable picked={coords} onPick={setCoords} height={300} />
          {coords && (
            <button type="button" className="btn btn-light btn-sm" onClick={() => setCoords(null)}>
              Clear pin
            </button>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Submit Report</button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => {
              setForm(empty);
              setCoords(null);
              setErrors({});
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

function Incidents({ incidents, deleteIncident }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents
      .filter((i) => (category === "All" ? true : i.type === category))
      .filter((i) => (date ? i.date === date : true))
      .filter((i) =>
        q ? [i.title, i.description, i.location, i.type].some((f) => f.toLowerCase().includes(q)) : true
      )
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [incidents, query, category, date]);

  return (
    <section className="section">
      <h2>Reported Incidents</h2>

      <div className="card filters">
        <input
          type="search"
          placeholder="Search by keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button
          className="btn btn-light"
          onClick={() => {
            setQuery("");
            setCategory("All");
            setDate("");
          }}
        >
          Clear
        </button>
      </div>

      <p className="muted">Showing {filtered.length} of {incidents.length} incidents</p>

      {filtered.length === 0 ? (
        <div className="card empty">No incidents match your search.</div>
      ) : (
        <div className="grid">
          {filtered.map((i) => (
            <IncidentCard key={i.id} incident={i} onDelete={deleteIncident} />
          ))}
        </div>
      )}
    </section>
  );
}

function MapPage({ incidents }) {
  const [category, setCategory] = useState("All");
  const shown = incidents.filter((i) => (category === "All" ? true : i.type === category));
  const withCoords = shown.filter((i) => typeof i.lat === "number");

  return (
    <section className="section">
      <h2>Incident Map</h2>
      <div className="card filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="muted">{withCoords.length} marker(s) shown. Click a marker for details.</span>
      </div>
      <MapView incidents={shown} height={520} />
    </section>
  );
}

function Safety() {
  const [open, setOpen] = useState("General Safety");

  return (
    <section className="section">
      <h2>Safety Information</h2>
      <p className="muted">General guidance for common situations. In an emergency, always contact official services.</p>

      <div className="accordion">
        {Object.entries(SAFETY_TIPS).map(([title, tips]) => (
          <div className={`card accordion-item ${open === title ? "open" : ""}`} key={title}>
            <button className="accordion-header" onClick={() => setOpen(open === title ? "" : title)}>
              <span>{title}</span>
              <span>{open === title ? "−" : "+"}</span>
            </button>
            {open === title && (
              <ul className="accordion-body">
                {tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h3 className="sub-heading">Emergency Numbers (India)</h3>
      <div className="emergency-grid">
        {EMERGENCY_NUMBERS.map((e) => (
          <div className="card emergency" key={e.name}>
            <span className="emergency-number">{e.number}</span>
            <span>{e.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotFound() {
  return (
    <section className="section">
      <div className="card empty">
        <h2>Page not found</h2>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [incidents, setIncidents] = useLocalStorage(STORAGE_KEY, SEED_INCIDENTS);

  const addIncident = (inc) => setIncidents((prev) => [inc, ...prev]);
  const deleteIncident = (id) => {
    if (window.confirm("Delete this report?")) {
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    }
  };

  return (
    <HashRouter>
      <div className="app">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home incidents={incidents} />} />
            <Route path="/report" element={<ReportIncident addIncident={addIncident} />} />
            <Route path="/incidents" element={<Incidents incidents={incidents} deleteIncident={deleteIncident} />} />
            <Route path="/map" element={<MapPage incidents={incidents} />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}