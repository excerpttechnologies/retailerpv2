"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_PurchaseTerm_js";
exports.ids = ["_rsc_models_PurchaseTerm_js"];
exports.modules = {

/***/ "(rsc)/./models/PurchaseTerm.js":
/*!********************************!*\
  !*** ./models/PurchaseTerm.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* All Purchase Term Masters\r\n   Collection name is pinned lowercase: Mongoose would pluralise it\r\n   otherwise, and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'name';\nconst PurchaseTermSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    name: {\n        type: String,\n        default: ''\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).purchaseTerm || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('purchaseTerm', PurchaseTermSchema, 'purchaseterm'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvUHVyY2hhc2VUZXJtLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBZ0M7QUFFaEM7OytEQUUrRCxHQUV4RCxNQUFNQyxjQUFjLE9BQU87QUFFbEMsTUFBTUMscUJBQXFCLElBQUlGLHdEQUFlLENBQzVDO0lBQ0VJLFlBQVk7UUFBRUMsTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBWUMsU0FBUztRQUFNQyxPQUFPO0lBQUs7SUFDaEdDLE1BQU07UUFBRU4sTUFBTU87UUFBUUgsU0FBUztJQUFHO0FBQ3BDLEdBQ0E7SUFBRUksWUFBWTtBQUFLO0FBR3JCLGlFQUFlYix3REFBZSxDQUFDZSxZQUFZLElBQ3pDZixxREFBYyxDQUFDLGdCQUFnQkUsb0JBQW9CLGVBQWUsRUFBQyIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxBZG1pblxcRGVza3RvcFxcZGVwbG95IHdlYnNpdGUgcG9ydFxcd292ZW5lc3NlbmNlZXJwXFxtb2RlbHNcXFB1cmNoYXNlVGVybS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xyXG5cclxuLyogQWxsIFB1cmNoYXNlIFRlcm0gTWFzdGVyc1xyXG4gICBDb2xsZWN0aW9uIG5hbWUgaXMgcGlubmVkIGxvd2VyY2FzZTogTW9uZ29vc2Ugd291bGQgcGx1cmFsaXNlIGl0XHJcbiAgIG90aGVyd2lzZSwgYW5kIE1vbmdvREIgY29sbGVjdGlvbiBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmUuICovXHJcblxyXG5leHBvcnQgY29uc3QgTEFCRUxfRklFTEQgPSAnbmFtZSc7XHJcblxyXG5jb25zdCBQdXJjaGFzZVRlcm1TY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKFxyXG4gIHtcclxuICAgIGJ1c2luZXNzSWQ6IHsgdHlwZTogbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk9iamVjdElkLCByZWY6ICdidXNpbmVzcycsIGRlZmF1bHQ6IG51bGwsIGluZGV4OiB0cnVlIH0sXHJcbiAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJycgfSxcclxuICB9LFxyXG4gIHsgdGltZXN0YW1wczogdHJ1ZSB9XHJcbik7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBtb25nb29zZS5tb2RlbHMucHVyY2hhc2VUZXJtIHx8XHJcbiAgbW9uZ29vc2UubW9kZWwoJ3B1cmNoYXNlVGVybScsIFB1cmNoYXNlVGVybVNjaGVtYSwgJ3B1cmNoYXNldGVybScpO1xyXG4iXSwibmFtZXMiOlsibW9uZ29vc2UiLCJMQUJFTF9GSUVMRCIsIlB1cmNoYXNlVGVybVNjaGVtYSIsIlNjaGVtYSIsImJ1c2luZXNzSWQiLCJ0eXBlIiwiVHlwZXMiLCJPYmplY3RJZCIsInJlZiIsImRlZmF1bHQiLCJpbmRleCIsIm5hbWUiLCJTdHJpbmciLCJ0aW1lc3RhbXBzIiwibW9kZWxzIiwicHVyY2hhc2VUZXJtIiwibW9kZWwiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./models/PurchaseTerm.js\n");

/***/ })

};
;