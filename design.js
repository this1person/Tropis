/* =====================================================================
   GLOBAL TROPOSPHERIC NO₂ DYNAMICS (2018–2024)
   STEM Sharkya Research — frontend application logic

   DATA POLICY
   ---------------------------------------------------------------------
   Every scientific number rendered by this file originates from the two
   supplied Sentinel-5P TROPOMI CSV datasets. There are NO simulated,
   random, interpolated or hardcoded observations anywhere below.
   The only Math.random() calls live in section 0 (decorative starfield)
   and never touch the research data.
   Missing observations stay missing: they render as "No data" / "—" and
   are plotted as a neutral grey marker, never as zero.
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    /* =================================================================
       0. DECORATIVE STARFIELD  (visual only — carries no research data)
       ================================================================= */
    const canvas = document.getElementById('stars-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let stars = [];

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initStars() {
        if (!canvas || !ctx) return;
        resizeCanvas();
        stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5,
                vy: (Math.random() * 0.3) + 0.05,
                opacity: (Math.random() * 0.5) + 0.3
            });
        }
    }

    function drawStars() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const theme = document.documentElement.getAttribute('data-theme');

        const earthEl = document.getElementById('earth-container');
        let earthX = -1000, earthY = -1000;
        if (earthEl) {
            const rect = earthEl.getBoundingClientRect();
            earthX = rect.left + rect.width / 2;
            earthY = rect.top + rect.height / 2;
        }

        stars.forEach(star => {
            const dx = star.x - earthX;
            const dy = star.y - earthY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 420 || earthY < -500) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = theme === 'light'
                    ? `rgba(217, 130, 80, ${star.opacity})`
                    : `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
            }

            star.y -= star.vy;
            if (star.y < 0) {
                star.y = canvas.height;
                star.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(drawStars);
    }

    if (canvas && ctx) {
        window.addEventListener('resize', initStars);
        initStars();
        drawStars();
    }

    /* =================================================================
       1. GLASS NAVBAR & SCROLL REVEAL
       ================================================================= */
    const nav = document.querySelector('.glass-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        });
    }

    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const revealOnScroll = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        reveals.forEach(reveal => revealOnScroll.observe(reveal));
    } else {
        reveals.forEach(reveal => reveal.classList.add('active'));
    }

    /* =================================================================
       2. REGION CONFIGURATION
       -----------------------------------------------------------------
       csvName  : the exact region string used in no2_monthly_data.csv
                  and no2_statistical_summary.csv
       lat/lon  : city-centre coordinates carried over unchanged from the
                  approved project mapping. NOTE: the supplied CSV files
                  contain no coordinate columns, so these are NOT derived
                  from the datasets — they must be cited/verified by the
                  research team before publication.
       color    : the approved automatic palette (distinguishable series
                  colours, independent of the NO₂ heat scale).
       ================================================================= */
    const REGION_META = {
        'Beijing':      { csvName: 'Beijing, China',             label: 'Beijing',      lat:  39.9042, lon:  116.4074, color: '#46B9E8' },
        'Cairo':        { csvName: 'Greater Cairo, Egypt',       label: 'Cairo',        lat:  30.0444, lon:   31.2357, color: '#D98250' },
        'Delhi':        { csvName: 'Delhi, India',               label: 'Delhi',        lat:  28.6139, lon:   77.2090, color: '#E8B946' },
        'Johannesburg': { csvName: 'Johannesburg, South Africa', label: 'Johannesburg', lat: -26.2041, lon:   28.0473, color: '#39A57F' },
        'London':       { csvName: 'Greater London, UK',         label: 'London',       lat:  51.5074, lon:   -0.1278, color: '#66899F' },
        'Madrid':       { csvName: 'Madrid, Spain',              label: 'Madrid',       lat:  40.4168, lon:   -3.7038, color: '#9F6689' },
        'Milan':        { csvName: 'Milan, Italy',               label: 'Milan',        lat:  45.4642, lon:    9.1900, color: '#E846A5' },
        'New York':     { csvName: 'New York City, USA',         label: 'New York',     lat:  40.7128, lon:  -74.0060, color: '#46E8B9' },
        'São Paulo':    { csvName: 'São Paulo, Brazil',          label: 'São Paulo',    lat: -23.5505, lon:  -46.6333, color: '#E84646' },
        'Seoul':        { csvName: 'Seoul, South Korea',         label: 'Seoul',        lat:  37.5665, lon:  126.9780, color: '#A5E846' },
        'Sydney':       { csvName: 'Sydney, Australia',          label: 'Sydney',       lat: -33.8688, lon:  151.2093, color: '#899F66' },
        'Tokyo':        { csvName: 'Tokyo, Japan',               label: 'Tokyo',        lat:  35.6762, lon:  139.6503, color: '#E88946' }
    };
    const REGION_KEYS = Object.keys(REGION_META);

    /* GLOBAL HEAT SCALE — exactly the five steps required by the brief. */
    const MAP_COLORSCALE = [
        [0.00, '#46E8B9'],
        [0.25, '#A5E846'],
        [0.50, '#FFEA00'],
        [0.75, '#FFA500'],
        [1.00, '#FF0000']
    ];
    const MISSING_COLOR = '#64748B';
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /* =================================================================
       3. CSV PARSING & PRIMITIVE HELPERS
       ================================================================= */
    const normKey = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[\s\-]+/g, '_');
    const stripAccents = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const MONTHLY_ALIASES = {
        region: ['region', 'region_name', 'city', 'location'],
        date:   ['date', 'month', 'observation_date', 'year_month'],
        value:  ['no2_monthly_mean', 'no2_mean', 'mean_no2', 'no2_monthly_mean_mol_m2', 'no2_column_number_density', 'value']
    };

    const SUMMARY_ALIASES = {
        region:  ['region', 'region_name', 'city', 'location'],
        before:  ['before', 'before_covid', 'pre_covid', 'pre_lockdown'],
        during:  ['during', 'during_covid', 'during_lockdown'],
        after:   ['after', 'after_covid', 'post_covid', 'post_lockdown'],
        pct:     ['pct_change_during_vs_before', 'pct_change_during_vs_before_pct', 'pct_change_lockdown', 'pct_change'],
        kruskal: ['kruskal_p_value', 'kruskal_pvalue', 'kruskal_p', 'p_kruskal']
    };

    /* PapaParse is preferred; the built-in parser is a safety net so the
       app still reads local CSV files when the CDN/local copy is missing. */
    function parseCsvText(text) {
        const clean = String(text == null ? '' : text).replace(/^\uFEFF/, '');
        if (typeof Papa !== 'undefined' && Papa && typeof Papa.parse === 'function') {
            const res = Papa.parse(clean, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: 'greedy',
                transformHeader: h => String(h).trim()
            });
            const rows = (res.data || []).filter(r => r && typeof r === 'object' && Object.keys(r).length > 0);
            return { rows, errors: res.errors || [], engine: 'PapaParse' };
        }
        return { rows: fallbackParseCsv(clean), errors: [], engine: 'built-in parser (PapaParse unavailable)' };
    }

    function fallbackParseCsv(text) {
        const rawRows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else field += ch;
            } else if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(field); field = '';
            } else if (ch === '\n') {
                row.push(field); rawRows.push(row); row = []; field = '';
            } else if (ch === '\r') {
                /* ignored */
            } else {
                field += ch;
            }
        }
        if (field !== '' || row.length) { row.push(field); rawRows.push(row); }

        const header = (rawRows.shift() || []).map(h => String(h).trim());
        return rawRows
            .filter(r => r.some(c => String(c).trim() !== ''))
            .map(r => {
                const obj = {};
                header.forEach((h, i) => { obj[h] = r[i] === undefined ? '' : r[i]; });
                return obj;
            });
    }

    function buildHeaderIndex(sample) {
        const idx = {};
        Object.keys(sample || {}).forEach(k => { idx[normKey(k)] = k; });
        return idx;
    }

    function cell(row, idx, aliases) {
        for (let i = 0; i < aliases.length; i++) {
            const real = idx[aliases[i]];
            if (real !== undefined && row[real] !== undefined) return row[real];
        }
        return undefined;
    }

    function normalizeDate(raw) {
        const s = String(raw == null ? '' : raw).trim().replace(/^["']|["']$/g, '');
        if (!s) return null;
        let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
        if (m) {
            const y = +m[1], mo = +m[2], d = +m[3];
            if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
            return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
        if (m) {
            const mo = +m[1], d = +m[2], y = +m[3];
            if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
            return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        const parsed = new Date(s);
        if (isNaN(parsed.getTime())) return null;
        return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
    }

    function toNumber(raw) {
        if (raw === null || raw === undefined) return null;
        const s = String(raw).trim().replace(/,/g, '');
        if (s === '' || /^(na|n\/a|nan|null|none|-|--)$/i.test(s)) return null;
        const v = Number(s);
        return Number.isFinite(v) ? v : null;
    }

    function medianOf(values) {
        const arr = values.filter(v => typeof v === 'number' && Number.isFinite(v)).slice().sort((a, b) => a - b);
        if (!arr.length) return null;
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    }

    /* Region-name resolver: exact match first, then accent-insensitive
       containment. Never guesses when a name is ambiguous. */
    const REGION_LOOKUP = (() => {
        const map = new Map();
        REGION_KEYS.forEach(k => {
            const meta = REGION_META[k];
            map.set(stripAccents(normKey(meta.csvName)), k);
            map.set(stripAccents(normKey(meta.label)), k);
        });
        return map;
    })();

    function regionKeyFromCsvName(name) {
        const n = stripAccents(normKey(name));
        if (!n) return null;
        if (REGION_LOOKUP.has(n)) return REGION_LOOKUP.get(n);
        const hits = REGION_KEYS.filter(k => {
            const label = stripAccents(normKey(REGION_META[k].label));
            return label.length > 2 && n.includes(label);
        });
        return hits.length === 1 ? hits[0] : null;
    }

    /* =================================================================
       4. VALIDATION
       ================================================================= */
    function validateMonthly(text) {
        const parsed = parseCsvText(text);
        const rowsIn = parsed.rows;
        const out = {
            ok: false,
            error: null,
            engine: parsed.engine,
            byRegion: new Map(),
            dates: [],
            globalMin: null,
            globalMax: null,
            stats: {
                total: rowsIn.length, accepted: 0, rejected: [], duplicates: 0,
                missingValues: 0, unknownRegions: new Map(), badDates: 0,
                badValues: 0, regions: 0, months: 0, perRegionMonths: new Map()
            }
        };

        if (!rowsIn.length) { out.error = 'The monthly dataset contains no data rows.'; return out; }

        const idx = buildHeaderIndex(rowsIn[0]);
        const missing = [];
        if (cell(rowsIn[0], idx, MONTHLY_ALIASES.region) === undefined) missing.push('region');
        if (cell(rowsIn[0], idx, MONTHLY_ALIASES.date) === undefined) missing.push('date');
        if (cell(rowsIn[0], idx, MONTHLY_ALIASES.value) === undefined) missing.push('no2_monthly_mean');
        if (missing.length) {
            out.error = `Missing required column(s): ${missing.join(', ')}. Headers found: ${Object.keys(rowsIn[0]).join(', ')}`;
            return out;
        }

        const placed = new Map(); // "key|date" -> true

        rowsIn.forEach((row, i) => {
            const lineNo = i + 2;
            const rawRegion = cell(row, idx, MONTHLY_ALIASES.region);
            const rawDate = cell(row, idx, MONTHLY_ALIASES.date);
            const rawValue = cell(row, idx, MONTHLY_ALIASES.value);

            if (!String(rawRegion == null ? '' : rawRegion).trim()) {
                out.stats.rejected.push({ line: lineNo, reason: 'empty region name' });
                return;
            }

            const date = normalizeDate(rawDate);
            if (!date) {
                out.stats.badDates++;
                out.stats.rejected.push({ line: lineNo, reason: `unparseable date "${String(rawDate == null ? '' : rawDate).slice(0, 24)}"` });
                return;
            }

            const regionKey = regionKeyFromCsvName(rawRegion);
            if (!regionKey) {
                const name = String(rawRegion).trim();
                out.stats.unknownRegions.set(name, (out.stats.unknownRegions.get(name) || 0) + 1);
                out.stats.rejected.push({ line: lineNo, reason: `region "${name}" is not one of the 12 target regions` });
                return;
            }

            const value = toNumber(rawValue);
            if (value !== null && value < 0) {
                out.stats.badValues++;
                out.stats.rejected.push({ line: lineNo, reason: `negative concentration (${value})` });
                return;
            }
            if (value === null) out.stats.missingValues++;

            if (!out.byRegion.has(regionKey)) out.byRegion.set(regionKey, new Map());
            const series = out.byRegion.get(regionKey);
            const dedupeKey = regionKey + '|' + date;

            if (placed.has(dedupeKey)) {
                out.stats.duplicates++;
                if (series.get(date) === null && value !== null) series.set(date, value); // keep the informative row
                return;
            }

            series.set(date, value); // value may be null -> preserved as missing
            placed.set(dedupeKey, true);
            out.stats.accepted++;
        });

        if (out.stats.accepted === 0) {
            out.error = 'No valid observation row could be read. Check the date and NO₂ column contents.';
            return out;
        }

        const dateSet = new Set();
        out.byRegion.forEach(series => series.forEach((_, d) => dateSet.add(d)));
        out.dates = Array.from(dateSet).sort();

        const allValues = [];
        out.byRegion.forEach(series => series.forEach(v => { if (v !== null) allValues.push(v); }));
        if (allValues.length) {
            out.globalMin = Math.min.apply(null, allValues);
            out.globalMax = Math.max.apply(null, allValues);
        }

        out.stats.regions = out.byRegion.size;
        out.stats.months = out.dates.length;
        out.byRegion.forEach((series, k) => {
            const filled = Array.from(series.values()).filter(v => v !== null).length;
            out.stats.perRegionMonths.set(k, filled);
        });

        out.ok = out.globalMin !== null && out.dates.length > 0;
        if (!out.ok) out.error = 'The monthly dataset contains no numeric NO₂ values.';
        return out;
    }

    function validateSummary(text) {
        const parsed = parseCsvText(text);
        const rowsIn = parsed.rows;
        const out = {
            ok: false, error: null, engine: parsed.engine, map: new Map(),
            stats: { total: rowsIn.length, accepted: 0, unknownRegions: [], rejected: [] }
        };

        if (!rowsIn.length) { out.error = 'The statistical summary contains no data rows.'; return out; }

        const idx = buildHeaderIndex(rowsIn[0]);
        const required = {
            region: SUMMARY_ALIASES.region,
            before: SUMMARY_ALIASES.before,
            during: SUMMARY_ALIASES.during,
            after: SUMMARY_ALIASES.after,
            pct: SUMMARY_ALIASES.pct,
            kruskal: SUMMARY_ALIASES.kruskal
        };
        const missing = Object.keys(required).filter(k => cell(rowsIn[0], idx, required[k]) === undefined);
        if (missing.length) {
            out.error = `Missing required column(s): ${missing.join(', ')}. Headers found: ${Object.keys(rowsIn[0]).join(', ')}`;
            return out;
        }

        rowsIn.forEach((row, i) => {
            const rawRegion = cell(row, idx, SUMMARY_ALIASES.region);
            const key = regionKeyFromCsvName(rawRegion);
            if (!key) {
                out.stats.unknownRegions.push(String(rawRegion == null ? '' : rawRegion).trim() || `row ${i + 2}`);
                return;
            }
            out.map.set(key, {
                before: toNumber(cell(row, idx, SUMMARY_ALIASES.before)),
                during: toNumber(cell(row, idx, SUMMARY_ALIASES.during)),
                after: toNumber(cell(row, idx, SUMMARY_ALIASES.after)),
                pct: toNumber(cell(row, idx, SUMMARY_ALIASES.pct)),
                kruskal: toNumber(cell(row, idx, SUMMARY_ALIASES.kruskal))
            });
            out.stats.accepted++;
        });

        out.ok = out.map.size > 0;
        if (!out.ok) out.error = 'No statistical row matched one of the 12 target regions.';
        return out;
    }

    /* =================================================================
       5. APPLICATION STATE
       ================================================================= */
    const state = {
        ready: false,
        dates: [],
        byRegion: new Map(),      // key -> Map(date -> number|null)
        summary: new Map(),       // key -> {before, during, after, pct, kruskal}
        globalMin: null,
        globalMax: null,
        monthlyUnitLabel: 'mol/m²',
        summaryFactor: 1,         // converts raw summary values to the display unit
        summaryUnitLabel: 'µmol/m²',
        monthlyRowCount: 0,
        source: '',
        manualColors: new Map(),
        summaryAvailable: false,
        monthlyOk: false,
        engine: ''
    };

    /* =================================================================
       6. DOM REFERENCES
       ================================================================= */
    const regionButtons = Array.from(document.querySelectorAll('.region-btn'));
    const emptyState = document.getElementById('empty-state');
    const dataContent = document.getElementById('data-content');
    const tableContent = document.getElementById('table-content');
    const timeSlider = document.getElementById('time-slider');
    const dateDisplay = document.getElementById('date-display');
    const dateStart = document.getElementById('date-start');
    const colorControlsContainer = document.getElementById('color-controls-container');
    const colorControlsList = document.getElementById('color-controls-list');
    const legendUnit = document.getElementById('legend-unit');
    const legendMin = document.getElementById('legend-min');
    const legendQ1 = document.getElementById('legend-q1');
    const legendMid = document.getElementById('legend-mid');
    const legendQ3 = document.getElementById('legend-q3');
    const legendMax = document.getElementById('legend-max');
    const fileInput = document.getElementById('csv-file-input');
    const browseBtn = document.getElementById('csv-browse-btn');
    const emptyStateEl = document.getElementById('empty-state');
    const dataWarning = document.getElementById('data-warning');

    /* =================================================================
       7. FORMATTING
       ================================================================= */
    /* mol/m² values are ~3e-5 … 4e-4, so fixed 6-decimals would throw away
       precision (0.000194 vs 0.000194359). Use 4 significant digits instead. */
    function fmtObs(v) {
        if (v === null || v === undefined || !Number.isFinite(v)) return 'No data';
        if (state.monthlyUnitLabel === 'mol/m²') {
            const s = v.toPrecision(4);
            return s.indexOf('e') === -1 ? s : v.toExponential(3);
        }
        return v.toFixed(2);
    }

    function fmtLegend(v) {
        if (v === null || !Number.isFinite(v)) return '—';
        if (state.monthlyUnitLabel === 'mol/m²') return v.toExponential(1);
        return v.toFixed(1);
    }

    function fmtSummary(v) {
        if (v === null || v === undefined || !Number.isFinite(v)) return null;
        return v.toFixed(1);
    }

    function fmtPValue(v) {
        if (v === null || v === undefined || !Number.isFinite(v)) return null;
        return v < 0.001 ? v.toExponential(2) : v.toFixed(4);
    }

    function regionColor(key) {
        return state.manualColors.get(key) || REGION_META[key].color;
    }

    /* =================================================================
       8. DATA ACCESSORS
       ================================================================= */
    function getObs(regionKey, date) {
        if (!date) return null;
        const series = state.byRegion.get(regionKey);
        if (!series || !series.has(date)) return null;
        const v = series.get(date);
        return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }

    function activeKeys() {
        return regionButtons.filter(b => b.classList.contains('active')).map(b => b.getAttribute('data-region'));
    }

    function currentDate() {
        if (!state.dates.length) return null;
        const i = Number(timeSlider.value);
        return state.dates[Number.isInteger(i) && i >= 0 && i < state.dates.length ? i : 0];
    }

    /* =================================================================
       9. DATA APPLY / UI HYDRATION
       ================================================================= */
    /* The import button stays invisible unless the datasets cannot be
       fetched automatically (e.g. fetch blocked on file:///). No status
       line, no log — the page just works, silently. */
    function showLoadButton() {
        const wrap = document.getElementById('fallback-import');
        if (wrap) wrap.classList.remove('hidden');
        if (browseBtn) browseBtn.classList.remove('hidden');
    }

    function hideLoadButton() {
        const wrap = document.getElementById('fallback-import');
        if (wrap) wrap.classList.add('hidden');
        if (browseBtn) browseBtn.classList.add('hidden');
    }

    function showDataWarning(html) {
        if (!dataWarning) return;
        if (!html) { dataWarning.innerHTML = ''; dataWarning.classList.add('hidden'); return; }
        dataWarning.innerHTML = html;
        dataWarning.classList.remove('hidden');
    }

    function applyDatasets(monthlyText, summaryText) {
        const monthly = validateMonthly(monthlyText);
        if (!monthly.ok) {
            showLoadButton();
            return { ok: false, stage: 'monthly', error: monthly.error };
        }

        let summary = { ok: false, error: 'Not supplied.', map: new Map(), stats: { accepted: 0, unknownRegions: [] } };
        if (summaryText) {
            summary = validateSummary(summaryText);
            if (!summary.ok) summary = { ok: false, error: summary.error, map: new Map(), stats: summary.stats };
        }

        /* ---- commit state ---- */
        state.byRegion = monthly.byRegion;
        state.dates = monthly.dates;
        state.globalMin = monthly.globalMin;
        state.globalMax = monthly.globalMax;
        state.monthlyRowCount = monthly.stats.accepted;
        state.summary = summary.ok ? summary.map : new Map();
        state.summaryAvailable = summary.ok;
        state.ready = true;
        state.monthlyOk = true;
        hideLoadButton();

        /* ---- unit detection (never mix units without conversion) ---- */
        const monthlyValues = [];
        monthly.byRegion.forEach(series => series.forEach(v => { if (v !== null) monthlyValues.push(v); }));
        const monthlyMedian = medianOf(monthlyValues);
        state.monthlyUnitLabel = (monthlyMedian !== null && monthlyMedian >= 1e-3) ? 'µmol/m²' : 'mol/m²';

        const summaryValues = [];
        summary.map.forEach(row => [row.before, row.during, row.after].forEach(v => { if (v !== null) summaryValues.push(v); }));
        const summaryMedian = medianOf(summaryValues);
        state.summaryFactor = (summaryMedian !== null && summaryMedian < 1) ? 1e6 : 1; // raw mol/m² -> µmol/m²
        state.summaryUnitLabel = 'µmol/m²';

        /* ---- slider ---- */
        timeSlider.min = 0;
        timeSlider.max = Math.max(0, state.dates.length - 1);
        timeSlider.step = 1;
        timeSlider.value = state.dates.length - 1; // most recent observation, as before
        timeSlider.disabled = false;
        if (dateStart) dateStart.textContent = state.dates[0];
        if (dateDisplay) dateDisplay.textContent = currentDate();

        /* ---- legend ---- */
        updateLegend();

        /* ---- coverage / consistency warnings (data anomalies only) ---- */
        const warnings = [];
        if (!summary.ok) {
            warnings.push('Statistical summary not available: ' + summary.error + ' Pre/During/Post-COVID, impact and Kruskal columns are shown as "—".');
        } else {
            const monthlyKeys = Array.from(state.byRegion.keys());
            const summaryKeys = Array.from(state.summary.keys());
            const onlyMonthly = monthlyKeys.filter(k => !state.summary.has(k));
            const onlySummary = summaryKeys.filter(k => !state.byRegion.has(k));
            if (onlyMonthly.length) warnings.push('Regions present in the monthly data but missing from the summary: ' + onlyMonthly.map(k => REGION_META[k].label).join(', ') + '.');
            if (onlySummary.length) warnings.push('Regions present in the summary but missing from the monthly data: ' + onlySummary.map(k => REGION_META[k].label).join(', ') + '.');
        }
        const thin = [];
        monthly.stats.perRegionMonths.forEach((n, k) => { if (n < state.dates.length) thin.push(`${REGION_META[k].label} (${n}/${state.dates.length})`); });
        if (thin.length) warnings.push('Regions with months lacking a valid observation (kept as missing, never filled): ' + thin.join(', ') + '.');
        if (state.monthlyUnitLabel === 'µmol/m²') warnings.push('The monthly values look like µmol/m² rather than the documented mol/m² — the unit label follows the data, please confirm the export.');
        showDataWarning(warnings.length ? '<strong>DATA NOTICES</strong><ul>' + warnings.map(w => `<li>${w}</li>`).join('') + '</ul>' : '');

        if (legendUnit) legendUnit.textContent = state.monthlyUnitLabel;

        /* ---- refresh whatever is on screen ---- */
        if (activeKeys().length) syncSelection();
        return { ok: true, summaryOk: summary.ok };
    }

    function updateLegend() {
        if (state.globalMin === null || state.globalMax === null) {
            [legendMin, legendQ1, legendMid, legendQ3, legendMax].forEach(el => { if (el) el.textContent = '—'; });
            return;
        }
        const min = state.globalMin;
        const span = state.globalMax - state.globalMin;
        const at = f => min + span * f;
        if (legendMin) legendMin.textContent = fmtLegend(min);
        if (legendQ1) legendQ1.textContent = fmtLegend(at(0.25));
        if (legendMid) legendMid.textContent = fmtLegend(at(0.50));
        if (legendQ3) legendQ3.textContent = fmtLegend(at(0.75));
        if (legendMax) legendMax.textContent = fmtLegend(state.globalMax);
    }

    /* =================================================================
       10. THEME COLOURS FOR PLOTLY
       ================================================================= */
    function themeColors() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return {
            font: isLight ? '#526575' : '#94A3B8',
            grid: isLight ? '#DCE8ED' : '#243B55',
            land: isLight ? 'rgba(220, 232, 237, 0.8)' : 'rgba(36, 59, 85, 0.5)',
            ocean: isLight ? 'rgba(102, 137, 159, 0.1)' : 'rgba(17, 28, 45, 0.4)',
            country: isLight ? '#66899F' : '#475569'
        };
    }

    function plotlyReady() {
        return typeof Plotly !== 'undefined' && Plotly && typeof Plotly.newPlot === 'function';
    }

    /* =================================================================
       11. MAP
       ================================================================= */
    function mapPayload(keys, date) {
        const dataLat = [], dataLon = [], dataColor = [], dataText = [], dataHover = [];
        const missLat = [], missLon = [], missText = [], missHover = [];

        keys.forEach(k => {
            const meta = REGION_META[k];
            const v = getObs(k, date);
            if (v === null) {
                dataLat.push(null); dataLon.push(null); dataColor.push(null); dataText.push(''); dataHover.push('');
                missLat.push(meta.lat); missLon.push(meta.lon);
                missText.push(`${meta.label} · no data`);
                missHover.push(`<b>${meta.label}</b><br>${date}<br>No data`);
            } else {
                dataLat.push(meta.lat); dataLon.push(meta.lon); dataColor.push(v); dataText.push(meta.label);
                dataHover.push(`<b>${meta.label}</b><br>${date}<br>${fmtObs(v)} ${state.monthlyUnitLabel}`);
                missLat.push(null); missLon.push(null); missText.push(''); missHover.push('');
            }
        });

        return { dataLat, dataLon, dataColor, dataText, dataHover, missLat, missLon, missText, missHover };
    }

    function renderMap(keys, date) {
        if (!plotlyReady()) {
            showDataWarning('Plotly.js did not load, so the map and charts cannot render. Add <code>assets/js/plotly.min.js</code> (or allow the CDN fallback in <code>design.html</code>).');
            return;
        }
        const colors = themeColors();
        const p = mapPayload(keys, date);

        const traces = [
            {
                type: 'scattergeo',
                mode: 'markers+text',
                name: 'Observation',
                lat: p.dataLat, lon: p.dataLon,
                text: p.dataText, textposition: 'top center', textfont: { size: 10, color: colors.font },
                hoverinfo: 'text', hovertext: p.dataHover,
                marker: {
                    size: 16,
                    color: p.dataColor,
                    colorscale: MAP_COLORSCALE,
                    cmin: state.globalMin,
                    cmax: state.globalMax,
                    showscale: false,
                    line: { width: 1, color: '#ffffff' }
                }
            },
            {
                type: 'scattergeo',
                mode: 'markers+text',
                name: 'No data',
                lat: p.missLat, lon: p.missLon,
                text: p.missText, textposition: 'top center', textfont: { size: 10, color: MISSING_COLOR },
                hoverinfo: 'text', hovertext: p.missHover,
                marker: { size: 13, color: MISSING_COLOR, symbol: 'circle-open', line: { width: 2, color: MISSING_COLOR } }
            }
        ];

        Plotly.newPlot('plot-map', traces, {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: colors.font, family: 'Inter, sans-serif' },
            showlegend: false,
            geo: {
                projection: { type: 'natural earth' },
                bgcolor: 'rgba(0,0,0,0)',
                showocean: true, oceancolor: colors.ocean,
                showland: true, landcolor: colors.land,
                showcountries: true, countrycolor: colors.country
            },
            margin: { t: 0, r: 0, l: 0, b: 0 }
        }, { responsive: true, displayModeBar: false });
    }

    function updateMapData(keys, date) {
        if (!plotlyReady()) return;
        const el = document.getElementById('plot-map');
        if (!el || !el.data) { renderMap(keys, date); return; }
        const p = mapPayload(keys, date);
        Plotly.restyle('plot-map', {
            lat: [p.dataLat, p.missLat],
            lon: [p.dataLon, p.missLon],
            'marker.color': [p.dataColor, MISSING_COLOR],
            text: [p.dataText, p.missText],
            hovertext: [p.dataHover, p.missHover]
        }, [0, 1]);
    }

    /* =================================================================
       12. CHARTS
       ================================================================= */
    function trendShape(date, colors) {
        if (!date) return null;
        return {
            type: 'line', xref: 'x', yref: 'paper',
            x0: date, x1: date, y0: 0, y1: 1,
            line: { color: colors.font, width: 1, dash: 'dot' }
        };
    }

    function renderCharts(keys, date) {
        if (!plotlyReady()) return;
        const colors = themeColors();
        const baseLayout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: colors.font, family: 'Inter, sans-serif' },
            margin: { t: 20, r: 20, l: 70, b: 90 },
            showlegend: true,
            legend: { orientation: 'h', y: -0.32, font: { size: 10 } },
            hovermode: 'x unified'
        };

        const trendTraces = keys.map(k => {
            const meta = REGION_META[k];
            const series = state.byRegion.get(k) || new Map();
            return {
                name: meta.label,
                x: state.dates,
                y: state.dates.map(d => (series.has(d) && typeof series.get(d) === 'number') ? series.get(d) : null),
                type: 'scatter', mode: 'lines+markers', connectgaps: false,
                line: { color: regionColor(k), width: 2.5 },
                marker: { size: 4, color: regionColor(k) },
                hovertemplate: `%{y:.6f} ${state.monthlyUnitLabel}<extra>${meta.label}</extra>`
            };
        });

        Plotly.newPlot('plot-trend', trendTraces, Object.assign({}, baseLayout, {
            xaxis: { gridcolor: colors.grid, type: 'date', tickformat: '%Y-%m' },
            yaxis: { gridcolor: colors.grid, title: { text: `NO₂ (${state.monthlyUnitLabel})` } },
            shapes: date ? [trendShape(date, colors)] : []
        }), { responsive: true, displayModeBar: false });

        const seasonalTraces = keys.map(k => {
            const meta = REGION_META[k];
            const series = state.byRegion.get(k) || new Map();
            const means = MONTH_NAMES.map((_, mIdx) => {
                const mNum = mIdx + 1;
                const vals = [];
                series.forEach((v, d) => {
                    const parts = String(d).split('-');
                    if (parts.length > 1 && parseInt(parts[1], 10) === mNum && typeof v === 'number') vals.push(v);
                });
                if (!vals.length) return null; // real gap, never 0
                return vals.reduce((a, b) => a + b, 0) / vals.length;
            });
            return {
                name: meta.label,
                x: MONTH_NAMES,
                y: means,
                type: 'scatter', mode: 'lines+markers', connectgaps: false,
                line: { color: regionColor(k), width: 2.5 },
                marker: { size: 5, color: regionColor(k) },
                hovertemplate: `%{y:.6f} ${state.monthlyUnitLabel}<extra>${meta.label}</extra>`
            };
        });

        Plotly.newPlot('plot-seasonal', seasonalTraces, Object.assign({}, baseLayout, {
            xaxis: { gridcolor: colors.grid, type: 'category' },
            yaxis: { gridcolor: colors.grid, title: { text: `Mean NO₂ (${state.monthlyUnitLabel})` } }
        }), { responsive: true, displayModeBar: false });
    }

    function updateTrendMarker(date) {
        if (!plotlyReady()) return;
        const el = document.getElementById('plot-trend');
        if (!el || !el.data) return;
        const shape = trendShape(date, themeColors());
        Plotly.relayout('plot-trend', { shapes: shape ? [shape] : [] });
    }

    /* Colour-only update: keeps legend visibility (click-to-hide) intact. */
    function restyleChartColors(keys) {
        if (!plotlyReady() || !keys.length) return;
        const cols = keys.map(regionColor);
        const idx = keys.map((_, i) => i);
        const trendEl = document.getElementById('plot-trend');
        if (trendEl && trendEl.data) {
            Plotly.restyle('plot-trend', { 'line.color': cols, 'marker.color': cols }, idx);
        }
        const seasonalEl = document.getElementById('plot-seasonal');
        if (seasonalEl && seasonalEl.data) {
            Plotly.restyle('plot-seasonal', { 'line.color': cols, 'marker.color': cols }, idx);
        }
    }

    /* =================================================================
       13. TABLE (full width, beneath the dashboard grid)
       ================================================================= */
    function renderTable(keys, date) {
        const thead = document.getElementById('data-table-head');
        const tbody = document.getElementById('data-table-body');
        if (!thead || !tbody) return;

        const u = `<span class="unit">(${state.monthlyUnitLabel})</span>`;
        const su = `<span class="unit">(${state.summaryUnitLabel})</span>`;
        thead.innerHTML = `<tr>
            <th scope="col">REGION</th>
            <th scope="col">COORDINATES</th>
            <th scope="col">OBSERVATION<br>${date || '—'} ${u}</th>
            <th scope="col">PRE-COVID<br>${su}</th>
            <th scope="col">DURING-COVID<br>${su}</th>
            <th scope="col">POST-COVID<br>${su}</th>
            <th scope="col">LOCKDOWN IMPACT<br><span class="unit">(% change, during vs before)</span></th>
            <th scope="col">KRUSKAL<br><span class="unit">p-value</span></th>
        </tr>`;

        tbody.innerHTML = keys.map(k => {
            const meta = REGION_META[k];
            const color = regionColor(k);
            const obs = getObs(k, date);
            const sum = state.summary.get(k) || null;

            const coordText = `${Math.abs(meta.lat).toFixed(2)}°${meta.lat >= 0 ? 'N' : 'S'}, ${Math.abs(meta.lon).toFixed(2)}°${meta.lon >= 0 ? 'E' : 'W'}`;
            const obsCell = obs === null
                ? '<span class="mis" title="No valid observation for this region and month in the dataset">No data</span>'
                : fmtObs(obs);

            const scaled = v => (v === null || v === undefined) ? null : v * state.summaryFactor;
            const cellFor = (v, title) => {
                const s = fmtSummary(scaled(v));
                return s === null ? `<span class="mis" title="${title}">—</span>` : s;
            };

            let pctCell = '<span class="mis" title="No statistical summary loaded">—</span>';
            if (sum && sum.pct !== null) {
                const pctColor = sum.pct > 0 ? '#E84646' : '#46E8B9';
                pctCell = `<span style="color:${pctColor}; font-weight:600;">${(sum.pct > 0 ? '+' : '') + sum.pct.toFixed(2)}%</span>`;
            }

            const pText = sum ? fmtPValue(sum.kruskal) : null;
            const pCell = pText === null
                ? '<span class="mis" title="No statistical summary loaded">—</span>'
                : `<span${sum.kruskal < 0.05 ? ' class="sig"' : ''} title="Kruskal–Wallis p-value across Before/During/After">${pText}</span>`;

            return `<tr>
                <td><strong style="color:${color}">${meta.label}</strong><br><span class="region-csv">${meta.csvName}</span></td>
                <td class="coord" title="City-centre reference coordinates">${coordText}</td>
                <td>${obsCell}</td>
                <td>${cellFor(sum ? sum.before : null, 'No value in the statistical summary')}</td>
                <td>${cellFor(sum ? sum.during : null, 'No value in the statistical summary')}</td>
                <td>${cellFor(sum ? sum.after : null, 'No value in the statistical summary')}</td>
                <td>${pctCell}</td>
                <td>${pCell}</td>
            </tr>`;
        }).join('');
    }

    /* =================================================================
       14. COLOUR PICKERS
       ================================================================= */
    function buildColorPickers(keys) {
        if (!colorControlsList || !colorControlsContainer) return;
        colorControlsList.innerHTML = '';
        if (!keys.length) {
            colorControlsContainer.classList.add('hidden');
            return;
        }
        colorControlsContainer.classList.remove('hidden');
        keys.forEach(k => {
            const row = document.createElement('div');
            row.className = 'color-row';
            row.innerHTML = `
                <span class="sys-log">${REGION_META[k].label}</span>
                <input type="color" class="color-input" data-region="${k}" value="${regionColor(k)}" aria-label="Chart colour for ${REGION_META[k].label}">
            `;
            const picker = row.querySelector('input');
            picker.addEventListener('input', e => {
                state.manualColors.set(k, e.target.value);
                const keysNow = activeKeys();
                restyleChartColors(keysNow);
                renderTable(keysNow, currentDate());
            });
            colorControlsList.appendChild(row);
        });
    }

    /* =================================================================
       15. SELECTION & VIEW SYNC
       ================================================================= */
    function syncSelection() {
        const keys = activeKeys();
        const date = currentDate();

        if (!keys.length) {
            if (emptyState) { emptyState.classList.add('visible'); emptyState.classList.remove('hidden'); }
            if (dataContent) { dataContent.classList.remove('visible'); dataContent.classList.add('hidden'); }
            if (tableContent) tableContent.classList.add('hidden');
            if (colorControlsContainer) colorControlsContainer.classList.add('hidden');
            return;
        }

        if (emptyState) { emptyState.classList.remove('visible'); emptyState.classList.add('hidden'); }
        if (dataContent) { dataContent.classList.add('visible'); dataContent.classList.remove('hidden'); }
        if (tableContent) tableContent.classList.remove('hidden');

        buildColorPickers(keys);
        renderMap(keys, date);
        renderCharts(keys, date);
        renderTable(keys, date);
        requestAnimationFrame(clampOverlay);
    }

    regionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            syncSelection();
        });
    });

    /* =================================================================
       16. TIME SLIDER
       ================================================================= */
    if (timeSlider) {
        timeSlider.addEventListener('input', () => {
            if (!state.ready) return;
            const date = currentDate();
            if (!date) return;
            if (dateDisplay) dateDisplay.textContent = date;
            const keys = activeKeys();
            if (!keys.length) return;
            updateMapData(keys, date);
            renderTable(keys, date);
            updateTrendMarker(date);
        });
    }

    /* =================================================================
       17. DRAGGABLE MAP OVERLAY (pointer events: mouse + touch)
       ================================================================= */
    const overlay = document.getElementById('draggable-legend');
    const dragHandle = document.getElementById('drag-handle');
    let drag = null;

    function overlayContainer() {
        return overlay ? overlay.offsetParent : null;
    }

    function clampOverlay() {
        if (!overlay) return;
        const container = overlayContainer();
        if (!container) return;
        const maxLeft = Math.max(0, container.clientWidth - overlay.offsetWidth);
        const maxTop = Math.max(0, container.clientHeight - overlay.offsetHeight);
        const currentLeft = parseFloat(overlay.style.left);
        const currentTop = parseFloat(overlay.style.top);
        let left = Number.isFinite(currentLeft) ? currentLeft : overlay.offsetLeft;
        let top = Number.isFinite(currentTop) ? currentTop : overlay.offsetTop;
        left = Math.min(Math.max(left, 0), maxLeft);
        top = Math.min(Math.max(top, 0), maxTop);
        overlay.style.left = left + 'px';
        overlay.style.top = top + 'px';
        overlay.style.right = 'auto';
        overlay.style.bottom = 'auto';
    }

    if (overlay && dragHandle) {
        dragHandle.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            const container = overlayContainer();
            if (!container) return;
            overlay.style.left = overlay.offsetLeft + 'px';
            overlay.style.top = overlay.offsetTop + 'px';
            overlay.style.right = 'auto';
            drag = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startLeft: overlay.offsetLeft,
                startTop: overlay.offsetTop,
                maxLeft: Math.max(0, container.clientWidth - overlay.offsetWidth),
                maxTop: Math.max(0, container.clientHeight - overlay.offsetHeight)
            };
            if (dragHandle.setPointerCapture) {
                try { dragHandle.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
            }
            overlay.classList.add('dragging');
            e.preventDefault();
            e.stopPropagation();
        });

        dragHandle.addEventListener('pointermove', e => {
            if (!drag || e.pointerId !== drag.id) return;
            const left = Math.min(Math.max(drag.startLeft + (e.clientX - drag.startX), 0), drag.maxLeft);
            const top = Math.min(Math.max(drag.startTop + (e.clientY - drag.startY), 0), drag.maxTop);
            overlay.style.left = left + 'px';
            overlay.style.top = top + 'px';
            e.preventDefault();
        });

        const endDrag = e => {
            if (!drag) return;
            if (e && e.pointerId !== undefined && e.pointerId !== drag.id) return;
            drag = null;
            overlay.classList.remove('dragging');
        };
        dragHandle.addEventListener('pointerup', endDrag);
        dragHandle.addEventListener('pointercancel', endDrag);
        dragHandle.addEventListener('lostpointercapture', endDrag);

        /* keep the overlay inside the map when the viewport changes */
        window.addEventListener('resize', () => requestAnimationFrame(clampOverlay));
    }

    /* ---- minimize / maximize toggle ----
       Clicking it never starts a drag (pointerdown is stopped); the drag
       handle and slider keep working in both states. */
    const collapseBtn = document.getElementById('overlay-collapse');
    if (collapseBtn && overlay) {
        collapseBtn.addEventListener('pointerdown', e => e.stopPropagation());
        collapseBtn.addEventListener('click', () => {
            const collapsed = overlay.classList.toggle('collapsed');
            collapseBtn.textContent = collapsed ? '+' : '−';
            collapseBtn.setAttribute('aria-label', collapsed ? 'Maximize panel' : 'Minimize panel');
            requestAnimationFrame(clampOverlay);
        });
    }

    /* =================================================================
       18. THEME SWITCHER
       ================================================================= */
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            htmlElement.setAttribute('data-theme', newTheme);
            themeToggleBtn.innerHTML = newTheme === 'light'
                ? '<span class="theme-icon">🌙</span> Dark Mode'
                : '<span class="theme-icon">☀️</span> Light Mode';
            const keys = activeKeys();
            if (keys.length) {
                renderMap(keys, currentDate());
                renderCharts(keys, currentDate());
                renderTable(keys, currentDate());
            }
        });
    }

    /* =================================================================
       19. CSV LOADING (HTTP/HTTPS auto-load + offline file picker)
       ================================================================= */
    const pending = { monthly: null, summary: null };

    function classifyCsv(text) {
        const parsed = parseCsvText(text);
        const first = parsed.rows[0];
        if (!first) return { kind: 'invalid', reason: 'the file contains no header row.' };
        const idx = buildHeaderIndex(first);
        const has = aliases => cell(first, idx, aliases) !== undefined;
        const monthlyShape = has(MONTHLY_ALIASES.region) && has(MONTHLY_ALIASES.date) && has(MONTHLY_ALIASES.value);
        const summaryShape = has(SUMMARY_ALIASES.region) && has(SUMMARY_ALIASES.before) && has(SUMMARY_ALIASES.kruskal);
        if (monthlyShape) return { kind: 'monthly' };
        if (summaryShape) return { kind: 'summary' };
        return {
            kind: 'invalid',
            reason: `unrecognised headers (${Object.keys(first).join(', ')}). Expected either the monthly dataset (region, date, no2_monthly_mean) or the statistical summary (region, Before, During, After, pct_change_during_vs_before, kruskal_p_value).`
        };
    }

    function readFileText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error || new Error('The browser could not read ' + file.name));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async function handleFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        let acceptedNew = false;
        for (const file of files) {
            if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') continue;
            let text;
            try {
                text = await readFileText(file);
            } catch (err) {
                continue;
            }
            const verdict = classifyCsv(text);
            if (verdict.kind === 'invalid') continue;
            pending[verdict.kind] = { name: file.name, text };
            acceptedNew = true;
        }

        if (pending.monthly && pending.summary && acceptedNew) {
            const result = applyDatasets(pending.monthly.text, pending.summary.text);
            if (!result.ok) {
                pending.monthly = null;
                showLoadButton();
            } else if (result.summaryOk === false) {
                pending.summary = null;
            }
        }
    }

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            handleFiles(e.target.files);
            fileInput.value = '';
        });
    }

    if (emptyStateEl) {
        ['dragover', 'drop'].forEach(evt =>
            emptyStateEl.addEventListener(evt, e => e.preventDefault())
        );
        emptyStateEl.addEventListener('drop', e => {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        });
    }

    async function fetchText(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
        const text = await res.text();
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error(`${url} returned an HTML page, not CSV text`);
        return text;
    }

    async function autoLoadFromServer() {
        if (location.protocol === 'file:') {
            showLoadButton();
            return;
        }
        /* Paths are resolved against the document URL, so a GitHub Pages
           deployment inside /<repo>/ works without configuration. */
        const monthlyUrl = new URL('data/processed/no2_monthly_data.csv', document.baseURI).href;
        const summaryUrl = new URL('data/processed/no2_statistical_summary.csv', document.baseURI).href;

        let monthlyText = null, summaryText = null;

        try { monthlyText = await fetchText(monthlyUrl); }
        catch (err) { monthlyText = null; }

        try { summaryText = await fetchText(summaryUrl); }
        catch (err) { summaryText = null; }

        if (!monthlyText) {
            showLoadButton();
            return;
        }

        applyDatasets(monthlyText, summaryText);
    }

    /* =================================================================
       20. BOOT
       ================================================================= */
    /* Hard guarantee of the zero-selection rule, whatever the markup says. */
    regionButtons.forEach(b => b.classList.remove('active'));

    syncSelection();          // renders the empty state, nothing selected
    updateLegend();           // placeholder labels until data arrives
    autoLoadFromServer();
});
