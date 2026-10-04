# Illustrated assets

## Original farm refinement and beginner guide — 2026-10-03

Current project backdrop: `public/farm-scene-refined.webp`, 1920 × 832, 210,164 bytes. Built-in image editing of `public/farm-motion-clean-v2.webp`. The original buildings, empty swing frame and planting beds are preserved. The rejected panel-based home is no longer rendered. The original transparent canopy, swing-bear and bird sprites retain their lightweight CSS loops. The bulb is a code-native SVG icon; wood labels and tutorial callouts are live HTML, not baked-in bitmap text.

Final image-edit prompt:

> Use case: precise-object-edit. Edit target: original CWrite farm-motion-clean-v2.webp. Keep the original hand-painted children's storybook farm composition and every building's exact position, dimensions, colors and outlines. Keep image landscape ratio 1920:832 (about 2.3:1), NOT 16:9. Retain the sky/clouds/mountains, main wooden house x485-855 y118-463, empty vine swing frame x870-1035 y233-434, existing writing board x1045-1200 y258-414, left bare tree trunks (separate moving canopies added later), far buildings, foreground shed, watering cans, flower borders, scarecrow and beehive exactly in place. Small improvements ONLY: 1 remove ALL twelve value WORD labels printed onto the soil. Leave the two rows of six tilled planting squares empty and otherwise exactly unchanged, x485-1370 y520-720. 2 the empty grassy clearing at x1300-1520 y210-430 should be a little calmer and uncluttered, ready for an enlarged separate clickable wooden directional sign added later, without moving the existing houses or pathways. 3 improve grass and soft detail quality while retaining original muted palette. Keep the existing 'Setting' and 'writing board' lettering. Do NOT add new panels, windows, dashboard cards, labels, logos, signs, animals, bear, birds, seedlings, swing ropes or seat. No new layout, no rearranged buildings, no new objects. The image must remain recognizable as the exact original farm.

## Writing-first farm homepage — 2026-10-03

Final project asset: `public/farm-home-background.webp`, 1920 × 1080, 220,492 bytes. Built-in image editing, using the original farm as a style reference. The backdrop contains no baked-in text, controls, animal sprites or trees representing student progress. Interactive text and growth records remain live HTML; the swing, four birds and twelve tree sprites use lightweight CSS loops with reduced-motion support, rather than a large flattened GIF.

Final prompt:

> Use case: precise-object-edit. Reference is the original CWrite illustrated farm, use it only as visual style/composition inspiration. Redesign a warm children's storybook farm WEBSITE BACKDROP, landscape 16:9. Preserve muted hand-painted green/orange/brown palette, charming softly outlined timber cottage, blue sky, rounded clouds, little hills, orchard foliage and flower edges. New composition: upper 12% is calm pale blue sky; left 10%-42%, middle 20%-60% height, has a charming medium wooden writing cottage with door/windows and open space just in front for an interactive wooden writing sign placed later in code; center 45%-64%, 22%-57% height is a very calm grassy clearing for a separately animated swing bear, NO swing drawn; far right 70%-94%, 23%-57% height has a small red-roof farm cottage, subtle path and flowers at the outer margin, with clear space for two UI action plaques. Lower 59%-94% is a wide peaceful green lawn with a soft horizontal foreground shadow / low flower border at extreme bottom edges; keep this whole lower center empty for a separately overlaid 12-tree learning garden. NO tilled grid, NO planted seedlings, NO birds, NO animals, NO bear, NO swing, NO signposts or signs, NO text or logos. NO baked-in UI cards or buttons. Sparse friendly decorative details only at scene edges, clear silhouettes and spacious composition. Keep the whole scene uncluttered and suitable for primary school students. This is final production background artwork, not a screenshot.

## Farm layer corrections — 2026-10-03

Built-in image editing was used for every bitmap edit; genuine alpha transparency is preserved on sprites. Final workspace assets:

- `public/farm-motion-clean-v2.webp`: 1920 × 832, empty swing interior without duplicate ropes.
- `public/farm-canopies.webp`: complete transparent foliage, 1200 px wide.
- `public/farm-hen.webp`, `public/farm-chick.webp`, `public/farm-white-hen.webp`, `public/farm-duck.webp`: 320 px wide, WebP quality 90, total 86,632 bytes. No color-key clipping or blurred crop masks.

