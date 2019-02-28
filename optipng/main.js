/*! optipng main.js | v1.6.6 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.1.5');

  const
    maxMB = 10,
    maxSize = maxMB * 1048576,
    pngType = 'image/png',
    convertType = /\/(?:bmp|gif|jpeg)$/;

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024 ** exp,
      unit = exp === 0 ? 'bytes' : 'KM'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  // Vue instances
  const control = new Vue({
    el: '#control',
    data: {level: '2', wait: true},
    methods: {
      clear() {
        for (const {status, src} of output.items) {
          status === 'completed' && URL.revokeObjectURL(src);
        }
        output.items = [];
      },
    },
  });
  const dropArea = new Vue({
    el: '#dropArea',
    data: {
      maxMB,
      over: false,
      wait: true,
    },
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
    data: {items: []},
  });

  // load image
  const loadImage = src => new Promise(resolve => {
    const image = new Image;
    image.onload = resolve;
    image.src = src;
  });

  // Blob to PNG Blob
  const toPNG = blob => new Promise(async resolve => {
    const
      bitmap = await createImageBitmap(blob),
      canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    canvas.toBlob(resolve);
  });

  // check status
  const checkStatus = async () => {
    await output.$nextTick();
    const completed = output.$el.querySelectorAll('.completed, .failed');
    control.wait = completed.length < output.items.length;
  };

  // read File object
  const addFiles = async files => {
    if (!files || files.length === 0) { return; }

    const {items} = output;

    control.wait = true;
    files = Array.from(files);

    for (const file of files) {
      const {name, type, size} = file;

      if (type !== pngType && !convertType.test(type)) {
        items.push({
          src: null,
          status: 'failed',
          reason: '対象外のファイルです',
          name,
        });
        continue;
      }

      const src = URL.createObjectURL(file);
      let n = type === 'image/bmp' ? 2 : 1;

      if (size > maxSize * n) {
        const sizeStr = filesize(size);

        items.push({
          src,
          status: 'failed',
          reason: `${maxMB * n}MB を超えているため最適化は行われませんでした`,
          name: `${name} (${sizeStr})`,
        });

        await output.$nextTick();
        URL.revokeObjectURL(src);
        continue;
      }

      const item = {
        file, src, name, size,
        status: 'standby',
        index: items.length,
      };

      items.push(item);
      otimizeImage(item);
    }

    checkStatus();
  };

  const otimizeImage = async item => {
    item = Object.assign({}, item);
    item.status = 'progress';

    if (convertType.test(item.file.type)) {
      item.file = await toPNG(item.file);
      item.name = item.name.replace(/\.\w+$/, '.png');
    }

    output.items.splice(item.index, 1, item);

    await output.$nextTick();

    URL.revokeObjectURL(item.src);
    worker.postMessage({item, level: control.level});
  };

  const complete = async data => {
    const
      {blob, item: {name, size, index}} = data,
      src = URL.createObjectURL(blob);

    await loadImage(src);

    output.items.splice(index, 1, {
      src, name,
      size: filesize(blob.size),
      orig: filesize(size),
      decrease: (100 - blob.size / size * 100).toFixed(2),
      status: 'completed',
    });

    checkStatus();
  };

  // paste image on clipbord
  document.addEventListener('paste', ev => {
    if (ev.clipboardData) {
      const {items} = ev.clipboardData;
      if (items) {
        const files = [];
        for (const item of Array.from(items)) {
          item.type === pngType && files.push(item.getAsFile());
        }
        addFiles(files);
      }
    }
  });

  // Web Worker
  worker.addEventListener('message', ({data}) => {
    if (data === 'ready') {
      control.wait = dropArea.wait = false;
    } else {
      complete(data);
    }
  });
}
