// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://qsuhgptkiskbasurtzik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdWhncHRraXNrYmFzdXJ0emlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgwMzcsImV4cCI6MjA5MTI1NDAzN30.7hmFouovYKwfq-OA78Wni7PHsZDr5UJm4HclLdBQHzQ';

// Only these emails can add/edit/delete recipes. Add yours and your sister's.
const ALLOWED_EMAILS = [
  'briannamcdonald216@gmail.com',
  'caroline.mcd101@gmail.com'
];
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_EMOJIS = {
  'Breakfast':'☀️','Lunch':'🥗','Dinner':'🍽️','Desserts':'🍰','Snacks':'🍿',
  'Drinks':'🍵','Soups & Stews':'🥘','Salads':'🥬','Baked Goods':'🥖','Other':'📌'
};
const CAT_ORDER = ['Breakfast','Lunch','Dinner','Soups & Stews','Salads','Snacks','Baked Goods','Desserts','Drinks','Other'];

let recipes = [];
let currentFilter = 'all';
let currentUser = null;

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────

function isConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Photo upload now goes through the Netlify function so the service key
// stays secret on the server — never expose it in frontend JS.
async function uploadPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(',')[1];
        const res = await fetch('/.netlify/functions/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64,
            contentType: file.type || 'image/jpeg',
            fileName: file.name
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
        resolve(data.url);
      } catch(err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

async function dbFetch(path, options = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers
  };
  // If user is logged in, use their session token so Supabase RLS knows who they are
  if (currentUser?.access_token) {
    headers['Authorization'] = `Bearer ${currentUser.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function isAuthorized() {
  if (!currentUser) return false;
  return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
}

async function initAuth() {
  const saved = localStorage.getItem('recipe_session');
  if (saved) {
    try { currentUser = JSON.parse(saved); } catch(e) {}
  }
  updateAuthUI();
}

function updateAuthUI() {
  const authorized = isAuthorized();
  document.getElementById('add-recipe-btn').style.display = authorized ? 'inline-block' : 'none';
  document.getElementById('login-btn').style.display = currentUser ? 'none' : 'inline-block';
  const userMenu = document.getElementById('user-menu');
  userMenu.style.display = currentUser ? 'flex' : 'none';
  if (currentUser) {
    document.getElementById('user-email-display').textContent = currentUser.email;
  }
  render();
}

async function handlePasswordLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const status = document.getElementById('login-status');
  const btn = document.querySelector('#login-modal .btn-primary');
  if (!email || !password) { status.textContent = 'Please enter your email and password.'; return; }
  btn.disabled = true; btn.textContent = 'Signing in...';
  status.className = 'url-status'; status.textContent = '';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Invalid email or password');
    currentUser = { email: data.user.email, access_token: data.access_token };
    localStorage.setItem('recipe_session', JSON.stringify(currentUser));
    closeLoginModal();
    updateAuthUI();
  } catch(e) {
    status.className = 'url-status error';
    status.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

function handleSignOut() {
  currentUser = null;
  localStorage.removeItem('recipe_session');
  updateAuthUI();
}

function openLoginModal() {
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-status').textContent = '';
  document.getElementById('login-modal').classList.add('open');
}
function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
}
document.getElementById('login-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('login-modal')) closeLoginModal();
});

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────

async function loadRecipes() {
  showLoading(true);
  if (!isConfigured()) {
    showConfigBanner();
    recipes = JSON.parse(localStorage.getItem('cozy_recipes_fallback') || '[]');
    showLoading(false);
    render();
    return;
  }
  try {
    const data = await dbFetch('recipes?order=created_at.desc');
    recipes = (data || []).map(normalizeRow);
    showLoading(false);
    render();
  } catch(e) {
    console.error('Load error:', e);
    showLoading(false);
    showError('Could not load recipes. Check your Supabase config.');
  }
}

async function insertRecipe(recipe) {
  if (!isConfigured()) {
    recipe.id = Date.now().toString();
    recipes.unshift(recipe);
    localStorage.setItem('cozy_recipes_fallback', JSON.stringify(recipes));
    return recipe;
  }
  const row = {
    title: recipe.title,
    category: recipe.category || 'Other',
    prep_time: recipe.prep || '',
    cook_time: recipe.cook || '',
    image_url: recipe.image || '',
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    source_url: recipe.sourceUrl || '',
    notes: recipe.notes || ''
  };
  const data = await dbFetch('recipes', { method: 'POST', body: JSON.stringify(row) });
  const saved = Array.isArray(data) ? data[0] : data;
  recipes.unshift(normalizeRow(saved));
  return saved;
}

async function updateRecipe(id, changes) {
  if (!isConfigured()) {
    recipes = recipes.map(r => r.id === id ? { ...r, ...changes } : r);
    localStorage.setItem('cozy_recipes_fallback', JSON.stringify(recipes));
    return;
  }
  const row = {
    title: changes.title,
    category: changes.category || 'Other',
    prep_time: changes.prep || '',
    cook_time: changes.cook || '',
    image_url: changes.image || '',
    ingredients: changes.ingredients || [],
    instructions: changes.instructions || [],
    notes: changes.notes || '',
  };
  await dbFetch(`recipes?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(row) });
  recipes = recipes.map(r => r.id === id ? { ...r, ...changes } : r);
}

