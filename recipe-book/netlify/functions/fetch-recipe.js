// netlify/functions/fetch-recipe.js
// This serverless function keeps your Anthropic API key secret on the server side.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let url, category;
  try {
    const body = JSON.parse(event.body);
    url = body.url;
    category = body.category || 'Other';
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

  const prompt = `You are a recipe extraction assistant. A user wants to save a recipe from this URL: ${url}

Please search for and extract the recipe from that URL. Return ONLY a valid JSON object with no markdown, no backticks, no extra text. Use exactly these fields:

{
  "title": "The recipe name",
  "prep": "prep time like '15 min'",
  "cook": "cook time like '30 min'",
  "image": "a direct image URL from the page if available, otherwise empty string",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
  "instructions": ["Full step 1 text", "Full step 2 text"]
}

If you cannot access or find the recipe, return: {"error": "Could not extract recipe from that URL."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response status:', response.status);
    console.log('Anthropic response:', JSON.stringify(data).slice(0, 500));

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${JSON.stringify(data)}`);
    }

    const textContent = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response: ' + textContent.slice(0, 200));

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) {
      return { statusCode: 422, body: JSON.stringify({ error: parsed.error }) };
    }

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
