// LCD game JavaScript library
// Bas de Reuver (c)2018

// -------------------------------------
// request animation frame
// -------------------------------------
const AnimationFrame = function (lcdgame) {
	// save reference to game object
	this.lcdgame = lcdgame;
	this.raftime = null;
	this.rafId = null;
};

AnimationFrame.prototype = {

	start: function () {
		this.animationLoop = (time) => {
			return this.updateAnimFrame(time);
		};

		this.rafId = window.requestAnimationFrame(this.animationLoop);
	},

	/**
	 * Trigger a timer method every AnimationFrame.
	 *
	 * @WARNING: requestAnimationFrame is paused if the tab is not active. All events are executed after the tab becomes active again, resulting in a "wormhole" effect.
	 *
	 * @param {DOMHighResTimeStamp} rafTime
	 */
	updateAnimFrame: function (rafTime) {
		// check if switch to pending new state
		this.lcdgame.state.checkSwitch();

		// floor the rafTime to make it equivalent to the Date.now() provided by updateSetTimeout (just below)
		this.raftime = Math.floor(rafTime);
		this.lcdgame.updateloop(this.raftime);

		window.cancelAnimationFrame(this.rafId);
		this.rafId = window.requestAnimationFrame(this.animationLoop);
	}
};

export default AnimationFrame;