async function removeRecipe(id) {
  if (!isConfigured()) {
    recipes = recipes.filter(r => r.id !== id);
    localStorage.setItem('cozy_recipes_fallback', JSON.stringify(recipes));
    return;
  }
  await dbFetch(`recipes?id=eq.${id}`, { method: 'DELETE', prefer: '' });
  recipes = recipes.filter(r => r.id !== id);
}

function normalizeRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    prep: row.prep_time,
    cook: row.cook_time,
    image: row.image_url,
    ingredients: row.ingredients || [],
    instructions: row.instructions || [],
    sourceUrl: row.source_url,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

function showLoading(show) {
  const el = document.getElementById('loading-state');
  if (el) el.style.display = show ? 'block' : 'none';
}
function showError(msg) {
  const el = document.getElementById('empty-state');
  if (el) { el.style.display = 'block'; el.querySelector('p').textContent = msg; }
}
function showConfigBanner() {
  if (document.getElementById('config-banner')) return;
  const b = document.createElement('div');
  b.id = 'config-banner';
  b.innerHTML = '⚠️ Demo mode — recipes save locally only. <a href="SETUP.md" target="_blank">See setup guide</a> to connect Supabase.';
  document.querySelector('header').after(b);
}
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function rebuildFilterBar() {
  const bar = document.getElementById('filter-bar');
  const cats = [...new Set(recipes.map(r => r.category || 'Other'))].sort();
  bar.innerHTML = '<span class="filter-label">Browse:</span>';
  bar.appendChild(makeFilterBtn('All', 'all'));
  cats.forEach(c => bar.appendChild(makeFilterBtn(c, c)));
}
function makeFilterBtn(label, value) {
  const b = document.createElement('button');
  b.className = 'cat-btn' + (currentFilter === value ? ' active' : '');
  b.textContent = label;
  b.onclick = () => filterCat(value, b);
  return b;
}
function filterCat(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function render() {
  const container = document.getElementById('categories-container');
  const emptyState = document.getElementById('empty-state');
  if (!container) return;
  container.innerHTML = '';
  const filtered = currentFilter === 'all' ? recipes : recipes.filter(r => (r.category || 'Other') === currentFilter);
  rebuildFilterBar();
  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = 'No recipes here yet — add your first one!';
    return;
  }
  emptyState.style.display = 'none';
  const groups = {};
  filtered.forEach(r => {
    const cat = r.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });
  const ordered = CAT_ORDER.filter(c => groups[c]).concat(Object.keys(groups).filter(c => !CAT_ORDER.includes(c)));
  ordered.forEach(cat => {
    if (!groups[cat]) return;
    const sec = document.createElement('div');
    sec.className = 'category-section';
    sec.innerHTML = `<div class="category-heading"><span class="cat-emoji">${CATEGORY_EMOJIS[cat]||'📌'}</span>${cat}</div><div class="recipe-grid"></div>`;
    const grid = sec.querySelector('.recipe-grid');
    groups[cat].forEach(r => grid.appendChild(makeCard(r)));
    container.appendChild(sec);
  });
}

