/* data-uri | v1.0.1 | MIT License */
{
  const
    dropArea = new Vue({
      el: '#dropArea',
      data: {over: false, wait: false},
      methods: {
        dragover(ev) {
          ev.dataTransfer.dropEffect = 'copy';
          this.over = true;
        },
        readFile(ev) {
          const file = ev.dataTransfer.files[0];
          file && convert(file);
          this.over = false;
        },
        change(ev) {
          const file = ev.target.files[0];
          ev.target.value = '';
          file && convert(file);
        },
      },
    }),
    output = new Vue({
      el: '#output',
      data: {fileInfo: '', result: ''},
      methods: {
        clear() { this.fileInfo = this.result = ''; },
      },
    });

  const filesize = bytes => {
    const
      exp = Math.log(bytes) / Math.log(1024) | 0,
      size = bytes / 1024**exp,
      unit = exp === 0 ? 'bytes' : 'KMG'[exp - 1] + 'B';
    return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
  };

  const readFile = file => new Promise(resolve => {
    const reader = new FileReader;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const convert = async file => {
    if (file.size === 0) {
      output.result = '';
      return;
    }

    dropArea.wait = true;

    output.fileInfo = `${file.name} (${filesize(file.size)})`;
    output.result = await readFile(file);

    dropArea.wait = false;
  };
}
