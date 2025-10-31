class d{constructor(){this.config=this.loadConfig()}loadConfig(){const o=localStorage.getItem("active-wing-config");return o?JSON.parse(o):{}}saveConfig(){localStorage.setItem("active-wing-config",JSON.stringify(this.config))}clearConfig(){this.config={},this.saveConfig(),this.loadConfigValues()}loadConfigValues(){document.querySelectorAll("[data-section][data-field]").forEach(t=>{const e=t.dataset.section,n=t.dataset.field;this.config[e]&&this.config[e][n]!==void 0&&(t.value=this.config[e][n])})}attachConfigListeners(){document.querySelectorAll("[data-section][data-field]").forEach(t=>{t.addEventListener("input",()=>{const e=t.dataset.section,n=t.dataset.field;this.config[e]||(this.config[e]={}),this.config[e][n]=t.value,this.saveConfig()})})}renderConfigFields(o){if(!o.configSections){document.getElementById("config-container").innerHTML='<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';return}const t=document.getElementById("config-container");t.innerHTML="",o.configSections.forEach(e=>{const n=document.createElement("div");n.className="config-group";let s=`<h3>${e.title}</h3>`;e.description&&(s+=`<p class="help-text" style="margin-bottom: 12px;">${e.description}</p>`),e.fields.forEach(i=>{const a=`${e.id}-${i.id}`;s+=`
                    <div class="form-group">
                        <label for="${a}">${i.label}${i.required?' <span style="color: #ff3b30;">*</span>':' <span style="color: #86868b; font-weight: 400;">(optional)</span>'}</label>
                        <input
                            type="${i.type||"text"}"
                            id="${a}"
                            placeholder="${i.placeholder||""}"
                            ${i.default?`value="${i.default}"`:""}
                            ${i.required?"required":""}
                            aria-required="${i.required?"true":"false"}"
                            aria-describedby="${i.help?a+"-help":""}"
                            data-section="${e.id}"
                            data-field="${i.id}">
                        ${i.help?`<span class="help-text" id="${a}-help">${i.help}</span>`:""}
                    </div>
                `}),n.innerHTML=s,t.appendChild(n)}),this.loadConfigValues(),this.attachConfigListeners()}getConfig(){return this.config}populateFromNVS(o,t){t.configSections&&(this.config={},t.configSections.forEach(e=>{e.fields.forEach(n=>{const s=n.nvsKey||`${e.id}_${n.id}`;if(o[s]!==void 0){this.config[e.id]||(this.config[e.id]={}),this.config[e.id][n.id]=o[s];const i=`${e.id}-${n.id}`,a=document.getElementById(i);a&&(a.value=o[s])}})}),this.saveConfig())}}export{d as ConfigManager};
//# sourceMappingURL=config-manager.js.map
