// LCD game JavaScript library
// Bas de Reuver (c)2018

import { LCDGAME_VERSION } from './System';
import { displayInfobox, renderInfoBox } from './Menu';
import HighScores, { SCORE_HTML } from './Highscores';
import Sounds from './Sounds';
import StateManager from './StateManager';
import Timer from './Timer';
import { isTouchDevice, randomInteger, request } from './utils';
import { addSVG, BUTTON_CLASSNAME, setDigitVisibility, setShapeVisibility, setShapesVisibility } from './svg';
import { getKeyMapping, normalizeButtons } from './buttons';

const WORKER_FILENAME = '/bin/clock.js';

const CONTAINER_HTML =
	'<div id="container" class="container">' +
	'	<div id="svg" class="svgContainer"></div>' +
	'	<div class="menu">' +
	'		<a class="mybutton" onclick="LCDGame.displayScorebox();">highscores</a>' +
	'		<a class="mybutton" onclick="LCDGame.displayInfobox();">help</a>' +
	'	</div>' +
	'</div>';

// -------------------------------------
// game object
// -------------------------------------
const Game = function (configfile, metadatafile = "metadata/gameinfo.json") {

	this.gamedata = {};
	this.score = 0;
	this.gametype = 0;
	this.level = 0;

	this.buttonpress = 0;
	this.playtimestart = null;

	// site lock, enable for no hotlinking
	/*
	var domain = document.domain;
	siteLock = false;
	var siteLock = (domain.indexOf("bdrgames.nl") == -1);
	if (siteLock) {
		document.write('To play LCD game simulations, please visit: <a href="http://www.bdrgames.nl/lcdgames/">http://www.bdrgames.nl/lcdgames/</a>');
		console.log('%c To play LCD game simulations, please visit: http://www.bdrgames.nl/lcdgames/', 'background: #000; color: #0f0'); // cool hax0r colors ;)
		return;
	};
	*/

	// create elements and add to document
	var str =
		CONTAINER_HTML +
		SCORE_HTML;

	document.write(str);

	this.scorecontent = document.getElementById("scorecontent");

	// state manager
	this.state = new StateManager(this);

	this.digitMap = new Map();
	this.frameMap = new Map();
	this.sequenceMap = new Map();

	// @NOTE: change this object to add / remove custom key bindings
	this.keyMap = {};
	this.timers = [];

	this.initGame(configfile, metadatafile);

	return this;
};

