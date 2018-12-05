/*! twitter_image.js | v1.1.0 | MIT License */
{
  const
    maxSize = 3145728,  // 3MB
    imageError = 'ブラウザが対応していない画像フォーマットです。';

  let blobURL = null, enabled = true;

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024**exp,
      unit = exp === 0 ? 'bytes' : ['K', 'M'][exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  // use Optiong.js
  const doOptipng = buffer => {
    const {data} = optipng(buffer, ['-o2']);
    return new Blob([data], {type: 'image/png'});
  };

  // Blob to Uint8Array
  const blob2Array = blob => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(blob);
  });

  // onload Promise
  const onLoad = (image, url) => new Promise((resolve, reject) => {
    image.onload = () => resolve(true);
    image.onerror = reject;
    image.src = url;
  }).catch(() => false);

  // reset options
  const dropReset = () => {
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      blobURL = null;
    }

    if (enabled) {
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
      data: {scale: '1', optipng: false},
      methods: {dropReset},
    }),
    dropArea = new Vue({
      el: '#dropArea',
      data: {
        over: false,
        wait: false,
      },
      methods: {
        dragover(ev) {
          if (enabled) {
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
    dropArea.wait = false;
    enabled = true;
  };

  const viewError = text => {
    output.message = text;
    showResult();
  };

  // Blob to Object URL
  const blob2URL = async canvas => {
    let blob, buffer = null;

    if (canvas.toBlob) {
      blob = await new Promise(resolve => canvas.toBlob(resolve));
    } else if (canvas.msToBlob) {
      blob = canvas.msToBlob();
    } else {
      if (!control.optipng) { return {url: canvas.toDataURL(), size: 0}; }

      // low performance
      const
        binary = atob(canvas.toDataURL().split(',')[1]),
        length = binary.length;

      buffer = new Uint8Array(length);

      for (let i = 0; i < length; i++) { buffer[i] = binary.charCodeAt(i); }
    }

    // use Optiong.js
    if (control.optipng) {
      blob = doOptipng(buffer || await blob2Array(blob));
    }

    blobURL = URL.createObjectURL(blob);

    return {url: blobURL, size: blob.size};
  };

  // read File object
  const readFile = async file => {
    dropArea.wait = true;
    enabled = false;

    dropReset();

    if (!file.type.includes('image/')) { return viewError(imageError); }
    if (file.size > maxSize) { return viewError('ファイルサイズが3MBを超えています！'); }

    const
      image = new Image,
      url = URL.createObjectURL(file);

    if (await onLoad(image, url)) {
      URL.revokeObjectURL(url);
      optimizeImage(image, file.name);
    } else {
      viewError(imageError);
    }
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

    const {url, size} = await blob2URL(canvas);

    await onLoad(new Image, url);

    output.image = url;
    output.size = filesize(size);

    if (size > maxSize) { output.message = '3MBを超えています。Twitterにアップロードできません。'; }

    showResult();
  };

  // paste image on clipbord
  document.addEventListener('paste', ev => {
    if (enabled && ev.clipboardData) {
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
