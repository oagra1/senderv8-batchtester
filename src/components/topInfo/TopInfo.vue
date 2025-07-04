var render = function render(){var _vm=this,_c=_vm._self._c;return _c('div',[_c('el-row',{style:({ height: '40px', marginBottom: '0' })},[_c('el-col',{attrs:{"span":6}},[_c('p',{staticClass:"waplus-title",style:({
          fontStyle: 'normal',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#37B64A',
          textAlign: 'left',
          backgroundColor: '#F9F9F9'
        })},[_vm._v(" "+_vm._s(_vm.waPlusSenderText)+" ")])]),_c('el-col',{attrs:{"span":8}},[(_vm.permissionText !== 'Pro')?_c('span',{staticClass:"activateProLink",on:{"click":_vm.clickActivateCode}},[_vm._v("Activate Code ")]):_vm._e(),(_vm.permissionText === 'Pro')?_c('span',[_vm._v(" ")]):_vm._e()]),_c('el-col',{attrs:{"span":6}},[(_vm.permissionText !== 'Pro')?_c('span',{staticClass:"activateProLink",on:{"click":_vm.openPricing}},[_vm._v("Upgrade!!! ")]):_vm._e(),(_vm.permissionText === 'Pro')?_c('span',[_vm._v(" ")]):_vm._e()]),_c('el-col',{staticClass:"topText",attrs:{"span":6}},[_c('div',[_c('div',[_c('div',{class:['permission', _vm.permissionText === 'Pro' ? 'pro' : 'trial'],domProps:{"textContent":_vm._s(_vm.permissionText)},on:{"click":_vm.openPricing}})])])]),_c('el-col',{attrs:{"span":2}},[_c('div',{staticClass:"profileInfoIcon",on:{"click":function($event){return _vm.openUserProfile()}}},[_c('svg',{staticClass:"icon",attrs:{"t":"1673427269872","viewBox":"0 0 1024 1024","version":"1.1","xmlns":"http://www.w3.org/2000/svg","p-id":"3496","width":"20","height":"20"}},[_c('path',{attrs:{"d":"M896 256H128V128h768v128z m0 192H128v128h768V448z m0 320H128v128h768V768z","p-id":"3497","fill":"#606266"}})])])])],1)],1)
}
var staticRenderFns = []

export { render, staticRenderFns }
