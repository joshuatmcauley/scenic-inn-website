# The Scenic Inn website

Static website for The Scenic Inn, a family-run bar and restaurant near the Dark Hedges, Armoy.

## Pages
- `index.html`: home page
- `menus.html` + `menus.js`: menus page
- `book.html` + `book.js`: table booking. Groups of 11+ go on to the group preorder.
- `preorder.html?type=party` (Large party tab): 11+ guests choose a buffet, or everyone preorders their own meal
- `preorder.html?type=event` (Events tab): event booking with a buffet
- `preorder.js`: logic for both
- `menu-data.js`: **every menu, price and allergen lives here.** Edit this one file to change a menu.
- `config.js`: where bookings and preorders are sent (the Railway backend from the scenic-inn-website repo)
- `styles.css`: all styling

## How bookings and preorders are sent
Both post to `SCENIC_API + '/booking-submission'` (see `config.js`), the existing endpoint in
`scenic-inn-website/backend/routes/booking-submission.js`. For preorders it emails the restaurant
a PDF with every guest's choices. If the backend can't be reached, the preorder page offers
to email the order instead, and the organiser can print it or download a spreadsheet.

## Still to fill in
- Buffet menu: `BUFFET` in `menu-data.js` (the old site loaded it from the live database)
- Check Sunday lunch prices in `menu-data.js` (taken from the old booking system)
- Sunday lunch menu (`menu-data.js`)
- Christmas booking dates: `CHRISTMAS_DATES` in `menu-data.js` (currently all of November and December)
- Facebook and Instagram links (`index.html` footer)
