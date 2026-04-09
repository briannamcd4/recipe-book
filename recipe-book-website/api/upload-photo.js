export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const { imageData, contentType, fileName } = req.body;

    if (!imageData || !fileName) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const buffer = Buffer.from(imageData, 'base64');
    const uniqueName = `recipe-${Date.now()}-${fileName}`;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/recipe-photos/${uniqueName}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': contentType || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: buffer
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return res.status(500).json({ error: err });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/recipe-photos/${uniqueName}`;

    return res.status(200).json({ url: publicUrl });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
