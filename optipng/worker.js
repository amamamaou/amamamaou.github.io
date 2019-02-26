/*! worker.js | v1.0.2 | MIT License */
{
  self.importScripts('https://cdn.jsdelivr.net/npm/optipng-js');

  // use Optiong.js
  const doOptipng = (u8arr, level) => {
    const {data} = optipng(u8arr, ['-o' + level], console);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

  self.addEventListener('message', async ev => {
    const
      {item: {index, file}, level} = ev.data,
      u8arr = await blob2array(file),
      blob = doOptipng(u8arr, level);

    self.postMessage({type: 'complete', data: {blob, index}});
  });

  self.postMessage({type: 'ready'});
}
