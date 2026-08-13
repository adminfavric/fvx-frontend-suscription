// Genera public/version.json desde la versión de package.json (corre solo en
// `npm run build` vía el script `prebuild`). El admin consulta ese archivo para
// detectar que hay un build nuevo desplegado y ofrecer "Actualizar".
// Para publicar una versión: subir `version` en package.json y desplegar.
const fs = require('fs');
const path = require('path');

const pkg = require(path.join(__dirname, '..', 'package.json'));
const out = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(
  out,
  JSON.stringify({ version: pkg.version, builtAt: new Date().toISOString() }, null, 2) + '\n',
);
console.log(`version.json → v${pkg.version}`);