function makeCard(recipe) {
  const div = document.createElement('div');
  div.className = 'recipe-card';
  const emoji = CATEGORY_EMOJIS[recipe.category] || '🍴';
  const imgHtml = recipe.image
    ? `<img class="recipe-card-img" src="${escHtml(recipe.image)}" alt="${escHtml(recipe.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  const phDisplay = recipe.image ? 'display:none' : '';
  const deleteBtn = isAuthorized()
    ? `<button class="recipe-card-delete" title="Delete" onclick="handleDelete('${recipe.id}',event)">✕</button>` : '';
  div.innerHTML = `
    ${imgHtml}
    <div class="recipe-card-img-placeholder" style="${phDisplay}">${emoji}</div>
    <div class="recipe-card-body">
      <div class="recipe-card-title">${escHtml(recipe.title)}</div>
      ${recipe.prep||recipe.cook ? `<div class="recipe-card-meta">${[recipe.prep&&('prep '+recipe.prep),recipe.cook&&('cook '+recipe.cook)].filter(Boolean).join(' · ')}</div>` : ''}
      ${recipe.category ? `<span class="recipe-card-tag">${escHtml(recipe.category)}</span>` : ''}
    </div>
    ${deleteBtn}`;
  div.addEventListener('click', () => openDetail(recipe.id));
  return div;
}

// ─── DETAIL PAGE ──────────────────────────────────────────────────────────────

function openDetail(id) {
  const r = recipes.find(x => String(x.id) === String(id));
  if (!r) return;
  const page = document.getElementById('detail-page');
  document.getElementById('home-page').classList.add('hidden');
  page.classList.add('open');
  const emoji = CATEGORY_EMOJIS[r.category] || '🍴';
  const imgHtml = r.image
    ? `<img class="detail-hero" src="${escHtml(r.image)}" alt="${escHtml(r.title)}" onerror="this.style.display='none';">`
    : `<div class="detail-hero-placeholder">${emoji}</div>`;
  const ingredientsHtml = r.ingredients && r.ingredients.length
    ? `<div class="detail-section-title">Ingredients</div><ul class="ingredient-list">${r.ingredients.map(i=>`<li>${escHtml(i)}</li>`).join('')}</ul>` : '';
  const stepsHtml = r.instructions && r.instructions.length
    ? `<div class="detail-section-title">Instructions</div><ol class="steps-list">${r.instructions.map(s=>`<li>${escHtml(s)}</li>`).join('')}</ol>` : '';
  const notesHtml = r.notes
    ? `<div class="detail-section-title">Notes</div><div class="detail-notes">${escHtml(r.notes).replace(/\n/g,'<br>')}</div>` : '';
  const sourceHtml = r.sourceUrl
    ? `<div class="detail-section-title">Source</div><a class="source-link" href="${escHtml(r.sourceUrl)}" target="_blank" rel="noopener">↗ View original recipe</a>` : '';
  const meta = [r.category, r.prep&&('Prep: '+r.prep), r.cook&&('Cook: '+r.cook)].filter(Boolean).join(' · ');

  const editBtn = isAuthorized()
    ? `<button class="edit-btn" onclick="openEditModal('${r.id}')">✎ Edit Recipe</button>` : '';

  page.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;">
      <button class="back-btn" style="margin-bottom:0" onclick="closeDetail()">← Back</button>
      ${editBtn}
    </div>
    ${imgHtml}
    <div class="detail-title">${escHtml(r.title)}</div>
    <div class="detail-meta">${escHtml(meta)}</div>
    ${ingredientsHtml}
    ${stepsHtml}
    ${notesHtml}
    ${sourceHtml}`;
  window.scrollTo(0, 0);
}

function closeDetail() {
  document.getElementById('detail-page').classList.remove('open');
  document.getElementById('detail-page').innerHTML = '';
  document.getElementById('home-page').classList.remove('hidden');
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function handleDelete(id, e) {
  e.stopPropagation();
  if (!isAuthorized()) return;
  if (!confirm('Remove this recipe?')) return;
  await removeRecipe(id);
  render();
}

// ─── ADD MODAL ────────────────────────────────────────────────────────────────

function openAddModal() {
  document.getElementById('add-modal').classList.add('open');
}
function closeModal() {
  document.getElementById('add-modal').classList.remove('open');
  clearForm();
}
function clearForm() {
  ['m-title','m-prep','m-cook','m-img','m-ingredients','m-instructions','m-notes','url-notes','recipe-url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['m-category','url-category'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const s = document.getElementById('url-status');
  if (s) { s.textContent = ''; s.className = 'url-status'; }
}
function switchTab(tab) {
  document.getElementById('tab-manual').classList.toggle('active', tab === 'manual');
  document.getElementById('tab-url').classList.toggle('active', tab === 'url');
  document.getElementById('manual-tab-content').style.display = tab === 'manual' ? '' : 'none';
  document.getElementById('url-tab-content').style.display = tab === 'url' ? '' : 'none';
}
document.getElementById('add-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('add-modal')) closeModal();
});

// ─── SAVE MANUAL ─────────────────────────────────────────────────────────────

async function saveManual() {
  if (!isAuthorized()) return;
  const title = document.getElementById('m-title').value.trim();
  if (!title) { alert('Please enter a recipe name!'); return; }
  const btn = document.querySelector('#manual-tab-content .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await insertRecipe({
      title,
      category: document.getElementById('m-category').value || 'Other',
      prep: document.getElementById('m-prep').value.trim(),
      cook: document.getElementById('m-cook').value.trim(),
      image: document.getElementById('m-img').value.trim(),
      ingredients: document.getElementById('m-ingredients').value.split('\n').map(s=>s.trim()).filter(Boolean),
      instructions: document.getElementById('m-instructions').value.split('\n').map(s=>s.trim()).filter(Boolean),
      notes: document.getElementById('m-notes').value.trim()
    });
    render();
    closeModal();
  } catch(err) {
    alert('Could not save recipe: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Recipe';
  }
}

