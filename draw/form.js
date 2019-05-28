{
  const mainForm = document.getElementById('mainForm');

  Pickr.create({
    el: '.backgroundColor',
    default: mainForm.bg.value,
    components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
        hex: true,
        rgba: true,
        hsva: true,
        input: true,
        save: true,
      },
    },
  }).on('save', hsva => {
    mainForm.bg.value = hsva.toRGBA().toString();
  });

  Pickr.create({
    el: '.fillColor',
    default: mainForm.fill.value,
    components: {
      preview: true,
      hue: true,
      interaction: {
        hex: true,
        rgba: true,
        hsva: true,
        input: true,
        save: true,
      },
    },
  }).on('save', hsva => {
    mainForm.fill.value = hsva.toHEXA().toString();
  });

  mainForm.addEventListener('input', event => {
    const range = event.target.closest('input[type="range"]');
    if (range) {
      const output = range.parentNode.querySelector('output');
      output.value = parseFloat(range.value).toFixed(2);
    }
  });
}