# Adaptive Quadtree Studio

Adaptive Quadtree Studio is an offline-first browser application that reconstructs photographs through error-driven spatial subdivision.

The image begins as four averaged regions. At every iteration, the application identifies the region with the highest refinement priority and subdivides it. Depending on the selected strategy, a region can split into four quadrants, two horizontal regions, or two vertical regions.

![Adaptive Quadtree Studio](https://img.shields.io/badge/status-v2-e34d17)

## Features

- Adaptive quadtree, horizontal, vertical, and automatic best-split subdivision
- Total-error, expected-error-reduction, deviation, edge, and random priority models
- Adjustable area weighting for detail-versus-coverage control
- RGB, luminance, saturation, and alpha-channel analysis
- Mean, median, and dominant representative colors
- Independent minimum cell width and height limits
- Pixel-budget and RMSE quality stopping conditions
- Priority painting to boost or suppress refinement in selected areas
- Before/after comparison divider and original-image ghosting
- Cell outlines, error heatmap, depth colors, split highlighting, and animation
- Cell magnifier and detailed numerical inspector
- Complete refinement history with rewind, undo, redo, and playhead scrubbing
- Error-over-time graph and live progress information
- Portrait, landscape, pixel-art, edge, and balanced presets
- Drag-and-drop, file selection, and clipboard image input
- Keyboard shortcuts and full-screen viewing
- Persistent browser library powered by IndexedDB
- Side-by-side comparison of saved studies
- PNG, full-resolution PNG, SVG, WebM, and project JSON export
- Resumable JSON project imports
- Shareable configuration URLs
- Transparent-image support

OKLab and CIELAB perceptual color analysis are intentionally deferred.

## Run locally

No build process or dependencies are required.

You can open [`dist/index.html`](dist/index.html) directly, although serving the folder through a local HTTP server provides more consistent browser storage and export behavior.

Using Python:

```powershell
python -m http.server 8765 --directory dist
```

Then open:

```text
http://127.0.0.1:8765
```

## Controls

| Action | Control |
| --- | --- |
| Play or pause | `Space` |
| Split once | `Right Arrow` |
| Undo one split | `Left Arrow` |
| Rewind | `R` |
| Save to the browser library | `S` |
| Download PNG | `D` |

The playback menu includes 1×, 5×, 20×, and instant processing modes.

## Refinement models

### Total reconstruction error

Prioritizes regions using color variance and area. This balances detailed regions against large areas that still contribute significant image error.

### Expected error reduction

Evaluates the prospective children of each region and prioritizes the split expected to reduce reconstruction error the most.

### Local standard deviation

Prioritizes local variation without strongly accounting for region size. This concentrates refinement around texture.

### Edge intensity

Prioritizes regions containing strong luminance transitions, helping silhouettes and structural details appear earlier.

### Random experiment

Uses deterministic pseudo-random priorities for comparison and educational experimentation.

## Project structure

```text
dist/
├── index.html    # Application structure
├── styles.css    # Responsive interface and visualization styles
├── engine.js     # Image analysis and adaptive subdivision engine
├── app.js        # UI, rendering, playback, masks, and exports
└── storage.js    # IndexedDB persistence layer
```

## Data and privacy

Images are processed locally in the browser. The application does not upload photographs to a server.

Saved studies are stored in the browser's IndexedDB database. Project JSON files and exported images are created locally.

## Browser support

A current version of Microsoft Edge, Google Chrome, Firefox, or another modern browser is recommended. WebM export requires `MediaRecorder` and `canvas.captureStream()` support.

## Technical notes

- Analysis is performed on a working image whose longest side is capped at 1,024 pixels.
- Full-resolution export scales the adaptive cell geometry back to the original image dimensions.
- Each region stores its average color, variance, error, edge strength, mask weighting, and subdivision depth.
- History stores immutable split operations instead of complete canvas snapshots.
- The application has no runtime dependencies and can function offline after loading.

## Product requirements

See [PRD.md](PRD.md) for the product goals, requirements, acceptance criteria, and future roadmap.