Final prompt set:

### farm_tree_fix

Use case: background-extraction. Extract the leafy fruit-tree canopy cluster at the far LEFT of the provided farm illustration: far-left partial apple crown, two pear-tree crowns, and the nearer apple-tree crown. Preserve the four crowns' overlapping layout and their relative sizes, pear/apple fruit, muted green leaves and hand-drawn brown outlines. Full visible cluster spans original x0-515 and y135-360. Output these leafy crowns ONLY as one wide transparent sprite with complete soft irregular leaf edges and NO right-edge clipping. Remove sky, mountains, house, shed, buildings, trunks, dirt and all other scenery. Where the shed roof occludes the foliage, complete the hidden lower leaves naturally, as this sprite will be layered BEHIND the unchanged shed/house. The rightmost crown must have a complete rounded leafy silhouette. Keep reference illustration style, no new objects, no background, no rectangular cutout. Transparent margin around the complete foliage cluster.

### farm_white_hen_fix

Use case: background-extraction. Extract ONLY the white chicken in the lower left foreground of the reference, approximately x420-530 y710-817 in the 1920x832 image. Produce a clean transparent isolated sprite of that same white hen facing right, with red comb/wattle, cream feather body, brown tiny feet, and original children's storybook muted colors and dark outline. Include the COMPLETE comb and head, body and feet. NO soil, NO farmland patch above its head, NO grass, no shadow, no other birds, no background. Tight framing with a small transparent margin. Do not redesign the chicken or change its pose.

### farm_duck_fix

Use case: background-extraction. Extract ONLY the green-headed duck at the bottom foreground of this farm illustration (original x630-718 y740-818). Clean isolated transparent sprite, entire round green head, yellow bill, brown body, wings and tail intact, facing left. NO clipped top of head, no grass, no ground, no shadow, no other birds. Preserve original muted hand-painted children's book style and brown outline. Tight framing with a small transparent margin.

### farm_hen_fix

Use case: background-extraction. Extract ONLY the brown hen in the lower left foreground of this farm illustration (original x115-207 y660-770). Clean isolated transparent sprite, entire red comb, head, brown feather body, wings, tail and feet intact, facing right. No grass, soil, shadow, ground, other birds or scenery. Preserve original muted hand-painted children's book style and brown outline. Match the original pose and identity, tight framing with small transparent margin.

### farm_chick_fix

Use case: background-extraction. Extract ONLY the small yellow chick in the lower left foreground of this farm illustration (original x234-295 y651-713). Clean isolated transparent sprite, entire head, beak, yellow feather body, wings, tail and feet intact, facing left. No grass, soil, shadow, ground, other birds or scenery. Preserve original muted hand-painted children's book style and brown outline. Match original pose and identity, tight framing with small transparent margin.

### farm_rope_fix

Use case: precise-object-edit. Edit target is this farm illustration. Remove ONLY the two thin straight vertical hanging swing ropes inside the wooden swing frame (at approximately 47.5% and 51.8% across, from 29% to 46% height). Reconstruct the distant green bushes and fence visible behind those ropes. The freestanding outer wooden frame, horizontal timber beam, ivy/vines curling on the outer posts, and all other scenery must remain exactly unchanged. There must be NO hanging ropes or hanging seat inside the empty swing frame. Keep the full wide 1920:832 aspect composition, existing text, trunks, house, fields, colors and edges. Do not add anything.

### farm_rope_final

Edit target: this entire farm image. Remove the SINGLE remaining thin straight vertical swing rope at x approximately 989 (51.9% image width), from y255 to y357, inside the right side of the swing frame. That thin upright tan line immediately LEFT of the right wooden timber post is an unwanted leftover rope. Erase it completely and fill with matching distant green bush and wooden fence behind it. Keep the right thick wooden post and climbing vines untouched, keep horizontal beam untouched, keep every other pixel and all scenery/composition unchanged. The interior of swing frame must contain no thin hanging vertical lines. Preserve wide 1905x825 composition and text.

## Welcoming guide

