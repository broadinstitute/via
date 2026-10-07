# VIA marketing page

A public landing page for VIA (Variant Interpretation Application). It is plain HTML, CSS, images and
JavaScript with no build step, modelled on the All of Us + AnVIL Imputation Service page in
terra-scientific-pipelines-service (`ui/allofus-anvil-imputation`).

### Code layout
* `index.html` — the page: hero, why use VIA, the Table and Review views, how it works, data sources, call to action and footer.
* `css/style.css` — all styles. Brand tokens are at the top; the product illustrations reuse the app's palette and its Public Sans face.
* `js/illustrations.js` — draws the two variants-table illustrations and the hero's DNA helix. The figures are illustrative, not real All of Us data.
* `js/tabs.js` — the Table / Review tabs. The open tab can be linked with a bare hash, e.g. `<base-url>#review`.
* `img/` — the All of Us and Broad logos (copied from the imputation site), the VIA mark on its navy tile (`via-mark.svg`, the same as the app's favicon), and the same mark on a white tile for dark backgrounds (`via-mark-light.svg`), used in the hero beside the white All of Us logo.

### Development
Open `index.html` in a browser, or serve the folder with any static server, e.g.

```
cd marketing
python3 -m http.server 8000
```

### Before publishing
* **Launch link.** Both "Open VIA" buttons point at `#get-started`. Replace them with the Researcher Workbench launch URL once VIA is published there (marked `TODO` in `index.html`).
* **Funding statement.** The footer says VIA is developed by the Broad Institute as part of the All of Us Data and Research Center. Confirm the wording, and add award numbers if the program requires them, as the imputation site does.
* **Research-use and data-dissemination language.** The page makes no claims about clinical use or small-cell-count suppression. Add whatever the program requires.
* **Scale figures.** The hero callout and the cohort card say "more than a billion variants", and the hero callout and the engine section quote NIH's "world's largest integrated genomics and health database". Both come from NIH's 2025 announcement, and CDR v8 alone has more than 1.2 billion short-read WGS variants. Don't shorten it to "largest variant dataset": UK Biobank's 490,640 genomes have about 1.5 billion variants. Re-check the figures against the CDR version VIA reads before publishing.
* **Deployment.** There is no bucket or deploy script yet. The imputation site deploys to GCS with `deploy.py`, behind a load balancer configured in terraform-ap-deployments; the same pattern would work here.
