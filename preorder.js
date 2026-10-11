// =====================================================================
// THE SCENIC INN – GROUP PREORDER
// Menus come from menu-data.js. Orders are sent to the Railway backend
// (config.js -> SCENIC_API + '/booking-submission'), which emails the
// restaurant a PDF with every guest's choices.
// =====================================================================

var STORE_KEY = 'scenic-preorder-v2';
var COURSES = [
  { key: 'starter', label: 'Starter' },
  { key: 'main', label: 'Main course' },
  { key: 'dessert', label: 'Dessert' }
];
var AVOID_CODES = ['G', 'D', 'N', 'E', 'F', 'C', 'SES', 'SY', 'M', 'S'];
var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function blankGuest() { return { name: '', starter: null, main: null, side: null, dessert: null, notes: '', avoid: [] }; }

var state = load() || {
  step: 1, menuId: null, date: '', time: '', occasion: '', requests: '',
  organiser: { first: '', last: '', email: '', phone: '' },
  guests: [], current: 0
};

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }
function h(tag, attrs, kids) {
  var e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) {
    if (k === 'text') e.textContent = attrs[k];
    else if (k === 'class') e.className = attrs[k];
    else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] === true) e.setAttribute(k, '');
    else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
  });
  (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; } }
function menu() { return MENUS[state.menuId]; }
function sectionsFor(course) { return menu().sections.filter(function (s) { return s.course === course; }); }
function findItem(course, name) {
  if (!name) return null;
  var found = null;
  sectionsFor(course).forEach(function (s) { s.items.forEach(function (i) { if (i.name === name) found = i; }); });
  return found;
}
function hasCourse(course) { return sectionsFor(course).length > 0; }
function guestLabel(i) { var g = state.guests[i]; return g.name.trim() || ('Guest ' + (i + 1)); }
function parseDate(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function niceDate(s) { var d = parseDate(s); return d ? DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] : ''; }
function niceTime(t) {
  if (!t) return '';
  var p = t.split(':'), hh = +p[0], mm = p[1];
  return (hh > 12 ? hh - 12 : hh) + ':' + mm + (hh >= 12 ? 'pm' : 'am');
}
function money(n) { return '£' + n.toFixed(2); }

// ---------- menu availability ----------
function menuAvailability(id, dateStr) {
  var m = MENUS[id];
  var d = parseDate(dateStr);
  if (!d) return { ok: true };
  if (m.christmas) {
    var from = parseDate(CHRISTMAS_DATES.from), to = parseDate(CHRISTMAS_DATES.to);
    if (d < from || d > to) return { ok: false, why: 'Only for ' + niceDate(CHRISTMAS_DATES.from) + ' to ' + niceDate(CHRISTMAS_DATES.to) };
    return { ok: true };
  }
  if (m.days && m.days.indexOf(d.getDay()) === -1) return { ok: false, why: m.when.split(',')[0] + ' only' };
  return { ok: true };
}
function timeOptions(id) {
  var m = MENUS[id], out = [];
  if (!m || !m.times) return out;
  var a = m.times[0].split(':'), b = m.times[1].split(':');
  for (var t = (+a[0]) * 60 + (+a[1]); t <= (+b[0]) * 60 + (+b[1]); t += 30) {
    var hh = Math.floor(t / 60), mm = t % 60;
    out.push((hh < 10 ? '0' : '') + hh + ':' + (mm ? mm : '00'));
  }
  return out;
}

