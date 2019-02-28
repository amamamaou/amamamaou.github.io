/*! Convert to JPEG | v1.5.6 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.5.5');

  const
    maxMB = 20,
    maxSize = maxMB * 1048576,
    mime = /\/(?:bmp|gif|jpeg|png)$/,
    pass = /\/(?:bmp|jpeg)$/,
    support = typeof OffscreenCanvas !== 'undefined';

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
    data: {over: false, wait: true, maxMB},
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
  const control = new Vue({
    el: '#control',
    data: {
      quality: localStorage.quality || '90',
      wait: true,
    },
    watch: {
      quality() { localStorage.quality = this.quality; },
    },
    methods: {
      clear() {
        for (const {status, src} of output.items) {
          if (status === 'completed') { URL.revokeObjectURL(src); }
        }
        output.items = [];
      },
    },
  });

  // load image
  const loadImage = src => new Promise(resolve => {
    const image = new Image;
    image.onload = resolve;
    image.src = src;
  });

  // Blob to ImageData
  const getImageData = async blob => {
    const
      bitmap = await createImageBitmap(blob),
      {width, height} = bitmap,
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, width, height);
  };

  // check status
  const checkStatus = async () => {
    await output.$nextTick();
    const completed = output.$el.querySelectorAll('.completed, .failed');
    control.wait = completed.length < output.items.length;
  };

  // read File object
  const addFiles = async files => {
    if (!files || files.length === 0) { return; }

    control.wait = true;
    files = Array.from(files);

    const
      itemList = [],
      {items} = output;

    for (const file of files) {
      const {name, type} = file;

      if (!mime.test(type)) {
        items.push({
          src: null,
          status: 'failed',
          reason: '対象外のファイルです',
          name,
        });
        continue;
      }

      const
        src = URL.createObjectURL(file),
        size = filesize(file.size);

      let n = type === 'image/bmp' ? 2 : 1;

      if (file.size > maxSize * n) {
        items.push({
          src,
          status: 'failed',
          reason: `${maxMB * n}MB を超えているため最適化は行われませんでした`,
          name: `${name} (${size})`,
        });
        await output.$nextTick();
        URL.revokeObjectURL(src);
        continue;
      }

      const item = {
        file, src, size, name,
        status: 'standby',
        index: items.length,
      };
      items.push(item);

      if (support) {
        convertImage(item);
      } else {
        itemList.push(item);
      }
    }

    if (itemList.length === 0) { checkStatus(); }

    if (!support) {
      for (const item of itemList) { convertImage(item); }
    }
  };

  // post to Worker
  const convertImage = async item => {
    item = Object.assign({}, item);
    item.status = 'progress';

    output.items.splice(item.index, 1, item);

    await output.$nextTick();

    URL.revokeObjectURL(item.src);

    if (!support && !pass.test(item.file.type)) {
      item.data = await getImageData(item.file);
    }

    worker.postMessage({item, quality: control.quality});
  };

  const complete = async data => {
    const
      {blob, item: {name, size, index}} = data,
      src = URL.createObjectURL(blob);

    await loadImage(src);

    output.items.splice(index, 1, {
      src,
      name: name.replace(/\.\w+$/, '.jpg'),
      size: filesize(blob.size),
      orig: size,
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
          if (mime.test(item.type)) { files.push(item.getAsFile()); }
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