Path: `public/cagent-welcome.png`. Mode: built-in image editing. Genuine alpha transparency; no mascot backdrop or frame. Reference: original Cagent sprite; farm variant also uses the original farm scene for pose alignment. Final prompt:

> Use case: identity-preserve. Edit target: the attached original CWrite Cagent bear sprite. Create ONE transparent-background production UI sprite, half-body/waist-up, tightly framed with minimal transparent padding. Preserve the same golden-brown bear, white curled academic wig, round glasses, blue knitted sweater, hand-painted warm illustrated style and proportions. Preserve the existing chest EdUHK green-and-orange emblem and exact EdUHK lettering unchanged and fully visible; no hand or prop over the chest mark. No text outside this emblem, no backdrop, no frame, no signs, no scenery, no duplicate mascot, no hearts. Keep both paws clear. Pose: friendly welcoming smile, head tilted slightly toward the viewer. One paw lifted beside the face in a small welcoming wave, the other paw resting on the horizontal upper edge of an invisible UI panel at the bottom of the sprite. The sprite will sit on a character-deck guidance panel. Show the complete lifted paw, torso, clear chest mark and resting paw. Cheerful, reassuring, restrained; do not stretch the body.

## Thinking guide

Path: `public/cagent-thinking.png`. Mode: built-in image editing. Genuine alpha transparency; no mascot backdrop or frame. Reference: original Cagent sprite; farm variant also uses the original farm scene for pose alignment. Final prompt:

> Use case: identity-preserve. Edit target: the attached original CWrite Cagent bear sprite. Create ONE transparent-background production UI sprite, half-body/waist-up, tightly framed with minimal transparent padding. Preserve the same golden-brown bear, white curled academic wig, round glasses, blue knitted sweater, hand-painted warm illustrated style and proportions. Preserve the existing chest EdUHK green-and-orange emblem and exact EdUHK lettering unchanged and fully visible; no hand or prop over the chest mark. No text outside this emblem, no backdrop, no frame, no signs, no scenery, no duplicate mascot, no hearts. Keep both paws clear. Pose: curious, attentive thinking expression with a gentle smile, looking slightly toward the viewer's left. One paw lightly touches the cheek near the chin; the other paw rests along the horizontal edge of an invisible UI panel at the bottom. Both eyes visible, gently raised eyebrow, no frown. The sprite will lean on the top edge of a story-planning suggestions panel. Preserve the clear fully visible chest emblem and original clothing. Do not include the panel itself.

## Farm swing overlay

Path: `public/cagent-farm.png`. Mode: built-in image editing. Genuine alpha transparency; no mascot backdrop or frame. Reference: original Cagent sprite; farm variant also uses the original farm scene for pose alignment. Final prompt:

> Use case: identity-preserve. Production UI sprite edit. Reference 1 is the original CWrite Cagent mascot: preserve its golden-brown fur, white curled academic wig, small round glasses, blue knitted sweater and the exact existing green/orange EdUHK chest mark and EdUHK lettering. Reference 2 is the farm scene, showing the intended seated swing pose and hand-painted illustration style. Make ONE crisp, clean, full-body transparent-background Cagent bear that can overlay the fuzzy bear sitting on that farm swing. Front facing with a slight turn to viewer's right, gentle welcoming smile. Both paws extended sideways at waist height, positioned as if holding existing swing ropes, but do NOT draw any ropes or swing. Seated posture, round furry legs bent in front, two clear bare bear feet near the bottom, no trousers or shoes. Head/body silhouette broad enough to cover the old seated bear. Preserve fully visible chest emblem, no hand over it. Match warm storybook colors and simple illustrated shading, sharp clean outlines, readable face. Tight portrait crop around entire bear, minimal transparent padding, about width:height 0.82. No background, no furniture, no frame, no floor, no props, no scenery, no extra character, no text outside the sweater emblem.


## Animated farm background

The live scene uses the clean plate `public/farm-motion-clean.webp` (1920 × 832), optimised transparent bear `public/cagent-farm-swing.webp`, and original farm artwork for masked bird/canopy layers. Ropes and the seat are SVG; motion uses browser CSS. No GIF or video is downloaded. The original static bear, birds, canopy and direction post are removed from the clean plate before moving layers are overlaid.

