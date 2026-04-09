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

## Step 2 — Deploy to Vercel (your free website)

Vercel hosts your site and runs the `/api` serverless functions for recipe fetching and photo upload.

1. Go to [vercel.com](https://vercel.com) → sign up free → click **New Project**
2. Import your GitHub repo or use the CLI to deploy your local folder
3. Make sure the project root is `recipe-book-website`
4. Vercel will detect the static site and `/api` functions automatically
5. After deployment, your site will be live at a Vercel URL like `https://recipe-book.vercel.app`

> **Note:** The `Paste a link` auto-import feature requires the serverless function in `recipe-book-website/api`.

---

## Step 3 — Add your Spoonacular API key (for URL recipe import)

This is required for the "Paste a link" feature to auto-extract recipes.

1. Get an API key at [spoonacular.com](https://spoonacular.com/food-api)
2. In Vercel: go to **Project Settings → Environment Variables**
   - Key: `SPOONACULAR_KEY`
   - Value: your Spoonacular key
3. Also add these keys so uploads and Supabase access work:
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_URL`
4. Click **Save** and redeploy the site

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
├── api/
│   ├── fetch-recipe.js     ← serverless function for URL import
│   ├── upload-photo.js     ← image upload function
│   └── spoonacular.js      ← alternate extract helper
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
