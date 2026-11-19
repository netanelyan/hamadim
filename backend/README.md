# Orders sheet

Every time someone presses "שליחה בוואטסאפ" in the quote builder, the site saves the request as a row in a Google Sheet. The same request number goes into the WhatsApp message, so you can match each chat to its row.

The site stays on GitHub Pages. The backend is a Google Apps Script attached to the sheet, so there's no server to pay for or maintain. Until you finish step 5, the quote builder only opens WhatsApp, the same as before.

## Setup (about 10 minutes)

1. In the business Google account, create a new Google Sheet. Call it something like "המדים - הזמנות".
2. In the sheet, open **Extensions → Apps Script**. Delete the code that's there, paste in all of [`Code.gs`](Code.gs) and save.
3. In the function list at the top choose `setup` and press **Run**. Google will ask for permission to edit this one spreadsheet. Because it's your own script, it shows an "unverified app" warning: press **Advanced**, then **Go to … (unsafe)**. When it's done, the sheet has a "הזמנות" tab with all the columns.
4. Press **Deploy → New deployment**, choose **Web app** and set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Press **Deploy** and copy the **Web app URL** (it ends in `/exec`). Opening that URL in a browser should show `OK`.
5. In `index.html`, find `data-orders-endpoint=""`, paste the URL between the quotes, then commit and push.
6. Test it: open the live site, fill in the quote builder and press send. A new row should show up in the sheet within a few seconds.

## The sheet

| Columns | Filled by |
|---|---|
| מספר בקשה, תאריך, מועדון, the four quantities, סה״כ יחידות | The site |
| סטטוס | Starts as "בקשה חדשה". Change it from the dropdown as the order moves along. |
| איש קשר, טלפון, סכום (₪), חשבונית Morning, הערות | You |

Orders that come straight from WhatsApp can go in the same sheet. Add a row by hand and leave מספר בקשה empty.

## Good to know

- **Retention:** rows are never deleted automatically. The privacy page says you keep order details for at least 6 months, so don't delete a row before that. Delete old rows yourself once you no longer need them.
- **Keep the sheet private:** it holds customer details, so don't share it with a public link.
- **Abuse:** the web app URL is visible in the page source, so anyone could send it requests. The script only accepts requests that look like a real quote, turns anything that looks like a formula into plain text, and accepts at most 30 requests every 10 minutes. If someone floods it, the site keeps working, because the WhatsApp message goes out either way. Only the saving pauses.
- **Changing the code later:** after you edit the script, go to **Deploy → Manage deployments**, press the pencil, choose **Version: New version** and deploy. The URL stays the same.
- **Privacy page:** `privacy.html` already describes this sheet. If you change what gets saved, update that page too.
