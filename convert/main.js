/*! Convert to JPEG | v1.0.7 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.0.1');

  const
    maxMB = 20,
    maxSize = maxMB * 1048576,
    mime = /\/(?:bmp|gif|jpe?g|png)$/,
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
    data: {over: false, maxMB},
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
      wait: false,
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

  // canvas to blob
  const toBlob = (source, quality) => new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
    canvas.toBlob(resolve, 'image/jpeg', quality);
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

    control.wait = true;
    files = Array.from(files);

    const
      indexList = [],
      {items} = output;

    for (const file of files) {
      if (!mime.test(file.type)) {
        items.push({
          src: null,
          status: 'failed',
          reason: '対象外のファイルです',
          name: file.name,
        });
        continue;
      }

      const size = filesize(file.size);

      if (file.size > maxSize) {
        const src = URL.createObjectURL(file);
        items.push({
          src,
          status: 'failed',
          reason: `${maxMB}MB を超えているため最適化は行われませんでした`,
          name: `${file.name} (${size})`,
        });
        await output.$nextTick();
        URL.revokeObjectURL(src);
        continue;
      }

      const index = items.length;

      items.push({
        index, file, size,
        src: URL.createObjectURL(file),
        name: file.name,
        status: 'standby',
      });

      if (support) {
        convertImage(index);
      } else {
        indexList.push(index);
      }
    }

    if (indexList.length === 0) { checkStatus(); }

    if (!support) {
      for (const index of indexList) { convertImage(index); }
    }
  };

  const convertImage = async index => {
    const item = Object.assign({}, output.items[index]);

    item.status = 'progress';

    output.items.splice(index, 1, item);

    await output.$nextTick();

    URL.revokeObjectURL(item.src);

    if (support) {
      worker.postMessage({item, quality: control.quality});
    } else {
      doCconvert(item, control.quality);
    }
  };

  const doCconvert = async ({index, file}, quality) => {
    const
      bitmap = await createImageBitmap(file),
      blob = await toBlob(bitmap, quality / 100);
    complete({data: {blob, index}});
  };

  const complete = async ev => {
    const
      {blob, index} = ev.data,
      {name, size} = output.items[index],
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
  worker.addEventListener('message', complete);
}
