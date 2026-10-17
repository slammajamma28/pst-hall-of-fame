# PST Fantasy Sports Hall of Fame

Static GitHub Pages site for the PST Fantasy Sports Hall of Fame.

## Local preview

Run any static server from the repository root, for example:

    python3 -m http.server 8000

Then open http://localhost:8000.

## GitHub Pages

This is a dependency-free static site. Publish the repository root from the main branch in the repository's Pages settings. The site reads its normalized medal data from public/data.js.

Data source: the supplied HallofFame.xls. Only Gold, Silver, and Bronze results are included. League cards and player search results link to the individual PST forum topic listed in the Hall of Fame thread.

