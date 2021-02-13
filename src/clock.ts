self.setInterval(() => {
  const time = Date.now();
  (self as unknown as Worker).postMessage({
    time
  });
}, 10);