Clean plate prompt (built-in image editing):

> Use case: precise-object-edit. Edit target: the supplied original CWrite farm illustration. Make a clean background plate for animating the ORIGINAL illustration, not a redesign. Preserve the exact original 1920 by 832 composition (aspect 2.30769:1), camera, positions, all house/building geometry, signs and their text, the wooden swing frame, fences, paths, fields, watering cans and colors. Only erase these foreground figures and restore the scenery behind them: all four birds at the lower left (brown hen around x170 y710, yellow chick around x270 y690, white hen around x500 y770, brown duck around x645 y790); the seated bear and its hanging seat/ropes INSIDE the wooden swing frame around x950 y345 (KEEP the surrounding wooden swing frame and crossbar); and the leafy canopies of the three large fruit trees immediately left of the house, around x310 y260, x405 y225 and x472 y245 (KEEP the trunks below). Fill the erased birds with matching grassy ground, bear area with matching fence and greenery behind the swing, and erased leafy canopy areas with appropriate sky/distant landscape. Do not leave any animal head, body, foot, seat, hanging rope, or removed canopy. Do not add any character or object. All untouched areas must stay aligned pixel-for-pixel with the reference as closely as possible. No new text. No crop or zoom. Return the full same wide farm image, no transparent background. This clean plate will be shown only in small erasure areas under separately masked original artwork.

Direction post removal prompt (built-in image editing, second edit):

> Use case: precise-object-edit. Edit target: the provided clean CWrite farm background plate. Preserve the full wide 1920:832 layout, style and all other pixels as closely as possible. Remove ONLY the entire wooden two-arrow direction sign/post on the right of the swing, at about x1350 y295 (both arrow plaques reading Law-abiding Mess. / Back to Map, the vertical wooden post and its tiny base shadow). Fill that small area naturally with the existing green roadside grass and distant landscape/path behind it. This sign will be replaced by larger interactive website elements. No new sign, no text, no animals, no trees, no other changes, no crop or zoom. Same wide aspect 2.30769:1.

The original brand, EdUHK mark, footer, farm/map art and Cagent images are copied from CWrite. Production student portraits use their drawing/details through the server image endpoint. Local development can simulate a portrait using the drawing or an original illustration, with a visible simulated-preview label. No generated example girl is bundled or assigned to Tony.

## Wood frame

Path: `public/storybook-wood-frame.png` (1254 × 1254, alpha channel).

Mode: built-in image generation tool, using `public/storybook-forest.png` as a style reference. CSS nine-slice scaling preserves the corners; the final writing border is 5px rather than the initial heavy version. The center remains transparent. UI titles are live text.

Final prompt:

> Use case: illustration-story. Asset type: a single reusable raster UI border frame for a children's forest story-writing app. Use the attached forest illustration ONLY as painterly style and color reference. Create ONE square wooden picture / writing-board FRAME, front-facing orthographic flat 2D view, warm pale honey wood, softly hand-painted highlights, fine subtle grain, restrained darker brown edges, small inset corner joints. The wooden border should occupy only approximately the outer 7 percent of the square on each side. The entire LARGE CENTRAL RECTANGLE must be genuinely TRANSPARENT, as must the pixels outside the frame. Straight horizontal and vertical edges, nearly square corners with tiny soft irregularity; designed to be stretched using CSS nine-slice border without distorting its corner details. Keep all decorative grain and joints close to edges. The result should feel like the frame of an illustrated writing board in the same gentle children's storybook world as the reference. No scenery, no trees, no people, no girl, no animals, no bear, no writing, no words, no letters, no logos, no additional objects. Transparent-background production asset, square composition tightly filling the image.

## Forest frame

Path: `public/storybook-forest.png`. Generated using the supplied storyboard as a visual style reference: illustrated tree canopy, clouds, distant hills and windmill, flowers around a quiet ivory center. Used as the outer page background. The lower forest strip inside the panel was removed. It contains no sample characters.

## Font

Local Nunito regular/semibold/bold/extrabold files from Google Fonts; license in `public/fonts/OFL.txt`.

## Original white logo

`public/logo-white.webp` is copied directly from the original project's `public/logo 白.webp`. It is the source reference for the new Lite logo below. Farm retains its original text wordmark, with no global header.

