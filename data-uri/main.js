/* data-uri | v1.0.2 | MIT License */
{
  // Vue instances
  const dropArea = new Vue({
    el: '#dropArea',
    data: {over: false, wait: false},
    methods: {
      dragover(ev) {
        ev.dataTransfer.dropEffect = 'copy';
        this.over = true;
      },
      readFile(ev) {
        this.over = false;
        convert(ev.dataTransfer.files[0]);
      },
      change({target}) {
        target.value = '';
        file && convert(target.files[0]);
      },
    },
  });

  const output = new Vue({
    el: '#output',
    data: {fileInfo: '', result: ''},
    methods: {
      clear() { this.fileInfo = this.result = ''; },
    },
  });

  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024 ** exp,
      unit = exp === 0 ? 'bytes' : 'KMGT'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  const readFile = file => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const convert = async file => {
    if (!file || file.size === 0) {
      output.result = '';
      return;
    }

    dropArea.wait = true;

    output.fileInfo = `${file.name} (${filesize(file.size)})`;
    output.result = await readFile(file);

    dropArea.wait = false;
  };
}