// ---------- guest rules ----------
function chosenCourses(g) { return COURSES.filter(function (c) { return g[c.key]; }).length; }
function guestProblems(g) {
  var m = menu(), out = [];
  if (!g.main) out.push('a main course');
  var main = findItem('main', g.main);
  if (main && main.side && !g.side) out.push('a side');
  if (g.main && m.minCourses > 1 && chosenCourses(g) < m.minCourses) out.push('a starter or dessert, as tea time is two or three courses');
  return out;
}
function guestPrice(g) {
  var m = menu(), total = 0;
  if (m.setPrice) {
    var n = chosenCourses(g);
    if (!n) return 0;
    var keys = Object.keys(m.setPrice).map(Number).sort();
    var use = Math.max(keys[0], Math.min(n, keys[keys.length - 1]));
    total = m.setPrice[use];
    var main = findItem('main', g.main);
    if (main && main.supplement) total += main.supplement;
    return total;
  }
  COURSES.forEach(function (c) { var it = findItem(c.key, g[c.key]); if (it && it.price) total += it.price; });
  return total;
}
function readyCount() { return state.guests.filter(function (g) { return guestProblems(g).length === 0; }).length; }
function sideList() { return menu().sides || SIDES_EVENING; }

// =====================================================================
// STEP 1
// =====================================================================
function renderMenuCards() {
  var box = $('menu-cards'); box.innerHTML = '';
  PREORDER_MENUS.forEach(function (id) {
    var m = MENUS[id], avail = menuAvailability(id, state.date);
    var price = m.setPrice
      ? Object.keys(m.setPrice).map(function (k) { return k + (k === '1' ? ' course ' : ' courses ') + formatPrice(m.setPrice[k]); }).join(', ')
      : 'Priced per dish';
    var input = h('input', { type: 'radio', name: 'po-menu', value: id, checked: state.menuId === id });
    input.addEventListener('change', function () { chooseMenu(id); });
    var card = h('label', { class: 'menu-card' + (avail.ok ? '' : ' unavailable') }, [
      input,
      h('span', { class: 'mc-name', text: m.label }),
      h('span', { class: 'mc-when', text: m.christmas ? 'Christmas parties and nights out' : m.when }),
      h('span', { class: 'mc-price', text: price }),
      avail.ok ? null : h('span', { class: 'mc-why', text: avail.why + ', so not available on your date' })
    ]);
    box.appendChild(card);
  });
}

function chooseMenu(id) {
  if (state.menuId && state.menuId !== id && state.guests.some(function (g) { return g.starter || g.main || g.dessert; })) {
    if (!confirm('Switching menu clears the food chosen so far. Names and notes are kept. Switch to ' + MENUS[id].label + '?')) {
      renderMenuCards(); return;
    }
    state.guests.forEach(function (g) { g.starter = g.main = g.side = g.dessert = null; });
  }
  state.menuId = id;
  renderTimes(); renderMenuCards(); checkMenuMsg(); save();
}

function renderTimes() {
  var sel = $('po-time'); sel.innerHTML = '';
  var opts = timeOptions(state.menuId);
  sel.appendChild(h('option', { value: '', text: opts.length ? 'Choose a time' : 'Choose a menu first' }));
  opts.forEach(function (t) { sel.appendChild(h('option', { value: t, text: niceTime(t), selected: t === state.time })); });
  if (opts.indexOf(state.time) === -1) state.time = '';
}

function checkMenuMsg() {
  var msg = $('menu-msg');
  if (state.menuId && state.date) {
    var a = menuAvailability(state.menuId, state.date);
    msg.hidden = a.ok;
    msg.textContent = a.ok ? '' : 'The ' + MENUS[state.menuId].label + ' menu isn’t served on ' + niceDate(state.date) + '. Pick another date or menu, or call us on ' + SCENIC_PHONE + '.';
  } else msg.hidden = true;
}

function fillStep1() {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  $('po-date').min = today.toISOString().slice(0, 10);
  $('po-date').value = state.date;
  $('po-guests').value = state.guests.length || '';
  $('po-occasion').value = state.occasion;
  $('po-requests').value = state.requests;
  $('po-first').value = state.organiser.first;
  $('po-last').value = state.organiser.last;
  $('po-email').value = state.organiser.email;
  $('po-phone').value = state.organiser.phone;
  renderMenuCards(); renderTimes(); checkMenuMsg();
}

