// Renders the menus page from menu-data.js

function el(tag, className, text) {
  var e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null && text !== '') e.textContent = text;
  return e;
}

// Open on whichever menu is being served right now
function currentMenu() {
  var now = new Date(), d = now.getDay(), h = now.getHours();
  if (h < 17) return d === 0 ? 'sunday' : 'lunch';
  return (d >= 1 && d <= 4) ? 'tea' : 'evening';
}

function render(id) {
  var m = MENUS[id];

  document.querySelectorAll('#tabs .pill').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false');
  });
  document.getElementById('menu-title').textContent = m.label;
  document.getElementById('menu-when').textContent = m.when;
  var note = document.getElementById('menu-note');
  note.textContent = m.note;
  note.hidden = !m.note;
  document.getElementById('sunday-callout').hidden = m.sections.length > 0;
  document.getElementById('allergen-key').hidden = !m.showAllergens;

  var pre = document.getElementById('preorder-callout');
  pre.hidden = PREORDER_MENUS.indexOf(id) === -1;
  document.getElementById('preorder-link').href = 'preorder.html?menu=' + id;

  var photos = document.getElementById('menu-photos');
  photos.innerHTML = '';
  (m.photos || []).forEach(function (p) {
    var img = el('img');
    img.src = p.src; img.alt = p.alt; img.loading = 'lazy';
    photos.appendChild(img);
  });
  photos.hidden = !(m.photos && m.photos.length);

  var grid = document.getElementById('menu-grid');
  grid.innerHTML = '';
  m.sections.forEach(function (s) {
    var sec = el('section');
    sec.appendChild(el('h3', '', s.title));
    if (s.note) sec.appendChild(el('p', 'sec-note', s.note));
    if (s.text) {
      sec.appendChild(el('p', 'list-text', s.text));
    } else {
      var ul = el('ul');
      s.items.forEach(function (i) {
        var li = el('li');
        var row = el('div', 'row');
        row.appendChild(el('span', 'name', i.name + (i.complete ? ' *' : '')));
        var price = formatPrice(i.price);
        if (i.supplement) price = '+£' + i.supplement + ' supplement';
        row.appendChild(el('span', 'price', price));
        li.appendChild(row);
        if (i.desc) li.appendChild(el('p', 'desc', i.desc));
        if (i.extra) li.appendChild(el('p', 'extra', i.extra));
        if (m.showAllergens && i.allergens.length) {
          var a = el('p', 'allergens');
          a.textContent = 'Contains: ' + i.allergens.map(function (c) { return ALLERGENS[c] || c; }).join(', ');
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    grid.appendChild(sec);
  });

  if (history.replaceState) history.replaceState(null, '', '#' + id);
}

var tabs = document.getElementById('tabs');
MENU_ORDER.forEach(function (id) {
  var b = el('button', 'pill', MENUS[id].label);
  b.type = 'button';
  b.dataset.id = id;
  b.addEventListener('click', function () { render(id); });
  tabs.appendChild(b);
});

var fromHash = location.hash.replace('#', '');
render(MENUS[fromHash] ? fromHash : currentMenu());
