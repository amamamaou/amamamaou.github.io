/*! svg2png.js | v1.0.2 | MIT License */
{
  const
    maxSize = 20971520,  // 20MB
    imageError = 'ブラウザが対応していないフォーマットです。';

  let blobURL = null, enabled = true;

  const dropReset = () => {
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      blobURL = null;
    }

    output.reset = true;
    output.height = '0';
    output.message = '';
    output.image = '';
  };

  // instance
  const
    scaleBlock = new Vue({
      el: '.scaleBlock',
      data: {
        type: 'relative',
        scale: '1',
        width: '',
        height: '',
      },
      methods: {dropReset},
    }),
    dropArea = new Vue({
      el: '.dropContent',
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

  output.$on('slideDown', async () => {
    output.reset = false;
    await output.$nextTick();
    output.height = output.$el.children[0].offsetHeight + 'px';
  });

  const viewError = text => {
    output.message = text;
    output.$emit('slideDown');
    dropArea.wait = false;
    enabled = true;
  };

  const onLoad = elem => new Promise((resolve, reject) => {
    elem.onload = () => resolve(true);
    elem.onerror = reject;
  }).catch(() => false);

  const readFile = async file => {
    dropArea.wait = true;
    enabled = false;

    dropReset();

    if (!file.type.includes('image/')) { return viewError(imageError); }
    if (file.size > maxSize) { return viewError('ファイルサイズが3MBを超えています！'); }

    const reader = new FileReader;
    reader.readAsDataURL(file);

    if (!await onLoad(reader)) { return viewError('ファイルの読み込みに失敗しました'); }

    const image = new Image;
    image.src = reader.result;

    if (await onLoad(image)) {
      buildImage(image, file.name);
    } else {
      viewError(imageError);
    }
  };

  const blob2URL = canvas => {
    if (canvas.toBlob) {
      return new Promise(resolve => {
        canvas.toBlob(blob => {
          blobURL = URL.createObjectURL(blob);
          resolve(blobURL);
        });
      });
    }

    if (canvas.msToBlob) {
      blobURL = URL.createObjectURL(canvas.msToBlob());
      return blobURL;
    }

    return canvas.toDataURL();
  };

  const buildImage = async (source, name) => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      image = new Image,
      scale = parseFloat(scaleBlock.scale) || 1,
      optWidth = parseFloat(scaleBlock.width),
      optHeight = parseFloat(scaleBlock.height);

    let
      {naturalWidth, naturalHeight} = source,
      ratio = naturalWidth / (naturalHeight || 1),
      width, height;

    output.fileName =  name.replace(/\.\w+$/, '.png');

    if (naturalWidth === 0 || naturalHeight === 0) {
      document.body.appendChild(source);
      naturalWidth = source.naturalWidth || source.offsetWidth;
      naturalHeight = source.naturalHeight || source.offsetHeight;
      ratio = naturalWidth / naturalHeight;
      source.remove();
    }

    if (naturalWidth === 0 || naturalHeight === 0) { return viewError(imageError); }

    if (scaleBlock.type === 'size') {
      width = naturalWidth * scale;
      height = naturalHeight * scale;
    } else {
      if (!isNaN(optWidth) && !isNaN(optHeight)) {
        width = optWidth;
        height = optHeight;
      } else if (!isNaN(optWidth)) {
        width = optWidth;
        height = optWidth / ratio;
      } else if (!isNaN(optHeight)) {
        width = optHeight * ratio;
        height = optHeight;
      } else {
        width = naturalWidth;
        height = naturalHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(source, 0, 0, width, height);

    const url = await blob2URL(canvas);
    image.src = url;

    await onLoad(image);

    output.image = url;
    output.$emit('slideDown');
    dropArea.wait = false;
    enabled = true;
  };
}
