"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_Driver_js";
exports.ids = ["_rsc_models_Driver_js"];
exports.modules = {

/***/ "(rsc)/./models/Driver.js":
/*!**************************!*\
  !*** ./models/Driver.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* Driver Master - name / code / status. */ const LABEL_FIELD = 'name';\nconst DriverSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    locationId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'companyLocation',\n        default: null,\n        index: true\n    },\n    name: {\n        type: String,\n        default: ''\n    },\n    code: {\n        type: String,\n        default: ''\n    },\n    status: {\n        type: Boolean,\n        default: true\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).driver || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('driver', DriverSchema, 'driver'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvRHJpdmVyLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBZ0M7QUFFaEMseUNBQXlDLEdBRWxDLE1BQU1DLGNBQWMsT0FBTztBQUVsQyxNQUFNQyxlQUFlLElBQUlGLHdEQUFlLENBQ3RDO0lBQ0VJLFlBQVk7UUFBRUMsTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBWUMsU0FBUztRQUFNQyxPQUFPO0lBQUs7SUFDaEdDLFlBQVk7UUFBRU4sTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBbUJDLFNBQVM7UUFBTUMsT0FBTztJQUFLO0lBQ3ZHRSxNQUFNO1FBQUVQLE1BQU1RO1FBQVFKLFNBQVM7SUFBRztJQUNsQ0ssTUFBTTtRQUFFVCxNQUFNUTtRQUFRSixTQUFTO0lBQUc7SUFDbENNLFFBQVE7UUFBRVYsTUFBTVc7UUFBU1AsU0FBUztJQUFLO0FBQ3pDLEdBQ0E7SUFBRVEsWUFBWTtBQUFLO0FBR3JCLGlFQUFlakIsd0RBQWUsQ0FBQ21CLE1BQU0sSUFDbkNuQixxREFBYyxDQUFDLFVBQVVFLGNBQWMsU0FBUyxFQUFDIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXEFkbWluXFxEZXNrdG9wXFxkZXBsb3kgd2Vic2l0ZSBwb3J0XFx3b3ZlbmVzc2VuY2VlcnBcXG1vZGVsc1xcRHJpdmVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XHJcblxyXG4vKiBEcml2ZXIgTWFzdGVyIC0gbmFtZSAvIGNvZGUgLyBzdGF0dXMuICovXHJcblxyXG5leHBvcnQgY29uc3QgTEFCRUxfRklFTEQgPSAnbmFtZSc7XHJcblxyXG5jb25zdCBEcml2ZXJTY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKFxyXG4gIHtcclxuICAgIGJ1c2luZXNzSWQ6IHsgdHlwZTogbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk9iamVjdElkLCByZWY6ICdidXNpbmVzcycsIGRlZmF1bHQ6IG51bGwsIGluZGV4OiB0cnVlIH0sXHJcbiAgICBsb2NhdGlvbklkOiB7IHR5cGU6IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZCwgcmVmOiAnY29tcGFueUxvY2F0aW9uJywgZGVmYXVsdDogbnVsbCwgaW5kZXg6IHRydWUgfSxcclxuICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnJyB9LFxyXG4gICAgY29kZTogeyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6ICcnIH0sXHJcbiAgICBzdGF0dXM6IHsgdHlwZTogQm9vbGVhbiwgZGVmYXVsdDogdHJ1ZSB9LFxyXG4gIH0sXHJcbiAgeyB0aW1lc3RhbXBzOiB0cnVlIH1cclxuKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IG1vbmdvb3NlLm1vZGVscy5kcml2ZXIgfHxcclxuICBtb25nb29zZS5tb2RlbCgnZHJpdmVyJywgRHJpdmVyU2NoZW1hLCAnZHJpdmVyJyk7XHJcbiJdLCJuYW1lcyI6WyJtb25nb29zZSIsIkxBQkVMX0ZJRUxEIiwiRHJpdmVyU2NoZW1hIiwiU2NoZW1hIiwiYnVzaW5lc3NJZCIsInR5cGUiLCJUeXBlcyIsIk9iamVjdElkIiwicmVmIiwiZGVmYXVsdCIsImluZGV4IiwibG9jYXRpb25JZCIsIm5hbWUiLCJTdHJpbmciLCJjb2RlIiwic3RhdHVzIiwiQm9vbGVhbiIsInRpbWVzdGFtcHMiLCJtb2RlbHMiLCJkcml2ZXIiLCJtb2RlbCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./models/Driver.js\n");

/***/ })

};
;