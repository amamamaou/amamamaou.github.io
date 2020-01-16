/*! Konami Command! */
{
  const
    command = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
    { documentElement: html, body } = document;

  let
    standby = true,
    index = 0,
    timer = null;

  document.addEventListener('keydown', event => {
    clearTimeout(timer);

    if (standby && event.keyCode === command[index++]) {
      if (index >= command.length) {
        const center = window.pageYOffset + window.innerHeight / 2;

        standby = false;
        index = 0;

        html.style.overflowX = 'hidden';
        body.style.pointerEvents = 'none';
        body.style.transformOrigin = `50% ${center}px`;

        body.addEventListener('animationend', () => {
          standby = true;
          html.style.cssText = body.style.cssText = '';
          body.classList.remove('rotate');
        }, { once: true });

        body.classList.add('rotate');
      } else {
        timer = setTimeout(() => { index = 0; }, 2000);
      }
    } else {
      index = 0;
    }
  }, { passive: true });
}