// ─── FETCH FROM URL ───────────────────────────────────────────────────────────

async function fetchAndSave() {
  if (!isAuthorized()) return;
  const url = document.getElementById('recipe-url').value.trim();
  const category = document.getElementById('url-category').value || 'Other';
  if (!url) { alert('Please paste a recipe URL!'); return; }
  const status = document.getElementById('url-status');
  const btn = document.querySelector('#url-tab-content .btn-primary');
  status.className = 'url-status';
  status.innerHTML = 'Fetching recipe... <span class="spinner"></span>';
  btn.disabled = true;
  try {
    const res = await fetch('/.netlify/functions/fetch-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, category })
    });
    const parsed = await res.json();
    if (!res.ok || parsed.error) throw new Error(parsed.error || 'Failed');
    await insertRecipe({
      title: parsed.title || 'Untitled Recipe',
      category,
      prep: parsed.prep || '',
      cook: parsed.cook || '',
      image: parsed.image || '',
      ingredients: parsed.ingredients || [],
      instructions: parsed.instructions || [],
      sourceUrl: url,
      notes: document.getElementById('url-notes').value.trim()
    });
    render();
    status.textContent = '';
    closeModal();
  } catch(err) {
    console.error('fetchAndSave error:', err);
    status.className = 'url-status error';
    status.textContent = 'Could not auto-fetch: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────

function openEditModal(id) {
  if (!isAuthorized()) return;
  const r = recipes.find(x => String(x.id) === String(id));
  if (!r) return;
  document.getElementById('e-id').value = r.id;
  document.getElementById('e-title').value = r.title || '';
  document.getElementById('e-category').value = r.category || '';
  document.getElementById('e-prep').value = r.prep || '';
  document.getElementById('e-cook').value = r.cook || '';
  document.getElementById('e-img').value = r.image || '';
  document.getElementById('e-ingredients').value = (r.ingredients || []).join('\n');
  document.getElementById('e-instructions').value = (r.instructions || []).join('\n');
  document.getElementById('e-notes').value = r.notes || '';
  previewEditImg(r.image || '');
  document.getElementById('edit-modal').classList.add('open');
}
function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  const fileInput = document.getElementById('e-img-file');
  if (fileInput) fileInput.value = '';
  const nameEl = document.getElementById('e-img-upload-name');
  if (nameEl) nameEl.style.display = 'none';
}
function previewEditImg(url) {
  const preview = document.getElementById('e-img-preview');
  const thumb = document.getElementById('e-img-thumb');
  if (url && url.startsWith('http')) {
    thumb.src = url;
    preview.style.display = 'block';
    thumb.onerror = () => { preview.style.display = 'none'; };
  } else {
    preview.style.display = 'none';
  }
}
function handleEditFileChange(input) {
  const file = input.files && input.files[0];
  const nameEl = document.getElementById('e-img-upload-name');
  if (file) {
    nameEl.textContent = '📎 ' + file.name;
    nameEl.style.display = 'block';
    const reader = new FileReader();
    reader.onload = e => {
      const thumb = document.getElementById('e-img-thumb');
      const preview = document.getElementById('e-img-preview');
      thumb.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    document.getElementById('e-img').value = '';
  } else {
    nameEl.style.display = 'none';
  }
}

async function saveEdit() {
  if (!isAuthorized()) return;
  const id = document.getElementById('e-id').value;
  const title = document.getElementById('e-title').value.trim();
  if (!title) { alert('Please enter a recipe name!'); return; }
  const btn = document.querySelector('#edit-modal .btn-primary');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const fileInput = document.getElementById('e-img-file');
    let imageUrl = document.getElementById('e-img').value.trim();
    if (fileInput && fileInput.files && fileInput.files[0]) {
      btn.textContent = 'Uploading photo...';
      imageUrl = await uploadPhoto(fileInput.files[0]);
    }
    const changes = {
      title,
      category: document.getElementById('e-category').value || 'Other',
      prep: document.getElementById('e-prep').value.trim(),
      cook: document.getElementById('e-cook').value.trim(),
      image: imageUrl,
      ingredients: document.getElementById('e-ingredients').value.split('\n').map(s=>s.trim()).filter(Boolean),
      instructions: document.getElementById('e-instructions').value.split('\n').map(s=>s.trim()).filter(Boolean),
      notes: document.getElementById('e-notes').value.trim(),
    };
    await updateRecipe(id, changes);
    render();
    closeEditModal();
    openDetail(id);
  } catch(err) {
    alert('Could not save changes: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}
document.getElementById('edit-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('edit-modal')) closeEditModal();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

initAuth().then(() => loadRecipes());