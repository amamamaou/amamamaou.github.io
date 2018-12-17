/*! twitter_image | v1.2.8 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.0.6');

  const
    mega = 1048576,      // 1MB
    maxSize = mega * 3,  // 3MB
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
      control.scale = '1';
      control.optipng = false;
    }

    output.reset = true;
    output.height = '0';
    output.message = output.image = output.fileName = '';
  };

  // instance
  const
    control = new Vue({
      el: '#control',
      data: {scale: '1', optipng: false, wait: true},
      methods: {dropReset},
    }),
    dropArea = new Vue({
      el: '#dropArea',
      data: {over: false, wait: true, process: null},
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

  const showResult = async (text = null) => {
    if (text) { output.message = text; }
    output.reset = false;
    await output.$nextTick();
    output.height = output.$el.children[0].offsetHeight + 'px';
    control.wait = dropArea.wait = false;
  };

  // read File object
  const readFile = async file => {
    const {type, size, name} = file;

    control.wait = dropArea.wait = true;

    dropReset();

    if (!type.includes('image/')) { return showResult(imageError); }

    if (size > mega * 10) {
      return showResult('画像サイズが10MBを超えています！');
    }

    const
      image = new Image,
      url = URL.createObjectURL(file);

    if (await onLoad(image, url)) {
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

    await onLoad(new Image, url);

    output.image = url;
    output.size = filesize(blob.size);

    if (blob.size > maxSize) { text = '3MBを超えています。Twitterにアップロードできません。'; }

    showResult(text);
  };

  // optimize
  const optimizeImage = async source => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      scale = parseInt(control.scale, 10) || 1;

    let {naturalWidth: width = 0, naturalHeight: height = 0} = source;

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

      if (size > mega * 5) {
        return showResult('圧縮前の画像サイズが5MB以上なので処理を中断しました。');
      }

      if (size > maxSize) { control.optipng = true; }
    } else {
      dataURL = canvas.toDataURL();
    }

    if (dataURL || control.optipng) {
      worker.postMessage({origBlob, dataURL, optipng: control.optipng});
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
