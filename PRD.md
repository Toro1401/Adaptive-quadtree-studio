# Product Requirements Document

## Adaptive Quadtree Studio v2

| Field | Value |
| --- | --- |
| Product | Adaptive Quadtree Studio |
| Version | 2.0 |
| Status | Implemented local application |
| Platform | Modern desktop and mobile browsers |
| Distribution | Static offline-capable website |

## 1. Product summary

Adaptive Quadtree Studio is an interactive image-analysis and visualization application. It approximates a source image using a variable-resolution collection of uniformly colored rectangular cells.

The application starts with a 2×2 decomposition. It repeatedly selects a cell according to a configurable error model and replaces that cell with two or four children. Each child is colored using a representative color calculated from the source pixels beneath it.

The product is intended to make adaptive spatial subdivision understandable, observable, and creatively useful.

## 2. Problem statement

Conventional image downsampling assigns the same resolution to every part of an image. This is inefficient for images containing both smooth areas and complex edges or textures.

Users need a visual tool that demonstrates how image resolution can be allocated according to local information, while allowing them to compare algorithms and control the balance between detail, coverage, and resource limits.

## 3. Goals

- Explain adaptive image subdivision through direct visual feedback.
- Produce recognizable image approximations under a user-defined cell budget.
- Let users compare refinement and subdivision strategies.
- Make every refinement step reversible and inspectable.
- Support creative control through masks, presets, and visualization modes.
- Keep image processing private and local to the browser.
- Export results in raster, vector, animation, and resumable project formats.

## 4. Non-goals

- Lossless image compression
- Professional photo editing or retouching
- Server-side image processing
- Collaborative cloud project editing
- Neural-network image reconstruction
- OKLab or CIELAB perceptual color analysis in the current release

## 5. Target users

### Creative technologists

Users exploring generative graphics, pixelation, abstraction, or alternative rendering techniques.

### Students and educators

Users demonstrating quadtrees, greedy optimization, image error, hierarchical subdivision, or spatial data structures.

### Developers and researchers

Users comparing refinement heuristics and inspecting their visual and numerical behavior.

### Designers and artists

Users creating exportable adaptive mosaics from photographs.

## 6. Core user journey

1. The user uploads, drops, or pastes an image.
2. The application creates four initial averaged cells.
3. The user selects a refinement model, subdivision strategy, and stopping rules.
4. The user steps manually or starts automatic refinement.
5. The interface shows the reconstruction, current error, progress, and next selected cell.
6. The user may inspect cells, scrub history, paint priority regions, or compare with the source.
7. The user saves the study locally or exports the result.
8. The user can reopen a saved study and continue refining it.

## 7. Functional requirements

### 7.1 Image input

- The system must accept images through a file picker.
- The system must accept drag-and-drop images.
- The system must accept pasted clipboard images.
- The system must support common browser-readable image formats.
- The system must preserve source alpha transparency.
- Image data must remain local to the browser.

### 7.2 Initial decomposition

- Every new image must begin with four cells.
- The four cells must cover the full source image without gaps.
- Each cell must use a representative color derived from the source pixels beneath it.

### 7.3 Representative colors

The user must be able to select:

- Mean color
- Median color
- Dominant quantized color

### 7.4 Analysis channels

The user must be able to calculate variation from:

- Full RGB color
- Luminance
- Saturation
- Alpha transparency

### 7.5 Refinement priority

The system must provide:

- Total reconstruction error
- Expected error reduction
- Local standard deviation
- Edge intensity
- Deterministic random refinement

The user must be able to adjust area weighting to favor local detail, balanced reconstruction, or broad image coverage.

### 7.6 Subdivision

The system must support:

- Four-way quadtree subdivision
- Horizontal binary subdivision
- Vertical binary subdivision
- Automatic selection of the most efficient available split

Cells must not overlap, and their children must cover exactly the parent's area.

### 7.7 Stopping conditions

The system must stop automatically when any active condition is reached:

- Maximum cell budget
- Target RMSE quality
- Minimum permitted cell width
- Minimum permitted cell height
- No eligible cell remains

The interface must identify the stopping reason.

### 7.8 Playback and history

