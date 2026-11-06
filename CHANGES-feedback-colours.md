# Feedback page: tab colours, font sizes, off-white

Built on the latest FeedbackReport (share-image download, 2026-11-05).

## Changed files (drop in, replacing the old ones)
- src/Components/practice/FeedbackReport.css

FeedbackReport.jsx is unchanged.

## What changed
1. Tabs (Overview, Clarity, Delivery, Fillers, Grammar, Vocabulary)
   - Every tab you are not on now shows the sage highlight colour.
   - The tab you are on shows the dark style (dark fill, off-white text) with
     an off-white outline so you can still see which one is open.
   - Same colours on every tab.
2. Font sizes now follow the project scale (Home, Learn, Practice, Profile):
   page title 28px, section headings 18px, card titles 15px, row titles 14px,
   body 14px, small text 12-13px, tabs 13px, main buttons 16px. Extra-bold
   (800) weights are now 700, like the rest of the app.
3. Cream removed. The page used its own cream shades (#ece3cf, #ddd6c4).
   It now uses the app's off-white #f1ecde (--text-primary, the same as
   Yap Mode and Home) for headings, transcript and suggestion text.
