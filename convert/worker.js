/*! worker.js | v1.0.1 | MIT License */
{
  const convertImage = async ev => {
    const
      {item: {index, file}, quality} = ev.data,
      bitmap = await self.createImageBitmap(file),
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
      ctx = canvas.getContext('2d');

    ctx.drawImage(bitmap, 0, 0);

    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality / 100,
    });

    self.postMessage({blob, index});
  };

  self.addEventListener('message', convertImage);
}
