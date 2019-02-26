/*! optipng main.js | v1.5.2 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.0.2');

  const
    maxMB = 20,
    maxSize = maxMB * 1048576;

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
      if (file.type !== 'image/png') {
        items.push({
          src: null,
          status: 'failed',
          reason: '対象外のファイルです',
          name: file.name,
        });
        continue;
      }

      if (file.size > maxSize) {
        const
          src = URL.createObjectURL(file),
          size = filesize(file.size);

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
        index, file,
        src: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        status: 'standby',
      });

      otimizeImage(index);
    }

    checkStatus();
  };

  const otimizeImage = async index => {
    const item = Object.assign({}, output.items[index]);

    item.status = 'progress';

    output.items.splice(index, 1, item);

    await output.$nextTick();

    URL.revokeObjectURL(item.src);
    worker.postMessage({item, level: control.level});
  };

  const complete = async data => {
    const
      {blob, index} = data,
      {name, size} = output.items[index],
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
          item.type === 'image/png' && files.push(item.getAsFile());
        }
        addFiles(files);
      }
    }
  });

  // Web Worker
  worker.addEventListener('message', ev => {
    const {type, data = null} = ev.data;
    if (type === 'complete') {
      complete(data);
    } else {
      control.wait = dropArea.wait = false;
    }
  });
}
