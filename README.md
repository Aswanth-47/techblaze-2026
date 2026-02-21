# Tech Blaze 3.0 — Vercel Deployment Guide

## ✅ Project Structure
```
techblaze/
├── api/
│   ├── register.js        ← Handles form submissions
│   ├── admin-login.js     ← Admin authentication
│   ├── admin-data.js      ← Fetch registrations + stats
│   ├── export-csv.js      ← CSV export
│   ├── export-xlsx.js     ← Excel export
│   └── export-docx.js     ← Word export
├── index.html             ← Landing page
├── register.html          ← Registration form
├── success.html           ← Success page
├── admin-login.html       ← Admin login
├── admin.html             ← Admin dashboard
├── style.css              ← All styles
├── script.js              ← Minimal JS for index
├── package.json
└── vercel.json
```

---

## 🚀 Step-by-Step Setup

### STEP 1 — Create a Free Database (Neon)
1. Go to → https://neon.tech and sign up (free)
2. Create a new project → name it `techblaze`
3. In your dashboard, click **"Connection Details"**
4. Copy the **Connection string** — it looks like:
   `postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

> ✅ The database table is created **automatically** on first registration submit. No SQL setup needed!

---

### STEP 2 — Deploy to Vercel
1. Go to → https://vercel.com and sign in with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository (push this folder to GitHub first)
4. Vercel will auto-detect it as a Node.js project

---

### STEP 3 — Set Environment Variables in Vercel
In your Vercel project → **Settings → Environment Variables**, add these:

| Variable Name   | Value                                      |
|-----------------|-------------------------------------------|
| `DATABASE_URL`  | Your Neon connection string (from Step 1) |
| `ADMIN_USER`    | `admin` (or change this)                  |
| `ADMIN_PASS`    | `techblaze2026` (⚠️ CHANGE THIS!)        |
| `JWT_SECRET`    | Any random string e.g. `tb3_secret_2026`  |

---

### STEP 4 — Redeploy
After setting env vars, go to **Deployments → Redeploy** (or just push a commit).

---

## 🔗 Your URLs After Deployment

| Page             | URL                              |
|------------------|----------------------------------|
| Landing Page     | `your-site.vercel.app/`          |
| Register         | `your-site.vercel.app/register.html` |
| Admin Login      | `your-site.vercel.app/admin-login.html` |
| Admin Dashboard  | `your-site.vercel.app/admin.html` |

---

## ⚠️ Important Security Notes
- **Change** `ADMIN_PASS` to something strong before deploying
- **Change** `JWT_SECRET` to a random string
- The admin dashboard is only accessible with username + password
- All data goes to your private Neon database

---

## 📦 How to push to GitHub (if needed)
```bash
cd techblaze
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tech-blaze-2026.git
git push -u origin main
```
Then import that repo in Vercel.
