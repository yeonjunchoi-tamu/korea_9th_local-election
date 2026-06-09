/* ============================================================================
   2026 제9회 전국동시지방선거 — 시·도지사 개표 지도 · 데이터 레이어
   ----------------------------------------------------------------------------
   ✅ 전부 실데이터: 중앙선관위 시·도지사 선거 읍·면·동별 엑셀(window.VOTES)을
      그대로 집계했습니다.  광역(시·도) → 시·군·구 → 읍·면·동 3단계.
   · 광주광역시 + 전라남도 = 전남·광주통합특별시(코드 49)로 통합.
   · 세종특별자치시는 시·군·구가 없어 시 → 읍·면·동 2단계.
   · 행정구역 경계는 행정안전부 행정동 경계(2026.04.01) → window.NATION_GEO.
   ========================================================================== */

/* ---- 정당 (공식색 기반, 다크 가독성에 맞게 조정) ------------------------- */
const PARTIES = {
  minju:   { id: 'minju',   name: '더불어민주당', short: '민주', color: '#3b74e8', textOn: '#fff' },
  power:   { id: 'power',   name: '국민의힘',     short: '국힘', color: '#e6505f', textOn: '#fff' },
  jokuk:   { id: 'jokuk',   name: '조국혁신당',   short: '조국', color: '#19b6c7', textOn: '#04222a' },
  reform:  { id: 'reform',  name: '개혁신당',     short: '개혁', color: '#f2913c', textOn: '#2a1700' },
  jinbo:   { id: 'jinbo',   name: '진보당',       short: '진보', color: '#d8519a', textOn: '#fff' },
  green:   { id: 'green',   name: '녹색당',       short: '녹색', color: '#49b06d', textOn: '#04220f' },
  women:   { id: 'women',   name: '여성의당',     short: '여성', color: '#b46bd6', textOn: '#fff' },
  jeongui: { id: 'jeongui', name: '정의당',       short: '정의', color: '#e4b53b', textOn: '#241a00' },
  unity:   { id: 'unity',   name: '국민연합',     short: '국연', color: '#7a8aa0', textOn: '#fff' },
  indep:   { id: 'indep',   name: '무소속',       short: '무소속', color: '#8b96a3', textOn: '#0b0f14' },
};
function party(id) { return PARTIES[id] || PARTIES.indep; }
const PARTY_BY_NAME = {
  '더불어민주당': 'minju', '국민의힘': 'power', '조국혁신당': 'jokuk', '개혁신당': 'reform',
  '진보당': 'jinbo', '녹색당': 'green', '여성의당': 'women', '정의당': 'jeongui',
  '국민연합': 'unity', '무소속': 'indep',
};
function partyByName(n) { return PARTY_BY_NAME[(n || '').trim()] || 'indep'; }

/* ---- 사전투표 / 본투표 분해 누적기 -------------------------------------- */
function emptyAcc() { return { pre: {}, day: {}, preTot: 0, dayTot: 0 }; }
function addArr(acc, side, cands, arr) {
  if (!arr) return;
  const totKey = side === 'pre' ? 'preTot' : 'dayTot';
  arr.forEach((v, i) => { const nm = cands[i] && cands[i].name; if (nm == null) return; acc[side][nm] = (acc[side][nm] || 0) + v; acc[totKey] += v; });
}
function mergeAcc(dst, src) {
  for (const nm in src.pre) dst.pre[nm] = (dst.pre[nm] || 0) + src.pre[nm];
  for (const nm in src.day) dst.day[nm] = (dst.day[nm] || 0) + src.day[nm];
  dst.preTot += src.preTot; dst.dayTot += src.dayTot;
}
function accToSplit(acc) {
  if (!acc.preTot && !acc.dayTot) return null;
  return { pre: { total: acc.preTot, byName: acc.pre }, day: { total: acc.dayTot, byName: acc.day } };
}

