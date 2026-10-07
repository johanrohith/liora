<div align="center">

<img src="assets/readme/liora-readme-banner.svg" alt="Liora" width="100%">

### ✦ One connected personal environment

<p>
  <img src="https://img.shields.io/badge/PWA-6B4DFF?style=for-the-badge" alt="PWA">
  <img src="https://img.shields.io/badge/Offline%20Ready-21C58A?style=for-the-badge" alt="Offline Ready">
  <img src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JS-FF8A3D?style=for-the-badge" alt="HTML CSS JS">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111827" alt="JavaScript">
</p>

**Plan · Create · Focus · Connect · Explore**

</div>

---

## 🌌 About

Liora is a responsive personal web app that brings everyday tools into one consistent environment — from planning and notes to money, media, travel, discovery and a lightweight command assistant.

```text
PLAN → CREATE → FOCUS → MANAGE → CONNECT → WATCH → EXPLORE
```

---

## 🧭 Spaces

| Space | Purpose |
|---|---|
| 📅 **Planner** | Tasks, events, goals, habits and Focus sessions |
| 📝 **Notes** | Notes with image attachments and full-screen previews |
| ₹ **Wallet** | Saving, Current, Cash, UPI payments and requests |
| ♧ **Connect** | People, conversations and groups |
| ♫ **Media** | Songs, videos, playback and YouTube links |
| ⌁ **Travel** | Trips, dates and saved places |
| ✦ **Discover** | Interests, recommendations and saved finds |
| ◉ **Liora AI** | Fixed responses from a JSON command library |
| ⚙ **Settings** | Theme, Short Brief, notifications and app controls |

---

## 🤖 Liora AI

The assistant uses a simple command library that keeps responses transparent and easy to extend.

```mermaid
flowchart LR
    A[User input] --> B[Normalize]
    B --> C{Match command}
    C -->|Match| D[Saved response]
    C -->|No match| E[No fixed response]
```

Commands live in **`data/liora-commands.json`**.

---

## 🧱 Tech stack

<div align="center">

<img src="https://skillicons.dev/icons?i=html,css,js,git,github" alt="HTML CSS JavaScript GitHub">

<br><br>

`HTML5` · `CSS3` · `JavaScript` · `IndexedDB` · `Service Worker` · `Web App Manifest` · `JSON`

</div>

---

## 📁 Project structure

```text
liora/
├── index.html
├── manifest.webmanifest
├── liora-sw.js
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   └── liora-commands.json
├── assets/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── readme/
│       └── liora-readme-banner.svg
└── README.md
```

Keeping the app split this way makes the root clean while giving each part a clear purpose.

---

## 🌱 Project

Liora is built to be extended: richer reminders, backup/import, share actions, deeper media integrations and more personal automation can be added without changing the core structure.

> **Less switching. More doing.**

---

<div align="center">

### ✦ Liora

**Made by Johan Rohith**

</div>
