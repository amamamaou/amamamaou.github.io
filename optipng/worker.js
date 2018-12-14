/*! worker.js | v0.0.2 | MIT License */
{
  self.importScripts('https://cdn.jsdelivr.net/npm/optipng-js');

  // console
  const console = text => self.postMessage({type: 'console', data: text});

  // use Optiong.js
  const doOptipng = (u8arr, level) => {
    const {data} = optipng(u8arr, ['-o' + level], console);
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
      start = performance.now();

    console('Start Web Worker...');
    console(`Optimize level: ${level}\n`);

    const
      u8arr = await blob2array(file),
      blob = doOptipng(u8arr, level),
      time = (performance.now() - start).toFixed(0);

    console(`Completed (${time}ms)`);

    self.postMessage({type: 'done', data: blob});
  });

  self.postMessage({type: 'ready'});
}
