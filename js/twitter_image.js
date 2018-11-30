/*! twitter_image.js | v1.0.7 | MIT License */
{
  const
    maxSize = 3145728,  // 3MB
    imageError = 'ブラウザが対応していない画像フォーマットです。';

  let blobURL = null, enabled = true;

  const onLoad = (image, url) => new Promise((resolve, reject) => {
    image.onload = () => resolve(true);
    image.onerror = reject;
    image.src = url;
  }).catch(() => false);

  const dropReset = () => {
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      blobURL = null;
    }

    if (enabled) { control.scale = '1'; }

    output.reset = true;
    output.height = '0';
    output.message = '';
    output.image = '';
  };

  // instance
  const
    control = new Vue({
      el: '#control',
      data: {scale: '1'},
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

  const blob2URL = async canvas => {
    let blob;

    if (canvas.toBlob) {
      blob = await new Promise(resolve => canvas.toBlob(resolve));
    } else if (canvas.msToBlob) {
      blob = canvas.msToBlob();
    } else {
      return {url: canvas.toDataURL(), size: 0};
    }

    blobURL = URL.createObjectURL(blob);
    return {url: blobURL, size: blob.size};
  };

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

    if (size > maxSize) { output.message = '3MBを超えています。Twitterにアップロードできません。'; }

    showResult();
  };

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
