// LCD game JavaScript library
// Bas de Reuver (c)2018

import { hideInfobox } from './Menu';

export const SCORE_HTML =
    '<div class="infobox" id="scorebox">' +
    '  <div id="scoreheader">' +
    '  </div>' +
    '  <div id="scorecontent" class="scorecontent">' +
    '    One moment...' +
    '  </div>' +
    '  <a class="mybutton btnpop" onclick="LCDGame.hideScorebox();">Ok</a>' +
    '</div>';

export function displayScorebox() {
  hideInfobox();
  document.getElementById("scorebox").style.display = "inherit";
}

export function hideScorebox() {
  document.getElementById("scorebox").style.display = "none";
}

// -------------------------------------
// highscores object
// -------------------------------------
var RANKS_PER_PAGE = 10;

const HighScores = function (lcdgame, gametitle, gametypes) {
  // save reference to game objects
  this.lcdgame = lcdgame;

  // display variables
  this.gametitle = gametitle;
  this.gametypes = gametypes;
  this.offset = 0;

  // highscore variables
  this._scores_local = [];
  this._scoretype = 0;
};

HighScores.prototype = {

  init: function (tp) {
    // init first highscores
    this.buildHeaderHTML();
    this.loadLocal(tp); // tp = game A or game B
  },

  getGametype: function () {
    var res = "";
    if (this.gametypes) {
      res = this.gametypes[this._scoretype-1];
    }
    return res;
  },

  loadLocal: function (typ) {

    // clear variables
    this._scores_local = [];
    this._scoretype = typ; // typ = game type, for example 1 or 2)
    var namecache = "lcdgame_local_"+this.gametitle+"_hs"+typ;

    // load from localstorage
    var sc = window.localStorage.getItem(namecache);

    // error checking, localstorage might not exist yet at first time start up
    try {
      this._scores_local = JSON.parse(sc);
    } catch (e) {
      this._scores_local = []; //error in the above string(in this case,yes)!
    }
    // error checking just to be sure, if localstorage contains something else then a JSON array (hackers?)
    if (Object.prototype.toString.call(this._scores_local) !== "[object Array]") {
      this._scores_local = [];
    }
    this.refreshHTML();
  },

  saveLocal: function (plr, sc, lvl, typ) {
    // always store local highscore
    var rec = {"player":plr, "score":sc, "level":lvl};

    this._scores_local.push(rec);
    this._scores_local.sort((a, b) => b.score - a.score);
    this._scores_local = this._scores_local.slice(0, 9);

    // save highscores locally
    var namecache = "lcdgame_local_"+this.gametitle+"_hs"+typ;
    window.localStorage.setItem(namecache, JSON.stringify(this._scores_local));

    // also save default entry name
    window.localStorage.setItem("lcdgame_highscore_name", plr);
    this.refreshHTML();
  },

  getHighscore: function () {
    var sc = 0;
    if (this.lcdgame.highscores._scores_local[0]) {
      sc = this.lcdgame.highscores._scores_local[0].score;
    }
    return sc;
  },

  checkScore: function () {
    // save current score values, because will reset on background when new game starts
    var sc = this.lcdgame.score;
    var lvl = this.lcdgame.level;
    var typ = this.lcdgame.gametype;

    if (sc > 0) {
      // input name
      var lastname = (window.localStorage.getItem("lcdgame_highscore_name") || "");
      var plr = prompt("New highscore, enter your name and press enter to submit or press cancel.", lastname);

      // not null (cancel) or empty string
      if (plr != null) {
        plr = plr.trim();
        if (plr != "") {
          this.saveLocal(plr, sc, lvl, typ);
        }
      }
    }
  },

  onFilterButton: function (dv) {
    if (dv.currentTarget.dataset) {
      var typ = parseInt(dv.currentTarget.dataset.gametype);

      if (this.gametype != typ) {
        this.offset = 0;
        this.loadLocal(typ);
      }
    }
  },

  buildHeaderHTML: function () {

    // game name and column headers
    var str = '<h1 id="scoretitle">' + this.gametitle + '</h1>';

    for (let i = 0; i < this.gametypes.length; i++) {
      str = str + '<a class="mybutton mybutton-small" data-gametype="' + (i + 1) + '" id="filtertype' + i + '">' + this.gametypes[i] + '</a>';
    }

    // refresh score filter buttons
    document.getElementById("scoreheader").innerHTML = str;

    // attach click events to all buttons
    for (let i = 0; i < this.gametypes.length; i++) {
      var btn = document.getElementById("filtertype"+i);
      btn.addEventListener("click", this.onFilterButton.bind(this));
    }
  },

  refreshHTML: function () {
    // build highscore rows
    var rows = "";

    this._scores_local.forEach((record, index) => {
      rows = rows + "<tr><td>" + (index + 1) + ".</td><td>" + record.player + "</td><td>" + record.score + "</td></tr>";
    });

    // game name and column headers
    var str =
      "<table>" +
      "      <tr><td>Rk.</td><td>Name</td><td>Score</td></tr>" +
      rows +
      "    </table>";

    // refresh html content
    this.lcdgame.scorecontent.innerHTML = str;

    // refresh header html
    str = this.gametitle + ' (' + this.getGametype() + ')';
    document.getElementById("scoretitle").innerHTML = str;
  },
};

export default HighScores;
