class r{constructor(){this.config=this.loadConfig()}loadConfig(){const o=localStorage.getItem("esp-flasher-config");return o?JSON.parse(o):{}}saveConfig(){localStorage.setItem("esp-flasher-config",JSON.stringify(this.config))}clearConfig(){this.config={},this.saveConfig(),this.loadConfigValues()}loadConfigValues(){document.querySelectorAll("[data-section][data-field]").forEach(i=>{const e=i.dataset.section,n=i.dataset.field;this.config[e]&&this.config[e][n]!==void 0&&(i.value=this.config[e][n])})}attachConfigListeners(){document.querySelectorAll("[data-section][data-field]").forEach(i=>{i.addEventListener("input",()=>{const e=i.dataset.section,n=i.dataset.field;this.config[e]||(this.config[e]={}),this.config[e][n]=i.value,this.saveConfig()})})}renderConfigFields(o){if(!o.configSections){document.getElementById("config-container").innerHTML='<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';return}const i=document.getElementById("config-container");i.innerHTML="",o.configSections.forEach(e=>{const n=document.createElement("div");n.className="config-group";let a=`<h3>${e.title}</h3>`;e.description&&(a+=`<p class="help-text" style="margin-bottom: 12px;">${e.description}</p>`),e.fields.forEach(t=>{const s=`${e.id}-${t.id}`;a+=`
                    <div class="form-group">
                        <label for="${s}">${t.label}${t.required?' <span style="color: #ff3b30;">*</span>':' <span style="color: #86868b; font-weight: 400;">(optional)</span>'}</label>
                        <input
                            type="${t.type||"text"}"
                            id="${s}"
                            placeholder="${t.placeholder||""}"
                            ${t.default?`value="${t.default}"`:""}
                            ${t.required?"required":""}
                            ${t.pattern?`pattern="${t.pattern}"`:""}
                            ${t.pattern?`title="${t.help||"Invalid format"}"`:""}
                            aria-required="${t.required?"true":"false"}"
                            aria-describedby="${t.help?s+"-help":""}"
                            data-section="${e.id}"
                            data-field="${t.id}">
                        ${t.help?`<span class="help-text" id="${s}-help">${t.help}</span>`:""}
                    </div>
                `}),n.innerHTML=a,i.appendChild(n)}),this.loadConfigValues(),this.attachConfigListeners()}getConfig(){return this.config}populateFromNVS(o,i){i.configSections&&(this.config={},i.configSections.forEach(e=>{e.fields.forEach(n=>{const a=n.nvsKey||`${e.id}_${n.id}`;if(o[a]!==void 0){this.config[e.id]||(this.config[e.id]={}),this.config[e.id][n.id]=o[a];const t=`${e.id}-${n.id}`,s=document.getElementById(t);s&&(s.value=o[a])}})}),this.saveConfig())}}export{r as ConfigManager};
//# sourceMappingURL=config-manager.js.map
