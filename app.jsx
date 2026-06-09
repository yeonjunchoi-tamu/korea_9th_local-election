/* global React, DATA, PARTIES, party, fmt, pct */
const { useState, useMemo, useRef, useEffect } = React;

/* ============================== 작은 유틸 UI ============================== */
function PartyDot({ pid, size = 10 }) {
  return <span style={{ width: size, height: size, borderRadius: 3, background: party(pid).color, display: 'inline-block', flex: '0 0 auto' }} />;
}
function pname(c) { return c.partyName || party(c.partyId).name; }

/* mix a hex color toward dark bg for low-margin fade */
function fade(hex, amt) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const bg = [18, 22, 30];
  const mix = (x, y) => Math.round(x * amt + y * (1 - amt));
  return `rgb(${mix(r, bg[0])},${mix(g, bg[1])},${mix(b, bg[2])})`;
}
/* 색 농도 = 득표차. 단, 접전 지역도 정당색이 또렷이 보이도록 바닥값을 높게 둔다
   (예전 0.4 바닥은 배경(어두운색)으로 너무 많이 섞여 접전 지역이 '검게' 비어 보였음). */
function intensityOf(res) { return res ? Math.min(1, 0.64 + res.marginPct * 1.05) : 0.34; }

/* 경로 d 문자열의 대략 중심(bbox) */
function pathCenter(d) {
  const n = d.match(/-?[\d.]+/g); if (!n) return [0, 0];
  let a = 1e9, b = 1e9, c = -1e9, e = -1e9;
  for (let i = 0; i < n.length; i += 2) { const x = +n[i], y = +n[i + 1]; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y; }
  return [(a + c) / 2, (b + e) / 2];
}

/* path d 의 모든 절대좌표쌍에 scale+translate 적용 (M/L/Z 전용) */
function transformPath(d, s, tx, ty) {
  let i = 0;
  return d.replace(/-?[\d.]+/g, (m) => { const v = parseFloat(m); const out = (i % 2 === 0) ? (v * s + tx) : (v * s + ty); i++; return out.toFixed(1); });
}

/* ============================== 검색 바 ============================== */
function SearchBar({ onPick, index, placeholder }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const SI = index || DATA.searchIndex;

  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    const norm = s.replace(/\s+/g, '');
    const subseq = (hay) => { let i = 0; for (const ch of hay) { if (ch === norm[i]) i++; if (i === norm.length) return true; } return false; };
    const seen = new Set();
    const scored = [];
    for (const item of SI) {
      const hay = item.label.replace(/\s+/g, '');
      const tokens = item.label.split(/\s+/);
      let score = -1;
      if (item.label.startsWith(s) || hay.startsWith(norm)) score = 4;
      else if (tokens.some((t) => t.startsWith(s) || t.replace(/\s/g, '').startsWith(norm))) score = 3;
      else if (hay.includes(norm)) score = 2.4;
      else if (subseq(hay)) score = 1.6;
      else if (item.sub && item.sub.replace(/\s+/g, '').includes(norm)) score = 1;
      if (score < 0) continue;
      score += item.kind === 'region' ? 1.5 : item.kind === 'candidate' ? 0.9 : 0;
      if (item.level === 'sido') score += 0.7;
      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length);
    const picked = [];
    for (const { item } of scored) {
      const key = item.kind === 'candidate' ? 'c|' + item.label + '|' + item.contestKey : item.kind + '|' + item.label + '|' + item.sub;
      if (seen.has(key)) continue;
      seen.add(key); picked.push(item);
      if (picked.length >= 9) break;
    }
    return picked;
  }, [q]);

  useEffect(() => { setActive(0); setQ(''); }, [SI]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (item) => { onPick(item); setQ(item.label); setOpen(false); };
  const kindMeta = {
    candidate: { icon: '인물', cls: 'k-cand' }, region: { icon: '지역', cls: 'k-region' }, dong: { icon: '동', cls: 'k-dong' },
  };

  return (
    <div className="search" ref={boxRef}>
      <svg className="search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input className="search__input" value={q}
        placeholder={placeholder || "후보자 · 시·도 · 시·군·구 · 읍·면·동 검색  (예: 김경수, 전남·광주, 순천시 해룡면)"}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }} />
      {q && <button className="search__clear" onClick={() => { setQ(''); setOpen(false); }}>✕</button>}
      {open && results.length > 0 && (
        <div className="search__menu">
          {results.map((item, i) => {
            const m = kindMeta[item.kind] || kindMeta.region;
            return (
              <button key={i} className={'search__row' + (i === active ? ' is-active' : '')}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(item)}>
                <span className={'kbadge ' + m.cls}>{m.icon}</span>
                <span className="search__txt"><span className="search__label">{item.label}</span><span className="search__sub">{item.sub}</span></span>
              </button>
            );
          })}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div className="search__menu"><div className="search__empty">검색 결과가 없습니다</div></div>
      )}
    </div>
  );
}

