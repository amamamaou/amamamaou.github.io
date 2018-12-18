/*! svg2png | v1.0.5 | MIT License */
{
  const
    maxSize = 20971520,  // 20MB
    imageError = 'ブラウザが対応していないフォーマットです。';

  const dropReset = () => {
    URL.revokeObjectURL(output.image);
    output.reset = true;
    output.height = '0';
    output.message = output.image = '';
  };

  const onLoad = (elem, src = null) => new Promise((resolve, reject) => {
    elem.onload = () => resolve(true);
    elem.onerror = reject;
    if (src) { elem.src = src; }
  }).catch(() => false);

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
      data: {over: false, wait: false},
      methods: {
        dragover(ev) {
          if (!dropArea.wait) {
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

  const showResult = async (text = null) => {
    if (text) { output.message = text; }
    output.reset = false;
    await Vue.nextTick();
    output.height = output.$refs.body.offsetHeight + 'px';
    dropArea.wait = false;
  };

  const readFile = async file => {
    dropArea.wait = true;

    dropReset();
    await Vue.nextTick();

    if (!file.type.includes('image/')) { return showResult(imageError); }
    if (file.size > maxSize) { return showResult('ファイルサイズが3MBを超えています！'); }

    const reader = new FileReader;
    reader.readAsDataURL(file);

    if (!await onLoad(reader)) { return showResult('ファイルの読み込みに失敗しました'); }

    const image = new Image;

    if (await onLoad(image, reader.result)) {
      buildImage(image, file.name);
    } else {
      showResult(imageError);
    }
  };

  const blob2URL = async canvas => {
    let blob;

    if (canvas.toBlob) {
      blob = await new Promise(resolve => canvas.toBlob(resolve));
    } else if (canvas.msToBlob) {
      blob = canvas.msToBlob();
    } else {
      return canvas.toDataURL();
    }

    return URL.createObjectURL(blob);
  };

  const buildImage = async (source, name) => {
    const
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      scale = parseFloat(scaleBlock.scale) || 1,
      optWidth = parseFloat(scaleBlock.width),
      optHeight = parseFloat(scaleBlock.height);

    let
      {naturalWidth, naturalHeight} = source,
      ratio = naturalWidth / (naturalHeight || 1),
      width, height;

    output.fileName = name.replace(/\.\w+$/, '.png');

    if (naturalWidth === 0 || naturalHeight === 0) {
      document.body.appendChild(source);
      naturalWidth = source.naturalWidth || source.offsetWidth;
      naturalHeight = source.naturalHeight || source.offsetHeight;
      ratio = naturalWidth / naturalHeight;
      source.remove();
    }

    if (naturalWidth === 0 || naturalHeight === 0) { return showResult(imageError); }

    if (scaleBlock.type === 'relative') {
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

    await onLoad(new Image, url);

    output.image = url;

    showResult();
  };
}