/* ---- 행정동명 정규화 키 (선관위 ↔ 행정동경계 매칭) ----------------------- */
const nkA = (s) => (s || '').replace(/[·.,\s]/g, '').replace(/출장소$/, '');
const nkB = (s) => (s || '').replace(/제(?=\d)/g, '').replace(/[·.,\s]/g, '').replace(/출장소$/, '');

/* ============================================================================
   득표 정렬 + 선거구 결과 객체
   ========================================================================== */
function rankCands(rawCands) {
  const valid = rawCands.reduce((s, c) => s + (c.votes || 0), 0);
  return rawCands
    .map((c) => ({ name: c.name, partyId: partyByName(c.party), partyName: c.party, votes: c.votes || 0 }))
    .sort((a, b) => b.votes - a.votes)
    .map((c, i) => ({ ...c, rank: i + 1, isWinner: i === 0, share: valid ? c.votes / valid : 0 }));
}
function mkContest(key, typeLabel, regionName, parentName, raw, extra) {
  const candidates = rankCands(raw.cands);
  const validVotes = candidates.reduce((s, c) => s + c.votes, 0);
  const margin = candidates.length > 1 ? candidates[0].votes - candidates[1].votes : candidates[0].votes;
  const marginPct = candidates.length > 1 ? candidates[0].share - candidates[1].share : 1;
  return {
    key, type: 'governor', typeLabel, regionName, parentName,
    electorate: raw.electorate, totalVotes: raw.voters, validVotes,
    turnout: raw.electorate ? raw.voters / raw.electorate : 0,
    candidates, winnerPartyId: candidates[0].partyId, margin, marginPct, real: true, ...extra,
  };
}

/* ============================================================================
   전체 데이터 빌드
   ========================================================================== */
