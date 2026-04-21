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
- show the front side only
- do not mix front and back views
- do not angle or rotate the garment
- straight-on orthographic view only

Generate a photorealistic ecommerce ghost-mannequin product image of this garment.

This must NOT look like a flat lay.
This must NOT look like the garment lying on a surface.
This must NOT look front-pressed or two-dimensional.

The garment must appear worn on an invisible MALE mannequin only.

Invisible mannequin body shape requirements:
- masculine torso proportions
- broad male shoulders
- straight male ribcage
- straight-to-tapered male waist

CHEST REQUIREMENT (CRITICAL):
- FLAT MALE CHEST ONLY
- visible male pectoral plane only
- slight natural pectoral definition permitted
- chest must be broad and flat, not projected
- garment must drape over a flat male chest, not breasts

ABSOLUTELY FORBIDDEN:
- no breasts
- no bust contour
- no rounded breast volume
- no convex bust projection
- no left and right breast forms
- no cleavage-like shaping
- no feminine chest anatomy
- do not create breast shapes under transparent or sheer fabric
- render sheer fabric over a flat male pectoral chest only

Critical anti-flat-lay requirements:
- garment must wrap around a 3D male torso
- side seams must curve naturally around a male body
- openings must show interior depth
- no flattened symmetry
- no overhead/tabletop look
- no paper-doll effect
- no floating empty shell

Garment accuracy requirements:
- match the garment exactly as shown in the reference image
- preserve silhouette, proportions, length, fabric, transparency, pattern placement, seams, closures, trims, pockets, and construction details
- do not redesign or reinterpret the garment

Fit and drape requirements:
- natural gravity-based drape
- realistic tension from shoulders through torso
- preserve natural folds and fabric behavior
- do not stiffen, inflate, or overfill the garment

Background and styling:
- clean white studio background
- straight-on ecommerce product shot
- centered and fully visible
- sharp detail
- soft even professional lighting
- no model
- no hanger
- no stand
- no props

Final requirement:
The result must read instantly as premium ghost-mannequin photography on an invisible male torso with a flat male pectoral chest only, never a female bust form.`;

const FEMALE_REAR_PROMPT = `Use the uploaded garment image as the exact garment blueprint.
The uploaded image is the BACK SIDE of the garment photographed facing the camera as a standard product image.

Generate a photorealistic ecommerce ghost-mannequin image showing an invisible mannequin viewed FROM BEHIND.

CRITICAL ORIENTATION REQUIREMENT:
- the camera must be looking at the mannequin's back
- the mannequin must be facing away from the camera
- show the back of the invisible mannequin only
- show the uploaded garment being worn on the mannequin's back
- do not generate a front-facing mannequin
- do not rotate to a front view
- do not mix front and back information
- straight-on rear view only
- no angled or 3/4 rear view

Generate true ghost-mannequin photography, not a flat lay.
The garment must appear worn on an invisible mannequin with feminine swimsuit-model body shape.

Invisible mannequin body shape requirements:
- natural female upper back contour
- natural shoulder blade structure
- tapered waist where applicable
- realistic back torso volume
- natural shoulder slope
- side seams wrapping naturally around the body
- body presence visible only through garment fit
- absolutely no visible mannequin structure

Critical anti-flat-lay requirements:
- garment must wrap around a 3D back torso
- back neckline and armholes must show interior depth where applicable
- no flattened symmetry
- no tabletop or laid-flat appearance
- no floating empty shell

Garment accuracy requirements:
- preserve the uploaded back view exactly
- preserve all back-specific details exactly
- preserve seams, closures, cutouts, trims, hardware, fabric texture, and pattern placement
- do not redesign or simplify anything

Background and styling:
- clean white studio background
- centered ecommerce product shot
- soft even professional lighting
- no model
- no hanger
- no props

Final requirement:
The final image must read instantly as a ghost mannequin photographed from behind, showing the mannequin's back wearing the uploaded back-view garment.`;

const MALE_REAR_PROMPT = `Use the uploaded garment image as the exact garment blueprint.
The uploaded image is the BACK SIDE of the garment photographed facing the camera as a standard product image.

Generate a photorealistic ecommerce ghost-mannequin image showing an invisible MALE mannequin viewed FROM BEHIND.

CRITICAL ORIENTATION REQUIREMENT:
- the camera must be looking at the mannequin's back
- the mannequin must be facing away from the camera
- show the back of the invisible male mannequin only
- show the uploaded garment being worn on the mannequin's back
- do not generate a front-facing mannequin
- do not rotate to a front view
- do not mix front and back information
- straight-on rear view only
- no angled or 3/4 rear view

Generate true ghost-mannequin photography, not a flat lay.
The garment must appear worn on an invisible mannequin with realistic MALE body shape only.

Invisible mannequin body shape requirements:
- masculine back proportions
- broad male shoulders
- natural upper back contour
- subtle male shoulder blade structure where applicable
- straight male ribcage
- straight-to-tapered male waist where applicable
- realistic male back torso volume
- side seams wrapping naturally around a male body
- body presence visible only through garment fit
- absolutely no visible mannequin structure

Critical anti-flat-lay requirements:
- garment must wrap around a 3D male back torso
- rear neckline and armholes must show interior depth where applicable
- no flattened symmetry
- no tabletop or laid-flat appearance
- no paper-doll effect
- no floating empty shell

Garment accuracy requirements:
- preserve the uploaded back view exactly
- preserve all back-specific details exactly
- preserve seams, closures, cutouts, trims, hardware, fabric texture, and pattern placement
- do not redesign or simplify anything

Fit and drape requirements:
- natural gravity-based drape
- realistic tension from shoulders through upper back and torso
- preserve natural folds and fabric behavior
- do not stiffen, inflate, or overfill the garment

Background and styling:
- clean white studio background
- centered ecommerce product shot
- soft even professional lighting
- no model
- no hanger
- no props

Final requirement:
The final image must read instantly as premium ghost-mannequin photography photographed from behind, showing an invisible male mannequin's back wearing the uploaded back-view garment.`;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image_file');
    const gender = formData.get('gender') || 'female';
    const view = formData.get('view') || 'front';

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

    let prompt;
    if (gender === 'male' && view === 'rear') prompt = MALE_REAR_PROMPT;
    else if (gender === 'female' && view === 'rear') prompt = FEMALE_REAR_PROMPT;
    else if (gender === 'male') prompt = MALE_PROMPT;
    else prompt = FEMALE_PROMPT;

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
