/*! worker.js | v1.0.3 | MIT License */
{
  importScripts('/js/optipng.min.js');

  // console
  const process = text => postMessage({type: 'process', data: text});

  // use Optiong.js
  const doOptipng = u8arr => {
    const {data} = optipng(u8arr, ['-o2'], process);
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
      u8arr = new Uint8Array(length);

    for (let i = 0; i < length; i++) { u8arr[i] = binary.charCodeAt(i); }

    return u8arr;
  };

  addEventListener('message', async ev => {
    const {origBlob, dataURL, optipng} = ev.data;
    let blob = origBlob, u8arr;

    if (origBlob == null) {
      u8arr = dataURL2array(dataURL);

      if (!optipng) {
        blob = new Blob([u8arr], {type: 'image/png'});
      }
    }

    if (optipng) {
      blob = doOptipng(u8arr || await blob2array(blob));
    }

    postMessage({type: 'done', data: blob});
  });

  postMessage({type: 'ready'});
}