function buildDataset() {
  const V = window.VOTES || {};
  const NG = window.NATION_GEO || {};
  const byKey = {};
  const searchIndex = [];
  const sidoList = [];   // {id, name, contestKey}

  Object.keys(V).forEach((id) => {
    const sido = V[id];
    const geo = NG[id] || null;
    // 행정동 경계 인덱스 (정규화 키 → geo dong)
    const gidx = {};
    if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));

    const sidoContest = mkContest('sido-' + id, '광역단체장', sido.name, '대한민국',
      sido, { sidoId: id, level: 'sido', single: !!sido.single, vb: geo ? geo.vb : null });
    sidoContest.sigungu = [];
    byKey[sidoContest.key] = sidoContest;
    const sidoAcc = emptyAcc();
    sidoList.push({ id, name: sido.name, contestKey: sidoContest.key });
    searchIndex.push({ kind: 'region', label: sido.name, sub: '광역단체장 · 시·도', level: 'sido', sidoId: id, contestKey: sidoContest.key });
    sidoContest.candidates.forEach((c) =>
      searchIndex.push({ kind: 'candidate', label: c.name, sub: (c.partyName || party(c.partyId).name) + ' · ' + sido.name + ' 시·도지사', sidoId: id, contestKey: sidoContest.key, candName: c.name }));

    sido.sigungu.forEach((sg, sgi) => {
      const isSingle = !!sido.single;
      const sgContest = mkContest('sg-' + id + '-' + sgi,
        isSingle ? '광역단체장' : '시·군·구 집계',
        isSingle ? sido.name : sido.name + ' ' + sg.name,
        sido.name, sg, { sidoId: id, sgIndex: sgi, sggName: sg.name, level: 'sigungu' });
      sgContest.dongs = [];
      const sgAcc = emptyAcc();
      // 시·군·구 라벨/줌 좌표
      const ggsg = geo && geo.sgg[sg.name];
      sgContest.geo = ggsg ? { cx: ggsg.cx, cy: ggsg.cy, bbox: ggsg.bbox.slice() } : null;
      // 읍·면·동 경계: 같은 시·군·구 안에서 먼저 매칭(동명 중복 충돌 방지) → 없으면 시·도 전체 폴백
      const lidx = {};
      if (ggsg) ggsg.dongs.forEach((gd) => { lidx[nkA(gd.nm)] = gd; lidx[nkB(gd.nm)] = gd; });
      byKey[sgContest.key] = sgContest;
      if (!isSingle)
        searchIndex.push({ kind: 'region', label: sido.name + ' ' + sg.name, sub: '시·군·구', level: 'sigungu', sidoId: id, sgIndex: sgi, contestKey: sgContest.key });

      // 매칭 안 된 동들로 bbox 보정용
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, hasGeo = false;

      sg.dongs.forEach((d, di) => {
        const dc = mkContest('dong-' + id + '-' + sgi + '-' + di, '읍·면·동 개표',
          (isSingle ? sido.name : sido.name + ' ' + sg.name) + ' ' + d.name,
          isSingle ? sido.name : sido.name + ' ' + sg.name,
          d, { sidoId: id, sgIndex: sgi, dongIndex: di, dongName: d.name, sggName: sg.name, level: 'dong' });
        const gd = lidx[nkA(d.name)] || lidx[nkB(d.name)] || gidx[nkA(d.name)] || gidx[nkB(d.name)];
        dc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
        // 사전/본투표 분해 (읍·면·동은 관내사전 + 선거일)
        const dAcc = emptyAcc();
        addArr(dAcc, 'pre', d.cands, d.pre);
        addArr(dAcc, 'day', d.cands, d.day);
        dc.split = accToSplit(dAcc);
        dc.splitScope = 'dong';
        mergeAcc(sgAcc, dAcc);
        if (gd) {
          hasGeo = true;
          // refine sigungu bbox from member dongs (handles renamed 시군구)
          if (gd.cx < bx0) bx0 = gd.cx; if (gd.cx > bx1) bx1 = gd.cx;
          if (gd.cy < by0) by0 = gd.cy; if (gd.cy > by1) by1 = gd.cy;
        }
        sgContest.dongs.push(dc);
        byKey[dc.key] = dc;
        searchIndex.push({ kind: 'dong', label: (isSingle ? sido.name : sg.name) + ' ' + d.name, sub: '읍·면·동 개표 · ' + sido.name, level: 'dong', sidoId: id, sgIndex: sgi, dongIndex: di, contestKey: dc.key });
      });

      // geo centroid/bbox 폴백 (시·군·구명이 경계 데이터와 다를 때)
      if (!sgContest.geo && hasGeo && bx1 > bx0) {
        const pad = Math.max((bx1 - bx0), (by1 - by0)) * 0.25 + 4;
        sgContest.geo = { cx: +((bx0 + bx1) / 2).toFixed(1), cy: +((by0 + by1) / 2).toFixed(1),
          bbox: [+(bx0 - pad).toFixed(1), +(by0 - pad).toFixed(1), +(bx1 + pad).toFixed(1), +(by1 + pad).toFixed(1)] };
      }
      sidoContest.sigungu.push(sgContest);
      // 시·군·구 사전투표에 관외사전·거소·선상투표합산(구역 단위) 더하기
      addArr(sgAcc, 'pre', sg.cands, sg.prx);
      sgContest.split = accToSplit(sgAcc);
      sgContest.splitScope = 'full';
      mergeAcc(sidoAcc, sgAcc);
    });
    sidoContest.split = accToSplit(sidoAcc);
    sidoContest.splitScope = 'full';
  });

  // 전국 집계 (16개 시·도 당선 정당)
  const counts = {};
  sidoList.forEach((s) => { const c = byKey[s.contestKey]; counts[c.winnerPartyId] = (counts[c.winnerPartyId] || 0) + 1; });
  const summary = { govByParty: counts, govTotal: sidoList.length };

  // 전국 사전투표 vs 본투표 — 정당별 합산
  const natPre = {}, natDay = {}; let natPreT = 0, natDayT = 0;
  sidoList.forEach((s) => {
    const c = byKey[s.contestKey]; if (!c.split) return;
    const pmap = {}; c.candidates.forEach((cd) => { pmap[cd.name] = cd.partyId; });
    for (const nm in c.split.pre.byName) { const pid = pmap[nm] || 'indep'; const v = c.split.pre.byName[nm]; natPre[pid] = (natPre[pid] || 0) + v; natPreT += v; }
    for (const nm in c.split.day.byName) { const pid = pmap[nm] || 'indep'; const v = c.split.day.byName[nm]; natDay[pid] = (natDay[pid] || 0) + v; natDayT += v; }
  });
  summary.split = { pre: { total: natPreT, byParty: natPre }, day: { total: natDayT, byParty: natDay } };

  return { PARTIES, byKey, searchIndex, sidoList, summary };
}

