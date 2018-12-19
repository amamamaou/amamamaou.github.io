/*! worker.js | v1.0.6 | MIT License */
{
  self.importScripts('https://cdn.jsdelivr.net/npm/optipng-js');

  // console
  const process = text => self.postMessage({type: 'process', data: text});

  // use Optiong.js
  const doOptipng = u8arr => {
    const {data} = optipng(u8arr, ['-o2'], process);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2array = async blob =>
    new Uint8Array(await new Response(blob).arrayBuffer());

  // dataURL to array
  const dataURL2array = url => {
    const
      binary = atob(url.split(',')[1]),
      length = binary.length,
      u8arr = new Uint8Array(length);

    let i = length;

    while (i--) { u8arr[i] = binary.charCodeAt(i); }

    return u8arr;
  };

  self.addEventListener('message', async ev => {
    const {origBlob, dataURL, optipng} = ev.data;
    let blob = origBlob, u8arr;

    if (dataURL) {
      u8arr = dataURL2array(dataURL);
      if (!optipng) { blob = new Blob([u8arr], {type: 'image/png'}); }
    }

    if (optipng) { blob = doOptipng(u8arr || await blob2array(blob)); }

    self.postMessage({type: 'done', data: blob});
  });

  self.postMessage({type: 'ready'});
}
