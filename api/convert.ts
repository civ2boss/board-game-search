import sharp from 'sharp';

export default async function handler(req: any, res: any) {
  try {
    const { url } = req.query || {};
    const src: string = typeof url === 'string' ? url : '';
    if (!src) {
      res.status(400).send('Missing url');
      return;
    }

    const r = await fetch(src);
    if (!r.ok) {
      res.status(400).send('Failed to fetch source image');
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());

    const out = await sharp(buf)
      .resize({ width: 500, height: 500, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, effort: 6 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Content-Disposition', 'attachment; filename="image.png"');
    res.send(out);
  } catch (err) {
    res.status(500).send('Error converting image');
  }
}


