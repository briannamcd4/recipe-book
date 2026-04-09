export default async function handler(req, res) {
  const API_KEY = process.env.SPOONACULAR_KEY;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(url)}&apiKey=${API_KEY}`
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    console.error("Extract error:", err);
    res.status(500).json({ error: "Failed to extract recipe" });
  }
}
