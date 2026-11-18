# Loquiex corrections, round 9

Full project: `merged-project/ARTICULATE 60 (round 9).zip` (round 8 plus the changes below).
Previews: `launch-round-9/previews/`.

## Deploy
Only the frontend changed. Unzip, copy the contents of `ARTICULATE 60` into your git folder and push. Netlify rebuilds by itself. **Render does not need a redeploy** and there are no new environment variables.

## Changes
1. **Research Mode speaking time:** the choices are now **30 sec, 45 sec and 1 min**. 2 min is gone from Research Mode. (Yap Mode and Spin the Jar keep 30 sec / 1 min / 2 min.) If someone had 2 min picked elsewhere, Research Mode starts them on 1 min.
2. **Main link goes to the Home tab again:** opening loquiex.netlify.app (or any link to the main address, including the research pages and the share link) now goes straight to the Home tab, the way it was before. Signed-out people are sent to log in. The landing page code is kept for later; nothing links to it (it only opens if someone types /landingpage).
3. **Research Mode headings are smaller:** "Learn something new. / Be able to explain it." is now the same size as Yap Mode's "No prompt. Just talk." (22px), and "How to research better" is a little smaller too.
4. **"Your research toolkit"** is underlined (brand olive line).
5. **learned → learnt:** "Test what you've learnt.", "explain what you've learnt without reading from them", "Explain what you learnt" (recording screen), and the feedback tip "use what you learnt here". The research topics "Learned Helplessness" and "Learned Optimism" are kept as they are, because those are the names of the theories.
6. **Splash screen:** the Loquiex logo is about a third bigger.
