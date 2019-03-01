/*! worker.js | v1.5.8 | MIT License */
{
  self.importScripts(
    '/js/tobmp.min.js',
    'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/jpegtran.min.js',
    'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/cjpeg.min.js',
  );

  const
    pass = /\/(?:bmp|jpeg)$/,
    type = 'image/jpeg';

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

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

  const doMozjpeg = (convert, u8arr, quality = null) => {
    if (!u8arr || u8arr.length === 0) { return null; }

    const {data} = convert ?
      cjpeg(u8arr, {quality, optimize: true}) :
      jpegtran(u8arr, {optimize: true, copy: 'none'});

    if (!data || data.length === 0) { return null; }

    return new Blob([data], {type});
  };

  self.addEventListener('message', async ev => {
    const {item, quality} = ev.data;
    let {file, data = null} = item;

    item.data = null;

    if (!data && !pass.test(file.type)) {
      data = await getImageData(file);
      if (!data) { return self.postMessage({item}); }
    }

    const
      convert = file.type !== type || quality !== '100',
      u8arr = data ? toBMP(data) : await blob2array(file),
      blob = doMozjpeg(convert, u8arr, quality);

    self.postMessage({blob, item});
  });

  self.postMessage('ready');
}
