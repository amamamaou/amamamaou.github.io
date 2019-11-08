/*! terser main.js | v1.1.0 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';
import {saveAs} from '/assets/js/utility.min.js';

Vue.init = obj => new Vue(obj);

const loadJSFile = file => new Promise((resolve, reject) => {
  if (!file || !/javascript$/.test(file.type)) {
    reject();
    return;
  }

  const reader = new FileReader;
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsText(file);
}).catch(() => null);

const cmOptions = {
  mode: 'application/javascript',
  dragDrop: false,
  lineWrapping: true,
  lineNumbers: true,
};

const beforeArea = new Vue({
  el: '#beforeArea',
  data: { over: false, cm: null, filename: '' },
  methods: {
    dragover(ev) {
      ev.dataTransfer.dropEffect = 'copy';
      this.over = true;
    },
    async readFile(ev) {
      const
        {files: [file = null]} = ev.dataTransfer,
        code = await loadJSFile(file);

      this.over = false;
      this.cm.setValue(code || '// 対応していない形式です');
      this.cm.save();

      this.filename = code ? file.name : '';
    },
  },
  mounted() {
    const textarea = document.getElementById('beforeCode');
    this.cm = CodeMirror.fromTextArea(textarea, cmOptions);
  },
});

const afterArea = new Vue({
  el: '#afterArea',
  data: { cm: null },
  mounted() {
    const
      textarea = document.getElementById('afterCode'),
      option = Object.assign({ readOnly: true }, cmOptions);

    this.cm = CodeMirror.fromTextArea(textarea, option);
    this.cm.on('focus', () => this.cm.execCommand('selectAll'));
  },
});

const options = new Vue({
  el: '#options',
  data: {
    keep_classnames: false,
    keep_fnames: false,
    module: false,
    ascii_only: false,
    braces: false,
    ecma: 5,
    comments: 'some',
    quote_style: 3,
  },
});

const download = new Vue({
  el: '#download',
  data: {
    disabled: true,
    filename: '',
  },
  methods: {
    action() {
      if (this.disabled || !this.filename) { return; }

      const
        code = afterArea.cm.getValue(),
        blob = new Blob([code], {type: 'application/javascript; charset=utf-8'});

      saveAs(blob, this.filename);
    },
  }
});

Vue.init({
  el: '#buttons',
  methods: {
    action() {
      const {code, error = null} = Terser.minify(beforeArea.cm.getValue(), {
        mangle: {
          keep_classnames: options.keep_classnames,
          keep_fnames: options.keep_fnames,
          module: options.module,
        },
        output: {
          ascii_only: options.ascii_only,
          braces: options.braces,
          ecma: parseInt(options.ecma),
          comments: options.comments === 'false' ? false : options.comments,
          quote_style: parseInt(options.quote_style),
          wrap_func_args: false,
        },
      });

      afterArea.cm.setValue(error ? `/* ${error} */` : code);
      afterArea.cm.save();

      download.disabled = !!error;
      download.filename = error ? '' : beforeArea.filename.replace(/\.js$/, '.min.js');
    },
    clear() {
      beforeArea.cm.setValue('');
      beforeArea.cm.save();
      afterArea.cm.setValue('');
      afterArea.cm.save();

      beforeArea.filename = '';
      download.disabled = true;
      download.filename = '';
    },
  },
});