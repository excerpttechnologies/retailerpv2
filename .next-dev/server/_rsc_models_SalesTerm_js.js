"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_models_SalesTerm_js";
exports.ids = ["_rsc_models_SalesTerm_js"];
exports.modules = {

/***/ "(rsc)/./models/SalesTerm.js":
/*!*****************************!*\
  !*** ./models/SalesTerm.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LABEL_FIELD: () => (/* binding */ LABEL_FIELD),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongoose */ \"mongoose\");\n/* harmony import */ var mongoose__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongoose__WEBPACK_IMPORTED_MODULE_0__);\n\n/* All Sales Term Master\r\n   Collection name is pinned lowercase: Mongoose would pluralise it\r\n   otherwise, and MongoDB collection names are case-sensitive. */ const LABEL_FIELD = 'name';\nconst SalesTermSchema = new (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema)({\n    businessId: {\n        type: (mongoose__WEBPACK_IMPORTED_MODULE_0___default().Schema).Types.ObjectId,\n        ref: 'business',\n        default: null,\n        index: true\n    },\n    name: {\n        type: String,\n        default: ''\n    }\n}, {\n    timestamps: true\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((mongoose__WEBPACK_IMPORTED_MODULE_0___default().models).salesTerm || mongoose__WEBPACK_IMPORTED_MODULE_0___default().model('salesTerm', SalesTermSchema, 'salesterm'));\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9tb2RlbHMvU2FsZXNUZXJtLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBZ0M7QUFFaEM7OytEQUUrRCxHQUV4RCxNQUFNQyxjQUFjLE9BQU87QUFFbEMsTUFBTUMsa0JBQWtCLElBQUlGLHdEQUFlLENBQ3pDO0lBQ0VJLFlBQVk7UUFBRUMsTUFBTUwsd0RBQWUsQ0FBQ00sS0FBSyxDQUFDQyxRQUFRO1FBQUVDLEtBQUs7UUFBWUMsU0FBUztRQUFNQyxPQUFPO0lBQUs7SUFDaEdDLE1BQU07UUFBRU4sTUFBTU87UUFBUUgsU0FBUztJQUFHO0FBQ3BDLEdBQ0E7SUFBRUksWUFBWTtBQUFLO0FBR3JCLGlFQUFlYix3REFBZSxDQUFDZSxTQUFTLElBQ3RDZixxREFBYyxDQUFDLGFBQWFFLGlCQUFpQixZQUFZLEVBQUMiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcQWRtaW5cXERlc2t0b3BcXGRlcGxveSB3ZWJzaXRlIHBvcnRcXHdvdmVuZXNzZW5jZWVycFxcbW9kZWxzXFxTYWxlc1Rlcm0uanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxuXHJcbi8qIEFsbCBTYWxlcyBUZXJtIE1hc3RlclxyXG4gICBDb2xsZWN0aW9uIG5hbWUgaXMgcGlubmVkIGxvd2VyY2FzZTogTW9uZ29vc2Ugd291bGQgcGx1cmFsaXNlIGl0XHJcbiAgIG90aGVyd2lzZSwgYW5kIE1vbmdvREIgY29sbGVjdGlvbiBuYW1lcyBhcmUgY2FzZS1zZW5zaXRpdmUuICovXHJcblxyXG5leHBvcnQgY29uc3QgTEFCRUxfRklFTEQgPSAnbmFtZSc7XHJcblxyXG5jb25zdCBTYWxlc1Rlcm1TY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKFxyXG4gIHtcclxuICAgIGJ1c2luZXNzSWQ6IHsgdHlwZTogbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk9iamVjdElkLCByZWY6ICdidXNpbmVzcycsIGRlZmF1bHQ6IG51bGwsIGluZGV4OiB0cnVlIH0sXHJcbiAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJycgfSxcclxuICB9LFxyXG4gIHsgdGltZXN0YW1wczogdHJ1ZSB9XHJcbik7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBtb25nb29zZS5tb2RlbHMuc2FsZXNUZXJtIHx8XHJcbiAgbW9uZ29vc2UubW9kZWwoJ3NhbGVzVGVybScsIFNhbGVzVGVybVNjaGVtYSwgJ3NhbGVzdGVybScpO1xyXG4iXSwibmFtZXMiOlsibW9uZ29vc2UiLCJMQUJFTF9GSUVMRCIsIlNhbGVzVGVybVNjaGVtYSIsIlNjaGVtYSIsImJ1c2luZXNzSWQiLCJ0eXBlIiwiVHlwZXMiLCJPYmplY3RJZCIsInJlZiIsImRlZmF1bHQiLCJpbmRleCIsIm5hbWUiLCJTdHJpbmciLCJ0aW1lc3RhbXBzIiwibW9kZWxzIiwic2FsZXNUZXJtIiwibW9kZWwiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./models/SalesTerm.js\n");

/***/ })

};
;