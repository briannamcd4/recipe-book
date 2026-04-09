// netlify/functions/upload-photo.js
// Uploads a photo to Supabase Storage using the service role key (kept secret server-side)

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  try {
    // The image comes in as base64 in the request body
    const { imageData, contentType, fileName } = JSON.parse(event.body);
    if (!imageData || !fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing image data' }) };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');
    const uniqueName = `recipe-${Date.now()}-${fileName}`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/recipe-photos/${uniqueName}`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': contentType || 'image/jpeg',
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed: ' + err }) };
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/recipe-photos/${uniqueName}`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl })
    };
  } catch(err) {
    console.error('upload-photo error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