const DATA = buildDataset();

/* ============================================================================
   시·군·구의장(구청장) 데이터 — 서울 (window.VOTES_GU)
   서울특별시 → 자치구(구청장 선거) → 읍·면·동 2단계.
   ========================================================================== */
function buildGuDataset() {
  const VG = window.VOTES_GU;
  if (!VG || !VG['11']) return null;
  const seoul = VG['11'];
  const NG = window.NATION_GEO || {};
  const geo = NG['11'] || null;
  const gidx = {};
  if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));

  const byKey = {};
  const searchIndex = [];
  const guList = [];

  seoul.gu.forEach((g, gi) => {
    const guContest = mkContest('gu-' + gi, '구청장', '서울특별시 ' + g.name, '서울특별시 구청장',
      g, { guIndex: gi, guName: g.name, level: 'gu' });
    guContest.dongs = [];
    const ggsg = geo && geo.sgg[g.name];
    guContest.geo = ggsg ? { cx: ggsg.cx, cy: ggsg.cy, bbox: ggsg.bbox.slice() } : null;
    const guAcc = emptyAcc();
    byKey[guContest.key] = guContest;
    guList.push({ guIndex: gi, name: g.name, contestKey: guContest.key });
    searchIndex.push({ kind: 'region', label: '서울 ' + g.name, sub: '구청장 · 자치구', level: 'gu', guIndex: gi, contestKey: guContest.key });
    guContest.candidates.forEach((c) =>
      searchIndex.push({ kind: 'candidate', label: c.name, sub: (c.partyName || party(c.partyId).name) + ' · ' + g.name + ' 구청장', guIndex: gi, contestKey: guContest.key, candName: c.name }));

    g.dongs.forEach((d, di) => {
      const dc = mkContest('gudong-' + gi + '-' + di, '읍·면·동 개표',
        '서울특별시 ' + g.name + ' ' + d.name, '서울특별시 ' + g.name,
        d, { guIndex: gi, dongIndex: di, dongName: d.name, guName: g.name, level: 'gudong' });
      const gd = gidx[nkA(d.name)] || gidx[nkB(d.name)];
      dc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
      const dAcc = emptyAcc();
      addArr(dAcc, 'pre', d.cands, d.pre);
      addArr(dAcc, 'day', d.cands, d.day);
      dc.split = accToSplit(dAcc);
      dc.splitScope = 'dong';
      mergeAcc(guAcc, dAcc);
      guContest.dongs.push(dc);
      byKey[dc.key] = dc;
      searchIndex.push({ kind: 'dong', label: g.name + ' ' + d.name, sub: '읍·면·동 개표 · 서울 구청장', level: 'gudong', guIndex: gi, dongIndex: di, contestKey: dc.key });
    });

    addArr(guAcc, 'pre', g.cands, g.prx);
    guContest.split = accToSplit(guAcc);
    guContest.splitScope = 'full';
  });

  const counts = {};
  guList.forEach((g) => { const c = byKey[g.contestKey]; counts[c.winnerPartyId] = (counts[c.winnerPartyId] || 0) + 1; });
  const summary = { sidoName: seoul.name, byParty: counts, total: guList.length };

  return { byKey, searchIndex, guList, summary, seoulVb: geo ? geo.vb : [1000, 819] };
}

