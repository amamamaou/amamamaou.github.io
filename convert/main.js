/*! Convert to JPEG | v0.0.3 | MIT License */
{
  // Web Worker
  const worker = new Worker('worker.js');

  const
    mega = 1048576,  // 1MB
    maxMB = 20 * mega;

  // calc bytes
  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024 ** exp,
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
  const onLoad = (image, src) => new Promise((resolve, reject) => {
    image.onload = () => resolve(true);
    image.onerror = reject;
    image.src = src;
  }).catch(() => false);

  // Vue instances
  const dropArea = new Vue({
    el: '#dropArea',
    data: {over: false},
    methods: {
      dragover(ev) {
        ev.dataTransfer.dropEffect = 'copy';
        this.over = true;
      },
      readFile(ev) {
        this.over = false;
        addFiles(ev.dataTransfer.files);
      },
      change({target}) {
        addFiles(target.files);
        target.value = '';
      },
    },
  });
  const output = new Vue({
    el: '#output',
    data: {completed: [], standby: [], progress: null},
  });
  const control = new Vue({
    el: '#control',
    data: {
      quality: localStorage.quality || '90',
      wait: false,
    },
    watch: {
      quality() { localStorage.quality = this.quality; },
    },
    methods: {
      clear() {
        for (const {src} of output.completed) {
          URL.revokeObjectURL(src);
        }

        output.completed = [];
        output.standby = [];
        output.progress = null;
      },
    },
  });

  const blob2dataURL = blob => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  const getImageData = blob => new Promise(async resolve => {
    const image = new Image;
    image.src = await blob2dataURL(blob);
    image.onload = () => resolve(image);
  });

  // read File object
  const addFiles = async files => {
    if (!files || files.length === 0) { return; }

    files = Array.from(files);

    let i = 0;

    for (const file of files) {
      if (!file.type.includes('image/') || file.size > maxMB) {
        continue;
      }

      const {src, width, height} = await getImageData(file);

      output.standby.push({
        file, src, width, height,
        name: file.name,
        size: filesize(file.size),
      });

      if (++i === 2 && !output.progress) { nextImage(); }
    }

    if (i === 1 && !output.progress) { nextImage(); }
  };

  const nextImage = () => {
    const item = output.standby.shift();

    if (!item) {
      output.progress = null;
      control.wait = false;
      return;
    }

    output.progress = item;
    control.wait = true;

    if (typeof OffscreenCanvas !== 'undefined') {
      worker.postMessage({item, quality: control.quality});
    }
  };

  const complete = ev => {
    const
      {blob, name} = ev.data,
      image = new Image;

    image.src = URL.createObjectURL(blob);
    image.onload = () => {
      output.completed.push({
        src: image.src,
        name: name.replace(/\.\w+$/, '.jpg'),
        size: filesize(blob.size),
      });
      nextImage();
    };
  };

  // Web Worker
  worker.addEventListener('message', complete);
}