## CWrite Lite logo

Saved path: `public/cwrite-lite-logo.png` (1606 × 979, RGBA with transparency). Mode: built-in image editing. Reference: `public/logo-white.webp`. Login and shared headers use this single combined asset; no separate Lite text span. The foil pack uses the original `public/logosmall.webp` as requested.

Final prompt:

> Use case: precise-object-edit. Asset type: production website logo on transparent background. Edit target: attached existing CWrite Creative white-and-gold logo. Preserve ALL existing letters, the original gold C and gold horizontal Creative ribbon, white Write lettering and small plant symbol precisely. Add only the word 'lite' in lowercase connected handwritten cursive, bright warm yellow/gold, tilted upward about 15 degrees, at the upper right of the logo above the last 'e'. Small elegant handwritten sub-brand word, around one fifth of the full CWrite wordmark width. Keep it visibly legible and separate from the original letters, no overlap, no oversized swoosh. Inspired by restrained Lite sub-brand treatments of established software brands, no other brands or marks. Tightly crop around the combined logo, minimal transparent padding. Genuine transparent background. Exact new text: lite. No square background, no added tagline, no UI, no extra words. Return one logo asset.

## Two-compartment Story pin shelf

Path: `public/story-pin-shelf.png` (1024 × 1536, transparent background). Mode: built-in image editing. Reference: original `public/roof.webp`. Live Story pin is overlaid in the upper compartment; the second stays empty. No Level mechanism or title is overlaid.

Final prompt:

> Use case: precise-object-edit. Edit the supplied illustrated golden wooden map pin shelf for the CWrite children's writing platform. Preserve the original hand-painted honey-gold wooden material, highlights, rounded wooden edges and small green leaves at the upper-right and lower-left. Change the structure to EXACTLY TWO empty recessed rectangular compartments stacked vertically. Remove the entire white title/level label compartment from the top: no header, no label panel, no Level text. Remove three of the five brown compartments, leaving exactly two. A single compact tall shelf with two equally sized compartments, each compartment about 1.7 times as wide as it is tall. Tightly frame the shelf. Transparent background around it. No pins, no text, no numbers, no extra compartments, no scenery. Match the reference illustration style and wood colors exactly.

## Visit Others' Farms

`public/navigation.webp` is copied unchanged from the original project. It includes the driving Cagent, car EdUHK mark, navigation device and speech bubble. Friend selection and the live list are interactive elements aligned to the illustration.

## Cagent on the writing board

Path: `public/cagent-board.png`. Mode: built-in image editing, transparent background. Reference: original `public/Cagentsit.webp`. The sprite is positioned with its paws on the live five-stage board; the board and bubble remain HTML/CSS, rather than text inside the image.

Final prompt:

> Use case: identity-preserve. Edit target: the provided original CWrite Cagent bear mascot. Create a transparent-background production UI sprite of exactly this same bear leaning forward with BOTH paws resting on the upper edge of an invisible horizontal sign, as if peeking over / leaning on a writing progress board. Front facing, friendly calm smile, original golden-brown fur, white curled academic wig, small round glasses, blue knitted sweater. Show head, shoulders, sweater chest and the two paws at bottom; no legs, no feet, no hearts, no furniture, no actual sign, no text outside the chest logo. Preserve the original green/orange EdUHK emblem and its lettering on the sweater chest exactly as in the original input; keep it fully visible above the paws. Both paws are level near the bottom, separated to either side of the chest. The invisible sign's top edge will be at the same horizontal line as the bottom of the paws. Maintain the original simple hand-painted cartoon style, thin warm outlines and gentle shading. Tight square crop, transparent background, no excessive blank margins, a SINGLE mascot sprite. Do not redesign the bear or change the logo.

## Current map pin box and optimized runtime images — 2026-10-03

Final workspace-bound box: `public/story-pin-shelf-v2.webp`, 360 × 540 RGBA, 42,562 bytes. Created with the built-in image generation tool, then encoded as WebP with alpha preserved. Its title is a live HTML plaque reading Your Writing Type. The original `public/storypin.webp` is used in the box, following the user's correction; the new paper/book marker remains only on Continue writing.

