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
  jayu:    { id: 'jayu',    name: '자유와혁신',   short: '자혁', color: '#7b6cd6', textOn: '#fff' },
  gibon:   { id: 'gibon',   name: '기본소득당',   short: '기본', color: '#2fb6a8', textOn: '#04231f' },
  saemirae:{ id: 'saemirae',name: '새미래민주당', short: '새미래', color: '#4aa3c4', textOn: '#06222b' },
  saemin:  { id: 'saemin',  name: '사회민주당',   short: '사민', color: '#8a7fb5', textOn: '#fff' },
  jayutong:{ id: 'jayutong',name: '자유통일당',   short: '자통', color: '#b9603f', textOn: '#fff' },
  geoji:   { id: 'geoji',   name: '거지당',       short: '거지', color: '#8a9a3a', textOn: '#0c1500' },
  hannara: { id: 'hannara', name: '한나라당',     short: '한나라', color: '#6f93c4', textOn: '#fff' },
  gonghwa: { id: 'gonghwa', name: '공화당',       short: '공화', color: '#b05a52', textOn: '#fff' },
  daetong: { id: 'daetong', name: '국민대통합당', short: '대통합', color: '#6aa2a6', textOn: '#04231f' },
  daehan:  { id: 'daehan',  name: '대한국민당',   short: '대한', color: '#9d7b54', textOn: '#fff' },
  dokrip:  { id: 'dokrip',  name: '한국독립당',   short: '독립', color: '#7c8a57', textOn: '#0c1500' },
  chinmi:  { id: 'chinmi',  name: '친미연합',     short: '친미', color: '#9a86b0', textOn: '#fff' },
  etc:     { id: 'etc',     name: '기타 정당',     short: '기타', color: '#5f6b7d', textOn: '#fff' },
  indep:   { id: 'indep',   name: '무소속',       short: '무소속', color: '#8b96a3', textOn: '#0b0f14' },
  /* ── 교육감 후보 성향(정당 무관 — 정당색과 겹치지 않는 뉴트럴 계열) ── */
  edu_jinbo:  { id: 'edu_jinbo',  name: '진보 성향', short: '진보', color: '#34c0b0', textOn: '#04231f', tendency: true },
  edu_bosu:   { id: 'edu_bosu',   name: '보수 성향', short: '보수', color: '#e87bb0', textOn: '#33041c', tendency: true },
  edu_jungdo: { id: 'edu_jungdo', name: '중도 성향', short: '중도', color: '#a8c75a', textOn: '#1d2400', tendency: true },
};
const EDU_TENDENCY_BY_NAME = { '진보': 'edu_jinbo', '보수': 'edu_bosu', '중도': 'edu_jungdo' };
function eduTendency(n) { return EDU_TENDENCY_BY_NAME[(n || '').trim()] || 'edu_jungdo'; }
function party(id) { return PARTIES[id] || PARTIES.indep; }
const PARTY_BY_NAME = {
  '더불어민주당': 'minju', '국민의힘': 'power', '조국혁신당': 'jokuk', '개혁신당': 'reform',
  '진보당': 'jinbo', '녹색당': 'green', '여성의당': 'women', '정의당': 'jeongui',
  '국민연합': 'unity', '자유와혁신': 'jayu', '기본소득당': 'gibon', '새미래민주당': 'saemirae',
  '사회민주당': 'saemin', '기타': 'etc',
  '자유통일당': 'jayutong', '거지당': 'geoji', '한나라당': 'hannara', '공화당': 'gonghwa',
  '국민대통합당': 'daetong', '대한국민당': 'daehan', '한국독립당': 'dokrip', '친미연합': 'chinmi',
  '무소속': 'indep',
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
function rankCands(rawCands, resolve) {
  const r = resolve || partyByName;
  const valid = rawCands.reduce((s, c) => s + (c.votes || 0), 0);
  return rawCands
    .map((c) => ({ name: c.name, partyId: r(c.party), partyName: c.party, votes: c.votes || 0 }))
    .sort((a, b) => b.votes - a.votes)
    .map((c, i) => ({ ...c, rank: i + 1, isWinner: i === 0, share: valid ? c.votes / valid : 0 }));
}
function mkContest(key, typeLabel, regionName, parentName, raw, extra, resolve) {
  const candidates = rankCands(raw.cands, resolve);
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

/* ============================================================================
   국회의원 재·보권선거 — 전국 (window.VOTES_NA_C · compact)
   재·보권이 치러진 선거구만 들어있다. 시·도 → 선거구 → 읍·면·동 3단계.
   컴팩트 스키마: C[code]=[sidoName, [ [distName,sggArr,elect,voters,candMeta,prx,
     [ [dongName,dongSgg,elect,voters,votesArr,preArr,dayArr],… ] ], … ] ]
   · 광주 광산구을은 코드 49(전남·광주통합 geo)로 넣어 지도·모자이크 매칭을 맞춘다.
   ========================================================================== */
function buildNaDataset() {
  const C = window.VOTES_NA_C;
  if (!C) return null;
  // compact → verbose
  const VG = {};
  Object.keys(C).forEach((code) => {
    const sn = C[code][0], dists = C[code][1];
    VG[code] = { id: code, name: sn, sigungu: dists.map((d) => {
      const dname = d[0], sgg = d[1], elec = d[2], vot = d[3], cm = d[4], prx = d[5], dongs = d[6];
      const mkC = (arr) => cm.map((m, k) => ({ party: m[0], name: m[1], votes: arr[k] || 0 }));
      return {
        name: dname, sgg, electorate: elec, voters: vot, prx,
        cands: cm.map((m, k) => ({ party: m[0], name: m[1], votes: dongs.reduce((s, dn) => s + (dn[4][k] || 0), 0) + (prx[k] || 0) })),
        dongs: dongs.map((dn) => ({ name: dn[0], sgg: dn[1], electorate: dn[2], voters: dn[3], cands: mkC(dn[4]), pre: dn[5], day: dn[6] })),
      };
    }) };
  });

  const NG = window.NATION_GEO || {};
  const KG = window.KOREA_GEO;
  const byKey = {};
  const searchIndex = [];
  const sidoList = [];

  Object.keys(VG).forEach((code) => {
    const sido = VG[code];
    const geo = NG[code] || null;
    const gidx = {};
    if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));
    const lidxCache = {};
    const localIdx = (sn) => { if (lidxCache[sn]) return lidxCache[sn]; const idx = {}; const gg = geo && geo.sgg[sn]; if (gg) gg.dongs.forEach((d) => { idx[nkA(d.nm)] = d; idx[nkB(d.nm)] = d; }); return lidxCache[sn] = idx; };

    const sidoEntry = { id: code, name: sido.name, vb: geo ? geo.vb : [1000, 1000], districts: [] };
    sidoList.push(sidoEntry);

    sido.sigungu.forEach((sg, si) => {
      const key = 'na-' + code + '-' + si;
      const dist = mkContest(key, '국회의원 재·보권', sido.name + ' ' + sg.name, sido.name,
        { electorate: sg.electorate, voters: sg.voters, cands: sg.cands },
        { sidoId: code, sgIndex: si, sggName: sg.name, level: 'nadistrict' });
      dist.dongs = []; dist.member = sg.sgg; dist.dongGeos = []; dist.geo = null;
      byKey[key] = dist;
      sidoEntry.districts.push(dist);
      searchIndex.push({ kind: 'region', label: sido.name + ' ' + sg.name, sub: '국회의원 재·보권 선거구', level: 'nadistrict', sidoId: code, sgIndex: si, contestKey: key });
      dist.candidates.forEach((c) => searchIndex.push({ kind: 'candidate', label: c.name, sub: (c.partyName || party(c.partyId).name) + ' · ' + sg.name + ' 국회의원', sidoId: code, sgIndex: si, contestKey: key, candName: c.name }));

      let dx0 = 1e9, dy0 = 1e9, dx1 = -1e9, dy1 = -1e9, hasGeo = false;
      const incBB = (bb) => { if (!bb) return; if (bb[0] < dx0) dx0 = bb[0]; if (bb[1] < dy0) dy0 = bb[1]; if (bb[2] > dx1) dx1 = bb[2]; if (bb[3] > dy1) dy1 = bb[3]; };
      const distAcc = emptyAcc();
      (sg.dongs || []).forEach((d, di) => {
        const dKey = 'nadong-' + code + '-' + si + '-' + di;
        const dc = mkContest(dKey, '읍·면·동 개표', sido.name + ' ' + sg.name + ' ' + d.name, sido.name + ' ' + sg.name,
          { electorate: d.electorate, voters: d.voters, cands: d.cands },
          { sidoId: code, sgIndex: si, dongIndex: di, dongName: d.name, sggName: sg.name, level: 'nadong' });
        const gd = (localIdx(d.sgg)[nkA(d.name)] || localIdx(d.sgg)[nkB(d.name)]) || gidx[nkA(d.name)] || gidx[nkB(d.name)];
        dc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
        const dAcc = emptyAcc(); addArr(dAcc, 'pre', d.cands, d.pre); addArr(dAcc, 'day', d.cands, d.day);
        dc.split = accToSplit(dAcc); dc.splitScope = 'dong';
        mergeAcc(distAcc, dAcc);
        if (gd) { hasGeo = true; incBB(bboxOf(gd.d)); dist.dongGeos.push({ d: gd.d, cx: gd.cx, cy: gd.cy }); }
        dist.dongs.push(dc); byKey[dKey] = dc;
        searchIndex.push({ kind: 'dong', label: sg.name + ' ' + d.name, sub: '읍·면·동 개표 · ' + sido.name, level: 'nadong', sidoId: code, sgIndex: si, dongIndex: di, contestKey: dKey });
      });
      addArr(distAcc, 'pre', sg.cands, sg.prx);
      dist.split = accToSplit(distAcc); dist.splitScope = 'full';
      if (hasGeo) {
        const pad = Math.max(dx1 - dx0, dy1 - dy0) * 0.05 + 4;
        const cxs = dist.dongGeos.map((g) => g.cx), cys = dist.dongGeos.map((g) => g.cy);
        dist.geo = { cx: +medOf(cxs).toFixed(1), cy: +medOf(cys).toFixed(1),
          bbox: [+(dx0 - pad).toFixed(1), +(dy0 - pad).toFixed(1), +(dx1 + pad).toFixed(1), +(dy1 + pad).toFixed(1)] };
      }
      const memCs = (sg.sgg || []).map((sn) => geo && geo.sgg[sn]).filter(Boolean);
      if (memCs.length) dist.labelPt = { cx: +(memCs.reduce((s, g) => s + g.cx, 0) / memCs.length).toFixed(1), cy: +(memCs.reduce((s, g) => s + g.cy, 0) / memCs.length).toFixed(1) };
    });
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
  const districtList = [];
  sidoList.forEach((se) => se.districts.forEach((d) => districtList.push({ key: d.key, sidoId: d.sidoId, sgIndex: d.sgIndex, sido: se.name, name: d.sggName,
    partyId: d.winnerPartyId, candName: d.candidates[0].name, share: d.candidates[0].share, margin: d.marginPct, turnout: d.turnout })));
  districtList.sort((a, b) => a.sido.localeCompare(b.sido, 'ko') || a.name.localeCompare(b.name, 'ko'));
  const summary = { byParty: counts, total: totalD, split: { pre: { total: natPreT, byParty: natPre }, day: { total: natDayT, byParty: natDay } }, districtList };

  return { byKey, searchIndex, sidoList, summary, natViewBox: (KG ? KG.viewBox : [1000, 938]) };
}

DATA.na = buildNaDataset();

/* ============================================================================
   교육감 선거 — 성향(진보·보수·중도) 기준 (window.VOTES_EDU)
   시·도(교육감) → 시·군·구(집계) → 읍·면·동 3단계. 후보는 정당이 아니라 성향.
   현재 서울특별시 데이터만 적재 — 나머지 시·도는 지도에서 회색.
   ========================================================================== */
function buildEduDataset() {
  const V = window.VOTES_EDU || {};
  if (!Object.keys(V).length) return null;
  const NG = window.NATION_GEO || {};
  const byKey = {};
  const searchIndex = [];
  const sidoList = [];

  Object.keys(V).forEach((id) => {
    const sido = V[id];
    const geo = NG[id] || null;
    const gidx = {};
    if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));

    // 시·도 단위 집계(시·군·구 합산) — 후보명 기준 합산.
    // 전남·광주통합(49)은 광주·전남 교육감이 별개 선거이므로 후보명으로 합치면
    // 두 지역 후보가 한 목록에 나란히 누적된다(인덱스 혼선 방지).
    const sumMap = {}, sumOrder = [];
    let sidoElect = 0, sidoVoters = 0;
    sido.sigungu.forEach((sg) => {
      if (!sg.electorate) sg.electorate = sg.dongs.reduce((a, d) => a + (d.electorate || 0), 0);
      sidoElect += sg.electorate || 0; sidoVoters += sg.voters || 0;
      sg.cands.forEach((c) => {
        if (!sumMap[c.name]) { sumMap[c.name] = { party: c.party, name: c.name, votes: 0 }; sumOrder.push(c.name); }
        sumMap[c.name].votes += c.votes || 0;
      });
    });
    const sumCands = sumOrder.map((n) => sumMap[n]);
    const sidoRaw = { electorate: sidoElect, voters: sidoVoters, cands: sumCands };

    const sidoContest = mkContest('edusido-' + id, '교육감', sido.name, '대한민국',
      sidoRaw, { sidoId: id, level: 'sido', vb: geo ? geo.vb : null }, eduTendency);
    sidoContest.sigungu = [];
    byKey[sidoContest.key] = sidoContest;
    const sidoAcc = emptyAcc();
    sidoList.push({ id, name: sido.name, contestKey: sidoContest.key });
    searchIndex.push({ kind: 'region', label: sido.name, sub: '교육감 · 시·도', level: 'sido', sidoId: id, contestKey: sidoContest.key });
    sidoContest.candidates.forEach((c) =>
      searchIndex.push({ kind: 'candidate', label: c.name, sub: party(c.partyId).name + ' · ' + sido.name + ' 교육감', sidoId: id, contestKey: sidoContest.key, candName: c.name }));

    sido.sigungu.forEach((sg, sgi) => {
      const sgContest = mkContest('edusg-' + id + '-' + sgi, '시·군·구 집계',
        sido.name + ' ' + sg.name, sido.name + ' 교육감',
        sg, { sidoId: id, sgIndex: sgi, sggName: sg.name, level: 'sigungu' }, eduTendency);
      sgContest.dongs = [];
      const sgAcc = emptyAcc();
      const ggsg = geo && geo.sgg[sg.name];
      sgContest.geo = ggsg ? { cx: ggsg.cx, cy: ggsg.cy, bbox: ggsg.bbox.slice() } : null;
      const lidx = {};
      if (ggsg) ggsg.dongs.forEach((gd) => { lidx[nkA(gd.nm)] = gd; lidx[nkB(gd.nm)] = gd; });
      byKey[sgContest.key] = sgContest;
      searchIndex.push({ kind: 'region', label: sido.name + ' ' + sg.name, sub: '교육감 · 시·군·구 집계', level: 'sigungu', sidoId: id, sgIndex: sgi, contestKey: sgContest.key });

      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, hasGeo = false;
      sg.dongs.forEach((d, di) => {
        const dc = mkContest('edudong-' + id + '-' + sgi + '-' + di, '읍·면·동 개표',
          sido.name + ' ' + sg.name + ' ' + d.name, sido.name + ' ' + sg.name,
          d, { sidoId: id, sgIndex: sgi, dongIndex: di, dongName: d.name, sggName: sg.name, level: 'dong' }, eduTendency);
        const gd = lidx[nkA(d.name)] || lidx[nkB(d.name)] || gidx[nkA(d.name)] || gidx[nkB(d.name)];
        dc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
        const dAcc = emptyAcc();
        addArr(dAcc, 'pre', d.cands, d.pre);
        addArr(dAcc, 'day', d.cands, d.day);
        dc.split = accToSplit(dAcc);
        dc.splitScope = 'dong';
        mergeAcc(sgAcc, dAcc);
        if (gd) { hasGeo = true; if (gd.cx < bx0) bx0 = gd.cx; if (gd.cx > bx1) bx1 = gd.cx; if (gd.cy < by0) by0 = gd.cy; if (gd.cy > by1) by1 = gd.cy; }
        sgContest.dongs.push(dc);
        byKey[dc.key] = dc;
        searchIndex.push({ kind: 'dong', label: sg.name + ' ' + d.name, sub: '읍·면·동 개표 · ' + sido.name + ' 교육감', level: 'dong', sidoId: id, sgIndex: sgi, dongIndex: di, contestKey: dc.key });
      });
      if (!sgContest.geo && hasGeo && bx1 > bx0) {
        const pad = Math.max((bx1 - bx0), (by1 - by0)) * 0.25 + 4;
        sgContest.geo = { cx: +((bx0 + bx1) / 2).toFixed(1), cy: +((by0 + by1) / 2).toFixed(1),
          bbox: [+(bx0 - pad).toFixed(1), +(by0 - pad).toFixed(1), +(bx1 + pad).toFixed(1), +(by1 + pad).toFixed(1)] };
      }
      sidoContest.sigungu.push(sgContest);
      addArr(sgAcc, 'pre', sg.cands, sg.prx);
      sgContest.split = accToSplit(sgAcc);
      sgContest.splitScope = 'full';
      mergeAcc(sidoAcc, sgAcc);
    });
    sidoContest.split = accToSplit(sidoAcc);
    sidoContest.splitScope = 'full';
  });

  // 전국(현재 서울) 성향 집계 + 후보 합산
  const counts = {};
  sidoList.forEach((s) => { const c = byKey[s.contestKey]; counts[c.winnerPartyId] = (counts[c.winnerPartyId] || 0) + 1; });

  // 성향별 총득표(모든 적재 시·도 합산) + 후보별 총득표
  const tendVotes = {};   // edu_jinbo/edu_bosu/edu_jungdo → 표
  const candTotals = {};  // 후보명 → {name, partyId, votes}
  let totalValid = 0;
  sidoList.forEach((s) => {
    const c = byKey[s.contestKey];
    c.candidates.forEach((cd) => {
      tendVotes[cd.partyId] = (tendVotes[cd.partyId] || 0) + cd.votes;
      candTotals[cd.name] = { name: cd.name, partyId: cd.partyId, votes: (candTotals[cd.name] ? candTotals[cd.name].votes : 0) + cd.votes };
      totalValid += cd.votes;
    });
  });
  const candList = Object.values(candTotals).sort((a, b) => b.votes - a.votes)
    .map((c) => ({ ...c, share: totalValid ? c.votes / totalValid : 0 }));

  const sidoWinners = sidoList.map((s) => {
    const c = byKey[s.contestKey];
    return { id: s.id, name: c.regionName, candName: c.candidates[0].name, partyId: c.winnerPartyId, share: c.candidates[0].share };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const summary = {
    byTendency: counts, sidoTotal: sidoList.length,
    tendVotes, totalValid, candList, sidoWinners,
    onlySido: sidoList.length === 1 ? byKey[sidoList[0].contestKey].regionName : null,
  };

  return { byKey, searchIndex, sidoList, summary };
}

DATA.edu = buildEduDataset();

/* ============================================================================
   광역의회의원(시·도의회의원) — 서울 (window.VOTES_GWANG_C)
   서울특별시 → 자치구 → 지역구 선거구 → 읍·면·동 + 자치구별 비례대표.
   · 지역구(dist): 후보(정당+이름)별 개표. 사전·본투표 분해 포함.
   · 비례(prop): 자치구 단위 정당 득표(주요 8당 + 기타). 읍·면·동 단위 득표 포함.
   ========================================================================== */
/* 무투표 당선 선거구의 행정동 구성(중앙선관위 선거구 획정 기준) — 동별 개표표가 없어 별도 명시 */
const GW_NOVOTE_DONGS = {
  '관악구제1선거구': ['보라매동', '은천동', '신림동'],
  '관악구제2선거구': ['행운동', '낙성대동', '인헌동', '남현동'],
  '관악구제3선거구': ['신사동', '조원동', '미성동', '난곡동', '난향동'],
  '부평구제5선거구': ['갈산1동', '갈산2동', '삼산1동'],
  '부평구제6선거구': ['삼산2동', '부개2동', '부개3동'],
};

/* 시·도별 비례대표 의석 배분(공식) · 의회 대수 */
const GW_PROP_SEATS = {
  '11': { minju: 7, power: 8 },
  '26': { power: 3, minju: 3 },
  '27': { power: 3, minju: 2 },
  '28': { minju: 3, power: 3 },
  '49': { minju: 8, jinbo: 1, jokuk: 2, power: 1 },
  '30': { minju: 2, power: 1 },
  '31': { power: 2, minju: 1 },
  '36': { minju: 2, power: 1 },
  '41': { minju: 11, power: 9, jokuk: 1 },
};
const GW_SIDO_TITLE = {
  '11': '제12대 서울특별시의회의원',
  '26': '제10대 부산광역시의회의원',
  '27': '제10대 대구광역시의회의원',
  '28': '제10대 인천광역시의회의원',
  '49': '제1대 전남·광주통합특별시의회의원',
  '30': '제10대 대전광역시의회의원',
  '31': '제9대 울산광역시의회의원',
  '36': '제5대 세종특별자치시의회의원',
  '41': '제12대 경기도의회의원',
};

/* 중선거구(다인) 지역구의 의원정수 — 전남·광주통합특별시는 일부 선거구에서 2~4명 선출.
   키: '코드|선거구명'. 명시되지 않은 선거구는 1인(소선거구). */
const GW_DIST_SEATS = {
  '49|남구제1선거구': 3,
  '49|북구제1선거구': 4,
  '49|북구제2선거구': 3,
  '49|광산구제3선거구': 3,
};

function buildOneSido(code) {
  const C = window.VOTES_GWANG_C;
  if (!C || !C[code]) return null;
  const seoulName = C[code][0];
  const sShort = seoulName.replace(/(특별자치시|특별자치도|특별시|광역시|특별자치|자치도)$/, '').replace(/도$/, '');
  const guRaw = C[code][1];
  const NG = window.NATION_GEO || {};
  const geo = NG[code] || null;
  const gidx = {};
  if (geo) Object.values(geo.sgg).forEach((s) => s.dongs.forEach((d) => { gidx[nkA(d.nm)] = d; gidx[nkB(d.nm)] = d; }));

  const byKey = {};
  const searchIndex = [];
  const guList = [];
  const seatByParty = {}; let totalSeats = 0;
  const propCity = {}; let propCityTotal = 0;

  guRaw.forEach((g, gi) => {
    const guName = g[0], dists = g[1], prop = g[2];
    const ggsg = geo && geo.sgg[guName];
    const lidx = {}; if (ggsg) ggsg.dongs.forEach((gd) => { lidx[nkA(gd.nm)] = gd; lidx[nkB(gd.nm)] = gd; });
    const guEntry = { guIndex: gi, name: guName, districts: [], propKey: prop ? 'gwprop-' + gi : null,
      geo: ggsg ? { cx: ggsg.cx, cy: ggsg.cy, bbox: ggsg.bbox.slice() } : null };
    guList.push(guEntry);
    searchIndex.push({ kind: 'region', label: sShort + ' ' + guName, sub: '광역의회 · 자치구', level: 'gu', guIndex: gi });

    // 무투표 당선 선거구(동별 개표표 없음) 대비 — 실제 개표가 있는 선거구가 점유한 행정동을 먼저 모으고,
    // 점유되지 않은 행정동을 무투표 선거구의 지오로 합성한다(당선 정당색으로 채움).
    const lkup = (nm) => lidx[nkA(nm)] || lidx[nkB(nm)] || gidx[nkA(nm)] || gidx[nkB(nm)];
    const claimedSet = new Set();
    dists.forEach((d) => { (d[5] || []).forEach((dn) => { const gd = lkup(dn[0]); if (gd) claimedSet.add(gd); }); });
    // 명시 매핑(GW_NOVOTE_DONGS)이 지정한 동도 점유 처리
    dists.forEach((d) => { const mp = GW_NOVOTE_DONGS[d[0]]; if (mp) mp.forEach((nm) => { const gd = lkup(nm); if (gd) claimedSet.add(gd); }); });
    const leftover = ggsg ? ggsg.dongs.filter((gd) => !claimedSet.has(gd)) : [];
    // 한 자치구에 명시 매핑이 없는 무투표 선거구가 여러 개면, 남은 동을 균등 분배(모두 당선 정당색)
    const unmappedNovote = dists.filter((d) => (d[5] || []).length === 0 && !GW_NOVOTE_DONGS[d[0]]);
    const splitMap = {};
    if (unmappedNovote.length && leftover.length) {
      const per = Math.ceil(leftover.length / unmappedNovote.length);
      unmappedNovote.forEach((d, k) => { splitMap[d[0]] = leftover.slice(k * per, (k + 1) * per); });
      // 나눗셈 나머지로 빈 묶음이 생기면 마지막 한 동이라도 배정
      unmappedNovote.forEach((d) => { if (!splitMap[d[0]] || !splitMap[d[0]].length) splitMap[d[0]] = leftover.slice(-1); });
    }
    const guDongGeos = [];

    dists.forEach((d, di) => {
      const distName = d[0], elect = d[1], voters = d[2], candMeta = d[3], prx = d[4];
      let dongRows = d[5];
      const isNovote = (dongRows.length === 0);
      if (isNovote) {
        const mapped = GW_NOVOTE_DONGS[distName];
        let gds = mapped ? mapped.map((nm) => lkup(nm)).filter(Boolean) : (splitMap[distName] || []);
        const ncand = candMeta.length;
        dongRows = gds.map((gd) => [gd.nm, 0, 0, new Array(ncand).fill(0), new Array(ncand).fill(0), new Array(ncand).fill(0)]);
      }
      const cands = candMeta.map((m, k) => ({ party: m[0], name: m[1], votes: dongRows.reduce((s, dn) => s + (dn[3][k] || 0), 0) + (prx[k] || 0) }));
      const key = 'gwdist-' + gi + '-' + di;
      const dc = mkContest(key, '광역의원 지역구', seoulName + ' ' + guName + ' ' + distName, seoulName + ' ' + guName,
        { electorate: elect, voters, cands }, { guIndex: gi, sgIndex: di, sggName: distName, guName, level: 'gwdist', novote: isNovote });
      dc.dongs = []; dc.dongGeos = [];
      const distAcc = emptyAcc();
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, hasGeo = false;
      const incBB = (bb) => { if (!bb) return; if (bb[0] < bx0) bx0 = bb[0]; if (bb[1] < by0) by0 = bb[1]; if (bb[2] > bx1) bx1 = bb[2]; if (bb[3] > by1) by1 = bb[3]; };
      dongRows.forEach((dn, ci) => {
        const dnName = dn[0], de = dn[1], dv = dn[2], votesArr = dn[3], preArr = dn[4], dayArr = dn[5];
        const dcands = candMeta.map((m, k) => ({ party: m[0], name: m[1], votes: votesArr[k] || 0 }));
        const dKey = 'gwdong-' + gi + '-' + di + '-' + ci;
        const ddc = mkContest(dKey, '읍·면·동 개표', seoulName + ' ' + guName + ' ' + distName + ' ' + dnName, seoulName + ' ' + guName + ' ' + distName,
          { electorate: de, voters: dv, cands: dcands }, { guIndex: gi, sgIndex: di, dongIndex: ci, dongName: dnName, sggName: distName, guName, level: 'gwdong', novote: isNovote });
        const gd = lidx[nkA(dnName)] || lidx[nkB(dnName)] || gidx[nkA(dnName)] || gidx[nkB(dnName)];
        ddc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
        const a = emptyAcc(); addArr(a, 'pre', dcands, preArr); addArr(a, 'day', dcands, dayArr); ddc.split = accToSplit(a); ddc.splitScope = 'dong'; mergeAcc(distAcc, a);
        if (gd) { hasGeo = true; incBB(bboxOf(gd.d)); dc.dongGeos.push({ d: gd.d, cx: gd.cx, cy: gd.cy }); guDongGeos.push(gd); }
        dc.dongs.push(ddc); byKey[dKey] = ddc;
        if (!isNovote) searchIndex.push({ kind: 'dong', label: dnName + ' · ' + distName, sub: '광역의원 지역구 · ' + sShort + ' ' + guName, level: 'gwdong', guIndex: gi, sgIndex: di, dongIndex: ci, contestKey: dKey });
      });
      addArr(distAcc, 'pre', cands, prx); dc.split = accToSplit(distAcc); dc.splitScope = 'full';
      if (hasGeo) { const pad = Math.max(bx1 - bx0, by1 - by0) * 0.05 + 4; const cxs = dc.dongGeos.map((x) => x.cx), cys = dc.dongGeos.map((x) => x.cy);
        dc.geo = { cx: +medOf(cxs).toFixed(1), cy: +medOf(cys).toFixed(1), bbox: [+(bx0 - pad).toFixed(1), +(by0 - pad).toFixed(1), +(bx1 + pad).toFixed(1), +(by1 + pad).toFixed(1)] }; }
      byKey[key] = dc;
      guEntry.districts.push({ sgIndex: di, sggName: distName, key });
      searchIndex.push({ kind: 'region', label: sShort + ' ' + guName + ' ' + distName, sub: '광역의원 지역구 선거구', level: 'gwdist', guIndex: gi, sgIndex: di, contestKey: key });
      dc.candidates.forEach((c) => searchIndex.push({ kind: 'candidate', label: c.name, sub: (c.partyName || party(c.partyId).name) + ' · ' + guName + ' ' + distName + ' 시의원', guIndex: gi, sgIndex: di, contestKey: key, candName: c.name }));
      // 중선거구(다인) 지역구: 상위 M명 당선 처리 (명시 없으면 1인)
      const seatsM = GW_DIST_SEATS[code + '|' + distName] || 1;
      dc.seats = seatsM;
      if (seatsM > 1 && !isNovote) {
        dc.candidates.forEach((c, wi) => { c.isWinner = wi < seatsM; });
        dc.winners = dc.candidates.slice(0, seatsM);
        for (let w = 0; w < seatsM && w < dc.candidates.length; w++) { const pid = dc.candidates[w].partyId; seatByParty[pid] = (seatByParty[pid] || 0) + 1; }
        totalSeats += seatsM;
      } else {
        seatByParty[dc.winnerPartyId] = (seatByParty[dc.winnerPartyId] || 0) + 1; totalSeats++;
      }
    });

    // 행정구역 개편으로 지오에 없는 신설 자치구(예: 인천 제물포·영종·검단구)는 매칭된 행정동들로 구 경계를 합성
    if (!guEntry.geo && guDongGeos.length) {
      let gx0 = 1e9, gy0 = 1e9, gx1 = -1e9, gy1 = -1e9;
      guDongGeos.forEach((gd) => { const bb = bboxOf(gd.d); if (bb) { if (bb[0] < gx0) gx0 = bb[0]; if (bb[1] < gy0) gy0 = bb[1]; if (bb[2] > gx1) gx1 = bb[2]; if (bb[3] > gy1) gy1 = bb[3]; } });
      const pad = Math.max(gx1 - gx0, gy1 - gy0) * 0.05 + 4;
      guEntry.geo = { cx: +medOf(guDongGeos.map((x) => x.cx)).toFixed(1), cy: +medOf(guDongGeos.map((x) => x.cy)).toFixed(1),
        bbox: [+(gx0 - pad).toFixed(1), +(gy0 - pad).toFixed(1), +(gx1 + pad).toFixed(1), +(gy1 + pad).toFixed(1)] };
    }

    if (prop) {
      const pe = prop[0], pv = prop[1], meta = prop[2], pprx = prop[3], pdongRows = prop[4];
      const pcands = meta.map((pty, k) => ({ party: pty, name: pty, votes: pdongRows.reduce((s, dn) => s + (dn[3][k] || 0), 0) + (pprx[k] || 0) }));
      const pkey = 'gwprop-' + gi;
      const pc = mkContest(pkey, '광역의원 비례대표', seoulName + ' ' + guName + ' · 비례대표', seoulName + ' ' + guName,
        { electorate: pe, voters: pv, cands: pcands }, { guIndex: gi, guName, level: 'gwprop' });
      pc.dongs = [];
      pdongRows.forEach((dn, ci) => {
        const dnName = dn[0], de = dn[1], dv = dn[2], votesArr = dn[3];
        const dcands = meta.map((pty, k) => ({ party: pty, name: pty, votes: votesArr[k] || 0 }));
        const dKey = 'gwpropdong-' + gi + '-' + ci;
        const ddc = mkContest(dKey, '읍·면·동 비례', seoulName + ' ' + guName + ' ' + dnName + ' · 비례대표', seoulName + ' ' + guName + ' 비례대표',
          { electorate: de, voters: dv, cands: dcands }, { guIndex: gi, dongIndex: ci, dongName: dnName, guName, level: 'gwpropdong' });
        const gd = lidx[nkA(dnName)] || lidx[nkB(dnName)] || gidx[nkA(dnName)] || gidx[nkB(dnName)];
        ddc.geo = gd ? { d: gd.d, cx: gd.cx, cy: gd.cy } : null;
        pc.dongs.push(ddc); byKey[dKey] = ddc;
      });
      byKey[pkey] = pc;
      pc.candidates.forEach((c) => { propCity[c.partyId] = (propCity[c.partyId] || 0) + c.votes; propCityTotal += c.votes; });
      searchIndex.push({ kind: 'region', label: sShort + ' ' + guName + ' 비례대표', sub: '광역의원 비례대표', level: 'gwprop', guIndex: gi, contestKey: pkey });
    }
  });

  // 비례대표 의석 — 시·도별 공식 배분
  const propSeats = GW_PROP_SEATS[code] || {};
  const propSeatTotal = Object.values(propSeats).reduce((a, b) => a + b, 0);
  const grandTotal = totalSeats + propSeatTotal;
  const allPids = new Set([...Object.keys(seatByParty), ...Object.keys(propSeats)]);
  const seatComp = [...allPids].map((pid) => { const dist = seatByParty[pid] || 0, pr = propSeats[pid] || 0; return { pid, dist, prop: pr, total: dist + pr }; })
    .sort((a, b) => b.total - a.total);

  const summary = { sidoCode: code, sidoName: seoulName, title: GW_SIDO_TITLE[code] || (seoulName + '의회의원'), seatByParty, totalSeats, propSeats, propSeatTotal, grandTotal, seatComp, propCity, propCityTotal, guCount: guList.length };
  return { code, name: seoulName, byKey, searchIndex, guList, summary, vb: geo ? geo.vb : [1000, 819] };
}

function buildGwangDataset() {
  const C = window.VOTES_GWANG_C;
  if (!C) return null;
  const order = Object.keys(C);
  const sido = {};
  order.forEach((code) => { const d = buildOneSido(code); if (d) sido[code] = d; });
  const ok = order.filter((c) => sido[c]);
  if (!ok.length) return null;
  return { sido, order: ok };
}

DATA.gwang = buildGwangDataset();

/* 모든 dataset의 하위 구역 contest에 실제 의석 당선자 이름 심기 */
stampSeatWinners(DATA.byKey);
if (DATA.gu) stampSeatWinners(DATA.gu.byKey);
if (DATA.guk) stampSeatWinners(DATA.guk.byKey);
if (DATA.na) stampSeatWinners(DATA.na.byKey);
if (DATA.edu) stampSeatWinners(DATA.edu.byKey);
if (DATA.gwang) DATA.gwang.order.forEach((code) => stampSeatWinners(DATA.gwang.sido[code].byKey));

/* ============================================================================
   전국 읍·면·동 모자이크 — dong_geo(행정안전부 행정동) ↔ 선거결과 매칭 인덱스
   ----------------------------------------------------------------------------
   dong_geo는 2026 행정구역 코드(강원51·전북52·광주29·전남46), 선거데이터는
   통합 코드(강원42·전북52·전남광주통합49)를 쓰므로 크로스워크로 잇는다.
   각 dong을 (선거시도|시군구|동) 이름으로 매칭, 실패 시 (시도|동) → (시도|시군구)
   순으로 폴백하여 1위 정당·격차를 찾는다.
   ========================================================================== */
const SIDO_XWALK = { '51': '42', '29': '49', '46': '49' };   // 행정코드 → 선거코드
function admToElecSido(id) { return SIDO_XWALK[id] || id; }
function dnorm(s) { return (s || '').replace(/\s+/g, '').replace(/제(\d)/g, '$1'); }

/* 실제 의석 당선자 태깅 — 하위 구역(읽·면·동 등)의 1위는 '그 구역 1위'일 뿐,
   실제 의석은 상위 선거구(시·도/시·군·구/선거구)에서 결정. 하위 contest에
   실제 당선자 이름(seatWinnerNames)을 심어 Detail 당선 배지가 그것을 따르게 한다. */
function stampSeatWinners(byKey) {
  if (!byKey) return;
  const seatNamesOf = (c) => { if (!c || !c.candidates || !c.candidates.length) return []; const ws = c.winners && c.winners.length ? c.winners : [c.candidates[0]]; return ws.map((w) => w.name); };
  Object.keys(byKey).forEach((k) => {
    const c = byKey[k]; let pk = null, m;
    if ((m = /^dong-(.+)-\d+-\d+$/.exec(k))) pk = 'sido-' + m[1];
    else if ((m = /^sg-(.+)-\d+$/.exec(k))) pk = 'sido-' + m[1];
    else if ((m = /^gudong-(\d+)-\d+$/.exec(k))) pk = 'gu-' + m[1];
    else if ((m = /^gukdong-(.+)-(\d+)-\d+$/.exec(k))) pk = 'guk-' + m[1] + '-' + m[2];
    else if ((m = /^nadong-(.+)-(\d+)-\d+$/.exec(k))) pk = 'na-' + m[1] + '-' + m[2];
    else if ((m = /^edudong-(.+)-\d+-\d+$/.exec(k))) pk = 'edusido-' + m[1];
    else if ((m = /^edusg-(.+)-\d+$/.exec(k))) pk = 'edusido-' + m[1];
    else if ((m = /^gwdong-(\d+)-(\d+)-\d+$/.exec(k))) pk = 'gwdist-' + m[1] + '-' + m[2];
    else if (/^gwprop-/.test(k) || /^gwpropdong-/.test(k)) { c.seatWinnerNames = []; return; }
    else return;
    if (pk && byKey[pk]) c.seatWinnerNames = seatNamesOf(byKey[pk]);
  });
}

function buildMosaicIndex(byKey, dongLevel, sggLevel) {
  const dong = {}, dongAlt = {}, altDup = {}, sgg = {};
  Object.values(byKey).forEach((c) => {
    if (c.level === sggLevel && c.sggName) {
      const rec = { pid: c.winnerPartyId, margin: c.marginPct, key: c.key, novote: !!c.novote };
      sgg[c.sidoId + '|' + dnorm(c.sggName)] = rec;
      // 무투표 선거구: 산하 행정동 지오를 이름으로 직접 인덱싱
      if (c.novote && c.dongGeos) c.dongGeos.forEach((g) => {
        dong[c.sidoId + '|' + dnorm(c.sggName) + '|' + dnorm(g.nm)] = rec;
        const ak = c.sidoId + '|' + dnorm(g.nm); if (dongAlt[ak]) altDup[ak] = 1; else dongAlt[ak] = rec;
      });
    }
    if (c.level === dongLevel && c.dongName) {
      const rec = { pid: c.winnerPartyId, margin: c.marginPct, key: c.key };
      dong[c.sidoId + '|' + dnorm(c.sggName) + '|' + dnorm(c.dongName)] = rec;
      const ak = c.sidoId + '|' + dnorm(c.dongName); if (dongAlt[ak]) altDup[ak] = 1; else dongAlt[ak] = rec;
    }
  });
  Object.keys(altDup).forEach((k) => delete dongAlt[k]);   // 모호한 동명 제거
  return { dong, dongAlt, sgg };
}

DATA.mosaic = {
  xwalk: admToElecSido,
  gov: buildMosaicIndex(DATA.byKey, 'dong', 'sigungu'),
  guk: DATA.guk ? buildMosaicIndex(DATA.guk.byKey, 'gukdong', 'district') : null,
  edu: DATA.edu ? buildMosaicIndex(DATA.edu.byKey, 'dong', 'sigungu') : null,
  na: DATA.na ? buildMosaicIndex(DATA.na.byKey, 'nadong', 'nadistrict') : null,
};
/* dong_geo dong → 결과 레코드(없으면 null) */
DATA.mosaicLookup = function (which, admSido, sgName, dongName) {
  const idx = DATA.mosaic[which]; if (!idx) return null;
  const es = admToElecSido(admSido);
  const a = dnorm(sgName), b = dnorm(dongName);
  let r = idx.dong[es + '|' + a + '|' + b] || idx.dongAlt[es + '|' + b] || idx.sgg[es + '|' + a];
  if (r) return r;
  // 큰 시: dong_geo는 "○○시□□구"로 쪼개져 있지만 시·군·구의장 선거구는 "○○시" 하나로 통합 →
  // 행정구 접미사를 떼어 통합 선거구(동 단위 우선, 없으면 시 전체)로 폴백
  const m = sgName.match(/^(.+시)[^시]*구$/);
  if (m) {
    const a2 = dnorm(m[1]);
    r = idx.dong[es + '|' + a2 + '|' + b] || idx.sgg[es + '|' + a2];
    if (r) return r;
  }
  return null;
};

window.DATA = DATA;
window.PARTIES = PARTIES;
window.party = party;
window.fmt = (n) => (n == null ? '–' : n.toLocaleString('ko-KR'));
window.pct = (x, d = 1) => (x == null ? '–' : (x * 100).toFixed(d) + '%');