function bindStep1() {
  $('po-date').addEventListener('change', function () { state.date = this.value; renderMenuCards(); checkMenuMsg(); save(); });
  $('po-time').addEventListener('change', function () { state.time = this.value; save(); });
  $('po-guests').addEventListener('change', function () { setGuestCount(parseInt(this.value, 10) || 0); save(); });
  [['po-occasion', 'occasion'], ['po-requests', 'requests']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { state[p[1]] = this.value; save(); });
  });
  [['po-first', 'first'], ['po-last', 'last'], ['po-email', 'email'], ['po-phone', 'phone']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { state.organiser[p[1]] = this.value; save(); });
  });
  $('to-step-2').addEventListener('click', function () {
    var err = step1Error();
    $('s1-error').hidden = !err; $('s1-error').textContent = err || '';
    if (!err) go(2);
  });
}

function setGuestCount(n) {
  n = Math.max(0, Math.min(80, n));
  while (state.guests.length < n) state.guests.push(blankGuest());
  while (state.guests.length > n) {
    var last = state.guests[state.guests.length - 1];
    if ((last.starter || last.main || last.name) && !confirm('Remove ' + guestLabel(state.guests.length - 1) + ' and their choices?')) {
      $('po-guests').value = state.guests.length; return;
    }
    state.guests.pop();
  }
  if (state.current >= state.guests.length) state.current = Math.max(0, state.guests.length - 1);
}

function step1Error() {
  if (!state.menuId) return 'Choose a menu.';
  if (!state.date) return 'Choose a date.';
  if (!menuAvailability(state.menuId, state.date).ok) return 'That menu isn’t served on your date.';
  if (!state.time) return 'Choose a time.';
  if (state.guests.length < 2) return 'Enter how many guests are coming (at least 2).';
  var o = state.organiser;
  if (!o.first.trim() || !o.last.trim()) return 'Enter the organiser’s name.';
  if (!/^\S+@\S+\.\S+$/.test(o.email.trim())) return 'Enter a valid email address.';
  if (o.phone.replace(/\D/g, '').length < 7) return 'Enter a phone number.';
  return '';
}

// =====================================================================
// STEP 2
// =====================================================================
function renderGuestList() {
  var list = $('guest-list'); list.innerHTML = '';
  state.guests.forEach(function (g, i) {
    var problems = guestProblems(g);
    var summary = [g.starter, g.main, g.dessert].filter(Boolean).join(', ') || 'Nothing chosen yet';
    var btn = h('button', {
      type: 'button', class: 'guest-btn' + (i === state.current ? ' current' : '') + (problems.length ? '' : ' ready'),
      'aria-current': i === state.current ? 'true' : 'false',
      onclick: function () { state.current = i; save(); renderGuestList(); renderEditor(); scrollEditor(); }
    }, [
      h('span', { class: 'status', 'aria-hidden': 'true', text: problems.length ? String(i + 1) : '✓' }),
      h('span', { class: 'gtext' }, [
        h('span', { class: 'gname', text: guestLabel(i) }),
        h('span', { class: 'gsum', text: summary })
      ]),
      h('span', { class: 'visually-hidden', text: problems.length ? ', still needs ' + problems.join(' and ') : ', ready' })
    ]);
    list.appendChild(h('li', null, [btn]));
  });
  var ready = readyCount(), total = state.guests.length;
  $('guest-progress').textContent = ready + ' of ' + total + ' guests ready';
  $('guest-bar').style.width = (total ? (ready / total) * 100 : 0) + '%';
}

