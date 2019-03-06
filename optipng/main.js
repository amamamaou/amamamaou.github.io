/*! optipng main.js | v1.8.0 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';

{
  // Web Worker
  const worker = new Worker('worker.js?v1.3.1');

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
  const download = new Vue({
    el: '#download',
    data: {status: '', list: [], visibility: false},
    methods: {
      download() {
        if (this.status === 'active') {
          this.status = 'progress';
          worker.postMessage({type: 'zip', list: this.list});
        }
      },
    },
  });
  const output = new Vue({
    el: '#output',
    data: {items: []},
    watch: {
      items() { download.visibility = this.items.length > 0; },
    },
    methods: {
      replace(index, value) { this.items.splice(index, 1, value); },
    },
  });

  // load image
  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  }).catch(() => null);

  // image to PNG Blob
  const toPNG = src => new Promise(async (resolve, reject) => {
    const iamge = await loadImage(src);

    if (!iamge) { return reject(); }

    const canvas = document.createElement('canvas');
    canvas.width = iamge.width;
    canvas.height = iamge.height;
    canvas.getContext('2d').drawImage(iamge, 0, 0);
    canvas.toBlob(resolve);
  }).catch(() => null);

  // check status
  const checkStatus = async () => {
    await output.$nextTick();
    const progress = output.$el.querySelectorAll('.completed,.failed').length < output.items.length;
    control.wait = progress;
    download.status = progress ? '' : 'active';
  };

  // read File object
  const addFiles = async files => {
    if (!files || files.length === 0) { return; }

    const {items} = output;

    control.wait = true;
    download.status = '';

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
        src, name, size,
        status: 'standby',
        index: items.length,
      };

      items.push(item);

      if (await loadImage(src)) {
        otimizeImage(item, file);
      } else {
        URL.revokeObjectURL(src);
        failed({item});
      }
    }

    checkStatus();
  };

  const otimizeImage = async (item, file) => {
    item = Object.assign({}, item);
    item.status = 'progress';

    if (convertType.test(file.type)) {
      file = await toPNG(item.src);
      if (!file) { return failed({item}); }
      item.name = item.name.replace(/\.\w+$/, '.png');
    }

    output.replace(item.index, item);
    await output.$nextTick();
    URL.revokeObjectURL(item.src);

    worker.postMessage({
      item, file,
      level: control.level,
      type: 'optimize',
    });
  };

  const complete = async data => {
    const
      {blob, item: {name, size, index}} = data,
      src = URL.createObjectURL(blob);

    await loadImage(src);

    output.replace(index, {
      src, name,
      size: filesize(blob.size),
      orig: filesize(size),
      decrease: (100 - blob.size / size * 100).toFixed(2),
      status: 'completed',
    });

    download.list.push({blob, name});

    checkStatus();
  };

  const failed = ({item}) => {
    output.replace(item.index, {
      name: item.name,
      src: null,
      status: 'failed',
      reason: '壊れているか不正なファイルのため変換できませんでした',
    });
    checkStatus();
  };

  const zipDownload = blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '';
    a.target = '_blank';
    setTimeout(() => a.click(), 0);
    setTimeout(() => URL.revokeObjectURL(a.href), 4E4);
    download.status = 'active';
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
    switch (data.type) {
      case 'success': complete(data); break;
      case 'failed': failed(data); break;
      case 'zip': zipDownload(data.blob); break;
      default: control.wait = dropArea.wait = false;
    }
  });
}
