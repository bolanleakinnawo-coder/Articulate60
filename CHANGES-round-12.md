# Loquiex round 12 (19 November 2026)

Built on round 11. **Deploy both: Render (backend) and Netlify (frontend).**

## Changes (only what Sheriff asked)

- **Learn (coming soon):** matches Sheriff's screenshot. There's no card around the content, which is centred, with "Learn" and its subtitle on the left. Each timer box (Days, Hours, Mins, Secs) has the same background as the Share a Win question box: the olive wash over the card colour, with a thin border. "Launching in" is in the light olive colour from the screenshot.
- **Group Practice:** "Different voices, different perspectives." and "There's more than one way to see it." are removed. Nothing else on the page changed.
- **Team Admin deletes their account:** the team ends, and every member moves to the Free plan straight away. A member's own individual plan, if they have one, isn't touched. (Before, members kept the team plan until the paid date.)

## Files

- Backend: `services/team.js`.
- Frontend: `src/styles/Learn.css`, `src/Pages/GroupPractice.jsx`.

## Deploy

1. **Render:** copy the contents of `Articulate60-backend` into your backend git folder and push.
2. **Netlify:** copy the rest into your frontend git folder and push.
