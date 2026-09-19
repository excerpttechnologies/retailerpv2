"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_PurchaseGroup_js";
exports.ids = ["_rsc_models_PurchaseGroup_js"];
exports.modules = {

/***/ "(rsc)/./models/PurchaseGroup.js":
/*!*********************************!*\
  !*** ./models/PurchaseGroup.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* Purchase Groups\r\n   Collection name is pinned lowercase: Mongoose would pluralise it\r\n   otherwise, and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'purchaseGroup';\nconst PurchaseGroupSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    purchaseGroup: {\n        type: String,\n        default: ''\n    },\n    status: {\n        type: String,\n        default: \"Active\"\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).purchaseGroup || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('purchaseGroup', PurchaseGroupSchema, 'purchasegroup'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvUHVyY2hhc2VHcm91cC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQWdDO0FBRWhDOzsrREFFK0QsR0FFeEQsTUFBTUMsY0FBYyxnQkFBZ0I7QUFFM0MsTUFBTUMsc0JBQXNCLElBQUlGLHdEQUFlLENBQzdDO0lBQ0VJLFlBQVk7UUFBRUMsTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBWUMsU0FBUztRQUFNQyxPQUFPO0lBQUs7SUFDaEdDLGVBQWU7UUFBRU4sTUFBTU87UUFBUUgsU0FBUztJQUFHO0lBQzNDSSxRQUFRO1FBQUVSLE1BQU1PO1FBQVFILFNBQVM7SUFBUztBQUM1QyxHQUNBO0lBQUVLLFlBQVk7QUFBSztBQUdyQixpRUFBZWQsd0RBQWUsQ0FBQ1csYUFBYSxJQUMxQ1gscURBQWMsQ0FBQyxpQkFBaUJFLHFCQUFxQixnQkFBZ0IsRUFBQyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxBZG1pblxcRGVza3RvcFxcZGVwbG95IHdlYnNpdGUgcG9ydFxcd292ZW5lc3NlbmNlZXJwXFxtb2RlbHNcXFB1cmNoYXNlR3JvdXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuXHJcbi8qIFB1cmNoYXNlIEdyb3Vwc1xyXG4gICBDb2xsZWN0aW9uIG5hbWUgaXMgcGlubmVkIGxvd2VyY2FzZTogTW9uZ29vc2Ugd291bGQgcGx1cmFsaXNlIGl0XHJcbiAgIG90aGVyd2lzZSwgYW5kIE1vbmdvREIgY29sbGVjdGlvbiBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmUuICovXHJcblxyXG5leHBvcnQgY29uc3QgTEFCRUxfRklFTEQgPSAncHVyY2hhc2VHcm91cCc7XHJcblxyXG5jb25zdCBQdXJjaGFzZUdyb3VwU2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYShcclxuICB7XHJcbiAgICBidXNpbmVzc0lkOiB7IHR5cGU6IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZCwgcmVmOiAnYnVzaW5lc3MnLCBkZWZhdWx0OiBudWxsLCBpbmRleDogdHJ1ZSB9LFxyXG4gICAgcHVyY2hhc2VHcm91cDogeyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6ICcnIH0sXHJcbiAgICBzdGF0dXM6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiBcIkFjdGl2ZVwiIH0sXHJcbiAgfSxcclxuICB7IHRpbWVzdGFtcHM6IHRydWUgfVxyXG4pO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgbW9uZ29vc2UubW9kZWxzLnB1cmNoYXNlR3JvdXAgfHxcclxuICBtb25nb29zZS5tb2RlbCgncHVyY2hhc2VHcm91cCcsIFB1cmNoYXNlR3JvdXBTY2hlbWEsICdwdXJjaGFzZWdyb3VwJyk7XHJcbiJdLCJuYW1lcyI6WyJtb25nb29zZSIsIkxBQkVMX0ZJRUxEIiwiUHVyY2hhc2VHcm91cFNjaGVtYSIsIlNjaGVtYSIsImJ1c2luZXNzSWQiLCJ0eXBlIiwiVHlwZXMiLCJPYmplY3RJZCIsInJlZiIsImRlZmF1bHQiLCJpbmRleCIsInB1cmNoYXNlR3JvdXAiLCJTdHJpbmciLCJzdGF0dXMiLCJ0aW1lc3RhbXBzIiwibW9kZWxzIiwibW9kZWwiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./models/PurchaseGroup.js\n");

/***/ })

};
;