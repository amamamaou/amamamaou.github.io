/*! twitter_image | v1.2.6 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js?v1.0.3');

  const
    mega = 1048576,      // 1MB
    maxSize = mega * 3,  // 3MB
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
    let blob;

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
    output.message = '';
    output.image = '';
  };

  // instance
  const
    control = new Vue({
      el: '#control',
      data: {
        scale: '1',
        optipng: false,
        wait: false,
      },
      methods: {dropReset},
    }),
    dropArea = new Vue({
      el: '#dropArea',
      data: {
        over: false,
        wait: true,
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

    if (size > mega * 10) {
      return viewError('画像サイズが10MBを超えています！');
    }

    const
      image = new Image,
      url = URL.createObjectURL(file);

    if (await onLoad(image, url)) {
      URL.revokeObjectURL(url);
      optimizeImage(image, name);
    } else {
      viewError(imageError);
    }
  };

  const drawImage = async blob => {
    const url = URL.createObjectURL(blob);

    await onLoad(new Image, url);

    output.image = url;
    output.size = filesize(blob.size);

    if (blob.size > maxSize) {
      output.message = '3MBを超えています。Twitterにアップロードできません。';
    }

    showResult();
  };

  // optimize
  const optimizeImage = async (source, name) => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      scale = parseInt(control.scale, 10) || 1;

    let {
      naturalWidth: width = 0,
      naturalHeight: height = 0,
    } = source;

    output.fileName = name ? name.replace(/\.\w+$/, '_tw.png') : 'clipbord.png';

    if (width === 0 || height === 0) { return viewError(imageError); }

    width *= scale;
    height *= scale;
    canvas.width = width;
    canvas.height = height;

    if (scale > 1) {
      if ('imageSmoothingEnabled' in ctx) {
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
      }
    }

    ctx.drawImage(source, 0, 0, width, height);
    ctx.clearRect(0, 0, 1, 1);
    ctx.globalAlpha = 0.99;
    ctx.drawImage(source, 0, 0, 1, 1, 0, 0, 1, 1);

    const
      origBlob = await canvas2blob(canvas),
      dataURL = canvas.toDataURL();

    if (origBlob) {
      const {size} = origBlob;

      if (size > mega * 5) {
        return viewError('画像サイズが5MB以上なので処理を中断しました。');
      }

      if (size > maxSize) { control.optipng = true; }

      if (!control.optipng) { return drawImage(origBlob); }
    }

    worker.postMessage({origBlob, dataURL, optipng: control.optipng});
  };

  // Web Worker
  worker.addEventListener('message', ev => {
    const {type, data = null} = ev.data;
    if (type === 'ready') {
      control.wait = dropArea.wait = false;
    } else if (type === 'done') {
      dropArea.process = null;
      drawImage(data);
    } else if (type === 'process') {
      dropArea.process += data + '\n';
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
