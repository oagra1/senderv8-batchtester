const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const entries = {
  'popup.js': 'src/popup/main.js',
  'background.js': 'src/background.js',
  'load.js': 'src/load.js',
  'inject/inject.js': 'src/content-scripts/inject.js',
  'inject/content-script.js': 'src/content-scripts/content-script.js',
  'inject/obfuscate.js': 'src/obfuscate/obfuscate.js'
};

(async () => {
  for (const [out, entry] of Object.entries(entries)) {
    const outfile = path.join('js', out);
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      outfile,
      sourcemap: true,
      format: 'iife',
      target: 'es2015',
      plugins: [
        {
          name: 'externals',
          setup(build) {
            build.onResolve({ filter: /^[^\.\/].*/ }, args => ({ path: args.path, external: true }));
            build.onResolve({ filter: /\.vue$/ }, args => ({ path: args.path, external: true }));
          }
        }
      ]
    }).catch((e) => {
      console.error('Failed to build', entry, e);
      process.exitCode = 1;
    });
  }
})();
