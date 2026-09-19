"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_AttributeAddon_js";
exports.ids = ["_rsc_models_AttributeAddon_js"];
exports.modules = {

/***/ "(rsc)/./models/AttributeAddon.js":
/*!**********************************!*\
  !*** ./models/AttributeAddon.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* Attribute Addons\r\n   Collection name pinned lowercase - Mongoose would pluralise it otherwise\r\n   and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'name';\nconst AttributeAddonSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    name: {\n        type: String,\n        default: ''\n    },\n    status: {\n        type: String,\n        default: \"Active\"\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).attributeAddon || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('attributeAddon', AttributeAddonSchema, 'attributeaddon'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvQXR0cmlidXRlQWRkb24uanMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFnQztBQUVoQzs7b0RBRW9ELEdBRTdDLE1BQU1DLGNBQWMsT0FBTztBQUVsQyxNQUFNQyx1QkFBdUIsSUFBSUYsd0RBQWUsQ0FDOUM7SUFDRUksWUFBWTtRQUFFQyxNQUFNTCx3REFBZSxDQUFDTSxLQUFLLENBQUNDLFFBQVE7UUFBRUMsS0FBSztRQUFZQyxTQUFTO1FBQU1DLE9BQU87SUFBSztJQUNoR0MsTUFBTTtRQUFFTixNQUFNTztRQUFRSCxTQUFTO0lBQUc7SUFDbENJLFFBQVE7UUFBRVIsTUFBTU87UUFBUUgsU0FBUztJQUFTO0FBQzVDLEdBQ0E7SUFBRUssWUFBWTtBQUFLO0FBR3JCLGlFQUFlZCx3REFBZSxDQUFDZ0IsY0FBYyxJQUMzQ2hCLHFEQUFjLENBQUMsa0JBQWtCRSxzQkFBc0IsaUJBQWlCLEVBQUMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcQWRtaW5cXERlc2t0b3BcXGRlcGxveSB3ZWJzaXRlIHBvcnRcXHdvdmVuZXNzZW5jZWVycFxcbW9kZWxzXFxBdHRyaWJ1dGVBZGRvbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xyXG5cclxuLyogQXR0cmlidXRlIEFkZG9uc1xyXG4gICBDb2xsZWN0aW9uIG5hbWUgcGlubmVkIGxvd2VyY2FzZSAtIE1vbmdvb3NlIHdvdWxkIHBsdXJhbGlzZSBpdCBvdGhlcndpc2VcclxuICAgYW5kIE1vbmdvREIgY29sbGVjdGlvbiBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmUuICovXHJcblxyXG5leHBvcnQgY29uc3QgTEFCRUxfRklFTEQgPSAnbmFtZSc7XHJcblxyXG5jb25zdCBBdHRyaWJ1dGVBZGRvblNjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoXHJcbiAge1xyXG4gICAgYnVzaW5lc3NJZDogeyB0eXBlOiBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQsIHJlZjogJ2J1c2luZXNzJywgZGVmYXVsdDogbnVsbCwgaW5kZXg6IHRydWUgfSxcclxuICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnJyB9LFxyXG4gICAgc3RhdHVzOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogXCJBY3RpdmVcIiB9LFxyXG4gIH0sXHJcbiAgeyB0aW1lc3RhbXBzOiB0cnVlIH1cclxuKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IG1vbmdvb3NlLm1vZGVscy5hdHRyaWJ1dGVBZGRvbiB8fFxyXG4gIG1vbmdvb3NlLm1vZGVsKCdhdHRyaWJ1dGVBZGRvbicsIEF0dHJpYnV0ZUFkZG9uU2NoZW1hLCAnYXR0cmlidXRlYWRkb24nKTtcclxuIl0sIm5hbWVzIjpbIm1vbmdvb3NlIiwiTEFCRUxfRklFTEQiLCJBdHRyaWJ1dGVBZGRvblNjaGVtYSIsIlNjaGVtYSIsImJ1c2luZXNzSWQiLCJ0eXBlIiwiVHlwZXMiLCJPYmplY3RJZCIsInJlZiIsImRlZmF1bHQiLCJpbmRleCIsIm5hbWUiLCJTdHJpbmciLCJzdGF0dXMiLCJ0aW1lc3RhbXBzIiwibW9kZWxzIiwiYXR0cmlidXRlQWRkb24iLCJtb2RlbCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./models/AttributeAddon.js\n");

/***/ })

};
;