const fs = require('fs');

const src = './projects/move-it/src/lib/move-it.css';
const dest = './dist/css/move-it.css';

fs.copyFile(src, dest, (err) => {
  if (err) throw err;
  console.log('build-css completed');
});