function renderEditor() {
  var g = state.guests[state.current], m = menu();
  $('editor-label').textContent = 'Guest ' + (state.current + 1) + ' of ' + state.guests.length;
  $('guest-name').value = g.name;
  $('guest-notes').value = g.notes;
  $('prev-guest').disabled = state.current === 0;
  $('copy-prev').hidden = state.current === 0;
  $('next-guest').textContent = state.current === state.guests.length - 1 ? 'Check the order' : 'Next guest';

  // Allergen filter (only menus that list allergens)
  $('avoid-box').hidden = !m.showAllergens;
  var chips = $('avoid-chips'); chips.innerHTML = '';
  if (m.showAllergens) AVOID_CODES.forEach(function (code) {
    var cb = h('input', { type: 'checkbox', checked: g.avoid.indexOf(code) !== -1 });
    cb.addEventListener('change', function () {
      if (this.checked) g.avoid.push(code); else g.avoid = g.avoid.filter(function (c) { return c !== code; });
      save(); flagDishes();
    });
    chips.appendChild(h('label', { class: 'chip' }, [cb, ALLERGENS[code]]));
  });

  // Courses
  var box = $('courses'); box.innerHTML = '';
  COURSES.forEach(function (c) {
    if (!hasCourse(c.key)) return;
    var required = c.key === 'main';
    var fs = h('fieldset', { class: 'course' }, [
      h('legend', null, [c.label + ' ', h('span', { class: 'hint', text: required ? 'Required' : 'Optional' })])
    ]);
    var grid = h('div', { class: 'dishes' });
    if (!required) grid.appendChild(dishOption(c.key, null, g));
    sectionsFor(c.key).forEach(function (s) {
      if (sectionsFor(c.key).length > 1) grid.appendChild(h('p', { class: 'dish-group', text: s.title }));
      s.items.forEach(function (it) { grid.appendChild(dishOption(c.key, it, g)); });
    });
    fs.appendChild(grid);
    if (c.key === 'main') fs.appendChild(h('div', { id: 'side-slot' }));
    box.appendChild(fs);
  });
  renderSide(); flagDishes(); updatePrice();
}

function dishOption(course, it, g) {
  var m = menu();
  var input = h('input', { type: 'radio', name: 'dish-' + course, value: it ? it.name : '', checked: it ? g[course] === it.name : !g[course] });
  input.addEventListener('change', function () {
    g[course] = it ? it.name : null;
    if (course === 'main') { var mi = findItem('main', g.main); if (!mi || !mi.side) g.side = null; renderSide(); }
    save(); renderGuestList(); updatePrice();
  });
  if (!it) return h('label', { class: 'dish none' }, [input, h('span', { class: 'dname', text: 'No ' + (course === 'starter' ? 'starter' : 'dessert') })]);
  var price = '';
  if (!m.setPrice && it.price) price = formatPrice(it.price);
  if (it.supplement) price = '+£' + it.supplement;
  return h('label', { class: 'dish', 'data-allergens': it.allergens.join(' ') }, [
    input,
    h('span', { class: 'dtop' }, [h('span', { class: 'dname', text: it.name }), price ? h('span', { class: 'dprice', text: price }) : null]),
    it.desc ? h('span', { class: 'ddesc', text: it.desc }) : null,
    h('span', { class: 'dflag' })
  ]);
}

function renderSide() {
  var slot = $('side-slot'); if (!slot) return;
  slot.innerHTML = '';
  var g = state.guests[state.current], main = findItem('main', g.main);
  if (!main || !main.side) return;
  var sel = h('select', { id: 'side-select' });
  sel.appendChild(h('option', { value: '', text: 'Choose a side' }));
  sideList().forEach(function (s) { sel.appendChild(h('option', { value: s, text: s, selected: g.side === s })); });
  sel.addEventListener('change', function () { g.side = this.value || null; save(); renderGuestList(); });
  slot.appendChild(h('label', { class: 'field side-field' }, ['Side with the ' + main.name.toLowerCase(), sel]));
}

function flagDishes() {
  var g = state.guests[state.current];
  document.querySelectorAll('#courses .dish[data-allergens]').forEach(function (d) {
    var codes = d.getAttribute('data-allergens').split(' ').filter(Boolean);
    var hits = codes.filter(function (c) { return g.avoid.indexOf(c) !== -1; });
    d.classList.toggle('flagged', hits.length > 0);
    d.querySelector('.dflag').textContent = hits.length ? 'Contains ' + hits.map(function (c) { return ALLERGENS[c].toLowerCase(); }).join(', ') : '';
  });
}

