/*! optipng main.js | v0.0.1 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v0.0.1');

  const
    mega = 1048576,       // 1MB
    maxSize = mega * 10,  // 10MB
    maxWH = 1600,
    imageError = 'ブラウザが対応していない画像フォーマットです。';

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024**exp,
      unit = exp === 0 ? 'bytes' : 'KM'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  // onload Promise
  const onLoad = (image, url) => new Promise((resolve, reject) => {
    image.onload = () => resolve(true);
    image.onerror = reject;
    image.src = url;
  }).catch(() => false);

  // reset options
  const dropReset = () => {
    URL.revokeObjectURL(output.image);

    if (!control.wait) {
      control.level = '2';
      dropArea.fileName = dropArea.size = '';
    }

    output.reset = true;
    output.height = '0';
    output.message = output.image = output.fileName = '';
  };

  // instance
  const
    control = new Vue({
      el: '#control',
      data: {level: '2', wait: false},
      methods: {dropReset},
    }),
    dropArea = new Vue({
      el: '#dropArea',
      data: {
        over: false,
        wait: true,
        fileName: '',
        size: '',
        process: null,
      },
      methods: {
        dragover(ev) {
          if (!this.wait) {
            ev.dataTransfer.dropEffect = 'copy';
            this.over = true;
          }
        },
        readFile(ev) {
          const file = ev.dataTransfer.files[0];
          file && readFile(file);
          this.over = false;
        },
        change(ev) {
          const file = ev.target.files[0];
          ev.target.value = '';
          file && readFile(file);
        },
      },
    }),
    output = new Vue({
      el: '#output',
      data: {
        reset: true,
        height: '0',
        message: '',
        image: '',
        fileName: '',
        size: '',
      },
    });

  const showResult = async () => {
    output.reset = false;
    await output.$nextTick();
    output.height = output.$el.children[0].offsetHeight + 'px';
    control.wait = dropArea.wait = false;
  };

  const viewError = text => {
    output.message = text;
    showResult();
  };

  // read File object
  const readFile = async file => {
    const {type, size, name} = file;

    control.wait = dropArea.wait = true;

    dropReset();

    if (!type.includes('image/')) { return viewError(imageError); }

    if (size > maxSize) { return viewError('画像サイズが10MBを超えています！'); }

    dropArea.fileName = name;
    dropArea.size = filesize(size);

    output.fileName = name ? name.replace(/\.\w+$/, '_optimized.png') : 'clipbord.png';

    worker.postMessage({file, level: control.level});
  };

  const drawImage = async blob => {
    const url = URL.createObjectURL(blob);

    await onLoad(new Image, url);

    output.image = url;
    output.size = filesize(blob.size);

    showResult();
  };

  // Web Worker
  worker.addEventListener('message', ev => {
    const {type, data = null} = ev.data;
    switch (type) {
      case 'ready':
        control.wait = dropArea.wait = false;
        break;
      case 'process':
        dropArea.process += data + '\n';
        break;
      case 'done':
        dropArea.process = null;
        drawImage(data);
        break;
    }
  });

  // paste image on clipbord
  document.addEventListener('paste', ev => {
    if (!control.wait && ev.clipboardData) {
      const {items} = ev.clipboardData;
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.includes('image/')) {
            readFile(item.getAsFile());
            break;
          }
        }
      }
    }
  });
}
