export default async function handler(req, res) {
  const API_KEY = process.env.SPOONACULAR_KEY; // store this in Vercel env
  const { query } = req.body; // e.g., recipe name or ingredients
  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&apiKey=${API_KEY}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Spoonacular fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch from Spoonacular' });
  }
}