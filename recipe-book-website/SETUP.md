# 🍴 Recipe Book — Setup Guide

Everything here is **free**. No credit card needed for any step.

---

## Step 1 — Set up Supabase (your database)

Supabase is where your recipes are stored so both you and your sister can see them.

1. Go to [supabase.com](https://supabase.com) and click **Start your project** → sign up free
2. Click **New project**, give it a name like `recipe-book`, choose a region close to you, set any password
3. Wait ~1 minute for it to set up
4. In the left sidebar click **SQL Editor**
5. Paste the entire contents of `supabase-schema.sql` into the editor and click **Run**
6. In the left sidebar click **Project Settings → API**
7. Copy two values:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public** key → a long string starting with `eyJ...`

8. Open `public/js/app.js` and replace the top two lines:
   ```js
   const SUPABASE_URL = 'https://abcdefgh.supabase.co';   // ← your URL
   const SUPABASE_ANON_KEY = 'eyJ...';                    // ← your anon key
   ```

---

## Step 2 — Deploy to Netlify (your free website)

Netlify hosts your site and runs the serverless function that fetches recipes from URLs.

### Option A — Drag & Drop (easiest, no Git needed)

1. Go to [netlify.com](https://netlify.com) → sign up free → click **Add new site → Deploy manually**
2. Drag your entire `recipe-book` folder onto the Netlify upload area
3. Your site goes live instantly at a random URL like `https://jolly-pie-abc123.netlify.app`
4. You can rename it under **Site settings → Change site name**

> **Note:** For drag & drop, Netlify Functions won't work (the URL-fetch feature).  
> The site will still work fully — you just won't be able to use "Paste a link" to auto-import.  
> To enable that too, use Option B below.

### Option B — GitHub (enables everything including URL import)

1. Create a free [github.com](https://github.com) account
2. Create a new repository called `recipe-book` (make it private if you want)
3. Upload all your files to the repo (drag & drop into GitHub's interface works)
4. On Netlify: **Add new site → Import from Git → GitHub** → select your repo
5. Build settings will auto-detect from `netlify.toml` — just click **Deploy site**

---

## Step 3 — Add your Anthropic API key (for URL recipe import)

This only matters if you want the "Paste a link" feature to auto-extract recipes.

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)  
   (Free tier gives you enough credits to fetch hundreds of recipes)
2. In Netlify: go to **Site settings → Environment variables → Add variable**
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key (starts with `sk-ant-...`)
3. Click **Save** and redeploy (Deploys → Trigger deploy)

---

## Step 4 — Share with your sister

Just send her the Netlify URL (e.g. `https://our-recipe-book.netlify.app`).  
You both use the same site — any recipe either of you adds shows up for the other instantly.

---

## File structure recap

```
recipe-book/
├── public/
│   ├── index.html          ← the website
│   ├── css/style.css       ← all the styles
│   └── js/app.js           ← app logic (edit SUPABASE_URL here)
├── netlify/
│   └── functions/
│       └── fetch-recipe.js ← serverless function for URL import
├── netlify.toml            ← Netlify config
└── supabase-schema.sql     ← run this once in Supabase
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Recipes not saving | Double-check SUPABASE_URL and SUPABASE_ANON_KEY in app.js |
| Yellow "demo mode" banner showing | You haven't filled in the Supabase config yet |
| URL import not working | Make sure ANTHROPIC_API_KEY is set in Netlify env vars |
| Site not updating after edits | Re-upload the folder to Netlify (or push to GitHub) |

---

## Total cost: $0 🎉

- Supabase free tier: up to 500MB storage, unlimited reads/writes for small projects
- Netlify free tier: 100GB bandwidth/month, 125k function invocations/month
- Both are more than enough for a family recipe book forever
