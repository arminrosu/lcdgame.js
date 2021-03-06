// LCD game JavaScript library
// Bas de Reuver (c)2018

// -------------------------------------
// the state manager
// -------------------------------------

/**
 * @param {LCDGame.Game} lcdgame
 */
const StateManager = function (lcdgame) {
  this.lcdgame = lcdgame;
  this._currentState = '';
  this._pendingState = '';
  this.states = {}; // hold all states
};

StateManager.prototype = {

  /**
   *
   * @param {string} key
   * @param {object} state - Game Mode
   */
  add: function (key, State) {
    // state.game = this.game;
    this.states[key] = new State(this.lcdgame);

    this._pendingState = key;

    return State;
  },

  start: function (key) {
    this.lcdgame.cleartimers();

    if (this._currentState) {
      this._currentState = '';
    }
    this._pendingState = key;
  },

  currentState: function () {
    if (this._currentState) {
      return this.states[this._currentState];
    }
  },

  checkSwitch: function () {
    // switch to next state
    if (this._currentState !== this._pendingState) {
      this._currentState = this._pendingState;
      this.states[this._currentState].init();
    }
  }

};

export default StateManager;
