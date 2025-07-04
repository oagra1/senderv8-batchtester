
import Recorder from 'js-audio-recorder';
let lamejs = require("lamejs")

let collect = {}
let recorder = null
let playTimer = null
let oCanvas = null
let ctx = null
let drawRecordId = null
let pCanvas = null
let pCtx = null

export function componentDidMount() {
  oCanvas = document.getElementById('canvas');
  ctx = oCanvas.getContext("2d");
  pCanvas = document.getElementById('playChart');
  pCtx = pCanvas?.getContext("2d");
}
function clearPlay() {
  if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
  }
  if (drawRecordId) {
      cancelAnimationFrame(drawRecordId);
      drawRecordId = null;
  }
}

export function startRecord(resolve) {
  clearPlay()
  const config = {
    sampleBit: 16,
    sampleRate: 16000,
    numChannel: 1,
    compiling: true
  }

  if (!recorder) {
      Recorder.ConnectEnableWorklet=true
      recorder = new Recorder(config)
      recorder.onprogress = (params) => {

           collect = {
              duration: params.duration.toFixed(3),
              fileSize: params.fileSize,
              vol: params.vol.toFixed(2)
          }

          if(resolve) {
            resolve(collect.duration)
          }
          // 此处控制数据的收集频率
          if (config.compiling) {
              console.log('音频总数据：', params.data);
          }
          if(collect.duration > 30) {
            endRecord()
          }
      }

      recorder.onplay = () => {
          console.log('%c回调监听，开始播放音频', 'color: #2196f3')
      }
      recorder.onpauseplay = () => {
          console.log('%c回调监听，暂停播放音频', 'color: #2196f3')
      }
      recorder.onresumeplay = () => {
          console.log('%c回调监听，恢复播放音频', 'color: #2196f3')
      }
      recorder.onstopplay = () => {
          console.log('%c回调监听，停止播放音频', 'color: #2196f3')
      }
      recorder.onplayend = () => {
          console.log('%c回调监听，音频已经完成播放', 'color: #2196f3')
          // 播放结束后，停止绘制canavs
          // this.stopDrawPlay();
      }

      // 定时获取录音的数据并播放
      config.compiling && (playTimer = setInterval(() => {
          if (!recorder) {
              return;
          }
          let newData = recorder.getNextData ? recorder.getNextData() : [];
          if (!newData.length) {
              return;
          }
          let byteLength = newData[0].byteLength
          let buffer = new ArrayBuffer(newData.length * byteLength)
          let dataView = new DataView(buffer)

              // 数据合并
          for (let i = 0, iLen = newData.length; i < iLen; ++i) {
              for (let j = 0, jLen = newData[i].byteLength; j < jLen; ++j) {
                  dataView.setInt8(i * byteLength + j, newData[i].getInt8(j))
              }
          }

          // 将录音数据转成WAV格式，并播放
          let a = encodeWAV(dataView, config.sampleRate, config.sampleRate, config.numChannels, config.sampleBits)
          let blob = new Blob([ a ], { type: 'audio/wav' });

          blob.arrayBuffer().then((arraybuffer) => {
              Player.play(arraybuffer);
          });
      }, 3000))
  } else {
      recorder.stop();
  }

  recorder.start().then(() => {
      console.log('开始录音');
  }, (error) => {
      console.log(`异常了,${error.name}:${error.message}`);
  });
  // 开始绘制canvas
//   drawRecord();
}

function drawRecord () {
  drawRecordId = requestAnimationFrame(drawRecord);
  let dataArray = recorder.getRecordAnalyseData(),
      bufferLength = dataArray.length;

  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.fillRect(0, 0, oCanvas.width, oCanvas.height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgb(0, 0, 0)';
  ctx.beginPath();
  var sliceWidth = oCanvas.width * 1.0 / bufferLength, // 一个点占多少位置，共有bufferLength个点要绘制
      x = 0;          // 绘制点的x轴位置

  for (var i = 0; i < bufferLength; i++) {
      var v = dataArray[i] / 128.0;
      var y = v * oCanvas.height / 2;

      if (i === 0) {
          // 第一个点
          ctx.moveTo(x, y);
      } else {
          // 剩余的点
          ctx.lineTo(x, y);
      }
      // 依次平移，绘制所有点
      x += sliceWidth;
  }
  ctx.lineTo(oCanvas.width, oCanvas.height / 2);
  ctx.stroke();
}

export function endRecord()  {
  recorder && recorder.stop();
  console.log('结束录音');
  drawRecordId && cancelAnimationFrame(drawRecordId);
  drawRecordId = null;
}
function convertToMp3(wavDataView) {
  // 获取wav头信息
  const wav = lamejs.WavHeader.readHeader(wavDataView); // 此处其实可以不用去读wav头信息，毕竟有对应的config配置
  const { channels, sampleRate } = wav;
  console.log('wav', wav)
  const mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  // 获取左右通道数据
  const result = recorder.getChannelData()
  const buffer = [];

  const leftData = result.left && new Int16Array(result.left.buffer, 0, result.left.byteLength / 2);
  const rightData = result.right && new Int16Array(result.right.buffer, 0, result.right.byteLength / 2);
  const remaining = leftData.length + (rightData ? rightData.length : 0);

  const maxSamples = 1152;
  for (let i = 0; i < remaining; i += maxSamples) {
      const left = leftData.subarray(i, i + maxSamples);
      let right = null;
      let mp3buf = null;

      if (channels === 2) {
          right = rightData.subarray(i, i + maxSamples);
          mp3buf = mp3enc.encodeBuffer(left, right);
      } else {
          mp3buf = mp3enc.encodeBuffer(left);
      }

      if (mp3buf.length > 0) {
          buffer.push(mp3buf);
      }
  }

  const enc = mp3enc.flush();

  if (enc.length > 0) {
      buffer.push(enc);
  }

  return new Blob(buffer, { type: 'audio/mp3' });
}
export function downloadMP3() {
  if (recorder) {
      const mp3Blob = convertToMp3(recorder.getWAV());

      let reader = new FileReader()
      return new Promise((resolve, reject) => {
        reader.onload = function(e) {
            let audio = reader.result
           
            chrome.storage.local.set({audio: {file: audio, time: collect.duration}})
            chrome.runtime.sendMessage({reloadPopup: true})
            resolve()
          }
          reader.readAsDataURL(mp3Blob)
      })
      
      
  }
}

export function destroy() {
    clearPlay()
    if(recorder) {
        recorder.destroy().then(function() {
            recorder = null;
        });
    }
    collect = {}
}

export function replay(state) {
    if(recorder) {
        state ? recorder.pausePlay() : recorder.play()
    }
}