/* ============================== 지역 지도 (3단계 공용) ============================== */
function RegionMap({ regions, labels, viewBox, onSelect, selectedGid, fontSize, flat, label, labelFont, outlines, list, staticMosaic, baseLayer }) {
  const [hoverGid, setHoverGid] = useState(null);
  const [hoverReg, setHoverReg] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [listOpen, setListOpen] = useState(false);
  const wrapRef = useRef(null);
  const sw = (fontSize || 12) * 0.05;
  const group = !!(outlines && outlines.length); // 전국 모자이크 모드: 칠은 작은 조각, 상호작용/하이라이트는 시·도 단위

  // 전국 선거구 모자이크: 수천 개 조각을 hover로 재스타일하지 않도록 정적 렌더(툴팁만 갱신)
  const staticPaths = useMemo(() => !staticMosaic ? null : regions.map((r) => {
    const res = r.fillRes || r.result;
    const pid = res ? res.winnerPartyId : 'indep';
    return (
      <path key={r.key} d={r.path}
        fill={res ? fade(party(pid).color, intensityOf(res)) : '#19202e'}
        stroke="rgba(8,11,17,.35)" strokeWidth={sw * 0.55} strokeLinejoin="round"
        onClick={() => onSelect(r)}
        onMouseEnter={() => { setHoverGid(r.gid); setHoverReg(r); }}
        style={{ cursor: 'pointer' }} />
    );
  }), [regions]);

  // 모자이크(전국) 조각들은 hover/선택에 따라 재스타일하지 않도록 메모이즈 → 수천 개라도 부드럽게
  const mosaicPaths = useMemo(() => staticMosaic ? null : regions.map((r) => {
    const res = r.fillRes || r.result;
    const pid = res ? res.winnerPartyId : 'indep';
    if (group) {
      return (
        <path key={r.key} d={r.path}
          fill={res ? fade(party(pid).color, intensityOf(res)) : '#19202e'}
          stroke="rgba(8,11,17,.4)" strokeWidth={sw * 0.7} strokeLinejoin="round"
          onClick={() => onSelect(r)}
          onMouseEnter={() => { setHoverGid(r.gid); setHoverReg(r); }}
          style={{ cursor: 'pointer' }} />
      );
    }
    const sel = selectedGid != null && r.gid === selectedGid;
    const hv = hoverGid != null && r.gid === hoverGid;
    return (
      <path key={r.key} d={r.path}
        fill={res ? fade(party(pid).color, intensityOf(res)) : '#19202e'}
        stroke={sel ? '#ffffff' : (hv ? '#e7edf6' : (flat ? '#070a10' : 'rgba(8,11,17,.55)'))}
        strokeWidth={sel ? sw * 4 : (hv ? sw * 3 : (flat ? sw * 2.4 : sw))}
        strokeLinejoin="round"
        onClick={() => onSelect(r)}
        onMouseEnter={() => { setHoverGid(r.gid); setHoverReg(r); }}
        style={{ cursor: 'pointer', filter: sel ? 'brightness(1.16)' : (hv ? 'brightness(1.12)' : 'none') }} />
    );
  }), [regions, group, selectedGid, hoverGid]);

  return (
    <div className="geomap" ref={wrapRef}
      onMouseMove={(e) => {
        const b = wrapRef.current.getBoundingClientRect(); setMouse({ x: e.clientX - b.left, y: e.clientY - b.top });
        const t = e.target;
        // 경로(지역) 위가 아니고 목록 패널 위도 아니면 → 떠 있던 툴팁/하이라이트 해제
        if (t && t.tagName !== 'path' && !(t.closest && t.closest('.rlist'))) { setHoverGid(null); setHoverReg(null); }
      }}
      onMouseLeave={() => { setHoverGid(null); setHoverReg(null); }}>
      <svg viewBox={viewBox} className="geomap__svg" preserveAspectRatio="xMidYMid meet">
        {baseLayer && baseLayer.map((o) => (
          <path key={'bl' + o.key} d={o.path} fill={o.fill || 'none'} stroke={o.stroke || 'none'}
            strokeWidth={o.sw || sw} strokeLinejoin="round" pointerEvents="none" />
        ))}
        {staticMosaic ? staticPaths : null}
        {group && outlines.map((o) => (
          <path key={'base' + o.gid} d={o.path} fill={fade(party(o.pid).color, 0.14)} stroke="none" pointerEvents="none" />
        ))}
        {!staticMosaic && mosaicPaths}
        {group && outlines.map((o) => {
          const hv = hoverGid === o.gid;
          const sel = selectedGid != null && selectedGid === o.gid;
          return (
            <path key={'ol' + o.gid} d={o.path} fill="none" pointerEvents="none"
              stroke={sel ? '#ffffff' : (hv ? '#e7edf6' : 'rgba(6,9,14,.85)')}
              strokeWidth={sel ? sw * 4 : (hv ? sw * 3 : sw * 1.3)} strokeLinejoin="round"
              style={{ filter: (hv || sel) ? 'drop-shadow(0 0 3px rgba(0,0,0,.6))' : 'none' }} />
          );
        })}
        {labels && labels.map((l, i) => (
          <text key={'l' + i} x={l.cx} y={l.cy} fontSize={l.font || labelFont || fontSize} textAnchor="middle"
            className="geomap__lbl" stroke="#0a0e15" strokeWidth={(l.font || labelFont || fontSize) * 0.22} paintOrder="stroke"
            pointerEvents="none">{l.text}</text>
        ))}
      </svg>
      {hoverReg && hoverReg.result && (
        <div className="geomap__tip" style={{ left: mouse.x, top: mouse.y }}>
          <b>{hoverReg.tipName}</b>
          {hoverReg.result.novote
            ? <><span><i style={{ background: party(hoverReg.result.winnerPartyId).color }} />{party(hoverReg.result.winnerPartyId).name}</span><span className="muted">무투표 당선</span></>
            : hoverReg.result.aggInfo
            ? <><span><i style={{ background: party(hoverReg.result.aggInfo.pid).color }} />{party(hoverReg.result.aggInfo.pid).name} 최다</span><span className="muted">{hoverReg.result.aggInfo.total}개 선거구 중 {hoverReg.result.aggInfo.seats}곳 1위</span></>
            : <><span><i style={{ background: party(hoverReg.result.winnerPartyId).color }} />{hoverReg.result.candidates[0].name} {pct(hoverReg.result.candidates[0].share)}</span><span className="muted">투표율 {pct(hoverReg.result.turnout)} · 격차 {pct(hoverReg.result.marginPct)}p</span></>}
        </div>
      )}
      {label && <div className="carto__cap">{label}</div>}
      {list && list.items && list.items.length > 0 && (
        <div className={'rlist' + (listOpen ? '' : ' rlist--collapsed')}>
          <div className="rlist__hd" onClick={() => setListOpen((v) => !v)}>
            <span>{list.title} <span className="cnt">{list.items.length}</span></span>
            <span className="car">▾</span>
          </div>
          <div className="rlist__body">
            {list.items.map((it) => (
              <button key={it.key} className={'rlist__row' + (hoverGid === it.gid ? ' is-hot' : '')}
                onClick={() => it.on()}
                onMouseEnter={() => { setHoverGid(it.gid); setHoverReg(null); }}>
                <i style={{ background: party(it.pid).color }} />
                <span className="rlist__nm">{it.label}</span>
                <span className="rlist__pc">{pct(it.share)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== 범례 ============================== */
function Legend({ parties }) {
  return (
    <div className="legend">
      {parties.map((pid) => (<span key={pid} className="legend__item"><PartyDot pid={pid} /> {party(pid).name}</span>))}
      <span className="legend__note">채도 = 득표차(격차)</span>
    </div>
  );
}

/* ============================== 1:1 막대 비교 ============================== */
function HeadToHead({ a, b }) {
  if (!b) return null;
  const tot = a.share + b.share || 1;
  const aw = (a.share / tot) * 100;
  return (
    <div className="h2h">
      <div className="h2h__top">
        <div className="h2h__side"><PartyDot pid={a.partyId} size={12} /><span className="h2h__name">{a.name}</span><span className="h2h__party">{party(a.partyId).short}</span></div>
        <div className="h2h__side h2h__side--r"><span className="h2h__party">{party(b.partyId).short}</span><span className="h2h__name">{b.name}</span><PartyDot pid={b.partyId} size={12} /></div>
      </div>
      <div className="h2h__bar">
        <div className="h2h__seg" style={{ width: aw + '%', background: party(a.partyId).color }}><span>{pct(a.share)}</span></div>
        <div className="h2h__seg h2h__seg--r" style={{ width: (100 - aw) + '%', background: party(b.partyId).color }}><span>{pct(b.share)}</span></div>
      </div>
      <div className="h2h__foot">득표차 <b>{fmt(a.votes - b.votes)}</b>표 · <b>{pct(a.share - b.share)}p</b></div>
    </div>
  );
}

/* ============================== 사전투표 vs 본투표 비교 ============================== */
function PreDayCompare({ split, candidates, scope }) {
  if (!split || (!split.pre.total && !split.day.total)) return null;
  const preT = split.pre.total, dayT = split.day.total, all = preT + dayT || 1;
  const rows = candidates.map((c) => {
    const pv = split.pre.byName[c.name] || 0;
    const dv = split.day.byName[c.name] || 0;
    return { name: c.name, partyId: c.partyId, pv, dv, ps: preT ? pv / preT : 0, ds: dayT ? dv / dayT : 0 };
  });
  const Bar = ({ key2, tot }) => (
    <div className="pdc__bar">
      {rows.filter((r) => r[key2] > 0.006).map((r) => (
        <div key={r.name} className="pdc__seg" style={{ width: (r[key2] * 100) + '%', background: party(r.partyId).color }}>
          {r[key2] >= 0.13 && <span>{pct(r[key2], 0)}</span>}
        </div>
      ))}
    </div>
  );
  const swings = rows.filter((r) => Math.max(r.ps, r.ds) >= 0.02).slice(0, 5);
  return (
    <div className="pdc">
      <div className="pdc__rowlabel"><span>사전투표</span><span>{fmt(preT)}표 ({pct(preT / all, 0)})</span></div>
      <Bar key2="ps" tot={preT} />
      <div className="pdc__rowlabel"><span>본투표(선거일)</span><span>{fmt(dayT)}표 ({pct(dayT / all, 0)})</span></div>
      <Bar key2="ds" tot={dayT} />
      <div className="pdc__swings">
        {swings.map((r) => {
          const d = r.ds - r.ps;
          const dir = d >= 0 ? 'up' : 'down';
          return (
            <div key={r.name} className="pdc__swing">
              <span className="pdc__sname"><PartyDot pid={r.partyId} size={10} />{r.name}</span>
              <span className="pdc__nums">
                <span className="muted">사전 {pct(r.ps)}</span>
                <span className="pdc__arrow">→</span>
                <span>본투표 {pct(r.ds)}</span>
                <span className={'pdc__delta pdc__delta--' + dir}>{d >= 0 ? '▲' : '▼'}{pct(Math.abs(d))}p</span>
              </span>
            </div>
          );
        })}
      </div>
      {scope === 'dong' && <div className="pdc__meta">※ 읍·면·동은 관내사전투표 기준 (관외사전·거소·선상투표는 시·군·구 단위로 집계)</div>}
    </div>
  );
}

/* ============================== 상세 패널 ============================== */
function Detail({ contest, highlightName, onBack, backLabel, hint }) {
  if (!contest) return null;
  if (contest.novote) {
    const w = contest.candidates[0];
    return (
      <div className="detail">
        <div className="detail__head">
          <div>
            <div className="detail__type">{contest.typeLabel}<span className="real-badge" style={{ background: 'rgba(242,145,60,.16)', color: '#f2b27a', borderColor: 'rgba(242,145,60,.3)' }}>무투표</span></div>
            <h2 className="detail__title">{contest.regionName}</h2>
            {contest.parentName && <div className="detail__parent">{contest.parentName}</div>}
          </div>
          {onBack && <button className="btn-ghost" onClick={onBack}>← {backLabel}</button>}
        </div>
        <div className="cands" style={{ marginBottom: 18 }}>
          <div className="cand cand--win">
            <div className="cand__row">
              <PartyDot pid={w.partyId} size={12} />
              <span className="cand__name">{w.name === '(무투표 당선)' ? '단독 후보' : w.name}</span>
              <span className="cand__party">{pname(w)}</span>
              <span className="cand__badge">당선</span>
            </div>
          </div>
        </div>
        <p className="hint"><b>무투표 선거구</b>입니다. 후보가 1명뿐이라 투표 없이 <b>{pname(w)}</b> 후보가 당선되었습니다. 개표 수치가 없어 전국 지도엔 당선 정당색으로만 표시됩니다.</p>
      </div>
    );
  }
  const top = contest.candidates;
  const maxShare = top[0].share || 1;
  return (
    <div className="detail">
      <div className="detail__head">
        <div>
          <div className="detail__type">{contest.typeLabel}{contest.real && <span className="real-badge">실데이터</span>}</div>
          <h2 className="detail__title">{contest.regionName}</h2>
          {contest.parentName && <div className="detail__parent">{contest.parentName}</div>}
        </div>
        {onBack && <button className="btn-ghost" onClick={onBack}>← {backLabel}</button>}
      </div>
      <div className="detail__stats">
        <div className="stat"><div className="stat__k">투표율</div><div className="stat__v">{pct(contest.turnout)}</div></div>
        <div className="stat"><div className="stat__k">총 투표수</div><div className="stat__v">{fmt(contest.totalVotes)}</div></div>
        <div className="stat"><div className="stat__k">선거인수</div><div className="stat__v">{fmt(contest.electorate)}</div></div>
        <div className="stat"><div className="stat__k">득표차</div><div className="stat__v">{pct(contest.marginPct)}p</div></div>
      </div>
      <div className="detail__sectionlabel">1:1 맞대결</div>
      <HeadToHead a={top[0]} b={top[1]} />
      <div className="detail__sectionlabel">후보별 득표율</div>
      <div className="cands">
        {top.map((c) => (
          <div key={c.name + c.partyId} className={'cand' + (c.isWinner ? ' cand--win' : '') + (highlightName && c.name === highlightName ? ' cand--hl' : '')}>
            <div className="cand__row">
              <span className="cand__rank">{c.rank}</span>
              <PartyDot pid={c.partyId} size={11} />
              <span className="cand__name">{c.name}</span>
              <span className="cand__party">{pname(c)}</span>
              {c.isWinner && <span className="cand__badge">당선</span>}
              <span className="cand__share">{pct(c.share)}</span>
            </div>
            <div className="cand__track"><div className="cand__fill" style={{ width: (c.share / maxShare * 100) + '%', background: party(c.partyId).color }} /></div>
            <div className="cand__votes">{fmt(c.votes)}표</div>
          </div>
        ))}
      </div>
      {contest.split && (<>
        <div className="detail__sectionlabel">사전투표 vs 본투표</div>
        <PreDayCompare split={contest.split} candidates={top} scope={contest.splitScope} />
      </>)}
      {hint && <p className="hint" style={{ marginTop: 18 }}>{hint}</p>}
    </div>
  );
}

/* ============================== 전국 요약 패널 ============================== */
function NationalSummary() {
  const s = DATA.summary;
  const order = ['minju', 'power', 'jokuk', 'reform', 'jinbo', 'indep'];
  const segs = order.filter((p) => s.govByParty[p]);
  const sp = s.split;
  let natRows = null, preT = 0, dayT = 0;
  if (sp && (sp.pre.total || sp.day.total)) {
    preT = sp.pre.total; dayT = sp.day.total;
    const pids = Array.from(new Set([...Object.keys(sp.pre.byParty), ...Object.keys(sp.day.byParty)]));
    natRows = pids.map((pid) => ({ partyId: pid, name: party(pid).name, ps: preT ? (sp.pre.byParty[pid] || 0) / preT : 0, ds: dayT ? (sp.day.byParty[pid] || 0) / dayT : 0 }))
      .sort((a, b) => (b.ps + b.ds) - (a.ps + a.ds));
  }
  const all = preT + dayT || 1;
  const Bar = ({ k }) => (
    <div className="pdc__bar">
      {natRows.filter((r) => r[k] > 0.006).map((r) => (
        <div key={r.partyId} className="pdc__seg" style={{ width: (r[k] * 100) + '%', background: party(r.partyId).color }}>
          {r[k] >= 0.13 && <span>{pct(r[k], 0)}</span>}
        </div>
      ))}
    </div>
  );
  const swings = natRows ? natRows.filter((r) => Math.max(r.ps, r.ds) >= 0.02).slice(0, 5) : [];
  return (
    <div className="detail">
      <div className="detail__head"><div><div className="detail__type">전국 집계<span className="real-badge">실데이터</span></div><h2 className="detail__title">시·도지사 {s.govTotal}곳</h2><div className="detail__parent">제9회 전국동시지방선거 · 2026.06.03</div></div></div>
      <div className="summarybar">
        {segs.map((p) => <div key={p} className="summarybar__seg" style={{ flex: s.govByParty[p], background: party(p).color }}><span>{party(p).short} {s.govByParty[p]}</span></div>)}
      </div>
      <div className="summary__cards">
        {segs.map((p) => (<div key={p} className="summary__card"><PartyDot pid={p} size={12} /><div><div className="summary__n">{s.govByParty[p]}곳</div><div className="summary__p">{party(p).name}</div></div></div>))}
      </div>
      {natRows && (<>
        <div className="detail__sectionlabel">전국 사전투표 vs 본투표 · 정당별</div>
        <div className="pdc">
          <div className="pdc__rowlabel"><span>사전투표</span><span>{fmt(preT)}표 ({pct(preT / all, 0)})</span></div>
          <Bar k="ps" />
          <div className="pdc__rowlabel"><span>본투표(선거일)</span><span>{fmt(dayT)}표 ({pct(dayT / all, 0)})</span></div>
          <Bar k="ds" />
          <div className="pdc__swings">
            {swings.map((r) => {
              const d = r.ds - r.ps; const dir = d >= 0 ? 'up' : 'down';
              return (
                <div key={r.partyId} className="pdc__swing">
                  <span className="pdc__sname"><PartyDot pid={r.partyId} size={10} />{r.name}</span>
                  <span className="pdc__nums">
                    <span className="muted">사전 {pct(r.ps)}</span>
                    <span className="pdc__arrow">→</span>
                    <span>본투표 {pct(r.ds)}</span>
                    <span className={'pdc__delta pdc__delta--' + dir}>{d >= 0 ? '▲' : '▼'}{pct(Math.abs(d))}p</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>)}
      <p className="hint">지도에서 <b>시·도</b>를 클릭하면 <b>시·군·구 → 읍·면·동</b>까지 단계별로 파고들 수 있습니다. 위 검색창에서 후보·지역·읍면동을 바로 찾을 수도 있어요.</p>
    </div>
  );
}

/* ============================== 서울 구청장 요약 패널 ============================== */
function GuSummary() {
  const g = DATA.gu;
  if (!g) return null;
  const s = g.summary;
  const order = ['minju', 'power', 'jokuk', 'reform', 'jinbo', 'indep'];
  const segs = order.filter((p) => s.byParty[p]);
  return (
    <div className="detail">
      <div className="detail__head"><div><div className="detail__type">서울 구청장<span className="real-badge">실데이터</span></div><h2 className="detail__title">자치구 {s.total}곳</h2><div className="detail__parent">제9회 전국동시지방선거 · 2026.06.03</div></div></div>
      <div className="summarybar">
        {segs.map((p) => <div key={p} className="summarybar__seg" style={{ flex: s.byParty[p], background: party(p).color }}><span>{party(p).short} {s.byParty[p]}</span></div>)}
      </div>
      <div className="summary__cards">
        {segs.map((p) => (<div key={p} className="summary__card"><PartyDot pid={p} size={12} /><div><div className="summary__n">{s.byParty[p]}곳</div><div className="summary__p">{party(p).name}</div></div></div>))}
      </div>
      <p className="hint">지도에서 <b>자치구</b>를 클릭하면 <b>읍·면·동</b>별 구청장 개표까지 파고들 수 있습니다. 위 검색창에서 구청장 후보·자치구·읍면동을 바로 찾을 수도 있어요.</p>
    </div>
  );
}

/* ============================== 시·군·구의장 전국 요약 패널 ============================== */
function GukSummary() {
  const g = DATA.guk;
  if (!g) return null;
  const s = g.summary;
  const order = ['minju', 'power', 'jokuk', 'reform', 'jinbo', 'indep'];
  const segs = order.filter((p) => s.byParty[p]);
  const sp = s.split;
  let natRows = null, preT = 0, dayT = 0;
  if (sp && (sp.pre.total || sp.day.total)) {
    preT = sp.pre.total; dayT = sp.day.total;
    const pids = Array.from(new Set([...Object.keys(sp.pre.byParty), ...Object.keys(sp.day.byParty)]));
    natRows = pids.map((pid) => ({ partyId: pid, name: party(pid).name, ps: preT ? (sp.pre.byParty[pid] || 0) / preT : 0, ds: dayT ? (sp.day.byParty[pid] || 0) / dayT : 0 }))
      .sort((a, b) => (b.ps + b.ds) - (a.ps + a.ds));
  }
  const all = preT + dayT || 1;
  const Bar = ({ k }) => (
    <div className="pdc__bar">
      {natRows.filter((r) => r[k] > 0.006).map((r) => (
        <div key={r.partyId} className="pdc__seg" style={{ width: (r[k] * 100) + '%', background: party(r.partyId).color }}>
          {r[k] >= 0.13 && <span>{pct(r[k], 0)}</span>}
        </div>
      ))}
    </div>
  );
  const swings = natRows ? natRows.filter((r) => Math.max(r.ps, r.ds) >= 0.02).slice(0, 5) : [];
  return (
    <div className="detail">
      <div className="detail__head"><div><div className="detail__type">전국 집계<span className="real-badge">실데이터</span></div><h2 className="detail__title">시·군·구의장 {s.total}곳</h2><div className="detail__parent">제9회 전국동시지방선거 · 2026.06.03</div></div></div>
      <div className="summarybar">
        {segs.map((p) => <div key={p} className="summarybar__seg" style={{ flex: s.byParty[p], background: party(p).color }}><span>{party(p).short} {s.byParty[p]}</span></div>)}
      </div>
      <div className="summary__cards">
        {segs.map((p) => (<div key={p} className="summary__card"><PartyDot pid={p} size={12} /><div><div className="summary__n">{s.byParty[p]}곳</div><div className="summary__p">{party(p).name}</div></div></div>))}
      </div>
      {natRows && (<>
        <div className="detail__sectionlabel">전국 사전투표 vs 본투표 · 정당별</div>
        <div className="pdc">
          <div className="pdc__rowlabel"><span>사전투표</span><span>{fmt(preT)}표 ({pct(preT / all, 0)})</span></div>
          <Bar k="ps" />
          <div className="pdc__rowlabel"><span>본투표(선거일)</span><span>{fmt(dayT)}표 ({pct(dayT / all, 0)})</span></div>
          <Bar k="ds" />
          <div className="pdc__swings">
            {swings.map((r) => { const d = r.ds - r.ps; const dir = d >= 0 ? 'up' : 'down';
              return (<div key={r.partyId} className="pdc__swing"><span className="pdc__sname"><PartyDot pid={r.partyId} size={10} />{r.name}</span><span className="pdc__nums"><span className="muted">사전 {pct(r.ps)}</span><span className="pdc__arrow">→</span><span>본투표 {pct(r.ds)}</span><span className={'pdc__delta pdc__delta--' + dir}>{d >= 0 ? '▲' : '▼'}{pct(Math.abs(d))}p</span></span></div>);
            })}
          </div>
        </div>
      </>)}
      <p className="hint">전국 지도는 <b>시·도별</b>로 가장 많이 1위한 정당 색을 칠했습니다. <b>시·도</b>를 클릭하면 그 안의 <b>선거구 → 읍·면·동</b>까지 들어갈 수 있어요. 검색창에서 후보·선거구도 찾을 수 있습니다.</p>
    </div>
  );
}

window.UI = { SearchBar, RegionMap, Legend, Detail, NationalSummary, GuSummary, GukSummary, PartyDot, pathCenter, transformPath };
