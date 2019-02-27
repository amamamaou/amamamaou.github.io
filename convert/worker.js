/*! worker.js | v1.5.0 | MIT License */
{
  self.importScripts('https://cdn.jsdelivr.net/npm/mozjpeg-js');

  // use mozjpeg
  const doEncode = (u8arr, quality) => {
    const {data} = mozjpeg.encode(u8arr, {quality});
    return new Blob([data], {type: 'image/jpeg'});
  };

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

  const convertImage = async file => {
    const
      bitmap = await self.createImageBitmap(file),
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return canvas.convertToBlob({type: 'image/jpeg', quality: 1});
  };

  self.addEventListener('message', async ev => {
    const {item, quality} = ev.data;
    let {file} = item;

    if (file.type !== 'image/jpeg') {
      file = await convertImage(file);
    }

    const
      u8arr = await blob2array(file),
      blob = doEncode(u8arr, quality);

    self.postMessage({blob, item});
  });

  self.postMessage('ready');
}