Final image prompt:

> Create a transparent-background isolated UI sprite for a children's illustrated storybook writing platform. A small elegant wall-hanging wooden organizer, front view, portrait 2:3 aspect, exactly TWO recessed horizontal compartments stacked vertically. Warm muted honey oak wood, fine hand painted grain, slim rounded rails and restrained shading, deep matte cork interiors. A small blank cream wooden plaque is centered on top rail (no words). Tiny muted sage leaves tuck behind one upper corner, not covering compartments. Crisp brown ink contours, cozy 2D painted storybook style like an illustrated farm, avoid glossy plastic, chunky bevels, heavy ornament, glow, Level text, numbers, writing, pins, or items inside. Empty compartments, fully visible edges, no floor/background/colored halo, genuine alpha. Organizer fills almost entire canvas with small transparent margin. Upper compartment between y25%-52%, lower between y58%-88%. Need small Web UI asset that is legible at 155px wide.

Current optimized runtime counterparts: `public/storybook-forest.webp`, `public/storybook-wood-frame.webp`, `public/cagent-thinking.webp`, `public/cagent-welcome.webp`, `public/cagent-board.webp`, `public/cwrite-lite-logo.webp`. Individual before/after byte counts are in `image-optimization.json`. Source PNGs are retained. These conversions change encoding and resolution only; no new artwork was introduced by compression. The twelve-bed soil grid and Continue marker are lightweight native SVG/HTML elements, not additional raster downloads.

## Drama dock pin — 2026-10-03

Reused the original `C:/Users/liuto/Desktop/CWrite/public/dramapin.webp`. Source retained in `public/dramapin.webp` (92,164 bytes). Runtime asset `public/dramapin-small.webp` is 300px wide, WebP quality 85 with alpha retained, 9,222 bytes. The second wooden dock compartment uses this original Drama artwork. Stage backgrounds and transparent Cagent sprites reuse existing compressed WebP assets. No additional generated bitmap is needed for the Drama flow.

The earlier twelve-bed native SVG soil overlay has been removed. Farm saplings and labels are positioned over the original painted background.

## Cagent poses, clouds and example plans — 2026-10-03

Built-in image generation supplied three transparent poses: `public/cagent-planning-v2.webp` (460×561, 52,768 bytes), `public/cagent-director-v2.webp` (460×555, 49,546 bytes), and `public/cagent-celebrate-v2.webp` (460×535, 52,722 bytes). The generation was corrected against the original EdUHK chest mark; runtime images preserve aspect ratio and alpha. Forms change on an explicit help or suggestion action, not hover. Story character selection uses the existing desk-leaning pose as requested.

`public/farm-scene-cloudless.webp` (1905×826, 178,974 bytes) removes painted static clouds; six lightweight native SVG clouds drift above it with CSS. Existing swing, foliage, bird and growth layers remain. Source art is retained, and reduced-motion preferences disable movement.

The two final Story Canvas examples contrast a simple pastoral plan (four visible cards, three connections) with a branching science-fiction plan (eight visible cards, eight connections). Both use actual CanvasView cards, generated backgrounds and object illustrations. Backgrounds are softened beneath readable cards. Exact generation prompts are in `canvas-example-prompts.md`; originals remain in the image generator output directory. The runtime assets below are all WebP, loaded only when their example is opened:

| Runtime path | Dimensions | Bytes |
| --- | --- | ---: |
| `public/examples/park.webp` | 900×600 | 99,576 |
| `public/examples/letter.webp` | 320×213 | 11,172 |
| `public/examples/space.webp` | 900×600 | 99,280 |
| `public/examples/nova.webp` | 320×480 | 28,986 |
| `public/examples/robot.webp` | 320×384 | 30,492 |
| `public/examples/battery.webp` | 320×300 | 17,664 |
| `public/examples/shuttle.webp` | 320×213 | 15,534 |

Characters and objects have genuine transparency. The pastoral example also reuses the original Fox/Pip cards. Earlier garden, stream and child portrait source PNGs are retained in the generated-image directory, while unused runtime copies have been removed. Runtime byte counts are in `example-assets-optimization.json` and `scene-assets-optimization.json`.
