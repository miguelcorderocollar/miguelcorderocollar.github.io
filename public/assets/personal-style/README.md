# Homepage design assets

Base styles, tokens, native motion helpers, the original SVG M mark and local JetBrains Mono fonts from Miguel personal style.
Source: https://github.com/miguelcorderocollar/miguel-personal-style
Local source: /home/mikelon797/dev/skills/miguel-personal-style/skills/miguel-personal-style/assets/

Only the resources used by the homepage are included. Font licensing is in fonts/OFL.txt. The mountain photograph remains the existing processed site asset; no new image treatment was applied.

For `/brand/`, `image-rendering.js` and its `halftone.js` dependency were deliberately added from the maintained skill checkout on 22 October 2026. The display filter reduces moiré in scaled banner previews without altering downloadable images. The helper comes from the local filtering update on top of b292dcc.

Motion choices follow https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md: occasional disclosure state changes at 180ms, subtle 120ms press feedback, immediate keyboard actions and reduced-motion alternatives. The SVG mark is extracted unchanged from the kit's design-system.html MARK constant.