DATA.gu = buildGuDataset();

/* ============================================================================
   시·군·구의장(구청장·시장·군수) — 전국 (window.VOTES_GUK)
   전국 시·도 → 선거구(시·군·구의장) → 읍·면·동 3단계.
   · 큰 시(용인·성남·수원·창원…)는 행정구를 하나의 시장 선거구로 통합.
   · 전국 지도는 각 선거구별로 색을 칠한다(시·도 단색이 아니라 선거구 모자이크).
   · 무투표 선거구(광주 서구·남구, 경기 시흥시)는 당선 정당색으로 채운다.
   ========================================================================== */
function bboxOf(d) {
  const n = d.match(/-?[\d.]+/g); if (!n) return null;
  let a = 1e9, b = 1e9, c = -1e9, e = -1e9;
  for (let i = 0; i < n.length; i += 2) { const x = +n[i], y = +n[i + 1]; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y; }
  return [a, b, c, e];
}
const medOf = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function buildGukDataset() {
  const VG = window.VOTES_GUK;
  if (!VG) return null;
  const NG = window.NATION_GEO || {};
  const KG = window.KOREA_GEO;
  const byKey = {};
  const searchIndex = [];
  const sidoList = [];
  const natBox = {};
  if (KG) KG.sido.forEach((s) => { natBox[s.id] = bboxOf(s.path); });
  // 전국 라벨 미세 보정(전국 viewBox 좌표)
  const LABEL_NUDGE = { '41': [6, 20], '28': [-10, -8], '11': [0, -2], '49': [4, 8], '47': [44, -60], '42': [10, 0] };

  Object.keys(VG).forEach((code) => {
    const sido = VG[code];
    const geo = NG[code] || null;
    const gidx = {};
    if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));
    // 시·군·구별 로컬 인덱스(동명 중복 충돌 방지) 캐시
    const lidxCache = {};
    const localIdx = (sn) => { if (lidxCache[sn]) return lidxCache[sn]; const idx = {}; const gg = geo && geo.sgg[sn]; if (gg) gg.dongs.forEach((d) => { idx[nkA(d.nm)] = d; idx[nkB(d.nm)] = d; }); return lidxCache[sn] = idx; };

    let la = 1e9, lb = 1e9, lc = -1e9, ld = -1e9; // sido 로컬 콘텐츠 bbox
    const sidoEntry = { id: code, name: sido.name, vb: geo ? geo.vb : [1000, 1000], districts: [], natT: null, labelPos: null };
    sidoList.push(sidoEntry);

    sido.sigungu.forEach((sg, si) => {
      const key = 'guk-' + code + '-' + si;
      const dist = mkContest(key, '시·군·구의장', sido.name + ' ' + sg.name, sido.name,
        { electorate: sg.electorate, voters: sg.voters, cands: sg.cands },
        { sidoId: code, sgIndex: si, sggName: sg.name, level: 'district', novote: !!sg.novote });
      dist.dongs = []; dist.member = sg.sgg; dist.dongGeos = []; dist.geo = null;
      byKey[key] = dist;
      sidoEntry.districts.push(dist);
      searchIndex.push({ kind: 'region', label: sido.name + ' ' + sg.name, sub: '시·군·구의장 선거구', level: 'district', sidoId: code, sgIndex: si, contestKey: key });
      dist.candidates.forEach((c) => searchIndex.push({ kind: 'candidate', label: c.name, sub: (c.partyName || party(c.partyId).name) + ' · ' + sg.name + (sg.novote ? ' (무투표 당선)' : ' 의장'), sidoId: code, sgIndex: si, contestKey: key, candName: c.name }));

      let dx0 = 1e9, dy0 = 1e9, dx1 = -1e9, dy1 = -1e9, hasGeo = false;
      const incBB = (bb) => { if (!bb) return; if (bb[0] < dx0) dx0 = bb[0]; if (bb[1] < dy0) dy0 = bb[1]; if (bb[2] > dx1) dx1 = bb[2]; if (bb[3] > dy1) dy1 = bb[3]; };

      if (sg.novote) {
        // 무투표: 지오는 멤버 sgg 의 행정동을 그대로 사용(당선정당색으로 채움)
        (sg.sgg || []).forEach((sn) => {
          const gg = geo && geo.sgg[sn];
          if (gg) gg.dongs.forEach((d) => { dist.dongGeos.push({ d: d.d, cx: d.cx, cy: d.cy }); incBB(bboxOf(d.d)); hasGeo = true; });
        });
        dist.split = null; dist.splitScope = 'full';
      } else {
        const distAcc = emptyAcc();
        (sg.dongs || []).forEach((d, di) => {
          const dKey = 'gukdong-' + code + '-' + si + '-' + di;
          const dc = mkContest(dKey, '읍·면·동 개표', sido.name + ' ' + sg.name + ' ' + d.name, sido.name + ' ' + sg.name,
            { electorate: d.electorate, voters: d.voters, cands: d.cands },
            { sidoId: code, sgIndex: si, dongIndex: di, dongName: d.name, sggName: sg.name, level: 'gukdong' });
          const gd = (localIdx(d.sgg)[nkA(d.name)] || localIdx(d.sgg)[nkB(d.name)]) || gidx[nkA(d.name)] || gidx[nkB(d.name)];
          dc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
          const dAcc = emptyAcc(); addArr(dAcc, 'pre', d.cands, d.pre); addArr(dAcc, 'day', d.cands, d.day);
          dc.split = accToSplit(dAcc); dc.splitScope = 'dong';
          mergeAcc(distAcc, dAcc);
          if (gd) { hasGeo = true; incBB(bboxOf(gd.d)); dist.dongGeos.push({ d: gd.d, cx: gd.cx, cy: gd.cy }); }
          dist.dongs.push(dc); byKey[dKey] = dc;
          searchIndex.push({ kind: 'dong', label: sg.name + ' ' + d.name, sub: '읍·면·동 개표 · ' + sido.name, level: 'gukdong', sidoId: code, sgIndex: si, dongIndex: di, contestKey: dKey });
        });
        addArr(distAcc, 'pre', sg.cands, sg.prx);
        dist.split = accToSplit(distAcc); dist.splitScope = 'full';
      }
      if (hasGeo) {
        const pad = Math.max(dx1 - dx0, dy1 - dy0) * 0.05 + 4;
        const cxs = dist.dongGeos.map((g) => g.cx), cys = dist.dongGeos.map((g) => g.cy);
        dist.geo = { cx: +medOf(cxs).toFixed(1), cy: +medOf(cys).toFixed(1),
          bbox: [+(dx0 - pad).toFixed(1), +(dy0 - pad).toFixed(1), +(dx1 + pad).toFixed(1), +(dy1 + pad).toFixed(1)] };
      }
      // 라벨 위치: 시·도지사 지도와 동일 기준(행정동경계 geo.sgg 중심) 사용해 통일
      const memCs = (sg.sgg || []).map((sn) => geo && geo.sgg[sn]).filter(Boolean);
      if (memCs.length) dist.labelPt = { cx: +(memCs.reduce((s, g) => s + g.cx, 0) / memCs.length).toFixed(1), cy: +(memCs.reduce((s, g) => s + g.cy, 0) / memCs.length).toFixed(1) };
    });

    // 전국 변환용 시·도 로컬 bbox — 본토 군집만으로 산출.
    // 울릉도·독도(경북)·백령도(인천)·신안 섬(전남)처럼 멀리 떨어진 섬이 bbox를 부풀리면
    // 본토가 압축돼 동쪽/해안이 전국 지도에서 검게 비어 보이던 문제를 막는다.
    (function () {
      const geos = [];
      sidoEntry.districts.forEach((d) => d.dongGeos.forEach((g) => geos.push(g)));
      if (!geos.length) return;
      const mx = medOf(geos.map((g) => g.cx)), my = medOf(geos.map((g) => g.cy));
      const dists = geos.map((g) => Math.hypot(g.cx - mx, g.cy - my));
      const dsorted = [...dists].sort((a, b) => a - b);
      const medD = dsorted[Math.floor(dsorted.length / 2)] || 1;
      // 거리 정렬에서 큰 '틈'(본토↔원거리 섬)을 찾아 그 바깥은 bbox 계산에서 제외
      let keepR = dsorted[dsorted.length - 1] + 1;
      for (let i = Math.floor(dsorted.length * 0.5); i < dsorted.length - 1; i++) {
        const gap = dsorted[i + 1] - dsorted[i];
        if (gap > medD * 1.5 && gap > 60) { keepR = (dsorted[i] + dsorted[i + 1]) / 2; break; }
      }
      geos.forEach((g, i) => {
        if (dists[i] > keepR) return;
        const bb = bboxOf(g.d); if (!bb) return;
        if (bb[0] < la) la = bb[0]; if (bb[1] < lb) lb = bb[1]; if (bb[2] > lc) lc = bb[2]; if (bb[3] > ld) ld = bb[3];
      });
    })();

    // 전국 좌표 변환(시·도 로컬 → 전국 viewBox)
    const nb = natBox[code];
    if (nb && lc > la) {
      const lw = lc - la, lh = ld - lb, nw = nb[2] - nb[0], nh = nb[3] - nb[1];
      const s = Math.min(nw / lw, nh / lh);
      const tx = nb[0] + (nw - lw * s) / 2 - la * s;
      const ty = nb[1] + (nh - lh * s) / 2 - lb * s;
      sidoEntry.natT = { s, tx, ty };
      const xs = [], ys = [];
      sidoEntry.districts.forEach((dist) => dist.dongGeos.forEach((g) => { xs.push(g.cx * s + tx); ys.push(g.cy * s + ty); }));
      const nud = LABEL_NUDGE[code] || [0, 0];
      sidoEntry.labelPos = [medOf(xs) + nud[0], medOf(ys) + nud[1]];
    }
  });

  const counts = {}; let totalD = 0;
  sidoList.forEach((se) => se.districts.forEach((d) => { counts[d.winnerPartyId] = (counts[d.winnerPartyId] || 0) + 1; totalD++; }));
  const natPre = {}, natDay = {}; let natPreT = 0, natDayT = 0;
  sidoList.forEach((se) => se.districts.forEach((c) => {
    if (!c.split) return;
    const pmap = {}; c.candidates.forEach((cd) => { pmap[cd.name] = cd.partyId; });
    for (const nm in c.split.pre.byName) { const pid = pmap[nm] || 'indep'; const v = c.split.pre.byName[nm]; natPre[pid] = (natPre[pid] || 0) + v; natPreT += v; }
    for (const nm in c.split.day.byName) { const pid = pmap[nm] || 'indep'; const v = c.split.day.byName[nm]; natDay[pid] = (natDay[pid] || 0) + v; natDayT += v; }
  }));
  const summary = { byParty: counts, total: totalD, split: { pre: { total: natPreT, byParty: natPre }, day: { total: natDayT, byParty: natDay } } };

  return { byKey, searchIndex, sidoList, summary, natViewBox: (KG ? KG.viewBox : [1000, 938]) };
}

DATA.guk = buildGukDataset();

window.DATA = DATA;
window.PARTIES = PARTIES;
window.party = party;
window.fmt = (n) => (n == null ? '–' : n.toLocaleString('ko-KR'));
window.pct = (x, d = 1) => (x == null ? '–' : (x * 100).toFixed(d) + '%');
