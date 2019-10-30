/*! twitter_image | v1.3.0 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';
import {fileSize, loadImage} from '/assets/js/utility.min.js';

{
  // Web Worker
  const worker = new Worker('worker.js?v1.0.6');

  const
    mega = 1048576,  // 1MB
    allowMB = 10,
    opMaxMB = 5,
    maxWH = 1600,
    imageError = 'ブラウザが対応していない画像フォーマットです。';

  // canvas to blob
  const canvas2blob = async canvas => {
    let blob = null;
    if (canvas.toBlob) {
      blob = await new Promise(resolve => canvas.toBlob(resolve));
    } else if (canvas.msToBlob) {
      blob = canvas.msToBlob();
    }
    return blob;
  };

  // reset options
  const dropReset = () => {
    URL.revokeObjectURL(output.image);

    if (!control.wait) {
      control.scale = '1';
      control.optipng = false;
    }

    output.reset = true;
    output.height = '0';
    output.message = output.image = output.fileName = '';
  };

  // Vue instances
  const control = new Vue({
    el: '#control',
    data: {scale: '1', optipng: false, wait: true},
    methods: {dropReset},
  });
  const dropArea = new Vue({
    el: '#dropArea',
    data: {over: false, wait: true, process: null},
    methods: {
      dragover(ev) {
        ev.dataTransfer.dropEffect = 'copy';
        this.over = true;
      },
      readFile(ev) {
        this.over = false;
        readFile(ev.dataTransfer.files[0]);
      },
      change({target}) {
        readFile(target.files[0]);
        target.value = '';
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

    if (!type.includes('image/')) { return showResult(imageError); }

    if (size > mega * allowMB) { return showResult(`画像サイズが ${allowMB}MB を超えています！`); }

    const
      url = URL.createObjectURL(file),
      image = await loadImage(url);

    if (image) {
      URL.revokeObjectURL(url);
      optimizeImage(image);
      output.fileName = name ? name.replace(/\.\w+$/, '_tw.png') : 'clipbord.png';
    } else {
      showResult(imageError);
    }
  };

  const drawImage = async blob => {
    const url = URL.createObjectURL(blob);
    let text;

    await loadImage(url);

    output.image = url;
    output.size = fileSize(blob.size);

    if (blob.size > mega * 3) {
      text = '3MB を超えています。Twitterにアップロードできません。';
    }

    showResult(text);
  };

  // optimize
  const optimizeImage = async source => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      scale = control.scale | 0 || 1;

    let
      {optipng} = control,
      {naturalWidth: width = 0, naturalHeight: height = 0} = source;

    if (width === 0 || height === 0) { return showResult(imageError); }

    if (width * scale <= maxWH || height * scale <= maxWH) {
      width *= scale;
      height *= scale;
    }

    canvas.width = width;
    canvas.height = height;

    if (scale > 1) {
      ctx.msImageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;
    }

    ctx.drawImage(source, 0, 0, width, height);
    ctx.clearRect(0, 0, 1, 1);
    ctx.globalAlpha = 0.99;
    ctx.drawImage(source, 0, 0, 1, 1, 0, 0, 1, 1);

    const origBlob = await canvas2blob(canvas);
    let dataURL = null;

    if (origBlob) {
      const {size} = origBlob;

      if (size > mega * opMaxMB) {
        return showResult(`最適化前の画像サイズが ${opMaxMB}MB 以上なので処理を中断しました。`);
      }

      if (size > mega * 3) { optipng = true; }
    } else {
      dataURL = canvas.toDataURL();
    }

    if (dataURL || optipng) {
      worker.postMessage({origBlob, dataURL, optipng});
    } else {
      drawImage(origBlob);
    }
  };

  // Web Worker
  worker.addEventListener('message', ev => {
    const {type, data = null} = ev.data;
    switch (type) {
      case 'ready':
        control.wait = dropArea.wait = false;
        break;
      case 'process':
        if (data != null) { dropArea.process += data + '\n'; }
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