Game.prototype = {
	// -------------------------------------
	// load a game configuration file
	// -------------------------------------
	loadConfig: async function(path) {
		try {
			const data = await request(path);
			await this.onConfigLoad(data);
		} catch (error) {
			console.log("** ERROR ** lcdgame.js - onConfigError: error loading json file");
			console.error(error);
		}
	},

	// -------------------------------------
	// start game
	// -------------------------------------
	onConfigLoad: async function(data) {
		data.buttons = normalizeButtons(data.buttons);

		this.gamedata = data;

		await addSVG(data);

		// add custom lcdgame.js properties for use throughout the library
		data.frames.forEach(frame => {
			this.frameMap.set(frame.filename, {
				...frame,
				// add current/previous values to all shape objects
				value: false,
				valprev: false,
				// add type
				type: "shape",
			});
		});

		// prepare sequences
		data.sequences.forEach(sequence => {
			this.sequenceMap.set(sequence.name, sequence);
		});

		// prepare digits
		for (var d = 0; d < this.gamedata.digits.length; d++) {
			const digitGroup = data.digits[d];
			this.digitMap.set(digitGroup.name, digitGroup);
		}

		// prepare buttons keycodes
		this.keyMap = getKeyMapping(data.buttons);
	},

	// -------------------------------------
	// load a metadata file
	// -------------------------------------
	loadMetadata: async function(path) {
		try {
			const data = await request(path);
			renderInfoBox(data);

			// get info from metadata
			var title = data.gameinfo.device.title;
			var gametypes = data.gameinfo.gametypes;

			this.gametype = (typeof gametypes === "undefined" ? 0 : 1);

			// highscores
			this.highscores = new HighScores(this, title, gametypes);
			this.highscores.init(this.gametype);
		} catch (error) {
			console.log("** ERROR ** lcdgame.js - onMetadataError: error loading json file");
			console.error(error);
		}
	},

	// -------------------------------------
	// start the specific game
	// -------------------------------------
	initGame: async function(configfile, metadatafile) {
		await this.loadConfig(configfile);
		await this.loadMetadata(metadatafile);

		this.clock = new Worker(WORKER_FILENAME);
		this.clock.onmessage = (event) => {
			const time = event.data.time;
			this.time = time;
			this.state.checkSwitch();
			this.updateLoop(time);
		};

		// prepare sounds
		this.sounds = new Sounds(this.gamedata.sounds);

		// bind input
		document.querySelectorAll(`.${BUTTON_CLASSNAME}`).forEach((element) => {
			element.addEventListener("mousedown", this.onmousedown.bind(this), false);
			element.addEventListener("mouseup", this.onmouseup.bind(this), false);

			if (isTouchDevice()) {
				element.addEventListener("touchstart", this.ontouchstart.bind(this), false);
				element.addEventListener("touchend", this.ontouchend.bind(this), false);
			}
		});

		// keyboard
		document.addEventListener("keydown", this.onkeydown.bind(this), false);
		document.addEventListener("keyup",   this.onkeyup.bind(this), false);

		displayInfobox();

		console.log("lcdgame.js v" +  LCDGAME_VERSION + " :: start");
	},

	// -------------------------------------
	// timers and game loop
	// -------------------------------------

	/**
	 * Register a callback to be executed every `ms` milliseconds.
	 *
	 * @param {object} context - Game instance.
	 * @param {function} callback - Function callback to execute.
	 * @param {number} ms - Millisecond interval to execute this callback.
	 * @param {boolean} waitfirst - Execute callback on registration or after first `ms` interval has passed.
	 */
	addtimer: function(context, callback, ms, waitfirst = true) {

		// after .start() do instantly start callbacks (true), or wait the first time (false), so:
		// true  => .start() [callback] ..wait ms.. [callback] ..wait ms.. etc.
		// false => .start() ..wait ms.. [callback] ..wait ms.. [callback] etc.

		// add new timer object
		var tim = new Timer(context, callback, ms, waitfirst);

		this.timers.push(tim);

		return tim;
	},

	/**
	 * Stop and de-register all Timers.
	 *
	 * @private
	 */
	cleartimers: function() {
		// clear all timers
		for (var t=0; t < this.timers.length; t++) {
			this.timers[t].pause();
			this.timers[t] = null;
		}
		this.timers = [];
	},

	/**
	 * Execute callbacks.
	 *
	 * @private
	 * @param {Number} timestamp - Date.now()
	 */
	updateLoop: function(timestamp) {
		// check all timers
		for (var t=0; t < this.timers.length; t++) {
			if (this.timers[t].enabled) {
				this.timers[t].update(timestamp);
			}
		}
	},

	gameReset: function(gametype = this.gametype) {
		// new game reset variables
		this.score = 0;
		this.level = 0;
		this.gametype = gametype;
		this.buttonpress = 0;
		this.playtimestart = new Date();
	},

	// -------------------------------------
	// sound effects
	// -------------------------------------

	/**
	 * Toggle all sounds. Defaults to opposite of current value.
	 *
	 * @param {boolean} [value]
	 */
	setSoundMute: function (value) {
		this.sounds.mute(value);
	},

	/**
	 * Play Sound.
	 *
	 * @param {string} name
	 */
	playSoundEffect: function (name) {
		this.sounds.play(name);
	},

	// -------------------------------------
	// function for shapes
	// -------------------------------------

	/**
	 * Toggle shape visibility by its name.
	 *
	 * @param {string} filename - Name of Shape.
	 * @param {boolean} value
	 */
	setShapeByName: function(name, value) {
		const frame = this.frameMap.get(name);
		if (frame) {
			frame.value = value;
			setShapeVisibility(name, value);
		}
	},

	// -------------------------------------
	// function for sequences
	// -------------------------------------

	/**
	 *
	 * @param {string} name
	 * @param {boolean} [value=false]
	 */
	sequenceClear: function(name, value = false) {
		const sequence = this.sequenceMap.get(name);

		sequence.frames.forEach(frameName => {
			this.setShapeByName(frameName, value);
		});
	},

	/**
	 *
	 * @param {string} name
	 * @param {number} [max]
	 * @returns {boolean}
	 */
	sequenceShift: function(name, max) {
		// example start [0] [1] [.] [3] [.] (.=off)
		//        result [.] [1] [2] [.] [4]

		// get sequence index of name
		const sequence = this.sequenceMap.get(name);

		// max position is optional
		if (typeof max === "undefined") {
			max = sequence.frames.length;
		}

		// shift shape values one place DOWN
		var i;
		var ret = false;
		for (i = max-1; i > 0; i--) {
			// get shape indexes of adjacent shapes in this sequence
			const frame1Name = sequence.frames[i-1];
			const frame2Name = sequence.frames[i];

			// return value
			if (i == (max-1)) {
				ret = this.frameMap.get(frame2Name).value;
			}

			// shift shape values DOWN one place in sequence
			this.setShapeByName(this.frameMap.get(frame2Name).filename, this.frameMap.get(frame1Name).value);
		}
		// set first value to blank; default value false
		const frame1Name = sequence.frames[0];
		this.setShapeByName(this.frameMap.get(frame1Name).filename, false);

		// return value, was the last value that was "shifted-out" true or false
		return ret;
	},

	sequenceShiftReverse: function(name, min = 0) {
		// example start [.] [1] [.] [3] [4] (.=off)
		//        result [0] [.] [2] [3] [.]

		// get sequence index of name
		const sequence = this.sequenceMap.get(name);

		// shift shape values one place UP
		for (var i = min; i < sequence.frames.length-1; i++) {
			// get shape indexes of adjacent shapes in this sequence
			const frame1Name = sequence.frames[i];
			const frame2Name = sequence.frames[i+1];
			const frame2 = this.frameMap.get(frame2Name);

			// shift shape values UP one place in sequence
			this.setShapeByName(frame1Name, frame2.value);
		}
		// set last value to blank; default value false
		var shape1 = sequence.frames[i];
		this.setShapeByName(shape1, false);
	},

	/**
	 * Show/Hide first frame in sequence.
	 *
	 * @param {string} name - Sequence name.
	 * @param {boolean} value - Frame visibility.
	 */
	sequenceSetFirst: function(name, value) {
		const sequence = this.sequenceMap.get(name);
		this.setShapeByName(sequence.frames[0], value);
	},

	/**
	 * Toggle visibility of nth element in sequence.
	 *
	 * @param {string} name - Sequence name.
	 * @param {number} pos - Index of frame in sequence to toggle.
	 * @param {boolean} value - Frame visibility.
	 */
	sequenceSetPos: function(name, pos, value) {
		if (this.sequenceMap.size > 0) {
			// get sequence
			const sequence = this.sequenceMap.get(name);

			// if pos is -1, then last last position
			if (pos == -1) {
				pos = sequence.frames.length - 1;
			}

			// if pos out of bound of sequence array
			if (pos < sequence.frames.length - 1) {
				// set value for position shape in sequence
				var frameName = sequence.frames[pos];
				this.setShapeByName(frameName, value);
			}
		}
	},

	/**
	 * Check if a Frame is visible.
	 *
	 * @param {string} name - Frame name.
	 * @returns {boolean}
	 */
	shapeVisible: function(name) {
		const frame = this.frameMap.get(name);
		return frame.value;
	},

	/**
	 * Check if a sequence has visible frames.
	 *
	 * @param {string} name - Sequence name.
	 * @param {number} [pos] - Optional index of frame to check.
	 * @returns {boolean}
	 */
	sequenceShapeVisible: function(name, pos) {
		// get sequence
		const sequence = this.sequenceMap.get(name);

		// single pos or any pos
		if (typeof pos === "undefined") {
			// no pos given, check if any shape visible
			for (var i = 0; i < sequence.frames.length; i++) {
				// check if any shape is visible (value==true)
				const frameName = sequence.frames[i];
				if (this.frameMap.get(frameName).value == true) {
					return true;
				}
			}
		} else {
			// if pos is -1, then last last position
			if (pos == -1) {
				pos = sequence.frames.length-1;
			}

			// if pos out of bound of sequence array
			if (pos < sequence.frames.length) {
				// check if shape is visible (value==true)
				const frameName = sequence.frames[pos];
				if (this.frameMap.get(frameName).value == true) {
					return true;
				}
			}
		}
		return false;
	},

	/**
	 * Check if all frames of a sequence are visible or hidden.
	 *
	 * @param {string} name - Sequence name.
	 * @param {boolean} value - Frame visibility.
	 * @returns {boolean}
	 */
	sequenceAllVisible: function(name, value) {
		// get sequence
		const sequence = this.sequenceMap.get(name);

		// check if all visible same as value
		for (var i = 0; i < sequence.frames.length; i++) {
			// check if all shapes same visible
			var frameName = sequence.frames[i];
			if (this.frameMap.get(frameName).value != value) {
				return false;
			}
		}
		return true;
	},

	/**
	 * Hide / show all shapes
	 *
	 * @param {boolean} value - shape visibility.
	 */
	shapesDisplayAll: setShapesVisibility,

	// -------------------------------------
	// function for digits
	// -------------------------------------

	/**
	 *
	 * @param {string} name - DigitGroup name.
	 * @param {string} str - value. e.g. score (200), time (12:34)
	 * @param {boolean} [rightalign=false]
	 */
	digitsDisplay: function(name, str, rightalign = false) {
		// not loaded yet
		if (this.digitMap.size === 0) {
			return;
		}

		const digitGroup = this.digitMap.get(name);
		if (!digitGroup) {
			console.log("** ERROR ** digitsDisplay('"+name+"') - digits not found.");
			throw "lcdgames.js - digitsDisplay, no digits with name '" + name + "'";
		}

		const digitGroupLength = digitGroup.locations.length;

		// some games (e.g. tomsadventure) prepend more characters than the group has. fix this here.
		if (str.length > digitGroupLength) {
			str = str.substring(str.length - digitGroupLength);
		}

		if (rightalign) {
			str = str.padStart(digitGroupLength, ' ');
		}

		str.split('').forEach((character, index) => {
			const isVisible = character !== ' ';
			setDigitVisibility(name, index, character, isVisible);
		});
	},

	// -------------------------------------
	// buttons input through keyboard
	// -------------------------------------

	/**
	 * Button `touchstart` event handler.
	 *
	 * @param {Event} evt
	 */
	ontouchstart: function(evt) {
		evt.preventDefault();

		//  evt.changedTouches is changed touches in this event, not all touches at this moment
		for (var i = 0; i < evt.changedTouches.length; i++)
		{
			this.onmousedown(evt.changedTouches[i]);
		}
	},

	/**
	 * Button `touchend` event handler.
	 *
	 * @param {Event} evt
	 */
	ontouchend: function(evt) {
		evt.preventDefault();

		//  evt.changedTouches is changed touches in this event, not all touches at this moment
		for (var i = 0; i < evt.changedTouches.length; i++)
		{
			this.onmouseup(evt.changedTouches[i]);
		}
	},

	/**
	 * Button `mousedown` event handler.
	 *
	 * @param {Event} evt
	 */
	onmousedown: function(evt) {
		const data = evt.currentTarget.dataset;

		this.onButtonDown(data.name);
	},

	/**
	 * Button `mouseup` event handler.
	 *
	 * @param {Event} evt
	 */
	onmouseup: function(evt) {
		const data = evt.currentTarget.dataset;

		this.onButtonUp(data.name);
	},

	/**
	 * Keyboard `keydown` event handler.
	 *
	 * @param {Event} evt
	 */
	onkeydown: function(evt) {
		const buttonName = this.keyMap[evt.key];
		if (buttonName) {
			this.onButtonDown(buttonName);
		}
	},

	/**
	 * Keyboard `keyup` event handler.
	 *
	 * @param {Event} evt
	 */
	onkeyup: function(evt) {
		const buttonName = this.keyMap[evt.key];

		if (buttonName) {
			this.onButtonUp(buttonName);
		}
	},

	/**
	 * Button Down (Mouse Down / Touch Start) event handler.
	 *
	 * @param {string} name - name of button in gamedata.buttons Array.
	 */
	onButtonDown: function(name) {
		// Update UI
		this.setShapeByName(name, true);

		// handle button press
		const currentState = this.state.currentState();
		if (currentState?.press) {
			currentState.press(name);
		}

		// keep track of button presses
		this.buttonpress++;
	},

	/**
	 * Button Up (Mouse Up / Touch End) event handler.
	 *
	 * @param {string} name - name of button in gamedata.buttons Array.
	 */
	onButtonUp: function(name) {
		// Update UI
		this.setShapeByName(name, false);

		// pass input to game
		const currentState = this.state.currentState();
		if (currentState?.release) {
			currentState.release(name);
		}
	},

	// -------------------------------------
	// Public helper functions
	// -------------------------------------
	randomInteger: randomInteger
};

export default Game;
