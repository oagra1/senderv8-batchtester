var render = function render(){var _vm=this,_c=_vm._self._c;return _c('el-dialog',{attrs:{"visible":_vm.isShowPayPermissionPopup,"width":"459px","top":"120px","custom-class":"payPermissionPopup","modal-append-to-body":false,"show-close":false,"close-on-click-modal":true,"center":"","title":"👑 Permission Limit"},on:{"update:visible":function($event){_vm.isShowPayPermissionPopup=$event},"close":_vm.closePayPermissionPopup}},[_c('div',{staticClass:"dialog-header",attrs:{"slot":"title"},slot:"title"},[_c('span',[_vm._v("👑 Permission Limit")])]),_c('div',[_c('div',{staticClass:"featureContent"},[_c('p',[_vm._v(_vm._s(_vm.dialogText1))]),_c('p',[_vm._v(_vm._s(_vm.dialogText2))]),_c('p',[_vm._v(_vm._s(_vm.dialogText3))])])]),_c('div',{staticClass:"dialog-footer",attrs:{"slot":"footer"},slot:"footer"},[_c('el-button',{attrs:{"type":"success"},on:{"click":_vm.openPricing}},[_vm._v("View All Feature List ")])],1)])
}
var staticRenderFns = []

export { render, staticRenderFns }
