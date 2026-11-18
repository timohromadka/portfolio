(function () {
  'use strict';
  const E = window.Engine;
  const KEY = 'chess_tournament.v1';
  const UIKEY = 'chess_tournament.ui';
  const $app = document.getElementById('app');

  /* ---------- state ---------- */

  function fresh() {
    return {
      v: 1, name: '', date: new Date().toISOString().slice(0, 10),
      format: 'swiss', totalRounds: 5, base: 10, inc: 5, byePts: 1,
      tiebreaks: E.defaultTiebreaks('swiss'),
      players: [], rounds: [], status: 'setup', nextId: 1, schedule: null,
    };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 1 ? s : null; }
    catch (e) { return null; }
  }
  function loadUi() {
    try { return JSON.parse(localStorage.getItem(UIKEY)) || {}; } catch (e) { return {}; }
  }

  let S = load() || fresh();
  const ui = { tab: loadUi().tab || 'setup', view: null, sel: null, focusAdd: false };
  let display = location.hash === '#display';

  function save() {
    localStorage.setItem(KEY, JSON.stringify(S));
    localStorage.setItem(UIKEY, JSON.stringify({ tab: ui.tab }));
  }
  function commit() { save(); render(); }

  // a second window (e.g. #display on a projector) follows along
  window.addEventListener('storage', e => {
    if (e.key === KEY) { S = load() || fresh(); ui.sel = null; render(); }
  });

  /* ---------- helpers ---------- */

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const player = id => S.players.find(p => p.id === id);
  const last = () => S.rounds[S.rounds.length - 1];
  const started = () => S.status !== 'setup';

  function pts(x) {
    if (x == null) return '';
    if (Number.isInteger(x)) return String(x);
    if (Number.isInteger(x * 2)) return (Math.floor(x) || '') + '½';
    return x.toFixed(2);
  }
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const historyBefore = ri => E.history(Object.assign({}, S, { rounds: S.rounds.slice(0, ri) }));
  const tc = () => `${S.base} + ${S.inc}`;

  const RES = [
    ['1-0', '1–0', 'White wins'], ['D', '½–½', 'Draw'], ['0-1', '0–1', 'Black wins'],
    ['+-', '+/−', 'White wins by forfeit'], ['-+', '−/+', 'Black wins by forfeit'], ['--', '−/−', 'Double forfeit'],
  ];
  const resLabel = code => (RES.find(r => r[0] === code) || [, ''])[1];

  const ICON_BOARD = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="10" height="10"/><rect x="12" y="12" width="10" height="10"/><path d="M12 2h10v10H12zM2 12h10v10H2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  const ICON_ROOK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2h3.5v2.5h2.5V2h4v2.5h2.5V2H20v6l-3 2.5v7l2.5 2V22h-15v-2.5l2.5-2v-7L4 8z"/></svg>';

  /* ---------- masthead ---------- */

  function statusLine() {
    if (S.status === 'setup') return 'Registration open';
    if (S.status === 'finished') return 'Final standings';
    const r = last();
    const phase = r.status === 'pairing' ? 'pairings ready' : 'in play';
    return `Round ${S.rounds.length} of ${S.totalRounds}, ${phase}`;
  }

  function masthead() {
    const year = (S.date || '').slice(0, 4);
    const fmt = S.format === 'rr' ? 'Round robin' : 'Swiss system';
    const rounds = S.format === 'rr' && !started() ? '' : `, ${plural(S.totalRounds, 'round')}`;
    return `
      <header class="masthead">
        <div>
          <h1>${S.name ? esc(S.name) : 'Chess<br>Tournament'}</h1>
          <p class="issue">${S.name ? 'Chess tournament' : 'Untitled'} / ${esc(year)}</p>
          <p class="credits">
            ${fmt}${rounds}<br>
            Time control ${tc()}<br>
            ${plural(S.players.filter(p => !p.withdrawn).length, 'player')}<br>
            ${statusLine()}<br>
            Saved on this device
          </p>
        </div>
        <div class="icons">
          <button class="icon help ht ht-3" data-act="help" title="How it works">?</button>
          <button class="icon" data-act="display" title="Display view">${ICON_BOARD}</button>
          <button class="icon outline" data-act="data" title="Tournament file">${ICON_ROOK}</button>
        </div>
      </header>`;
  }

  function tabs() {
    const t = [['setup', 'Setup'], ['players', 'Players'], ['round', 'Round'], ['standings', 'Standings']];
    return `<nav class="tabs">${t.map(([k, l]) =>
      `<button data-act="tab" data-v="${k}" aria-current="${ui.tab === k}" ${k === 'round' && !started() ? 'disabled' : ''}>${l}</button>`).join('')}</nav>`;
  }

  /* ---------- setup ---------- */

  function viewSetup() {
    const n = S.players.length;
    const lock = started();
    const minR = Math.max(1, S.rounds.length);
    let roundsField;
    if (S.format === 'rr') {
      roundsField = `<span>${lock ? S.totalRounds : (n < 2 ? '—' : (n % 2 ? n : n - 1))}</span>
        <div class="hint">Everyone plays everyone once.</div>`;
    } else {
      const rec = n > 1 ? Math.ceil(Math.log2(n)) : null;
      roundsField = `<input type="number" class="num" min="${minR}" max="99" value="${S.totalRounds}" data-f="totalRounds">
        <div class="hint">${rec ? `${n} players: ${rec} rounds or more to find a clear winner.` : 'Usually 5 to 7.'}${lock ? ` At least ${minR} (already paired).` : ''}</div>`;
    }
    const seg = (act, opts, val, dis) => `<div class="seg">${opts.map(([v, l]) =>
      `<button data-act="${act}" data-v="${v}" aria-pressed="${String(val) === String(v)}" ${dis ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;

    const tb = S.tiebreaks.map((t, i) => `
      <div class="tb-row ${t.on ? '' : 'off'}">
        <input type="checkbox" ${t.on ? 'checked' : ''} data-f="tb" data-i="${i}" id="tb${i}">
        <label class="name" for="tb${i}">${E.TIEBREAKS[t.k]}</label>
        <button class="arrow" data-act="tb-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
        <button class="arrow" data-act="tb-down" data-i="${i}" ${i === S.tiebreaks.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
      </div>`).join('');

    return `
      <h2>Setup</h2>
      <p class="note">${lock ? 'The format is fixed once the tournament has started. Everything else can still be changed.' : 'Settings can be changed until the tournament starts.'}</p>
      <div class="field"><label for="tname">Name</label>
        <input type="text" id="tname" value="${esc(S.name)}" placeholder="Club championship" data-f="name"></div>
      <div class="field"><label>Format</label>
        ${seg('format', [['swiss', 'Swiss'], ['rr', 'Round robin']], S.format, lock)}</div>
      <div class="field"><label>Rounds</label><div>${roundsField}</div></div>
      <div class="field"><label>Time control</label>
        <div class="inline">
          <input type="number" class="num" min="0" value="${S.base}" data-f="base"> min
          <span>+</span>
          <input type="number" class="num" min="0" value="${S.inc}" data-f="inc"> s increment
        </div></div>
      ${S.format === 'swiss' ? `<div class="field"><label>Bye</label>
        <div>${seg('bye', [[1, '1 point'], [0.5, '½ point'], [0, '0 points']], S.byePts)}
        <div class="hint">Given to one player in rounds with an odd number of players.</div></div></div>` : ''}
      <div class="field"><label>Tiebreaks</label>
        <div><div class="tb">${tb}</div><div class="hint" style="margin-top:8px">Applied in this order when points are equal.</div></div></div>
      ${!lock ? `<div class="actions"><button class="btn solid" data-act="tab" data-v="players">Players →</button></div>` : ''}
      ${lock || S.players.length || S.name ? `<div class="actions danger">
        <button class="btn" data-act="quit">Quit tournament</button>
        <span class="note" style="margin:0">Ends the tournament and deletes it from this browser.</span>
      </div>` : ''}`;
  }

  /* ---------- players ---------- */

  function viewPlayers() {
    const run = S.status === 'running';
    const canAdd = S.status === 'setup' || (run && S.format === 'swiss');
    const list = started()
      ? S.players.slice().sort((a, b) => a.seed - b.seed)
      : S.players.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.id - b.id);
    let note;
    if (!started()) note = 'Add everyone who is playing. Players are seeded by Elo; leave Elo blank if unrated.';
    else if (S.format === 'swiss' && run) {
      const r = last();
      const from = r.status === 'pairing' ? S.rounds.length : S.rounds.length + 1;
      note = `Late entries join from round ${from} with 0 points. Withdrawn players are no longer paired; their results stay.`;
    } else note = 'Withdrawn players are no longer paired; their results stay.' +
      (S.format === 'rr' && run ? ' Their remaining games are scored as forfeits.' : '');

    const rows = list.map((p, i) => `
      <tr class="${p.withdrawn ? 'out' : ''}">
        <td>${started() ? p.seed : i + 1}</td>
        <td class="name"><input type="text" value="${esc(p.name)}" data-pf="name" data-id="${p.id}"></td>
        <td class="r"><input type="number" class="num r" min="0" value="${p.rating || ''}" placeholder="—" data-pf="rating" data-id="${p.id}"></td>
        <td>${started() && p.joined ? `<span class="flag">from round ${p.joined + 1}</span>` : ''}</td>
        <td class="r">${started()
          ? (run ? `<button class="btn small" data-act="withdraw" data-id="${p.id}">${p.withdrawn ? 'Reinstate' : 'Withdraw'}</button>` : (p.withdrawn ? '<span class="flag">withdrawn</span>' : ''))
          : `<button class="x" data-act="remove" data-id="${p.id}" title="Remove">×</button>`}</td>
      </tr>`).join('');

    let warn = '';
    if (!started() && S.format === 'swiss' && S.players.length > 1 && S.totalRounds > S.players.length - 1 + (S.players.length % 2)) {
      warn = `<p class="note">${S.totalRounds} rounds is more than ${S.players.length} players can play without rematches. Consider fewer rounds or round robin.</p>`;
    }

    return `
      <h2>Players</h2>
      <p class="note">${note}</p>
      ${canAdd ? `<form class="add" id="addf" autocomplete="off">
        <input type="text" id="pname" placeholder="Name" required>
        <input type="number" id="prating" placeholder="Elo" min="0">
        <button class="btn" type="submit">Add</button>
      </form>` : ''}
      ${S.players.length ? `<div class="scroll"><table>
        <thead><tr><th>#</th><th>Name</th><th class="r">Elo</th><th></th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : '<p class="note muted">No players yet.</p>'}
      ${warn}
      ${!started() ? `<div class="actions">
        <button class="btn solid" data-act="start" ${S.players.length < 2 ? 'disabled' : ''}>Start tournament</button>
        <span class="note" style="margin:0">Pairs round 1. You can still swap players before the round begins.</span>
      </div>` : ''}`;
  }

  /* ---------- round ---------- */

  function playerCell(id, side, hist, pick) {
    const p = player(id);
    const h = hist[id];
    const meta = `${p.rating || 'unrated'} · ${pts(h ? h.score : 0) || '0'}`;
    const sq = `<span class="sq ${side}"></span>`;
    const name = `<span class="pname">${esc(p.name)}</span>`;
    const m = `<span class="meta">${meta}</span>`;
    const flags = (p.withdrawn ? '<span class="flag">withdrawn</span>' : '') + (pick && pick.rematch ? '<span class="flag">rematch</span>' : '');
    const cls = `player ${side === 'b' ? 'blk' : ''} ${pick ? 'pick' : ''} ${pick && pick.sel ? 'sel' : ''}`;
    const data = pick ? `data-act="pick" data-pi="${pick.pi}" data-side="${side}"` : '';
    const inner = side === 'w' ? sq + name + m + flags : flags + m + name + sq;
    return `<div class="${cls}" ${data}>${inner}</div>`;
  }

  function viewRound() {
    const ri = ui.view != null && ui.view < S.rounds.length ? ui.view : S.rounds.length - 1;
    const r = S.rounds[ri];
    const isLast = ri === S.rounds.length - 1;
    const hist = historyBefore(ri);
    const pairing = r.status === 'pairing';
    const canPick = pairing && S.format === 'swiss';

    const total = Math.max(S.totalRounds, S.rounds.length);
    let sel = '';
    for (let i = 0; i < total; i++) {
      if (i < S.rounds.length) {
        const cls = S.rounds[i].status === 'done' ? 'ht ht-3' : '';
        sel += `<button class="${cls}" data-act="view" data-i="${i}" aria-current="${i === ri}">${i + 1}</button>`;
      } else sel += `<button class="future" disabled>${i + 1}</button>`;
    }

    const boards = r.pairings.map((pr, pi) => {
      if (pr.b == null) {
        const pick = canPick ? { pi, sel: ui.sel && ui.sel.pi === pi && ui.sel.side === 'w' } : null;
        return `<div class="board"><div class="bno ht ht-4"></div>${playerCell(pr.w, 'w', hist, pick)}
          <div class="bye">Bye · ${pts(pr.byePts) || '0'} ${pr.byePts === 1 ? 'point' : 'points'}</div></div>`;
      }
      const rematch = hist[pr.w].opps.has(pr.b);
      const pk = side => canPick ? { pi, rematch, sel: ui.sel && ui.sel.pi === pi && ui.sel.side === side } : null;
      const res = pairing
        ? '<div class="vs">vs</div>'
        : RES.map(([code, label, title], k) => `<button class="${k > 2 ? 'ff' : ''}" title="${title}" aria-pressed="${pr.result === code}"
            data-act="res" data-ri="${ri}" data-pi="${pi}" data-v="${code}">${label}</button>`).join('');
      return `<div class="board"><div class="bno ht ht-4">${pi + 1}</div>
        ${playerCell(pr.w, 'w', hist, pk('w'))}<div class="res">${res}</div>${playerCell(pr.b, 'b', hist, pk('b'))}</div>`;
    }).join('');

    let note, actions = '';
    if (pairing) {
      note = canPick
        ? 'Pairings are ready. To swap two players, click one and then the other; swapping the two players on one board switches colours. Then start the round.'
        : 'Pairings are ready. Start the round when players are at their boards.';
      actions = `
        <button class="btn solid" data-act="begin">Start round ${ri + 1}</button>
        ${S.format === 'swiss' ? '<button class="btn" data-act="repair">Re-pair</button>' : ''}
        ${ri > 0 ? `<button class="btn" data-act="back">Back to round ${ri}</button>` : ''}`;
    } else {
      const games = r.pairings.filter(p => p.b != null);
      const doneN = games.filter(p => p.result).length;
      const complete = doneN === games.length;
      note = r.status === 'done'
        ? 'Round complete. Results can still be corrected here; standings update, but pairings already made stay as they are.'
        : 'In play. Enter each result as the game finishes. Click a selected result again to clear it.';
      if (isLast) {
        const more = S.rounds.length < S.totalRounds;
        actions = `<span class="progress">${doneN} / ${games.length} results</span>` +
          (S.status === 'finished' && !more
            ? '<button class="btn solid" data-act="tab" data-v="standings">Final standings →</button>'
            : more
              ? `<button class="btn solid" data-act="next" ${complete ? '' : 'disabled'}>Pair round ${ri + 2} →</button>`
              : `<button class="btn solid" data-act="finish" ${complete ? '' : 'disabled'}>Finish tournament</button>`);
      }
    }

    return `
      <div class="rounds">${sel}</div>
      <h2>Round ${ri + 1}</h2>
      <p class="note">${note}</p>
      <div class="boards">${boards}</div>
      ${actions ? `<div class="actions">${actions}</div>` : ''}`;
  }

  /* ---------- standings ---------- */

  function roundCell(row, ri, rankOf) {
    const g = row.games[ri];
    if (!g) return '<span class="muted">–</span>';
    if (g.bye) return `bye${g.pts ? ' ' + pts(g.pts) : ''}`;
    if (g.pending) return `${rankOf[g.opp]}${g.color} ·`;
    const sym = g.pts === 1 ? '+' : g.pts === 0 ? '−' : '=';
    return `${rankOf[g.opp]}${g.color}${sym}${g.played ? '' : 'f'}`;
  }

  function standingsTable(compact) {
    const rows = E.standings(S);
    const tbs = S.tiebreaks.filter(t => t.on && t.k !== 'de').map(t => t.k);
    const n = S.rounds.filter(r => r.status !== 'pairing').length;
    const rankOf = {};
    rows.forEach(r => { rankOf[r.id] = r.rank; });
    if (compact) {
      const k = tbs[0];
      return `<table><thead><tr><th>#</th><th>Name</th><th class="r pts">Pts</th>${k ? `<th class="r">${E.TB_SHORT[k]}</th>` : ''}</tr></thead><tbody>
        ${rows.map(r => `<tr class="${r.withdrawn ? 'out' : ''}"><td>${r.rank}</td><td class="name">${esc(r.name)}</td>
          <td class="r pts">${pts(r.score) || '0'}</td>${k ? `<td class="r">${pts(r.tb[k])}</td>` : ''}</tr>`).join('')}
        </tbody></table>`;
    }
    let rh = '';
    for (let i = 0; i < n; i++) rh += `<th>R${i + 1}</th>`;
    return `<div class="scroll"><table>
      <thead><tr><th>#</th><th>Name</th><th class="r pts">Pts</th><th class="r">Elo</th>
        ${tbs.map(k => `<th class="r" title="${E.TIEBREAKS[k]}">${E.TB_SHORT[k]}</th>`).join('')}
        <th class="r" title="Performance rating">Perf</th>${rh}</tr></thead>
      <tbody>${rows.map(r => {
        let rc = '';
        for (let i = 0; i < n; i++) rc += `<td>${roundCell(r, i, rankOf)}</td>`;
        return `<tr class="${r.withdrawn ? 'out' : ''}"><td>${r.rank}</td><td class="name">${esc(r.name)}${r.withdrawn ? ' <span class="flag">withdrawn</span>' : ''}</td>
          <td class="r pts">${pts(r.score) || '0'}</td><td class="r">${r.rating || '—'}</td>
          ${tbs.map(k => `<td class="r">${r.tb[k] == null ? '' : pts(r.tb[k]) || '0'}</td>`).join('')}
          <td class="r">${r.perf == null ? '—' : r.perf}</td>${rc}</tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function viewStandings() {
    if (!S.players.length) return '<h2>Standings</h2><p class="note muted">No players yet.</p>';
    let note;
    if (S.status === 'setup') note = 'The tournament has not started.';
    else if (S.status === 'finished') note = `After ${plural(S.rounds.length, 'round')}.`;
    else {
      const r = last();
      const doneN = S.rounds.filter(x => x.status === 'done').length;
      note = r.status === 'playing' ? `Live: includes results entered so far in round ${S.rounds.length}.` : `After ${plural(doneN, 'round')}.`;
    }
    return `
      <h2>${S.status === 'finished' ? 'Final standings' : 'Standings'}</h2>
      <p class="note">${note} Round columns show opponent rank, colour and result (f = forfeit). Perf is the performance rating against rated opponents.</p>
      ${standingsTable(false)}`;
  }

  /* ---------- display ---------- */

  function viewDisplay() {
    let left;
    if (!started()) {
      left = `<h1>${S.name ? esc(S.name) : 'Chess<br>Tournament'}</h1><p class="issue">Time control ${tc()}</p>
        <h3>${plural(S.players.length, 'player')} registered</h3>
        <table><tbody>${S.players.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0)).map((p, i) =>
          `<tr><td>${i + 1}</td><td class="name">${esc(p.name)}</td><td class="r">${p.rating || ''}</td></tr>`).join('')}</tbody></table>`;
    } else {
      const ri = S.rounds.length - 1;
      const r = S.rounds[ri];
      const hist = historyBefore(ri);
      const boards = r.pairings.map((pr, pi) => {
        const cell = (id, side) => {
          const p = player(id);
          const sq = `<span class="sq ${side}"></span>`;
          const name = `<span class="pname">${esc(p.name)}</span>`;
          const m = `<span class="meta">${pts(hist[id].score) || '0'}</span>`;
          return `<div class="player ${side === 'b' ? 'blk' : ''}">${side === 'w' ? sq + name + m : m + name + sq}</div>`;
        };
        if (pr.b == null) return `<div class="board"><div class="bno ht ht-4"></div>${cell(pr.w, 'w')}<div class="bye">Bye</div></div>`;
        return `<div class="board"><div class="bno ht ht-4">${pi + 1}</div>${cell(pr.w, 'w')}
          <div class="dres">${pr.result ? resLabel(pr.result) : ''}</div>${cell(pr.b, 'b')}</div>`;
      }).join('');
      const title = S.status === 'finished' ? 'Final' : `Round ${ri + 1}`;
      left = `<h1>${title}</h1><p class="issue">${esc(S.name || 'Chess Tournament')} · Time control ${tc()}</p>
        <div class="boards">${boards}</div>`;
    }
    return `<button class="btn small exit" data-act="exit">Exit display</button>
      <div class="disp"><div>${left}</div>
      <div>${started() ? `<h3>${S.status === 'finished' ? 'Final standings' : 'Standings'}</h3>${standingsTable(true)}` : ''}</div></div>`;
  }

  /* ---------- render ---------- */

  const VIEWS = { setup: viewSetup, players: viewPlayers, round: viewRound, standings: viewStandings };

  function render() {
    if (ui.tab === 'round' && !started()) ui.tab = 'setup';
    document.body.classList.toggle('display', display);
    document.title = S.name || 'Chess Tournament';
    $app.innerHTML = display ? viewDisplay() : masthead() + tabs() + `<main>${VIEWS[ui.tab]()}</main>`;
    if (ui.focusAdd) { const el = document.getElementById('pname'); if (el) el.focus(); ui.focusAdd = false; }
  }

  /* ---------- dialogs ---------- */

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="dlg-help">
      <h2>How it works</h2>
      <p><b>Setup</b> the name, format, rounds and time control, then add <b>players</b> and start. Each round:
      check the pairings, start the round, enter results as games finish, then pair the next round.</p>
      <p><b>Scoring.</b> Win 1, draw ½, loss 0. A forfeit counts as a win for the player who turned up.
      In Swiss the bye is worth the points set in Setup; in round robin the bye is a rest round worth 0.</p>
      <p><b>Swiss pairing.</b> Players are grouped by score and the top half of each group plays the bottom half.
      Rematches are avoided, colours are balanced, and the bye goes to the lowest-ranked player who has not had one.</p>
      <p><b>Tiebreaks.</b> Buchholz: sum of opponents' scores (rounds without a game count as your own score).
      Cut-1 drops the lowest. Sonneborn-Berger: scores of opponents you beat, plus half of those you drew.
      Direct encounter: points scored against the other tied players. Wins: games won over the board.</p>
      <p><b>Saving.</b> Everything is saved in this browser as you go, so closing the page is safe.
      Use the file button to export a copy or move the tournament to another device.</p>
      <p><b>Display.</b> Shows the current pairings and standings for a screen or projector.
      Open <a href="#display" target="_blank">this page with #display</a> in a second window and it updates as you enter results.</p>
      <div class="actions"><button class="btn solid" data-act="close">Close</button></div>
    </dialog>
    <dialog id="dlg-data">
      <h2>Tournament file</h2>
      <p>The tournament is saved automatically in this browser. Export it to keep a copy, or import a file you exported earlier.</p>
      <div class="actions">
        <button class="btn" data-act="export">Export</button>
        <button class="btn" data-act="import">Import</button>
        <button class="btn" data-act="quit">Quit tournament</button>
        <button class="btn solid" data-act="close">Close</button>
      </div>
    </dialog>
    <dialog id="dlg-quit">
      <h2>Quit tournament</h2>
      <p>This ends the tournament and permanently deletes all players, pairings and results from this browser.
      Export a copy first if you want to keep it.</p>
      <p>Type <b id="quit-word"></b> to confirm.</p>
      <input type="text" class="confirm-input" id="quit-input" autocomplete="off" spellcheck="false">
      <div class="actions">
        <button class="btn solid" data-act="quit-confirm" id="quit-btn" disabled>Delete tournament</button>
        <button class="btn" data-act="export">Export first</button>
        <button class="btn" data-act="close">Cancel</button>
      </div>
    </dialog>
    <input type="file" id="file" accept=".json,application/json" hidden>`);

  function exportFile() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const slug = (S.name || 'tournament').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament';
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-${S.date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  document.getElementById('file').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then(txt => {
      let data;
      try { data = JSON.parse(txt); } catch (err) { data = null; }
      if (!data || data.v !== 1 || !Array.isArray(data.players) || !Array.isArray(data.rounds)) {
        alert('That file is not a tournament export.');
        return;
      }
      if (!confirm('Replace the current tournament with this file?')) return;
      S = data;
      ui.view = null; ui.sel = null;
      document.getElementById('dlg-data').close();
      commit();
    });
  });

  // the word to type to delete: the tournament's name, or "delete" if it has none
  const quitWord = () => S.name || 'delete';
  document.getElementById('quit-input').addEventListener('input', e => {
    document.getElementById('quit-btn').disabled = e.target.value.trim() !== quitWord();
  });

  /* ---------- actions ---------- */

  function setDisplay(on) {
    display = on;
    if (on) {
      if (location.hash !== '#display') history.replaceState(null, '', '#display');
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    render();
  }
  window.addEventListener('hashchange', () => { if ((location.hash === '#display') !== display) setDisplay(!display); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && display && !document.fullscreenElement) setDisplay(false);
    if (e.key === 'Escape' && ui.sel) { ui.sel = null; render(); }
  });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const d = el.dataset;
    const r = last();
    switch (act) {
      case 'tab': ui.tab = d.v; ui.view = null; ui.sel = null; commit(); window.scrollTo(0, 0); break;
      case 'help': document.getElementById('dlg-help').showModal(); break;
      case 'data': document.getElementById('dlg-data').showModal(); break;
      case 'close': el.closest('dialog').close(); break;
      case 'display': setDisplay(true); break;
      case 'exit': setDisplay(false); break;
      case 'export': exportFile(); break;
      case 'import': document.getElementById('file').click(); break;
      case 'quit': {
        document.querySelectorAll('dialog[open]').forEach(dl => dl.close());
        document.getElementById('quit-word').textContent = quitWord();
        const inp = document.getElementById('quit-input');
        inp.value = '';
        document.getElementById('quit-btn').disabled = true;
        document.getElementById('dlg-quit').showModal();
        inp.focus();
        break;
      }
      case 'quit-confirm':
        if (document.getElementById('quit-input').value.trim() !== quitWord()) return;
        S = fresh(); ui.tab = 'setup'; ui.view = null; ui.sel = null;
        el.closest('dialog').close();
        commit(); window.scrollTo(0, 0);
        break;

      case 'format':
        if (started() || S.format === d.v) return;
        S.format = d.v; S.tiebreaks = E.defaultTiebreaks(d.v); commit(); break;
      case 'bye': S.byePts = Number(d.v); commit(); break;
      case 'tb-up': case 'tb-down': {
        const i = Number(d.i), j = act === 'tb-up' ? i - 1 : i + 1;
        [S.tiebreaks[i], S.tiebreaks[j]] = [S.tiebreaks[j], S.tiebreaks[i]];
        commit(); break;
      }

      case 'remove': S.players = S.players.filter(p => p.id !== Number(d.id)); commit(); break;
      case 'withdraw': {
        const p = player(Number(d.id));
        p.withdrawn = !p.withdrawn;
        if (r && r.status === 'pairing') { E.repair(S); ui.sel = null; }
        commit(); break;
      }
      case 'start':
        if (S.players.length < 2) return;
        E.start(S); ui.tab = 'round'; ui.view = null; commit(); window.scrollTo(0, 0); break;

      case 'view': ui.view = Number(d.i); ui.sel = null; render(); break;
      case 'pick': {
        const pi = Number(d.pi), side = d.side;
        if (!ui.sel) ui.sel = { pi, side };
        else if (ui.sel.pi === pi && ui.sel.side === side) ui.sel = null;
        else {
          const A = r.pairings[ui.sel.pi], B = r.pairings[pi];
          const t = A[ui.sel.side]; A[ui.sel.side] = B[side]; B[side] = t;
          ui.sel = null;
        }
        commit(); break;
      }
      case 'repair': E.repair(S); ui.sel = null; commit(); break;
      case 'begin': r.status = 'playing'; ui.sel = null; commit(); break;
      case 'back':
        if (!confirm(`Discard these pairings and go back to round ${S.rounds.length - 1}?`)) return;
        S.rounds.pop(); last().status = 'playing'; ui.view = null; ui.sel = null; commit(); break;
      case 'res': {
        const round = S.rounds[Number(d.ri)];
        const p = round.pairings[Number(d.pi)];
        if (p.result === d.v) { if (round.status !== 'done') p.result = null; }
        else p.result = d.v;
        commit(); break;
      }
      case 'next':
        if (!E.roundComplete(r)) return;
        r.status = 'done'; S.status = 'running'; E.newRound(S); ui.view = null; commit(); window.scrollTo(0, 0); break;
      case 'finish':
        if (!E.roundComplete(r)) return;
        r.status = 'done'; S.status = 'finished'; ui.tab = 'standings'; commit(); window.scrollTo(0, 0); break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.f) {
      const f = el.dataset.f;
      if (f === 'name') S.name = el.value.trim();
      else if (f === 'tb') S.tiebreaks[Number(el.dataset.i)].on = el.checked;
      else if (f === 'totalRounds') {
        const v = Math.round(Number(el.value));
        S.totalRounds = Math.min(99, Math.max(Math.max(1, S.rounds.length), v || 1));
        if (S.status === 'finished' && S.totalRounds > S.rounds.length) S.status = 'running';
      } else if (f === 'base' || f === 'inc') S[f] = Math.max(0, Number(el.value) || 0);
      commit();
    } else if (el.dataset.pf) {
      const p = player(Number(el.dataset.id));
      if (el.dataset.pf === 'name') { if (el.value.trim()) p.name = el.value.trim(); }
      else p.rating = Math.max(0, Math.round(Number(el.value) || 0));
      commit();
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.id !== 'addf') return;
    e.preventDefault();
    const name = document.getElementById('pname').value.trim();
    if (!name) return;
    const rating = Math.max(0, Math.round(Number(document.getElementById('prating').value) || 0));
    const p = { id: S.nextId++, name, rating, withdrawn: false };
    if (started()) {
      const r = last();
      p.seed = Math.max(0, ...S.players.map(x => x.seed || 0)) + 1;
      p.joined = r.status === 'pairing' ? S.rounds.length - 1 : S.rounds.length;
      S.players.push(p);
      if (r.status === 'pairing') E.repair(S);
    } else S.players.push(p);
    ui.focusAdd = true;
    commit();
  });

  render();
})();
