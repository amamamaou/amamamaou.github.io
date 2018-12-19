/*! optipng main.js | v0.0.7 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v0.0.3');

  const
    maxMB = 20,
    maxByte = 1048576 * maxMB;

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024 ** exp,
      unit = exp === 0 ? 'bytes' : 'KM'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  // onload Promise
  const onLoad = src => new Promise(resolve => {
    const image = new Image;
    image.onload = resolve;
    image.src = src;
  });

  // reset options
  const dropReset = () => {
    URL.revokeObjectURL(output.image);

    if (control.wait) {
      footer.console = '';
    } else {
      control.level = '2';
      dropArea.fileName = dropArea.size = '';
      footer.console = 'Ready';
    }

    output.reset = true;
    output.height = '0';
    output.message = output.image = output.fileName = '';
  };

  // Vue instances
  const control = new Vue({
    el: '#control',
    data: {level: '2', wait: true},
    methods: {dropReset},
  });
  const dropArea = new Vue({
    el: '#dropArea',
    data: {
      maxMB,
      over: false,
      wait: true,
      fileName: '',
      size: '',
    },
    methods: {
      dragover(ev) {
        if (!this.wait) {
          ev.dataTransfer.dropEffect = 'copy';
          this.over = true;
        }
      },
      readFile(ev) {
        this.over = false;
        readFile(ev.dataTransfer.files[0]);
      },
      change({target}) {
        target.value = '';
        readFile(target.files[0]);
      },
    },
  });
  const output = new Vue({
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
  const footer = new Vue({
    el: '#footer',
    data: {console: 'Please wait...'},
  });

  const showResult = async (text = null) => {
    if (text) { output.message = text; }
    output.reset = false;
    await Vue.nextTick();
    output.height = output.$refs.body.offsetHeight + 'px';
    control.wait = dropArea.wait = false;
  };

  // read File object
  const readFile = async file => {
    if (!file) { return; }

    const {type, size, name} = file;

    control.wait = dropArea.wait = true;

    dropReset();
    await Vue.nextTick();

    if (type !== 'image/png') { return showResult('PNG形式の画像のみです'); }

    if (size > maxByte) { return showResult(`画像サイズが ${maxMB}MB を超えています！`); }

    dropArea.fileName = name;
    dropArea.size = filesize(size);

    output.fileName = name ? name.replace(/\.\w+$/, '_optimized.png') : 'clipbord.png';
    footer.console = '';

    worker.postMessage({file, level: control.level});
  };

  const drawImage = async blob => {
    const url = URL.createObjectURL(blob);

    await onLoad(url);

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
        footer.console = 'Web Worker is ready';
        break;
      case 'console':
        if (data != null) { footer.console += data + '\n'; }
        break;
      case 'done':
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
