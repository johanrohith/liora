<div align="center">

<img src="assets/liora-readme-banner.png" alt="Liora — one connected personal environment" width="100%">

<br>

### ✦ One connected personal environment

<p>
  <img src="https://img.shields.io/badge/PWA-6B4DFF?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Offline%20Ready-21C58A?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JS-FF8A3D?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Local--First-3EA7FF?style=for-the-badge"/>
</p>

**Plan. Write. Focus. Connect. Explore.**  
Liora brings everyday personal tools together in one calm, responsive web app.

</div>

---

## 🌌 Liora

Liora is a personal environment for the things you return to every day:

```text
PLAN → CREATE → FOCUS → MANAGE → CONNECT → WATCH → EXPLORE
```

Built as a **Progressive Web App**, Liora can run in the browser, be installed to a device, and keep its cached app shell available offline.

---

## ✨ Everything in one place

| Space | Purpose |
|---|---|
| 📅 **Planner** | Tasks, events, goals, habits and Focus sessions |
| 📝 **Notes** | Notes with local images and full-screen previews |
| ₹ **Wallet** | Saving, Current, Cash, UPI payments and requests |
| ♧ **Connect** | People, conversations and groups |
| ♫ **Media** | Songs, videos, playback and YouTube links |
| ⌁ **Travel** | Trips, dates and saved places |
| ✦ **Discover** | Interests, recommendations and Save for later |
| ◉ **Liora AI** | Fast fixed-command responses from JSON |
| ⚙ **Settings** | Theme, Short Brief, notifications and app controls |

---

## 🚀 Highlights

<div align="center">

| 🧠 **Connected planning** | 🗂️ **Local-first notes** | 📱 **Installable** |
|:---:|:---:|:---:|
| Goals can own tasks and update progress automatically. | Images stay with the note and open full screen. | Manifest + service worker + offline app shell. |

| 🎧 **Media** | 💸 **Wallet** | 🌐 **Discover** |
|:---:|:---:|:---:|
| Add media and use YouTube links for embedded playback. | Three balances, calculated total, UPI validation and balance checks. | Pick interests, open real content and save it for later. |

</div>

---

## 🤖 Liora AI

Liora AI uses a deliberately simple local command layer:

```mermaid
flowchart LR
    A[User input] --> B[Normalize]
    B --> C{Match command}
    C -->|Found| D[Saved response]
    C -->|No match| E[No fixed response]
```

Commands live in **`liora-commands.json`**, keeping the system transparent and easy to extend.

---

## 🧱 Tech stack

<div align="center">

<img src="https://skillicons.dev/icons?i=html,css,js,git,github" />

<br><br>

`HTML5` · `CSS3` · `JavaScript` · `IndexedDB` · `Service Worker` · `Web App Manifest` · `JSON`

</div>

No framework or build step is required for the core app.

---

## 📁 Project structure

```text
liora/
├── index.html
├── liora.html
├── app.js
├── styles.css
├── liora-commands.json
├── liora-sw.js
├── manifest.webmanifest
├── icon-192.png
├── icon-512.png
├── assets/
│   └── liora-readme-banner.png
└── README.md
```

| File | Role |
|---|---|
| `index.html` | Main entry point |
| `app.js` | App state, rendering and interactions |
| `styles.css` | Visual system and responsive layout |
| `liora-commands.json` | Liora AI command library |
| `liora-sw.js` | Offline caching and notification support |
| `manifest.webmanifest` | Installable-app metadata |
| `icon-192.png` / `icon-512.png` | App icons |

---

## 🛠️ Run locally

Serve Liora from a normal web origin:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

For the full PWA experience, deploy over **HTTPS**. That enables service workers, browser notifications and embedded YouTube playback in supported browsers.

---

## 🔐 Local-first

Core personal data stays in browser storage on the device.

- Planner, Wallet, Media and Discover state → browser storage
- Note images → IndexedDB
- AI command library → local JSON
- Offline app shell → service worker cache

External services naturally require an internet connection.

---

## 🌱 Direction

Liora is designed to grow as **one personal environment**, not a pile of disconnected mini-apps.

Future layers can add richer backup/import, share-to-Liora actions, deeper reminders and more personal automation.

> **Less switching. More doing.**

---

<div align="center">

### ✦ Liora

**One connected personal environment.**

`Plan` · `Create` · `Focus` · `Connect` · `Explore`

</div>
