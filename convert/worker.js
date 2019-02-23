/*! worker.js | v0.0.1 | MIT License */
{
  const convertImage = async ev => {
    const
      {item, quality} = ev.data,
      canvas = new OffscreenCanvas(item.width, item.height),
      ctx = canvas.getContext('2d'),
      bitmap = await self.createImageBitmap(item.file);

    ctx.drawImage(bitmap, 0, 0);

    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality / 100,
    });

    self.postMessage({blob, name: item.name.replace(/\.\w+$/, '.jpg')});
  };

  self.addEventListener('message', convertImage);
}
