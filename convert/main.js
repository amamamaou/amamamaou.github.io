/*! Convert to JPEG | v0.1.0 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v0.0.1');

  const
    mega = 1048576,  // 1MB
    maxMB = 20 * mega;

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024 ** exp,
      unit = exp === 0 ? 'bytes' : 'KM'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  // Vue instances
  const dropArea = new Vue({
    el: '#dropArea',
    data: {over: false},
    methods: {
      dragover(ev) {
        ev.dataTransfer.dropEffect = 'copy';
        this.over = true;
      },
      readFile(ev) {
        this.over = false;
        addFiles(ev.dataTransfer.files);
      },
      change({target}) {
        addFiles(target.files);
        target.value = '';
      },
    },
  });
  const output = new Vue({
    el: '#output',
    data: {completed: [], standby: [], progress: null},
  });
  const control = new Vue({
    el: '#control',
    data: {
      quality: localStorage.quality || '90',
      wait: false,
    },
    watch: {
      quality() { localStorage.quality = this.quality; },
    },
    methods: {
      clear() {
        for (const {src} of output.completed) {
          URL.revokeObjectURL(src);
        }

        output.completed = [];
        output.standby = [];
        output.progress = null;
      },
    },
  });

  // load image
  const loadImage = src => new Promise(resolve => {
    const image = new Image;
    image.onload = () => resolve(image);
    image.src = src;
  });

  // data-url
  const blob2dataURL = blob => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // read File object
  const addFiles = async files => {
    if (!files || files.length === 0) { return; }

    files = Array.from(files);

    let i = 0;

    for (const file of files) {
      if (!file.type.includes('image/') || file.size > maxMB) {
        continue;
      }

      const
        src = await blob2dataURL(file),
        {width, height} = await loadImage(src);

      output.standby.push({
        file, src, width, height,
        name: file.name,
        size: filesize(file.size),
      });

      if (++i === 2 && !output.progress) { nextImage(); }
    }

    if (i === 1 && !output.progress) { nextImage(); }
  };

  const nextImage = () => {
    const item = output.standby.shift();

    if (!item) {
      output.progress = null;
      control.wait = false;
      return;
    }

    output.progress = item;
    control.wait = true;

    if (typeof OffscreenCanvas !== 'undefined') {
      worker.postMessage({item, quality: control.quality});
    } else {
      convertImageSingleThread(item, control.quality);
    }
  };

  const convertImageSingleThread = async (item, quality) => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      bitmap = await createImageBitmap(item.file);

    canvas.width = item.width;
    canvas.height = item.height;

    ctx.drawImage(bitmap, 0, 0);
    canvas.toBlob(blob => complete({
      data: {blob, name: item.name.replace(/\.\w+$/, '.jpg')},
    }));
  };

  const complete = async ev => {
    const
      {blob, name} = ev.data,
      src = URL.createObjectURL(blob);

    await loadImage(src);

    output.completed.push({
      src,
      name: name.replace(/\.\w+$/, '.jpg'),
      size: filesize(blob.size),
    });

    nextImage();
  };

  // Web Worker
  worker.addEventListener('message', complete);
}
