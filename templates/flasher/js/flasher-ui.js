class d{constructor(){this.statusBox=document.getElementById("status-box"),this.progressContainer=document.getElementById("progress-container"),this.progressFill=document.getElementById("progress-fill"),this.progressPercent=document.getElementById("progress-percent"),this.progressTime=document.getElementById("progress-time"),this.serialMonitor=document.getElementById("serial-monitor"),this.chipInfo=document.getElementById("chip-info"),this.flashStartTime=null,this.lastDisplayedTime=null,this.lastUpdateTime=null,this.lastDisplayedPercent=0,this.targetPercent=0,this.animationFrame=null}updateStatus(t,s,i){this.statusBox.className="status-box "+t,this.statusBox.innerHTML=`
            <div class="status-text">${s}</div>
            <div class="status-subtext">${i}</div>
        `}updateProgress(t,s,i){if(this.targetPercent=t,this.animationFrame||this.animateProgress(),this.flashStartTime&&t>0&&t<100){const a=Date.now(),n=(a-this.flashStartTime)/1e3,l=n/t*100,e=Math.max(0,Math.round(l-n));if(this.lastUpdateTime===null)this.lastDisplayedTime=e,this.lastUpdateTime=a,this.progressTime.textContent=`~${this.lastDisplayedTime}s remaining`;else{const r=a-this.lastUpdateTime;if(r>=100){if(e<this.lastDisplayedTime-5){const o=this.lastDisplayedTime-e,h=Math.min(Math.ceil(o/5),3);this.lastDisplayedTime=Math.max(e,this.lastDisplayedTime-h)}else{const o=r/1e3;this.lastDisplayedTime=Math.max(e,this.lastDisplayedTime-o)}this.lastUpdateTime=a,this.progressTime.textContent=`~${Math.round(this.lastDisplayedTime)}s remaining`}}}else t>=100&&(this.lastDisplayedTime&&this.lastDisplayedTime>0?this.countdownToZero():(this.progressTime.textContent="Complete",this.lastDisplayedTime=null))}countdownToZero(){this.lastDisplayedTime>0?(this.lastDisplayedTime=Math.max(0,this.lastDisplayedTime-1),this.progressTime.textContent=`~${this.lastDisplayedTime}s remaining`,setTimeout(()=>this.countdownToZero(),50)):this.progressTime.textContent="Complete"}animateProgress(){const t=this.targetPercent-this.lastDisplayedPercent;Math.abs(t)>.1?(this.lastDisplayedPercent+=t*.1,this.progressFill.style.width=this.lastDisplayedPercent+"%",this.progressPercent.textContent=Math.round(this.lastDisplayedPercent)+"%",this.animationFrame=requestAnimationFrame(()=>this.animateProgress())):(this.lastDisplayedPercent=this.targetPercent,this.progressFill.style.width=this.targetPercent+"%",this.progressPercent.textContent=Math.round(this.targetPercent)+"%",this.animationFrame=null)}showProgress(){this.flashStartTime=Date.now(),this.lastDisplayedTime=null,this.lastUpdateTime=null,this.lastDisplayedPercent=0,this.targetPercent=0,this.progressContainer.classList.add("active")}hideProgress(){this.progressContainer.classList.remove("active"),this.flashStartTime=null,this.lastDisplayedTime=null,this.lastUpdateTime=null,this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null),this.lastDisplayedPercent=0,this.targetPercent=0}log(t,s="info"){const i=document.createElement("div");i.className="serial-line "+s,i.textContent=`[${new Date().toLocaleTimeString()}] ${t}`,this.serialMonitor.appendChild(i),this.serialMonitor.scrollTop=this.serialMonitor.scrollHeight}clearLog(){this.serialMonitor.innerHTML='<div class="serial-line info">Monitor cleared</div>'}updateChipInfo(t,s){document.getElementById("chip-type").textContent=t,document.getElementById("chip-mac").textContent=s,this.chipInfo.classList.add("active")}showProjectDetails(t){const s=t.hardware.map(e=>`<li>${e}</li>`).join(""),i=t.software.map(e=>`<li>${e}</li>`).join(""),a=t.documentation?`<a href="${t.documentation.url}" target="_blank" class="doc-link">
                 <span>${t.documentation.label}</span>
                 <span class="external-icon">\u2197</span>
               </a>`:"",n=t.configSections.map(e=>e.title).join(", "),l=n?`Configure ${n} in the center panel`:"Review configuration in the center panel";document.getElementById("project-details").innerHTML=`
            <p style="margin-bottom: 24px;">${t.description}</p>

            ${a}

            <div class="section section-bg" style="margin-top: 32px;">
                <h3>Hardware</h3>
                <ul class="requirement-list">
                    ${s}
                </ul>
            </div>

            <div class="section section-bg">
                <h3>Steps</h3>
                <ul class="instruction-list">
                    <li data-step="1">${l}</li>
                    <li data-step="2">Connect your ESP32 device via USB</li>
                    <li data-step="3">Click "Connect Device" and select the serial port</li>
                    <li data-step="4">Click "Flash Firmware" to begin</li>
                    <li data-step="5">Wait for flashing to complete (do not disconnect)</li>
                </ul>
            </div>
        `}}export{d as FlasherUI};
//# sourceMappingURL=flasher-ui.js.map
