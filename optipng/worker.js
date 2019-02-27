/*! worker.js | v1.1.5 | MIT License */
{
  self.importScripts('https://cdn.jsdelivr.net/npm/optipng-js');

  // use Optiong.js
  const doOptipng = (u8arr, level) => {
    const {data} = optipng(u8arr, ['-o' + level]);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

  self.addEventListener('message', async ev => {
    const
      {item, level} = ev.data,
      u8arr = await blob2array(item.file),
      blob = doOptipng(u8arr, level);

    self.postMessage({blob, item});
  });

  self.postMessage('ready');
}
