class m{constructor(){this.statusBox=document.getElementById("status-box"),this.progressContainer=document.getElementById("progress-container"),this.progressFill=document.getElementById("progress-fill"),this.progressPercent=document.getElementById("progress-percent"),this.progressTime=document.getElementById("progress-time"),this.serialMonitor=document.getElementById("serial-monitor"),this.chipInfo=document.getElementById("chip-info"),this.flashStartTime=null,this.lastDisplayedTime=null,this.lastUpdateTime=null,this.lastDisplayedPercent=0,this.targetPercent=0,this.animationFrame=null}updateStatus(t,e,s){this.statusBox.className="status-box "+t,this.statusBox.innerHTML=`
            <div class="status-text">${e}</div>
            <div class="status-subtext">${s}</div>
        `}updateProgress(t,e,s){if(this.targetPercent=t,this.animationFrame||this.animateProgress(),this.flashStartTime&&t>0&&t<100){const i=Date.now(),a=(i-this.flashStartTime)/1e3,r=a/t*100,n=Math.max(0,Math.round(r-a));if(this.lastUpdateTime===null)this.lastDisplayedTime=n,this.lastUpdateTime=i,this.progressTime.textContent=`~${this.lastDisplayedTime}s remaining`;else{const o=i-this.lastUpdateTime;if(o>=100){if(n<this.lastDisplayedTime-5){const l=this.lastDisplayedTime-n,h=Math.min(Math.ceil(l/5),3);this.lastDisplayedTime=Math.max(n,this.lastDisplayedTime-h)}else{const l=o/1e3;this.lastDisplayedTime=Math.max(n,this.lastDisplayedTime-l)}this.lastUpdateTime=i,this.progressTime.textContent=`~${Math.round(this.lastDisplayedTime)}s remaining`}}}else t>=100&&(this.lastDisplayedTime&&this.lastDisplayedTime>0?this.countdownToZero():(this.progressTime.textContent="Complete",this.lastDisplayedTime=null))}countdownToZero(){this.lastDisplayedTime>0?(this.lastDisplayedTime=Math.max(0,this.lastDisplayedTime-1),this.progressTime.textContent=`~${this.lastDisplayedTime}s remaining`,setTimeout(()=>this.countdownToZero(),50)):this.progressTime.textContent="Complete"}animateProgress(){const t=this.targetPercent-this.lastDisplayedPercent;Math.abs(t)>.1?(this.lastDisplayedPercent+=t*.1,this.progressFill.style.width=this.lastDisplayedPercent+"%",this.progressPercent.textContent=Math.round(this.lastDisplayedPercent)+"%",this.animationFrame=requestAnimationFrame(()=>this.animateProgress())):(this.lastDisplayedPercent=this.targetPercent,this.progressFill.style.width=this.targetPercent+"%",this.progressPercent.textContent=Math.round(this.targetPercent)+"%",this.animationFrame=null)}showProgress(){this.flashStartTime=Date.now(),this.lastDisplayedTime=null,this.lastUpdateTime=null,this.lastDisplayedPercent=0,this.targetPercent=0,this.progressContainer.classList.add("active")}hideProgress(){this.progressContainer.classList.remove("active"),this.flashStartTime=null,this.lastDisplayedTime=null,this.lastUpdateTime=null,this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null),this.lastDisplayedPercent=0,this.targetPercent=0}log(t,e="info"){const s=document.createElement("div");s.className="serial-line "+e,s.textContent=`[${new Date().toLocaleTimeString()}] ${t}`,this.serialMonitor.appendChild(s),this.serialMonitor.scrollTop=this.serialMonitor.scrollHeight}clearLog(){this.serialMonitor.innerHTML='<div class="serial-line info">Monitor cleared</div>'}updateChipInfo(t,e){document.getElementById("chip-type").textContent=t,document.getElementById("chip-mac").textContent=e,this.chipInfo.classList.add("active")}showProjectDetails(t){const e=t.hardware.map(a=>`<li>${a}</li>`).join(""),s=t.software.map(a=>`<li>${a}</li>`).join(""),i=t.documentation?`<a href="${t.documentation.url}" target="_blank" class="doc-link">
                 <span>${t.documentation.label}</span>
                 <span class="external-icon">\u2197</span>
               </a>`:"";document.getElementById("project-details").innerHTML=`
            <p style="margin-bottom: 24px;">${t.description}</p>

            ${i}

            <div class="section section-bg" style="margin-top: 32px;">
                <h3>Hardware</h3>
                <ul class="requirement-list">
                    ${e}
                </ul>
            </div>

            <div class="section section-bg">
                <h3>Steps</h3>
                <ul class="instruction-list">
                    <li data-step="1">Configure WiFi, MQTT, and TCP settings in the center panel</li>
                    <li data-step="2">Connect your ESP32 device via USB</li>
                    <li data-step="3">Click "Connect Device" and select the serial port</li>
                    <li data-step="4">Click "Flash Firmware" to begin</li>
                    <li data-step="5">Wait for flashing to complete (do not disconnect)</li>
                </ul>
            </div>
        `}}export{m as FlasherUI};
//# sourceMappingURL=flasher-ui.js.map
