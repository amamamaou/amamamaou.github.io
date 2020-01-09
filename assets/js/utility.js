/*! utility.js | v1.0.0 | MIT Licence */

// calc bytes
export function fileSize(bytes) {
  const
    exp = Math.log(bytes) / Math.log(1024) | 0,
    size = bytes / 1024 ** exp,
    unit = exp === 0 ? 'bytes' : 'KMGTPEZY'[exp - 1] + 'B';
  return (exp === 0 ? size : size.toFixed(2)) + ' ' + unit;
}

// image loader
export async function loadImage(src) {
  return await new Promise((resolve, reject) => {
    const image = new Image;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  }).catch(() => null);
}

// file saver
export function saveAs(blob, name = null) {
  const url = URL.createObjectURL(blob);

  if ('download' in HTMLAnchorElement.prototype) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || url.split('/').pop();
    document.body.appendChild(a).click();
    a.remove();
  } else {
    let popup = window.open('', '_blank');
    popup.document.title = popup.document.body.textContent = 'downloading...';
    popup.location = url;
    popup = null;
  }

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
