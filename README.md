# TeamViewer Worlds

An English-language, browser-native 3D adventure with a playable TIA character, three floating islands, and twelve collectible discoveries about TeamViewer Tensor and TeamViewer ONE. The three chapters share one warm, tactile clay-inspired visual system and the same choose, explore, collect, continue flow.

## Run locally

Requires Node.js 22 or newer. No package installation is needed: Three.js and the fonts are included locally.

```powershell
npm.cmd run dev
```

Open **http://localhost:5173**. Alternatively, double-click `START.cmd` and leave the server window open. If the port is already occupied, run `npm.cmd run dev -- --port 5174`.

## Play

- Choose **Start exploring** to visit Connection Island, or select a product world directly.
- Move with **WASD** or the **arrow keys**. Hold **Shift** to run and press **Space** to jump.
- Walk to a portal and press **E** to travel. Clicking a portal also guides TIA to it.
- Click a golden block, its minimap marker, or **Find my next discovery** to guide TIA around buildings automatically.
- Press **E** near a block, read its product story, then choose **Collect discovery**.
- Drag the world to orbit the camera; scroll over it to zoom.
- Press **M** for the world map or **Escape** to close a dialog / open the pause guide.
- On touch screens, use the direction pad and **Jump**, or tap a destination. Drag to orbit.
- Open **Your journey** to revisit discoveries. Progress is saved in the current browser. **Restart your journey** asks for a second click before clearing it.

Sound effects are off initially and can be enabled with the speaker button.

## Included worlds

| World | Discoveries |
| --- | --- |
| Connection Island | Connection observatory, playable TIA, Tensor and ONE portals |
| TeamViewer Tensor | Remote access, Conditional Access, SSO, auditability, integrations, IT/OT connectivity |
| TeamViewer ONE | Digital Employee Experience, proactive monitoring, patch management, asset management, AI, automation and remediation |

The content is an illustrative product introduction. Availability, add-ons, configuration, and licensing depend on the TeamViewer offering and agreement. Every discovery includes two official links: one to the specific product capability and one to the related administrator configuration guide.

## Build and verify

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`dist/` and `docs/` are complete static websites. The browser uses no Node.js, backend, API key, or runtime server. The app uses native ES modules and import maps, so opening `index.html` directly with a `file:` URL is not supported.

## Publish on GitHub Pages

After pushing this repository to GitHub, open **Settings → Pages** and choose:

- **Source:** Deploy from a branch
- **Branch:** `main` (or your default branch)
- **Folder:** `/docs`

GitHub Pages will then publish the existing static `docs/` folder at `https://<your-github-user>.github.io/<repository-name>/`. No Node.js process runs in production. The relative asset paths make the 3D scene, mouse rotation, zoom, world cards, portals, click-to-walk, dialogs, and local browser progress work from the repository subpath.

The unit suite checks persistence recovery, unique progress, world boundaries, paths around buildings, source domains, and HTTP serving. The isolated Chrome browser suite checks a complete 12-discovery playthrough, duplicate prevention, persistence after reload, dialogs, sound controls, and mobile layout:

```powershell
node scripts/verify-browser.mjs
node scripts/verify-interactions.mjs
node scripts/verify-landscapes.mjs
```

Chrome is detected in the per-user Windows installation. Set `CHROME_PATH` to another Chrome executable if necessary. Screenshots and test results are written to `artifacts/`. The test browser uses its own profile and does not use your normal Chrome session.

## Project structure

- `src/scene.js`: procedural 3D models, lighting, animation, movement, portals, camera, picking.
- `src/landscape.js`: batched clay-style scenery, flower meadows, floating islets, and one waterfall per chapter. Each island uses the same terrain palette and landmarks; animated scenery respects reduced motion.
- `src/navigation.js`: obstacle-aware routes for click-to-walk.
- `src/data.js`: worlds, product content, source links, progress validation.
- `src/main.js`: interface, dialogs, journal, audio, travel, persistence.
- `src/style.css`: responsive layouts, typography, touch controls, reduced motion.
- `public/vendor/three/`: Three.js 0.180.0 and its MIT license.
- `public/fonts/`: local DM Sans and Manrope fonts and their OFL licenses.

## Research and references

Content checked on **September 11, 2026**:

- [TeamViewer Tensor](https://www.teamviewer.com/en-us/products/tensor/)
- [Conditional Access](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-tensor/conditional-access/)
- [Tensor SSO](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-tensor/sso/single-sign-on-sso/)
- [What is TeamViewer Tensor?](https://www.teamviewer.com/en/global/support/knowledge-base/teamviewer-tensor/what-is-teamviewer-tensor/)
- [TeamViewer ONE](https://www.teamviewer.com/en/platform/one/)


## Credits

Independent demonstration concept. The TIA visual asset was supplied by the project owner. TeamViewer, Tensor, and TeamViewer ONE belong to their respective owners. No affiliation or sponsorship is implied. The environments are generated in code; no third-party game assets or audio are included.
