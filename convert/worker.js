/*! worker.js | v1.5.5 | MIT License */
{
  self.importScripts(
    '/js/tobmp.min.js',
    'https://cdn.jsdelivr.net/npm/js-mozjpeg/src/cjpeg.min.js',
  );

  const pass = /\/(?:bmp|jpeg)$/;

  // use mozjpeg
  const doEncode = (u8arr, quality) => {
    const {data} = cjpeg(u8arr, {quality, optimize: true});
    return new Blob([data], {type: 'image/jpeg'});
  };

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
    let {file, data = null} = item;

    if (!pass.test(file.type)) { data = await getImageData(file); }

    const
      u8arr = data ? toBMP(data) : await blob2array(file),
      blob = doEncode(u8arr, quality);

    self.postMessage({blob, item});
  });

  self.postMessage('ready');
}
