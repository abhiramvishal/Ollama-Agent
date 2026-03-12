"use strict";var Es=Object.create;var Be=Object.defineProperty;var Is=Object.getOwnPropertyDescriptor;var $s=Object.getOwnPropertyNames;var Ls=Object.getPrototypeOf,Rs=Object.prototype.hasOwnProperty;var Os=(r,e)=>()=>(r&&(e=r(r=0)),e);var Pt=(r,e)=>{for(var t in e)Be(r,t,{get:e[t],enumerable:!0})},Mt=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of $s(e))!Rs.call(r,o)&&o!==t&&Be(r,o,{get:()=>e[o],enumerable:!(s=Is(e,o))||s.enumerable});return r};var w=(r,e,t)=>(t=r!=null?Es(Ls(r)):{},Mt(e||!r||!r.__esModule?Be(t,"default",{value:r,enumerable:!0}):t,r)),Bs=r=>Mt(Be({},"__esModule",{value:!0}),r);var Ms={};Pt(Ms,{installOllama:()=>$o,isOllamaInstalled:()=>St,startOllamaServer:()=>Le});function it(r,e,t){return new Promise((s,o)=>{let n=A.createWriteStream(e);Ps.get(r,{headers:{"User-Agent":"ClawPilot/1.0"}},i=>{if(i.statusCode===302||i.statusCode===301){let c=i.headers.location;if(c)return n.close(),A.unlinkSync(e),it(c,e,t).then(s,o)}let a=parseInt(i.headers["content-length"]||"0",10),l=0;i.on("data",c=>{l+=c.length,a>0&&t(`Downloaded ${(100*l/a).toFixed(0)}%`)}),i.pipe(n),n.on("finish",()=>{n.close(),s()}),n.on("error",c=>{A.unlink(e,()=>{}),o(c)})}).on("error",i=>{n.close(),A.unlink(e,()=>{}),o(i)})})}async function St(){let r=ve.platform(),e=[];if(r==="win32"){let t=process.env.LOCALAPPDATA||te.join(process.env.USERPROFILE||"","AppData","Local");e.push(te.join(t,"Programs","Ollama","ollama.exe"))}r==="darwin"&&e.push("/usr/local/bin/ollama","/opt/homebrew/bin/ollama","/Applications/Ollama.app/Contents/MacOS/ollama"),r==="linux"&&e.push("/usr/local/bin/ollama","/usr/bin/ollama");for(let t of e)try{if(A.existsSync(t))return!0}catch{}try{let t=(0,de.spawnSync)("ollama",["--version"],{encoding:"utf8",timeout:3e3,shell:!0,windowsHide:!0});if(t.status===0||t.stdout&&t.stdout.trim().length>0)return!0}catch{}return!1}async function $o(r){let e=ve.platform(),t=ve.tmpdir();if(e==="darwin"){let s=te.join(t,"Ollama-darwin.zip"),o="/Applications/Ollama.app";r("Downloading Ollama for macOS..."),await it(Ao,s,r),r("Extracting..."),(0,de.execSync)(`unzip -o "${s}" -d /Applications`,{stdio:"inherit",timeout:6e4});try{A.unlinkSync(s)}catch{}r("Ollama installed to /Applications/Ollama.app");return}if(e==="linux"){let s=te.join(t,"ollama-install.sh");r("Downloading install script..."),await it(Io,s,r);let o=A.readFileSync(s,"utf8");r("To install Ollama on Linux, run this in your terminal (may require sudo):"),r("curl -fsSL https://ollama.com/install.sh | sh");try{A.unlinkSync(s)}catch{}throw new Error("Linux install requires manual step. Run in terminal: curl -fsSL https://ollama.com/install.sh | sh")}if(e==="win32"){let s=te.join(t,"OllamaSetup.exe");r("Downloading Ollama for Windows..."),await it(Eo,s,r),r("Running installer (silent)..."),await new Promise((o,n)=>{let i=(0,de.spawn)(s,["/S"],{detached:!0,stdio:"ignore",windowsHide:!0});i.on("error",n),i.on("close",a=>{a===0?o():n(new Error(`Installer exited with code ${a}`))}),setTimeout(()=>o(),6e4)});try{A.unlinkSync(s)}catch{}r("Ollama installed. You may need to restart VS Code for the PATH to update.");return}throw new Error(`Unsupported platform: ${e}`)}async function Le(r){try{let e=ve.platform(),t="ollama";if(e==="win32"){let o=process.env.LOCALAPPDATA||te.join(process.env.USERPROFILE||"","AppData","Local"),n=te.join(o,"Programs","Ollama","ollama.exe");A.existsSync(n)&&(t=n)}e==="darwin"&&A.existsSync("/Applications/Ollama.app/Contents/MacOS/ollama")&&(t="/Applications/Ollama.app/Contents/MacOS/ollama"),(0,de.spawn)(t,["serve"],{detached:!0,stdio:"ignore",shell:!0,windowsHide:!0}).unref(),r("Starting Ollama server...")}catch(e){return r(`Start failed: ${e instanceof Error?e.message:String(e)}`),!1}for(let e=0;e<15;e++){await new Promise(t=>setTimeout(t,1e3));try{let t=new AbortController;if(setTimeout(()=>t.abort(),2e3),(await fetch("http://localhost:11434/api/tags",{signal:t.signal})).ok)return r("Ollama server is running."),!0}catch{}}return r('Server did not respond in time. Try running "ollama serve" in a terminal.'),!1}var ve,te,A,Ps,de,Ao,Eo,Io,rt=Os(()=>{"use strict";ve=w(require("os")),te=w(require("path")),A=w(require("fs")),Ps=w(require("https")),de=require("child_process"),Ao="https://ollama.com/download/Ollama-darwin.zip",Eo="https://ollama.com/download/OllamaSetup.exe",Io="https://ollama.com/install.sh"});var qo={};Pt(qo,{activate:()=>Do,deactivate:()=>jo});module.exports=Bs(qo);var m=w(require("vscode"));var Tt=w(require("vscode"));var De={ollama:11434,lmstudio:1234,llamafile:8080,vllm:8e3,localai:8080,jan:1337,"textgen-webui":5e3,"openai-compatible":11434,anthropic:443,openai:443,google:443},ne={ollama:"Ollama",lmstudio:"LM Studio",llamafile:"llamafile",vllm:"vLLM",localai:"LocalAI",jan:"Jan","textgen-webui":"Text Generation WebUI","openai-compatible":"OpenAI-compatible server",anthropic:"Anthropic (API)",openai:"OpenAI (API)",google:"Google Gemini (API)"},Y=["anthropic","openai","google"];var lt=w(require("vscode")),dt=[{name:"deepseek-coder:6.7b",label:"DeepSeek Coder 6.7B",category:"code"},{name:"deepseek-coder:33b",label:"DeepSeek Coder 33B",category:"code"},{name:"deepseek-coder-v2",label:"DeepSeek Coder v2",category:"code"},{name:"codellama:7b",label:"Code Llama 7B",category:"code"},{name:"codellama:13b",label:"Code Llama 13B",category:"code"},{name:"codellama:34b",label:"Code Llama 34B",category:"code"},{name:"starcoder2:3b",label:"StarCoder2 3B",category:"code"},{name:"starcoder2:7b",label:"StarCoder2 7B",category:"code"},{name:"qwen2.5-coder:7b",label:"Qwen2.5 Coder 7B",category:"code"},{name:"qwen2.5-coder:14b",label:"Qwen2.5 Coder 14B",category:"code"},{name:"qwen2.5-coder:32b",label:"Qwen2.5 Coder 32B",category:"code"},{name:"llama3.2:3b",label:"Llama 3.2 3B",category:"general"},{name:"llama3.1:8b",label:"Llama 3.1 8B",category:"general"},{name:"llama3.1:70b",label:"Llama 3.1 70B",category:"general"},{name:"mistral:7b",label:"Mistral 7B",category:"general"},{name:"mistral-nemo",label:"Mistral Nemo",category:"general"},{name:"mixtral:8x7b",label:"Mixtral 8x7B",category:"general"},{name:"gemma2:2b",label:"Gemma 2 2B",category:"general"},{name:"gemma2:9b",label:"Gemma 2 9B",category:"general"},{name:"phi3.5",label:"Phi 3.5",category:"general"},{name:"phi4",label:"Phi 4",category:"general"},{name:"qwen2.5:7b",label:"Qwen2.5 7B",category:"general"},{name:"qwen2.5:14b",label:"Qwen2.5 14B",category:"general"},{name:"qwen2.5:32b",label:"Qwen2.5 32B",category:"general"},{name:"tinyllama",label:"TinyLlama",category:"small"},{name:"smollm2:135m",label:"SmolLM2 135M",category:"small"},{name:"smollm2:360m",label:"SmolLM2 360M",category:"small"},{name:"smollm2:1.7b",label:"SmolLM2 1.7B",category:"small"}],Ds=3e3,ie=class r{constructor(){this.providerType="ollama";this.displayName="Ollama";this._config=lt.workspace.getConfiguration("clawpilot")}get baseEndpoint(){return this._config.get("endpoint","http://localhost:11434").replace(/\/$/,"")}get endpoint(){return this.baseEndpoint}refreshConfig(){this._config=lt.workspace.getConfiguration("clawpilot")}async isAvailable(){let e=new AbortController,t=setTimeout(()=>e.abort(),Ds);try{let s=await fetch(`${this.endpoint}/api/tags`,{signal:e.signal});return clearTimeout(t),s.ok}catch{return clearTimeout(t),!1}}async listModels(){this.refreshConfig();let e=await fetch(`${this.endpoint}/api/tags`);if(!e.ok)throw new Error(`Ollama API error: ${e.status} ${e.statusText}`);return(await e.json()).models??[]}async getBestAvailableModel(e){try{let t=await this.listModels();return t.some(s=>s.name===e)?e:t.length>0?t[0].name:e}catch{return e}}static{this.TOOL_CAPABLE_MODELS=["llama3.1","llama3.2","llama3.3","qwen2.5","qwen2.5-coder","mistral-nemo","mistral-small","command-r","command-r-plus","firefunction-v2"]}static supportsNativeTools(e){let t=e.split(":")[0].toLowerCase();return r.TOOL_CAPABLE_MODELS.some(s=>t.includes(s))}async*streamChat(e,t,s){let o=s??this._config.get("maxTokens",2048);this.refreshConfig();let n={model:t,messages:e,stream:!0,options:{num_predict:o}},i=await fetch(`${this.endpoint}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!i.ok){let d=await i.text();throw new Error(`Ollama chat error: ${i.status} ${d}`)}let a=i.body?.getReader();if(!a)throw new Error("No response body");let l=new TextDecoder,c="";try{for(;;){let{done:d,value:p}=await a.read();if(d)break;c+=l.decode(p,{stream:!0});let u=c.split(`
`);c=u.pop()??"";for(let g of u)if(g.trim())try{let y=JSON.parse(g).message?.content;typeof y=="string"&&(yield y)}catch{}}if(c.trim())try{let p=JSON.parse(c).message?.content;typeof p=="string"&&(yield p)}catch{}}finally{a.releaseLock()}}async*streamChatWithFallback(e,t,s,o){let n=[],i=[t,...s],a=!0;for(let l of i){n.push(l);try{a||(yield`[ClawPilot: switching to fallback model: ${l}]`);for await(let c of this.streamChat(e,l,o))yield c;return}catch{a=!1}}throw new Error(`All models failed. Tried: ${n.join(", ")}`)}async*streamGenerate(e,t,s,o){this.refreshConfig();let n={model:t,prompt:e,stream:!0,options:{num_predict:s}},i=await fetch(`${this.endpoint}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!i.ok){let p=await i.text();throw new Error(`Ollama generate error: ${i.status} ${p}`)}let a=i.body?.getReader();if(!a)throw new Error("No response body");let l=new TextDecoder,c="",d=o?.length?o:[];try{for(;;){let{done:p,value:u}=await a.read();if(p)break;c+=l.decode(u,{stream:!0});let g=c.split(`
`);c=g.pop()??"";for(let v of g)if(v.trim())try{let y=JSON.parse(v),h=y.response;if(typeof h=="string"){let f=h;for(let x of d){let b=f.indexOf(x);b!==-1&&(f=f.slice(0,b))}f&&(yield f)}if(y.done)return}catch{}}if(c.trim())try{let u=JSON.parse(c).response;typeof u=="string"&&(yield u)}catch{}}finally{a.releaseLock()}}async pullModel(e,t){this.refreshConfig();let s={name:e,stream:!0},o=await fetch(`${this.endpoint}/api/pull`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!o.ok){let l=await o.text();throw new Error(`Ollama pull error: ${o.status} ${l}`)}let n=o.body?.getReader();if(!n)throw new Error("No response body");let i=new TextDecoder,a="";try{for(;;){let{done:l,value:c}=await n.read();if(l)break;a+=i.decode(c,{stream:!0});let d=a.split(`
`);a=d.pop()??"";for(let p of d)if(p.trim())try{let u=JSON.parse(p);u.status&&t(u.status)}catch{}}}finally{n.releaseLock()}}};var Ne=w(require("vscode"));var Ns=3e3,Fs={lmstudio:"lmstudioEndpoint",llamafile:"llamafileEndpoint",vllm:"vllmEndpoint",localai:"localaiEndpoint",jan:"janEndpoint","textgen-webui":"textgenEndpoint","openai-compatible":"endpoint"},F=class{constructor(e){this.providerType=e,this.displayName=ne[e],this._config=Ne.workspace.getConfiguration("clawpilot")}get baseEndpoint(){this._config=Ne.workspace.getConfiguration("clawpilot");let e=Fs[this.providerType]??"endpoint",t=this._config.get(e,"");return!t&&e!=="endpoint"&&(t=this._config.get("endpoint","")),t||(t=`http://localhost:${De[this.providerType]}`),t.replace(/\/$/,"")}refreshConfig(){this._config=Ne.workspace.getConfiguration("clawpilot")}async isAvailable(){let e=new AbortController,t=setTimeout(()=>e.abort(),Ns);try{let s=await fetch(`${this.baseEndpoint}/v1/models`,{signal:e.signal});return clearTimeout(t),s.ok}catch{return clearTimeout(t),!1}}async listModels(){this.refreshConfig();let e=await fetch(`${this.baseEndpoint}/v1/models`);if(!e.ok)throw new Error(`Models API error: ${e.status} ${e.statusText}`);return((await e.json()).data??[]).map(o=>({name:o.id,modified_at:o.created!=null?new Date(o.created*1e3).toISOString():void 0}))}async getBestAvailableModel(e){try{let t=await this.listModels();return t.some(s=>s.name===e)?e:t.length>0?t[0].name:e}catch{return e}}async*streamChat(e,t,s){let o=s??this._config.get("maxTokens",2048);this.refreshConfig();let n={model:t,messages:e.map(d=>({role:d.role,content:d.content})),stream:!0,max_tokens:o},i=await fetch(`${this.baseEndpoint}/v1/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!i.ok){let d=await i.text();throw new Error(`Chat error: ${i.status} ${d}`)}let a=i.body?.getReader();if(!a)throw new Error("No response body");let l=new TextDecoder,c="";try{for(;;){let{done:d,value:p}=await a.read();if(d)break;c+=l.decode(p,{stream:!0});let u=c.split(`
`);c=u.pop()??"";for(let g of u){let v=g.trim();if(!(!v||v==="data: [DONE]")&&v.startsWith("data: "))try{let h=JSON.parse(v.slice(6)).choices?.[0]?.delta?.content;typeof h=="string"&&(yield h)}catch{}}}if(c.trim()&&c.trim()!=="data: [DONE]"&&c.startsWith("data: "))try{let p=JSON.parse(c.trim().slice(6)).choices?.[0]?.delta?.content;typeof p=="string"&&(yield p)}catch{}}finally{a.releaseLock()}}async*streamChatWithFallback(e,t,s,o){let n=[],i=[t,...s],a=!0;for(let l of i){n.push(l);try{a||(yield`[ClawPilot: switching to fallback model: ${l}]`);for await(let c of this.streamChat(e,l,o))yield c;return}catch{a=!1}}throw new Error(`All models failed. Tried: ${n.join(", ")}`)}async*streamGenerate(e,t,s,o){this.refreshConfig();let n={model:t,prompt:e,stream:!0,max_tokens:s},i=await fetch(`${this.baseEndpoint}/v1/completions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(i.status===404){let p=[{role:"user",content:e}];yield*this.streamChat(p,t,s);return}if(!i.ok){let p=await i.text();throw new Error(`Completions error: ${i.status} ${p}`)}let a=i.body?.getReader();if(!a)throw new Error("No response body");let l=new TextDecoder,c="",d=o?.length?o:[];try{for(;;){let{done:p,value:u}=await a.read();if(p)break;c+=l.decode(u,{stream:!0});let g=c.split(`
`);c=g.pop()??"";for(let v of g){let y=v.trim();if(!(!y||y==="data: [DONE]")&&y.startsWith("data: "))try{let f=JSON.parse(y.slice(6)).choices?.[0],x=f?.text??f?.delta?.content;if(typeof x=="string"){let b=x;for(let T of d){let E=b.indexOf(T);E!==-1&&(b=b.slice(0,E))}b&&(yield b)}}catch{}}}if(c.trim()&&c.trim()!=="data: [DONE]"&&c.startsWith("data: "))try{let u=JSON.parse(c.trim().slice(6)).choices?.[0],g=u?.text??u?.delta?.content;typeof g=="string"&&(yield g)}catch{}}finally{a.releaseLock()}}};var js=[{name:"claude-sonnet-4-5",modified_at:void 0},{name:"claude-haiku-4-5",modified_at:void 0}],qs=[{name:"gpt-4o",modified_at:void 0},{name:"gpt-4o-mini",modified_at:void 0}],Gs=[{name:"gemini-1.5-pro",modified_at:void 0},{name:"gemini-1.5-flash",modified_at:void 0}];var Fe=class{constructor(e,t){this._apiType=e,this._apiKey=t,this.providerType=e,this.displayName=ne[this.providerType],this.baseEndpoint=this._baseUrl()}_baseUrl(){switch(this._apiType){case"anthropic":return"https://api.anthropic.com";case"openai":return"https://api.openai.com";case"google":return"https://generativelanguage.googleapis.com";default:return""}}refreshConfig(){}async isAvailable(){return!!this._apiKey?.trim()}async listModels(){switch(this._apiType){case"anthropic":return[...js];case"openai":return[...qs];case"google":return[...Gs];default:return[]}}async getBestAvailableModel(e){let t=await this.listModels();return t.some(s=>s.name===e)?e:t.length>0?t[0].name:e}async*streamChat(e,t,s){let o=s??2048;if(this._apiType==="anthropic"){yield*this._streamAnthropic(e,t,o);return}if(this._apiType==="openai"){yield*this._streamOpenAI(e,t,o);return}if(this._apiType==="google"){yield*this._streamGoogle(e,t,o);return}throw new Error(`Unsupported API type: ${this._apiType}`)}async*_streamAnthropic(e,t,s){let o=e.find(p=>p.role==="system")?.content,n=e.filter(p=>p.role!=="system").map(p=>({role:p.role,content:p.content})),i={model:t,max_tokens:s,messages:n,stream:!0};o&&(i.system=o);let a=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":this._apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify(i)});if(!a.ok){let p=await a.text();throw new Error(`Anthropic error: ${a.status} ${p}`)}let l=a.body?.getReader();if(!l)throw new Error("No response body");let c=new TextDecoder,d="";try{for(;;){let{done:p,value:u}=await l.read();if(p)break;d+=c.decode(u,{stream:!0});let g=d.split(`
`);d=g.pop()??"";for(let v of g)if(v.startsWith("data: ")){let y=v.slice(6).trim();if(y==="[DONE]")continue;try{let h=JSON.parse(y);h.type==="content_block_delta"&&h.delta?.text&&(yield h.delta.text)}catch{}}}}finally{l.releaseLock()}}async*_streamOpenAI(e,t,s){let o={model:t,messages:e.map(c=>({role:c.role,content:c.content})),stream:!0,max_tokens:s},n=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this._apiKey}`},body:JSON.stringify(o)});if(!n.ok){let c=await n.text();throw new Error(`OpenAI error: ${n.status} ${c}`)}let i=n.body?.getReader();if(!i)throw new Error("No response body");let a=new TextDecoder,l="";try{for(;;){let{done:c,value:d}=await i.read();if(c)break;l+=a.decode(d,{stream:!0});let p=l.split(`
`);l=p.pop()??"";for(let u of p){let g=u.trim();if(!(!g||g==="data: [DONE]")&&g.startsWith("data: "))try{let y=JSON.parse(g.slice(6)).choices?.[0]?.delta?.content;typeof y=="string"&&(yield y)}catch{}}}}finally{i.releaseLock()}}async*_streamGoogle(e,t,s){let n={contents:e.map(p=>({role:p.role==="assistant"?"model":"user",parts:[{text:p.content}]})),generationConfig:{maxOutputTokens:s}},i=`https://generativelanguage.googleapis.com/v1beta/models/${t}:streamGenerateContent?key=${encodeURIComponent(this._apiKey)}`,a=await fetch(i,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!a.ok){let p=await a.text();throw new Error(`Google Gemini error: ${a.status} ${p}`)}let l=a.body?.getReader();if(!l)throw new Error("No response body");let c=new TextDecoder,d="";try{for(;;){let{done:p,value:u}=await l.read();if(p)break;d+=c.decode(u,{stream:!0});let g=d.split(`
`);d=g.pop()??"";for(let v of g){let y=v.trim();if(y)try{let f=JSON.parse(y).candidates?.[0]?.content?.parts?.[0]?.text;typeof f=="string"&&(yield f)}catch{}}}}finally{l.releaseLock()}}async*streamChatWithFallback(e,t,s,o){let n=[t,...s],i=!0;for(let a of n)try{i||(yield`[ClawPilot: switching to fallback model: ${a}]`),yield*this.streamChat(e,a,o);return}catch{i=!1}throw new Error(`All models failed. Tried: ${n.join(", ")}`)}async*streamGenerate(e,t,s,o){let n=[{role:"user",content:e}];yield*this.streamChat(n,t,s)}};var zs="clawpilot.anthropicApiKey",Ws="clawpilot.openaiApiKey",Us="clawpilot.googleApiKey",j={anthropic:zs,openai:Ws,google:Us};var Hs={ollama:void 0,lmstudio:void 0,llamafile:void 0,vllm:void 0,localai:void 0,jan:void 0,"textgen-webui":void 0,"openai-compatible":void 0,anthropic:j.anthropic,openai:j.openai,google:j.google};async function je(r){let t=Tt.workspace.getConfiguration("clawpilot").get("provider","ollama");if(t==="ollama")return new ie;if(Y.includes(t)){let s=Hs[t];if(!s)throw new Error("Unknown API provider");let o=await r.secrets.get(s);if(!o?.trim())throw new Error(`No API key set for ${t}. Use "ClawPilot: Manage API Keys" to add your key.`);return new Fe(t,o)}return new F(t)}async function At(){let r=[new ie,new F("lmstudio"),new F("jan"),new F("llamafile"),new F("vllm"),new F("localai"),new F("textgen-webui")],t=(await Promise.all(r.map(async s=>({provider:s,ok:await s.isAvailable()})))).find(s=>s.ok);return t?t.provider:null}var L=w(require("vscode")),Ks=300,Vs=40,Js=10,Ys=80,qe=class{constructor(e,t){this._client=e,this._model=t}updateModel(e){this._model=e}setClient(e){this._client=e}provideInlineCompletionItems(e,t,s,o){this._pendingCancel?.cancel(),this._pendingCancel=new L.CancellationTokenSource;let n=this._pendingCancel;return o.onCancellationRequested(()=>n.cancel()),new Promise(i=>{this._pendingResolve?.(null),this._pendingResolve=i,this._debounceTimer&&clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(async()=>{if(this._pendingResolve=void 0,n.token.isCancellationRequested){i(null);return}if(!L.workspace.getConfiguration("clawpilot").get("inlineCompletionsEnabled",!0)){i(null);return}let l=this._getPrefix(e,t),c=this._getSuffix(e,t);if(!e.lineAt(t.line).text.slice(0,t.character).trim()&&l.split(`
`).slice(-3).every(p=>!p.trim())){i(null);return}try{let p=await this._fetchCompletion(l,c,e.languageId,n.token);if(!p||n.token.isCancellationRequested){i(null);return}let u=new L.InlineCompletionItem(p,new L.Range(t,t));i(new L.InlineCompletionList([u]))}catch{i(null)}},Ks)})}_getPrefix(e,t){let s=Math.max(0,t.line-Vs),o=new L.Range(s,0,t.line,t.character);return e.getText(o)}_getSuffix(e,t){let s=Math.min(e.lineCount-1,t.line+Js),o=new L.Range(t.line,t.character,s,e.lineAt(s).text.length);return e.getText(o)}async _fetchCompletion(e,t,s,o){let n=`You are a code completion engine. Complete the code at the cursor position.
Output ONLY the completion text \u2014 no explanation, no markdown fence, no repetition of the prefix.
Stop after completing the current logical statement or block.
Language: ${s}`,i=`<PREFIX>
${e}
<SUFFIX>
${t}
<COMPLETION>`,a="",l=0,c=0,d=["<|endoftext|>","</s>","<EOT>"];try{for await(let u of this._client.streamChat([{role:"system",content:n},{role:"user",content:i}],this._model)){if(o.isCancellationRequested)return null;if(a+=u,c+=u.split(/\s+/).filter(Boolean).length,l+=(u.match(/\n/g)||[]).length,d.some(g=>a.includes(g))){for(let g of d){let v=a.indexOf(g);v!==-1&&(a=a.slice(0,v))}break}if(a.includes(`


`)){a=a.slice(0,a.indexOf(`


`));break}if(l>=5||c>=Ys)break}}catch{return null}let p=a.trimEnd();return p.length>0?p:null}};var q=w(require("vscode")),Ge=class{constructor(e){this._item=q.window.createStatusBarItem(q.StatusBarAlignment.Right,100),this._item.command="clawpilot.toggleCompletions",e.subscriptions.push(this._item),this._update(),e.subscriptions.push(q.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("clawpilot.inlineCompletionsEnabled")&&this._update()})),this._item.show()}_update(){let e=q.workspace.getConfiguration("clawpilot").get("inlineCompletionsEnabled",!0);this._item.text=e?"$(claw) ClawPilot":"$(circle-slash) Ollama",this._item.tooltip=e?"ClawPilot inline completions: ON (click to disable)":"ClawPilot inline completions: OFF (click to enable)",this._item.color=e?void 0:new q.ThemeColor("statusBarItem.warningForeground")}};var S=w(require("vscode")),Ke=w(require("path")),Ut=require("child_process");var mt=w(require("vscode")),Ft=w(require("path")),jt=w(require("fs"));var M=w(require("vscode")),R=w(require("path")),_=w(require("fs")),Nt=require("child_process");function Xs(r){return r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function pt(r,e){let t=r.split(/\r?\n/),s=e.split(/\r?\n/),o=t.length,n=s.length,i=[],a=0,l=0,c=0;for(;a<o||l<n;){if(a<o&&l<n&&t[a]===s[l]){c<3?(i.push({type:"context",content:t[a]??"",lineNo:a+1}),c++):c===3&&(i.push({type:"context",content:"..."}),c++),a++,l++;continue}if(c=0,a<o&&l<n){let d=t.indexOf(s[l],a+1),p=s.indexOf(t[a],l+1);if(d!==-1&&(p===-1||d-a<=p-l)){for(;a<d;)i.push({type:"remove",content:t[a]??"",lineNo:a+1}),a++;continue}if(p!==-1&&(d===-1||p-l<=d-a)){for(;l<p;)i.push({type:"add",content:s[l]??"",lineNo:l+1}),l++;continue}}a<o&&l<n?(i.push({type:"remove",content:t[a]??"",lineNo:a+1}),i.push({type:"add",content:s[l]??"",lineNo:l+1}),a++,l++):a<o?(i.push({type:"remove",content:t[a]??"",lineNo:a+1}),a++):(i.push({type:"add",content:s[l]??"",lineNo:l+1}),l++)}if(i.length>300){let d=i.slice(0,300);return d.push({type:"context",content:`... (${i.length-300} more lines truncated)`}),d}return i}function Et(r){let e=Math.min(r.length,300),t=[];for(let s=0;s<e;s++){let o=r[s],n=o.type==="add"?"diff-add":o.type==="remove"?"diff-remove":"diff-context",i=o.type==="add"?"+":o.type==="remove"?"-":" ";t.push(`<div class="diff-line ${n}">${Xs(i+" "+o.content)}</div>`)}return r.length>300&&t.push(`<div class="diff-line diff-context">... (${r.length-300} more lines)</div>`),t.join("")}var ze=require("child_process"),$t=w(require("vscode")),It=8e3;function re(){return $t.workspace.workspaceFolders?.[0]?.uri.fsPath??null}function X(r,e){try{let t=(0,ze.execSync)(r,{cwd:e,encoding:"utf8",stdio:["pipe","pipe","pipe"]});return t.length>It?t.slice(0,It)+`
... (truncated)`:t}catch(t){return`Error: ${(t instanceof Error?t.message:String(t)).slice(0,500)}`}}function Lt(){let r=re();return r?X("git status --short",r):"Error: No workspace open."}function Rt(){let r=re();if(!r)return{branch:"unknown",dirtyCount:0,raw:""};try{let e=(0,ze.execSync)("git rev-parse --abbrev-ref HEAD",{cwd:r,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim(),t=(0,ze.execSync)("git status --short",{cwd:r,encoding:"utf8",stdio:["pipe","pipe","pipe"]}),s=t.split(`
`).filter(o=>o.trim());return{branch:e,dirtyCount:s.length,raw:t}}catch{return{branch:"unknown",dirtyCount:0,raw:""}}}function me(r){let e=re();if(!e)return"Error: No workspace open.";let t=r.staged?"--staged":"",s=r.file?`-- "${r.file}"`:"";return X(`git diff ${t} ${s}`.trim(),e)}function We(r){let e=re();if(!e)return"Error: No workspace open.";let t=Math.min(r.count??10,50);return X(`git log --oneline -${t}`,e)}function Ot(r){let e=re();if(!e)return"Error: No workspace open.";if(!r.message?.trim())return"Error: Commit message is required.";let t=r.message.replace(/[`"$\\]/g," ").trim();if(r.addAll){let s=X("git add -A",e);if(s.startsWith("Error:"))return s}return X(`git commit -m "${t}"`,e)}function Bt(r){let e=re();if(!e)return"Error: No workspace open.";if(r.create){let t=r.create.replace(/[^a-zA-Z0-9/_.-]/g,"-");return X(`git checkout -b "${t}"`,e)}return X("git branch -a",e)}function Dt(r){let e=re();if(!e)return"Error: No workspace open.";let t=r.branch.replace(/[^a-zA-Z0-9/_.-]/g,"-");return X(`git checkout "${t}"`,e)}var Qs=[{name:"read_file",description:"Read the contents of a file in the workspace",parameters:{path:{type:"string",description:"Relative path to the file from workspace root",required:!0}}},{name:"write_file",description:"Write or overwrite a file with new content",parameters:{path:{type:"string",description:"Relative path to the file from workspace root",required:!0},content:{type:"string",description:"Full content to write to the file",required:!0}}},{name:"edit_file",description:"Replace a specific block of text in a file with new content (surgical edit)",parameters:{path:{type:"string",description:"Relative path to the file",required:!0},old_text:{type:"string",description:"Exact text block to find and replace",required:!0},new_text:{type:"string",description:"New text to replace the old block with",required:!0}}},{name:"create_file",description:"Create a new file with content (fails if file already exists)",parameters:{path:{type:"string",description:"Relative path to the new file",required:!0},content:{type:"string",description:"Content to write to the new file",required:!0}}},{name:"delete_file",description:"Delete a file from the workspace",parameters:{path:{type:"string",description:"Relative path to the file to delete",required:!0}}},{name:"list_files",description:"List files and directories in a directory",parameters:{path:{type:"string",description:"Relative directory path (default: workspace root)",required:!1},pattern:{type:"string",description:'Glob pattern to filter files (e.g. "**/*.ts")',required:!1}}},{name:"search_in_files",description:"Search for text or regex pattern across workspace files",parameters:{query:{type:"string",description:"Text or regex pattern to search for",required:!0},file_pattern:{type:"string",description:'Glob pattern for files to search in (e.g. "**/*.ts")',required:!1}}},{name:"run_terminal",description:"Run a shell command in the workspace directory and return its output",parameters:{command:{type:"string",description:"Shell command to execute",required:!0}}},{name:"get_diagnostics",description:"Get current errors and warnings from VS Code diagnostics (linting, type errors)",parameters:{path:{type:"string",description:"File path to get diagnostics for (optional, all files if omitted)",required:!1}}},{name:"semantic_search",description:"Semantically search the codebase for code related to a concept or query",parameters:{query:{type:"string",description:"Natural language or concept to search for",required:!0},top_k:{type:"string",description:"Maximum number of results (default 5)",required:!1}}},{name:"save_memory",description:"Save an important fact, decision, or insight to persistent memory for future sessions",parameters:{content:{type:"string",description:"Content to save",required:!0},tier:{type:"string",description:"'recall' or 'archival' (default recall)",required:!1},tags:{type:"string",description:"Optional comma-separated tags",required:!1}}},{name:"search_memory",description:"Search your persistent memory for relevant past context, decisions, or facts",parameters:{query:{type:"string",description:"Search query",required:!0},tier:{type:"string",description:"'recall' | 'archival' | 'both' (default both)",required:!1},top_k:{type:"string",description:"Max results (default 5)",required:!1}}},{name:"update_project_context",description:"Update the always-present project context (what this project is, its tech stack, architecture)",parameters:{context:{type:"string",description:"Project context text (replaces existing)",required:!0}}},{name:"add_key_fact",description:"Add a critical fact to always-present core memory (e.g. Auth uses JWT, DB is PostgreSQL)",parameters:{fact:{type:"string",description:"Fact to add (max 100 chars)",required:!0}}},{name:"add_skill",description:"Save a reusable coding pattern or instruction as a skill for future use",parameters:{name:{type:"string",description:"Skill name",required:!0},description:{type:"string",description:"Short description for matching",required:!0},content:{type:"string",description:"Full skill instructions/examples",required:!0},tags:{type:"string",description:"Optional comma-separated tags",required:!1}}},{name:"git_status",description:"Show the working tree status (modified, untracked, staged files)",parameters:{}},{name:"git_diff",description:"Show unstaged or staged changes. Optionally for a specific file.",parameters:{staged:{type:"boolean",description:"Show staged changes (default: unstaged)"},file:{type:"string",description:"Optional: specific file path to diff"}}},{name:"git_log",description:"Show recent commit history (oneline format)",parameters:{count:{type:"number",description:"Number of commits to show (default 10, max 50)"}}},{name:"git_commit",description:"Stage all changes and create a git commit",parameters:{message:{type:"string",description:"Commit message",required:!0},addAll:{type:"boolean",description:"Stage all changes before committing (git add -A)"}}},{name:"git_branch",description:"List all branches, or create a new branch and switch to it",parameters:{create:{type:"string",description:"Name of new branch to create and switch to"}}},{name:"git_checkout",description:"Switch to an existing branch",parameters:{branch:{type:"string",description:"Branch name to checkout",required:!0}}}],Q=class{constructor(e,t,s){let o=M.workspace.workspaceFolders;this.workspaceRoot=o?o[0].uri.fsPath:"",this.workspaceIndex=e,this.memoryStore=t,this.skillStore=s}resolvePath(e){return R.isAbsolute(e)?e:R.join(this.workspaceRoot,e)}async executeTool(e,t){try{switch(e){case"read_file":return await this.readFile(t.path);case"write_file":return await this.writeFile(t.path,t.content);case"edit_file":return await this.editFile(t.path,t.old_text,t.new_text);case"create_file":return await this.createFile(t.path,t.content);case"delete_file":return await this.deleteFile(t.path);case"list_files":return await this.listFiles(t.path,t.pattern);case"search_in_files":return await this.searchInFiles(t.query,t.file_pattern);case"run_terminal":return await this.runTerminal(t.command);case"get_diagnostics":return await this.getDiagnostics(t.path);case"semantic_search":return await this.semanticSearch(t.query,t.top_k);case"save_memory":return await this.saveMemory(t.content,t.tier,t.tags);case"search_memory":return await this.searchMemory(t.query,t.tier,t.top_k);case"update_project_context":return await this.updateProjectContext(t.context);case"add_key_fact":return await this.addKeyFact(t.fact);case"add_skill":return await this.addSkill(t.name,t.description,t.content,t.tags);case"git_status":return{success:!0,output:Lt()};case"git_diff":return{success:!0,output:me({staged:t.staged==="true",file:t.file})};case"git_log":return{success:!0,output:We({count:t.count?parseInt(t.count,10):10})};case"git_commit":{let s=Ot({message:t.message??"",addAll:t.addAll==="true"}),o=s.startsWith("Error:")||s.includes("nothing to commit");return{success:!o,output:s,error:o?s:void 0}}case"git_branch":return{success:!0,output:Bt({create:t.create})};case"git_checkout":return{success:!0,output:Dt({branch:t.branch??""})};default:return{success:!1,output:"",error:`Unknown tool: ${e}`}}}catch(s){return{success:!1,output:"",error:s.message||String(s)}}}async readFile(e){let t=this.resolvePath(e);if(!_.existsSync(t))return{success:!1,output:"",error:`File not found: ${e}`};let n=_.readFileSync(t,"utf8").split(`
`).map((i,a)=>`${String(a+1).padStart(4," ")} | ${i}`).join(`
`);return{success:!0,output:`File: ${e}
${"\u2500".repeat(60)}
${n}`}}async writeFile(e,t){let s=this.resolvePath(e),o=R.dirname(s);_.existsSync(o)||_.mkdirSync(o,{recursive:!0});let n=_.existsSync(s),i=n?_.readFileSync(s,"utf8"):"";_.writeFileSync(s,t,"utf8");let a=M.Uri.file(s);await M.workspace.openTextDocument(a);let l=pt(i,t),c={path:e,oldContent:i,newContent:t,lines:l,isNew:!n};return{success:!0,output:`${n?"Updated":"Created"} file: ${e} (${t.split(`
`).length} lines)`,diff:c}}async editFile(e,t,s){let o=this.resolvePath(e);if(!_.existsSync(o))return{success:!1,output:"",error:`File not found: ${e}`};let n=_.readFileSync(o,"utf8");if(!n.includes(t))return{success:!1,output:"",error:`Text not found in ${e}. The exact text block could not be located.`};let i=n.replace(t,s);_.writeFileSync(o,i,"utf8");let a=M.Uri.file(o),l=await M.workspace.openTextDocument(a);await M.window.showTextDocument(l,{preview:!1,preserveFocus:!0});let c=pt(n,i),d={path:e,oldContent:n,newContent:i,lines:c,isNew:!1},p=t.split(`
`).length,u=s.split(`
`).length;return{success:!0,output:`Edited ${e}: replaced ${p} lines with ${u} lines`,diff:d}}async createFile(e,t){let s=this.resolvePath(e);return _.existsSync(s)?{success:!1,output:"",error:`File already exists: ${e}. Use write_file to overwrite.`}:this.writeFile(e,t)}async deleteFile(e){let t=this.resolvePath(e);return _.existsSync(t)?(_.unlinkSync(t),{success:!0,output:`Deleted file: ${e}`}):{success:!1,output:"",error:`File not found: ${e}`}}async listFiles(e,t){let s=e?this.resolvePath(e):this.workspaceRoot;if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};let o=t||"**/*",n=await M.workspace.findFiles(new M.RelativePattern(this.workspaceRoot,o),"**/node_modules/**",500);if(e){let l=n.filter(c=>c.fsPath.startsWith(s)).map(c=>R.relative(this.workspaceRoot,c.fsPath)).sort();return{success:!0,output:l.length?l.join(`
`):"No files found"}}let i=n.map(a=>R.relative(this.workspaceRoot,a.fsPath)).sort();return{success:!0,output:i.length?i.join(`
`):"No files found"}}async searchInFiles(e,t){if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};let s=t||"**/*",o=await M.workspace.findFiles(new M.RelativePattern(this.workspaceRoot,s),"**/node_modules/**",200),n=[],i;try{i=new RegExp(e,"gi")}catch{i=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")}for(let a of o){try{let c=_.readFileSync(a.fsPath,"utf8").split(`
`);for(let d=0;d<c.length;d++){if(i.test(c[d])){let p=R.relative(this.workspaceRoot,a.fsPath);n.push(`${p}:${d+1}: ${c[d].trim()}`)}i.lastIndex=0}}catch{}if(n.length>100)break}return{success:!0,output:n.length?n.join(`
`):`No matches found for: ${e}`}}async runTerminal(e){if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};if(/\b(rm\s+-rf|format|mkfs|dd\s+if=|shutdown|reboot|:(){ :|:& };:)\b/i.test(e))return{success:!1,output:"",error:`Command blocked for safety: ${e}`};try{return{success:!0,output:(0,Nt.execSync)(e,{cwd:this.workspaceRoot,encoding:"utf8",timeout:3e4,maxBuffer:5242880})||"(no output)"}}catch(s){let o=s.stderr||"";return{success:!1,output:s.stdout||"",error:o||s.message||"Command failed"}}}async getDiagnostics(e){let t;if(e){let o=this.resolvePath(e),n=M.Uri.file(o),i=M.languages.getDiagnostics(n);t=[[n,i]]}else t=M.languages.getDiagnostics();let s=[];for(let[o,n]of t){if(n.length===0)continue;let i=this.workspaceRoot?R.relative(this.workspaceRoot,o.fsPath):o.fsPath;for(let a of n){let l=["Error","Warning","Info","Hint"][a.severity],c=a.range.start.line+1,d=a.range.start.character+1;s.push(`[${l}] ${i}:${c}:${d} - ${a.message}`)}}return{success:!0,output:s.length?s.join(`
`):"No diagnostics found (no errors or warnings)"}}async semanticSearch(e,t){if(!this.workspaceIndex)return{success:!1,output:"",error:"Workspace index not available. Use Re-index Workspace first."};if(!e?.trim())return{success:!1,output:"",error:'semantic_search requires a "query" argument.'};try{let s=t?Math.max(1,parseInt(t,10)||5):5,o=await this.workspaceIndex.query(e,s),n=[];for(let i of o)n.push(`--- ${i.filePath} | ${i.type}: ${i.name} | lines ${i.startLine}-${i.endLine} ---`),n.push(i.content),n.push("");return{success:!0,output:n.length?n.join(`
`):"No relevant code found for that query."}}catch(s){return{success:!1,output:"",error:s instanceof Error?s.message:String(s)}}}async saveMemory(e,t,s){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};if(!e?.trim())return{success:!1,output:"",error:'save_memory requires "content".'};try{let o=s?s.split(",").map(i=>i.trim()).filter(Boolean):[],n=(t||"recall").toLowerCase();return n==="archival"?await this.memoryStore.addArchival(e.trim(),"agent",o):await this.memoryStore.addRecall(e.trim(),"agent",o),{success:!0,output:`Saved to ${n} memory.`}}catch(o){return{success:!1,output:"",error:o instanceof Error?o.message:String(o)}}}async searchMemory(e,t,s){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};if(!e?.trim())return{success:!1,output:"",error:'search_memory requires "query".'};try{let o=(t||"both").toLowerCase(),n=s?Math.max(1,parseInt(s,10)||5):5,a=this.memoryStore.searchMemory(e,o,n).map(l=>`[${l.source}] ${l.content}`);return{success:!0,output:a.length?a.join(`

`):"No matching memory found."}}catch(o){return{success:!1,output:"",error:o instanceof Error?o.message:String(o)}}}async updateProjectContext(e){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};try{return await this.memoryStore.updateCoreMemory({projectContext:e||""}),{success:!0,output:"Project context updated."}}catch(t){return{success:!1,output:"",error:t instanceof Error?t.message:String(t)}}}async addKeyFact(e){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};let t=e?.trim().slice(0,100);if(!t)return{success:!1,output:"",error:'add_key_fact requires "fact".'};try{let o=[...this.memoryStore.getCoreMemory().keyFacts,t].slice(-10);return await this.memoryStore.updateCoreMemory({keyFacts:o}),{success:!0,output:"Key fact added."}}catch(s){return{success:!1,output:"",error:s instanceof Error?s.message:String(s)}}}async addSkill(e,t,s,o){if(!this.skillStore)return{success:!1,output:"",error:"Skill store not available."};if(!e?.trim()||!t?.trim()||!s?.trim())return{success:!1,output:"",error:"add_skill requires name, description, and content."};try{let n=o?o.split(",").map(a=>a.trim()).filter(Boolean):[],i=await this.skillStore.addSkill(e.trim(),t.trim(),s.trim(),n);return{success:!0,output:`Skill "${i.name}" saved (id: ${i.id}).`}}catch(n){return{success:!1,output:"",error:n instanceof Error?n.message:String(n)}}}static getToolsSystemPrompt(){return`You are a powerful local coding assistant with access to tools that let you read, write, and modify files, search the codebase, and run terminal commands \u2014 just like Claude Code.

## TOOLS AVAILABLE

You can use the following tools by outputting JSON in this exact format:
<tool_call>
{"tool": "tool_name", "args": {"param1": "value1", "param2": "value2"}}
</tool_call>

Available tools:

${Qs.map(e=>{let t=Object.entries(e.parameters).map(([s,o])=>`  - ${s} (${o.type}${o.required?", required":", optional"}): ${o.description}`).join(`
`);return`### ${e.name}
${e.description}
Parameters:
${t}`}).join(`

`)}

## RULES

1. Think step-by-step before taking action
2. Read files before editing them
3. Use edit_file for small surgical changes; use write_file for full rewrites
4. Always show your reasoning before making tool calls
5. After all tool calls are done, output: <agent_done>
6. If you need user confirmation before destructive actions, ask first
7. Use save_memory to record important decisions, findings, or facts discovered during tasks
8. Use search_memory at the start of complex tasks to check for relevant prior context
9. Use update_project_context when you learn the project's purpose, stack, or architecture
10. Use add_key_fact for critical facts that should always be available (e.g. API keys pattern, DB schema, coding conventions)

## PLAN MODE

When the user asks for a plan, output:
<plan>
## Plan: [Task Name]

**Steps:**
1. [Step description]
2. [Step description]
...

**Files to modify:** [list]
**Commands to run:** [list]
</plan>

Then wait for user to confirm before executing.`}};var be=class{constructor(e=3){this._context={entries:[],totalAttempts:0};this._maxReflections=e}reset(){this._context={entries:[],totalAttempts:0}}shouldRetry(){return this._context.totalAttempts<this._maxReflections}getReflectionCount(){return this._context.entries.length}reflect(e,t,s,o){let n=e.toLowerCase(),i;n.includes("not found")||n.includes("enoent")||n.includes("file not found")?i="The file path was wrong. I should use list_files first to confirm the exact path.":n.includes("text not found")||n.includes("could not be located")?i="The old_text didn't match exactly. I should read_file first to get the current content, then use the exact text from the file.":n.includes("command failed")||n.includes("exit code")||n.includes("command blocked")?i="The command failed. I should check the error output and try a different approach or fix the issue before retrying.":n.includes("already exists")?i="The file already exists. I should use write_file instead of create_file, or read it first to decide if I should overwrite.":n.includes("error ts")||n.includes("syntaxerror")||n.includes("typescript")?i="There is a compile error. I should read the file again, fix the syntax, and ensure types are correct before writing.":n.includes("no relevant code found")||n.includes("no matching")?i="Semantic search found nothing. I should try different search terms or use list_files to browse the structure directly.":i=`The previous attempt failed with: ${e.slice(0,200)}. I should try a different approach.`;let a={attempt:o,toolName:t,error:e,reflection:i,timestamp:Date.now()};return this._context.entries.push(a),this._context.totalAttempts+=1,a}getReflectionBlock(){return this._context.entries.length===0?"":["<reflexion>",...this._context.entries.map(t=>`Attempt ${t.attempt} failed. Reflection: ${t.reflection}`),"Based on these failures, try a different approach.","</reflexion>"].join(`
`)}static isTerminalSuccess(e,t){let s=e.toLowerCase(),o=t.toLowerCase();return o.includes("test")||o.includes("jest")||o.includes("vitest")||o.includes("pytest")?s.includes("failed")||s.includes("fail")?!1:s.includes("passed")||s.includes("\u2713")||s.includes("ok"):o.includes("tsc")||o.includes("npm run build")||o.includes("cargo build")||o.includes("go build")?s.includes("error")?!1:s.length===0||s.includes("successfully compiled"):o.includes("npm install")||o.includes("pip install")?!s.includes("err!")&&!s.includes("error"):!0}};function Zs(r){let e=r.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);if(!e)return null;try{let t=JSON.parse(e[1]);if(t.tool&&typeof t.tool=="string")return{tool:t.tool,args:t.args||{}}}catch{}return null}function eo(r){let e=r.match(/<plan>([\s\S]*?)<\/plan>/);return e?e[1].trim():null}function to(r){return r.includes("<agent_done>")||r.includes("</agent_done>")}var so=new Set(["write_file","edit_file","create_file"]),oo=5*60*1e3,xe=class{constructor(e,t,s){this._pendingDiffs=new Map;this._stopRequested=!1;this.client=e,this.tools=t??new Q,this._maxReflections=s??3}async _revertFile(e,t){await this.tools.executeTool("write_file",{path:e,content:t})}async _deleteFile(e){await this.tools.executeTool("delete_file",{path:e})}stop(){this._stopRequested=!0}resolveDiff(e,t){let s=this._pendingDiffs.get(e);s&&(this._pendingDiffs.delete(e),s(t))}_awaitDiffDecision(e){return new Promise(t=>{this._pendingDiffs.set(e,t),setTimeout(()=>{this._pendingDiffs.has(e)&&(this._pendingDiffs.delete(e),t(!1))},oo)})}async run(e){this._stopRequested=!1;let{messages:t,model:s,onStep:o,maxIterations:n=15}=e,i=e.maxReflections??this._maxReflections,a=e.diffPreviewEnabled!==!1,c=mt.workspace.getConfiguration("clawpilot").get("fallbackModels",[]),d=[...t],p=new be(i),u=new Set,g=0;for(;g<n;){if(this._stopRequested){this._stopRequested=!1,o({type:"done",content:"[Stopped by user]"});return}let v="";o({type:"thinking",content:""});try{for await(let f of this.client.streamChatWithFallback(d,s,c)){if(f.startsWith("[ClawPilot: switching to fallback model:")){o({type:"thinking",content:"[Switching to fallback model...]"});continue}v+=f,o({type:"response",content:f})}}catch(f){o({type:"error",content:f instanceof Error?f.message:"Streaming failed"});return}let y=eo(v);if(y){o({type:"plan",content:y}),d.push({role:"assistant",content:v});return}let h=Zs(v);if(h){o({type:"tool_call",content:`Calling ${h.tool}`,toolName:h.tool,toolArgs:h.args});let f=await this.tools.executeTool(h.tool,h.args);so.has(h.tool)&&f.success&&h.args.path&&u.add(h.args.path);let x=!f.success,b=f.error||f.output||"Tool failed";if(f.success&&h.tool==="run_terminal"&&h.args.command&&(be.isTerminalSuccess(f.output,h.args.command)||(x=!0,b="Command completed but output indicates failure: "+f.output.slice(0,300))),x){let T=p.getReflectionCount()+1,E=p.reflect(b,h.tool,h.args,T);if(o({type:"tool_result",content:f.success?f.output:f.error||"Tool failed",toolName:h.tool,success:!1}),o({type:"reflection",content:E.reflection,attempt:E.attempt}),!p.shouldRetry()){o({type:"error",content:"Max reflections reached. Could not complete task."});return}d.push({role:"assistant",content:v}),d.push({role:"user",content:p.getReflectionBlock()+`

The previous tool call failed. Review the reflection above and try again with a corrected approach.`});continue}if(f.diff&&a){let T=`diff_${Date.now()}`;if(o({type:"diff_preview",content:"",diff:f.diff,stepId:T}),!await this._awaitDiffDecision(T)){let P=f.diff;u.delete(P.path),P.isNew?await this._deleteFile(P.path):await this._revertFile(P.path,P.oldContent),d.push({role:"assistant",content:v}),d.push({role:"user",content:`The file change to ${P.path} was rejected by the user. Do NOT make this change. Try a different approach or ask what to do instead.`}),o({type:"reflection",content:"File change rejected by user.",attempt:0});continue}}o({type:"tool_result",content:f.output,toolName:h.tool,success:!0}),d.push({role:"assistant",content:v}),d.push({role:"user",content:`<tool_result tool="${h.tool}" success="true">
${f.output}
</tool_result>

Continue with the task.`}),g++;continue}if(to(v)||!h){if(u.size>0&&i>0){let f=await this.runPostTaskTscCheck();if(f){let x=p.getReflectionCount()+1;if(p.reflect(f,"post_task_tsc",{},x),p.shouldRetry()){o({type:"reflection",content:f.slice(0,400),attempt:x}),d.push({role:"assistant",content:v}),d.push({role:"user",content:p.getReflectionBlock()+`

TypeScript compilation failed after your changes. Fix the errors above and try again.`});continue}}}o({type:"done",content:v});return}g++}o({type:"error",content:`Agent reached max iterations (${n}). Task may be incomplete.`})}async runPostTaskTscCheck(){let e=mt.workspace.workspaceFolders;if(!e?.length)return null;let t=e[0].uri.fsPath,s=Ft.join(t,"tsconfig.json");if(!jt.existsSync(s))return null;try{let o=await this.tools.executeTool("run_terminal",{command:"npx tsc --noEmit 2>&1 || true"});if(!o.success||!o.output)return null;let n=o.output;return n.toLowerCase().includes("error ts")||n.includes("SyntaxError")?"TypeScript compilation failed after changes. I need to fix these errors: "+n.slice(0,500):null}catch{return null}}async resumeAfterPlan(e,t,s){let o=[...e,{role:"user",content:"Plan approved. Please proceed with execution now."}];await this.run({messages:o,model:t,onStep:s})}getTools(){return this.tools}};function I(r){if(!r)return"";let e=Ue(r);return e=e.replace(/```(\w*)\n([\s\S]*?)```/g,(t,s,o)=>{let n=Ue(o.trim());return`<div class="code-block"><div class="code-block-header"><span class="code-lang">${Ue(s||"plaintext")}</span><div class="code-actions"><button class="code-btn copy-btn" data-code="${qt(o.trim())}">Copy</button><button class="code-btn insert-btn" data-code="${qt(o.trim())}">Insert</button></div></div><pre><code>${n}</code></pre></div>`}),e=e.replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>'),e=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),e=e.replace(/__([^_]+)__/g,"<strong>$1</strong>"),e=e.replace(/\*([^*]+)\*/g,"<em>$1</em>"),e=e.replace(/_([^_]+)_/g,"<em>$1</em>"),e=e.replace(/^### (.+)$/gm,"<h3>$1</h3>"),e=e.replace(/^## (.+)$/gm,"<h2>$1</h2>"),e=e.replace(/^# (.+)$/gm,"<h1>$1</h1>"),e=e.replace(/^[\*\-] (.+)$/gm,"<li>$1</li>"),e=e.replace(/(<li>.*<\/li>\n?)+/g,"<ul>$&</ul>"),e=e.replace(/\n/g,`<br>
`),e}function Ue(r){return r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function qt(r){return Ue(r).replace(/'/g,"&#39;")}var He=[{name:"help",usage:"/help",description:"Show all available slash commands",isDynamic:!0},{name:"clear",usage:"/clear",description:"Clear the current session messages",isDynamic:!0},{name:"new",usage:"/new [session name]",description:"Start a new chat session",isDynamic:!0},{name:"status",usage:"/status",description:"Ask ClawPilot to summarise the current git status",expandTo:"Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise."},{name:"commit",usage:"/commit <message>",description:"Stage all changes and commit with the given message",isDynamic:!0},{name:"search",usage:"/search <query>",description:"Search the workspace with RAG and show top results",isDynamic:!0},{name:"explain",usage:"/explain",description:"Explain the current editor selection",isDynamic:!0},{name:"fix",usage:"/fix",description:"Find and fix bugs in the current editor selection",isDynamic:!0},{name:"tests",usage:"/tests",description:"Write unit tests for the current editor selection",isDynamic:!0},{name:"model",usage:"/model <name>",description:"Switch the active model",isDynamic:!0},{name:"install",usage:"/install <model>",description:"Install (pull) a model via Ollama and switch to it",isDynamic:!0},{name:"skills",usage:"/skills",description:"List and invoke ClawPilot built-in and saved skills",isDynamic:!0}];function Gt(r){let e=r.trim();if(!e.startsWith("/"))return null;let t=e.slice(1).split(/\s+/),s=t[0]?.toLowerCase()??"",o=t.slice(1).join(" "),n=He.find(i=>i.name===s);return n?{command:n,arg:o}:null}var gt=w(require("vscode")),zt=w(require("path"));var no=/^@(\w+)(?::(.*))?$/;async function Wt(r,e,t){let s=r.trim().match(no);if(!s)return null;let o=s[1].toLowerCase(),n=(s[2]??"").trim();try{switch(o){case"file":{if(!n)return null;let i=gt.workspace.workspaceFolders;if(!i?.length)return null;let a=zt.join(i[0].uri.fsPath,n),c=(await gt.workspace.openTextDocument(a)).getText().slice(0,15e3);return{type:"file",label:n,content:`<mention_file path="${ut(n)}">
${c}
</mention_file>`}}case"git":{let i=n.toLowerCase()||"diff";return i==="diff"?{type:"git",label:"git diff",content:`<mention_git type="diff">
${me({staged:!1})}
</mention_git>`}:i==="log"?{type:"git",label:"git log",content:`<mention_git type="log">
${We({count:10})}
</mention_git>`}:null}case"symbol":{if(!n)return null;let i=await e.query(n,3),a=i.filter(d=>d.name&&d.name.toLowerCase().includes(n.toLowerCase())),c=(a.length>0?a:i.slice(0,3)).map(d=>`--- ${d.filePath} | ${d.type}: ${d.name} | lines ${d.startLine}-${d.endLine} ---
${d.content}`).join(`

`);return{type:"symbol",label:`symbol: ${n}`,content:`<mention_symbol name="${ut(n)}">
${c}
</mention_symbol>`}}case"memory":{let i=n||"recent",l=t.searchRecall(i,3).map(c=>c.content).join(`

---

`);return{type:"memory",label:`memory: ${i}`,content:`<mention_memory query="${ut(i)}">
${l}
</mention_memory>`}}case"workspace":{let i=await e.getContext("overview");return i?{type:"workspace",label:"workspace overview",content:`<mention_workspace>
${i}
</mention_workspace>`}:null}default:return null}}catch{return null}}function ut(r){return r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var ke=class r{constructor(e,t,s,o,n){this._extensionUri=e;this._chatHistory=[];this._isAgentRunning=!1;this._pendingPlanMessages=null;this._activeSessionId=null;this._client=t,this._workspaceIndex=s,this._memoryStore=o,this._skillStore=n;let i=S.workspace.getConfiguration("clawpilot").get("reflexionMaxRetries",3);this._agentRunner=new xe(t,new Q(s,o,n),i)}static{this.viewType="clawpilot.chatView"}setClient(e){this._client=e;let t=S.workspace.getConfiguration("clawpilot").get("reflexionMaxRetries",3);this._agentRunner=new xe(e,new Q(this._workspaceIndex,this._memoryStore,this._skillStore),t)}resolveWebviewView(e,t,s){if(this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._extensionUri]},this._isAgentRunning=!1,e.webview.html=this._getHtml(),e.webview.onDidReceiveMessage(o=>this._handleMessage(o)),e.onDidChangeVisibility(()=>{e.visible&&(this._refreshModels(),this._checkConnection(),this._sendIndexStatus())}),setTimeout(()=>{this._refreshModels(),this._checkConnection(),this._sendIndexStatus(),this._sendMemoryData()},500),this._historyStore){let o=this._historyStore.getOrCreateActiveSession();this._activeSessionId=o.id,this._sendHistoryToWebview(o)}this._view?.webview.postMessage({type:"slashCommands",commands:He.map(o=>({name:o.name,usage:o.usage,description:o.description}))})}sendToChat(e,t){this._view&&(this._view.show(!0),setTimeout(()=>{this._view?.webview.postMessage({type:"injectMessage",text:e,codeContext:t})},300))}async sendQuickAction(e){await S.commands.executeCommand("clawpilot.openChat"),await new Promise(t=>setTimeout(t,150)),this._view?.webview.postMessage({type:"injectPrompt",text:e}),this._view?.webview.postMessage({type:"submitPrompt"})}setHistoryStore(e){this._historyStore=e;let t=e.getOrCreateActiveSession();this._activeSessionId=t.id,this._view&&this._sendHistoryToWebview(t)}switchSession(e){this._activeSessionId=e.id,this._historyStore?.setActiveSession(e.id),this._sendHistoryToWebview(e)}setContextRegistry(e){this._contextRegistry=e}clearWebviewMessages(){this._chatHistory=[],this._view?.webview.postMessage({type:"clearMessages"})}_sendHistoryToWebview(e){let t=e.messages.map(s=>s.role==="assistant"?{role:s.role,content:s.content,html:I(s.content)}:s);this._view?.webview.postMessage({type:"loadHistory",sessionName:e.name,messages:t}),this._chatHistory=e.messages.slice(-40).map(s=>({role:s.role,content:s.content}))}async _handleMessage(e){switch(e.type){case"sendMessage":await this._handleUserMessage(e.text,e.codeContext,e.files,e.agentMode);break;case"changeModel":S.workspace.getConfiguration("clawpilot").update("model",e.model,!0);break;case"clearChat":this._chatHistory=[],this._pendingPlanMessages=null;break;case"insertCode":this._insertCodeToEditor(e.code);break;case"getModels":await this._refreshModels();break;case"getConnectionStatus":await this._checkConnection();break;case"getSelectionContext":this._sendSelectionContext();break;case"getWorkspaceFiles":await this._sendWorkspaceFiles(e.query);break;case"confirmPlan":await this._executePlan();break;case"rejectPlan":this._pendingPlanMessages=null,this._view?.webview.postMessage({type:"planRejected"});break;case"stopAgent":this._agentRunner.stop(),this._isAgentRunning=!1;break;case"cancelAgent":this._isAgentRunning=!1;break;case"reindexWorkspace":await this._reindexWorkspace();break;case"getIndexStatus":this._sendIndexStatus();break;case"getMemory":await this._sendMemoryData();break;case"updateCore":e.patch!=null&&(await this._memoryStore.updateCoreMemory(e.patch),await this._sendMemoryData());break;case"addSkillFromChat":e.name!=null&&e.desc!=null&&e.content!=null&&(await this._skillStore.addSkill(e.name,e.desc,e.content,e.tags?.split(",").map(t=>t.trim()).filter(Boolean)),await this._sendMemoryData());break;case"deleteSkill":e.id!=null&&(await this._skillStore.deleteSkill(e.id),await this._sendMemoryData());break;case"approveDiff":this._agentRunner.resolveDiff(e.stepId,!0);break;case"rejectDiff":this._agentRunner.resolveDiff(e.stepId,!1);break;case"runCommand":typeof e.command=="string"&&S.commands.executeCommand(e.command);break}}async _sendMemoryData(){if(!this._view)return;let e=this._memoryStore.getCoreMemory(),t=this._skillStore.listSkills();this._view.webview.postMessage({type:"memoryData",core:{projectContext:e.projectContext,userPreferences:e.userPreferences,keyFacts:e.keyFacts},recallCount:this._memoryStore.getRecallCount(),archivalCount:this._memoryStore.getArchivalCount(),skills:t.map(s=>({id:s.id,name:s.name,description:s.description}))})}_sendIndexStatus(){if(!this._view)return;let e=this._workspaceIndex.status,t=e.isIndexing?"Indexing workspace...":e.chunkCount>0?`${e.chunkCount} chunks indexed`:"Not indexed";this._view.webview.postMessage({type:"indexStatus",indexing:e.isIndexing,message:t,chunkCount:e.chunkCount})}async _reindexWorkspace(){if(!this._view)return;this._view.webview.postMessage({type:"indexStatus",indexing:!0,message:"Indexing workspace..."}),await this._workspaceIndex.indexAll((t,s)=>{this._view?.webview.postMessage({type:"indexStatus",indexing:!0,message:t,fileCount:s})});let e=this._workspaceIndex.status;this._view.webview.postMessage({type:"indexStatus",indexing:!1,message:e.chunkCount>0?`${e.chunkCount} chunks indexed`:"Not indexed",chunkCount:e.chunkCount})}async _handleUserMessage(e,t,s,o){if(this._isAgentRunning){this._view?.webview.postMessage({type:"error",message:"Agent is already running. Wait or click Stop."});return}let n=e,i=Gt(e);if(i){let{command:h,arg:f}=i;switch(h.name){case"help":{let x=`**Available slash commands:**

`+He.map(b=>`- \`${b.usage}\` \u2014 ${b.description}`).join(`
`);this._view?.webview.postMessage({type:"assistantMessage",html:I(x)});return}case"clear":this._historyStore&&this._activeSessionId&&this._historyStore.clearMessages(this._activeSessionId),this.clearWebviewMessages();return;case"new":{if(!this._historyStore)return;let x=this._historyStore.createSession(f||void 0);this.switchSession(x);return}case"commit":{if(!f.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:I("Usage: `/commit <message>`")});return}n=`Use git_commit with addAll=true and message="${f.trim()}". Then confirm the commit was successful.`;break}case"search":{if(!f.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:I("Usage: `/search <query>`")});return}n=`Search the workspace for: ${f.trim()}. Use semantic_search to find relevant code and summarise the top results.`;break}case"explain":await S.commands.executeCommand("clawpilot.explain");return;case"fix":await S.commands.executeCommand("clawpilot.fix");return;case"tests":await S.commands.executeCommand("clawpilot.add_tests");return;case"status":n=h.expandTo;break;case"model":{if(!f.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:I("Usage: `/model <name>` \u2014 e.g. `/model codellama`")});return}await S.workspace.getConfiguration("clawpilot").update("model",f.trim(),S.ConfigurationTarget.Global),this._view?.webview.postMessage({type:"setModel",model:f.trim()}),this._view?.webview.postMessage({type:"assistantMessage",html:I(`Switched model to \`${f.trim()}\`.`)});return}case"install":{let x=f.trim();if(!x){this._view?.webview.postMessage({type:"assistantMessage",html:I("Usage: `/install <model>` \u2014 e.g. `/install qwen2.5-coder:7b`")});return}await this._handleInstallModel(x);return}case"skills":{let x=this._skillStore.listSkills(),b=x.filter(P=>P.isBuiltin),T=x.filter(P=>!P.isBuiltin),E=`**Built-in skills**

`;E+=b.map(P=>`- **${P.name}** \u2014 ${P.description}`).join(`
`),E+=`

**Your saved skills**

`,E+=T.length>0?T.map(P=>`- **${P.name}** \u2014 ${P.description}`).join(`
`):"_None yet. Save skills from the chat to reuse them._",this._view?.webview.postMessage({type:"assistantMessage",html:I(E)});return}default:break}}let a=S.workspace.getConfiguration("clawpilot"),l=a.get("model","llama3"),c=a.get("systemPrompt",""),d=i?null:e.match(/^\/(\w+)\s*(.*)/s),p=["plan","edit","fix","run","test","refactor","build","review","optimize","types"],u=o??a.get("agentMode",!0);d&&(n=this._expandSlashCommand(d[1],d[2],t),p.includes(d[1])&&(u=!0)),n=await this._resolveMentionsInMessage(n);let g=n,v=[];if(this._contextRegistry)try{let h=await this._contextRegistry.assemble(n,8e3);h.text&&h.text.trim()&&(g=h.text+`

`+g,v.push(...h.sources))}catch{}if(t&&!g.includes(t)&&(g=g+"\n\n**Selected code:**\n```"+this._getEditorLang()+`
`+t+"\n```",v.includes("selection")||v.push("selection")),s&&s.length>0){let h=S.workspace.workspaceFolders;if(h)for(let f of s)try{let x=Ke.join(h[0].uri.fsPath,f),T=(await S.workspace.openTextDocument(x)).getText().slice(0,1e4);g+=`

**@${f}:**
\`\`\`
${T}
\`\`\``}catch{}v.includes("files")||v.push("files")}let y=[];if(u)y.push({role:"system",content:Q.getToolsSystemPrompt()});else{let h=c||"You are an expert coding assistant. Be concise, accurate, and helpful.";y.push({role:"system",content:h})}y.push(...this._chatHistory),y.push({role:"user",content:g}),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"user",content:e,timestamp:Date.now()}),this._view?.webview.postMessage({type:"userMessage",text:e,contextTypes:v}),u?await this._runAgent(y,l,e,n):await this._runChat(y,l,e,n)}_getEditorLang(){return S.window.activeTextEditor?.document.languageId||""}async _runChat(e,t,s,o){this._isAgentRunning=!0;let n="";this._view?.webview.postMessage({type:"startAssistantMessage"});try{for await(let i of this._client.streamChat(e,t))n+=i,this._view?.webview.postMessage({type:"streamChunk",chunk:i});this._view?.webview.postMessage({type:"finalizeAssistantMessage",html:I(n)}),this._pushHistory(s,n),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"assistant",content:n,timestamp:Date.now()}),await this._autoSaveRecall(s,n,t)}catch(i){this._view?.webview.postMessage({type:"error",message:i instanceof Error?i.message:String(i)})}finally{this._isAgentRunning=!1}}async _runAgent(e,t,s,o){this._isAgentRunning=!0,this._view?.webview.postMessage({type:"agentStart"});let n="",i=0,a=l=>{switch(l.type){case"thinking":this._view?.webview.postMessage({type:"agentThinking"});break;case"response":n+=l.content,this._view?.webview.postMessage({type:"streamChunk",chunk:l.content});break;case"tool_call":i++,this._view?.webview.postMessage({type:"agentToolCall",toolName:l.toolName,toolArgs:l.toolArgs,step:i}),n="";break;case"tool_result":this._view?.webview.postMessage({type:"agentToolResult",toolName:l.toolName,output:l.content,success:l.success,step:i});break;case"reflection":this._view?.webview.postMessage({type:"agentReflection",content:l.content,attempt:l.attempt??0});break;case"diff_preview":l.diff&&l.stepId&&this._view?.webview.postMessage({type:"agentDiffPreview",stepId:l.stepId,path:l.diff.path,isNew:l.diff.isNew,html:Et(l.diff.lines)});break;case"plan":this._pendingPlanMessages=e,this._view?.webview.postMessage({type:"agentPlan",plan:l.content,html:I(l.content)});break;case"done":case"error":this._view?.webview.postMessage({type:"agentDone",html:I(n||l.content),error:l.type==="error"?l.content:void 0});break}};try{let l=S.workspace.getConfiguration("clawpilot").get("diffPreviewEnabled",!0);await this._agentRunner.run({messages:e,model:t,onStep:a,diffPreviewEnabled:l}),this._pushHistory(s,n),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"assistant",content:n,timestamp:Date.now()}),await this._autoSaveRecall(s,n,t)}catch(l){this._view?.webview.postMessage({type:"error",message:l instanceof Error?l.message:String(l)})}finally{this._isAgentRunning=!1}}async _autoSaveRecall(e,t,s){if(S.workspace.getConfiguration("clawpilot").get("autoSaveMemory",!0))try{let n=`User asked: ${e.slice(0,200)} | Response summary: ${t.slice(0,300)}`,i=this._getEditorLang(),a=[s,i].filter(Boolean);await this._memoryStore.addRecall(n,"auto",a)}catch{}}async _executePlan(){if(!this._pendingPlanMessages)return;let t=S.workspace.getConfiguration("clawpilot").get("model","llama3"),s=this._pendingPlanMessages;this._pendingPlanMessages=null,this._view?.webview.postMessage({type:"planExecuting"}),await this._runAgent([...s,{role:"user",content:"Plan approved. Execute all steps now."}],t,"Plan execution","Plan approved. Execute all steps now.")}_pushHistory(e,t){this._chatHistory.push({role:"user",content:e}),this._chatHistory.push({role:"assistant",content:t}),this._chatHistory.length>40&&(this._chatHistory=this._chatHistory.slice(-40))}static{this.MENTION_PATTERN=/@(\w+)(?::([^\s]*))?/g}async _resolveMentionsInMessage(e){let t=[...e.matchAll(r.MENTION_PATTERN)];if(t.length===0)return e;let s=[];for(let n of t){let i=n[0],a=await Wt(i,this._workspaceIndex,this._memoryStore);s.push({index:n.index,length:i.length,content:a?a.content:`[mention not found: ${i}]`})}s.sort((n,i)=>i.index-n.index);let o=e;for(let n of s)o=o.slice(0,n.index)+n.content+o.slice(n.index+n.length);return o}_expandSlashCommand(e,t,s){let o=s?`

Code:
\`\`\`
${s}
\`\`\``:"";switch(e){case"explain":return`Explain this code clearly.${o}${t?`

`+t:""}`;case"fix":return`Find and fix all bugs. Show corrected code with explanations.${o}${t?`
Context: `+t:""}`;case"refactor":return`Refactor for better readability, performance, and maintainability.${o}${t?`
Focus: `+t:""}`;case"test":return`Write comprehensive unit tests.${o}${t?`
Framework: `+t:""}`;case"docs":return`Generate thorough documentation for this code.${o}`;case"plan":return`Create a detailed step-by-step plan to: ${t||"implement this feature"}${o}

Output the plan inside a <plan>...</plan> block.`;case"edit":return`Make the following changes: ${t}${o}`;case"build":return`Build this feature: ${t}${o}. Read relevant files first, then implement.`;case"run":return`Run this command and show me the output: ${t}`;case"review":return`Do a thorough code review. Check for bugs, security issues, performance, and style.${o}`;case"optimize":return`Optimize for performance. Identify bottlenecks and improve them.${o}`;case"types":return`Add proper TypeScript types and interfaces.${o}`;default:return`/${e} ${t}`}}async _refreshModels(){try{let e=await this._client.listModels(),s=S.workspace.getConfiguration("clawpilot").get("model","llama3");this._view?.webview.postMessage({type:"models",models:e,current:s});let o=await this._client.isAvailable();this._view?.webview.postMessage({type:"providerModelStatus",providerLabel:this._client.displayName,model:s||"",connected:o})}catch{this._view?.webview.postMessage({type:"models",models:[],current:""}),this._view?.webview.postMessage({type:"providerModelStatus",providerLabel:this._client.displayName,model:"",connected:!1})}}async _checkConnection(){let e=await this._client.isAvailable(),s=S.workspace.getConfiguration("clawpilot").get("model","");this._view?.webview.postMessage({type:"connectionStatus",connected:e}),this._view?.webview.postMessage({type:"providerModelStatus",providerLabel:this._client.displayName,model:s||"",connected:e})}async _handleInstallModel(e){if(!this._client.pullModel){this._view?.webview.postMessage({type:"assistantMessage",html:I("`/install` is only available for the **Ollama** provider. Switch provider in the header or settings.")});return}this._view?.webview.postMessage({type:"installStart",model:e});let t=(0,Ut.spawn)("ollama",["pull",e],{shell:!0,windowsHide:!0}),s=[];t.stdout?.on("data",o=>{let n=o.toString().trim();n&&(s.push(n),this._view?.webview.postMessage({type:"installProgress",line:n}))}),t.stderr?.on("data",o=>{let n=o.toString().trim();n&&(s.push(n),this._view?.webview.postMessage({type:"installProgress",line:n}))}),t.on("close",async o=>{o===0?(await S.workspace.getConfiguration("clawpilot").update("model",e,S.ConfigurationTarget.Global),this._view?.webview.postMessage({type:"setModel",model:e}),this._view?.webview.postMessage({type:"installDone",model:e,success:!0})):this._view?.webview.postMessage({type:"installDone",model:e,success:!1,error:`Exit code ${o}`})})}_sendSelectionContext(){let e=S.window.activeTextEditor;if(!e||e.selection.isEmpty){this._view?.webview.postMessage({type:"selectionContext",text:"",lang:""});return}let t=e.document.getText(e.selection),s=e.document.languageId;this._view?.webview.postMessage({type:"selectionContext",text:t,lang:s})}async _sendWorkspaceFiles(e){let t=S.workspace.workspaceFolders;if(!t){this._view?.webview.postMessage({type:"workspaceFiles",files:[]});return}let s=e?`**/*${e}*`:"**/*",n=(await S.workspace.findFiles(s,"**/node_modules/**",50)).map(i=>Ke.relative(t[0].uri.fsPath,i.fsPath));this._view?.webview.postMessage({type:"workspaceFiles",files:n})}_insertCodeToEditor(e){let t=S.window.activeTextEditor;if(!t){S.window.showErrorMessage("No active editor to insert code into");return}t.edit(s=>{t.selection.isEmpty?s.insert(t.selection.active,e):s.replace(t.selection,e)})}_getHtml(){let e=io();return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${e}'; script-src 'nonce-${e}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClawPilot</title>
<style nonce="${e}">
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background);display:flex;flex-direction:column;height:100vh;overflow:hidden}
/* \u2500\u2500 Top bar \u2500\u2500 */
.topbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0;min-height:36px}
.status-dot{width:7px;height:7px;border-radius:50%;background:#555;flex-shrink:0;transition:background .25s}
.status-dot.ok{background:#4ade80}
.provider-btn{flex:1;font-size:12px;font-weight:600;cursor:pointer;background:none;border:none;color:var(--vscode-foreground);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 4px;border-radius:4px}
.provider-btn:hover{background:var(--vscode-toolbar-hoverBackground)}
.icon-btn{background:none;border:none;cursor:pointer;padding:4px 5px;color:var(--vscode-foreground);opacity:.7;font-size:14px;border-radius:4px;flex-shrink:0;line-height:1}
.icon-btn:hover{opacity:1;background:var(--vscode-toolbar-hoverBackground)}
.session-name{font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:13px}
/* \u2500\u2500 Toolbar: model + mode \u2500\u2500 */
.toolbar{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0}
.model-select{flex:1;min-width:0;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border);padding:3px 6px;border-radius:5px;font-size:11px;cursor:pointer;outline:none}
.mode-group{display:flex;gap:2px;flex-shrink:0}
.mode-btn{font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--vscode-panel-border);background:none;color:var(--vscode-descriptionForeground);white-space:nowrap;transition:all .15s}
.mode-btn.active-agent{background:#7c3aed;color:#fff;border-color:#7c3aed}
.mode-btn.active-ask{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
/* \u2500\u2500 Status bar \u2500\u2500 */
.status-bar{display:flex;align-items:center;gap:4px;padding:2px 10px;border-bottom:1px solid var(--vscode-panel-border);font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0}
.index-info{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.index-info.indexing::before{content:'';display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:middle;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.text-btn{background:none;border:none;cursor:pointer;font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 4px;border-radius:3px;white-space:nowrap}
.text-btn:hover{color:var(--vscode-foreground);background:var(--vscode-toolbar-hoverBackground)}
/* \u2500\u2500 Memory panel \u2500\u2500 */
.memory-panel{display:none;padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editor-inactiveSelectionBackground,rgba(0,0,0,.06));font-size:11px;max-height:220px;overflow-y:auto}
.memory-panel.open{display:block}
.memory-panel label{display:block;margin-top:6px;margin-bottom:2px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.7}
.memory-panel textarea{width:100%;min-height:44px;max-height:70px;padding:5px;font-size:11px;resize:vertical;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none}
.key-facts-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.key-fact-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:8px;background:var(--vscode-badge-background);font-size:10px}
.key-fact-tag button{background:none;border:none;cursor:pointer;padding:0;opacity:.7;font-size:11px}
.skills-list{margin-top:4px}
.skill-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--vscode-panel-border)}
.skill-row button{font-size:10px;padding:1px 5px}
.mem-save-btn{margin-top:8px;padding:4px 10px;font-size:11px}
/* \u2500\u2500 Setup empty state \u2500\u2500 */
.empty-setup{display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center}
.empty-setup.visible{display:flex}
.empty-setup-title{font-size:13px;font-weight:600}
.empty-setup-sub{font-size:11px;opacity:.75;line-height:1.5}
/* \u2500\u2500 Messages area \u2500\u2500 */
.messages{flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:10px}
.messages::-webkit-scrollbar{width:3px}
.messages::-webkit-scrollbar-thumb{background:var(--vscode-scrollbarSlider-background);border-radius:2px}
/* \u2500\u2500 Welcome state \u2500\u2500 */
.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px}
.empty-icon{font-size:28px}
.empty-title{font-size:14px;font-weight:700}
.empty-sub{font-size:11px;text-align:center;opacity:.65;line-height:1.5}
.quick-actions{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:2px}
.quick-btn{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:5px 11px;border-radius:10px;cursor:pointer;font-size:11px}
.quick-btn:hover{background:var(--vscode-button-secondaryHoverBackground)}
/* \u2500\u2500 Message bubbles \u2500\u2500 */
.message{display:flex;flex-direction:column;gap:3px;max-width:100%}
.message.user{align-items:flex-end}
.message.assistant{align-items:flex-start}
.ctx-tags{font-size:9px;color:var(--vscode-descriptionForeground);display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:1px}
.ctx-tag{background:var(--vscode-badge-background);padding:1px 5px;border-radius:4px;opacity:.8}
.bubble{padding:7px 11px;border-radius:12px;max-width:94%;word-break:break-word;line-height:1.55;font-size:13px}
.user .bubble{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-bottom-right-radius:3px}
.assistant .bubble{background:var(--vscode-editor-inactiveSelectionBackground,var(--vscode-list-hoverBackground));border-bottom-left-radius:3px}
/* \u2500\u2500 Agent steps \u2500\u2500 */
.agent-steps{display:flex;flex-direction:column;gap:5px;width:100%;margin-bottom:5px}
.agent-step{display:flex;align-items:flex-start;gap:7px;padding:5px 9px;border-radius:7px;font-size:11px;background:var(--vscode-list-hoverBackground);border-left:3px solid #7c3aed}
.agent-step.success{border-left-color:#4ade80}
.agent-step.failure{border-left-color:#f87171}
.agent-step.reflection{border-left-color:#fbbf24}
.step-icon{font-size:12px;flex-shrink:0;margin-top:1px}
.step-body{flex:1;min-width:0}
.step-title{font-weight:600}
.step-detail{color:var(--vscode-descriptionForeground);font-size:10px;white-space:pre-wrap;word-break:break-all;margin-top:2px;max-height:2.2em;overflow:hidden;cursor:pointer}
.step-detail.expanded{max-height:100px;overflow-y:auto}
/* \u2500\u2500 Diff block \u2500\u2500 */
.diff-block{border:1px solid var(--vscode-panel-border);border-radius:8px;overflow:hidden;width:100%;margin:3px 0;font-family:monospace;font-size:11px}
.diff-header{background:rgba(124,58,237,.12);padding:5px 9px;font-size:11px;font-weight:600;color:#a78bfa;display:flex;justify-content:space-between;align-items:center}
.diff-body{max-height:180px;overflow-y:auto;background:var(--vscode-editor-background)}
.diff-line{padding:1px 9px;white-space:pre}
.diff-add{background:rgba(74,222,128,.1);color:#4ade80}
.diff-remove{background:rgba(248,113,113,.1);color:#f87171}
.diff-context{color:var(--vscode-descriptionForeground)}
.diff-actions{display:flex;gap:5px;padding:5px 9px;border-top:1px solid var(--vscode-panel-border)}
.btn-approve-diff{background:#4ade80;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
.btn-reject-diff{background:#f87171;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
/* \u2500\u2500 Plan block \u2500\u2500 */
.plan-block{border:1px solid #7c3aed;border-radius:10px;overflow:hidden;width:100%;margin:3px 0}
.plan-header{background:rgba(124,58,237,.12);padding:7px 11px;font-size:12px;font-weight:600;color:#a78bfa}
.plan-content{padding:9px 11px;font-size:12px}
.plan-actions{display:flex;gap:7px;padding:7px 11px;border-top:1px solid rgba(124,58,237,.3)}
.btn-approve{background:#7c3aed;color:#fff;border:none;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600}
.btn-approve:hover{background:#6d28d9}
.btn-reject{background:none;color:var(--vscode-foreground);border:1px solid var(--vscode-panel-border);padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px}
/* \u2500\u2500 Code blocks \u2500\u2500 */
.code-block{position:relative;margin:6px 0}
.code-lang{font-size:9px;color:var(--vscode-descriptionForeground);padding:3px 9px 0;font-family:monospace}
.code-block pre{background:var(--vscode-editor-background);padding:9px;border-radius:5px;overflow-x:auto;font-size:11.5px;font-family:var(--vscode-editor-font-family,monospace);border:1px solid var(--vscode-panel-border);white-space:pre;line-height:1.5}
.code-actions{position:absolute;top:5px;right:5px;display:flex;gap:3px;opacity:0;transition:opacity .15s}
.code-block:hover .code-actions{opacity:1}
.code-actions button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:2px 7px;border-radius:3px;cursor:pointer;font-size:10px}
/* \u2500\u2500 Thinking \u2500\u2500 */
.thinking{display:flex;align-items:center;gap:7px;padding:3px 0;font-size:12px;color:var(--vscode-descriptionForeground)}
.thinking-dots{display:flex;gap:3px}
.thinking-dots span{width:4px;height:4px;border-radius:50%;background:currentColor;animation:bounce 1.2s infinite}
.thinking-dots span:nth-child(2){animation-delay:.2s}
.thinking-dots span:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
/* \u2500\u2500 Slash / file popups \u2500\u2500 */
.popup{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;box-shadow:0 -4px 16px rgba(0,0,0,.35);max-height:200px;overflow-y:auto;z-index:100}
.popup.open{display:block}
.popup-item{display:flex;align-items:baseline;gap:8px;padding:6px 11px;cursor:pointer;font-size:12px}
.popup-item:hover,.popup-item.hi{background:var(--vscode-list-hoverBackground)}
.p-cmd{font-weight:700;color:#a78bfa;min-width:72px;flex-shrink:0}
.p-desc{color:var(--vscode-descriptionForeground);font-size:11px}
.file-item{padding:5px 11px;cursor:pointer;font-size:11px}
.file-item:hover,.file-item.hi{background:var(--vscode-list-hoverBackground)}
/* \u2500\u2500 @mention popup \u2500\u2500 */
.mention-pop{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;z-index:100;box-shadow:0 -4px 12px rgba(0,0,0,.3);padding:6px 8px;flex-wrap:wrap;gap:5px}
.mention-pop.open{display:flex}
.m-pill{padding:3px 9px;border-radius:12px;font-size:11px;cursor:pointer;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);border:1px solid var(--vscode-panel-border)}
.m-pill:hover{background:var(--vscode-list-hoverBackground)}
/* \u2500\u2500 Context bar \u2500\u2500 */
.ctx-bar{display:flex;align-items:center;gap:6px;padding:3px 10px;font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0;border-top:1px solid var(--vscode-panel-border)}
.ctx-track{width:56px;height:4px;border-radius:2px;background:rgba(128,128,128,.2);flex-shrink:0;overflow:hidden}
.ctx-fill{height:100%;border-radius:2px;background:#4ade80;width:0%;transition:width .3s,background .3s}
.ctx-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.sel-pill{display:none;align-items:center;gap:3px;padding:1px 7px;background:var(--vscode-badge-background);border-radius:8px;font-size:10px;flex-shrink:0}
.sel-pill.on{display:flex}
/* \u2500\u2500 Input area \u2500\u2500 */
.input-area{padding:4px 8px 8px;flex-shrink:0}
.input-wrap{position:relative}
.input-box{display:flex;align-items:flex-end;gap:5px;background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));border-radius:10px;padding:5px 6px;transition:border-color .15s}
.input-box:focus-within{border-color:var(--vscode-focusBorder)}
.input-box textarea{flex:1;background:none;border:none;outline:none;resize:none;color:var(--vscode-input-foreground);font-family:inherit;font-size:13px;line-height:1.5;max-height:160px;min-height:22px;padding:2px 2px}
.send-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:15px;flex-shrink:0;height:30px;line-height:1}
.send-btn:hover{background:var(--vscode-button-hoverBackground)}
.send-btn:disabled{opacity:.35;cursor:not-allowed}
.stop-btn{background:#ef4444;color:#fff;border:none;border-radius:7px;padding:5px 11px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0;height:30px;display:none;white-space:nowrap}
.stop-btn:hover{background:#dc2626}
.stop-btn:disabled{opacity:.5}
.char-ct{font-size:9px;color:var(--vscode-descriptionForeground);text-align:right;padding:1px 3px 0}
/* \u2500\u2500 Typography \u2500\u2500 */
p{margin:3px 0}h1,h2,h3{margin:7px 0 3px}ul,ol{padding-left:16px}li{margin:2px 0}
code{background:var(--vscode-textCodeBlock-background);padding:1px 4px;border-radius:3px;font-size:11px}
strong{font-weight:700}em{font-style:italic}a{color:var(--vscode-textLink-foreground)}
</style>
</head>
<body>
<!-- Top bar -->
<div class="topbar">
  <span class="status-dot" id="statusDot"></span>
  <button class="provider-btn" id="providerBadge" title="Change provider">ClawPilot</button>
  <span style="font-size:9px;opacity:.45;flex-shrink:0">v2</span>
  <button class="icon-btn" id="setupBtn" title="Settings">&#9881;</button>
  <button class="icon-btn" id="newSessionBtn" title="New chat">&#43;</button>
</div>
<div id="session-name" class="session-name"></div>
<!-- Model + Mode toolbar -->
<div class="toolbar">
  <select id="modelSelect" class="model-select" title="Select model"></select>
  <div class="mode-group">
    <button class="mode-btn active-agent" id="modeAgentBtn" title="Agent: multi-step, uses tools">&#9889; Agent</button>
    <button class="mode-btn" id="modeAskBtn" title="Ask: single reply, no tools">&#128172; Ask</button>
  </div>
</div>
<!-- Status bar -->
<div class="status-bar">
  <span class="index-info" id="indexStatus"></span>
  <button class="text-btn" id="reindexBtn">&#8635; Re-index</button>
  <span style="opacity:.4">&#183;</span>
  <button class="text-btn" id="memoryBtn">&#129504; Memory</button>
</div>
<!-- Memory panel (hidden by default) -->
<div class="memory-panel" id="memoryPanel">
  <label>Project context <span style="font-weight:400;opacity:.6">(max 500)</span></label>
  <textarea id="memProjectContext" maxlength="500" placeholder="Project description, tech stack..."></textarea>
  <label>User preferences <span style="font-weight:400;opacity:.6">(max 300)</span></label>
  <textarea id="memUserPreferences" maxlength="300" placeholder="Coding style, preferences..."></textarea>
  <label>Key facts</label>
  <div class="key-facts-list" id="keyFactsList"></div>
  <input type="text" id="newKeyFact" placeholder="Add a fact &#8594; Enter to save" maxlength="100"
    style="width:100%;margin-top:5px;padding:4px 6px;font-size:11px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none">
  <label>Skills</label>
  <div class="skills-list" id="skillsList"></div>
  <button type="button" class="mem-save-btn btn-approve" id="memorySaveBtn">Save Memory</button>
</div>
<!-- Messages -->
<div class="messages" id="messages">
  <div class="empty-setup" id="emptyStateNoSetup">
    <div class="empty-icon">&#128268;</div>
    <div class="empty-setup-title">No model connected</div>
    <div class="empty-setup-sub">Start Ollama, or add an API key for a cloud provider.</div>
    <button type="button" class="quick-btn" id="setupEmptyBtn">&#9881; Open Setup</button>
  </div>
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">&#129302;</div>
    <div class="empty-title">ClawPilot</div>
    <div class="empty-sub">Local AI &#183; Privacy-first &#183; No cloud required<br>Type <strong>/</strong> for commands &#183; <strong>@</strong> to attach files</div>
    <div class="quick-actions">
      <button type="button" class="quick-btn" data-cmd="/explain">Explain</button>
      <button type="button" class="quick-btn" data-cmd="/fix">Fix bugs</button>
      <button type="button" class="quick-btn" data-cmd="/refactor">Refactor</button>
      <button type="button" class="quick-btn" data-cmd="/test">Write tests</button>
      <button type="button" class="quick-btn" data-cmd="/plan ">Plan feature</button>
      <button type="button" class="quick-btn" data-cmd="/review">Review</button>
    </div>
  </div>
</div>
<!-- Context usage bar -->
<div class="ctx-bar">
  <div class="ctx-track"><div class="ctx-fill" id="ctxFill"></div></div>
  <span class="ctx-label" id="ctxLabel">0 tokens</span>
  <span class="sel-pill" id="selBadge">&#128206; <span id="selLabel">selection</span></span>
</div>
<!-- Input + Popups (popups positioned relative to input-area) -->
<div class="input-area" style="position:relative">
  <div class="popup" id="slashPop"></div>
  <div class="popup" id="filePop"></div>
  <div class="popup" id="cmdMenu"></div>
  <div class="mention-pop" id="mentionPop"></div>
  <div class="input-box">
    <textarea id="msgInput" placeholder="Ask anything...  / commands  @ files" rows="1"></textarea>
    <button class="stop-btn" id="stopBtn" title="Stop generation">&#9632; Stop</button>
    <button class="send-btn" id="sendBtn" title="Send (Enter)">&#9658;</button>
  </div>
  <div class="char-ct" id="charCt">0</div>
</div>
<script nonce="${e}">
const vscode = acquireVsCodeApi();
let agentMode=true, running=false, selText='', selLang='';
let curBubble=null, curSteps=null, attachedFiles=[];
let slashIdx=-1, fileIdx=-1;
let convTokens=0, ctxLimit=32768;
let needSetup=true, allCmds=[];

/* \u2500\u2500 Context limit estimates \u2500\u2500 */
const MODEL_CTX={
  'llama3.3':131072,'llama3.2':131072,'llama3.1':131072,'llama3':8192,
  'phi4':16384,'phi3.5':131072,'phi3':131072,
  'mistral':32768,'mixtral':32768,
  'codellama':16384,'deepseek':65536,
  'qwen2.5':131072,'qwen2':32768,'qwen':32768,
  'gemma3':131072,'gemma2':8192,'gemma':8192,
  'llava':8192,'starcoder2':16384,'starcoder':8192,
  'wizardcoder':16384,'solar':4096,'vicuna':4096,
};
function getCtxLimit(m){
  if(!m)return 32768;
  const b=m.split(':')[0].toLowerCase();
  for(const[k,v]of Object.entries(MODEL_CTX))if(b.includes(k))return v;
  return 32768;
}
function countTok(t){return Math.ceil((t||'').length/3.5);}
function fmtTok(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function updateCtx(){
  const pct=Math.min(100,(convTokens/ctxLimit)*100);
  const f=document.getElementById('ctxFill'),l=document.getElementById('ctxLabel');
  if(f)f.style.cssText='width:'+pct+'%;background:'+(pct<60?'#4ade80':pct<85?'#fbbf24':'#f87171');
  if(l)l.textContent=fmtTok(convTokens)+' / '+fmtTok(ctxLimit)+' tokens';
}

const SLASH=[
  {cmd:'/explain',desc:'Explain selected code'},
  {cmd:'/fix',desc:'Find and fix bugs'},
  {cmd:'/refactor',desc:'Refactor for quality'},
  {cmd:'/test',desc:'Write unit tests'},
  {cmd:'/docs',desc:'Generate documentation'},
  {cmd:'/review',desc:'Code review'},
  {cmd:'/optimize',desc:'Optimize performance'},
  {cmd:'/plan',desc:'Build step-by-step plan (agent)'},
  {cmd:'/edit',desc:'Describe changes to make (agent)'},
  {cmd:'/build',desc:'Build a new feature (agent)'},
  {cmd:'/run',desc:'Run terminal command (agent)'},
  {cmd:'/types',desc:'Add TypeScript types'},
];
const MENTIONT=[{type:'file',label:'file'},{type:'git',label:'git'},{type:'symbol',label:'symbol'},{type:'memory',label:'memory'},{type:'workspace',label:'workspace'}];

const $=id=>document.getElementById(id);
const msgs=$('messages'), inp=$('msgInput'), sendBtn=$('sendBtn'), stopBtn=$('stopBtn');
const statusDot=$('statusDot'), modelSel=$('modelSelect');
const selBadge=$('selBadge'), slashPop=$('slashPop'), filePop=$('filePop');
const emptyState=$('emptyState'), emptyNoSetup=$('emptyStateNoSetup'), sessionNameEl=$('session-name');
const charCt=$('charCt'), cmdMenu=$('cmdMenu'), mentionPop=$('mentionPop');

/* init */
vscode.postMessage({type:'getConnectionStatus'});
vscode.postMessage({type:'getModels'});
vscode.postMessage({type:'getIndexStatus'});
vscode.postMessage({type:'getMemory'});
setInterval(()=>vscode.postMessage({type:'getSelectionContext'}),1500);

/* \u2500\u2500 Mode toggle \u2500\u2500 */
const modeA=$('modeAgentBtn'), modeQ=$('modeAskBtn');
function setMode(a){
  agentMode=a;
  modeA.className='mode-btn'+(a?' active-agent':'');
  modeQ.className='mode-btn'+(!a?' active-ask':'');
}
modeA.onclick=()=>setMode(true);
modeQ.onclick=()=>setMode(false);

/* \u2500\u2500 Top bar buttons \u2500\u2500 */
$('providerBadge').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.selectProvider'});
$('setupBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('newSessionBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.newSession'});
if($('setupEmptyBtn'))$('setupEmptyBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('reindexBtn').onclick=()=>vscode.postMessage({type:'reindexWorkspace'});
$('memoryBtn').onclick=()=>{const p=$('memoryPanel');p.classList.toggle('open',!p.classList.contains('open'));};
$('memorySaveBtn').onclick=()=>{
  const core={projectContext:$('memProjectContext').value,userPreferences:$('memUserPreferences').value,keyFacts:window._kf||[]};
  vscode.postMessage({type:'updateCore',patch:core});
};
$('newKeyFact').onkeydown=e=>{
  if(e.key==='Enter'){const v=$('newKeyFact').value.trim();if(v){(window._kf=window._kf||[]).push(v);$('newKeyFact').value='';renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});}}
};
function renderKF(){
  const el=$('keyFactsList');if(!el)return;
  const f=window._kf||[];
  el.innerHTML=f.map((t,i)=>'<span class="key-fact-tag">'+esc(t)+' <button data-i="'+i+'">\xD7</button></span>').join('');
  el.querySelectorAll('button').forEach(b=>{b.onclick=()=>{(window._kf=window._kf||[]).splice(+b.dataset.i,1);renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});};});
}

modelSel.onchange=()=>{ctxLimit=getCtxLimit(modelSel.value);updateCtx();vscode.postMessage({type:'changeModel',model:modelSel.value});};
stopBtn.onclick=()=>{vscode.postMessage({type:'stopAgent'});stopBtn.disabled=true;stopBtn.textContent='Stopping\u2026';};

document.querySelectorAll('.quick-btn').forEach(b=>{
  b.onclick=()=>{
    const cmd=(b.dataset.cmd||'').trim();
    if(!cmd){inp.focus();return;}
    inp.value=cmd;autoSz();closeSlash();closeFile();
    if(inp.value.trim()&&!running)send();else inp.focus();
  };
});

/* \u2500\u2500 Input events \u2500\u2500 */
inp.addEventListener('input',()=>{
  const v=inp.value,c=inp.selectionStart;
  if(charCt)charCt.textContent=v.length;
  /* New command menu from loaded commands */
  if(v.startsWith('/')&&!v.includes(' ')&&allCmds.length){
    const fil=allCmds.filter(x=>x.name.startsWith(v.slice(1).toLowerCase()));
    if(fil.length&&cmdMenu){
      cmdMenu.innerHTML=fil.map((x,i)=>'<div class="popup-item" data-usage="'+esc(x.usage)+'"><span class="p-cmd">'+esc('/'+x.name)+'</span><span class="p-desc">'+esc(x.description)+'</span></div>').join('');
      cmdMenu.classList.add('open');
      cmdMenu.querySelectorAll('.popup-item').forEach(el=>{
        el.addEventListener('mousedown',e=>{e.preventDefault();const u=el.getAttribute('data-usage')||'';inp.value=u.replace(/<[^>]*>/g,' ').trim()+(u.includes('<')?' ':'');cmdMenu.classList.remove('open');inp.focus();if(charCt)charCt.textContent=inp.value.length;});
      });
    }else if(cmdMenu)cmdMenu.classList.remove('open');
  }else if(cmdMenu)cmdMenu.classList.remove('open');
  autoSz();
  /* Fallback SLASH list */
  const sm=v.match(/^/(w*)$/);
  if(sm&&!allCmds.length){const p=sm[1].toLowerCase();const f=SLASH.filter(s=>s.cmd.slice(1).startsWith(p));if(f.length){renderSlash(f);return;}}
  closeSlash();
  /* @ mentions */
  const am=v.slice(0,c).match(/@(w*)$/);
  if(am){
    const seg=v.slice(0,c).slice(v.slice(0,c).lastIndexOf('@'));
    if(seg.indexOf(':')===-1){
      if(mentionPop){
        mentionPop.innerHTML=MENTIONT.map(m=>'<button class="m-pill" data-type="'+esc(m.type)+'">@'+esc(m.label)+'</button>').join('');
        mentionPop.classList.add('open');
        mentionPop.querySelectorAll('.m-pill').forEach(b=>{
          b.addEventListener('mousedown',function(e){e.preventDefault();
            const tp=this.dataset.type,val=inp.value,pos=inp.selectionStart;
            const st=val.slice(0,pos).lastIndexOf('@');
            const bef=val.slice(0,st),aft=val.slice(pos);
            const ins=tp==='workspace'?'@workspace ':'@'+tp+':';
            inp.value=bef+ins+aft;inp.selectionStart=inp.selectionEnd=bef.length+ins.length;
            mentionPop.classList.remove('open');inp.focus();autoSz();
            if(charCt)charCt.textContent=inp.value.length;
          });
        });
      }
      return;
    }
    vscode.postMessage({type:'getWorkspaceFiles',query:am[1]});
    return;
  }
  if(mentionPop)mentionPop.classList.remove('open');
  closeFile();
});

inp.addEventListener('blur',()=>setTimeout(()=>{
  closeSlash();closeFile();
  if(mentionPop)mentionPop.classList.remove('open');
  if(cmdMenu)cmdMenu.classList.remove('open');
},150));

inp.addEventListener('keydown',e=>{
  const enter=(e.key==='Enter'||e.keyCode===13)&&!e.shiftKey;
  if(slashPop.classList.contains('open')){
    const its=slashPop.querySelectorAll('.popup-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();slashIdx=Math.min(slashIdx+1,its.length-1);hlSlash();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();slashIdx=Math.max(slashIdx-1,0);hlSlash();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,slashIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeSlash();return;}
  }
  if(filePop.classList.contains('open')){
    const its=filePop.querySelectorAll('.file-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();fileIdx=Math.min(fileIdx+1,its.length-1);hlFile();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();fileIdx=Math.max(fileIdx-1,0);hlFile();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,fileIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeFile();return;}
  }
  if(enter){e.preventDefault();e.stopPropagation();send();}
},{capture:true});

function autoSz(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,160)+'px';}

function renderSlash(items){
  if(!items.length){closeSlash();return;}
  slashPop.innerHTML=items.map(it=>'<div class="popup-item" data-cmd="'+it.cmd+'"><span class="p-cmd">'+it.cmd+'</span><span class="p-desc">'+it.desc+'</span></div>').join('');
  slashPop.querySelectorAll('.popup-item').forEach(el=>{el.onclick=()=>{inp.value=el.dataset.cmd+' ';closeSlash();inp.focus();autoSz();};});
  slashIdx=0;hlSlash();slashPop.classList.add('open');
}
function closeSlash(){slashPop.classList.remove('open');slashIdx=-1;}
function hlSlash(){slashPop.querySelectorAll('.popup-item').forEach((el,i)=>{el.classList.toggle('hi',i===slashIdx);if(i===slashIdx)el.scrollIntoView({block:'nearest'});});}

function renderFile(files){
  if(!files.length){closeFile();return;}
  filePop.innerHTML=files.slice(0,20).map(f=>'<div class="file-item" data-f="'+esc(f)+'">'+esc(f)+'</div>').join('');
  filePop.querySelectorAll('.file-item').forEach(el=>{
    el.onclick=()=>{
      const v=inp.value,c=inp.selectionStart;
      inp.value=v.slice(0,c).replace(/@([^s]*)$/,'@'+el.dataset.f+' ')+v.slice(c);
      if(!attachedFiles.includes(el.dataset.f))attachedFiles.push(el.dataset.f);
      closeFile();inp.focus();autoSz();
    };
  });
  fileIdx=0;hlFile();filePop.classList.add('open');
}
function closeFile(){filePop.classList.remove('open');fileIdx=-1;}
function hlFile(){filePop.querySelectorAll('.file-item').forEach((el,i)=>el.classList.toggle('hi',i===fileIdx));}

function send(){
  const text=inp.value.trim();
  if(!text||running)return;
  const code=selText||'',files=[...attachedFiles];
  attachedFiles=[];inp.value='';autoSz();
  closeSlash();closeFile();
  convTokens+=countTok(text);updateCtx();
  vscode.postMessage({type:'sendMessage',text,codeContext:code,files,agentMode});
}
sendBtn.onclick=send;

function setRunning(r){
  running=r;
  sendBtn.disabled=r;
  sendBtn.style.display=r?'none':'inline-block';
  stopBtn.style.display=r?'inline-block':'none';
  if(!r){stopBtn.disabled=false;stopBtn.textContent='\u25A0 Stop';}
}
function agentEnd(){setRunning(false);}

function hideEmpty(){
  emptyState.style.display='none';
  if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

const CTX_SYM={selection:'[sel]',activeFile:'[file]',workspaceRag:'[rag]',gitDiff:'[diff]',diagnostics:'[diag]',memory:'[mem]',skills:'[skill]',files:'[files]'};

function addUser(text,ctxTypes){
  hideEmpty();
  const d=document.createElement('div');d.className='message user';
  d.innerHTML='<div class="bubble">'+esc(text)+'</div>';
  if(ctxTypes&&ctxTypes.length){
    const s=document.createElement('div');s.className='ctx-tags';
    s.innerHTML=ctxTypes.map(t=>'<span class="ctx-tag" title="'+esc(t)+'">'+(CTX_SYM[t]||esc(t))+'</span>').join('');
    d.appendChild(s);
  }
  msgs.appendChild(d);scrollBot();
}

function startAssistant(){
  hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  b.innerHTML='<div class="thinking"><div class="thinking-dots"><span></span><span></span><span></span></div> Thinking\u2026</div>';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;curSteps=null;scrollBot();
}

function streamChunk(chunk){
  if(!curBubble)startAssistant();
  const t=curBubble.querySelector('.thinking');if(t)t.remove();
  let s=curBubble.querySelector('.stream-raw');
  if(!s){s=document.createElement('span');s.className='stream-raw';curBubble.appendChild(s);}
  s.textContent=(s.textContent||'')+chunk;scrollBot();
}

function finalize(html){
  if(!curBubble)return;
  convTokens+=countTok(curBubble.querySelector('.stream-raw')?.textContent||'');updateCtx();
  curBubble.innerHTML=html||'';attachActions(curBubble);curBubble=null;scrollBot();
}

function attachActions(el){
  el.querySelectorAll('.code-block').forEach(block=>{
    const pre=block.querySelector('pre');if(!pre)return;
    const cp=block.querySelector('.copy-btn'),ins=block.querySelector('.insert-btn');
    if(cp)cp.onclick=()=>{navigator.clipboard?.writeText(pre.textContent||'');cp.textContent='Copied!';setTimeout(()=>cp.textContent='Copy',1200);};
    if(ins)ins.onclick=()=>vscode.postMessage({type:'insertCode',code:pre.textContent||''});
  });
}

function agentStart(){
  setRunning(true);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;
  const steps=document.createElement('div');steps.className='agent-steps';
  b.appendChild(steps);curSteps=steps;scrollBot();
}

function addToolCall(name,args,step){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step';s.id='step'+step;
  const argsStr=args?Object.entries(args).map(([k,v])=>k+': '+String(v).slice(0,60)).join(' \xB7 '):'';
  s.innerHTML='<span class="step-icon">\u2699</span><div class="step-body"><div class="step-title">'+esc(name)+'</div>'+(argsStr?'<div class="step-detail">'+esc(argsStr)+'</div>':'')+'</div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function addToolResult(name,output,ok,step){
  const s=document.getElementById('step'+step);if(!s)return;
  s.classList.add(ok?'success':'failure');
  s.querySelector('.step-icon').textContent=ok?'\u2713':'\u2717';
  const d=document.createElement('div');d.className='step-detail';
  d.textContent=(output||'').slice(0,400);d.onclick=()=>d.classList.toggle('expanded');
  s.querySelector('.step-body').appendChild(d);scrollBot();
}

function addReflection(content,attempt){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step reflection';
  s.innerHTML='<span class="step-icon">\u{1F504}</span><div class="step-body"><div class="step-title">Reflecting (attempt '+esc(String(attempt||1))+')</div><div class="step-detail">'+esc(content||'')+'</div></div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function showDiffPreview(stepId,filePath,isNew,html){
  if(!curSteps)agentStart();
  const wrap=document.createElement('div');wrap.className='diff-block';
  wrap.innerHTML='<div class="diff-header"><span>'+(isNew?'\u271A New: ':'~ Edit: ')+esc(filePath)+'</span></div><div class="diff-body">'+html+'</div><div class="diff-actions"><button class="btn-approve-diff">\u2713 Apply</button><button class="btn-reject-diff">\u2715 Reject</button></div>';
  wrap.querySelector('.btn-approve-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#4ade80">Applied.</em>';vscode.postMessage({type:'approveDiff',stepId});};
  wrap.querySelector('.btn-reject-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#f87171">Rejected.</em>';vscode.postMessage({type:'rejectDiff',stepId});};
  curSteps.appendChild(wrap);scrollBot();
}

function showPlan(html){
  setRunning(false);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';b.style.padding='4px';
  const plan=document.createElement('div');plan.className='plan-block';
  plan.innerHTML='<div class="plan-header">\u{1F4CB} Plan \u2014 Review before executing</div><div class="plan-content">'+html+'</div><div class="plan-actions"><button class="btn-approve" id="approveBtn">\u25B6 Execute</button><button class="btn-reject" id="rejectBtn">\u2715 Reject</button></div>';
  b.appendChild(plan);d.appendChild(b);msgs.appendChild(d);curBubble=null;
  plan.querySelector('#approveBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;opacity:.7">Executing\u2026</em>';vscode.postMessage({type:'confirmPlan'});};
  plan.querySelector('#rejectBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;color:#f44336">Rejected.</em>';vscode.postMessage({type:'rejectPlan'});};
  scrollBot();
}

/* \u2500\u2500 Message handler \u2500\u2500 */
window.addEventListener('message',e=>{
  const m=e.data;
  switch(m.type){
    case 'userMessage': addUser(m.text,m.contextTypes);startAssistant();setRunning(true);break;
    case 'startAssistantMessage': startAssistant();setRunning(true);break;
    case 'streamChunk': streamChunk(m.chunk);break;
    case 'finalizeAssistantMessage': finalize(m.html);agentEnd();break;
    case 'agentStart': agentStart();break;
    case 'agentThinking': break;
    case 'agentToolCall': addToolCall(m.toolName,m.toolArgs,m.step);break;
    case 'agentToolResult': addToolResult(m.toolName,m.output,m.success,m.step);break;
    case 'agentReflection': addReflection(m.content,m.attempt);break;
    case 'agentDiffPreview': showDiffPreview(m.stepId,m.path,m.isNew,m.html);break;
    case 'agentPlan': showPlan(m.html);break;
    case 'agentDone':
      if(m.html&&curBubble){const r=document.createElement('div');r.innerHTML=m.html;curBubble.appendChild(r);attachActions(r);convTokens+=countTok(r.textContent||'');updateCtx();}
      if(m.error&&curBubble){const er=document.createElement('div');er.style.cssText='color:#f87171;font-size:12px;margin-top:6px;';er.textContent='\u26A0 '+m.error;curBubble.appendChild(er);}
      curBubble=null;agentEnd();scrollBot();break;
    case 'planExecuting': startAssistant();setRunning(true);break;
    case 'planRejected': agentEnd();break;
    case 'models': renderModels(m.models,m.current);break;
    case 'connectionStatus': statusDot.classList.toggle('ok',m.connected);break;
    case 'providerModelStatus':{
      const badge=$('providerBadge');
      if(badge)badge.textContent=(m.providerLabel||'ClawPilot')+(m.model?' \u2022 '+m.model:'');
      needSetup=!m.connected||!m.model;
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      if(emptyState)emptyState.style.display=needSetup?'none':'flex';
      if(m.model){ctxLimit=getCtxLimit(m.model);updateCtx();}
      break;
    }
    case 'indexStatus':{
      const el=$('indexStatus');
      if(el){
        el.classList.toggle('indexing',!!m.indexing);
        if(m.indexing&&m.fileCount!=null)el.textContent='Indexing\u2026 ('+m.fileCount+' files)';
        else if(!m.indexing&&m.chunkCount!=null)el.textContent=m.chunkCount+' chunks indexed';
        else el.textContent=m.message||'';
      }
      break;
    }
    case 'memoryData':{
      const core=m.core||{};
      if($('memProjectContext'))$('memProjectContext').value=core.projectContext||'';
      if($('memUserPreferences'))$('memUserPreferences').value=core.userPreferences||'';
      window._kf=Array.isArray(core.keyFacts)?core.keyFacts.slice():[];
      renderKF();
      const skillList=m.skills||[];
      const sk=$('skillsList');
      if(sk){sk.innerHTML=skillList.map(s=>'<div class="skill-row"><span>'+esc(s.name)+'</span><button data-id="'+esc(s.id)+'">Delete</button></div>').join('')||'<span style="opacity:.7">No skills</span>';sk.querySelectorAll('button').forEach(b=>{b.onclick=()=>vscode.postMessage({type:'deleteSkill',id:b.dataset.id});});}
      break;
    }
    case 'selectionContext':
      selText=m.text;selLang=m.lang;
      selBadge.classList.toggle('on',!!m.text);
      if(m.text&&$('selLabel'))$('selLabel').textContent=m.text.split('
').length+' lines'+(m.lang?' ('+m.lang+')':'');
      break;
    case 'workspaceFiles': renderFile(m.files);break;
    case 'injectMessage': inp.value=m.text;if(m.codeContext)selText=m.codeContext;autoSz();inp.focus();break;
    case 'injectPrompt': inp.value=m.text||'';autoSz();break;
    case 'submitPrompt': if(inp.value.trim())send();break;
    case 'loadHistory':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display='none';
      if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
      if(sessionNameEl)sessionNameEl.textContent=m.sessionName||'';
      convTokens=0;
      for(const msg of(m.messages||[])){
        if(msg.role==='user'){addUser(msg.content);convTokens+=countTok(msg.content);}
        else{
          hideEmpty();
          const d=document.createElement('div');d.className='message assistant';
          const b=document.createElement('div');b.className='bubble';
          b.innerHTML=msg.html||esc(msg.content);d.appendChild(b);msgs.appendChild(d);
          attachActions(b);convTokens+=countTok(msg.content);
        }
      }
      updateCtx();scrollBot();break;
    case 'clearMessages':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display=needSetup?'none':'flex';
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      convTokens=0;updateCtx();break;
    case 'error':
      if(curBubble){curBubble.innerHTML='<span style="color:#f87171">\u26A0 '+esc(m.message||'Error')+'</span>';curBubble=null;}
      else{
        hideEmpty();
        const d=document.createElement('div');d.className='message assistant';
        const b=document.createElement('div');b.className='bubble';
        b.innerHTML='<span style="color:#f87171">\u26A0 '+esc(m.message||'Error')+'</span>';
        d.appendChild(b);msgs.appendChild(d);scrollBot();
      }
      agentEnd();break;
    case 'slashCommands': allCmds=m.commands||[];break;
    case 'assistantMessage':{
      hideEmpty();
      const ad=document.createElement('div');ad.className='message assistant';
      const ab=document.createElement('div');ab.className='bubble';
      ab.innerHTML=m.html||esc(m.text||'');
      ad.appendChild(ab);msgs.appendChild(ad);attachActions(ab);
      convTokens+=countTok(m.text||'');updateCtx();scrollBot();break;
    }
    case 'setModel':
      if(modelSel&&m.model){modelSel.value=m.model;ctxLimit=getCtxLimit(m.model);updateCtx();vscode.postMessage({type:'changeModel',model:m.model});}
      break;
    case 'installStart':
      hideEmpty();
      {const d=document.createElement('div');d.className='message assistant';const b=document.createElement('div');b.className='bubble';b.innerHTML='<div style="font-family:monospace;font-size:11px;white-space:pre-wrap;">Pulling '+esc(m.model)+'\u2026</div>';d.appendChild(b);msgs.appendChild(d);window._installLog=b.querySelector('div');scrollBot();}
      break;
    case 'installProgress':
      if(window._installLog){window._installLog.textContent+=(window._installLog.textContent?'
':'')+m.line;scrollBot();}
      break;
    case 'installDone':
      if(window._installLog){window._installLog.textContent+='
'+(m.success?'\u2713 Done. Switched to '+m.model+'.':'\u2717 Failed. '+(m.error||''));window._installLog=null;}
      break;
  }
});

function renderModels(models,current){
  modelSel.innerHTML='';
  if(!models||!models.length){
    const o=document.createElement('option');
    o.textContent='No models \u2014 start Ollama or add API key';
    o.value='';modelSel.appendChild(o);
    modelSel.title='Run: ollama serve  then: ollama pull llama3.2';
    return;
  }
  models.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.name;
    const sz=m.size!=null?(m.size/1e9).toFixed(1)+'B':'';
    o.textContent=m.name+(sz?' ('+sz+')':'');
    if(m.name===current)o.selected=true;
    modelSel.appendChild(o);
  });
  if(current){ctxLimit=getCtxLimit(current);updateCtx();}
}

updateCtx();
</script>
</body>
</html>`}};function io(){let r="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)r+=e.charAt(Math.floor(Math.random()*e.length));return r}var G=w(require("vscode")),z=w(require("path")),Qt=w(require("fs"));var Vt=w(require("path")),ft=5,ue=80,Ht=40,ro=10,ao=new Set(["typescript","javascript","ts","js","python","py","go","rust","rs","java","c","cpp","csharp","cs","css","html","htm"]),co=["node_modules",".git","dist","out","build",".next"],lo=/\.min\.(js|css)$/i;function ht(r){return!(r.split(/[/\\]/).some(t=>co.includes(t))||lo.test(r))}function po(r,e){let t=r.split(`
`),s=[],o=e.toLowerCase(),n=/^\s*((?:export\s+)?(?:abstract\s+)?(?:public\s+)?(?:private\s+)?)?class\s+(\w+)/,i=/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,a=/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/,l=/^\s{2,}(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?\s*$/,c=/^\s*def\s+(\w+)\s*\(/,d=/^\s*class\s+(\w+)\s*[(:]/,p=/^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/,u=/^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/,g=/^\s*(?:\w+(?:\s*\*+)?\s+)+\s*(\w+)\s*\([^)]*\)\s*\{?\s*$/,v=/^\s*<(script|style|div|section|main|article)\b/,y=/^\s*(@\w+|\.[\w-]+|#[\w-]+)\s*\{/;for(let h=0;h<t.length;h++){let f=t[h],x=h+1;if(o==="python"||o==="py"){let b=f.match(d)||f.match(c);b&&s.push({type:b[0].trim().startsWith("class")?"class":"function",name:b[1],startLine:x});continue}if(o==="go"){let b=f.match(p);b&&s.push({type:"function",name:b[1],startLine:x});continue}if(o==="rust"||o==="rs"){let b=f.match(u);b&&s.push({type:"function",name:b[1],startLine:x});continue}if(o==="html"||o==="htm"){let b=f.match(v);b&&s.push({type:"block",name:b[1],startLine:x});continue}if(o==="css"){let b=f.match(y);b&&s.push({type:"block",name:b[1].replace(/^[.#]/,""),startLine:x});continue}if(o==="c"||o==="cpp"||o==="csharp"||o==="cs"){let b=f.match(n);if(b)s.push({type:"class",name:b[2],startLine:x});else{let T=f.match(g);T&&s.push({type:"function",name:T[1],startLine:x})}continue}if(n.test(f)){let b=f.match(n);b&&s.push({type:"class",name:b[2],startLine:x})}else if(i.test(f)||a.test(f)){let b=f.match(i)||f.match(a);b&&s.push({type:"function",name:b[1],startLine:x})}else if(l.test(f)&&f.trim().length>3){let b=f.match(l);b&&s.push({type:"method",name:b[1],startLine:x})}}return s}function mo(r,e,t){let s=t.toLowerCase(),o=e-1;if(s==="python"||s==="py"||s==="go"){let a=(r[o]??"").match(/^(\s*)/)?.[1]?.length??0;for(let l=o+1;l<Math.min(o+ue+1,r.length);l++){let c=r[l]??"",d=c.match(/^(\s*)/)?.[1]?.length??0;if(!(c.trim()===""&&l>o+1)&&d<=a&&c.trim()!=="")return Math.min(l,o+ue)}return Math.min(r.length,o+ue)}let n=0,i=!1;for(let a=o;a<Math.min(o+ue,r.length);a++){let l=r[a]??"";for(let c of l)c==="{"?(n++,i=!0):c==="}"&&n--;if(i&&n===0)return a+1}return Math.min(r.length,o+ue)}function Kt(r,e,t){let s=[],o=0,n=0;for(;o<r.length;){let i=Math.min(o+Ht,r.length),a=r.slice(o,i).join(`
`);if(a.trim().length>0&&i-o>=ft){let l=`${e}:${o+1}-${i}`;s.push({id:l,filePath:e,language:t,startLine:o+1,endLine:i,name:`lines ${o+1}-${i}`,content:a,type:"block"}),n++}if(o+=Ht-ro,o>=r.length)break}return s}function Jt(r,e,t){let s=e.split(`
`),o=Vt.extname(r).toLowerCase().replace(/^\./,""),n=t||o;if(!ao.has(n)||s.length<ft)return Kt(s,r,n);let a=po(e,n),l=[];for(let c=0;c<a.length;c++){let d=a[c],p=c+1<a.length?a[c+1].startLine-1:s.length,u=mo(s,d.startLine,n);if(u=Math.min(u,d.startLine+ue-1,p+1),u-d.startLine+1<ft)continue;let y=s.slice(d.startLine-1,u).join(`
`),h=`${r}:${d.startLine}-${u}`;l.push({id:h,filePath:r,language:n,startLine:d.startLine,endLine:u,name:d.name,content:y,type:d.type})}return l.length===0?Kt(s,r,n):l}var vt=w(require("vscode"));var Yt=10,Xt=15e3,uo={lmstudio:"lmstudioEndpoint",llamafile:"llamafileEndpoint",vllm:"vllmEndpoint",localai:"localaiEndpoint",jan:"janEndpoint","textgen-webui":"textgenEndpoint","openai-compatible":"endpoint"},Se=class r{constructor(){this._cache=new Map;this._available=null;this._config=vt.workspace.getConfiguration("clawpilot")}get _provider(){return this._config.get("provider","ollama")}get _useOllamaForEmbedding(){let e=this._provider;return e==="ollama"||Y.includes(e)}get _endpoint(){let e=this._provider;if(e==="ollama"||Y.includes(e))return this._config.get("endpoint","http://localhost:11434").replace(/\/$/,"");let t=uo[e]??"endpoint",s=this._config.get(t,"");return!s&&t!=="endpoint"&&(s=this._config.get("endpoint","")),s||(s=`http://localhost:${De[e]}`),s.replace(/\/$/,"")}get model(){return this._config.get("embeddingModel","nomic-embed-text")}refreshConfig(){this._config=vt.workspace.getConfiguration("clawpilot")}async isAvailable(){if(this._available!==null)return this._available;let e=new AbortController,t=setTimeout(()=>e.abort(),5e3),s=this._endpoint,o=!this._useOllamaForEmbedding;try{if(o){let n=await fetch(`${s}/v1/embeddings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,input:"test"}),signal:e.signal});clearTimeout(t),this._available=n.ok}else{let n=await fetch(`${s}/api/embed`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,input:"test"}),signal:e.signal});clearTimeout(t),this._available=n.ok}return this._available}catch{return clearTimeout(t),this._available=!1,!1}}resetAvailability(){this._available=null}static normalize(e){let t=0;for(let o=0;o<e.length;o++)t+=e[o]*e[o];let s=Math.sqrt(t)||1;return e.map(o=>o/s)}static dot(e,t){if(e.length!==t.length)return 0;let s=0;for(let o=0;o<e.length;o++)s+=e[o]*t[o];return s}async embed(e,t){if(t&&this._cache.has(t))return this._cache.get(t);this.refreshConfig();let o=!this._useOllamaForEmbedding?await this._embedOpenAI([e],this.model).then(i=>i[0]):await this._embedOllama([e],this.model).then(i=>i[0]),n=r.normalize(o);return t&&this._cache.set(t,n),n}async _embedOllama(e,t){let s=new AbortController,o=setTimeout(()=>s.abort(),Xt);try{let n=await fetch(`${this._endpoint}/api/embed`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t,input:e.length===1?e[0]:e}),signal:s.signal});if(clearTimeout(o),!n.ok){let l=await n.text();throw new Error(`Embed failed: ${n.status} ${l}`)}let i=await n.json(),a=i.embeddings??(i.embedding?[i.embedding]:[]);if(a.length!==e.length)throw new Error("Invalid embed response");return a}finally{clearTimeout(o)}}async _embedOpenAI(e,t){let s=new AbortController,o=setTimeout(()=>s.abort(),Xt);try{let n=await fetch(`${this._endpoint}/v1/embeddings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:t,input:e.length===1?e[0]:e}),signal:s.signal});if(clearTimeout(o),!n.ok){let l=await n.text();throw new Error(`Embed failed: ${n.status} ${l}`)}let a=(await n.json()).data??[];if(a.length!==e.length)throw new Error("Invalid embed response");return a.map(l=>l.embedding)}finally{clearTimeout(o)}}async embedBatch(e,t){let s=[],o=[];for(let a=0;a<e.length;a++)this._cache.has(t[a])?s[a]=this._cache.get(t[a]):o.push({text:e[a],id:t[a],index:a});this.refreshConfig();let n=!this._useOllamaForEmbedding,i=this.model;for(let a=0;a<o.length;a+=Yt){let l=o.slice(a,a+Yt),c=l.map(p=>p.text),d=n?await this._embedOpenAI(c,i):await this._embedOllama(c,i);for(let p=0;p<l.length;p++){let u=r.normalize(d[p]);this._cache.set(l[p].id,u),s[l[p].index]=u}}return s}getCached(e){return this._cache.get(e)}clearCache(){this._cache.clear()}};var go=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]),Ve=class r{constructor(){this._chunks=[];this._chunkById=new Map;this._lastIndexed=0;this._indexing=!1;this._tokenFreq=new Map;this._docFreq=new Map;this._disposables=[];this._embedder=new Se}get status(){return{isIndexed:this._chunks.length>0&&!this._indexing,isIndexing:this._indexing,chunkCount:this._chunks.length,lastIndexed:this._lastIndexed}}static tokenize(e){return e.toLowerCase().split(/\W+/).filter(t=>t.length>1&&!go.has(t))}updateTokenStats(e){let t=r.tokenize(e.content),s=new Map;for(let o of t)s.set(o,(s.get(o)??0)+1);this._tokenFreq.set(e.id,s);for(let o of s.keys())this._docFreq.set(o,(this._docFreq.get(o)??0)+1)}removeTokenStats(e){let t=this._tokenFreq.get(e);if(t){for(let s of t.keys()){let o=this._docFreq.get(s)??0;o<=1?this._docFreq.delete(s):this._docFreq.set(s,o-1)}this._tokenFreq.delete(e)}}bm25Score(e,t){let s=this._chunks.length||1,o=this._tokenFreq.get(e.id);if(!o)return 0;let n=0;for(let i of t){let a=o.get(i)??0;if(a===0)continue;let l=this._docFreq.get(i)??0,c=Math.log(s/(l+1)+1);n+=a*c}return n}async indexFile(e,t,s,o){let n=z.normalize(e),i=this._chunks.filter(l=>z.normalize(l.filePath)===n);for(let l of i)this.removeTokenStats(l.id),this._chunkById.delete(l.id);this._chunks=this._chunks.filter(l=>z.normalize(l.filePath)!==n);let a=Jt(e,t,s);for(let l of a)this._chunks.push(l),this._chunkById.set(l.id,l),this.updateTokenStats(l);if(o)try{await this._embedder.embedBatch(a.map(l=>l.content),a.map(l=>l.id))}catch{}}async indexAll(e){let t=G.workspace.workspaceFolders;if(!t?.length){e?.("No workspace folder open");return}if(this._indexing)return;this._indexing=!0,this._embedder.clearCache(),this._chunks=[],this._chunkById.clear(),this._tokenFreq.clear(),this._docFreq.clear();let s=t[0].uri.fsPath,o=await this._embedder.isAvailable();try{let n=await G.workspace.findFiles(new G.RelativePattern(s,"**/*"),"{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/*.min.js,**/build/**,**/.next/**}",5e3),i=0;for(let a=0;a<n.length;a++){let l=n[a],c=z.relative(s,l.fsPath);if(ht(c))try{let d=Qt.readFileSync(l.fsPath,"utf8"),u=z.extname(l.fsPath).replace(/^\./,"")||"plaintext";await this.indexFile(c,d,u,o),i++,e&&i%10===0&&e(`Indexing workspace... (${i} files)`,i)}catch{}}this._lastIndexed=Date.now(),e?.(`Indexed ${this._chunks.length} chunks`,i)}catch(n){e?.(`Index error: ${n instanceof Error?n.message:String(n)}`)}finally{this._indexing=!1}}async indexFileOnSave(e){let t=G.workspace.workspaceFolders;if(!t?.length)return;let s=t[0].uri.fsPath,o=z.relative(s,e.uri.fsPath);if(!ht(o))return;let n=await this._embedder.isAvailable();try{await this.indexFile(o,e.getText(),e.languageId,n)}catch{}}async query(e,t=5){let s=Math.min(t,this._chunks.length);if(s===0)return[];let o=r.tokenize(e),n=await this._embedder.isAvailable(),a=G.workspace.getConfiguration("clawpilot").get("ragHybridAlpha",.6);if(n)try{let c=await this._embedder.embed(e),d=this._chunks.map(g=>{let v=this._embedder.getCached(g.id),y=v?Se.dot(c,v):0,h=this.bm25Score(g,o);return{chunk:g,vectorScore:y,bm25Score:h}}),p=Math.max(1,...d.map(g=>g.bm25Score)),u=d.map(({chunk:g,vectorScore:v,bm25Score:y})=>{let h=y/p,f=a*v+(1-a)*h;return{chunk:g,score:f}});return u.sort((g,v)=>v.score-g.score),u.slice(0,s).map(g=>g.chunk)}catch{}let l=this._chunks.map(c=>({chunk:c,score:this.bm25Score(c,o)}));return l.sort((c,d)=>d.score-c.score),l.slice(0,s).filter(c=>c.score>0).map(c=>c.chunk)}async getContext(e){let t=G.workspace.getConfiguration("clawpilot"),s=t.get("ragTopK",5);if(!t.get("ragEnabled",!0)||this._chunks.length===0)return"";let n=await this.query(e,s);if(n.length===0)return"";let i=["<workspace_context>","Relevant code from your workspace (retrieved by semantic search):",""];for(let a of n)i.push(`--- ${a.filePath} | ${a.type}: ${a.name} | lines ${a.startLine}-${a.endLine} ---`),i.push(a.content),i.push("");return i.push("</workspace_context>"),i.join(`
`)}startWatching(){let e=G.workspace.onDidSaveTextDocument(t=>{this.indexFileOnSave(t).catch(()=>{})});this._disposables.push(e)}dispose(){for(let e of this._disposables)e.dispose();this._disposables=[]}};var _e=w(require("path")),O=w(require("fs")),yt=200,Ce=1e3,Zt=500,es=300,ts=10,ss=100,fo=2e3,ho=7,vo=100,os=.05,yo=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]);function Je(r){return r.toLowerCase().split(/\W+/).filter(e=>e.length>1&&!yo.has(e))}function ns(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}function wt(){return{core:{projectContext:"",userPreferences:"",keyFacts:[]},recall:[],archival:[],version:1}}var Ye=class{constructor(e){this._dirty=!1;this._storagePath=_e.join(e.fsPath,"memory.json"),this._data=wt()}async init(){try{let e=_e.dirname(this._storagePath);if(O.existsSync(e)||O.mkdirSync(e,{recursive:!0}),O.existsSync(this._storagePath)){let t=O.readFileSync(this._storagePath,"utf8"),s=JSON.parse(t);this._data={core:{projectContext:String(s.core?.projectContext??"").slice(0,Zt),userPreferences:String(s.core?.userPreferences??"").slice(0,es),keyFacts:Array.isArray(s.core?.keyFacts)?s.core.keyFacts.slice(0,ts).map(o=>String(o).slice(0,ss)):[]},recall:Array.isArray(s.recall)?s.recall.slice(0,yt):[],archival:Array.isArray(s.archival)?s.archival.slice(0,Ce):[],version:typeof s.version=="number"?s.version:1}}await this.consolidate()}catch{this._data=wt()}}_scheduleSave(){this._dirty=!0,this._saveTimer&&clearTimeout(this._saveTimer),this._saveTimer=setTimeout(()=>{this._saveTimer=void 0,this.save()},fo)}async save(){if(this._dirty){this._dirty=!1;try{let e=_e.dirname(this._storagePath);O.existsSync(e)||O.mkdirSync(e,{recursive:!0}),O.writeFileSync(this._storagePath,JSON.stringify(this._data,null,2),"utf8")}catch{this._dirty=!0}}}getCoreMemory(){return{...this._data.core}}async updateCoreMemory(e){e.projectContext!==void 0&&(this._data.core.projectContext=String(e.projectContext).slice(0,Zt)),e.userPreferences!==void 0&&(this._data.core.userPreferences=String(e.userPreferences).slice(0,es)),e.keyFacts!==void 0&&(this._data.core.keyFacts=e.keyFacts.slice(0,ts).map(t=>String(t).slice(0,ss))),this._scheduleSave()}async addRecall(e,t,s=[]){let o={id:ns(),content:e,source:t,createdAt:Date.now(),lastAccessedAt:Date.now(),accessCount:0,tags:Array.isArray(s)?s:[]};this._data.recall.unshift(o),this._data.recall.length>yt&&(this._data.recall=this._data.recall.slice(0,yt)),this._scheduleSave()}searchRecall(e,t=5){let s=Je(e),o=Date.now();if(s.length===0)return this._data.recall.slice(0,t);let n=this._data.recall.map(a=>{let l=new Set(Je(a.content)),c=0;for(let y of s)l.has(y)&&c++;let d=a.lastAccessedAt??a.createdAt??o,p=(o-d)/(1e3*60*60*24),u=Math.exp(-os*p),g=(a.accessCount??0)*.1,v=c*u+g;return{entry:a,score:v}});n.sort((a,l)=>l.score-a.score);let i=n.slice(0,t).filter(a=>a.score>0).map(a=>a.entry);i.length===0&&i.push(...this._data.recall.slice(0,t));for(let a of i)a.lastAccessedAt=o,a.accessCount=(a.accessCount||0)+1;return this._scheduleSave(),i}async addArchival(e,t,s=[]){let o={id:ns(),content:e,source:t,createdAt:Date.now(),lastAccessedAt:Date.now(),accessCount:0,tags:Array.isArray(s)?s:[]};this._data.archival.push(o),this._data.archival.length>Ce&&(this._data.archival=this._data.archival.slice(-Ce)),this._scheduleSave()}searchArchival(e,t=5){let s=Je(e),o=Date.now();if(s.length===0)return this._data.archival.slice(-t).reverse();let n=this._data.archival.map(a=>{let l=new Set(Je(a.content)),c=0;for(let y of s)l.has(y)&&c++;let d=a.lastAccessedAt??a.createdAt??o,p=(o-d)/(1e3*60*60*24),u=Math.exp(-os*p),g=(a.accessCount??0)*.1,v=c*u+g;return{entry:a,score:v}});n.sort((a,l)=>l.score-a.score);let i=n.slice(0,t).filter(a=>a.score>0).map(a=>a.entry);i.length===0&&i.push(...this._data.archival.slice(-t).reverse());for(let a of i)a.lastAccessedAt=o,a.accessCount=(a.accessCount||0)+1;return this._scheduleSave(),i}getCoreContextBlock(){let e=this._data.core,t=e.projectContext.trim().length>0,s=e.userPreferences.trim().length>0,o=e.keyFacts.length>0;if(!t&&!s&&!o)return"";let n=["<memory_core>"];return t&&n.push(`Project: ${e.projectContext.trim()}`),s&&n.push(`Preferences: ${e.userPreferences.trim()}`),o&&n.push(`Key facts: ${e.keyFacts.join(" | ")}`),n.push("</memory_core>"),n.join(`
`)}getRecallContextBlock(e,t=3){let s=this.searchRecall(e,t);return s.length===0?"":["<memory_recall>",...s.map(n=>n.content),"</memory_recall>"].join(`
`)}async consolidate(){let e=Date.now()-ho*24*60*60*1e3,t=this._data.recall.filter(o=>o.createdAt<e),s=this._data.recall.filter(o=>o.createdAt>=e).slice(0,vo);for(let o of t)this._data.archival.push(o);this._data.archival.length>Ce&&(this._data.archival=this._data.archival.slice(-Ce)),this._data.recall=s,this._scheduleSave()}searchMemory(e,t,s=5){let o=Math.min(s,20);if(t==="recall")return this.searchRecall(e,o);if(t==="archival")return this.searchArchival(e,o);let n=this.searchRecall(e,o),i=this.searchArchival(e,o),a=new Set(n.map(l=>l.id));for(let l of i)!a.has(l.id)&&n.length<o&&(n.push(l),a.add(l.id));return n.slice(0,o)}async clearAll(){this._data=wt(),this._dirty=!0,await this.save()}getRecallCount(){return this._data.recall.length}getArchivalCount(){return this._data.archival.length}};var Me=w(require("path")),B=w(require("fs"));var Pe=[{id:"builtin:explain-code",name:"Explain Code",tags:["explain","understand"],description:"Step-by-step explanation of code logic",content:"When asked to explain code: describe what it does in plain English, identify the algorithm or pattern used, note any edge cases or gotchas, and suggest improvements if obvious.",createdAt:0,useCount:0},{id:"builtin:write-tests",name:"Write Tests",tags:["test","jest","vitest","unit"],description:"Generate unit tests for a function or module",content:"When writing tests: use the existing test framework in the project. Cover happy path, edge cases, and error cases. Mock external dependencies. Name tests descriptively using 'should...' pattern.",createdAt:0,useCount:0},{id:"builtin:fix-bug",name:"Fix Bug",tags:["fix","debug","error","bug"],description:"Diagnose and fix a bug in code",content:"When fixing bugs: first read the file, identify the root cause, explain what was wrong, make the minimal surgical fix using edit_file, then verify with get_diagnostics.",createdAt:0,useCount:0},{id:"builtin:code-review",name:"Code Review",tags:["review","quality","best-practices"],description:"Review code for quality, bugs, and improvements",content:"When reviewing code: check for correctness, edge cases, performance issues, security concerns, readability. Give structured feedback: critical issues first, then suggestions.",createdAt:0,useCount:0},{id:"builtin:add-types",name:"Add TypeScript Types",tags:["types","typescript","ts"],description:"Add or improve TypeScript type annotations",content:"When adding types: infer from usage context, prefer specific types over 'any', use generics where appropriate, add return types to all functions.",createdAt:0,useCount:0},{id:"builtin:git-summary",name:"Git Summary",tags:["git","summary","commit","log"],description:"Summarize git status and recent changes",content:"When summarizing git state: run git_status, git_log (last 10), git_diff. Present modified files grouped by type, summarize what changed and why based on commit messages.",createdAt:0,useCount:0},{id:"builtin:optimize-code",name:"Optimize Code",tags:["optimize","performance","refactor"],description:"Improve code performance and readability",content:"When optimizing: identify bottlenecks first (don't premature optimize), suggest algorithmic improvements, reduce unnecessary allocations, simplify complex logic.",createdAt:0,useCount:0},{id:"builtin:add-docs",name:"Add Documentation",tags:["docs","jsdoc","comments"],description:"Add JSDoc/TSDoc comments to functions and classes",content:"When adding docs: write JSDoc for every exported function/class/type. Include @param, @returns, @throws. Keep descriptions concise and accurate to the actual implementation.",createdAt:0,useCount:0}];var is=2e3,wo=1e3,bo=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]);function rs(r){return r.toLowerCase().split(/\W+/).filter(e=>e.length>1&&!bo.has(e))}function xo(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}var Xe=class{constructor(e){this._skills=[];this._dirty=!1;this._storagePath=Me.join(e.fsPath,"skills.json")}async init(){try{let e=Me.dirname(this._storagePath);if(B.existsSync(e)||B.mkdirSync(e,{recursive:!0}),B.existsSync(this._storagePath)){let t=B.readFileSync(this._storagePath,"utf8"),s=JSON.parse(t);this._skills=Array.isArray(s)?s:[]}}catch{this._skills=[]}}_scheduleSave(){this._dirty=!0,this._saveTimer&&clearTimeout(this._saveTimer),this._saveTimer=setTimeout(()=>{this._saveTimer=void 0,this.save()},wo)}async save(){if(this._dirty){this._dirty=!1;try{let e=Me.dirname(this._storagePath);B.existsSync(e)||B.mkdirSync(e,{recursive:!0}),B.writeFileSync(this._storagePath,JSON.stringify(this._skills,null,2),"utf8")}catch{this._dirty=!0}}}async addSkill(e,t,s,o=[]){let n={id:xo(),name:e.trim(),description:t.trim().slice(0,500),content:s.trim().slice(0,is),tags:Array.isArray(o)?o.map(i=>String(i).trim()):[],createdAt:Date.now(),useCount:0};return this._skills.push(n),this._scheduleSave(),{...n}}async updateSkill(e,t){let s=this._skills.findIndex(o=>o.id===e);s!==-1&&(t.name!==void 0&&(this._skills[s].name=String(t.name).trim()),t.description!==void 0&&(this._skills[s].description=String(t.description).slice(0,500)),t.content!==void 0&&(this._skills[s].content=String(t.content).slice(0,is)),t.tags!==void 0&&(this._skills[s].tags=t.tags.map(o=>String(o).trim())),this._scheduleSave())}async deleteSkill(e){this._skills=this._skills.filter(t=>t.id!==e),this._scheduleSave()}listSkills(){return[...Pe.map(t=>({...t,isBuiltin:!0})),...this._skills.map(t=>({...t}))]}listBuiltinSkills(){return Pe.map(e=>({...e,isBuiltin:!0}))}getSkill(e){let t=Pe.find(o=>o.id===e);if(t)return{...t,isBuiltin:!0};let s=this._skills.find(o=>o.id===e);return s?{...s}:void 0}findRelevant(e,t=2){let s=new Set(rs(e)),n=[...Pe.map(l=>({...l,isBuiltin:!0})),...this._skills];if(s.size===0){let l=n.slice(0,t);for(let c of l)c.isBuiltin||(c.useCount=(c.useCount||0)+1);return l.some(c=>!c.isBuiltin)&&this._scheduleSave(),l.map(c=>({...c}))}let i=n.map(l=>{let c=`${l.description} ${l.tags.join(" ")}`,d=new Set(rs(c)),p=0;for(let u of s)d.has(u)&&p++;return{skill:l,score:p}});i.sort((l,c)=>c.score-l.score);let a=i.slice(0,t).filter(l=>l.score>0).map(l=>l.skill);if(a.length>0){for(let l of a)l.isBuiltin||(l.useCount=(l.useCount||0)+1);this._scheduleSave()}return a.map(l=>({...l}))}getSkillContextBlock(e){let t=this.findRelevant(e,2);if(t.length===0)return"";let s=["<skills>"];for(let o of t)s.push(`## Skill: ${o.name}`),s.push(o.content);return s.push("</skills>"),s.join(`
`)}};var as=w(require("path"));function ae(r,e){let t=`

\`\`\`${e.language}
${e.code}
\`\`\``,s=`from ${e.filePath} (lines ${e.lineStart}-${e.lineEnd})`;switch(r){case"explain":return`Explain the following ${e.language} code ${s}:${t}

Provide a clear, concise explanation of what it does, key design choices, and any potential issues.`;case"refactor":return`Refactor the following ${e.language} code ${s} for readability, performance, and best practices:${t}

Show the refactored version and explain the key changes.`;case"fix":return`Find and fix bugs in the following ${e.language} code ${s}:${t}

Identify each bug, explain why it's a bug, and provide the corrected code.`;case"add_tests":return`Write comprehensive unit tests for the following ${e.language} code ${s}:${t}

Cover happy paths, edge cases, and error cases.`;case"add_docs":return`Add documentation comments to the following ${e.language} code ${s}:${t}

Use the appropriate doc format for the language (JSDoc, docstrings, etc).`;default:return`Review the following ${e.language} code ${s}:${t}`}}function ce(r,e){if(r.selection.isEmpty)return null;let t=r.document,s=r.selection,o=t.getText(s),n=as.relative(e,t.uri.fsPath),i=s.start.line+1,a=s.end.line+1;return{code:o,language:t.languageId,filePath:n,lineStart:i,lineEnd:a}}var ge=w(require("vscode")),ko=new Set(["typescript","javascript","typescriptreact","javascriptreact","python","go","rust","java","c","cpp","csharp","php","ruby","swift","kotlin","scala","lua","r","dart"]);function So(r){let e=r.toLowerCase();return e==="typescript"||e==="javascript"||e==="ts"||e==="js"?/^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?class\s+\w+/:e==="python"||e==="py"?/^\s*def\s+\w+|^\s*class\s+\w+/:e==="go"?/^\s*func\s+\w+/:e==="rust"||e==="rs"?/^\s*(pub\s+)?fn\s+\w+|^\s*(pub\s+)?struct\s+\w+/:ko.has(e)?/^\s*(function|class|def|func|fn)\s+\w+/:null}var Qe=class{provideCodeLenses(e,t){if(!ge.workspace.getConfiguration("clawpilot").get("codeLensEnabled",!0))return[];let o=So(e.languageId);if(!o)return[];let n=[],i=e.getText().split(/\r?\n/);for(let a=0;a<i.length;a++)if(o.test(i[a]??"")){let l=new ge.Range(a,0,a,(i[a]??"").length);n.push(new ge.CodeLens(l,{title:"$(claw) ClawPilot",command:"clawpilot.codeLensAction",arguments:[e.uri,a]}))}return n}resolveCodeLens(e,t){return e}};var W=w(require("vscode")),Te=class{static{this.providedCodeActionKinds=[W.CodeActionKind.QuickFix]}provideCodeActions(e,t,s,o){let n=s.diagnostics.filter(i=>i.severity===W.DiagnosticSeverity.Error||i.severity===W.DiagnosticSeverity.Warning);return n.length?n.map(i=>{let a=i.severity===W.DiagnosticSeverity.Error?"error":"warning",l=new W.CodeAction(`Fix ${a} with ClawPilot: ${i.message.slice(0,60)}${i.message.length>60?"\u2026":""}`,W.CodeActionKind.QuickFix);return l.diagnostics=[i],l.isPreferred=!1,l.command={command:"clawpilot.fixDiagnostic",title:"Fix with ClawPilot",arguments:[e,i]},l}):[]}};var $=w(require("vscode")),Ze=class{constructor(e){this._item=$.window.createStatusBarItem($.StatusBarAlignment.Left,90),this._item.command="workbench.actions.view.problems",e.subscriptions.push(this._item),this._update(),e.subscriptions.push($.languages.onDidChangeDiagnostics(()=>this._update())),this._item.show()}_update(){let e=0,t=0;for(let[,s]of $.languages.getDiagnostics())for(let o of s)o.severity===$.DiagnosticSeverity.Error&&e++,o.severity===$.DiagnosticSeverity.Warning&&t++;this._item.text=`$(error) ${e}  $(warning) ${t}`,this._item.tooltip=`${e} error(s), ${t} warning(s) \u2014 click to open Problems`,this._item.color=e>0?new $.ThemeColor("statusBarItem.errorForeground"):t>0?new $.ThemeColor("statusBarItem.warningForeground"):void 0}};var et=w(require("vscode")),ls=w(require("path")),cs=10;function ds(r,e,t){let s=ls.relative(t,r.uri.fsPath),o=e.severity===et.DiagnosticSeverity.Error?"Error":"Warning",n=e.range.start.line,i=Math.max(0,n-cs),a=Math.min(r.lineCount-1,n+cs),l=new et.Range(i,0,a,r.lineAt(a).text.length),c=r.getText(l),d=e.source?` [${e.source}]`:"",p=e.code?` (${typeof e.code=="object"?e.code.value:e.code})`:"";return`Fix the following ${o.toLowerCase()} in ${s} at line ${n+1}:

**${o}${d}${p}:** ${e.message}

Here is the surrounding code (lines ${i+1}-${a+1}):

\`\`\`${r.languageId}
${c}
\`\`\`

Provide the corrected code and a brief explanation of the fix.`}var D=w(require("fs")),bt=w(require("path")),Co="session-index.json",ps=200,ms=20,tt=class{constructor(e){this._storageDir=e.globalStorageUri.fsPath,D.mkdirSync(this._storageDir,{recursive:!0}),this._index=this._loadIndex()}_indexPath(){return bt.join(this._storageDir,Co)}_loadIndex(){try{let e=D.readFileSync(this._indexPath(),"utf8");return JSON.parse(e)}catch{return{sessions:[],activeSessionId:null}}}_saveIndex(){D.writeFileSync(this._indexPath(),JSON.stringify(this._index,null,2),"utf8")}_sessionPath(e){return bt.join(this._storageDir,`session-${e}.json`)}createSession(e){let t=Date.now().toString(36)+Math.random().toString(36).slice(2,6),s=Date.now(),o=`Session ${new Date(s).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:!1})}`,n={id:t,name:e??o,createdAt:s,updatedAt:s,messages:[]};if(this._writeSession(n),this._index.sessions.unshift({id:t,name:n.name,updatedAt:s}),this._index.sessions.length>ms){let i=this._index.sessions.splice(ms);for(let a of i)try{D.unlinkSync(this._sessionPath(a.id))}catch{}}return this._index.activeSessionId=t,this._saveIndex(),n}loadSession(e){try{let t=D.readFileSync(this._sessionPath(e),"utf8");return JSON.parse(t)}catch{return null}}_writeSession(e){D.writeFileSync(this._sessionPath(e.id),JSON.stringify(e,null,2),"utf8")}appendMessage(e,t){try{let s=this.loadSession(e);if(!s)return;s.messages.push(t),s.messages.length>ps&&(s.messages=s.messages.slice(s.messages.length-ps)),s.updatedAt=Date.now(),this._writeSession(s);let o=this._index.sessions.find(n=>n.id===e);o&&(o.updatedAt=s.updatedAt),this._saveIndex()}catch{}}deleteSession(e){try{D.unlinkSync(this._sessionPath(e))}catch{}this._index.sessions=this._index.sessions.filter(t=>t.id!==e),this._index.activeSessionId===e&&(this._index.activeSessionId=this._index.sessions[0]?.id??null),this._saveIndex()}renameSession(e,t){let s=this.loadSession(e);if(!s)return;s.name=t,this._writeSession(s);let o=this._index.sessions.find(n=>n.id===e);o&&(o.name=t),this._saveIndex()}clearMessages(e){let t=this.loadSession(e);t&&(t.messages=[],t.updatedAt=Date.now(),this._writeSession(t))}getIndex(){return this._index}getActiveSessionId(){return this._index.activeSessionId}setActiveSession(e){this._index.activeSessionId=e,this._saveIndex()}getOrCreateActiveSession(){let e=this._index.activeSessionId;if(e){let t=this.loadSession(e);if(t)return t}return this.createSession()}exportSession(e){let t=this.loadSession(e);if(!t)return"";let s=[`# ${t.name}
`];for(let o of t.messages){let n=new Date(o.timestamp).toLocaleTimeString();s.push(`**${o.role==="user"?"You":"ClawPilot"}** (${n}):

${o.content}
`)}return s.join(`
---

`)}};var fe=w(require("vscode"));var st=class{constructor(e){this._item=fe.window.createStatusBarItem(fe.StatusBarAlignment.Left,85),this._item.command="clawpilot.askGitStatus",e.subscriptions.push(this._item),this._update(),this._timer=setInterval(()=>this._update(),3e4),e.subscriptions.push(fe.workspace.onDidSaveTextDocument(()=>this._update())),e.subscriptions.push({dispose:()=>{this._timer&&clearInterval(this._timer)}}),this._item.show()}_update(){let e=Rt(),t=e.dirtyCount>0?` $(pencil)${e.dirtyCount}`:"";this._item.text=`$(git-branch) ${e.branch}${t}`,this._item.tooltip=e.dirtyCount>0?`${e.dirtyCount} uncommitted change(s) \u2014 click to ask ClawPilot`:`Branch: ${e.branch} \u2014 click to ask ClawPilot`}};var ot=class{constructor(){this._providers=[]}register(e){this._providers.push(e)}async assemble(e,t){let s=[...this._providers].sort((a,l)=>l.priority-a.priority),o=[],n=[],i=0;for(let a of s){if(i>=t)break;let l=t-i,c=`<context_source name="${a.name}">

</context_source>`.length,d=Math.min(a.maxChars,Math.max(0,l-c));if(!(d<=0))try{let p=await a.getContext(e);if(!p||!p.trim())continue;p.length>d&&(p=p.slice(0,d)+`
... (truncated)`);let u=`<context_source name="${a.name}">
${p}
</context_source>`;o.push(u),n.push(a.name),i+=u.length}catch{}}return{text:o.join(`

`),sources:n}}};var he=w(require("vscode")),xt=3e3,us=150;function gs(){return{name:"activeFile",priority:90,maxChars:xt,async getContext(){let r=he.window.activeTextEditor;if(!r)return"";let e=r.document,t=r.selection.active,s=Math.max(0,t.line-us),o=Math.min(e.lineCount-1,t.line+us),n=new he.Range(s,0,o,e.lineAt(o).text.length),i=e.getText(n);return i.length>xt&&(i=i.slice(0,xt)+`
... (truncated)`),`File: ${he.workspace.asRelativePath(e.uri)}
Language: ${e.languageId}

${i}`}}}var fs=w(require("vscode"));function hs(){return{name:"selection",priority:95,maxChars:1e4,async getContext(){let r=fs.window.activeTextEditor;if(!r||r.selection.isEmpty)return"";let e=r.document.getText(r.selection),t=r.document.languageId;return`Selected code (${t}):
\`\`\`${t}
${e}
\`\`\``}}}var Z=w(require("vscode"));function vs(){return{name:"diagnostics",priority:80,maxChars:2e3,async getContext(){let r=[];for(let[e,t]of Z.languages.getDiagnostics()){let s=Z.workspace.asRelativePath(e);for(let o of t)if(o.severity===Z.DiagnosticSeverity.Error||o.severity===Z.DiagnosticSeverity.Warning){let n=o.severity===Z.DiagnosticSeverity.Error?"Error":"Warning",i=o.range.start.line+1;r.push(`${n} at ${s}:${i} - ${o.message}`)}}return r.length?r.join(`
`):""}}}var kt=2e3;function ys(){return{name:"gitDiff",priority:70,maxChars:kt,async getContext(){let r=me({staged:!1});return!r||r.startsWith("Error:")?"":r.length>kt?r.slice(0,kt)+`
... (truncated)`:r}}}function ws(r){return{name:"workspaceRag",priority:60,maxChars:4e3,async getContext(e){let t=await r.query(e,5);if(t.length===0)return"";let s=["Relevant code from workspace:",""];for(let o of t)s.push(`--- ${o.filePath} | ${o.type}: ${o.name} | lines ${o.startLine}-${o.endLine} ---`),s.push(o.content),s.push("");return s.join(`
`).trim()}}}function bs(r){return{name:"memory",priority:50,maxChars:1500,async getContext(e){let t=r.searchRecall(e,3);return t.length===0?"":["<memory_recall>",...t.map(o=>o.content),"</memory_recall>"].join(`
`)}}}function xs(r){return{name:"skill",priority:85,maxChars:2e3,async getContext(e){let t=r.findRelevant(e,2);if(t.length===0)return"";let s=["<skills>"];for(let o of t)s.push(`## Skill: ${o.name}`),s.push(o.content);return s.push("</skills>"),s.join(`
`)}}}var ks=w(require("http")),Ae=w(require("vscode")),Ee=class{constructor(e){this.client=e;this.server=null;this.currentPort=null}async start(){if(this.server)return this.currentPort??0;let t=Ae.workspace.getConfiguration("clawpilot").get("proxyPort",11435);return this.server=ks.createServer((s,o)=>{this.handleRequest(s,o).catch(n=>{o.headersSent||(o.statusCode=500,o.setHeader("Content-Type","application/json")),o.end(JSON.stringify({error:{message:n instanceof Error?n.message:String(n)}}))})}),await new Promise((s,o)=>{this.server.once("error",o),this.server.listen(t,()=>{this.server.off("error",o),s()})}),this.currentPort=t,Ae.window.setStatusBarMessage(`ClawPilot Proxy: listening on :${t}`,5e3),t}stop(){this.server&&(this.server.close(),this.server=null,this.currentPort=null)}async handleRequest(e,t){let s=e.url||"",o=e.method||"GET";if(o==="POST"&&s==="/v1/chat/completions"){await this.handleChatCompletions(e,t);return}if(o==="POST"&&s==="/v1/completions"){await this.handleCompletions(e,t);return}if(o==="GET"&&s==="/v1/models"){await this.handleModels(e,t);return}if(o==="POST"&&s==="/v1/models"){await this.handleModels(e,t);return}t.statusCode=404,t.setHeader("Content-Type","application/json"),t.end(JSON.stringify({error:{message:"Not found"}}))}async readJsonBody(e){let t=[];for await(let o of e)t.push(typeof o=="string"?Buffer.from(o):o);let s=Buffer.concat(t).toString("utf8")||"{}";return JSON.parse(s)}toOllamaMessagesFromChat(e){return(Array.isArray(e.messages)?e.messages:[]).map(s=>({role:s.role,content:s.content}))}toOllamaMessagesFromCompletion(e){return[{role:"user",content:typeof e.prompt=="string"?e.prompt:Array.isArray(e.prompt)?e.prompt.join(`
`):""}]}getModelFromBody(e){let s=Ae.workspace.getConfiguration("clawpilot").get("model","llama3");return typeof e.model=="string"&&e.model.trim()?e.model.trim():s}async handleChatCompletions(e,t){let s=await this.readJsonBody(e),o=this.getModelFromBody(s),n=this.toOllamaMessagesFromChat(s);t.statusCode=200,t.setHeader("Content-Type","text/event-stream"),t.setHeader("Cache-Control","no-cache"),t.setHeader("Connection","keep-alive");try{for await(let i of this.client.streamChat(n,o)){let a={choices:[{delta:{content:i}}]};t.write(`data: ${JSON.stringify(a)}

`)}t.write(`data: [DONE]

`),t.end()}catch(i){let l={error:{message:i instanceof Error?i.message:String(i)}};t.write(`data: ${JSON.stringify(l)}

`),t.write(`data: [DONE]

`),t.end()}}async handleCompletions(e,t){let s=await this.readJsonBody(e),o=this.getModelFromBody(s),n=this.toOllamaMessagesFromCompletion(s);t.statusCode=200,t.setHeader("Content-Type","text/event-stream"),t.setHeader("Cache-Control","no-cache"),t.setHeader("Connection","keep-alive");try{for await(let i of this.client.streamChat(n,o)){let a={choices:[{delta:{content:i}}]};t.write(`data: ${JSON.stringify(a)}

`)}t.write(`data: [DONE]

`),t.end()}catch(i){let l={error:{message:i instanceof Error?i.message:String(i)}};t.write(`data: ${JSON.stringify(l)}

`),t.write(`data: [DONE]

`),t.end()}}async handleModels(e,t){try{let o=(await this.client.listModels()).map(n=>({id:n.name,object:"model",created:n.modified_at?Math.floor(new Date(n.modified_at).getTime()/1e3):0,owned_by:this.client.providerType}));t.statusCode=200,t.setHeader("Content-Type","application/json"),t.end(JSON.stringify({object:"list",data:o}))}catch(s){t.statusCode=500,t.setHeader("Content-Type","application/json"),t.end(JSON.stringify({error:{message:s instanceof Error?s.message:String(s)}}))}}};var H=w(require("vscode"));var N=w(require("os")),Ie=w(require("path")),Cs=w(require("fs")),ee=require("child_process"),_o=2e3;function Ss(r){let e=new AbortController,t=setTimeout(()=>e.abort(),_o);return fetch(r,{signal:e.signal}).then(async s=>{clearTimeout(t);try{let o=await s.json();return{ok:s.ok,json:o}}catch{return{ok:s.ok}}}).catch(()=>(clearTimeout(t),{ok:!1}))}function Po(){let r=N.platform(),e="",t=null;try{if(r==="win32"){e=(0,ee.execSync)("wmic path win32_VideoController get name,AdapterRAM",{encoding:"utf8",timeout:5e3,windowsHide:!0});let s=e.split(`
`).map(n=>n.trim()).filter(Boolean),o=e.match(/AdapterRAM\s+(\d+)/);if(o){let n=parseInt(o[1],10);!isNaN(n)&&n>0&&(t=n/1024**3)}return{lines:s.filter(n=>n&&n!=="Name"&&n!=="AdapterRAM"),vramGB:t}}if(r==="darwin"){e=(0,ee.execSync)("system_profiler SPDisplaysDataType",{encoding:"utf8",timeout:1e4,maxBuffer:1024*1024});let s=e.split(`
`).map(n=>n.trim()).filter(n=>n.startsWith("Chipset")||n.startsWith("VRAM")||n.includes("Memory")),o=s.find(n=>/VRAM|vram|Video.*Memory/i.test(n));if(o){let n=o.match(/(\d+)\s*([MG]B)/i);n&&(t=n[2].toUpperCase()==="GB"?parseFloat(n[1]):parseFloat(n[1])/1024)}return{lines:s.slice(0,10),vramGB:t}}if(r==="linux"){e=(0,ee.execSync)("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader",{encoding:"utf8",timeout:5e3});let s=e.trim().split(`
`).map(n=>n.trim()).filter(Boolean),o=e.match(/(\d+)\s*MiB/);return o&&(t=parseInt(o[1],10)/1024),{lines:s,vramGB:t}}}catch{}return{lines:[],vramGB:null}}function Mo(){let r=N.platform(),e=[];if(r==="win32"){let t=process.env.LOCALAPPDATA||Ie.join(process.env.USERPROFILE||"","AppData","Local");e.push(Ie.join(t,"Programs","Ollama","ollama.exe"))}if(r==="darwin"){e.push("/usr/local/bin/ollama","/opt/homebrew/bin/ollama");let t=process.env.HOME||"";t&&e.push(Ie.join(t,".ollama","ollama"))}if(r==="linux"){e.push("/usr/local/bin/ollama","/usr/bin/ollama");let t=process.env.HOME||"";t&&e.push(Ie.join(t,".ollama","ollama"))}for(let t of e)try{if(Cs.existsSync(t))return!0}catch{}try{let t=(0,ee.spawnSync)("ollama",["--version"],{encoding:"utf8",timeout:3e3,shell:!0,windowsHide:!0});if(t.status===0||t.stdout?.trim()||t.stderr?.trim())return!0}catch{}return!1}function To(){let r=N.platform();try{if(r==="win32"){let t=(0,ee.execSync)("wmic logicaldisk get size,freespace",{encoding:"utf8",timeout:5e3,windowsHide:!0}).split(`
`).filter(s=>s.trim());for(let s=1;s<t.length;s++){let o=t[s].trim().split(/\s+/);if(o.length>=2){let n=parseInt(o[0],10);if(!isNaN(n))return n/1024**3}}}else{let t=(0,ee.execSync)("df -k /",{encoding:"utf8",timeout:5e3}).match(/\d+\s+(\d+)\s+\d+\s+\d+%\s+/);if(t)return parseInt(t[1],10)/1024**2}}catch{}return 50}async function le(){let r=N.platform(),e=N.totalmem()/1e9,t=N.cpus().length,{lines:s,vramGB:o}=Po(),n=Mo(),[i,a]=await Promise.all([Ss("http://localhost:11434/api/tags"),Ss("http://localhost:1234/v1/models")]),l=i.ok,c=a.ok,d=[];l&&i.json&&typeof i.json=="object"&&"models"in i.json&&(d=(i.json.models??[]).map(g=>(g.name??"").trim()).filter(Boolean));let p=To();return{platform:r,arch:N.arch(),totalRamGB:e,gpuInfo:s,vramGB:o,cpuCores:t,ollamaInstalled:n,ollamaRunning:l,lmstudioRunning:c,installedOllamaModels:d,diskFreeGB:p}}var nt=[{name:"qwen2.5-coder:32b",label:"Qwen2.5 Coder 32B",category:"code",sizeGB:22,minRamGB:24,minVramGB:24},{name:"qwen2.5-coder:14b",label:"Qwen2.5 Coder 14B",category:"code",sizeGB:10,minRamGB:16,minVramGB:16},{name:"deepseek-coder-v2",label:"DeepSeek Coder v2",category:"code",sizeGB:12,minRamGB:16,minVramGB:16},{name:"qwen2.5-coder:7b",label:"Qwen2.5 Coder 7B",category:"code",sizeGB:5,minRamGB:8,minVramGB:8},{name:"qwen2.5-coder:3b",label:"Qwen2.5 Coder 3B",category:"code",sizeGB:2,minRamGB:6,minVramGB:null},{name:"phi4",label:"Phi 4",category:"general",sizeGB:2.5,minRamGB:8,minVramGB:null},{name:"smollm2:1.7b",label:"SmolLM2 1.7B",category:"small",sizeGB:1.2,minRamGB:4,minVramGB:null},{name:"tinyllama",label:"TinyLlama",category:"small",sizeGB:.6,minRamGB:2,minVramGB:null}];function _s(r,e){return e.some(t=>t===r||t.startsWith(r+"-")||t.startsWith(r+":"))}function $e(r){let e=r.installedOllamaModels,t=r.totalRamGB,s=r.vramGB??0,o=s>=4,n=[],i=new Set,a=new Map(nt.map(c=>[c.name,c]));for(let c of nt)_s(c.name,e)&&(n.push({...c,recommended:n.filter(d=>d.recommended).length<2,reason:"Already installed",alreadyInstalled:!0}),n[n.length-1].recommended&&i.add(c.name));for(let c of e)nt.some(d=>_s(d.name,[c]))||n.unshift({name:c,label:c,category:"general",sizeGB:0,minRamGB:4,minVramGB:null,recommended:!1,reason:"Already installed",alreadyInstalled:!0});s>=24&&!i.has("qwen2.5-coder:32b")?i.add("qwen2.5-coder:32b"):s>=16&&!i.size?(i.add("qwen2.5-coder:14b"),i.add("deepseek-coder-v2")):s>=8&&!i.size&&i.add("qwen2.5-coder:7b"),t>=16&&!o&&!i.has("qwen2.5-coder:7b")&&i.add("qwen2.5-coder:7b"),t>=8&&i.size<2&&(i.has("qwen2.5-coder:3b")||i.add("qwen2.5-coder:3b"),i.has("phi4")||i.add("phi4")),t<8&&(i.add("smollm2:1.7b"),i.add("tinyllama")),i.size===0&&i.add(t>=8?"qwen2.5-coder:7b":"smollm2:1.7b");let l={"qwen2.5-coder:32b":"Best code model for 24GB+ VRAM","qwen2.5-coder:14b":"Best code model for your 16GB+ VRAM","deepseek-coder-v2":"Strong code model for 16GB+ VRAM","qwen2.5-coder:7b":o?"Best code model for your 8GB+ VRAM":"Best code model for your 16GB RAM (CPU)","qwen2.5-coder:3b":"Good balance of size and quality for 8GB RAM",phi4:"Small but capable for 8GB RAM","smollm2:1.7b":"Ultra-light for low RAM",tinyllama:"Smallest option for very limited RAM"};for(let c of nt){if(n.some(g=>g.name===c.name))continue;let d=c.minVramGB===null||s>=c.minVramGB;if(!(t>=c.minRamGB)||c.minVramGB!==null&&!d)continue;let u=i.has(c.name)&&n.filter(g=>g.recommended).length<2;n.push({...c,recommended:u,reason:l[c.name]??`Requires ${c.minRamGB}GB RAM${c.minVramGB?`, ${c.minVramGB}GB VRAM`:""}`,alreadyInstalled:!1})}return n.sort((c,d)=>c.alreadyInstalled!==d.alreadyInstalled?c.alreadyInstalled?-1:1:c.recommended!==d.recommended?c.recommended?-1:1:c.sizeGB-d.sizeGB),n}rt();var U=w(require("vscode"));rt();function Lo(){let r="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)r+=e.charAt(Math.floor(Math.random()*e.length));return r}function Ro(r,e){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${e}'; script-src 'nonce-${e}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawPilot Setup</title>
  <style nonce="${e}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 12px; }
    h2 { font-size: 14px; margin: 12px 0 8px; color: var(--vscode-descriptionForeground); }
    .specs { background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-focusBorder); padding: 10px 12px; margin: 8px 0; font-size: 12px; }
    .specs p { margin: 4px 0; }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin: 8px 0; background: var(--vscode-editor-inactiveSelectionBackground); }
    .card.recommended { border-color: var(--vscode-focusBorder); }
    .card .badge { display: inline-block; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
    .badge.installed { background: #4caf50; color: #fff; }
    .badge.rec { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .card .reason { font-size: 11px; color: var(--vscode-descriptionForeground); margin: 4px 0; }
    .card .meta { font-size: 11px; opacity: 0.8; margin: 4px 0; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 6px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .log { background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 8px; font-family: monospace; font-size: 11px; max-height: 120px; overflow-y: auto; margin: 8px 0; white-space: pre-wrap; }
    .progress { margin: 8px 0; height: 6px; background: var(--vscode-progressBar-background); border-radius: 3px; overflow: hidden; }
    .progress .fill { height: 100%; background: var(--vscode-progressBar-foreground); transition: width 0.2s; }
    .status { margin: 8px 0; font-size: 12px; }
    .done { color: #4caf50; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>ClawPilot Setup</h1>
  <div id="step1">
    <h2>System summary</h2>
    <div id="specs" class="specs">Scanning...</div>
    <p class="status" id="ollamaStatus">Checking Ollama...</p>
    <h2>Recommended for you</h2>
    <div id="recommendations"></div>
  </div>
  <div id="step2" style="display:none">
    <h2>Install Ollama</h2>
    <button id="installOllamaBtn">Install Ollama automatically</button>
    <div class="log" id="installLog"></div>
  </div>
  <div id="step3" style="display:none">
    <h2>Install model</h2>
    <div class="progress"><div class="fill" id="modelProgress" style="width:0%"></div></div>
    <div class="log" id="modelLog"></div>
    <div id="modelDone" class="done" style="display:none"></div>
  </div>
  <script nonce="${e}">
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);
    const specs = $('specs');
    const recsEl = $('recommendations');
    const ollamaStatus = $('ollamaStatus');
    const step2 = $('step2');
    const step3 = $('step3');
    const installLog = $('installLog');
    const modelLog = $('modelLog');
    const modelProgress = $('modelProgress');
    const modelDone = $('modelDone');

    function esc(s) { return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function renderSpecs(info) {
      if (!info) return;
      specs.innerHTML = '<p><strong>Platform:</strong> ' + esc(info.platform) + ' / ' + esc(info.arch) + '</p>' +
        '<p><strong>RAM:</strong> ' + (info.totalRamGB || 0).toFixed(1) + ' GB</p>' +
        '<p><strong>CPU cores:</strong> ' + (info.cpuCores || 0) + '</p>' +
        (info.gpuInfo && info.gpuInfo.length ? '<p><strong>GPU:</strong> ' + esc(info.gpuInfo.slice(0,3).join('; ')) + '</p>' : '') +
        (info.vramGB != null ? '<p><strong>VRAM:</strong> ' + info.vramGB.toFixed(1) + ' GB</p>' : '') +
        '<p><strong>Disk free:</strong> ' + (info.diskFreeGB || 0).toFixed(0) + ' GB</p>';
    }
    function renderRecs(list) {
      if (!list || !list.length) { recsEl.innerHTML = '<p>No models to show. Install Ollama first.</p>'; return; }
      recsEl.innerHTML = list.map(r => {
        const badges = (r.alreadyInstalled ? '<span class="badge installed">Installed</span>' : '') +
          (r.recommended ? '<span class="badge rec">Recommended</span>' : '');
        const btn = r.alreadyInstalled ? '' : '<button data-model="' + esc(r.name) + '">Install</button>';
        return '<div class="card' + (r.recommended ? ' recommended' : '') + '">' +
          '<strong>' + esc(r.label) + '</strong>' + badges +
          '<p class="reason">' + esc(r.reason) + '</p>' +
          '<p class="meta">' + (r.sizeGB ? r.sizeGB + ' GB' : '') + ' \xB7 Min RAM: ' + r.minRamGB + ' GB' + (r.minVramGB ? ', VRAM: ' + r.minVramGB + ' GB' : '') + '</p>' +
          btn + '</div>';
      }).join('');
      recsEl.querySelectorAll('button[data-model]').forEach(btn => {
        btn.onclick = () => vscode.postMessage({ command: 'installModel', model: btn.dataset.model });
      });
    }
    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'systemInfo') {
        renderSpecs(msg.data);
        const info = msg.data;
        ollamaStatus.textContent = info.ollamaRunning ? 'Ollama is running.' : (info.ollamaInstalled ? 'Ollama is installed but not running. Start it from the setup flow.' : 'Ollama is not installed.');
        if (!info.ollamaInstalled) step2.style.display = 'block';
      }
      if (msg.command === 'recommendations') {
        renderRecs(msg.data);
      }
      if (msg.command === 'progress') {
        if (msg.percent != null) {
          modelProgress.style.width = msg.percent + '%';
          step3.style.display = 'block';
        }
        if (msg.message) {
          const el = msg.phase === 'model' ? modelLog : installLog;
          el.textContent += msg.message + '\\n';
          el.scrollTop = el.scrollHeight;
        }
      }
      if (msg.command === 'done') {
        modelProgress.style.width = '100%';
        modelDone.style.display = 'block';
        modelDone.textContent = 'Ready! ClawPilot is now using ' + (msg.model || '') + '. You can close this panel.';
      }
    });
    $('installOllamaBtn').onclick = () => vscode.postMessage({ command: 'installOllama' });
    vscode.postMessage({ command: 'scanSystem' });
  </script>
</body>
</html>`}function ye(r,e){let t=U.window.activeTextEditor?.viewColumn??U.ViewColumn.One,s=U.window.createWebviewPanel("clawpilot.setup","ClawPilot Setup",t,{enableScripts:!0,localResourceRoots:[r],retainContextWhenHidden:!0});s.webview.html=Ro(r,Lo()),s.webview.onDidReceiveMessage(async o=>{if(o.command==="scanSystem")try{let n=await le();n.ollamaRunning&&n.installedOllamaModels?.length>0&&await e.globalState.update("clawpilot.onboardingComplete",!0),s.webview.postMessage({command:"systemInfo",data:n});let i=$e(n);s.webview.postMessage({command:"recommendations",data:i})}catch(n){s.webview.postMessage({command:"progress",message:`Scan failed: ${n instanceof Error?n.message:String(n)}`})}if(o.command==="installOllama"){let n=i=>s.webview.postMessage({command:"progress",message:i,phase:"ollama"});try{let{installOllama:i}=await Promise.resolve().then(()=>(rt(),Ms));if(await i(n),n("Starting Ollama server..."),await Le(n)){n("Done! Refreshing...");let l=await le();s.webview.postMessage({command:"systemInfo",data:l}),s.webview.postMessage({command:"recommendations",data:$e(l)})}}catch(i){n(`Install failed: ${i instanceof Error?i.message:String(i)}`)}}if(o.command==="installModel"&&o.model){let n=o.model,{spawn:i}=await import("child_process"),a=(d,p)=>s.webview.postMessage({command:"progress",message:d,percent:p,phase:"model"});a(`Pulling ${n}...`,0);let l=i("ollama",["pull",n],{shell:!0,windowsHide:!0}),c=0;l.stdout?.on("data",d=>{let p=d.toString();a(p.trim());let u=p.match(/(\d+)%/);u&&(c=Math.min(100,parseInt(u[1],10)))}),l.stderr?.on("data",d=>a(d.toString().trim())),l.on("close",async d=>{d===0?(a("",100),await U.workspace.getConfiguration("clawpilot").update("model",n,U.ConfigurationTarget.Global),await e.globalState.update("clawpilot.onboardingComplete",!0),s.webview.postMessage({command:"done",model:n})):a(`Pull exited with code ${d}`)})}}),e.subscriptions.push(s)}var at=class{async run(e){let t=H.workspace.getConfiguration("clawpilot"),s=t.get("model","").trim().length>0;await H.window.withProgress({location:H.ProgressLocation.Notification,title:"ClawPilot: Scanning your system...",cancellable:!1},async()=>{let o=await le();if(!o.ollamaRunning&&!o.lmstudioRunning){if(!await St()){await H.window.showInformationMessage("ClawPilot: No local AI server is running. Set up Ollama to get started.","Set up local AI (recommended)","Use API key instead","Skip")==="Set up local AI (recommended)"&&await ye(e.extensionUri,e),e.globalState.update("clawpilot.setupRanOnce",!0);return}await Le(()=>{})}if(o.ollamaRunning&&o.installedOllamaModels.length===0){s||await ye(e.extensionUri,e),e.globalState.update("clawpilot.setupRanOnce",!0);return}if(o.ollamaRunning&&o.installedOllamaModels.length>0&&!s){let n=$e(o),a=(n.find(l=>l.alreadyInstalled&&l.recommended)??n.find(l=>l.alreadyInstalled))?.name??o.installedOllamaModels[0];await t.update("model",a,H.ConfigurationTarget.Global)}e.globalState.update("clawpilot.setupRanOnce",!0)})}};var Re=w(require("vscode"));async function Ts(r,e){let t=(e??"").trim();if(!t)return{ok:!1,error:"No API key provided."};try{if(r==="anthropic"){let s=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":t,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-haiku-4-5",max_tokens:1,messages:[{role:"user",content:"Hi"}]})});if(!s.ok){let o=await s.text();return{ok:!1,error:`${s.status}: ${o.slice(0,200)}`}}return{ok:!0}}if(r==="openai"){let s=await fetch("https://api.openai.com/v1/models",{headers:{Authorization:`Bearer ${t}`}});if(!s.ok){let o=await s.text();return{ok:!1,error:`${s.status}: ${o.slice(0,200)}`}}return{ok:!0}}if(r==="google"){let s=await fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(t));if(!s.ok){let o=await s.text();return{ok:!1,error:`${s.status}: ${o.slice(0,200)}`}}return{ok:!0}}return{ok:!1,error:"Unknown API type."}}catch(s){return{ok:!1,error:s instanceof Error?s.message:String(s)}}}function Oo(){let r="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)r+=e.charAt(Math.floor(Math.random()*e.length));return r}function Bo(r,e){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${e}'; script-src 'nonce-${e}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawPilot: API Keys</title>
  <style nonce="${e}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .warning { background: var(--vscode-inputValidation-warningBackground); border-left: 4px solid var(--vscode-inputValidation-warningBorder); padding: 10px 12px; margin: 12px 0; font-size: 12px; }
    .section { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin: 12px 0; background: var(--vscode-editor-inactiveSelectionBackground); }
    .section h2 { font-size: 14px; margin-bottom: 8px; color: var(--vscode-descriptionForeground); }
    input[type="password"], input[type="text"] { width: 100%; padding: 6px 8px; margin: 4px 0; font-family: monospace; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); border-radius: 4px; }
    .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { font-size: 12px; margin-left: 8px; }
    .status.not-set { color: var(--vscode-descriptionForeground); }
    .status.valid { color: var(--vscode-testing-iconPassed); }
    .status.invalid { color: var(--vscode-testing-iconFailed); }
    .save-row { margin-top: 16px; }
  </style>
</head>
<body>
  <h1>ClawPilot: API Keys</h1>
  <p class="warning"><strong>API keys are only needed for premium models.</strong> Local models (Ollama, LM Studio, etc.) are free. Only add keys here if you want to use Anthropic, OpenAI, or Google Gemini.</p>

  <div class="section">
    <h2>Anthropic (Claude)</h2>
    <input type="password" id="anthropicKey" placeholder="sk-ant-..." />
    <div class="row">
      <button id="testAnthropic">Test</button>
      <span id="statusAnthropic" class="status not-set">Not set</span>
    </div>
  </div>
  <div class="section">
    <h2>OpenAI (GPT)</h2>
    <input type="password" id="openaiKey" placeholder="sk-..." />
    <div class="row">
      <button id="testOpenai">Test</button>
      <span id="statusOpenai" class="status not-set">Not set</span>
    </div>
  </div>
  <div class="section">
    <h2>Google (Gemini)</h2>
    <input type="password" id="googleKey" placeholder="AIza..." />
    <div class="row">
      <button id="testGoogle">Test</button>
      <span id="statusGoogle" class="status not-set">Not set</span>
    </div>
  </div>

  <div class="row save-row">
    <button id="saveBtn">Save keys</button>
  </div>

  <script nonce="${e}">
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);
    const apis = ['anthropic', 'openai', 'google'];

    function setStatus(api, state, text) {
      const el = $('status' + api.charAt(0).toUpperCase() + api.slice(1));
      if (!el) return;
      el.className = 'status ' + state;
      el.textContent = text;
    }

    apis.forEach(api => {
      $('test' + api.charAt(0).toUpperCase() + api.slice(1)).onclick = () => {
        const key = $(api + 'Key').value.trim();
        if (!key) { setStatus(api, 'invalid', 'Enter a key first'); return; }
        setStatus(api, 'not-set', 'Testing...');
        vscode.postMessage({ command: 'testKey', apiType: api, apiKey: key });
      };
    });

    $('saveBtn').onclick = () => {
      const keys = {};
      apis.forEach(api => {
        keys[api] = $(api + 'Key').value.trim();
      });
      vscode.postMessage({ command: 'saveKeys', keys });
    };

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'keyStatus') {
        apis.forEach(api => {
          const has = msg[api];
          setStatus(api, 'not-set', has ? 'Saved (click Test to verify)' : 'Not set');
        });
      }
      if (msg.command === 'testResult') {
        const api = msg.apiType;
        if (msg.ok) setStatus(api, 'valid', 'Valid');
        else setStatus(api, 'invalid', msg.error || 'Invalid');
      }
      if (msg.command === 'saved') {
        apis.forEach(api => setStatus(api, 'not-set', msg[api] ? 'Saved (click Test to verify)' : 'Not set'));
      }
    });

    vscode.postMessage({ command: 'loadKeyStatus' });
  </script>
</body>
</html>`}function Oe(r,e){let t=Re.window.activeTextEditor?.viewColumn??Re.ViewColumn.One,s=Re.window.createWebviewPanel("clawpilot.apiKeys","ClawPilot: API Keys",t,{enableScripts:!0,localResourceRoots:[r],retainContextWhenHidden:!0});s.webview.html=Bo(r,Oo()),s.webview.onDidReceiveMessage(async o=>{if(o.command==="loadKeyStatus"){let n=!!await e.secrets.get(j.anthropic),i=!!await e.secrets.get(j.openai),a=!!await e.secrets.get(j.google);s.webview.postMessage({command:"keyStatus",anthropic:n,openai:i,google:a})}if(o.command==="testKey"&&o.apiType&&o.apiKey!==void 0){let n=await Ts(o.apiType,o.apiKey);s.webview.postMessage({command:"testResult",apiType:o.apiType,ok:n.ok,error:n.error})}if(o.command==="saveKeys"&&o.keys){let n=o.keys;for(let c of["anthropic","openai","google"]){let d=n[c],p=j[c];d?await e.secrets.store(p,d):await e.secrets.delete(p)}let i=!!(n.anthropic&&n.anthropic.length),a=!!(n.openai&&n.openai.length),l=!!(n.google&&n.google.length);s.webview.postMessage({command:"saved",anthropic:i,openai:a,google:l})}}),e.subscriptions.push(s)}var we,C,K,pe,ct,V,k;async function Do(r){try{k=await je(r)}catch(c){let d=c instanceof Error?c.message:String(c);if(d.includes("API key")&&d.includes("Manage API Keys"))m.window.showWarningMessage(d,"Open API Keys").then(p=>{p==="Open API Keys"&&Oe(r.extensionUri,r)}),k=new ie;else throw c}K=new Ve,K.startWatching(),r.subscriptions.push({dispose:()=>K.dispose()}),pe=new Ye(r.globalStorageUri),ct=new Xe(r.globalStorageUri),await pe.init(),await ct.init(),r.subscriptions.push({dispose:()=>{pe.save()}}),we=m.window.createStatusBarItem(m.StatusBarAlignment.Right,100),se(k),we.command="clawpilot.openChat",we.show(),r.subscriptions.push(we),C=new ke(r.extensionUri,k,K,pe,ct),r.subscriptions.push(m.window.registerWebviewViewProvider(ke.viewType,C,{webviewOptions:{retainContextWhenHidden:!0}}));let e=new tt(r);C.setHistoryStore(e);let t=m.workspace.getConfiguration("clawpilot");if(t.get("proxyEnabled",!1)){V=new Ee(k);try{await V.start(),r.subscriptions.push({dispose:()=>V?.stop()})}catch(c){m.window.showErrorMessage(`ClawPilot proxy failed to start: ${c instanceof Error?c.message:String(c)}`)}}let s=new ot;s.register(hs()),s.register(gs()),s.register(vs()),s.register(xs(ct)),s.register(ys()),s.register(ws(K)),s.register(bs(pe)),C.setContextRegistry(s);let o=m.workspace.getConfiguration("clawpilot").get("model","llama3"),n=new qe(k,o);r.subscriptions.push(m.languages.registerInlineCompletionItemProvider({pattern:"**"},n)),new Ge(r),r.subscriptions.push(m.commands.registerCommand("clawpilot.toggleCompletions",async()=>{let c=m.workspace.getConfiguration("clawpilot"),d=c.get("inlineCompletionsEnabled",!0);await c.update("inlineCompletionsEnabled",!d,m.ConfigurationTarget.Global),m.window.showInformationMessage(`ClawPilot inline completions ${d?"disabled":"enabled"}.`)})),r.subscriptions.push(m.languages.registerCodeActionsProvider("*",new Te,{providedCodeActionKinds:Te.providedCodeActionKinds})),r.subscriptions.push(m.commands.registerCommand("clawpilot.fixDiagnostic",async(c,d)=>{let p=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",u=ds(c,d,p);await C.sendQuickAction(u)})),new Ze(r),new st(r),r.subscriptions.push(m.commands.registerCommand("clawpilot.askGitStatus",async()=>{await C.sendQuickAction("Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise.")})),r.subscriptions.push(m.commands.registerCommand("clawpilot.newSession",async()=>{let c=await m.window.showInputBox({prompt:"Session name (leave blank for default)",placeHolder:"My debugging session"});if(c===void 0)return;let d=e.createSession(c||void 0);C.switchSession(d)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.switchSession",async()=>{let c=e.getIndex();if(!c.sessions.length){m.window.showInformationMessage("No saved sessions.");return}let d=c.sessions.map(g=>({label:g.name,description:new Date(g.updatedAt).toLocaleString(),id:g.id})),p=await m.window.showQuickPick(d,{placeHolder:"Select a session"});if(!p)return;let u=e.loadSession(p.id);u&&(e.setActiveSession(p.id),C.switchSession(u))})),r.subscriptions.push(m.commands.registerCommand("clawpilot.clearSession",async()=>{let c=e.getActiveSessionId();!c||await m.window.showWarningMessage("Clear all messages in this session?","Yes","Cancel")!=="Yes"||(e.clearMessages(c),C.clearWebviewMessages())})),r.subscriptions.push(m.commands.registerCommand("clawpilot.exportSession",async()=>{let c=e.getActiveSessionId();if(!c)return;let d=e.exportSession(c),p=await m.workspace.openTextDocument({content:d,language:"markdown"});await m.window.showTextDocument(p)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.openChat",()=>{if(!m.workspace.getConfiguration("clawpilot").get("model","").trim()){ye(r.extensionUri,r);return}m.commands.executeCommand("clawpilot.chatView.focus")})),r.subscriptions.push(m.commands.registerCommand("clawpilot.setup",()=>{ye(r.extensionUri,r)})),r.subscriptions.push(m.languages.registerCodeLensProvider("*",new Qe)),r.subscriptions.push(m.commands.registerCommand("clawpilot.explain",async()=>{let c=m.window.activeTextEditor;if(!c)return;let d=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ce(c,d);if(!p){m.window.showInformationMessage("Select some code first.");return}let u=ae("explain",p);await C.sendQuickAction(u)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.refactor",async()=>{let c=m.window.activeTextEditor;if(!c)return;let d=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ce(c,d);if(!p){m.window.showInformationMessage("Select some code first.");return}let u=ae("refactor",p);await C.sendQuickAction(u)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.fix",async()=>{let c=m.window.activeTextEditor;if(!c)return;let d=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ce(c,d);if(!p){m.window.showInformationMessage("Select some code first.");return}let u=ae("fix",p);await C.sendQuickAction(u)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.add_tests",async()=>{let c=m.window.activeTextEditor;if(!c)return;let d=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ce(c,d);if(!p){m.window.showInformationMessage("Select some code first.");return}let u=ae("add_tests",p);await C.sendQuickAction(u)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.add_docs",async()=>{let c=m.window.activeTextEditor;if(!c)return;let d=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ce(c,d);if(!p){m.window.showInformationMessage("Select some code first.");return}let u=ae("add_docs",p);await C.sendQuickAction(u)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.codeLensAction",async(c,d)=>{let p=await m.workspace.openTextDocument(c),u=p.getText().split(/\r?\n/),g=(u[d]??"").match(/^(\s*)/)?.[1]?.length??0,v=d,y=Math.min(d+80,u.length);for(let oe=d+1;oe<y;oe++){let _t=u[oe]??"";if(_t.trim().length>0&&(_t.match(/^(\s*)/)?.[1]?.length??0)<=g){v=oe-1;break}v=oe}let h=Math.min(v,u.length-1),f=(u[h]??"").length,x=new m.Range(d,0,h,f),b=await m.window.showTextDocument(p,{selection:x,preserveFocus:!1});b.revealRange(x);let T=m.workspace.workspaceFolders?.[0]?.uri.fsPath??"",E=ce(b,T);if(!E)return;let P=[{label:"$(symbol-misc) Explain",detail:"explain"},{label:"$(tools) Refactor",detail:"refactor"},{label:"$(bug) Fix Bug",detail:"fix"},{label:"$(beaker) Add Tests",detail:"add_tests"},{label:"$(book) Add Docs",detail:"add_docs"}],Ct=await m.window.showQuickPick(P,{placeHolder:"ClawPilot: Choose action"});if(Ct?.detail){let oe=ae(Ct.detail,E);await C.sendQuickAction(oe)}}));let i=[["clawpilot.explainCode","/explain"],["clawpilot.refactorCode","/refactor"],["clawpilot.fixCode","/fix"],["clawpilot.generateDocs","/docs"],["clawpilot.reviewCode","/review"],["clawpilot.optimizeCode","/optimize"],["clawpilot.writeTests","/test"],["clawpilot.addTypes","/types"]];for(let[c,d]of i)r.subscriptions.push(m.commands.registerCommand(c,()=>No(d)));if(r.subscriptions.push(m.commands.registerCommand("clawpilot.editFile",async()=>{let c=m.window.activeTextEditor,d=await m.window.showInputBox({prompt:"Describe the changes to make to this file",placeHolder:"e.g. Add error handling to all async functions"});if(!d)return;let p=c?c.document.getText():"";C.sendToChat(`/edit ${d}`,p),m.commands.executeCommand("clawpilot.chatView.focus")})),r.subscriptions.push(m.commands.registerCommand("clawpilot.planFeature",async()=>{let c=await m.window.showInputBox({prompt:"Describe the feature to plan",placeHolder:"e.g. Add user authentication with JWT"});c&&(C.sendToChat(`/plan ${c}`),m.commands.executeCommand("clawpilot.chatView.focus"))})),r.subscriptions.push(m.commands.registerCommand("clawpilot.runCommand",async()=>{let c=await m.window.showInputBox({prompt:"Terminal command to run",placeHolder:"e.g. npm test"});c&&(C.sendToChat(`/run ${c}`),m.commands.executeCommand("clawpilot.chatView.focus"))})),r.subscriptions.push(m.commands.registerCommand("clawpilot.selectProvider",async()=>{let c=["ollama","lmstudio","llamafile","vllm","localai","jan","textgen-webui","openai-compatible"],d=[];c.forEach(y=>{d.push({label:ne[y],detail:y})}),d.push({label:"Premium (API)",kind:m.QuickPickItemKind.Separator}),Y.forEach(y=>{d.push({label:ne[y],detail:y})});let p=await m.window.showQuickPick(d,{matchOnDescription:!0,placeHolder:"Select LLM provider"});if(!p?.detail)return;let u=p.detail,g=m.workspace.getConfiguration("clawpilot"),v=g.get("provider","ollama");await g.update("provider",u,m.ConfigurationTarget.Global);try{k=await je(r)}catch(y){let h=y instanceof Error?y.message:String(y);if(h.includes("API key")&&h.includes("Manage API Keys")){await g.update("provider",v,m.ConfigurationTarget.Global),m.window.showWarningMessage(h,"Open API Keys").then(f=>{f==="Open API Keys"&&Oe(r.extensionUri,r)});return}throw await g.update("provider",v,m.ConfigurationTarget.Global),y}C.setClient(k),n.setClient(k),await se(k),m.window.showInformationMessage(`ClawPilot: Using ${k.displayName}.`)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.manageApiKeys",()=>{Oe(r.extensionUri,r)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.doctor",async()=>{await Fo(r.extensionUri,k,K,pe)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.selectModel",async()=>{k.refreshConfig();let c=[];try{c=(await k.listModels()).map(v=>({name:v.name}))}catch{}let d=new Set(c.map(g=>g.name)),p=[...c.map(g=>({label:`$(check) ${g.name}`,description:"Installed",detail:g.name}))];k.pullModel&&(p.push({label:"$(package) Available to pull",kind:m.QuickPickItemKind.Separator}),p.push(...dt.filter(g=>!d.has(g.name)).map(g=>({label:g.label,description:g.category,detail:g.name}))));let u=await m.window.showQuickPick(p,{matchOnDescription:!0,matchOnDetail:!0,placeHolder:k.pullModel?"Select or pull a model":"Select model"});if(u?.detail){let g=u.detail;k.pullModel&&!d.has(g)&&await As(k,g),await m.workspace.getConfiguration("clawpilot").update("model",g,m.ConfigurationTarget.Global),await se(k,g)}})),r.subscriptions.push(m.commands.registerCommand("clawpilot.clearMemory",async()=>{await m.window.showWarningMessage("Clear all agent memory (core, recall, archival)? This cannot be undone.","Clear","Cancel")==="Clear"&&(await pe.clearAll(),m.window.showInformationMessage("ClawPilot: Memory cleared."))})),r.subscriptions.push(m.commands.registerCommand("clawpilot.viewMemory",()=>{m.commands.executeCommand("clawpilot.chatView.focus")})),r.subscriptions.push(m.commands.registerCommand("clawpilot.reindexWorkspace",async()=>{try{await m.window.withProgress({location:m.ProgressLocation.Notification,title:"ClawPilot: Indexing workspace",cancellable:!1},async d=>{await K.indexAll((p,u)=>{d.report({message:u!=null?`${p} (${u} files)`:p})})});let c=K.status;m.window.showInformationMessage(`ClawPilot: ${c.chunkCount} chunks indexed.`)}catch(c){m.window.showErrorMessage(`Re-index failed: ${c instanceof Error?c.message:String(c)}`)}})),r.subscriptions.push(m.commands.registerCommand("clawpilot.pullModel",async()=>{if(!k.pullModel){m.window.showInformationMessage("Pull model is only available for the Ollama provider.");return}let c=dt.map(u=>({label:u.label,description:u.category,detail:u.name})),d=await m.window.showQuickPick(c,{matchOnDescription:!0,placeHolder:"Select model to pull from registry"});if(!d?.detail)return;let p=d.detail;await As(k,p),await m.workspace.getConfiguration("clawpilot").update("model",p,m.ConfigurationTarget.Global),se(k,p)})),r.subscriptions.push(m.commands.registerCommand("clawpilot.toggleProxy",async()=>{let c=m.workspace.getConfiguration("clawpilot");if(c.get("proxyEnabled",!1)){await c.update("proxyEnabled",!1,m.ConfigurationTarget.Global),V?.stop(),V=void 0,m.window.showInformationMessage("ClawPilot proxy disabled.");return}await c.update("proxyEnabled",!0,m.ConfigurationTarget.Global),V?.stop(),V=new Ee(k);try{await V.start(),r.subscriptions.push({dispose:()=>V?.stop()}),m.window.showInformationMessage("ClawPilot proxy enabled.")}catch(p){m.window.showErrorMessage(`Failed to start ClawPilot proxy: ${p instanceof Error?p.message:String(p)}`)}})),m.workspace.getConfiguration("clawpilot").get("ragEnabled",!0)&&m.workspace.workspaceFolders?.length&&m.window.withProgress({location:m.ProgressLocation.Window,title:"ClawPilot: Indexing workspace",cancellable:!1},async c=>{try{await K.indexAll((d,p)=>{c.report({message:p!=null?`Indexing... (${p} files)`:d})})}catch{}}),t.get("autoDetectProvider",!1)&&!await k.isAvailable()){let d=await At();d&&(k=d,C.setClient(k),n.setClient(k),await se(k),m.window.setStatusBarMessage(`ClawPilot: Auto-detected ${k.displayName}. Using it for this session.`,8e3))}k.isAvailable().then(async c=>{c||(k.providerType==="ollama"?m.window.showWarningMessage("ClawPilot: Server not found. Install Ollama and run `ollama serve`.","Get Ollama").then(p=>{p==="Get Ollama"&&m.env.openExternal(m.Uri.parse("https://ollama.com"))}):m.window.showWarningMessage(`ClawPilot: ${k.displayName} not found at ${k.baseEndpoint}.`));let d=m.workspace.getConfiguration("clawpilot").get("model","");await se(k,d)}),r.subscriptions.push(m.workspace.onDidChangeConfiguration(c=>{if(c.affectsConfiguration("clawpilot.model")){let d=m.workspace.getConfiguration("clawpilot").get("model","");se(k,d),n.updateModel(d||"llama3")}c.affectsConfiguration("clawpilot.provider")&&je(r).then(async d=>{k=d,C.setClient(k),n.setClient(k),await se(k)}).catch(d=>{let p=d instanceof Error?d.message:String(d);p.includes("API key")&&m.window.showWarningMessage(p,"Open API Keys").then(u=>{u==="Open API Keys"&&Oe(r.extensionUri,r)})})})),new at().run(r)}function No(r){let e=m.window.activeTextEditor;if(!e||e.selection.isEmpty){m.window.showWarningMessage("Select some code first, then use this command.");return}let t=e.document.getText(e.selection);C.sendToChat(r,t),m.commands.executeCommand("clawpilot.chatView.focus")}async function As(r,e){if(r.pullModel)try{await m.window.withProgress({location:m.ProgressLocation.Notification,title:`Pulling ${e}`,cancellable:!1},async t=>{await r.pullModel(e,s=>t.report({message:s}))}),m.window.showInformationMessage(`ClawPilot: ${e} ready!`)}catch(t){m.window.showErrorMessage(`Pull failed: ${t instanceof Error?t.message:String(t)}`)}}async function Fo(r,e,t,s){let o=m.window.createWebviewPanel("clawpilot.doctor","ClawPilot: System Diagnostics",m.ViewColumn.One,{enableScripts:!1}),n=m.workspace.getConfiguration("clawpilot"),i=n.get("provider","ollama"),a=n.get("model",""),l;try{l=await le()}catch{l={platform:"win32",arch:"unknown",totalRamGB:0,gpuInfo:[],vramGB:null,cpuCores:0,ollamaInstalled:!1,ollamaRunning:!1,lmstudioRunning:!1,installedOllamaModels:[],diskFreeGB:0}}let c=await e.isAvailable(),d=t.status,p=s.getRecallCount(),u=s.getArchivalCount(),g=[];c||(i==="ollama"?g.push("Start Ollama: run `ollama serve` in a terminal, or use **ClawPilot: Setup** to install and start."):g.push(`Ensure ${e.displayName} is running at ${e.baseEndpoint}.`)),c&&!a&&g.push("Select a model via the chat header (provider badge) or **ClawPilot: Select Model**."),i==="ollama"&&!l.ollamaInstalled&&g.push("Install Ollama: use **ClawPilot: Setup** or visit https://ollama.com"),d.chunkCount===0&&!d.isIndexing&&g.push("Index the workspace for better RAG: run **ClawPilot: Re-index Workspace**.");function v(h){return J(h).replace(/\*\*(.*?)\*\*/g,(f,x)=>"<strong>"+J(x)+"</strong>").replace(/`(.*?)`/g,(f,x)=>"<code>"+J(x)+"</code>")}let y=`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>ClawPilot Diagnostics</title></head>
<body style="font-family: var(--vscode-font-family); font-size: 13px; padding: 16px; color: var(--vscode-foreground);">
<h1 style="font-size: 18px;">ClawPilot System Diagnostics</h1>
<h2 style="font-size: 14px; margin-top: 16px;">Provider</h2>
<p><strong>Current:</strong> ${J(e.displayName)}</p>
<p><strong>Status:</strong> ${c?"\u2713 Running":"\u2717 Not available"}</p>
<p><strong>Model:</strong> ${J(a||"\u2014 not set")}</p>
<h2 style="font-size: 14px; margin-top: 16px;">System</h2>
<p><strong>Platform:</strong> ${J(l.platform)} / ${J(l.arch)}</p>
<p><strong>RAM:</strong> ${l.totalRamGB.toFixed(1)} GB</p>
<p><strong>CPU cores:</strong> ${l.cpuCores}</p>
${l.vramGB!=null?`<p><strong>VRAM:</strong> ${l.vramGB.toFixed(1)} GB</p>`:""}
${l.gpuInfo.length?`<p><strong>GPU:</strong> ${J(l.gpuInfo.slice(0,3).join("; "))}</p>`:""}
<p><strong>Disk free:</strong> ${l.diskFreeGB.toFixed(0)} GB</p>
<h2 style="font-size: 14px; margin-top: 16px;">Ollama</h2>
<p><strong>Installed:</strong> ${l.ollamaInstalled?"Yes":"No"}</p>
<p><strong>Running:</strong> ${l.ollamaRunning?"Yes":"No"}</p>
${l.installedOllamaModels.length?`<p><strong>Models:</strong> ${J(l.installedOllamaModels.join(", "))}</p>`:""}
<h2 style="font-size: 14px; margin-top: 16px;">Workspace index</h2>
<p><strong>Chunks indexed:</strong> ${d.chunkCount}</p>
<p><strong>Status:</strong> ${d.isIndexing?"Indexing\u2026":d.chunkCount>0?"Ready":"Not indexed"}</p>
<h2 style="font-size: 14px; margin-top: 16px;">Memory store</h2>
<p><strong>Recall entries:</strong> ${p}</p>
<p><strong>Archival entries:</strong> ${u}</p>
${g.length?`<h2 style="font-size: 14px; margin-top: 16px;">Suggestions</h2><ul>${g.map(h=>`<li>${v(h)}</li>`).join("")}</ul>`:""}
</body>
</html>`;o.webview.html=y}function J(r){return r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function se(r,e){let t=m.workspace.getConfiguration("clawpilot"),s=e??t.get("model",""),o=Y.includes(r.providerType),n=o?`${r.displayName} (API)`:r.displayName,i="$(primitive-dot)",a="ClawPilot \u2014 click to open chat";try{let l=await r.isAvailable();o?(i="$(cloud)",a=l?`ClawPilot \xB7 ${n} \xB7 ${s||"no model"}`:`ClawPilot \xB7 ${n} \xB7 not available`):l&&s?(i="$(pass)",a=`ClawPilot \xB7 ${n} \xB7 ${s} \xB7 ready`):l?(i="$(warning)",a=`ClawPilot \xB7 ${n} \xB7 no model selected`):(i="$(error)",a=`ClawPilot \xB7 ${n} \xB7 not available`)}catch{i="$(error)",a=`ClawPilot \xB7 ${n} \xB7 error`}we.text=s?`$(claw) ${i} [${n}]: ${s}`:`$(claw) ${i} [${n}]`,we.tooltip=a}function jo(){}0&&(module.exports={activate,deactivate});
