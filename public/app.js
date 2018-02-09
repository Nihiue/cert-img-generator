function dataURItoBlob(dataURI) {
  // convert base64/URLEncoded data component to raw binary data held in a string
  var byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataURI.split(',')[1]);
  } else {
    byteString = unescape(dataURI.split(',')[1]);
  }
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {
    type: mimeString
  });
}

const LS_PREFIX = "cert_img_gen_";

var app = new Vue({
  el: '#app',
  data: function () {
    return {
      toastText: '',
      showToast: false,
      imageWidth: 0,
      imageHeight: 0,
      importInput: '',
      sourceList: [],
      cfgList: [],
      batchLog: [],
      cordPreview: '',
      isBatchWorking: false
    };
  },
  mounted() {
    this.loadCfg();
    this.previewEl = document.querySelector('#img-preview');
    this.imageEl = document.querySelector('#main-canvas');
    const appEl = document.querySelector('#app');
    appEl.classList.remove('not-ready');
  },
  methods: {
    imageClick(e) {
      console.log(e);
      const rect = this.imageEl.getClientRects()[0];
      const x = Math.round(e.offsetX / rect.width * this.imageWidth);
      const y = Math.round(e.offsetY / rect.height * this.imageHeight)
      this.cordPreview = `(${x},${y})`;
      if (e.shiftKey) {
        this.addCfgItem(x, y);
      }
    },
    saveCfg() {
      localStorage.setItem(LS_PREFIX + 'cfg', JSON.stringify(this.cfgList));
    },
    loadCfg() {
      const cfg = localStorage.getItem(LS_PREFIX + 'cfg');
      if (cfg) {
        this.cfgList = JSON.parse(cfg);
      }
    },
    updateBgImage(img) {
      this.bgImage = img;
      this.imageHeight = img.naturalHeight;
      this.imageWidth = img.naturalWidth;
      this.updateImageSize();
      this.drawPreview();
    },
    imageChanged(e) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.updateBgImage(img);
        }
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    batch() {
      if (this.isBatchWorking) {
        return;
      }
      if (this.sourceList.length <= 0) {
        return alert('请先导入数据');
      }
      if (this.cfgList.length <= 0) {
        return alert('请先配置文本')
      }
      if (!this.bgImage) {
        return alert('请先选择背景图');
      }
      let fileNameIndex = parseInt(window.prompt('输入作为文件名的列编号'), 10);
      if (isNaN(fileNameIndex) || fileNameIndex < 1) {
        return;
      }
      fileNameIndex = fileNameIndex - 1;
      this.isBatchWorking = true;
      const self = this;
      const batchId = Date.now().toString();
      self.batchLog = ['Batch Start'];
      const timer = window.setInterval(function () {
        if (self.sourceList.length <= 0) {
          window.clearInterval(timer);
          self.isBatchWorking = false;
          alert('Batch Done');
          return;
        }
        const item = self.sourceList.pop();
        self.draw(item);
        self.saveCurrentImage(item[fileNameIndex], batchId);
      }, 500);
    },
    logBatchInfo(str) {
      this.batchLog.push(str);
    },
    async saveCurrentImage(name, folder) {
      const self = this;
      const blob = dataURItoBlob(this.imageEl.toDataURL('image/jpeg', 0.85));
      formData = new FormData();
      formData.append('uploadFile', blob);
      formData.append('fileName', name + '.jpg');
      formData.append('folderName', folder || 'test');
      try {
        const resp = await fetch('/api/savefile', {
          method: 'POST',
          body: formData
        });
        if (resp.status !== 200) {
          throw new Error(resp.statusText);
        }
        this.logBatchInfo(`Success: ${name}, Remain: ${self.sourceList.length}`);
      } catch (e) {
        this.logBatchInfo(`Fail: ${name}, Remain: ${self.sourceList.length}`);
        console.log(e);
      }
    },
    drawPreview() {
      this.saveCfg();
      this.draw(this.sourceList[0] || ['DATA1', 'DATA2', 'DATA3', 'DATA4', 'DATA5']);
    },
    draw(dataItem) {
      if (!this.bgImage) {
        alert('请先选择背景图');
        return false;
      }
      if (!dataItem) {
        alert('未提供数据');
        return;
      }
      const ctx = this.imageEl.getContext('2d');
      ctx.clearRect(0, 0, this.imageWidth, this.imageHeight);
      ctx.drawImage(this.bgImage, 0, 0);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /*
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.shadowColor = "black";
      */
      this.cfgList.forEach(function (item, index) {
        const fontSize = item.fontSize || 18;
        const lineHeight = Math.round(fontSize * 1.2);
        ctx.font = `${fontSize}px/${lineHeight}px ${item.font || '微软雅黑'}`;
        ctx.fillStyle = item.color || '#000000';
        ctx.fillText((dataItem[index] || 'DEMO TEXT').toString(), item.x, item.y);
      });
      return true;
    },
    addCfgItem(x, y) {
      this.cfgList.push({
        x: (x || 300),
        y: (y || 300),
        font: '微软雅黑',
        fontSize: 36,
        color: '#fff'
      });
      this.drawPreview();
    },
    removeCfgItem(index) {
      this.cfgList.splice(index, 1);
      this.drawPreview();
    },
    updateImageSize() {
      this.imageEl.width = this.imageWidth;
      this.imageEl.height = this.imageHeight;
      //imageEl.style.width = imageSize + 'px';
      //imageEl.style.height = imageSize + 'px';
    },
    parseImport() {
      this.sourceList = this.importInput.split('\n').filter(function (line) {
        return line.trim() != '';
      }).map(function (line) {
        return line.split('	').map(function (str) {
          return str.trim();
        });
      });
      this.importInput = '';
    },
    toast(val) {
      this.toastText = val;
      this.showToast = true;
      window.setTimeout(() => {
        this.showToast = false;
      }, 4000);
    }
  }
});