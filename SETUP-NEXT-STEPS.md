# Next steps (interactive)

The app was created from the **node-express** template and is linked to your app via `client_id` in `shopify.app.toml`. Log in with Shopify in your terminal so the CLI can start the dev server and tunnel.

---

## Sharing this repo with your client

1. **Create a new repo** (e.g. on GitHub or GitLab) — do **not** initialize with a README if the repo will only contain this app.
2. **Point this project at your new repo** (replace with your repo URL):

   ```bash
   git remote set-url origin https://github.com/YOUR_ORG/countdown-timer-app.git
   # or: git remote add mycompany https://...
   ```

3. **Push:**

   ```bash
   git push -u origin main
   ```

4. **Share with the client:** Send them the repo URL and branch (`main`). Tell them to:
   - Clone the repo, then follow **README** and **SETUP-NEXT-STEPS.md**
   - Copy `.env.example` to `.env` and fill in values
   - Run `npx shopify app config link` to link their Partner app, then `npm run dev`
   - Configure App Proxy in Partners and add the Countdown Timer block in the theme editor; test on the **live store URL**.

---

## 1. Install dependencies

Run these in **your local terminal** (not in Cursor’s sandbox):

```bash
cd "/Users/ashhadpa/Desktop/Countdown Timer + Analytics/countdown-timer-app"
npm install
cd server && npm install && cd ..
cd admin-app && npm install && cd ..
```

**If `npm install` in `server/` or `admin-app/` fails** (e.g. sqlite3 build errors, or “Timer: command not found”): the path has spaces and can break native builds. Either:
- Run the same commands from your terminal (sometimes it works there), or  
- Copy or move the `countdown-timer-app` folder to a path **without spaces** (e.g. `~/countdown-timer-app`), then run `npm install`, `cd server && npm install`, and `cd admin-app && npm install` there.

## 2. Link and start (run in your local terminal)

Open a terminal on your machine and run:

```bash
cd "/Users/ashhadpa/Desktop/Countdown Timer + Analytics/countdown-timer-app"
npx shopify app config link
```

When prompted, select your **Partner organization** and the **Countdown Timer + Analytics** app. This confirms the link.

Then start the app:

```bash
npm run dev
```

The CLI will start the server, create a tunnel, and give you a URL to install the app on your development store. Open that URL, choose your dev store, and complete the install.

## 3. After first run

- The app will open in the Shopify admin.
- Ensure `.env` is configured (see `.env.example`). Then add the Countdown Timer block in the theme editor and test on the storefront.
