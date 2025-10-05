// test-menus.js
const axios = require('axios');

const API = 'https://scenic-inn-website-production.up.railway.app/api';

const MENU_BY_DATETIME = [
  { label: 'Mon 13:00 (Lunch)', date: '2025-10-13', time: '13:00', expectMenuId: 'lunch' },            // Mon
  { label: 'Wed 18:00 (Tea Time)', date: '2025-10-15', time: '18:00', expectMenuId: 'tea-time' },       // Wed
  { label: 'Fri 18:30 (Weekend Evening)', date: '2025-10-17', time: '18:30', expectMenuId: 'weekend-evening' }, // Fri
  { label: 'Sat 19:00 (Weekend Evening)', date: '2025-10-18', time: '19:00', expectMenuId: 'weekend-evening' }, // Sat
  { label: 'Sun 13:00 (Sunday Lunch)', date: '2025-10-19', time: '13:00', expectMenuId: 'sunday-lunch' },       // Sun
  { label: 'Sun 18:00 (Weekend Evening)', date: '2025-10-19', time: '18:00', expectMenuId: 'weekend-evening' }, // Sun evening
];

async function getMenus() {
  const res = await axios.get(`${API}/menus`);
  const payload = Array.isArray(res.data) ? res.data : res.data.data;
  return payload;
}

async function getMenuItems(menuId) {
  const res = await axios.get(`${API}/menus/${menuId}/items`);
  const payload = Array.isArray(res.data) ? res.data : res.data.data;
  return payload;
}

(async () => {
  try {
    console.log('Checking menu list…');
    const menus = await getMenus();
    const menuMap = new Map(menus.map(m => [m.id, m]));
    console.log(`Found menus: ${menus.map(m => m.id).join(', ')}`);

    // Validate each menu has items
    console.log('\nValidating each menu has items…');
    for (const menu of menus) {
      const items = await getMenuItems(menu.id);
      if (!items || items.length === 0) {
        console.error(`❌ ${menu.id} returned 0 items`);
      } else {
        console.log(`✅ ${menu.id} items: ${items.length}`);
      }
    }

    // Simulate date/time mapping → ensure target menu returns items
    console.log('\nSimulating date/time → expected menu checks…');
    for (const test of MENU_BY_DATETIME) {
      const menuId = test.expectMenuId;
      if (!menuMap.has(menuId)) {
        console.error(`❌ ${test.label} expected menu ${menuId} not found in /menus`);
        continue;
      }
      const items = await getMenuItems(menuId);
      if (!items || items.length === 0) {
        console.error(`❌ ${test.label} (${menuId}) has 0 items`);
      } else {
        console.log(`✅ ${test.label} (${menuId}) OK with ${items.length} items`);
      }
    }

    console.log('\nDone.');
  } catch (e) {
    console.error('Test failed:', e.response?.data || e.message);
  }
})();