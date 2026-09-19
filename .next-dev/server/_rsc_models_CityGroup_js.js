"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_CityGroup_js";
exports.ids = ["_rsc_models_CityGroup_js"];
exports.modules = {

/***/ "(rsc)/./models/CityGroup.js":
/*!*****************************!*\
  !*** ./models/CityGroup.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* City Groups\r\n   Collection name is pinned lowercase: Mongoose would pluralise it\r\n   otherwise, and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'groupName';\nconst CityGroupSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    groupName: {\n        type: String,\n        default: ''\n    },\n    cities: {\n        type: [\n            String\n        ],\n        default: []\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).cityGroup || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('cityGroup', CityGroupSchema, 'citygroup'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvQ2l0eUdyb3VwLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBZ0M7QUFFaEM7OytEQUUrRCxHQUV4RCxNQUFNQyxjQUFjLFlBQVk7QUFFdkMsTUFBTUMsa0JBQWtCLElBQUlGLHdEQUFlLENBQ3pDO0lBQ0VJLFlBQVk7UUFBRUMsTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBWUMsU0FBUztRQUFNQyxPQUFPO0lBQUs7SUFDaEdDLFdBQVc7UUFBRU4sTUFBTU87UUFBUUgsU0FBUztJQUFHO0lBQ3ZDSSxRQUFRO1FBQUVSLE1BQU07WUFBQ087U0FBTztRQUFFSCxTQUFTLEVBQUU7SUFBQztBQUN4QyxHQUNBO0lBQUVLLFlBQVk7QUFBSztBQUdyQixpRUFBZWQsd0RBQWUsQ0FBQ2dCLFNBQVMsSUFDdENoQixxREFBYyxDQUFDLGFBQWFFLGlCQUFpQixZQUFZLEVBQUMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcQWRtaW5cXERlc2t0b3BcXGRlcGxveSB3ZWJzaXRlIHBvcnRcXHdvdmVuZXNzZW5jZWVycFxcbW9kZWxzXFxDaXR5R3JvdXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuXHJcbi8qIENpdHkgR3JvdXBzXHJcbiAgIENvbGxlY3Rpb24gbmFtZSBpcyBwaW5uZWQgbG93ZXJjYXNlOiBNb25nb29zZSB3b3VsZCBwbHVyYWxpc2UgaXRcclxuICAgb3RoZXJ3aXNlLCBhbmQgTW9uZ29EQiBjb2xsZWN0aW9uIG5hbWVzIGFyZSBjYXNlLXNlbnNpdGl2ZS4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBMQUJFTF9GSUVMRCA9ICdncm91cE5hbWUnO1xyXG5cclxuY29uc3QgQ2l0eUdyb3VwU2NoZW1hID0gbmV3IG1vbmdvb3NlLlNjaGVtYShcclxuICB7XHJcbiAgICBidXNpbmVzc0lkOiB7IHR5cGU6IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZCwgcmVmOiAnYnVzaW5lc3MnLCBkZWZhdWx0OiBudWxsLCBpbmRleDogdHJ1ZSB9LFxyXG4gICAgZ3JvdXBOYW1lOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJycgfSxcclxuICAgIGNpdGllczogeyB0eXBlOiBbU3RyaW5nXSwgZGVmYXVsdDogW10gfSxcclxuICB9LFxyXG4gIHsgdGltZXN0YW1wczogdHJ1ZSB9XHJcbik7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBtb25nb29zZS5tb2RlbHMuY2l0eUdyb3VwIHx8XHJcbiAgbW9uZ29vc2UubW9kZWwoJ2NpdHlHcm91cCcsIENpdHlHcm91cFNjaGVtYSwgJ2NpdHlncm91cCcpO1xyXG4iXSwibmFtZXMiOlsibW9uZ29vc2UiLCJMQUJFTF9GSUVMRCIsIkNpdHlHcm91cFNjaGVtYSIsIlNjaGVtYSIsImJ1c2luZXNzSWQiLCJ0eXBlIiwiVHlwZXMiLCJPYmplY3RJZCIsInJlZiIsImRlZmF1bHQiLCJpbmRleCIsImdyb3VwTmFtZSIsIlN0cmluZyIsImNpdGllcyIsInRpbWVzdGFtcHMiLCJtb2RlbHMiLCJjaXR5R3JvdXAiLCJtb2RlbCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./models/CityGroup.js\n");

/***/ })

};
;