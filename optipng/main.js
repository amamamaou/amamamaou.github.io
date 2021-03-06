/*! optipng main.js | v1.8.7 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';
import { fileSize, loadImage, saveAs } from '/assets/js/utility.min.js';

// Web Worker
const worker = new Worker('worker.js?v1.3.3');

const
  maxMB = 10,
  maxSize = maxMB * 1048576,
  pngType = 'image/png',
  convertType = /\/(?:bmp|gif|jpeg|webp)$/,
  sp = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Vue instances
const
  control = new Vue({
    el: '#control',
    data: { level: '2', wait: true },
    methods: {
      clear() {
        for (const { status, src } of output.items) {
          status === 'completed' && URL.revokeObjectURL(src);
        }
        output.items = [];
        download.list = [];
      },
    },
  }),
  dropArea = new Vue({
    el: '#dropArea',
    data: { maxMB, over: false, wait: true },
    methods: {
      dragover(ev) {
        ev.dataTransfer.dropEffect = 'copy';
        this.over = true;
      },
      readFile(ev) {
        this.over = false;
        addFiles(ev.dataTransfer.files);
      },
      change({ target }) {
        addFiles(target.files);
        target.value = '';
      },
    },
  }),
  download = new Vue({
    el: '#download',
    data: { status: '', list: [], visibility: false, sp },
    methods: {
      download() {
        if (this.status === 'active') {
          this.status = 'progress';
          worker.postMessage({ type: 'zip', list: this.list });
        }
      },
    },
  }),
  output = new Vue({
    el: '#output',
    data: { items: [], sp },
    watch: { items() { download.visibility = this.items.length > 0; } },
    methods: { replace(index, value) { this.items.splice(index, 1, value); } },
  });

const toPNG = async src => {
  const image = await loadImage(src);

  if (!image) { return null; }

  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    canvas.toBlob(resolve);
  });
};

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

  const { items } = output;

  control.wait = true;
  download.status = '';

  for (const file of Array.from(files)) {
    const { name, type, size } = file;

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
      const sizeStr = fileSize(size);

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
      otimizeImage({ ...item }, file);
    } else {
      URL.revokeObjectURL(src);
      failed({ item });
    }
  }

  checkStatus();
};

const otimizeImage = async (item, file) => {
  item.status = 'progress';

  if (convertType.test(file.type)) {
    item.name = item.name.replace(/\.\w+$/, '.png');
    file = await toPNG(item.src);
    if (!file) { return failed({ item }); }
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
    { blob, item: { name, size, index } } = data,
    src = URL.createObjectURL(blob);

  await loadImage(src);

  output.replace(index, {
    src, name,
    size: fileSize(blob.size),
    orig: fileSize(size),
    decrease: (100 - blob.size / size * 100).toFixed(2),
    status: 'completed',
  });

  download.list.push({ blob, name });

  checkStatus();
};

const failed = ({ item }) => {
  output.replace(item.index, {
    name: item.name,
    src: null,
    status: 'failed',
    reason: '壊れているか不正なファイルのため変換できませんでした',
  });
  checkStatus();
};

// paste image on clipbord
document.addEventListener('paste', ev => {
  if (ev.clipboardData) {
    const { items } = ev.clipboardData;
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
const onMessage = {
  success: complete,
  failed,
  zip(data) {
    saveAs(data.blob);
    download.status = 'active';
  },
  ready() { control.wait = dropArea.wait = false; },
};
worker.addEventListener('message', ({ data }) => onMessage[data.type](data));
