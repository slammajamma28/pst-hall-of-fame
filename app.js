const data = window.HOF_DATA;
const forumUrl = data.forumUrl;
const sports = data.sports;
const overall = sports.find(s => s.id === 'overall');
let activeSport = 'overall';
let activeLeague = 'overall';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
const total = player => player.gold + player.silver + player.bronze;
const medalNames = ['gold', 'silver', 'bronze'];
const topicLinks = window.PST_TOPIC_LINKS || {};
const leagueHref = (sport, name) => topicLinks[`${sport}|${name}`] || forumUrl;

function rankRows(rows) { return rows.map((row, index) => ({ ...row, rank: index + 1 })); }
function renderStats() {
  const podiums = sports.reduce((sum, sport) => sum + sport.leagues.reduce((count, league) => count + [league.gold, league.silver, league.bronze].filter(Boolean).length, 0), 0);
  $('#hero-count').textContent = podiums.toLocaleString();
  $('#stats').innerHTML = [[overall.leaders.length, 'overall players'], [sports.reduce((n, s) => n + s.leagues.length, 0), 'leagues tracked'], [podiums, 'podium finishes'], [sports.length - 1, 'sports represented']].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}
function tabHtml(list, selected) { return list.map(sport => `<button class="tab ${sport.id === selected ? 'active' : ''}" data-sport="${sport.id}" role="tab">${esc(sport.name)}${sport.id !== 'overall' ? `<span class="tab-count">${sport.leagues.length}</span>` : ''}</button>`).join(''); }
function renderSportTabs() {
  $('#sport-tabs').innerHTML = tabHtml(sports, activeSport);
  $('#league-tabs').innerHTML = tabHtml(sports, activeLeague);
  document.querySelectorAll('#sport-tabs .tab').forEach(button => button.onclick = () => { activeSport = button.dataset.sport; renderLeaderboards(); });
  document.querySelectorAll('#league-tabs .tab').forEach(button => button.onclick = () => { activeLeague = button.dataset.sport; renderLeagues(); });
}
function renderLeaderboards() {
  renderSportTabs();
  const sport = sports.find(item => item.id === activeSport) || overall;
  const query = ($('#leaderboard-filter').value || '').trim().toLowerCase();
  const rows = rankRows(sport.leaders.filter(player => player.name.toLowerCase().includes(query)));
  $('#leaderboard-label').textContent = `${sport.name} · ${sport.leaders.length} players`;
  $('#leaderboard-body').innerHTML = rows.length ? rows.map(row => `<tr><td>${row.rank}</td><td>${esc(row.name)}</td><td class="medal gold">${row.gold}</td><td class="medal silver">${row.silver}</td><td class="medal bronze">${row.bronze}</td><td class="total">${total(row)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">No players match that filter.</td></tr>';
}
function renderLeagues() {
  renderSportTabs();
  const base = sports.find(item => item.id === activeLeague) || overall;
  const leagueSource = activeLeague === 'overall' ? sports.filter(sport => sport.id !== 'overall').flatMap(sport => sport.leagues.map(league => ({ ...league, sport: sport.name }))) : base.leagues.map(league => ({ ...league, sport: base.name }));
  const query = ($('#league-filter').value || '').trim().toLowerCase();
  const list = leagueSource.filter(league => `${league.name} ${league.sport} ${league.gold} ${league.silver} ${league.bronze}`.toLowerCase().includes(query));
  $('#league-grid').innerHTML = list.length ? list.map(league => `<article class="league-card"><div class="league-title"><a href="${leagueHref(league.sport, league.name)}" target="_blank" rel="noreferrer">${esc(league.name)} ↗</a><span class="league-meta">${esc(league.sport)}</span></div><div class="podium">${[['gold', '1st', league.gold], ['silver', '2nd', league.silver], ['bronze', '3rd', league.bronze]].map(([medal, label, player]) => `<div class="podium-slot"><small class="${medal}">${label}</small><span>${esc(player || '—')}</span></div>`).join('')}</div></article>`).join('') : '<div class="empty-state">No leagues match that search.</div>';
}
function allPodiumsFor(name) {
  const needle = name.toLowerCase();
  return sports.filter(sport => sport.id !== 'overall').flatMap(sport => sport.leagues.flatMap(league => medalNames.flatMap(medal => String(league[medal] || '').toLowerCase() === needle ? [{ sport: sport.name, league: league.name, medal }] : [])));
}
function playerStats(name) {
  const needle = name.toLowerCase();
  return sports.map(sport => { const row = sport.leaders.find(player => player.name.toLowerCase() === needle); return row ? { sport: sport.name, ...row } : null; }).filter(Boolean);
}
function renderPlayerSearch() {
  const query = ($('#player-search').value || '').trim();
  const box = $('#player-results');
  if (!query) { box.className = 'player-results empty-state'; box.innerHTML = '<p>Start typing a username above.</p>'; return; }
  const matches = overall.leaders.filter(player => player.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  if (!matches.length) { box.className = 'player-results empty-state'; box.innerHTML = '<p>No player found. Try a different spelling.</p>'; return; }
  box.className = 'player-results';
  box.innerHTML = matches.map(player => {
    const stats = playerStats(player.name);
    const podiums = allPodiumsFor(player.name);
    const rank = overall.leaders.findIndex(row => row.name.toLowerCase() === player.name.toLowerCase()) + 1;
    return `<article class="player-card"><div class="player-head"><div><p class="eyebrow">Overall leaderboard</p><h3>${esc(player.name)}</h3></div><div class="player-rank">#${rank} overall</div></div><div class="player-sport"><strong>Overall</strong><span class="gold">Gold ${player.gold}</span><span class="silver">Silver ${player.silver}</span><span class="bronze">Bronze ${player.bronze}</span><span>Total ${total(player)}</span></div>${stats.filter(stat => stat.sport !== 'Overall').map(stat => `<div class="player-sport"><strong>${esc(stat.sport)}</strong><span class="gold">Gold ${stat.gold}</span><span class="silver">Silver ${stat.silver}</span><span class="bronze">Bronze ${stat.bronze}</span><span>Total ${total(stat)}</span></div>`).join('')}<div class="result-leagues">${podiums.length ? podiums.map(result => `<a class="result-league" href="${leagueHref(result.sport, result.league)}" target="_blank" rel="noreferrer"><b class="${result.medal}">${result.medal.toUpperCase()}</b>${esc(result.league)} · ${esc(result.sport)} ↗</a>`).join('') : '<span class="result-league">No podium finishes listed</span>'}</div></article>`;
  }).join('');
}
$('#leaderboard-filter').addEventListener('input', renderLeaderboards);
$('#league-filter').addEventListener('input', renderLeagues);
$('#player-search').addEventListener('input', renderPlayerSearch);
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#player-search').focus(); $('#search').scrollIntoView({ behavior: 'smooth' }); } });
renderStats();
renderLeaderboards();
renderLeagues();
