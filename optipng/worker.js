/*! worker.js | v1.3.3 | MIT License */

self.importScripts(
  'https://cdn.jsdelivr.net/npm/optipng-js',
  'https://cdn.jsdelivr.net/npm/jszip@3.2.0/dist/jszip.min.js',
);

// use Optiong.js
const doOptipng = (u8arr, level) => {
  const {data} = optipng(u8arr, ['-o' + level]);
  return data ? new Blob([data], {type: 'image/png'}) : null;
};

// Blob to Uint8Array
const blob2array = async blob =>
  new Uint8Array(await new Response(blob).arrayBuffer());

// optimize image
const optimize = async data => {
  const
    {item, file, level} = data,
    u8arr = await blob2array(file),
    blob = doOptipng(u8arr, level);

  self.postMessage({type: 'success', blob, item});
};

// zip file
const compress = async list => {
  const
    zip = new JSZip,
    offset = new Date().getTimezoneOffset() * 60000,
    nameList = [];

  for (let {name, blob} of list) {
    nameList.push(name);
    const n = nameList.filter(v => v === name).length;
    if (n > 1) { name = name.replace(/\.png$/, `(${n}).png`); }
    zip.file(name, blob, {date: new Date(Date.now() - offset)});
  }

  const blob = await zip.generateAsync({type: 'blob'});

  self.postMessage({type: 'zip', blob});
};

self.addEventListener('message', ({data}) => {
  if (data.type === 'optimize') {
    optimize(data);
  } else if (data.type === 'zip') {
    compress(data.list);
  }
});

self.postMessage({type: 'ready'});
