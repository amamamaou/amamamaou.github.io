/*! worker.js | v0.0.1 | MIT License */
{
  self.importScripts('/js/optipng.min.js');

  // console
  const process = text => self.postMessage({type: 'process', data: text});

  // use Optiong.js
  const doOptipng = (u8arr, level) => {
    const {data} = optipng(u8arr, ['-o' + level], process);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2array = blob => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(blob);
  });

  self.addEventListener('message', async ev => {
    const
      {file, level} = ev.data,
      u8arr = await blob2array(file),
      blob = doOptipng(u8arr, level);

    self.postMessage({type: 'done', data: blob});
  });

  self.postMessage({type: 'ready'});
}
