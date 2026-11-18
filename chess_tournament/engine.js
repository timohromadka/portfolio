/* Tournament logic: scoring, tiebreaks, Swiss and round robin pairing.
   Pure functions over a plain state object, so it can be tested in Node. */
(function (root) {
  'use strict';

  // result code -> [white points, black points, played over the board]
  const RESULTS = {
    '1-0': [1, 0, true],
    'D':   [0.5, 0.5, true],
    '0-1': [0, 1, true],
    '+-':  [1, 0, false],
    '-+':  [0, 1, false],
    '--':  [0, 0, false],
  };

  const TIEBREAKS = {
    bh1: 'Buchholz Cut-1',
    bh:  'Buchholz',
    sb:  'Sonneborn-Berger',
    de:  'Direct encounter',
    win: 'Wins',
  };
  const TB_SHORT = { bh1: 'BH-1', bh: 'BH', sb: 'SB', de: 'DE', win: 'W' };

  function defaultTiebreaks(format) {
    const on = format === 'rr' ? ['sb', 'de', 'win'] : ['bh1', 'bh', 'sb', 'de', 'win'];
    const order = format === 'rr' ? ['sb', 'de', 'win', 'bh1', 'bh'] : ['bh1', 'bh', 'sb', 'de', 'win'];
    return order.map(k => ({ k, on: on.includes(k) }));
  }

  // FIDE rating difference table for p = 0.50 .. 1.00
  const DP = [0, 7, 14, 21, 29, 36, 43, 50, 57, 65, 72, 80, 87, 95, 102, 110, 117, 125, 133, 141,
    149, 158, 166, 175, 184, 193, 202, 211, 220, 230, 240, 251, 262, 273, 284, 296, 309, 322, 336,
    351, 366, 383, 401, 422, 444, 470, 501, 538, 589, 677, 800];
  function dp(p) {
    const i = Math.round(Math.abs(p - 0.5) * 100);
    return (p < 0.5 ? -1 : 1) * DP[Math.min(i, 50)];
  }

  // Everything that has happened so far, per player.
  // Rounds still in the 'pairing' phase are ignored.
  function history(state) {
    const h = {};
    state.players.forEach(p => {
      h[p.id] = { score: 0, games: {}, opps: new Set(), colors: [], byes: 0, fwins: 0, wins: 0 };
    });
    state.rounds.forEach((r, ri) => {
      if (r.status === 'pairing') return;
      r.pairings.forEach(pr => {
        const hw = h[pr.w];
        if (pr.b == null) {
          hw.score += pr.byePts;
          hw.byes++;
          hw.games[ri] = { opp: null, pts: pr.byePts, played: false, bye: true };
          return;
        }
        const hb = h[pr.b];
        hw.opps.add(pr.b);
        hb.opps.add(pr.w);
        if (!pr.result) {
          hw.games[ri] = { opp: pr.b, color: 'w', pts: null, played: true, pending: true };
          hb.games[ri] = { opp: pr.w, color: 'b', pts: null, played: true, pending: true };
          return;
        }
        const [pw, pb, played] = RESULTS[pr.result];
        hw.score += pw;
        hb.score += pb;
        hw.games[ri] = { opp: pr.b, color: 'w', pts: pw, played, result: pr.result };
        hb.games[ri] = { opp: pr.w, color: 'b', pts: pb, played, result: pr.result };
        if (played) {
          hw.colors.push('w');
          hb.colors.push('b');
          if (pw === 1) hw.wins++;
          if (pb === 1) hb.wins++;
        } else {
          if (pw === 1) hw.fwins++;
          if (pb === 1) hb.fwins++;
        }
      });
    });
    return h;
  }

  function standings(state) {
    const h = history(state);
    const played = state.rounds.filter(r => r.status !== 'pairing').length;
    const byId = {};
    state.players.forEach(p => { byId[p.id] = p; });

    const rows = state.players.map(p => {
      const me = h[p.id];
      const contrib = [];
      let sb = 0, oppRating = 0, nRated = 0, ptsRated = 0;
      for (let ri = 0; ri < played; ri++) {
        const g = me.games[ri];
        if (g && g.opp != null && g.played) {
          const os = h[g.opp].score;
          contrib.push(os);
          if (g.pts != null) sb += g.pts * os;
          const or = byId[g.opp].rating;
          if (or > 0 && g.pts != null) { oppRating += or; nRated++; ptsRated += g.pts; }
        } else {
          // unplayed round (bye, forfeit, absent): counts as the player's own score
          contrib.push(me.score);
        }
      }
      const bh = contrib.reduce((a, b) => a + b, 0);
      const bh1 = contrib.length ? bh - Math.min(...contrib) : 0;
      const perf = nRated ? Math.round(oppRating / nRated + dp(ptsRated / nRated)) : null;
      return {
        id: p.id, name: p.name, rating: p.rating, seed: p.seed, withdrawn: p.withdrawn,
        score: me.score, games: me.games,
        tb: { bh1, bh, sb, win: me.wins }, perf,
      };
    });

    const criteria = ['pts'].concat(state.tiebreaks.filter(t => t.on).map(t => t.k));

    function value(crit, r, ids) {
      if (crit === 'pts') return r.score;
      if (crit === 'de') {
        let s = 0;
        Object.values(r.games).forEach(g => { if (g.opp != null && ids.has(g.opp) && g.pts != null) s += g.pts; });
        return s;
      }
      return r.tb[crit];
    }

    function rank(group, ci) {
      if (group.length < 2) return group;
      if (ci >= criteria.length) return group.sort((a, b) => (a.seed || 0) - (b.seed || 0));
      const crit = criteria[ci];
      const ids = new Set(group.map(r => r.id));
      const v = new Map(group.map(r => [r.id, value(crit, r, ids)]));
      if (crit === 'de') group.forEach(r => { r.tb.de = v.get(r.id); });
      group.sort((a, b) => v.get(b.id) - v.get(a.id));
      const out = [];
      let i = 0;
      while (i < group.length) {
        let j = i;
        while (j < group.length && Math.abs(v.get(group[j].id) - v.get(group[i].id)) < 1e-9) j++;
        out.push(...rank(group.slice(i, j), ci + 1));
        i = j;
      }
      return out;
    }

    rows.forEach(r => { r.tb.de = null; });
    const ranked = rank(rows, 0);
    ranked.forEach((r, i) => { r.rank = i + 1; });
    return ranked;
  }

  function colourPref(colors) {
    const n = colors.length;
    if (!n) return { c: null, s: 0 };
    const w = colors.filter(c => c === 'w').length;
    const d = w - (n - w);
    const last = colors[n - 1], last2 = colors[n - 2];
    if (d >= 2 || (last === 'w' && last2 === 'w')) return { c: 'b', s: 3 };
    if (d <= -2 || (last === 'b' && last2 === 'b')) return { c: 'w', s: 3 };
    if (d === 1) return { c: 'b', s: 2 };
    if (d === -1) return { c: 'w', s: 2 };
    return { c: last === 'w' ? 'b' : 'w', s: 1 };
  }

  function bySeedRating(a, b) {
    return (b.rating || 0) - (a.rating || 0) || (a.seed || 0) - (b.seed || 0) || a.id - b.id;
  }

  // Swiss pairing in the spirit of the Dutch system: score groups, top half
  // plays bottom half, no rematches, colour balance, bye to the lowest-ranked
  // player who has not had one yet.
  function pairSwiss(state) {
    const h = history(state);
    const roundIdx = state.rounds.filter(r => r.status !== 'pairing').length;
    const active = state.players.filter(p => !p.withdrawn);
    const ranked = active.slice().sort((a, b) => h[b.id].score - h[a.id].score || bySeedRating(a, b)).map(p => p.id);
    const rankIdx = {}, pos = {}, half = {}, pref = {};
    ranked.forEach((id, i) => { rankIdx[id] = i; pref[id] = colourPref(h[id].colors); });
    let i = 0;
    while (i < ranked.length) {
      let j = i;
      while (j < ranked.length && h[ranked[j]].score === h[ranked[i]].score) j++;
      for (let k = i; k < j; k++) { pos[ranked[k]] = k - i; half[ranked[k]] = Math.floor((j - i) / 2); }
      i = j;
    }

    function cost(a, b) {
      const sd = Math.round(Math.abs(h[a].score - h[b].score) * 2);
      let c = sd * 1000;
      if (h[a].opps.has(b)) c += 100000;
      const pa = pref[a], pb = pref[b];
      if (pa.c && pa.c === pb.c) {
        const m = Math.min(pa.s, pb.s);
        c += m === 3 ? 1500 : m === 2 ? 40 : 4;
      }
      c += sd === 0 ? Math.abs(pos[b] - (pos[a] + half[a])) : pos[b];
      return c;
    }

    let budget = 200000;
    function search(pool, allowRematch) {
      if (!pool.length) return [];
      const a = pool[0];
      const cands = pool.slice(1)
        .filter(b => allowRematch || !h[a].opps.has(b))
        .sort((x, y) => cost(a, x) - cost(a, y));
      for (const b of cands) {
        if (--budget < 0 && !allowRematch) return null;
        const r = search(pool.filter(x => x !== a && x !== b), allowRematch);
        if (r) return [[a, b]].concat(r);
      }
      return null;
    }

    let byeCands = [null];
    if (ranked.length % 2) {
      const rev = ranked.slice().reverse();
      const fresh = rev.filter(id => !h[id].byes && !h[id].fwins);
      byeCands = fresh.concat(rev.filter(id => !fresh.includes(id)));
    }

    let pairs = null, bye = null;
    for (const allow of [false, true]) {
      for (const cand of byeCands) {
        pairs = search(ranked.filter(id => id !== cand), allow);
        if (pairs) { bye = cand; break; }
        if (budget < 0 && !allow) break;
      }
      if (pairs) break;
    }

    // board order: higher scores first, then higher ranked
    pairs.sort((p, q) => {
      const sp = Math.max(h[p[0]].score, h[p[1]].score), sq = Math.max(h[q[0]].score, h[q[1]].score);
      return sq - sp || Math.min(rankIdx[p[0]], rankIdx[p[1]]) - Math.min(rankIdx[q[0]], rankIdx[q[1]]);
    });

    const out = pairs.map((pr, board) => {
      let [a, b] = rankIdx[pr[0]] < rankIdx[pr[1]] ? pr : [pr[1], pr[0]]; // a = higher ranked
      const pa = pref[a], pb = pref[b];
      let aWhite;
      if (!pa.c && !pb.c) aWhite = roundIdx === 0 ? board % 2 === 0 : true;
      else if (!pb.c) aWhite = pa.c === 'w';
      else if (!pa.c) aWhite = pb.c === 'b';
      else if (pa.c !== pb.c) aWhite = pa.c === 'w';
      else if (pb.s > pa.s) aWhite = pb.c === 'b';
      else aWhite = pa.c === 'w';
      return aWhite ? { w: a, b: b, result: null } : { w: b, b: a, result: null };
    });
    if (bye != null) out.push({ w: bye, b: null, byePts: state.byePts, result: 'BYE' });
    return out;
  }

  // Round robin schedule (circle method). Returns list of rounds of [white, black|null].
  function roundRobinSchedule(ids) {
    const arr = ids.slice();
    if (arr.length % 2) arr.push(null);
    const n = arr.length;
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        let a = arr[i], b = arr[n - 1 - i];
        if (i === 0 ? r % 2 === 1 : i % 2 === 1) [a, b] = [b, a];
        pairs.push([a, b]);
      }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop()); // rotate all but the first
    }
    return rounds;
  }

  function rrRound(state, idx) {
    const byId = {};
    state.players.forEach(p => { byId[p.id] = p; });
    const out = [];
    state.schedule[idx].forEach(([a, b]) => {
      if (a == null || b == null) {
        const p = a == null ? b : a;
        if (!byId[p].withdrawn) out.push({ w: p, b: null, byePts: 0, result: 'BYE' });
        return;
      }
      const wa = byId[a].withdrawn, wb = byId[b].withdrawn;
      out.push({ w: a, b: b, result: wa && wb ? '--' : wa ? '-+' : wb ? '+-' : null });
    });
    // byes last
    out.sort((x, y) => (x.b == null) - (y.b == null));
    return out;
  }

  function makePairings(state) {
    const idx = state.rounds.filter(r => r.status !== 'pairing').length;
    return state.format === 'rr' ? rrRound(state, idx) : pairSwiss(state);
  }

  function start(state) {
    const sorted = state.players.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.id - b.id);
    sorted.forEach((p, i) => { p.seed = i + 1; p.joined = 0; });
    if (state.format === 'rr') {
      state.schedule = roundRobinSchedule(sorted.map(p => p.id));
      state.totalRounds = state.schedule.length;
    }
    state.status = 'running';
    state.rounds = [];
    newRound(state);
  }

  function newRound(state) {
    state.rounds.push({ status: 'pairing', pairings: [] });
    state.rounds[state.rounds.length - 1].pairings = makePairings(state);
  }

  function repair(state) {
    const r = state.rounds[state.rounds.length - 1];
    if (r && r.status === 'pairing') r.pairings = makePairings(state);
  }

  function roundComplete(r) {
    return r.pairings.every(p => p.b == null || p.result);
  }

  const api = { RESULTS, TIEBREAKS, TB_SHORT, defaultTiebreaks, history, standings, pairSwiss,
    roundRobinSchedule, makePairings, start, newRound, repair, roundComplete, colourPref };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(this);
