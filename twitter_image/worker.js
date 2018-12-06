/*! worker.js | v1.0.3 | MIT License */
{
  importScripts('/js/optipng.min.js');

  // console
  const process = text => postMessage({type: 'process', data: text});

  // use Optiong.js
  const doOptipng = buffer => {
    const {data} = optipng(buffer, ['-o2'], process);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2array = blob => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(blob);
  });

  // base64 to array
  const dataURL2array = url => {
    const
      binary = atob(url.split(',')[1]),
      length = binary.length,
      buffer = new Uint8Array(length);

    for (let i = 0; i < length; i++) { buffer[i] = binary.charCodeAt(i); }

    return buffer;
  };

  addEventListener('message', async ev => {
    const {origBlob, dataURL, optipng} = ev.data;
    let blob = origBlob, buffer;

    if (origBlob == null) {
      buffer = dataURL2array(dataURL);

      if (!optipng) {
        blob = new Blob([buffer], {type: 'image/png'});
      }
    }

    if (optipng) {
      blob = doOptipng(buffer || await blob2array(blob));
    }

    postMessage({type: 'done', data: blob});
  });

  postMessage({type: 'ready'});
}
