/*! terser main.js | v1.0.0 | MIT License */
import Vue from 'https://cdn.jsdelivr.net/npm/vue/dist/vue.esm.browser.min.js';

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
}).catch(() => '// 対応していない形式です');

const cmOptions = {
  mode: 'application/json',
  dragDrop: false,
  lineWrapping: true,
  lineNumbers: true,
};

const beforeArea = new Vue({
  el: '.beforeArea',
  data: { over: false, cm: null },
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
      this.cm.setValue(code);
      this.cm.save();
    },
  },
  mounted() {
    const textarea = document.getElementById('beforeCode');
    this.cm = CodeMirror.fromTextArea(textarea, cmOptions);
  },
});

const afterArea = new Vue({
  el: '.afterArea',
  data: { cm: null },
  mounted() {
    const
      textarea = document.getElementById('afterCode'),
      option = Object.assign({ readOnly: true }, cmOptions);

    this.cm = CodeMirror.fromTextArea(textarea, option);
    this.cm.on('focus', () => this.cm.execCommand('selectAll'));
  },
});

Vue.init({
  el: '.controls',
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
  methods: {
    action() {
      const {code, error} = Terser.minify(beforeArea.cm.getValue(), {
        mangle: {
          keep_classnames: this.keep_classnames,
          keep_fnames: this.keep_fnames,
          module: this.module,
        },
        output: {
          ascii_only: this.ascii_only,
          braces: this.braces,
          ecma: parseInt(this.ecma),
          comments: this.comments === 'false' ? false : this.comments,
          quote_style: parseInt(this.quote_style),
          wrap_func_args: false,
        },
      });

      afterArea.cm.setValue(error ? `/* ${error} */` : code);
      afterArea.cm.save();
    },
    clear() {
      beforeArea.cm.setValue('');
      beforeArea.cm.save();
      afterArea.cm.setValue('');
      afterArea.cm.save();
    },
  },
});