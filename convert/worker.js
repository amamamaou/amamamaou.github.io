/*! worker.js | v1.5.7 | MIT License */
{
  self.importScripts(
    '/js/tobmp.min.js',
    'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/jpegtran.min.js',
    'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/cjpeg.min.js',
  );

  const
    pass = /\/(?:bmp|jpeg)$/,
    jpeg = 'image/jpeg';

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

  // Blob to ImageData
  const getImageData = async blob => {
    const
      bitmap = await self.createImageBitmap(blob),
      {width, height} = bitmap,
      ctx = new OffscreenCanvas(width, height).getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, width, height);
  };

  self.addEventListener('message', async ev => {
    const {item, quality} = ev.data;
    let {file, data = null} = item, u8arr;

    if (file.type === jpeg && quality === '100') {
      u8arr = await blob2array(file);
      u8arr = jpegtran(u8arr, {optimize: true, copy: 'none'}).data;
    } else {
      if (!data && !pass.test(file.type)) { data = await getImageData(file); }
      u8arr = data ? toBMP(data) : await blob2array(file);
      u8arr = cjpeg(u8arr, {quality, optimize: true}).data;
    }

    const blob = new Blob([u8arr], {type: jpeg});
    self.postMessage({blob, item});
  });

  self.postMessage('ready');
}
