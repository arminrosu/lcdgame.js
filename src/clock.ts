const rafCallback = (time:DOMHighResTimeStamp) => {
	(self as unknown as Worker).postMessage({
		// floor the rafTime to make it equivalent to the Date.now()
		time: Math.floor(time),
	});

	self.cancelAnimationFrame(rafId);
	self.requestAnimationFrame(rafCallback);
};

const rafId = self.requestAnimationFrame(rafCallback);