function updatePrice() {
  var g = state.guests[state.current], m = menu(), n = chosenCourses(g), p = guestPrice(g);
  var txt = m.setPrice ? (n ? n + (n === 1 ? ' course, ' : ' courses, ') + money(p) : 'No courses chosen yet') : (p ? money(p) : '');
  $('editor-price').textContent = txt;
}

function scrollEditor() {
  var top = $('guest-editor').getBoundingClientRect().top + window.scrollY - 16;
  if (window.innerWidth < 900) window.scrollTo({ top: top, behavior: 'smooth' });
}

function bindStep2() {
  $('guest-name').addEventListener('input', function () { state.guests[state.current].name = this.value; save(); renderGuestList(); });
  $('guest-notes').addEventListener('input', function () { state.guests[state.current].notes = this.value; save(); });
  $('prev-guest').addEventListener('click', function () { if (state.current > 0) { state.current--; save(); renderGuestList(); renderEditor(); scrollEditor(); } });
  $('next-guest').addEventListener('click', function () {
    if (state.current < state.guests.length - 1) { state.current++; save(); renderGuestList(); renderEditor(); scrollEditor(); }
    else go(3);
  });
  $('copy-prev').addEventListener('click', function () {
    var prev = state.guests[state.current - 1], g = state.guests[state.current];
    g.starter = prev.starter; g.main = prev.main; g.side = prev.side; g.dessert = prev.dessert;
    save(); renderGuestList(); renderEditor();
  });
  $('add-guest').addEventListener('click', function () {
    state.guests.push(blankGuest()); state.current = state.guests.length - 1;
    $('po-guests').value = state.guests.length; save(); renderGuestList(); renderEditor(); scrollEditor();
  });
}

