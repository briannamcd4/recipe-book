export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  const apiKey = process.env.SPOONACULAR_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    const spoonacularUrl = `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(url)}&apiKey=${apiKey}`;

    const response = await fetch(spoonacularUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error('Spoonacular error:', response.status, text);
      return res.status(422).json({ error: 'Could not extract recipe from this URL.' });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(422).json({ error: 'Invalid response from recipe service.' });
    }

    const data = await response.json();

    if (data.status === 'failure') {
      return res.status(422).json({ error: 'Could not extract recipe.' });
    }

    const ingredients = (data.extendedIngredients || []).map(
      ing => ing.original || ing.name
    );

    const instructions = (data.analyzedInstructions?.[0]?.steps || []).map(
      step => step.step
    );

    return res.status(200).json({
      title: data.title || '',
      prep: data.preparationMinutes ? `${data.preparationMinutes} min` : '',
      cook: data.cookingMinutes
        ? `${data.cookingMinutes} min`
        : data.readyInMinutes
        ? `${data.readyInMinutes} min`
        : '',
      image: data.image || '',
      ingredients,
      instructions
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to extract recipe' });
  }
}
