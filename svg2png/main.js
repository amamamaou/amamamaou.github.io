/*! svg2png | v1.0.6 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';

const
  maxMB = 20,
  maxByte = 1048576 * maxMB,
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

// Vue instances
const scaleBlock = new Vue({
  el: '.scaleBlock',
  data: {
    type: 'relative',
    scale: '1',
    width: '',
    height: '',
  },
  methods: {dropReset},
});
const dropArea = new Vue({
  el: '.dropContent',
  data: {over: false, wait: false},
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
  if (file.size > maxByte) { return showResult(`ファイルサイズが ${maxMB}MB を超えています！`); }

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

  if (naturalWidth === 0 || naturalHeight === 0) {
    return showResult(imageError);
  }

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
