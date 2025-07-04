import  Vue  from 'vue'
import ElementUI from 'element-ui'
import {
  startRecord,
  endRecord,
  replay,
  downloadMP3,
  componentDidMount,
  destroy
} from './recordApi.js'
import 'element-ui/lib/theme-chalk/index.css'
import './mask.css'
import ButtonPage from './ButtonPage.vue'
let vm = null
Vue.use(ElementUI)

function craateMask() {
  let mask = document.createElement('div')
  mask.id = 'audio_mak_usful'
  document.body.appendChild(mask)
  return mask
}

function createVm() {
  return new Vue({
    data: {
      isshow: false,
      state: null,
      durition: 0
    },
    render: function(h) {
      let that = this
     return h('div', 
      {...{style: {display: this.isshow ? '' : 'none'}, attrs:{ id:  'audio_mak_usfuls'}}},
      [
        h(ButtonPage, {on: {
          replay: function(state) { that.replay(state) },
          start: function() { that.startRecord() },
          end: function() { that.end() },
          destroy: function() { that.destroy() },
          close: function() { that.close() }
        }, props: { durition: that.durition }, ref: 'btnRef'}),  
       
        h('canvas', {attrs: {id: 'canvas'}}),
        h('canvas', {attrs: {id: 'playChart'}}),
       
      ])
    },
    methods: {
      replay(state) {
        replay(state)
      },
      destroy() {
        destroy()
        this.state = null
        this.durition = 0
        chrome.storage.local.set({audio: {}})
        chrome.runtime.sendMessage({updataAudio: '1'})
      },
      close() {
        this.end().then(() => {
          destroy()
        })
        this.isshow = false
        
      },
      startRecord() {
        let that = this
        if(!this.state) {
          this.state = 1
          startRecord((durition, file) => {
            that.durition = durition
            this.file = file
          })  
          
        }
      },
      end() {
        if(this.state) {
          this.state = null

          endRecord()
          return downloadMP3()
        }
        return Promise.resolve()
      }
    }
  })
}

function inject() {
  vm = createVm()
  vm.$mount()
  let mask = document.getElementById('audio_mak_usful') //dom容器
  if(!mask) {
   mask = craateMask()
  }
  let el = vm.$el
  mask.appendChild(el)
  //挂载到节点
  componentDidMount()
}

function start(val) { //此处是 唤起/隐藏 vm构建的蒙层
  if(vm) {
    vm.state = null
    vm.durition = 0
    vm.$refs.btnRef.palying = false
    if(val == 'start') {
      vm.isshow = true //先弹窗
    } else {
      destroy()
      vm.isshow = false
    }
  } else {
    alert('sth wrong')
  }
}




// inject()
export  {
  inject as injectMask,
  start as startVmRecord
}