// =====================================================================
// STEP 3
// =====================================================================
function renderReview() {
  var m = menu(), o = state.organiser;
  $('review-event').textContent = m.label + ' menu for ' + state.guests.length + ' guests, ' + niceDate(state.date) + ' at ' + niceTime(state.time) +
    '. Organised by ' + o.first + ' ' + o.last + (state.occasion ? ' (' + state.occasion + ')' : '') + '.';

  // Problems
  var probs = [];
  state.guests.forEach(function (g, i) { var p = guestProblems(g); if (p.length) probs.push({ i: i, text: guestLabel(i) + ' needs ' + p.join(' and ') }); });
  $('problems').hidden = !probs.length;
  var pl = $('problem-list'); pl.innerHTML = '';
  probs.forEach(function (p) {
    pl.appendChild(h('li', null, [p.text + ' ', h('button', { type: 'button', class: 'link-btn', text: 'Choose now', onclick: function () { state.current = p.i; go(2); } })]));
  });

  // Kitchen tallies
  var k = $('kitchen'); k.innerHTML = '';
  COURSES.concat([{ key: 'side', label: 'Sides' }]).forEach(function (c) {
    var counts = {};
    state.guests.forEach(function (g) { if (g[c.key]) counts[g[c.key]] = (counts[g[c.key]] || 0) + 1; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    if (!names.length) return;
    var total = names.reduce(function (a, n) { return a + counts[n]; }, 0);
    var ul = h('ul');
    names.forEach(function (n) { ul.appendChild(h('li', null, [h('span', { class: 'kc', text: counts[n] + '×' }), ' ' + n])); });
    k.appendChild(h('div', { class: 'kitchen-col' }, [h('h4', { text: c.label + ' (' + total + ')' }), ul]));
  });

  // Guest table
  var t = $('guest-table'); t.innerHTML = '';
  var cols = COURSES.filter(function (c) { return hasCourse(c.key); });
  var head = h('tr', null, [h('th', { scope: 'col', text: '#' }), h('th', { scope: 'col', text: 'Guest' })]
    .concat(cols.map(function (c) { return h('th', { scope: 'col', text: c.label }); }))
    .concat([h('th', { scope: 'col', text: 'Notes' }), h('th', { scope: 'col', class: 'num', text: 'Price' })]));
  t.appendChild(h('thead', null, [head]));
  var body = h('tbody');
  var total = 0;
  state.guests.forEach(function (g, i) {
    var p = guestPrice(g); total += p;
    var cells = [h('td', { text: String(i + 1) }), h('th', { scope: 'row', text: guestLabel(i) })];
    cols.forEach(function (c) {
      var v = g[c.key] || '';
      if (c.key === 'main' && g.side) v += ' with ' + g.side.toLowerCase();
      cells.push(h('td', { class: v ? '' : 'missing', text: v || (c.key === 'main' ? 'Not chosen' : '–') }));
    });
    var notes = g.notes;
    if (g.avoid.length) notes = 'Avoiding ' + g.avoid.map(function (c) { return ALLERGENS[c].toLowerCase(); }).join(', ') + (notes ? '. ' + notes : '');
    cells.push(h('td', { text: notes || '' }));
    cells.push(h('td', { class: 'num', text: p ? money(p) : '' }));
    body.appendChild(h('tr', null, cells));
  });
  t.appendChild(body);
  $('est-total').textContent = money(total);
}

// ---------- outputs ----------
function payload() {
  var m = menu(), o = state.organiser;
  var total = state.guests.reduce(function (a, g) { return a + guestPrice(g); }, 0);
  var extras = ['Menu: ' + m.label];
  if (state.occasion) extras.push('Occasion: ' + state.occasion);
  extras.push('Estimated food total: ' + money(total));
  if (state.requests) extras.push(state.requests);
  return {
    bookingData: {
      firstName: o.first.trim(), lastName: o.last.trim(), email: o.email.trim(), phone: o.phone.trim(),
      date: state.date, time: state.time, partySize: state.guests.length,
      menu_name: m.label, specialRequests: extras.join('. '), source: 'website-preorder'
    },
    preorderData: state.guests.map(function (g, i) {
      var items = [];
      COURSES.forEach(function (c) { if (g[c.key]) items.push({ course_type: c.key, item_name: g[c.key] }); });
      if (g.side) items.push({ course_type: 'side', item_name: g.side });
      var notes = g.notes;
      if (g.avoid.length) notes = 'Avoiding ' + g.avoid.map(function (c) { return ALLERGENS[c].toLowerCase(); }).join(', ') + (notes ? '. ' + notes : '');
      return { person_number: i + 1, person_name: guestLabel(i), special_instructions: notes, items: items };
    })
  };
}

function plainText() {
  var p = payload(), b = p.bookingData, lines = [];
  lines.push('Group preorder: ' + b.menu_name + ' menu');
  lines.push(niceDate(state.date) + ' at ' + niceTime(state.time) + ', ' + b.partySize + ' guests');
  lines.push('Organiser: ' + b.firstName + ' ' + b.lastName + ', ' + b.phone + ', ' + b.email);
  if (state.occasion) lines.push('Occasion: ' + state.occasion);
  if (state.requests) lines.push('Notes: ' + state.requests);
  lines.push('');
  p.preorderData.forEach(function (g) {
    lines.push(g.person_number + '. ' + g.person_name + ': ' + g.items.map(function (i) { return i.item_name; }).join(' / ') + (g.special_instructions ? ' (' + g.special_instructions + ')' : ''));
  });
  return lines.join('\n');
}

function downloadCsv() {
  var cols = COURSES.filter(function (c) { return hasCourse(c.key); });
  var rows = [['#', 'Guest'].concat(cols.map(function (c) { return c.label; })).concat(['Side', 'Notes', 'Price'])];
  state.guests.forEach(function (g, i) {
    rows.push([i + 1, guestLabel(i)].concat(cols.map(function (c) { return g[c.key] || ''; }))
      .concat([g.side || '', payload().preorderData[i].special_instructions || '', guestPrice(g).toFixed(2)]));
  });
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  var a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'scenic-inn-preorder-' + state.date + '.csv' });
  document.body.appendChild(a); a.click(); a.remove();
}

