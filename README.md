# WASENDER2

This repository contains the unpacked production build of the WASENDER2 browser extension. The original source files were not included in the initial commit and the JavaScript bundles in `js/` referenced them only through source maps.

## Source extraction

A new `src/` directory has been reconstructed from the contents of the source maps found in `js/*.map`. Run `python scripts/extract_src.py` to regenerate the `src` tree if needed.

## Building

The repository now includes a lightweight build process using [esbuild](https://esbuild.github.io/). After installing Node.js dependencies run:

```bash
npm install
npm run build
```

This will bundle the files in `src/` back into the `js/` folder with accompanying source maps. External dependencies (e.g. Vue, Element-UI) are left unresolved so they need to be provided at runtime.
