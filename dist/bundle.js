/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
(() => {
/*!************************************************!*\
  !*** ./node_modules/webpack/hot/dev-server.js ***!
  \************************************************/
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/* globals __webpack_hash__ */
if (false) { var hotEmitter, check, log, upToDate, lastHash; } else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}

})();

// This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
// const title = document.getElementById("title");
// title.innerHTML = "Damn";
var newDiv = document.createElement("h1");
newDiv.innerHTML = "Test123";
document.body.append(newDiv);
var canvas = document.getElementById("canvas");
canvas.style.background = "red";
})();

/******/ })()
;
//# sourceMappingURL=bundle.js.map