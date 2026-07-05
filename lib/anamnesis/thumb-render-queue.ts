/** Limita renders PDF concorrentes (miniaturas) para não estourar memória no iPad. */
const MAX_CONCURRENT = 2;
let active = 0;
const waiters: Array<() => void> = [];

function pump() {
  while (active < MAX_CONCURRENT && waiters.length > 0) {
    const next = waiters.shift();
    if (next) next();
  }
}

export function scheduleThumbRender<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    };

    if (active < MAX_CONCURRENT) {
      run();
    } else {
      waiters.push(run);
    }
  });
}
