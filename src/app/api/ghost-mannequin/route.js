import { NextResponse } from 'next/server';

export const maxDuration = 60;

const FEMALE_PROMPT = `Use the uploaded garment image as the exact garment blueprint.

VIEW REQUIREMENT:
Render the garment in a FRONT VIEW.
- FRONT VIEW: show the front side of the garment only
- do not mix front and back views
- do not angle or rotate the garment
- straight-on orthographic view only

Generate a photorealistic ecommerce ghost-mannequin product image of this garment.

This must NOT look like a flat lay.
This must NOT look like the garment is lying on a surface.
This must NOT look front-pressed or two-dimensional.

The garment must appear as if it is being worn on an invisible mannequin with a swimsuit-model body shape, so the clothing shows real three-dimensional body form.

Invisible mannequin body shape requirements:
- feminine swimsuit-model proportions
- natural bust contour where applicable
- tapered waist where applicable
- realistic torso volume
- natural shoulder slope
- accurate chest, side seam, and body shaping
- body presence visible only through garment fit
- absolutely no visible mannequin or support structure

Critical anti-flat-lay requirements:
- garment must wrap around a 3D torso
- side seams must curve naturally around the body
- openings must show interior depth (neckline, armholes, leg openings)
- no flattened symmetry
- no overhead/tabletop look
- no paper-doll effect
- no floating empty shell

Garment accuracy requirements:
- match the garment exactly as shown in the reference image
- preserve silhouette, proportions, and length
- preserve fabric texture, color, and pattern placement
- preserve seams, stitching, and construction
- preserve closures, trims, and hardware
- do not redesign or simplify anything

Fit and drape requirements:
- natural gravity-based drape
- realistic tension from shoulders through body
- accurate folds and volume
- no stiffness, no inflation, no over-smoothing

Background and styling:
- clean white studio background
- straight-on ecommerce product shot
- centered and fully visible
- high detail, soft even lighting
- no model, no hanger, no props

Final requirement:
The result must clearly read as a true front-facing ghost mannequin image, never a mixed or angled view.`;

const MALE_PROMPT = `Use the uploaded garment image as the exact garment blueprint.

VIEW REQUIREMENT:
Render the garment in FRONT VIEW only.
- show the front side of the garment only
- do not show rear or partial rear information
- do not mix front and back views
- do not angle or rotate the garment
- straight-on orthographic view only

Generate a photorealistic ecommerce ghost-mannequin product image of this garment.

This must NOT look like a flat lay.
This must NOT look like the garment is lying on a surface.
This must NOT look front-pressed or two-dimensional.

The garment must appear as if it is being worn on an invisible mannequin with a realistic male body shape, so the clothing shows real three-dimensional body form.

Invisible mannequin body shape requirements:
- masculine torso proportions
- natural male chest structure (not exaggerated)
- broader shoulder line
- straight-to-tapered male waist where applicable
- realistic ribcage and torso volume
- natural male shoulder slope
- accurate chest, side seam, and body shaping
- subtle male body contour visible only through garment fit
- absolutely no visible skin, mannequin, or support structure

Critical anti-flat-lay requirements:
- garment must wrap around a 3D male torso
- side seams must curve naturally around the body
- chest must show real dimensional projection, not lie flat
- openings (neckline, armholes, leg openings where applicable) must show interior depth
- no flattened edges or pressed symmetry
- no overhead/tabletop appearance
- no paper-doll effect
- no floating empty shell without body structure

Garment accuracy requirements:
- match the garment exactly as shown in the reference image
- preserve garment type, silhouette, proportions, and length
- preserve fabric texture, thickness, and surface quality
- preserve all colors, patterns, and print placement
- preserve stitching, seams, and construction details
- preserve closures, trims, hardware, pockets, plackets, collars, cuffs, and embellishments where applicable
- do not redesign, simplify, reinterpret, or masculinize the garment incorrectly

Fit and drape requirements:
- garment must respond naturally to gravity
- fabric must drape according to material weight and structure
- maintain realistic tension from shoulders through chest and torso
- preserve natural folds, collapse, and volume
- do not stiffen the garment
- do not inflate or overfill the garment
- do not make it look stuffed or store-displayed

Background and styling:
- clean white studio background
- straight-on ecommerce product shot
- centered and fully visible
- sharp high-resolution detail
- soft even professional lighting
- no model
- no mannequin neck cap
- no mannequin stand
- no hanger
- no props
- no shadows suggesting the garment is lying on a surface

Final requirement:
The result must read instantly as premium ghost-mannequin photography on an invisible male torso, not as a flat lay, floating shell, or digitally composited image.`;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image_file');
    const gender = formData.get('gender') || 'female';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const prompt = gender === 'male' ? MALE_PROMPT : FEMALE_PROMPT;

    const models = [
      'gemini-3.1-flash-image-preview',
      'gemini-2.5-flash-image',
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
              }
            })
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          lastError = err?.error?.message || 'Model failed';
          console.error(`Model ${model} failed:`, lastError);
          continue;
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        const imagePart = parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));

        if (!imagePart) {
          lastError = 'No image returned';
          console.error(`Model ${model} returned no image. Parts:`, JSON.stringify(parts));
          continue;
        }

        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': imagePart.inlineData.mimeType,
            'Content-Length': imageBuffer.length.toString(),
          }
        });

      } catch (e) {
        lastError = e.message;
        console.error(`Model ${model} threw:`, e);
        continue;
      }
    }

    return NextResponse.json({ error: lastError || 'All models failed' }, { status: 500 });

  } catch (err) {
    console.error('Ghost mannequin error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
