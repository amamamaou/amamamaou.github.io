/*! worker.js | v1.0.0 | MIT License */
{
  self.addEventListener('message', ev => {
    const reader = new FileReader;
    reader.onload = () => self.postMessage(reader.result);
    reader.readAsDataURL(ev.data);
  });
}
