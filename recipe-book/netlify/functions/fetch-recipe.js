// netlify/functions/fetch-recipe.js
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let url;
  try {
    const body = JSON.parse(event.body);
    url = body.url;
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No URL provided' }) };
  }

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing API key)' }) };
  }

  try {
    // Spoonacular's "extract recipe from URL" endpoint
    const spoonacularUrl = `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(url)}&apiKey=${apiKey}`;

    const response = await fetch(spoonacularUrl);
    const data = await response.json();

    if (!response.ok || data.status === 'failure') {
      return { statusCode: 422, body: JSON.stringify({ error: 'Could not extract recipe from that URL.' }) };
    }

    // Map Spoonacular's response to your app's format
    const ingredients = (data.extendedIngredients || []).map(ing => ing.original || ing.originalString || ing.name);
    const instructions = (data.analyzedInstructions?.[0]?.steps || []).map(step => step.step);

    const parsed = {
      title: data.title || '',
      prep: data.preparationMinutes > 0 ? `${data.preparationMinutes} min` : '',
      cook: data.cookingMinutes > 0 ? `${data.cookingMinutes} min` : (data.readyInMinutes ? `${data.readyInMinutes} min` : ''),
      image: data.image || '',
      ingredients,
      instructions
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch(err) {
    console.error('fetch-recipe error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to extract recipe. Please add it manually.' })
    };
  }
};