- Users must be able to split one cell manually.
- Users must be able to play and pause refinement.
- Playback must offer multiple speeds and an instant mode.
- Users must be able to undo, redo, and rewind.
- A playhead must allow direct navigation through recorded split history.
- Starting a new split from an earlier history position must create a new history branch by discarding the previous future operations.

### 7.9 Priority masks

- Users must be able to paint regions that attract additional refinement.
- Users must be able to paint regions that suppress refinement.
- Brush size must be adjustable.
- Masks must influence cell priority without changing displayed source colors.
- Applying a changed mask must rebuild refinement from the initial decomposition.

### 7.10 Visualization

The system must provide:

- Draggable original/reconstruction comparison
- Adjustable original-image ghost overlay
- Cell boundary outlines
- Error heatmap
- Quadtree depth colors
- Highlighting of the next selected cell
- Split animation
- Full-screen canvas mode
- Live error-versus-history graph
- Cell magnifier and numerical inspector

### 7.11 Presets

The product must include presets optimized for:

- Portraits
- Landscapes
- Pixel art
- Edge structure
- Balanced general-purpose reconstruction

### 7.12 Persistence

- Users must be able to save studies to IndexedDB.
- Saved studies must include the source image, reconstruction history, settings, mask, and preview.
- Saved studies must survive page refreshes.
- Users must be able to reopen or delete saved studies.
- Two saved studies must be viewable side by side.

### 7.13 Import and export

The system must export:

- Working-resolution PNG
- Full-source-resolution PNG
- SVG rectangle reconstruction
- WebM refinement animation
- Resumable JSON project

The system must import valid v2 JSON projects and allow refinement to continue.

### 7.14 Shareable settings

- Users must be able to encode the current algorithm settings in the page URL.
- Shared URLs must not contain the source image or saved project data.

### 7.15 Keyboard access

The application must support keyboard shortcuts for playback, stepping, undo, rewind, saving, and downloading.

## 8. Quality and performance requirements

- The interface must remain responsive during automatic refinement.
- Instant mode must yield periodically to the browser's rendering loop.
- Working analysis resolution must cap the longest image dimension at 1,024 pixels.
- Full-resolution export must use original image dimensions.
- Split history must store operations rather than complete raster snapshots.
- The interface must adapt to desktop, tablet, and mobile widths.
- Primary controls must include visible focus states.
- The application must have no external runtime dependencies.

## 9. Error model

For a cell containing `N` sampled pixels, the default color variance is calculated from the RGB channel variances:

```text
variance = (variance(R) + variance(G) + variance(B)) / 3
```

The cell's total reconstruction error is proportional to:

```text
total error = variance × area
```

Area weighting generalizes this relationship:

```text
priority = variance × area^weight × mask weight
```

Expected error reduction compares the parent cell's squared error with the combined squared error of its prospective children.

## 10. Success criteria

- A user can load an image and obtain a four-cell reconstruction.
- A single four-way refinement produces seven cells.
- Child colors are calculated from the untouched source image.
- Large regions and small textured regions receive balanced refinement under the default model.
- Rewinding returns the reconstruction to four cells.
- Undo, redo, and playhead navigation reproduce deterministic prior states.
- Dimension limits prevent cells from refining below the chosen scale.
- Saving and reopening a study preserves its visible state and history.
- PNG and SVG exports visually match the current reconstruction.
- A generated-image browser smoke test completes 12 four-way refinements at the expected 40 cells.

## 11. Current constraints

- Browser canvas dimension and memory limits may prevent extremely large full-resolution exports.
- WebM export depends on browser support for `MediaRecorder` and `canvas.captureStream()`.
- Saved projects remain local to the browser profile unless exported as JSON.
- Median and dominant-color modes use sampled pixels for performance on large cells.
- Shareable URLs reproduce settings but do not include images or histories.

## 12. Future roadmap

- OKLab and CIELAB perceptual color analysis
- Optional integral-image acceleration
- Configurable animation duration and frame rate
- More vector output formats
- Web worker processing for very high cell budgets
- Installable Progressive Web App packaging
- Accessible text descriptions of visual error maps
- Additional region shapes beyond axis-aligned rectangles