function send() {
  var btn = $('send-btn'), err = $('send-error');
  btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true;
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
  fetch(SCENIC_API + '/booking-submission', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload()), signal: ctrl ? ctrl.signal : undefined
  }).then(function (res) {
    clearTimeout(timer);
    if (!res.ok) throw new Error('Server replied ' + res.status);
    $('sent-line').textContent = 'Thanks ' + state.organiser.first + '. ' + state.guests.length + ' guests, ' + niceDate(state.date) + ' at ' + niceTime(state.time) + ', ' + menu().label + ' menu.';
    state.sent = true; save(); go(4);
  }).catch(function () {
    clearTimeout(timer);
    btn.disabled = false; btn.textContent = 'Try sending again';
    err.hidden = false; err.innerHTML = '';
    var mail = 'mailto:' + SCENIC_EMAIL + '?subject=' + encodeURIComponent('Group preorder, ' + niceDate(state.date)) + '&body=' + encodeURIComponent(plainText());
    err.appendChild(document.createTextNode('The preorder didn’t go through. Your choices are still saved here. You can '));
    err.appendChild(h('a', { href: mail, text: 'email it to us instead' }));
    err.appendChild(document.createTextNode(' or call ' + SCENIC_PHONE + '.'));
  });
}

// =====================================================================
// NAVIGATION
// =====================================================================
function go(step) {
  if (step >= 2 && step1Error()) step = 1;
  state.step = step; save();
  document.querySelectorAll('[data-po-step]').forEach(function (s) { s.hidden = Number(s.getAttribute('data-po-step')) !== step; });
  document.querySelectorAll('#po-steps li').forEach(function (li, i) {
    li.className = i + 1 === step ? 'current' : (i + 1 < step ? 'done' : '');
  });
  $('po-steps').hidden = step === 4;
  if (step === 1) fillStep1();
  if (step === 2) { $('share-menu').href = 'menus.html#' + state.menuId; renderGuestList(); renderEditor(); }
  if (step === 3) renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reset() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  location.href = 'preorder.html';
}

// ---------- start ----------
(function init() {
  var params = new URLSearchParams(location.search);
  // Arriving from book.html with a large party
  try {
    var fromBooking = JSON.parse(sessionStorage.getItem('scenic-booking'));
    if (fromBooking && params.get('from') === 'booking') {
      state = { step: 1, menuId: null, date: fromBooking.date, time: fromBooking.time, occasion: '', requests: fromBooking.requests || '',
        organiser: { first: fromBooking.firstName || '', last: fromBooking.lastName || '', email: fromBooking.email || '', phone: fromBooking.phone || '' },
        guests: [], current: 0 };
      for (var i = 0; i < fromBooking.guests; i++) state.guests.push(blankGuest());
      PREORDER_MENUS.some(function (id) { if (menuAvailability(id, state.date).ok && timeOptions(id).indexOf(state.time) !== -1) { state.menuId = id; return true; } return false; });
      sessionStorage.removeItem('scenic-booking');
    }
  } catch (e) {}
  if (params.get('menu') && MENUS[params.get('menu')] && !state.menuId) state.menuId = params.get('menu');
  if (state.sent) { state = { step: 1, menuId: state.menuId, date: '', time: '', occasion: '', requests: '', organiser: state.organiser, guests: [], current: 0 }; }

  bindStep1(); bindStep2();
  document.querySelectorAll('[data-po-go]').forEach(function (b) { b.addEventListener('click', function () { go(Number(b.getAttribute('data-po-go'))); }); });
  $('print-btn').addEventListener('click', function () { window.print(); });
  $('csv-btn').addEventListener('click', downloadCsv);
  $('send-btn').addEventListener('click', send);
  $('start-over').addEventListener('click', function () { if (confirm('Clear this preorder and start again?')) reset(); });
  $('new-preorder').addEventListener('click', reset);
  go(state.step === 4 ? 1 : (state.step || 1));
})();
