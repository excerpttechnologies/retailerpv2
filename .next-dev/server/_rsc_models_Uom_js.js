"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_Uom_js";
exports.ids = ["_rsc_models_Uom_js"];
exports.modules = {

/***/ "(rsc)/./models/Uom.js":
/*!***********************!*\
  !*** ./models/Uom.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* Unit of Measurements\r\n   Collection name pinned lowercase - Mongoose would pluralise it otherwise\r\n   and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'name';\nconst UomSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    name: {\n        type: String,\n        default: ''\n    },\n    shortName: {\n        type: String,\n        default: ''\n    },\n    allowDecimal: {\n        type: String,\n        default: ''\n    },\n    defaultValue: {\n        type: String,\n        default: ''\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).uom || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('uom', UomSchema, 'uom'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvVW9tLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBZ0M7QUFFaEM7O29EQUVvRCxHQUU3QyxNQUFNQyxjQUFjLE9BQU87QUFFbEMsTUFBTUMsWUFBWSxJQUFJRix3REFBZSxDQUNuQztJQUNFSSxZQUFZO1FBQUVDLE1BQU1MLHdEQUFlLENBQUNNLEtBQUssQ0FBQ0MsUUFBUTtRQUFFQyxLQUFLO1FBQVlDLFNBQVM7UUFBTUMsT0FBTztJQUFLO0lBQ2hHQyxNQUFNO1FBQUVOLE1BQU1PO1FBQVFILFNBQVM7SUFBRztJQUNsQ0ksV0FBVztRQUFFUixNQUFNTztRQUFRSCxTQUFTO0lBQUc7SUFDdkNLLGNBQWM7UUFBRVQsTUFBTU87UUFBUUgsU0FBUztJQUFHO0lBQzFDTSxjQUFjO1FBQUVWLE1BQU1PO1FBQVFILFNBQVM7SUFBRztBQUM1QyxHQUNBO0lBQUVPLFlBQVk7QUFBSztBQUdyQixpRUFBZWhCLHdEQUFlLENBQUNrQixHQUFHLElBQ2hDbEIscURBQWMsQ0FBQyxPQUFPRSxXQUFXLE1BQU0sRUFBQyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxBZG1pblxcRGVza3RvcFxcZGVwbG95IHdlYnNpdGUgcG9ydFxcd292ZW5lc3NlbmNlZXJwXFxtb2RlbHNcXFVvbS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xyXG5cclxuLyogVW5pdCBvZiBNZWFzdXJlbWVudHNcclxuICAgQ29sbGVjdGlvbiBuYW1lIHBpbm5lZCBsb3dlcmNhc2UgLSBNb25nb29zZSB3b3VsZCBwbHVyYWxpc2UgaXQgb3RoZXJ3aXNlXHJcbiAgIGFuZCBNb25nb0RCIGNvbGxlY3Rpb24gbmFtZXMgYXJlIGNhc2Utc2Vuc2l0aXZlLiAqL1xyXG5cclxuZXhwb3J0IGNvbnN0IExBQkVMX0ZJRUxEID0gJ25hbWUnO1xyXG5cclxuY29uc3QgVW9tU2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYShcclxuICB7XHJcbiAgICBidXNpbmVzc0lkOiB7IHR5cGU6IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZCwgcmVmOiAnYnVzaW5lc3MnLCBkZWZhdWx0OiBudWxsLCBpbmRleDogdHJ1ZSB9LFxyXG4gICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6ICcnIH0sXHJcbiAgICBzaG9ydE5hbWU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnJyB9LFxyXG4gICAgYWxsb3dEZWNpbWFsOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJycgfSxcclxuICAgIGRlZmF1bHRWYWx1ZTogeyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6ICcnIH0sXHJcbiAgfSxcclxuICB7IHRpbWVzdGFtcHM6IHRydWUgfVxyXG4pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgbW9uZ29vc2UubW9kZWxzLnVvbSB8fFxyXG4gIG1vbmdvb3NlLm1vZGVsKCd1b20nLCBVb21TY2hlbWEsICd1b20nKTtcclxuIl0sIm5hbWVzIjpbIm1vbmdvb3NlIiwiTEFCRUxfRklFTEQiLCJVb21TY2hlbWEiLCJTY2hlbWEiLCJidXNpbmVzc0lkIiwidHlwZSIsIlR5cGVzIiwiT2JqZWN0SWQiLCJyZWYiLCJkZWZhdWx0IiwiaW5kZXgiLCJuYW1lIiwiU3RyaW5nIiwic2hvcnROYW1lIiwiYWxsb3dEZWNpbWFsIiwiZGVmYXVsdFZhbHVlIiwidGltZXN0YW1wcyIsIm1vZGVscyIsInVvbSIsIm1vZGVsIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./models/Uom.js\n");

/***/ })

};
;