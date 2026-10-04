# Scene asset generation briefs

The built-in image generator supplied the following assets; source PNGs remain in the generated-image directory. These are concise generation briefs. The exact prompt set for the later Story Canvas artwork is saved separately in [canvas-example-prompts.md](canvas-example-prompts.md).

- **Planning Cagent:** preserve the original bear identity, white curls, navy jumper and faithful EdUHK chest mark; point toward story cards in a welcoming planning pose, with genuine transparency. Runtime: `public/cagent-planning-v2.webp`.
- **Director Cagent:** same character and chest mark, stand while holding a story book and gesturing toward the student's stage; preserve transparency and proportions. Runtime: `public/cagent-director-v2.webp`.
- **Celebrating Cagent:** same character and chest mark, hold a rolled script and give a cheerful encouraging gesture; preserve transparency and proportions. Runtime: `public/cagent-celebrate-v2.webp`.
- **Cloudless farm:** remove only the painted clouds from the reference farm scenery, retaining its farm composition for the moving foreground controls and characters. Runtime: `public/farm-scene-cloudless.webp`. Drifting clouds are lightweight native SVG/CSS layers.

Pose generations were corrected using the original EdUHK chest-mark reference. Conversion only resizes and encodes WebP; it does not stretch or redraw the artwork. Dimensions and byte counts are recorded in `scene-assets-optimization.json`.
