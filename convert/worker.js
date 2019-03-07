/*! worker.js | v1.7.2 | MIT License */
self.importScripts(
  '/js/tobmp.min.js',
  'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/jpegtran.min.js',
  'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/cjpeg.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.2.0/dist/jszip.min.js',
);

const
  pass = /\/(?:bmp|jpeg)$/,
  type = 'image/jpeg';

// Blob to Uint8Array
const blob2array = async blob => new Uint8Array(await new Response(blob).arrayBuffer());

// Blob to ImageData
const getImageData = async blob => {
  const bitmap = await self.createImageBitmap(blob).catch(() => false);

  if (!bitmap) { return null; }

  const
    {width, height} = bitmap,
    ctx = new OffscreenCanvas(width, height).getContext('2d');

  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, width, height);
};

// use Mozjpeg
const doMozjpeg = (tran, u8arr, quality = null) => {
  if (!u8arr || u8arr.length === 0) { return null; }

  const {data} = tran ?
    jpegtran(u8arr, {optimize: true, copy: 'none'}) :
    cjpeg(u8arr, {quality, optimize: true});

  if (!data || data.length === 0) { return null; }

  return new Blob([data], {type});
};

// convert image
const convert = async data => {
  const {item, file, quality} = data;
  let {imgData} = data;

  if (!imgData && !pass.test(file.type)) {
    imgData = await getImageData(file);
    if (!imgData) { return self.postMessage({type: 'failed', item}); }
  }

  const
    tran = file.type === type && quality === '100',
    u8arr = imgData ? toBMP(imgData) : await blob2array(file),
    blob = doMozjpeg(tran, u8arr, quality);

  item.name = item.name.replace(/\.\w+$/, '.jpg');

  self.postMessage({type: 'success', blob, item});
};

// zip file
const compress = async list => {
  const
    zip = new JSZip,
    nameList = [];

  for (let {name, blob} of list) {
    nameList.push(name);
    const n = nameList.filter(v => v === name).length;
    if (n > 1) { name = name.replace(/\.jpg$/, `(${n}).jpg`); }
    zip.file(name, blob);
  }

  const blob = await zip.generateAsync({type: 'blob'});

  self.postMessage({type: 'zip', blob});
};

self.addEventListener('message', ({data}) => {
  if (data.type === 'convert') {
    convert(data);
  } else if (data.type === 'zip') {
    compress(data.list);
  }
});

self.postMessage({type: 'ready'});
