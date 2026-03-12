"use strict";var yt=Object.create;var oe=Object.defineProperty;var bt=Object.getOwnPropertyDescriptor;var wt=Object.getOwnPropertyNames;var xt=Object.getPrototypeOf,kt=Object.prototype.hasOwnProperty;var _t=(c,e)=>{for(var t in e)oe(c,t,{get:e[t],enumerable:!0})},Le=(c,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of wt(e))!kt.call(c,n)&&n!==t&&oe(c,n,{get:()=>e[n],enumerable:!(s=bt(e,n))||s.enumerable});return c};var w=(c,e,t)=>(t=c!=null?yt(xt(c)):{},Le(e||!c||!c.__esModule?oe(t,"default",{value:c,enumerable:!0}):t,c)),St=c=>Le(oe({},"__esModule",{value:!0}),c);var os={};_t(os,{activate:()=>ts,deactivate:()=>ns});module.exports=St(os);var d=w(require("vscode"));var ke=w(require("vscode")),_e=[{name:"deepseek-coder:6.7b",label:"DeepSeek Coder 6.7B",category:"code"},{name:"deepseek-coder:33b",label:"DeepSeek Coder 33B",category:"code"},{name:"deepseek-coder-v2",label:"DeepSeek Coder v2",category:"code"},{name:"codellama:7b",label:"Code Llama 7B",category:"code"},{name:"codellama:13b",label:"Code Llama 13B",category:"code"},{name:"codellama:34b",label:"Code Llama 34B",category:"code"},{name:"starcoder2:3b",label:"StarCoder2 3B",category:"code"},{name:"starcoder2:7b",label:"StarCoder2 7B",category:"code"},{name:"qwen2.5-coder:7b",label:"Qwen2.5 Coder 7B",category:"code"},{name:"qwen2.5-coder:14b",label:"Qwen2.5 Coder 14B",category:"code"},{name:"qwen2.5-coder:32b",label:"Qwen2.5 Coder 32B",category:"code"},{name:"llama3.2:3b",label:"Llama 3.2 3B",category:"general"},{name:"llama3.1:8b",label:"Llama 3.1 8B",category:"general"},{name:"llama3.1:70b",label:"Llama 3.1 70B",category:"general"},{name:"mistral:7b",label:"Mistral 7B",category:"general"},{name:"mistral-nemo",label:"Mistral Nemo",category:"general"},{name:"mixtral:8x7b",label:"Mixtral 8x7B",category:"general"},{name:"gemma2:2b",label:"Gemma 2 2B",category:"general"},{name:"gemma2:9b",label:"Gemma 2 9B",category:"general"},{name:"phi3.5",label:"Phi 3.5",category:"general"},{name:"phi4",label:"Phi 4",category:"general"},{name:"qwen2.5:7b",label:"Qwen2.5 7B",category:"general"},{name:"qwen2.5:14b",label:"Qwen2.5 14B",category:"general"},{name:"qwen2.5:32b",label:"Qwen2.5 32B",category:"general"},{name:"tinyllama",label:"TinyLlama",category:"small"},{name:"smollm2:135m",label:"SmolLM2 135M",category:"small"},{name:"smollm2:360m",label:"SmolLM2 360M",category:"small"},{name:"smollm2:1.7b",label:"SmolLM2 1.7B",category:"small"}],Ct=3e3,ie=class c{constructor(){this._config=ke.workspace.getConfiguration("ollamaCopilot")}get endpoint(){return this._config.get("endpoint","http://localhost:11434").replace(/\/$/,"")}refreshConfig(){this._config=ke.workspace.getConfiguration("ollamaCopilot")}async isAvailable(){let e=new AbortController,t=setTimeout(()=>e.abort(),Ct);try{let s=await fetch(`${this.endpoint}/api/tags`,{signal:e.signal});return clearTimeout(t),s.ok}catch{return clearTimeout(t),!1}}async listModels(){this.refreshConfig();let e=await fetch(`${this.endpoint}/api/tags`);if(!e.ok)throw new Error(`Ollama API error: ${e.status} ${e.statusText}`);return(await e.json()).models??[]}static{this.TOOL_CAPABLE_MODELS=["llama3.1","llama3.2","llama3.3","qwen2.5","qwen2.5-coder","mistral-nemo","mistral-small","command-r","command-r-plus","firefunction-v2"]}static supportsNativeTools(e){let t=e.split(":")[0].toLowerCase();return c.TOOL_CAPABLE_MODELS.some(s=>t.includes(s))}async*streamChat(e,t,s){let n=s??this._config.get("maxTokens",2048);this.refreshConfig();let i={model:t,messages:e,stream:!0,options:{num_predict:n}},a=await fetch(`${this.endpoint}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!a.ok){let p=await a.text();throw new Error(`Ollama chat error: ${a.status} ${p}`)}let o=a.body?.getReader();if(!o)throw new Error("No response body");let r=new TextDecoder,l="";try{for(;;){let{done:p,value:u}=await o.read();if(p)break;l+=r.decode(u,{stream:!0});let m=l.split(`
`);l=m.pop()??"";for(let v of m)if(v.trim())try{let h=JSON.parse(v).message?.content;typeof h=="string"&&(yield h)}catch{}}if(l.trim())try{let u=JSON.parse(l).message?.content;typeof u=="string"&&(yield u)}catch{}}finally{o.releaseLock()}}async*streamGenerate(e,t,s,n){this.refreshConfig();let i={model:t,prompt:e,stream:!0,options:{num_predict:s}},a=await fetch(`${this.endpoint}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!a.ok){let u=await a.text();throw new Error(`Ollama generate error: ${a.status} ${u}`)}let o=a.body?.getReader();if(!o)throw new Error("No response body");let r=new TextDecoder,l="",p=n?.length?n:[];try{for(;;){let{done:u,value:m}=await o.read();if(u)break;l+=r.decode(m,{stream:!0});let v=l.split(`
`);l=v.pop()??"";for(let y of v)if(y.trim())try{let h=JSON.parse(y),b=h.response;if(typeof b=="string"){let g=b;for(let x of p){let f=g.indexOf(x);f!==-1&&(g=g.slice(0,f))}g&&(yield g)}if(h.done)return}catch{}}if(l.trim())try{let m=JSON.parse(l).response;typeof m=="string"&&(yield m)}catch{}}finally{o.releaseLock()}}async pullModel(e,t){this.refreshConfig();let s={name:e,stream:!0},n=await fetch(`${this.endpoint}/api/pull`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!n.ok){let r=await n.text();throw new Error(`Ollama pull error: ${n.status} ${r}`)}let i=n.body?.getReader();if(!i)throw new Error("No response body");let a=new TextDecoder,o="";try{for(;;){let{done:r,value:l}=await i.read();if(r)break;o+=a.decode(l,{stream:!0});let p=o.split(`
`);o=p.pop()??"";for(let u of p)if(u.trim())try{let m=JSON.parse(u);m.status&&t(m.status)}catch{}}}finally{i.releaseLock()}}};var E=w(require("vscode")),Mt=300,Tt=40,Et=10,Pt=80,re=class{constructor(e,t){this._client=e,this._model=t}updateModel(e){this._model=e}provideInlineCompletionItems(e,t,s,n){this._pendingCancel?.cancel(),this._pendingCancel=new E.CancellationTokenSource;let i=this._pendingCancel;return n.onCancellationRequested(()=>i.cancel()),new Promise(a=>{this._pendingResolve?.(null),this._pendingResolve=a,this._debounceTimer&&clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(async()=>{if(this._pendingResolve=void 0,i.token.isCancellationRequested){a(null);return}if(!E.workspace.getConfiguration("ollamaCopilot").get("inlineCompletionsEnabled",!0)){a(null);return}let r=this._getPrefix(e,t),l=this._getSuffix(e,t);if(!e.lineAt(t.line).text.slice(0,t.character).trim()&&r.split(`
`).slice(-3).every(u=>!u.trim())){a(null);return}try{let u=await this._fetchCompletion(r,l,e.languageId,i.token);if(!u||i.token.isCancellationRequested){a(null);return}let m=new E.InlineCompletionItem(u,new E.Range(t,t));a(new E.InlineCompletionList([m]))}catch{a(null)}},Mt)})}_getPrefix(e,t){let s=Math.max(0,t.line-Tt),n=new E.Range(s,0,t.line,t.character);return e.getText(n)}_getSuffix(e,t){let s=Math.min(e.lineCount-1,t.line+Et),n=new E.Range(t.line,t.character,s,e.lineAt(s).text.length);return e.getText(n)}async _fetchCompletion(e,t,s,n){let i=`You are a code completion engine. Complete the code at the cursor position.
Output ONLY the completion text \u2014 no explanation, no markdown fence, no repetition of the prefix.
Stop after completing the current logical statement or block.
Language: ${s}`,a=`<PREFIX>
${e}
<SUFFIX>
${t}
<COMPLETION>`,o="",r=0,l=0,p=["<|endoftext|>","</s>","<EOT>"];try{for await(let m of this._client.streamChat([{role:"system",content:i},{role:"user",content:a}],this._model)){if(n.isCancellationRequested)return null;if(o+=m,l+=m.split(/\s+/).filter(Boolean).length,r+=(m.match(/\n/g)||[]).length,p.some(v=>o.includes(v))){for(let v of p){let y=o.indexOf(v);y!==-1&&(o=o.slice(0,y))}break}if(o.includes(`


`)){o=o.slice(0,o.indexOf(`


`));break}if(r>=5||l>=Pt)break}}catch{return null}let u=o.trimEnd();return u.length>0?u:null}};var L=w(require("vscode")),ae=class{constructor(e){this._item=L.window.createStatusBarItem(L.StatusBarAlignment.Right,100),this._item.command="ollamaCopilot.toggleCompletions",e.subscriptions.push(this._item),this._update(),e.subscriptions.push(L.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("ollamaCopilot.inlineCompletionsEnabled")&&this._update()})),this._item.show()}_update(){let e=L.workspace.getConfiguration("ollamaCopilot").get("inlineCompletionsEnabled",!0);this._item.text=e?"$(sparkle) Ollama":"$(circle-slash) Ollama",this._item.tooltip=e?"Ollama inline completions: ON (click to disable)":"Ollama inline completions: OFF (click to enable)",this._item.color=e?void 0:new L.ThemeColor("statusBarItem.warningForeground")}};var k=w(require("vscode")),ue=w(require("path"));var Ke=w(require("vscode")),Xe=w(require("path")),Ge=w(require("fs"));var C=w(require("vscode")),P=w(require("path")),S=w(require("fs")),Ue=require("child_process");function At(c){return c.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Se(c,e){let t=c.split(/\r?\n/),s=e.split(/\r?\n/),n=t.length,i=s.length,a=[],o=0,r=0,l=0;for(;o<n||r<i;){if(o<n&&r<i&&t[o]===s[r]){l<3?(a.push({type:"context",content:t[o]??"",lineNo:o+1}),l++):l===3&&(a.push({type:"context",content:"..."}),l++),o++,r++;continue}if(l=0,o<n&&r<i){let p=t.indexOf(s[r],o+1),u=s.indexOf(t[o],r+1);if(p!==-1&&(u===-1||p-o<=u-r)){for(;o<p;)a.push({type:"remove",content:t[o]??"",lineNo:o+1}),o++;continue}if(u!==-1&&(p===-1||u-r<=p-o)){for(;r<u;)a.push({type:"add",content:s[r]??"",lineNo:r+1}),r++;continue}}o<n&&r<i?(a.push({type:"remove",content:t[o]??"",lineNo:o+1}),a.push({type:"add",content:s[r]??"",lineNo:r+1}),o++,r++):o<n?(a.push({type:"remove",content:t[o]??"",lineNo:o+1}),o++):(a.push({type:"add",content:s[r]??"",lineNo:r+1}),r++)}if(a.length>300){let p=a.slice(0,300);return p.push({type:"context",content:`... (${a.length-300} more lines truncated)`}),p}return a}function Fe(c){let e=Math.min(c.length,300),t=[];for(let s=0;s<e;s++){let n=c[s],i=n.type==="add"?"diff-add":n.type==="remove"?"diff-remove":"diff-context",a=n.type==="add"?"+":n.type==="remove"?"-":" ";t.push(`<div class="diff-line ${i}">${At(a+" "+n.content)}</div>`)}return c.length>300&&t.push(`<div class="diff-line diff-context">... (${c.length-300} more lines)</div>`),t.join("")}var ce=require("child_process"),Be=w(require("vscode")),De=8e3;function q(){return Be.workspace.workspaceFolders?.[0]?.uri.fsPath??null}function B(c,e){try{let t=(0,ce.execSync)(c,{cwd:e,encoding:"utf8",stdio:["pipe","pipe","pipe"]});return t.length>De?t.slice(0,De)+`
... (truncated)`:t}catch(t){return`Error: ${(t instanceof Error?t.message:String(t)).slice(0,500)}`}}function Oe(){let c=q();return c?B("git status --short",c):"Error: No workspace open."}function Ne(){let c=q();if(!c)return{branch:"unknown",dirtyCount:0,raw:""};try{let e=(0,ce.execSync)("git rev-parse --abbrev-ref HEAD",{cwd:c,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim(),t=(0,ce.execSync)("git status --short",{cwd:c,encoding:"utf8",stdio:["pipe","pipe","pipe"]}),s=t.split(`
`).filter(n=>n.trim());return{branch:e,dirtyCount:s.length,raw:t}}catch{return{branch:"unknown",dirtyCount:0,raw:""}}}function qe(c){let e=q();if(!e)return"Error: No workspace open.";let t=c.staged?"--staged":"",s=c.file?`-- "${c.file}"`:"";return B(`git diff ${t} ${s}`.trim(),e)}function je(c){let e=q();if(!e)return"Error: No workspace open.";let t=Math.min(c.count??10,50);return B(`git log --oneline -${t}`,e)}function ze(c){let e=q();if(!e)return"Error: No workspace open.";if(!c.message?.trim())return"Error: Commit message is required.";let t=c.message.replace(/[`"$\\]/g," ").trim();if(c.addAll){let s=B("git add -A",e);if(s.startsWith("Error:"))return s}return B(`git commit -m "${t}"`,e)}function We(c){let e=q();if(!e)return"Error: No workspace open.";if(c.create){let t=c.create.replace(/[^a-zA-Z0-9/_.-]/g,"-");return B(`git checkout -b "${t}"`,e)}return B("git branch -a",e)}function He(c){let e=q();if(!e)return"Error: No workspace open.";let t=c.branch.replace(/[^a-zA-Z0-9/_.-]/g,"-");return B(`git checkout "${t}"`,e)}var $t=[{name:"read_file",description:"Read the contents of a file in the workspace",parameters:{path:{type:"string",description:"Relative path to the file from workspace root",required:!0}}},{name:"write_file",description:"Write or overwrite a file with new content",parameters:{path:{type:"string",description:"Relative path to the file from workspace root",required:!0},content:{type:"string",description:"Full content to write to the file",required:!0}}},{name:"edit_file",description:"Replace a specific block of text in a file with new content (surgical edit)",parameters:{path:{type:"string",description:"Relative path to the file",required:!0},old_text:{type:"string",description:"Exact text block to find and replace",required:!0},new_text:{type:"string",description:"New text to replace the old block with",required:!0}}},{name:"create_file",description:"Create a new file with content (fails if file already exists)",parameters:{path:{type:"string",description:"Relative path to the new file",required:!0},content:{type:"string",description:"Content to write to the new file",required:!0}}},{name:"delete_file",description:"Delete a file from the workspace",parameters:{path:{type:"string",description:"Relative path to the file to delete",required:!0}}},{name:"list_files",description:"List files and directories in a directory",parameters:{path:{type:"string",description:"Relative directory path (default: workspace root)",required:!1},pattern:{type:"string",description:'Glob pattern to filter files (e.g. "**/*.ts")',required:!1}}},{name:"search_in_files",description:"Search for text or regex pattern across workspace files",parameters:{query:{type:"string",description:"Text or regex pattern to search for",required:!0},file_pattern:{type:"string",description:'Glob pattern for files to search in (e.g. "**/*.ts")',required:!1}}},{name:"run_terminal",description:"Run a shell command in the workspace directory and return its output",parameters:{command:{type:"string",description:"Shell command to execute",required:!0}}},{name:"get_diagnostics",description:"Get current errors and warnings from VS Code diagnostics (linting, type errors)",parameters:{path:{type:"string",description:"File path to get diagnostics for (optional, all files if omitted)",required:!1}}},{name:"semantic_search",description:"Semantically search the codebase for code related to a concept or query",parameters:{query:{type:"string",description:"Natural language or concept to search for",required:!0},top_k:{type:"string",description:"Maximum number of results (default 5)",required:!1}}},{name:"save_memory",description:"Save an important fact, decision, or insight to persistent memory for future sessions",parameters:{content:{type:"string",description:"Content to save",required:!0},tier:{type:"string",description:"'recall' or 'archival' (default recall)",required:!1},tags:{type:"string",description:"Optional comma-separated tags",required:!1}}},{name:"search_memory",description:"Search your persistent memory for relevant past context, decisions, or facts",parameters:{query:{type:"string",description:"Search query",required:!0},tier:{type:"string",description:"'recall' | 'archival' | 'both' (default both)",required:!1},top_k:{type:"string",description:"Max results (default 5)",required:!1}}},{name:"update_project_context",description:"Update the always-present project context (what this project is, its tech stack, architecture)",parameters:{context:{type:"string",description:"Project context text (replaces existing)",required:!0}}},{name:"add_key_fact",description:"Add a critical fact to always-present core memory (e.g. Auth uses JWT, DB is PostgreSQL)",parameters:{fact:{type:"string",description:"Fact to add (max 100 chars)",required:!0}}},{name:"add_skill",description:"Save a reusable coding pattern or instruction as a skill for future use",parameters:{name:{type:"string",description:"Skill name",required:!0},description:{type:"string",description:"Short description for matching",required:!0},content:{type:"string",description:"Full skill instructions/examples",required:!0},tags:{type:"string",description:"Optional comma-separated tags",required:!1}}},{name:"git_status",description:"Show the working tree status (modified, untracked, staged files)",parameters:{}},{name:"git_diff",description:"Show unstaged or staged changes. Optionally for a specific file.",parameters:{staged:{type:"boolean",description:"Show staged changes (default: unstaged)"},file:{type:"string",description:"Optional: specific file path to diff"}}},{name:"git_log",description:"Show recent commit history (oneline format)",parameters:{count:{type:"number",description:"Number of commits to show (default 10, max 50)"}}},{name:"git_commit",description:"Stage all changes and create a git commit",parameters:{message:{type:"string",description:"Commit message",required:!0},addAll:{type:"boolean",description:"Stage all changes before committing (git add -A)"}}},{name:"git_branch",description:"List all branches, or create a new branch and switch to it",parameters:{create:{type:"string",description:"Name of new branch to create and switch to"}}},{name:"git_checkout",description:"Switch to an existing branch",parameters:{branch:{type:"string",description:"Branch name to checkout",required:!0}}}],j=class{constructor(e,t,s){let n=C.workspace.workspaceFolders;this.workspaceRoot=n?n[0].uri.fsPath:"",this.workspaceIndex=e,this.memoryStore=t,this.skillStore=s}resolvePath(e){return P.isAbsolute(e)?e:P.join(this.workspaceRoot,e)}async executeTool(e,t){try{switch(e){case"read_file":return await this.readFile(t.path);case"write_file":return await this.writeFile(t.path,t.content);case"edit_file":return await this.editFile(t.path,t.old_text,t.new_text);case"create_file":return await this.createFile(t.path,t.content);case"delete_file":return await this.deleteFile(t.path);case"list_files":return await this.listFiles(t.path,t.pattern);case"search_in_files":return await this.searchInFiles(t.query,t.file_pattern);case"run_terminal":return await this.runTerminal(t.command);case"get_diagnostics":return await this.getDiagnostics(t.path);case"semantic_search":return await this.semanticSearch(t.query,t.top_k);case"save_memory":return await this.saveMemory(t.content,t.tier,t.tags);case"search_memory":return await this.searchMemory(t.query,t.tier,t.top_k);case"update_project_context":return await this.updateProjectContext(t.context);case"add_key_fact":return await this.addKeyFact(t.fact);case"add_skill":return await this.addSkill(t.name,t.description,t.content,t.tags);case"git_status":return{success:!0,output:Oe()};case"git_diff":return{success:!0,output:qe({staged:t.staged==="true",file:t.file})};case"git_log":return{success:!0,output:je({count:t.count?parseInt(t.count,10):10})};case"git_commit":{let s=ze({message:t.message??"",addAll:t.addAll==="true"}),n=s.startsWith("Error:")||s.includes("nothing to commit");return{success:!n,output:s,error:n?s:void 0}}case"git_branch":return{success:!0,output:We({create:t.create})};case"git_checkout":return{success:!0,output:He({branch:t.branch??""})};default:return{success:!1,output:"",error:`Unknown tool: ${e}`}}}catch(s){return{success:!1,output:"",error:s.message||String(s)}}}async readFile(e){let t=this.resolvePath(e);if(!S.existsSync(t))return{success:!1,output:"",error:`File not found: ${e}`};let i=S.readFileSync(t,"utf8").split(`
`).map((a,o)=>`${String(o+1).padStart(4," ")} | ${a}`).join(`
`);return{success:!0,output:`File: ${e}
${"\u2500".repeat(60)}
${i}`}}async writeFile(e,t){let s=this.resolvePath(e),n=P.dirname(s);S.existsSync(n)||S.mkdirSync(n,{recursive:!0});let i=S.existsSync(s),a=i?S.readFileSync(s,"utf8"):"";S.writeFileSync(s,t,"utf8");let o=C.Uri.file(s);await C.workspace.openTextDocument(o);let r=Se(a,t),l={path:e,oldContent:a,newContent:t,lines:r,isNew:!i};return{success:!0,output:`${i?"Updated":"Created"} file: ${e} (${t.split(`
`).length} lines)`,diff:l}}async editFile(e,t,s){let n=this.resolvePath(e);if(!S.existsSync(n))return{success:!1,output:"",error:`File not found: ${e}`};let i=S.readFileSync(n,"utf8");if(!i.includes(t))return{success:!1,output:"",error:`Text not found in ${e}. The exact text block could not be located.`};let a=i.replace(t,s);S.writeFileSync(n,a,"utf8");let o=C.Uri.file(n),r=await C.workspace.openTextDocument(o);await C.window.showTextDocument(r,{preview:!1,preserveFocus:!0});let l=Se(i,a),p={path:e,oldContent:i,newContent:a,lines:l,isNew:!1},u=t.split(`
`).length,m=s.split(`
`).length;return{success:!0,output:`Edited ${e}: replaced ${u} lines with ${m} lines`,diff:p}}async createFile(e,t){let s=this.resolvePath(e);return S.existsSync(s)?{success:!1,output:"",error:`File already exists: ${e}. Use write_file to overwrite.`}:this.writeFile(e,t)}async deleteFile(e){let t=this.resolvePath(e);return S.existsSync(t)?(S.unlinkSync(t),{success:!0,output:`Deleted file: ${e}`}):{success:!1,output:"",error:`File not found: ${e}`}}async listFiles(e,t){let s=e?this.resolvePath(e):this.workspaceRoot;if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};let n=t||"**/*",i=await C.workspace.findFiles(new C.RelativePattern(this.workspaceRoot,n),"**/node_modules/**",500);if(e){let r=i.filter(l=>l.fsPath.startsWith(s)).map(l=>P.relative(this.workspaceRoot,l.fsPath)).sort();return{success:!0,output:r.length?r.join(`
`):"No files found"}}let a=i.map(o=>P.relative(this.workspaceRoot,o.fsPath)).sort();return{success:!0,output:a.length?a.join(`
`):"No files found"}}async searchInFiles(e,t){if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};let s=t||"**/*",n=await C.workspace.findFiles(new C.RelativePattern(this.workspaceRoot,s),"**/node_modules/**",200),i=[],a;try{a=new RegExp(e,"gi")}catch{a=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")}for(let o of n){try{let l=S.readFileSync(o.fsPath,"utf8").split(`
`);for(let p=0;p<l.length;p++){if(a.test(l[p])){let u=P.relative(this.workspaceRoot,o.fsPath);i.push(`${u}:${p+1}: ${l[p].trim()}`)}a.lastIndex=0}}catch{}if(i.length>100)break}return{success:!0,output:i.length?i.join(`
`):`No matches found for: ${e}`}}async runTerminal(e){if(!this.workspaceRoot)return{success:!1,output:"",error:"No workspace folder open"};if(/\b(rm\s+-rf|format|mkfs|dd\s+if=|shutdown|reboot|:(){ :|:& };:)\b/i.test(e))return{success:!1,output:"",error:`Command blocked for safety: ${e}`};try{return{success:!0,output:(0,Ue.execSync)(e,{cwd:this.workspaceRoot,encoding:"utf8",timeout:3e4,maxBuffer:5242880})||"(no output)"}}catch(s){let n=s.stderr||"";return{success:!1,output:s.stdout||"",error:n||s.message||"Command failed"}}}async getDiagnostics(e){let t;if(e){let n=this.resolvePath(e),i=C.Uri.file(n),a=C.languages.getDiagnostics(i);t=[[i,a]]}else t=C.languages.getDiagnostics();let s=[];for(let[n,i]of t){if(i.length===0)continue;let a=this.workspaceRoot?P.relative(this.workspaceRoot,n.fsPath):n.fsPath;for(let o of i){let r=["Error","Warning","Info","Hint"][o.severity],l=o.range.start.line+1,p=o.range.start.character+1;s.push(`[${r}] ${a}:${l}:${p} - ${o.message}`)}}return{success:!0,output:s.length?s.join(`
`):"No diagnostics found (no errors or warnings)"}}async semanticSearch(e,t){if(!this.workspaceIndex)return{success:!1,output:"",error:"Workspace index not available. Use Re-index Workspace first."};if(!e?.trim())return{success:!1,output:"",error:'semantic_search requires a "query" argument.'};try{let s=t?Math.max(1,parseInt(t,10)||5):5,n=await this.workspaceIndex.query(e,s),i=[];for(let a of n)i.push(`--- ${a.filePath} | ${a.type}: ${a.name} | lines ${a.startLine}-${a.endLine} ---`),i.push(a.content),i.push("");return{success:!0,output:i.length?i.join(`
`):"No relevant code found for that query."}}catch(s){return{success:!1,output:"",error:s instanceof Error?s.message:String(s)}}}async saveMemory(e,t,s){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};if(!e?.trim())return{success:!1,output:"",error:'save_memory requires "content".'};try{let n=s?s.split(",").map(a=>a.trim()).filter(Boolean):[],i=(t||"recall").toLowerCase();return i==="archival"?await this.memoryStore.addArchival(e.trim(),"agent",n):await this.memoryStore.addRecall(e.trim(),"agent",n),{success:!0,output:`Saved to ${i} memory.`}}catch(n){return{success:!1,output:"",error:n instanceof Error?n.message:String(n)}}}async searchMemory(e,t,s){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};if(!e?.trim())return{success:!1,output:"",error:'search_memory requires "query".'};try{let n=(t||"both").toLowerCase(),i=s?Math.max(1,parseInt(s,10)||5):5,o=this.memoryStore.searchMemory(e,n,i).map(r=>`[${r.source}] ${r.content}`);return{success:!0,output:o.length?o.join(`

`):"No matching memory found."}}catch(n){return{success:!1,output:"",error:n instanceof Error?n.message:String(n)}}}async updateProjectContext(e){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};try{return await this.memoryStore.updateCoreMemory({projectContext:e||""}),{success:!0,output:"Project context updated."}}catch(t){return{success:!1,output:"",error:t instanceof Error?t.message:String(t)}}}async addKeyFact(e){if(!this.memoryStore)return{success:!1,output:"",error:"Memory not available."};let t=e?.trim().slice(0,100);if(!t)return{success:!1,output:"",error:'add_key_fact requires "fact".'};try{let n=[...this.memoryStore.getCoreMemory().keyFacts,t].slice(-10);return await this.memoryStore.updateCoreMemory({keyFacts:n}),{success:!0,output:"Key fact added."}}catch(s){return{success:!1,output:"",error:s instanceof Error?s.message:String(s)}}}async addSkill(e,t,s,n){if(!this.skillStore)return{success:!1,output:"",error:"Skill store not available."};if(!e?.trim()||!t?.trim()||!s?.trim())return{success:!1,output:"",error:"add_skill requires name, description, and content."};try{let i=n?n.split(",").map(o=>o.trim()).filter(Boolean):[],a=await this.skillStore.addSkill(e.trim(),t.trim(),s.trim(),i);return{success:!0,output:`Skill "${a.name}" saved (id: ${a.id}).`}}catch(i){return{success:!1,output:"",error:i instanceof Error?i.message:String(i)}}}static getToolsSystemPrompt(){return`You are a powerful local coding assistant with access to tools that let you read, write, and modify files, search the codebase, and run terminal commands \u2014 just like Claude Code.

## TOOLS AVAILABLE

You can use the following tools by outputting JSON in this exact format:
<tool_call>
{"tool": "tool_name", "args": {"param1": "value1", "param2": "value2"}}
</tool_call>

Available tools:

${$t.map(e=>{let t=Object.entries(e.parameters).map(([s,n])=>`  - ${s} (${n.type}${n.required?", required":", optional"}): ${n.description}`).join(`
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

Then wait for user to confirm before executing.`}};var J=class{constructor(e=3){this._context={entries:[],totalAttempts:0};this._maxReflections=e}reset(){this._context={entries:[],totalAttempts:0}}shouldRetry(){return this._context.totalAttempts<this._maxReflections}getReflectionCount(){return this._context.entries.length}reflect(e,t,s,n){let i=e.toLowerCase(),a;i.includes("not found")||i.includes("enoent")||i.includes("file not found")?a="The file path was wrong. I should use list_files first to confirm the exact path.":i.includes("text not found")||i.includes("could not be located")?a="The old_text didn't match exactly. I should read_file first to get the current content, then use the exact text from the file.":i.includes("command failed")||i.includes("exit code")||i.includes("command blocked")?a="The command failed. I should check the error output and try a different approach or fix the issue before retrying.":i.includes("already exists")?a="The file already exists. I should use write_file instead of create_file, or read it first to decide if I should overwrite.":i.includes("error ts")||i.includes("syntaxerror")||i.includes("typescript")?a="There is a compile error. I should read the file again, fix the syntax, and ensure types are correct before writing.":i.includes("no relevant code found")||i.includes("no matching")?a="Semantic search found nothing. I should try different search terms or use list_files to browse the structure directly.":a=`The previous attempt failed with: ${e.slice(0,200)}. I should try a different approach.`;let o={attempt:n,toolName:t,error:e,reflection:a,timestamp:Date.now()};return this._context.entries.push(o),this._context.totalAttempts+=1,o}getReflectionBlock(){return this._context.entries.length===0?"":["<reflexion>",...this._context.entries.map(t=>`Attempt ${t.attempt} failed. Reflection: ${t.reflection}`),"Based on these failures, try a different approach.","</reflexion>"].join(`
`)}static isTerminalSuccess(e,t){let s=e.toLowerCase(),n=t.toLowerCase();return n.includes("test")||n.includes("jest")||n.includes("vitest")||n.includes("pytest")?s.includes("failed")||s.includes("fail")?!1:s.includes("passed")||s.includes("\u2713")||s.includes("ok"):n.includes("tsc")||n.includes("npm run build")||n.includes("cargo build")||n.includes("go build")?s.includes("error")?!1:s.length===0||s.includes("successfully compiled"):n.includes("npm install")||n.includes("pip install")?!s.includes("err!")&&!s.includes("error"):!0}};function It(c){let e=c.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);if(!e)return null;try{let t=JSON.parse(e[1]);if(t.tool&&typeof t.tool=="string")return{tool:t.tool,args:t.args||{}}}catch{}return null}function Rt(c){let e=c.match(/<plan>([\s\S]*?)<\/plan>/);return e?e[1].trim():null}function Lt(c){return c.includes("<agent_done>")||c.includes("</agent_done>")}var Ft=new Set(["write_file","edit_file","create_file"]),Dt=5*60*1e3,le=class{constructor(e,t,s){this._pendingDiffs=new Map;this._stopRequested=!1;this.client=e,this.tools=t??new j,this._maxReflections=s??3}async _revertFile(e,t){await this.tools.executeTool("write_file",{path:e,content:t})}async _deleteFile(e){await this.tools.executeTool("delete_file",{path:e})}stop(){this._stopRequested=!0}resolveDiff(e,t){let s=this._pendingDiffs.get(e);s&&(this._pendingDiffs.delete(e),s(t))}_awaitDiffDecision(e){return new Promise(t=>{this._pendingDiffs.set(e,t),setTimeout(()=>{this._pendingDiffs.has(e)&&(this._pendingDiffs.delete(e),t(!1))},Dt)})}async run(e){this._stopRequested=!1;let{messages:t,model:s,onStep:n,maxIterations:i=15}=e,a=e.maxReflections??this._maxReflections,o=e.diffPreviewEnabled!==!1,r=[...t],l=new J(a),p=new Set,u=0;for(;u<i;){if(this._stopRequested){this._stopRequested=!1,n({type:"done",content:"[Stopped by user]"});return}let m="";n({type:"thinking",content:""});try{for await(let h of this.client.streamChat(r,s))m+=h,n({type:"response",content:h})}catch(h){n({type:"error",content:h instanceof Error?h.message:"Streaming failed"});return}let v=Rt(m);if(v){n({type:"plan",content:v}),r.push({role:"assistant",content:m});return}let y=It(m);if(y){n({type:"tool_call",content:`Calling ${y.tool}`,toolName:y.tool,toolArgs:y.args});let h=await this.tools.executeTool(y.tool,y.args);Ft.has(y.tool)&&h.success&&y.args.path&&p.add(y.args.path);let b=!h.success,g=h.error||h.output||"Tool failed";if(h.success&&y.tool==="run_terminal"&&y.args.command&&(J.isTerminalSuccess(h.output,y.args.command)||(b=!0,g="Command completed but output indicates failure: "+h.output.slice(0,300))),b){let x=l.getReflectionCount()+1,f=l.reflect(g,y.tool,y.args,x);if(n({type:"tool_result",content:h.success?h.output:h.error||"Tool failed",toolName:y.tool,success:!1}),n({type:"reflection",content:f.reflection,attempt:f.attempt}),!l.shouldRetry()){n({type:"error",content:"Max reflections reached. Could not complete task."});return}r.push({role:"assistant",content:m}),r.push({role:"user",content:l.getReflectionBlock()+`

The previous tool call failed. Review the reflection above and try again with a corrected approach.`});continue}if(h.diff&&o){let x=`diff_${Date.now()}`;if(n({type:"diff_preview",content:"",diff:h.diff,stepId:x}),!await this._awaitDiffDecision(x)){let _=h.diff;p.delete(_.path),_.isNew?await this._deleteFile(_.path):await this._revertFile(_.path,_.oldContent),r.push({role:"assistant",content:m}),r.push({role:"user",content:`The file change to ${_.path} was rejected by the user. Do NOT make this change. Try a different approach or ask what to do instead.`}),n({type:"reflection",content:"File change rejected by user.",attempt:0});continue}}n({type:"tool_result",content:h.output,toolName:y.tool,success:!0}),r.push({role:"assistant",content:m}),r.push({role:"user",content:`<tool_result tool="${y.tool}" success="true">
${h.output}
</tool_result>

Continue with the task.`}),u++;continue}if(Lt(m)||!y){if(p.size>0&&a>0){let h=await this.runPostTaskTscCheck();if(h){let b=l.getReflectionCount()+1;if(l.reflect(h,"post_task_tsc",{},b),l.shouldRetry()){n({type:"reflection",content:h.slice(0,400),attempt:b}),r.push({role:"assistant",content:m}),r.push({role:"user",content:l.getReflectionBlock()+`

TypeScript compilation failed after your changes. Fix the errors above and try again.`});continue}}}n({type:"done",content:m});return}u++}n({type:"error",content:`Agent reached max iterations (${i}). Task may be incomplete.`})}async runPostTaskTscCheck(){let e=Ke.workspace.workspaceFolders;if(!e?.length)return null;let t=e[0].uri.fsPath,s=Xe.join(t,"tsconfig.json");if(!Ge.existsSync(s))return null;try{let n=await this.tools.executeTool("run_terminal",{command:"npx tsc --noEmit 2>&1 || true"});if(!n.success||!n.output)return null;let i=n.output;return i.toLowerCase().includes("error ts")||i.includes("SyntaxError")?"TypeScript compilation failed after changes. I need to fix these errors: "+i.slice(0,500):null}catch{return null}}async resumeAfterPlan(e,t,s){let n=[...e,{role:"user",content:"Plan approved. Please proceed with execution now."}];await this.run({messages:n,model:t,onStep:s})}getTools(){return this.tools}};function R(c){if(!c)return"";let e=de(c);return e=e.replace(/```(\w*)\n([\s\S]*?)```/g,(t,s,n)=>{let i=de(n.trim());return`<div class="code-block"><div class="code-block-header"><span class="code-lang">${de(s||"plaintext")}</span><div class="code-actions"><button class="code-btn copy-btn" data-code="${Je(n.trim())}">Copy</button><button class="code-btn insert-btn" data-code="${Je(n.trim())}">Insert</button></div></div><pre><code>${i}</code></pre></div>`}),e=e.replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>'),e=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),e=e.replace(/__([^_]+)__/g,"<strong>$1</strong>"),e=e.replace(/\*([^*]+)\*/g,"<em>$1</em>"),e=e.replace(/_([^_]+)_/g,"<em>$1</em>"),e=e.replace(/^### (.+)$/gm,"<h3>$1</h3>"),e=e.replace(/^## (.+)$/gm,"<h2>$1</h2>"),e=e.replace(/^# (.+)$/gm,"<h1>$1</h1>"),e=e.replace(/^[\*\-] (.+)$/gm,"<li>$1</li>"),e=e.replace(/(<li>.*<\/li>\n?)+/g,"<ul>$&</ul>"),e=e.replace(/\n/g,`<br>
`),e}function de(c){return c.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Je(c){return de(c).replace(/'/g,"&#39;")}var pe=[{name:"help",usage:"/help",description:"Show all available slash commands",isDynamic:!0},{name:"clear",usage:"/clear",description:"Clear the current session messages",isDynamic:!0},{name:"new",usage:"/new [session name]",description:"Start a new chat session",isDynamic:!0},{name:"status",usage:"/status",description:"Ask Ollama to summarise the current git status",expandTo:"Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise."},{name:"commit",usage:"/commit <message>",description:"Stage all changes and commit with the given message",isDynamic:!0},{name:"search",usage:"/search <query>",description:"Search the workspace with RAG and show top results",isDynamic:!0},{name:"explain",usage:"/explain",description:"Explain the current editor selection",isDynamic:!0},{name:"fix",usage:"/fix",description:"Find and fix bugs in the current editor selection",isDynamic:!0},{name:"tests",usage:"/tests",description:"Write unit tests for the current editor selection",isDynamic:!0},{name:"model",usage:"/model <name>",description:"Switch the active Ollama model",isDynamic:!0}];function Qe(c){let e=c.trim();if(!e.startsWith("/"))return null;let t=e.slice(1).split(/\s+/),s=t[0]?.toLowerCase()??"",n=t.slice(1).join(" "),i=pe.find(a=>a.name===s);return i?{command:i,arg:n}:null}var Q=class{constructor(e,t,s,n,i){this._extensionUri=e;this._chatHistory=[];this._isAgentRunning=!1;this._pendingPlanMessages=null;this._activeSessionId=null;this._client=t,this._workspaceIndex=s,this._memoryStore=n,this._skillStore=i;let a=k.workspace.getConfiguration("ollamaCopilot").get("reflexionMaxRetries",3);this._agentRunner=new le(t,new j(s,n,i),a)}static{this.viewType="ollamaCopilot.chatView"}resolveWebviewView(e,t,s){if(this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._extensionUri]},e.webview.html=this._getHtml(),e.webview.onDidReceiveMessage(n=>this._handleMessage(n)),e.onDidChangeVisibility(()=>{e.visible&&(this._refreshModels(),this._checkConnection(),this._sendIndexStatus())}),setTimeout(()=>{this._refreshModels(),this._checkConnection(),this._sendIndexStatus(),this._sendMemoryData()},500),this._historyStore){let n=this._historyStore.getOrCreateActiveSession();this._activeSessionId=n.id,this._sendHistoryToWebview(n)}this._view?.webview.postMessage({type:"slashCommands",commands:pe.map(n=>({name:n.name,usage:n.usage,description:n.description}))})}sendToChat(e,t){this._view&&(this._view.show(!0),setTimeout(()=>{this._view?.webview.postMessage({type:"injectMessage",text:e,codeContext:t})},300))}async sendQuickAction(e){await k.commands.executeCommand("ollamaCopilot.openChat"),await new Promise(t=>setTimeout(t,150)),this._view?.webview.postMessage({type:"injectPrompt",text:e}),this._view?.webview.postMessage({type:"submitPrompt"})}setHistoryStore(e){this._historyStore=e;let t=e.getOrCreateActiveSession();this._activeSessionId=t.id,this._view&&this._sendHistoryToWebview(t)}switchSession(e){this._activeSessionId=e.id,this._historyStore?.setActiveSession(e.id),this._sendHistoryToWebview(e)}clearWebviewMessages(){this._chatHistory=[],this._view?.webview.postMessage({type:"clearMessages"})}_sendHistoryToWebview(e){let t=e.messages.map(s=>s.role==="assistant"?{role:s.role,content:s.content,html:R(s.content)}:s);this._view?.webview.postMessage({type:"loadHistory",sessionName:e.name,messages:t}),this._chatHistory=e.messages.slice(-40).map(s=>({role:s.role,content:s.content}))}async _handleMessage(e){switch(e.type){case"sendMessage":await this._handleUserMessage(e.text,e.codeContext,e.files,e.agentMode);break;case"changeModel":k.workspace.getConfiguration("ollamaCopilot").update("model",e.model,!0);break;case"clearChat":this._chatHistory=[],this._pendingPlanMessages=null;break;case"insertCode":this._insertCodeToEditor(e.code);break;case"getModels":await this._refreshModels();break;case"getConnectionStatus":await this._checkConnection();break;case"getSelectionContext":this._sendSelectionContext();break;case"getWorkspaceFiles":await this._sendWorkspaceFiles(e.query);break;case"confirmPlan":await this._executePlan();break;case"rejectPlan":this._pendingPlanMessages=null,this._view?.webview.postMessage({type:"planRejected"});break;case"stopAgent":this._agentRunner.stop();break;case"cancelAgent":this._isAgentRunning=!1;break;case"reindexWorkspace":await this._reindexWorkspace();break;case"getIndexStatus":this._sendIndexStatus();break;case"getMemory":await this._sendMemoryData();break;case"updateCore":e.patch!=null&&(await this._memoryStore.updateCoreMemory(e.patch),await this._sendMemoryData());break;case"addSkillFromChat":e.name!=null&&e.desc!=null&&e.content!=null&&(await this._skillStore.addSkill(e.name,e.desc,e.content,e.tags?.split(",").map(t=>t.trim()).filter(Boolean)),await this._sendMemoryData());break;case"deleteSkill":e.id!=null&&(await this._skillStore.deleteSkill(e.id),await this._sendMemoryData());break;case"approveDiff":this._agentRunner.resolveDiff(e.stepId,!0);break;case"rejectDiff":this._agentRunner.resolveDiff(e.stepId,!1);break}}async _sendMemoryData(){if(!this._view)return;let e=this._memoryStore.getCoreMemory(),t=this._skillStore.listSkills();this._view.webview.postMessage({type:"memoryData",core:{projectContext:e.projectContext,userPreferences:e.userPreferences,keyFacts:e.keyFacts},recallCount:this._memoryStore.getRecallCount(),archivalCount:this._memoryStore.getArchivalCount(),skills:t.map(s=>({id:s.id,name:s.name,description:s.description}))})}_sendIndexStatus(){if(!this._view)return;let e=this._workspaceIndex.status,t=e.isIndexing?"Indexing workspace...":e.chunkCount>0?`${e.chunkCount} chunks indexed`:"Not indexed";this._view.webview.postMessage({type:"indexStatus",indexing:e.isIndexing,message:t,chunkCount:e.chunkCount})}async _reindexWorkspace(){if(!this._view)return;this._view.webview.postMessage({type:"indexStatus",indexing:!0,message:"Indexing workspace..."}),await this._workspaceIndex.indexAll((t,s)=>{this._view?.webview.postMessage({type:"indexStatus",indexing:!0,message:t,fileCount:s})});let e=this._workspaceIndex.status;this._view.webview.postMessage({type:"indexStatus",indexing:!1,message:e.chunkCount>0?`${e.chunkCount} chunks indexed`:"Not indexed",chunkCount:e.chunkCount})}async _handleUserMessage(e,t,s,n){if(this._isAgentRunning){this._view?.webview.postMessage({type:"error",message:"Agent is already running. Wait or click Stop."});return}let i=e,a=Qe(e);if(a){let{command:b,arg:g}=a;switch(b.name){case"help":{let x=`**Available slash commands:**

`+pe.map(f=>`- \`${f.usage}\` \u2014 ${f.description}`).join(`
`);this._view?.webview.postMessage({type:"assistantMessage",html:R(x)});return}case"clear":this._historyStore&&this._activeSessionId&&this._historyStore.clearMessages(this._activeSessionId),this.clearWebviewMessages();return;case"new":{if(!this._historyStore)return;let x=this._historyStore.createSession(g||void 0);this.switchSession(x);return}case"commit":{if(!g.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:R("Usage: `/commit <message>`")});return}i=`Use git_commit with addAll=true and message="${g.trim()}". Then confirm the commit was successful.`;break}case"search":{if(!g.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:R("Usage: `/search <query>`")});return}i=`Search the workspace for: ${g.trim()}. Use semantic_search to find relevant code and summarise the top results.`;break}case"explain":await k.commands.executeCommand("ollamaCopilot.explain");return;case"fix":await k.commands.executeCommand("ollamaCopilot.fix");return;case"tests":await k.commands.executeCommand("ollamaCopilot.add_tests");return;case"status":i=b.expandTo;break;case"model":{if(!g.trim()){this._view?.webview.postMessage({type:"assistantMessage",html:R("Usage: `/model <name>` \u2014 e.g. `/model codellama`")});return}await k.workspace.getConfiguration("ollamaCopilot").update("model",g.trim(),k.ConfigurationTarget.Global),this._view?.webview.postMessage({type:"setModel",model:g.trim()}),this._view?.webview.postMessage({type:"assistantMessage",html:R(`Switched model to \`${g.trim()}\`.`)});return}default:break}}let o=k.workspace.getConfiguration("ollamaCopilot"),r=o.get("model","llama3"),l=o.get("systemPrompt",""),p=a?null:e.match(/^\/(\w+)\s*(.*)/s),u=["plan","edit","fix","run","test","refactor","build","review","optimize","types"],m=n??o.get("agentMode",!0);p&&(i=this._expandSlashCommand(p[1],p[2],t),u.includes(p[1])&&(m=!0));let v=i;if(o.get("memoryEnabled",!0))try{let b=this._memoryStore.getCoreContextBlock(),g=o.get("recallTopK",3),x=this._memoryStore.getRecallContextBlock(i,g),f=this._skillStore.getSkillContextBlock(i),_=[];b&&_.push(b),x&&_.push(x),f&&_.push(f),_.length>0&&(v=_.join(`

`)+`

`+v)}catch{}try{let b=await this._workspaceIndex.getContext(i);b&&(v=b+`

`+v)}catch{}if(t&&!v.includes(t)&&(v=v+"\n\n**Selected code:**\n```"+this._getEditorLang()+`
`+t+"\n```"),s&&s.length>0){let b=k.workspace.workspaceFolders;if(b)for(let g of s)try{let x=ue.join(b[0].uri.fsPath,g),_=(await k.workspace.openTextDocument(x)).getText().slice(0,1e4);v+=`

**@${g}:**
\`\`\`
${_}
\`\`\``}catch{}}let h=[];if(m)h.push({role:"system",content:j.getToolsSystemPrompt()});else{let b=l||"You are an expert coding assistant. Be concise, accurate, and helpful.";h.push({role:"system",content:b})}h.push(...this._chatHistory),h.push({role:"user",content:v}),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"user",content:e,timestamp:Date.now()}),m?await this._runAgent(h,r,e,i):await this._runChat(h,r,e,i)}_getEditorLang(){return k.window.activeTextEditor?.document.languageId||""}async _runChat(e,t,s,n){this._isAgentRunning=!0;let i="";this._view?.webview.postMessage({type:"startAssistantMessage"});try{for await(let a of this._client.streamChat(e,t))i+=a,this._view?.webview.postMessage({type:"streamChunk",chunk:a});this._view?.webview.postMessage({type:"finalizeAssistantMessage",html:R(i)}),this._pushHistory(s,i),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"assistant",content:i,timestamp:Date.now()}),await this._autoSaveRecall(s,i,t)}catch(a){this._view?.webview.postMessage({type:"error",message:a instanceof Error?a.message:String(a)})}finally{this._isAgentRunning=!1}}async _runAgent(e,t,s,n){this._isAgentRunning=!0,this._view?.webview.postMessage({type:"agentStart"});let i="",a=0,o=r=>{switch(r.type){case"thinking":this._view?.webview.postMessage({type:"agentThinking"});break;case"response":i+=r.content,this._view?.webview.postMessage({type:"streamChunk",chunk:r.content});break;case"tool_call":a++,this._view?.webview.postMessage({type:"agentToolCall",toolName:r.toolName,toolArgs:r.toolArgs,step:a}),i="";break;case"tool_result":this._view?.webview.postMessage({type:"agentToolResult",toolName:r.toolName,output:r.content,success:r.success,step:a});break;case"reflection":this._view?.webview.postMessage({type:"agentReflection",content:r.content,attempt:r.attempt??0});break;case"diff_preview":r.diff&&r.stepId&&this._view?.webview.postMessage({type:"agentDiffPreview",stepId:r.stepId,path:r.diff.path,isNew:r.diff.isNew,html:Fe(r.diff.lines)});break;case"plan":this._pendingPlanMessages=e,this._view?.webview.postMessage({type:"agentPlan",plan:r.content,html:R(r.content)});break;case"done":case"error":this._view?.webview.postMessage({type:"agentDone",html:R(i||r.content),error:r.type==="error"?r.content:void 0});break}};try{let r=k.workspace.getConfiguration("ollamaCopilot").get("diffPreviewEnabled",!0);await this._agentRunner.run({messages:e,model:t,onStep:o,diffPreviewEnabled:r}),this._pushHistory(s,i),this._historyStore&&this._activeSessionId&&this._historyStore.appendMessage(this._activeSessionId,{role:"assistant",content:i,timestamp:Date.now()}),await this._autoSaveRecall(s,i,t)}catch(r){this._view?.webview.postMessage({type:"error",message:r instanceof Error?r.message:String(r)})}finally{this._isAgentRunning=!1}}async _autoSaveRecall(e,t,s){if(k.workspace.getConfiguration("ollamaCopilot").get("autoSaveMemory",!0))try{let i=`User asked: ${e.slice(0,200)} | Response summary: ${t.slice(0,300)}`,a=this._getEditorLang(),o=[s,a].filter(Boolean);await this._memoryStore.addRecall(i,"auto",o)}catch{}}async _executePlan(){if(!this._pendingPlanMessages)return;let t=k.workspace.getConfiguration("ollamaCopilot").get("model","llama3"),s=this._pendingPlanMessages;this._pendingPlanMessages=null,this._view?.webview.postMessage({type:"planExecuting"}),await this._runAgent([...s,{role:"user",content:"Plan approved. Execute all steps now."}],t,"Plan execution","Plan approved. Execute all steps now.")}_pushHistory(e,t){this._chatHistory.push({role:"user",content:e}),this._chatHistory.push({role:"assistant",content:t}),this._chatHistory.length>40&&(this._chatHistory=this._chatHistory.slice(-40))}_expandSlashCommand(e,t,s){let n=s?`

Code:
\`\`\`
${s}
\`\`\``:"";switch(e){case"explain":return`Explain this code clearly.${n}${t?`

`+t:""}`;case"fix":return`Find and fix all bugs. Show corrected code with explanations.${n}${t?`
Context: `+t:""}`;case"refactor":return`Refactor for better readability, performance, and maintainability.${n}${t?`
Focus: `+t:""}`;case"test":return`Write comprehensive unit tests.${n}${t?`
Framework: `+t:""}`;case"docs":return`Generate thorough documentation for this code.${n}`;case"plan":return`Create a detailed step-by-step plan to: ${t||"implement this feature"}${n}

Output the plan inside a <plan>...</plan> block.`;case"edit":return`Make the following changes: ${t}${n}`;case"build":return`Build this feature: ${t}${n}. Read relevant files first, then implement.`;case"run":return`Run this command and show me the output: ${t}`;case"review":return`Do a thorough code review. Check for bugs, security issues, performance, and style.${n}`;case"optimize":return`Optimize for performance. Identify bottlenecks and improve them.${n}`;case"types":return`Add proper TypeScript types and interfaces.${n}`;default:return`/${e} ${t}`}}async _refreshModels(){try{let e=await this._client.listModels(),s=k.workspace.getConfiguration("ollamaCopilot").get("model","llama3");this._view?.webview.postMessage({type:"models",models:e,current:s})}catch{this._view?.webview.postMessage({type:"models",models:[],current:""})}}async _checkConnection(){let e=await this._client.isAvailable();this._view?.webview.postMessage({type:"connectionStatus",connected:e})}_sendSelectionContext(){let e=k.window.activeTextEditor;if(!e||e.selection.isEmpty){this._view?.webview.postMessage({type:"selectionContext",text:"",lang:""});return}let t=e.document.getText(e.selection),s=e.document.languageId;this._view?.webview.postMessage({type:"selectionContext",text:t,lang:s})}async _sendWorkspaceFiles(e){let t=k.workspace.workspaceFolders;if(!t){this._view?.webview.postMessage({type:"workspaceFiles",files:[]});return}let s=e?`**/*${e}*`:"**/*",i=(await k.workspace.findFiles(s,"**/node_modules/**",50)).map(a=>ue.relative(t[0].uri.fsPath,a.fsPath));this._view?.webview.postMessage({type:"workspaceFiles",files:i})}_insertCodeToEditor(e){let t=k.window.activeTextEditor;if(!t){k.window.showErrorMessage("No active editor to insert code into");return}t.edit(s=>{t.selection.isEmpty?s.insert(t.selection.active,e):s.replace(t.selection,e)})}_getHtml(){let e=Bt();return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${e}'; script-src 'nonce-${e}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ollama Copilot</title>
<style nonce="${e}">
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  display: flex; flex-direction: column; height: 100vh; overflow: hidden;
}
.header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border);
  flex-shrink: 0;
}
.header-title { font-weight: 600; font-size: 13px; flex: 1; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #888; flex-shrink: 0; }
.status-dot.connected { background: #4caf50; }
.btn-icon {
  background: none; border: none; cursor: pointer; padding: 3px 5px;
  color: var(--vscode-foreground); opacity: 0.7; font-size: 14px; border-radius: 4px;
}
.btn-icon:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
.model-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0;
}
.model-bar select {
  flex: 1; background: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);
  padding: 3px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;
}
.index-bar {
  display: flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-bottom: 1px solid var(--vscode-panel-border); font-size: 11px; color: var(--vscode-descriptionForeground);
}
.index-status { flex: 1; }
.index-status.indexing::before { content: ''; display: inline-block; width: 12px; height: 12px; margin-right: 6px; vertical-align: middle;
  border: 2px solid var(--vscode-focusBorder); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.index-refresh { font-size: 11px; padding: 2px 6px; }
.memory-bar {
  display: flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-bottom: 1px solid var(--vscode-panel-border); font-size: 11px; color: var(--vscode-descriptionForeground);
}
.memory-summary { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.memory-panel {
  display: none; padding: 10px; border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editor-inactiveSelectionBackground, rgba(0,0,0,0.05)); font-size: 12px;
}
.memory-panel.open { display: block; }
.memory-panel label { display: block; margin-top: 8px; margin-bottom: 2px; font-weight: 600; }
.memory-panel textarea { width: 100%; min-height: 50px; max-height: 80px; padding: 6px; font-size: 11px; resize: vertical;
  background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
.memory-panel .key-facts-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.memory-panel .key-fact-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px;
  background: var(--vscode-badge-background); font-size: 11px; }
.memory-panel .key-fact-tag button { background: none; border: none; cursor: pointer; padding: 0; opacity: 0.7; }
.memory-panel .skills-list { margin-top: 6px; }
.memory-panel .skill-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--vscode-panel-border); }
.memory-panel .skill-row button { font-size: 10px; padding: 2px 6px; }
.memory-panel .mem-save-btn { margin-top: 10px; padding: 5px 12px; font-size: 12px; }
.mode-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 600;
  background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
  cursor: pointer; user-select: none; white-space: nowrap;
}
.mode-badge.agent { background: #7c3aed; color: #fff; }
.messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 12px; }
.messages::-webkit-scrollbar { width: 4px; }
.messages::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 2px; }
.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; padding: 20px; opacity: 0.8;
}
.empty-icon { font-size: 32px; }
.empty-title { font-size: 14px; font-weight: 600; }
.empty-sub { font-size: 11px; text-align: center; opacity: 0.7; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 4px; }
.quick-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none; padding: 5px 10px; border-radius: 12px; cursor: pointer; font-size: 11px;
}
.quick-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.message { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
.message.user { align-items: flex-end; }
.message.assistant { align-items: flex-start; }
.bubble {
  padding: 8px 12px; border-radius: 12px; max-width: 94%; word-break: break-word; line-height: 1.5; font-size: 13px;
}
.user .bubble { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-bottom-right-radius: 3px; }
.assistant .bubble { background: var(--vscode-editor-inactiveSelectionBackground, var(--vscode-list-hoverBackground)); border-bottom-left-radius: 3px; }
.agent-steps { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-bottom: 6px; }
.agent-step {
  display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 12px;
  background: var(--vscode-list-hoverBackground); border-left: 3px solid #7c3aed;
}
.agent-step.success { border-left-color: #4caf50; }
.agent-step.failure { border-left-color: #f44336; }
.agent-step.reflection { border-left-color: #f59e0b; }
.diff-block { border:1px solid var(--vscode-panel-border); border-radius:8px;
  overflow:hidden; width:100%; margin:4px 0; font-family:monospace; font-size:11px; }
.diff-header { background:rgba(124,58,237,0.15); padding:6px 10px;
  font-size:11px; font-weight:600; color:#a78bfa; display:flex;
  justify-content:space-between; align-items:center; }
.diff-body { max-height:200px; overflow-y:auto; background:var(--vscode-editor-background); }
.diff-line { padding:1px 10px; white-space:pre; }
.diff-add { background:rgba(74,222,128,0.12); color:#4ade80; }
.diff-remove { background:rgba(248,113,113,0.12); color:#f87171; }
.diff-context { color:var(--vscode-descriptionForeground); }
.diff-actions { display:flex; gap:6px; padding:6px 10px;
  border-top:1px solid var(--vscode-panel-border); }
.btn-approve-diff { background:#4ade80; color:#000; border:none; padding:4px 12px;
  border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; }
.btn-reject-diff { background:#f87171; color:#000; border:none; padding:4px 12px;
  border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; }
.step-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
.step-body { flex: 1; min-width: 0; }
.step-title { font-weight: 600; }
.step-detail { color: var(--vscode-descriptionForeground); font-size: 11px; white-space: pre-wrap; word-break: break-all; margin-top: 2px; max-height: 2.4em; overflow: hidden; cursor: pointer; }
.step-detail.expanded { max-height: 120px; overflow-y: auto; }
.plan-block { border: 1px solid #7c3aed; border-radius: 10px; overflow: hidden; width: 100%; margin: 4px 0; }
.plan-header { background: rgba(124,58,237,0.15); padding: 8px 12px; font-size: 12px; font-weight: 600; color: #a78bfa; }
.plan-content { padding: 10px 12px; font-size: 12px; }
.plan-actions { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid rgba(124,58,237,0.3); }
.btn-approve { background: #7c3aed; color: #fff; border: none; padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.btn-approve:hover { background: #6d28d9; }
.btn-reject { background: none; color: var(--vscode-foreground); border: 1px solid var(--vscode-panel-border); padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.code-block { position: relative; margin: 8px 0; }
.code-lang { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 4px 10px 0; font-family: monospace; }
.code-block pre { background: var(--vscode-editor-background); padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: var(--vscode-editor-font-family, monospace); border: 1px solid var(--vscode-panel-border); white-space: pre; line-height: 1.5; }
.code-actions { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.code-block:hover .code-actions { opacity: 1; }
.code-actions button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
.thinking { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; color: var(--vscode-descriptionForeground); }
.thinking-dots { display: flex; gap: 3px; }
.thinking-dots span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: bounce 1.2s infinite; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100% { transform:scale(0.6);opacity:0.5; } 40% { transform:scale(1);opacity:1; } }
.sel-badge { display: none; align-items: center; gap: 4px; padding: 2px 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; font-size: 10px; margin: 0 10px 4px; }
.sel-badge.visible { display: flex; }
.input-area { border-top: 1px solid var(--vscode-panel-border); padding: 8px 10px; flex-shrink: 0; }
.input-row { display: flex; align-items: flex-end; gap: 6px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 8px; padding: 4px 6px; }
.input-row:focus-within { border-color: var(--vscode-focusBorder); }
textarea { flex: 1; background: none; border: none; outline: none; resize: none; color: var(--vscode-input-foreground); font-family: inherit; font-size: 13px; line-height: 1.5; max-height: 180px; min-height: 22px; padding: 3px 2px; }
.send-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 14px; flex-shrink: 0; height: 30px; }
.send-btn:hover { background: var(--vscode-button-hoverBackground); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stop-btn { background: #f44336; color: #fff; border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 11px; font-weight: 600; display: none; margin: 0 10px 4px; }
.stop-btn.visible { display: block; }
.slash-popup, .file-popup {
  display: none; position: absolute; bottom: 100%; left: 10px; right: 10px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  border: 1px solid var(--vscode-panel-border); border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3); max-height: 200px; overflow-y: auto; z-index: 100;
}
.slash-popup.visible, .file-popup.visible { display: block; }
.slash-item, .file-item { display: flex; align-items: center; gap: 10px; padding: 7px 12px; cursor: pointer; }
.slash-item:hover, .slash-item.sel, .file-item:hover, .file-item.sel { background: var(--vscode-list-hoverBackground); }
.slash-cmd { font-weight: 700; color: #a78bfa; font-size: 13px; min-width: 80px; }
.slash-desc { color: var(--vscode-descriptionForeground); font-size: 11px; }
.hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 10px 4px; }
p { margin: 4px 0; } h1,h2,h3 { margin: 8px 0 4px; } ul,ol { padding-left: 18px; } li { margin: 2px 0; }
code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
strong { font-weight: 700; } em { font-style: italic; }
</style>
</head>
<body>
<div class="header">
  <div class="status-dot" id="statusDot"></div>
  <span class="header-title">Ollama Copilot</span>
  <button class="btn-icon" id="clearBtn" title="New chat">\u{1F5D1}</button>
  <button class="btn-icon" id="refreshBtn" title="Refresh">\u21BB</button>
</div>
<div id="session-name" style="font-size:10px;color:var(--vscode-descriptionForeground);padding:2px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Current session"></div>
<div class="model-bar">
  <select id="modelSelect"></select>
  <span class="mode-badge agent" id="modeBadge" title="Toggle agent/chat mode">\u26A1 Agent</span>
</div>
<div class="index-bar" id="indexBar">
  <span class="index-status" id="indexStatus"></span>
  <button class="btn-icon index-refresh" id="reindexBtn" title="Re-index workspace">Re-index</button>
</div>
<div class="memory-bar" id="memoryBar">
  <span class="memory-summary" id="memorySummary">Memory: \u2014</span>
  <button class="btn-icon index-refresh" id="memoryBtn" title="View / Edit Memory">\u2699 Memory</button>
</div>
<div class="memory-panel" id="memoryPanel">
  <label>Project context (max 500)</label>
  <textarea id="memProjectContext" maxlength="500" placeholder="What is this project? Tech stack, architecture..."></textarea>
  <label>User preferences (max 300)</label>
  <textarea id="memUserPreferences" maxlength="300" placeholder="Coding style, preferences..."></textarea>
  <label>Key facts</label>
  <div class="key-facts-list" id="keyFactsList"></div>
  <input type="text" id="newKeyFact" placeholder="Add fact (max 100 chars)" maxlength="100" style="width:100%;margin-top:4px;padding:4px;font-size:11px;">
  <label>Skills</label>
  <div class="skills-list" id="skillsList"></div>
  <button class="mem-save-btn btn-approve" id="memorySaveBtn">Save</button>
</div>
<div class="sel-badge" id="selBadge"><span>\u{1F4CE}</span><span id="selLabel">Selection</span></div>
<div class="messages" id="messages">
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">\u{1F916}</div>
    <div class="empty-title">Ollama Copilot</div>
    <div class="empty-sub">Local AI \xB7 No cloud \xB7 No API keys<br>Type <strong>/</strong> for commands, <strong>@</strong> to attach files</div>
    <div class="quick-actions">
      <button class="quick-btn" data-cmd="/explain">Explain</button>
      <button class="quick-btn" data-cmd="/fix">Fix bugs</button>
      <button class="quick-btn" data-cmd="/refactor">Refactor</button>
      <button class="quick-btn" data-cmd="/test">Write tests</button>
      <button class="quick-btn" data-cmd="/plan ">Plan feature</button>
      <button class="quick-btn" data-cmd="/review">Review</button>
    </div>
  </div>
</div>
<div style="position:relative">
  <div class="slash-popup" id="slashPopup"></div>
  <div class="file-popup" id="filePopup"></div>
</div>
<div class="hint">/ commands \xB7 @ attach files \xB7 Enter to send \xB7 Shift+Enter newline</div>
<div class="input-area" style="position:relative">
  <div id="slash-menu" style="display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background);border:1px solid var(--vscode-panel-border);border-radius:8px;overflow:hidden;z-index:100;max-height:220px;overflow-y:auto;box-shadow:0 -4px 12px rgba(0,0,0,0.3);"></div>
  <div class="input-row">
    <textarea id="input" placeholder="Ask anything... or type / for commands" rows="1"></textarea>
    <button id="stopBtn" title="Stop" style="display:none;background:#f87171;color:#000;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;">&#9632; Stop</button>
    <button class="send-btn" id="sendBtn">\u27A4</button>
  </div>
  <div id="char-counter" style="font-size:10px;color:var(--vscode-descriptionForeground);text-align:right;padding:0 4px 2px;">0</div>
</div>
<script nonce="${e}">
const vscode = acquireVsCodeApi();
let agentMode = true, isRunning = false, selText = '', selLang = '';
let currentBubble = null, currentStepsEl = null, attachedFiles = [];
let slashIdx = -1, fileIdx = -1;

const SLASH = [
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

const $=id=>document.getElementById(id);
const msgs=$('messages'), input=$('input'), sendBtn=$('sendBtn'), stopBtn=$('stopBtn');
const statusDot=$('statusDot'), modelSel=$('modelSelect'), modeBadge=$('modeBadge');
const selBadge=$('selBadge'), slashPopup=$('slashPopup'), filePopup=$('filePopup');
const emptyState=$('emptyState'), sessionNameEl=$('session-name');
const charCounter=$('char-counter'), slashMenu=$('slash-menu');
let allCommands = [];

vscode.postMessage({type:'getConnectionStatus'});
vscode.postMessage({type:'getModels'});
vscode.postMessage({type:'getIndexStatus'});
vscode.postMessage({type:'getMemory'});
setInterval(()=>vscode.postMessage({type:'getSelectionContext'}),1500);

modeBadge.onclick=()=>{
  agentMode=!agentMode;
  modeBadge.textContent=agentMode?'\u26A1 Agent':'\u{1F4AC} Chat';
  modeBadge.classList.toggle('agent',agentMode);
};
$('clearBtn').onclick=()=>{
  vscode.postMessage({type:'clearChat'});
  msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='flex';
  attachedFiles=[]; currentBubble=null; currentStepsEl=null;
};
$('refreshBtn').onclick=()=>{
  vscode.postMessage({type:'getModels'});
  vscode.postMessage({type:'getConnectionStatus'});
};
$('reindexBtn').onclick=()=>vscode.postMessage({type:'reindexWorkspace'});
$('memoryBtn').onclick=()=>{ const p=$('memoryPanel'); p.classList.toggle('open',!p.classList.contains('open')); };
$('memorySaveBtn').onclick=()=>{
  const core={ projectContext: $('memProjectContext').value, userPreferences: $('memUserPreferences').value, keyFacts: window._keyFacts||[] };
  vscode.postMessage({type:'updateCore',patch:core});
};
$('newKeyFact').onkeydown=(e)=>{ if(e.key==='Enter'){ const v=$('newKeyFact').value.trim(); if(v){ (window._keyFacts=window._keyFacts||[]).push(v); $('newKeyFact').value=''; renderKeyFacts(); vscode.postMessage({type:'updateCore',patch:{keyFacts:window._keyFacts}}); } } };
function renderKeyFacts(){ const el=$('keyFactsList'); if(!el)return; const facts=window._keyFacts||[]; el.innerHTML=facts.map((f,i)=>'<span class="key-fact-tag">'+esc(f)+' <button data-i="'+i+'" title="Remove">\xD7</button></span>').join(''); el.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>{ const i=parseInt(btn.dataset.i,10); window._keyFacts=window._keyFacts||[]; window._keyFacts.splice(i,1); renderKeyFacts(); vscode.postMessage({type:'updateCore',patch:{keyFacts:window._keyFacts}}); }; }); }
modelSel.onchange=()=>vscode.postMessage({type:'changeModel',model:modelSel.value});
stopBtn.onclick=()=>{vscode.postMessage({type:'stopAgent'});stopBtn.disabled=true;stopBtn.textContent='Stopping\u2026';};

document.querySelectorAll('.quick-btn').forEach(b=>{
  b.onclick=()=>{ input.value=b.dataset.cmd; autoSz(); showSlash(b.dataset.cmd); input.focus(); };
});

input.addEventListener('input',()=>{
  const v=input.value, c=input.selectionStart;
  if(charCounter) charCounter.textContent = v.length.toString();
  if(v.startsWith('/')&&!v.includes(' ')&&allCommands.length){
    const filtered=allCommands.filter(cmd=>cmd.name.startsWith(v.slice(1).toLowerCase()));
    if(filtered.length&&slashMenu){
      slashMenu.innerHTML=filtered.map((cmd,i)=>'<div class="slash-item" data-idx="'+i+'" data-usage="'+esc(cmd.usage)+'" style="padding:6px 12px;cursor:pointer;display:flex;gap:8px;align-items:baseline;"><span style="color:#a78bfa;font-weight:600;font-size:12px">'+esc('/'+cmd.name)+'</span><span style="color:var(--vscode-descriptionForeground);font-size:11px">'+esc(cmd.description)+'</span></div>').join('');
      slashMenu.style.display='block';
      slashMenu.querySelectorAll('.slash-item').forEach(el=>{
        el.addEventListener('mousedown',(e)=>{ e.preventDefault(); const usage=el.getAttribute('data-usage')||''; input.value=usage.replace(/<[^>]*>/g,' ').trim()+(usage.includes('<')?' ':''); slashMenu.style.display='none'; input.focus(); if(charCounter) charCounter.textContent=input.value.length.toString(); });
      });
    } else if(slashMenu) slashMenu.style.display='none';
  } else if(slashMenu) slashMenu.style.display='none';
  autoSz();
  const sm=v.match(/^\\/(\\w*)$/);
  if(sm&&!allCommands.length){ const p=sm[1].toLowerCase(); const f=SLASH.filter(s=>s.cmd.slice(1).startsWith(p)); if(f.length){renderSlash(f);return;} }
  hideSlash();
  const am=v.slice(0,c).match(/@([^\\s]*)$/);
  if(am){ vscode.postMessage({type:'getWorkspaceFiles',query:am[1]}); return; }
  hideFile();
});
input.addEventListener('blur',()=>setTimeout(()=>{ if(slashMenu) slashMenu.style.display='none'; },150));

input.addEventListener('keydown',e=>{
  if(slashPopup.classList.contains('visible')){
    const its=slashPopup.querySelectorAll('.slash-item');
    if(e.key==='ArrowDown'){e.preventDefault();slashIdx=Math.min(slashIdx+1,its.length-1);hlSlash();return;}
    if(e.key==='ArrowUp'){e.preventDefault();slashIdx=Math.max(slashIdx-1,0);hlSlash();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();(its[Math.max(0,slashIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){hideSlash();return;}
  }
  if(filePopup.classList.contains('visible')){
    const its=filePopup.querySelectorAll('.file-item');
    if(e.key==='ArrowDown'){e.preventDefault();fileIdx=Math.min(fileIdx+1,its.length-1);hlFile();return;}
    if(e.key==='ArrowUp'){e.preventDefault();fileIdx=Math.max(fileIdx-1,0);hlFile();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();(its[Math.max(0,fileIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){hideFile();return;}
  }
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
});

function autoSz(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}

function showSlash(partial){
  const p=(partial||'/').replace(/^//,'').toLowerCase();
  renderSlash(SLASH.filter(s=>s.cmd.slice(1).startsWith(p)));
}
function renderSlash(items){
  if(!items.length){hideSlash();return;}
  slashPopup.innerHTML=items.map((it,i)=>
    '<div class="slash-item" data-cmd="'+it.cmd+'">' +
    '<span class="slash-cmd">'+it.cmd+'</span>' +
    '<span class="slash-desc">'+it.desc+'</span></div>'
  ).join('');
  slashPopup.querySelectorAll('.slash-item').forEach(el=>{
    el.onclick=()=>{input.value=el.dataset.cmd+' ';hideSlash();input.focus();autoSz();};
  });
  slashIdx=0; hlSlash(); slashPopup.classList.add('visible');
}
function hideSlash(){slashPopup.classList.remove('visible');slashIdx=-1;}
function hlSlash(){slashPopup.querySelectorAll('.slash-item').forEach((el,i)=>{el.classList.toggle('sel',i===slashIdx);if(i===slashIdx)el.scrollIntoView({block:'nearest'});});}

function renderFile(files){
  if(!files.length){hideFile();return;}
  filePopup.innerHTML=files.slice(0,20).map(f=>'<div class="file-item" data-f="'+esc(f)+'">'+esc(f)+'</div>').join('');
  filePopup.querySelectorAll('.file-item').forEach(el=>{
    el.onclick=()=>{
      const v=input.value,c=input.selectionStart;
      const b=v.slice(0,c).replace(/@([^\\s]*)$/,'@'+el.dataset.f+' ');
      input.value=b+v.slice(c);
      if(!attachedFiles.includes(el.dataset.f))attachedFiles.push(el.dataset.f);
      hideFile();input.focus();autoSz();
    };
  });
  fileIdx=0; hlFile(); filePopup.classList.add('visible');
}
function hideFile(){filePopup.classList.remove('visible');fileIdx=-1;}
function hlFile(){filePopup.querySelectorAll('.file-item').forEach((el,i)=>el.classList.toggle('sel',i===fileIdx));}

function send(){
  const text=input.value.trim();
  if(!text||isRunning)return;
  const code=selText||'', files=[...attachedFiles];
  attachedFiles=[]; input.value=''; autoSz();
  hideSlash(); hideFile();
  vscode.postMessage({type:'sendMessage',text,codeContext:code,files,agentMode});
}
sendBtn.onclick=send;

function setRunning(r){
  isRunning=r; sendBtn.disabled=r;
  stopBtn.classList.toggle('visible',r);
}
function agentEnd(){
  setRunning(false);
  stopBtn.style.display='none'; sendBtn.style.display='inline-block';
  stopBtn.disabled=false; stopBtn.textContent='\u25A0 Stop';
}

function hideEmpty(){emptyState.style.display='none';}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function addUser(text){
  hideEmpty();
  const d=document.createElement('div'); d.className='message user';
  d.innerHTML='<div class="bubble">'+esc(text)+'</div>';
  msgs.appendChild(d); scrollBot();
}

function startAssistant(){
  hideEmpty();
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble';
  b.innerHTML='<div class="thinking"><div class="thinking-dots"><span></span><span></span><span></span></div> Thinking...</div>';
  d.appendChild(b); msgs.appendChild(d); currentBubble=b; currentStepsEl=null; scrollBot();
}

function streamChunk(chunk){
  if(!currentBubble)startAssistant();
  const t=currentBubble.querySelector('.thinking'); if(t)t.remove();
  let s=currentBubble.querySelector('.stream-raw');
  if(!s){s=document.createElement('span');s.className='stream-raw';currentBubble.appendChild(s);}
  s.textContent=(s.textContent||'')+chunk;
  scrollBot();
}

function finalize(html){
  if(!currentBubble)return;
  currentBubble.innerHTML=html||''; attachActions(currentBubble); currentBubble=null; scrollBot();
}

function attachActions(el){
  el.querySelectorAll('.code-block').forEach(block=>{
    const pre=block.querySelector('pre'); if(!pre)return;
    const cp=block.querySelector('.copy-btn'), ins=block.querySelector('.insert-btn');
    if(cp)cp.onclick=()=>{navigator.clipboard?.writeText(pre.textContent||'');cp.textContent='Copied!';setTimeout(()=>cp.textContent='Copy',1200);};
    if(ins)ins.onclick=()=>vscode.postMessage({type:'insertCode',code:pre.textContent||''});
  });
}

function agentStart(){
  setRunning(true); hideEmpty();
  stopBtn.style.display='inline-block'; sendBtn.style.display='none';
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble';
  d.appendChild(b); msgs.appendChild(d); currentBubble=b;
  const steps=document.createElement('div'); steps.className='agent-steps';
  b.appendChild(steps); currentStepsEl=steps; scrollBot();
}

function addToolCall(name,args,step){
  if(!currentStepsEl){agentStart();}
  const s=document.createElement('div'); s.className='agent-step'; s.id='step'+step;
  const argsStr=args?Object.entries(args).map(([k,v])=>k+': '+String(v).slice(0,60)).join(' \xB7 '):'';
  s.innerHTML='<span class="step-icon">\u2699</span><div class="step-body"><div class="step-title">'+esc(name)+'</div>'+(argsStr?'<div class="step-detail">'+esc(argsStr)+'</div>':'')+'</div>';
  const det=s.querySelector('.step-detail');
  if(det)det.onclick=()=>det.classList.toggle('expanded');
  currentStepsEl.appendChild(s); scrollBot();
}

function addToolResult(name,output,ok,step){
  const s=document.getElementById('step'+step); if(!s)return;
  s.classList.add(ok?'success':'failure');
  s.querySelector('.step-icon').textContent=ok?'\u2713':'\u2717';
  const d=document.createElement('div'); d.className='step-detail';
  d.textContent=(output||'').slice(0,400); d.onclick=()=>d.classList.toggle('expanded');
  s.querySelector('.step-body').appendChild(d); scrollBot();
}

function addReflection(content,attempt){
  if(!currentStepsEl){agentStart();}
  const s=document.createElement('div'); s.className='agent-step reflection';
  s.innerHTML='<span class="step-icon">\u{1F504}</span><div class="step-body"><div class="step-title">Reflecting (attempt '+esc(String(attempt||1))+')</div><div class="step-detail">'+esc(content||'')+'</div></div>';
  const det=s.querySelector('.step-detail');
  if(det)det.onclick=()=>det.classList.toggle('expanded');
  currentStepsEl.appendChild(s); scrollBot();
}

function showDiffPreview(stepId,filePath,isNew,html){
  if(!currentStepsEl){agentStart();}
  const wrap=document.createElement('div'); wrap.className='diff-block';
  wrap.innerHTML='<div class="diff-header"><span>'+(isNew?'\u271A New file: ':'~ Edit: ')+esc(filePath)+'</span></div><div class="diff-body">'+html+'</div><div class="diff-actions"><button class="btn-approve-diff">\u2713 Apply</button><button class="btn-reject-diff">\u2715 Reject</button></div>';
  wrap.querySelector('.btn-approve-diff').onclick=()=>{
    wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#4ade80">Applied.</em>';
    vscode.postMessage({type:'approveDiff',stepId});
  };
  wrap.querySelector('.btn-reject-diff').onclick=()=>{
    wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#f87171">Rejected.</em>';
    vscode.postMessage({type:'rejectDiff',stepId});
  };
  currentStepsEl.appendChild(wrap); scrollBot();
}

function showPlan(html){
  setRunning(false); hideEmpty();
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble'; b.style.padding='4px';
  const plan=document.createElement('div'); plan.className='plan-block';
  plan.innerHTML='<div class="plan-header">\u{1F4CB} Plan \u2014 Review before executing</div><div class="plan-content">'+html+'</div><div class="plan-actions"><button class="btn-approve" id="approveBtn">\u25B6 Execute Plan</button><button class="btn-reject" id="rejectBtn">\u2715 Reject</button></div>';
  b.appendChild(plan); d.appendChild(b); msgs.appendChild(d); currentBubble=null;
  plan.querySelector('#approveBtn').onclick=()=>{
    plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;opacity:0.7">Executing...</em>';
    vscode.postMessage({type:'confirmPlan'});
  };
  plan.querySelector('#rejectBtn').onclick=()=>{
    plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;color:#f44336">Plan rejected.</em>';
    vscode.postMessage({type:'rejectPlan'});
  };
  scrollBot();
}

window.addEventListener('message',e=>{
  const m=e.data;
  switch(m.type){
    case 'userMessage': addUser(m.text); startAssistant(); setRunning(true); break;
    case 'startAssistantMessage': startAssistant(); setRunning(true); break;
    case 'streamChunk': streamChunk(m.chunk); break;
    case 'finalizeAssistantMessage': finalize(m.html); agentEnd(); break;
    case 'agentStart': agentStart(); break;
    case 'agentThinking': break;
    case 'agentToolCall': addToolCall(m.toolName,m.toolArgs,m.step); break;
    case 'agentToolResult': addToolResult(m.toolName,m.output,m.success,m.step); break;
    case 'agentReflection': addReflection(m.content,m.attempt); break;
    case 'agentDiffPreview': showDiffPreview(m.stepId,m.path,m.isNew,m.html); break;
    case 'agentPlan': showPlan(m.html); break;
    case 'agentDone':
      if(m.html&&currentBubble){
        const r=document.createElement('div'); r.innerHTML=m.html;
        currentBubble.appendChild(r); attachActions(r);
      }
      if(m.error&&currentBubble){
        const er=document.createElement('div');
        er.style.cssText='color:#f44336;font-size:12px;margin-top:6px;';
        er.textContent='\u26A0 '+m.error; currentBubble.appendChild(er);
      }
      currentBubble=null; agentEnd(); scrollBot(); break;
    case 'planExecuting': startAssistant(); setRunning(true); break;
    case 'planRejected': agentEnd(); break;
    case 'models': renderModels(m.models,m.current); break;
    case 'connectionStatus': statusDot.classList.toggle('connected',m.connected); break;
    case 'indexStatus':
      const statusEl=$('indexStatus');
      if(statusEl){
        statusEl.textContent=m.message||'';
        statusEl.classList.toggle('indexing',!!m.indexing);
        if(m.fileCount!=null) statusEl.textContent='Indexing workspace... ('+m.fileCount+' files)';
        if(!m.indexing&&m.chunkCount!=null) statusEl.textContent=m.chunkCount+' chunks indexed';
      }
      break;
    case 'memoryData':
      const core=m.core||{};
      $('memProjectContext').value=core.projectContext||'';
      $('memUserPreferences').value=core.userPreferences||'';
      window._keyFacts=Array.isArray(core.keyFacts)?core.keyFacts.slice():[];
      renderKeyFacts();
      const recall=m.recallCount||0, arch=m.archivalCount||0, skillList=m.skills||[];
      const sum=[core.projectContext?core.projectContext.slice(0,40)+'\u2026':'\u2014', 'R:'+recall, 'A:'+arch, 'S:'+skillList.length].join(' \xB7 ');
      const sumEl=$('memorySummary'); if(sumEl) sumEl.textContent='Memory: '+sum;
      const skillsEl=$('skillsList'); if(skillsEl) skillsEl.innerHTML=skillList.map(s=>'<div class="skill-row"><span>'+esc(s.name)+'</span><button data-id="'+esc(s.id)+'">Delete</button></div>').join('')||'<span style="opacity:0.7">No skills</span>';
      skillsEl.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>vscode.postMessage({type:'deleteSkill',id:btn.dataset.id}); });
      break;
    case 'selectionContext':
      selText=m.text; selLang=m.lang;
      selBadge.classList.toggle('visible',!!m.text);
      if(m.text)$('selLabel').textContent=m.text.split('\\n').length+' lines ('+m.lang+')';
      break;
    case 'workspaceFiles': renderFile(m.files); break;
    case 'injectMessage': input.value=m.text; if(m.codeContext)selText=m.codeContext; autoSz(); input.focus(); break;
    case 'injectPrompt': input.value=m.text||''; autoSz(); break;
    case 'submitPrompt': if(input.value.trim())send(); break;
    case 'loadHistory':
      msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='none';
      if(sessionNameEl) sessionNameEl.textContent=m.sessionName||'';
      for(const msg of (m.messages||[])){
        if(msg.role==='user') addUser(msg.content);
        else {
          hideEmpty();
          const d=document.createElement('div'); d.className='message assistant';
          const b=document.createElement('div'); b.className='bubble';
          b.innerHTML=msg.html||esc(msg.content); d.appendChild(b); msgs.appendChild(d); attachActions(b); scrollBot();
        }
      }
      scrollBot();
      break;
    case 'clearMessages': msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='flex'; break;
    case 'error':
      if(currentBubble){currentBubble.innerHTML='<span style="color:#f44336">\u26A0 '+esc(m.message||'Error')+'</span>';currentBubble=null;}
      agentEnd(); break;
    case 'slashCommands': allCommands=m.commands||[]; break;
    case 'assistantMessage':
      hideEmpty();
      const ad=document.createElement('div'); ad.className='message assistant';
      const ab=document.createElement('div'); ab.className='bubble';
      ab.innerHTML=m.html||esc(m.text||'');
      ad.appendChild(ab); msgs.appendChild(ad); attachActions(ab); scrollBot();
      break;
    case 'setModel': if(modelSel&&m.model){ modelSel.value=m.model; vscode.postMessage({type:'changeModel',model:m.model}); } break;
  }
});

function renderModels(models,current){
  modelSel.innerHTML='';
  if(!models.length){const o=document.createElement('option');o.textContent='\u2014 No models \u2014';modelSel.appendChild(o);return;}
  models.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.name;
    const gb=(m.size/1e9).toFixed(1);
    o.textContent=m.name+' ('+gb+'GB)';
    if(m.name===current)o.selected=true;
    modelSel.appendChild(o);
  });
}
</script>
</body>
</html>`}};function Bt(){let c="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)c+=e.charAt(Math.floor(Math.random()*e.length));return c}var O=w(require("vscode")),F=w(require("path")),nt=w(require("fs"));var Ze=w(require("path")),Ce=5,U=80,Ve=40,Ot=10,Nt=new Set(["typescript","javascript","ts","js","python","py","go","rust","rs","java","c","cpp","csharp","cs","css","html","htm"]),qt=["node_modules",".git","dist","out","build",".next"],jt=/\.min\.(js|css)$/i;function Me(c){return!(c.split(/[/\\]/).some(t=>qt.includes(t))||jt.test(c))}function zt(c,e){let t=c.split(`
`),s=[],n=e.toLowerCase(),i=/^\s*((?:export\s+)?(?:abstract\s+)?(?:public\s+)?(?:private\s+)?)?class\s+(\w+)/,a=/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,o=/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/,r=/^\s{2,}(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?\s*$/,l=/^\s*def\s+(\w+)\s*\(/,p=/^\s*class\s+(\w+)\s*[(:]/,u=/^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/,m=/^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/,v=/^\s*(?:\w+(?:\s*\*+)?\s+)+\s*(\w+)\s*\([^)]*\)\s*\{?\s*$/,y=/^\s*<(script|style|div|section|main|article)\b/,h=/^\s*(@\w+|\.[\w-]+|#[\w-]+)\s*\{/;for(let b=0;b<t.length;b++){let g=t[b],x=b+1;if(n==="python"||n==="py"){let f=g.match(p)||g.match(l);f&&s.push({type:f[0].trim().startsWith("class")?"class":"function",name:f[1],startLine:x});continue}if(n==="go"){let f=g.match(u);f&&s.push({type:"function",name:f[1],startLine:x});continue}if(n==="rust"||n==="rs"){let f=g.match(m);f&&s.push({type:"function",name:f[1],startLine:x});continue}if(n==="html"||n==="htm"){let f=g.match(y);f&&s.push({type:"block",name:f[1],startLine:x});continue}if(n==="css"){let f=g.match(h);f&&s.push({type:"block",name:f[1].replace(/^[.#]/,""),startLine:x});continue}if(n==="c"||n==="cpp"||n==="csharp"||n==="cs"){let f=g.match(i);if(f)s.push({type:"class",name:f[2],startLine:x});else{let _=g.match(v);_&&s.push({type:"function",name:_[1],startLine:x})}continue}if(i.test(g)){let f=g.match(i);f&&s.push({type:"class",name:f[2],startLine:x})}else if(a.test(g)||o.test(g)){let f=g.match(a)||g.match(o);f&&s.push({type:"function",name:f[1],startLine:x})}else if(r.test(g)&&g.trim().length>3){let f=g.match(r);f&&s.push({type:"method",name:f[1],startLine:x})}}return s}function Wt(c,e,t){let s=t.toLowerCase(),n=e-1;if(s==="python"||s==="py"||s==="go"){let o=(c[n]??"").match(/^(\s*)/)?.[1]?.length??0;for(let r=n+1;r<Math.min(n+U+1,c.length);r++){let l=c[r]??"",p=l.match(/^(\s*)/)?.[1]?.length??0;if(!(l.trim()===""&&r>n+1)&&p<=o&&l.trim()!=="")return Math.min(r,n+U)}return Math.min(c.length,n+U)}let i=0,a=!1;for(let o=n;o<Math.min(n+U,c.length);o++){let r=c[o]??"";for(let l of r)l==="{"?(i++,a=!0):l==="}"&&i--;if(a&&i===0)return o+1}return Math.min(c.length,n+U)}function Ye(c,e,t){let s=[],n=0,i=0;for(;n<c.length;){let a=Math.min(n+Ve,c.length),o=c.slice(n,a).join(`
`);if(o.trim().length>0&&a-n>=Ce){let r=`${e}:${n+1}-${a}`;s.push({id:r,filePath:e,language:t,startLine:n+1,endLine:a,name:`lines ${n+1}-${a}`,content:o,type:"block"}),i++}if(n+=Ve-Ot,n>=c.length)break}return s}function et(c,e,t){let s=e.split(`
`),n=Ze.extname(c).toLowerCase().replace(/^\./,""),i=t||n;if(!Nt.has(i)||s.length<Ce)return Ye(s,c,i);let o=zt(e,i),r=[];for(let l=0;l<o.length;l++){let p=o[l],u=l+1<o.length?o[l+1].startLine-1:s.length,m=Wt(s,p.startLine,i);if(m=Math.min(m,p.startLine+U-1,u+1),m-p.startLine+1<Ce)continue;let h=s.slice(p.startLine-1,m).join(`
`),b=`${c}:${p.startLine}-${m}`;r.push({id:b,filePath:c,language:i,startLine:p.startLine,endLine:m,name:p.name,content:h,type:p.type})}return r.length===0?Ye(s,c,i):r}var Te=w(require("vscode")),tt=10,st=15e3,V=class c{constructor(){this._cache=new Map;this._available=null;this._config=Te.workspace.getConfiguration("ollamaCopilot")}get endpoint(){return this._config.get("endpoint","http://localhost:11434").replace(/\/$/,"")}get model(){return this._config.get("embeddingModel","nomic-embed-text")}refreshConfig(){this._config=Te.workspace.getConfiguration("ollamaCopilot")}async isAvailable(){if(this._available!==null)return this._available;let e=new AbortController,t=setTimeout(()=>e.abort(),5e3);try{let s=await fetch(`${this.endpoint}/api/embed`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,input:"test"}),signal:e.signal});return clearTimeout(t),this._available=s.ok,this._available}catch{return clearTimeout(t),this._available=!1,!1}}resetAvailability(){this._available=null}static normalize(e){let t=0;for(let n=0;n<e.length;n++)t+=e[n]*e[n];let s=Math.sqrt(t)||1;return e.map(n=>n/s)}static dot(e,t){if(e.length!==t.length)return 0;let s=0;for(let n=0;n<e.length;n++)s+=e[n]*t[n];return s}async embed(e,t){if(t&&this._cache.has(t))return this._cache.get(t);this.refreshConfig();let s=new AbortController,n=setTimeout(()=>s.abort(),st);try{let i=await fetch(`${this.endpoint}/api/embed`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,input:e}),signal:s.signal});if(!i.ok){let l=await i.text();throw new Error(`Embed failed: ${i.status} ${l}`)}let a=await i.json(),o=a.embedding??a.embeddings?.[0];if(!Array.isArray(o))throw new Error("Invalid embed response");let r=c.normalize(o);return t&&this._cache.set(t,r),r}finally{clearTimeout(n)}}async embedBatch(e,t){let s=[],n=[];for(let i=0;i<e.length;i++)this._cache.has(t[i])?s[i]=this._cache.get(t[i]):n.push({text:e[i],id:t[i],index:i});for(let i=0;i<n.length;i+=tt){let a=n.slice(i,i+tt),o=a.map(p=>p.text);this.refreshConfig();let r=new AbortController,l=setTimeout(()=>r.abort(),st*2);try{let p=await fetch(`${this.endpoint}/api/embed`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,input:o}),signal:r.signal});if(clearTimeout(l),!p.ok){let v=await p.text();throw new Error(`Embed batch failed: ${p.status} ${v}`)}let u=await p.json(),m=u.embeddings??(u.embedding?[u.embedding]:[]);for(let v=0;v<a.length;v++){let y=m[v];if(!Array.isArray(y))throw new Error("Invalid embed batch response");let h=c.normalize(y),b=a[v].id;this._cache.set(b,h),s[a[v].index]=h}}finally{clearTimeout(l)}}return s}getCached(e){return this._cache.get(e)}clearCache(){this._cache.clear()}};var Ht=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]),me=class c{constructor(){this._chunks=[];this._chunkById=new Map;this._lastIndexed=0;this._indexing=!1;this._tokenFreq=new Map;this._docFreq=new Map;this._disposables=[];this._embedder=new V}get status(){return{isIndexed:this._chunks.length>0&&!this._indexing,isIndexing:this._indexing,chunkCount:this._chunks.length,lastIndexed:this._lastIndexed}}static tokenize(e){return e.toLowerCase().split(/\W+/).filter(t=>t.length>1&&!Ht.has(t))}updateTokenStats(e){let t=c.tokenize(e.content),s=new Map;for(let n of t)s.set(n,(s.get(n)??0)+1);this._tokenFreq.set(e.id,s);for(let n of s.keys())this._docFreq.set(n,(this._docFreq.get(n)??0)+1)}removeTokenStats(e){let t=this._tokenFreq.get(e);if(t){for(let s of t.keys()){let n=this._docFreq.get(s)??0;n<=1?this._docFreq.delete(s):this._docFreq.set(s,n-1)}this._tokenFreq.delete(e)}}bm25Score(e,t){let s=this._chunks.length||1,n=this._tokenFreq.get(e.id);if(!n)return 0;let i=0;for(let a of t){let o=n.get(a)??0;if(o===0)continue;let r=this._docFreq.get(a)??0,l=Math.log(s/(r+1)+1);i+=o*l}return i}async indexFile(e,t,s,n){let i=F.normalize(e),a=this._chunks.filter(r=>F.normalize(r.filePath)===i);for(let r of a)this.removeTokenStats(r.id),this._chunkById.delete(r.id);this._chunks=this._chunks.filter(r=>F.normalize(r.filePath)!==i);let o=et(e,t,s);for(let r of o)this._chunks.push(r),this._chunkById.set(r.id,r),this.updateTokenStats(r);if(n)try{await this._embedder.embedBatch(o.map(r=>r.content),o.map(r=>r.id))}catch{}}async indexAll(e){let t=O.workspace.workspaceFolders;if(!t?.length){e?.("No workspace folder open");return}if(this._indexing)return;this._indexing=!0,this._embedder.clearCache(),this._chunks=[],this._chunkById.clear(),this._tokenFreq.clear(),this._docFreq.clear();let s=t[0].uri.fsPath,n=await this._embedder.isAvailable();try{let i=await O.workspace.findFiles(new O.RelativePattern(s,"**/*"),"{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/*.min.js,**/build/**,**/.next/**}",5e3),a=0;for(let o=0;o<i.length;o++){let r=i[o],l=F.relative(s,r.fsPath);if(Me(l))try{let p=nt.readFileSync(r.fsPath,"utf8"),m=F.extname(r.fsPath).replace(/^\./,"")||"plaintext";await this.indexFile(l,p,m,n),a++,e&&a%10===0&&e(`Indexing workspace... (${a} files)`,a)}catch{}}this._lastIndexed=Date.now(),e?.(`Indexed ${this._chunks.length} chunks`,a)}catch(i){e?.(`Index error: ${i instanceof Error?i.message:String(i)}`)}finally{this._indexing=!1}}async indexFileOnSave(e){let t=O.workspace.workspaceFolders;if(!t?.length)return;let s=t[0].uri.fsPath,n=F.relative(s,e.uri.fsPath);if(!Me(n))return;let i=await this._embedder.isAvailable();try{await this.indexFile(n,e.getText(),e.languageId,i)}catch{}}async query(e,t=5){let s=Math.min(t,this._chunks.length);if(s===0)return[];let n=c.tokenize(e);if(await this._embedder.isAvailable())try{let o=await this._embedder.embed(e),r=this._chunks.map(l=>{let p=this._embedder.getCached(l.id),u=p?V.dot(o,p):0;return{chunk:l,score:u}});return r.sort((l,p)=>p.score-l.score),r.slice(0,s).map(l=>l.chunk)}catch{}let a=this._chunks.map(o=>({chunk:o,score:this.bm25Score(o,n)}));return a.sort((o,r)=>r.score-o.score),a.slice(0,s).filter(o=>o.score>0).map(o=>o.chunk)}async getContext(e){let t=O.workspace.getConfiguration("ollamaCopilot"),s=t.get("ragTopK",5);if(!t.get("ragEnabled",!0)||this._chunks.length===0)return"";let i=await this.query(e,s);if(i.length===0)return"";let a=["<workspace_context>","Relevant code from your workspace (retrieved by semantic search):",""];for(let o of i)a.push(`--- ${o.filePath} | ${o.type}: ${o.name} | lines ${o.startLine}-${o.endLine} ---`),a.push(o.content),a.push("");return a.push("</workspace_context>"),a.join(`
`)}startWatching(){let e=O.workspace.onDidSaveTextDocument(t=>{this.indexFileOnSave(t).catch(()=>{})});this._disposables.push(e)}dispose(){for(let e of this._disposables)e.dispose();this._disposables=[]}};var Z=w(require("path")),A=w(require("fs")),Ee=200,Y=1e3,ot=500,it=300,rt=10,at=100,Ut=2e3,Kt=7,Xt=100,Gt=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]);function he(c){return c.toLowerCase().split(/\W+/).filter(e=>e.length>1&&!Gt.has(e))}function ct(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}function Pe(){return{core:{projectContext:"",userPreferences:"",keyFacts:[]},recall:[],archival:[],version:1}}var ge=class{constructor(e){this._dirty=!1;this._storagePath=Z.join(e.fsPath,"memory.json"),this._data=Pe()}async init(){try{let e=Z.dirname(this._storagePath);if(A.existsSync(e)||A.mkdirSync(e,{recursive:!0}),A.existsSync(this._storagePath)){let t=A.readFileSync(this._storagePath,"utf8"),s=JSON.parse(t);this._data={core:{projectContext:String(s.core?.projectContext??"").slice(0,ot),userPreferences:String(s.core?.userPreferences??"").slice(0,it),keyFacts:Array.isArray(s.core?.keyFacts)?s.core.keyFacts.slice(0,rt).map(n=>String(n).slice(0,at)):[]},recall:Array.isArray(s.recall)?s.recall.slice(0,Ee):[],archival:Array.isArray(s.archival)?s.archival.slice(0,Y):[],version:typeof s.version=="number"?s.version:1}}await this.consolidate()}catch{this._data=Pe()}}_scheduleSave(){this._dirty=!0,this._saveTimer&&clearTimeout(this._saveTimer),this._saveTimer=setTimeout(()=>{this._saveTimer=void 0,this.save()},Ut)}async save(){if(this._dirty){this._dirty=!1;try{let e=Z.dirname(this._storagePath);A.existsSync(e)||A.mkdirSync(e,{recursive:!0}),A.writeFileSync(this._storagePath,JSON.stringify(this._data,null,2),"utf8")}catch{this._dirty=!0}}}getCoreMemory(){return{...this._data.core}}async updateCoreMemory(e){e.projectContext!==void 0&&(this._data.core.projectContext=String(e.projectContext).slice(0,ot)),e.userPreferences!==void 0&&(this._data.core.userPreferences=String(e.userPreferences).slice(0,it)),e.keyFacts!==void 0&&(this._data.core.keyFacts=e.keyFacts.slice(0,rt).map(t=>String(t).slice(0,at))),this._scheduleSave()}async addRecall(e,t,s=[]){let n={id:ct(),content:e,source:t,createdAt:Date.now(),lastAccessedAt:Date.now(),accessCount:0,tags:Array.isArray(s)?s:[]};this._data.recall.unshift(n),this._data.recall.length>Ee&&(this._data.recall=this._data.recall.slice(0,Ee)),this._scheduleSave()}searchRecall(e,t=5){let s=he(e);if(s.length===0)return this._data.recall.slice(0,t);let n=Date.now(),i=this._data.recall.map(o=>{let r=new Set(he(o.content)),l=0;for(let p of s)r.has(p)&&l++;return{entry:o,score:l}});i.sort((o,r)=>r.score-o.score);let a=i.slice(0,t).filter(o=>o.score>0).map(o=>o.entry);a.length===0&&a.push(...this._data.recall.slice(0,t));for(let o of a)o.lastAccessedAt=n,o.accessCount=(o.accessCount||0)+1;return this._scheduleSave(),a}async addArchival(e,t,s=[]){let n={id:ct(),content:e,source:t,createdAt:Date.now(),lastAccessedAt:Date.now(),accessCount:0,tags:Array.isArray(s)?s:[]};this._data.archival.push(n),this._data.archival.length>Y&&(this._data.archival=this._data.archival.slice(-Y)),this._scheduleSave()}searchArchival(e,t=5){let s=he(e);if(s.length===0)return this._data.archival.slice(-t).reverse();let n=this._data.archival.map(o=>{let r=new Set(he(o.content)),l=0;for(let p of s)r.has(p)&&l++;return{entry:o,score:l}});n.sort((o,r)=>r.score-o.score);let i=n.slice(0,t).filter(o=>o.score>0).map(o=>o.entry);i.length===0&&i.push(...this._data.archival.slice(-t).reverse());let a=Date.now();for(let o of i)o.lastAccessedAt=a,o.accessCount=(o.accessCount||0)+1;return this._scheduleSave(),i}getCoreContextBlock(){let e=this._data.core,t=e.projectContext.trim().length>0,s=e.userPreferences.trim().length>0,n=e.keyFacts.length>0;if(!t&&!s&&!n)return"";let i=["<memory_core>"];return t&&i.push(`Project: ${e.projectContext.trim()}`),s&&i.push(`Preferences: ${e.userPreferences.trim()}`),n&&i.push(`Key facts: ${e.keyFacts.join(" | ")}`),i.push("</memory_core>"),i.join(`
`)}getRecallContextBlock(e,t=3){let s=this.searchRecall(e,t);return s.length===0?"":["<memory_recall>",...s.map(i=>i.content),"</memory_recall>"].join(`
`)}async consolidate(){let e=Date.now()-Kt*24*60*60*1e3,t=this._data.recall.filter(n=>n.createdAt<e),s=this._data.recall.filter(n=>n.createdAt>=e).slice(0,Xt);for(let n of t)this._data.archival.push(n);this._data.archival.length>Y&&(this._data.archival=this._data.archival.slice(-Y)),this._data.recall=s,this._scheduleSave()}searchMemory(e,t,s=5){let n=Math.min(s,20);if(t==="recall")return this.searchRecall(e,n);if(t==="archival")return this.searchArchival(e,n);let i=this.searchRecall(e,n),a=this.searchArchival(e,n),o=new Set(i.map(r=>r.id));for(let r of a)!o.has(r.id)&&i.length<n&&(i.push(r),o.add(r.id));return i.slice(0,n)}async clearAll(){this._data=Pe(),this._dirty=!0,await this.save()}getRecallCount(){return this._data.recall.length}getArchivalCount(){return this._data.archival.length}};var ee=w(require("path")),$=w(require("fs")),lt=2e3,Jt=1e3,Qt=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"]);function dt(c){return c.toLowerCase().split(/\W+/).filter(e=>e.length>1&&!Qt.has(e))}function Vt(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}var fe=class{constructor(e){this._skills=[];this._dirty=!1;this._storagePath=ee.join(e.fsPath,"skills.json")}async init(){try{let e=ee.dirname(this._storagePath);if($.existsSync(e)||$.mkdirSync(e,{recursive:!0}),$.existsSync(this._storagePath)){let t=$.readFileSync(this._storagePath,"utf8"),s=JSON.parse(t);this._skills=Array.isArray(s)?s:[]}}catch{this._skills=[]}}_scheduleSave(){this._dirty=!0,this._saveTimer&&clearTimeout(this._saveTimer),this._saveTimer=setTimeout(()=>{this._saveTimer=void 0,this.save()},Jt)}async save(){if(this._dirty){this._dirty=!1;try{let e=ee.dirname(this._storagePath);$.existsSync(e)||$.mkdirSync(e,{recursive:!0}),$.writeFileSync(this._storagePath,JSON.stringify(this._skills,null,2),"utf8")}catch{this._dirty=!0}}}async addSkill(e,t,s,n=[]){let i={id:Vt(),name:e.trim(),description:t.trim().slice(0,500),content:s.trim().slice(0,lt),tags:Array.isArray(n)?n.map(a=>String(a).trim()):[],createdAt:Date.now(),useCount:0};return this._skills.push(i),this._scheduleSave(),{...i}}async updateSkill(e,t){let s=this._skills.findIndex(n=>n.id===e);s!==-1&&(t.name!==void 0&&(this._skills[s].name=String(t.name).trim()),t.description!==void 0&&(this._skills[s].description=String(t.description).slice(0,500)),t.content!==void 0&&(this._skills[s].content=String(t.content).slice(0,lt)),t.tags!==void 0&&(this._skills[s].tags=t.tags.map(n=>String(n).trim())),this._scheduleSave())}async deleteSkill(e){this._skills=this._skills.filter(t=>t.id!==e),this._scheduleSave()}listSkills(){return this._skills.map(e=>({...e}))}getSkill(e){let t=this._skills.find(s=>s.id===e);return t?{...t}:void 0}findRelevant(e,t=2){let s=new Set(dt(e));if(s.size===0)return this._skills.slice(0,t).map(a=>(a.useCount=(a.useCount||0)+1,{...a}));let n=this._skills.map(a=>{let o=`${a.description} ${a.tags.join(" ")}`,r=new Set(dt(o)),l=0;for(let p of s)r.has(p)&&l++;return{skill:a,score:l}});n.sort((a,o)=>o.score-a.score);let i=n.slice(0,t).filter(a=>a.score>0).map(a=>a.skill);if(i.length>0){for(let a of i)a.useCount=(a.useCount||0)+1;this._scheduleSave()}return i.map(a=>({...a}))}getSkillContextBlock(e){let t=this.findRelevant(e,2);if(t.length===0)return"";let s=["<skills>"];for(let n of t)s.push(`## Skill: ${n.name}`),s.push(n.content);return s.push("</skills>"),s.join(`
`)}};var pt=w(require("path"));function z(c,e){let t=`

\`\`\`${e.language}
${e.code}
\`\`\``,s=`from ${e.filePath} (lines ${e.lineStart}-${e.lineEnd})`;switch(c){case"explain":return`Explain the following ${e.language} code ${s}:${t}

Provide a clear, concise explanation of what it does, key design choices, and any potential issues.`;case"refactor":return`Refactor the following ${e.language} code ${s} for readability, performance, and best practices:${t}

Show the refactored version and explain the key changes.`;case"fix":return`Find and fix bugs in the following ${e.language} code ${s}:${t}

Identify each bug, explain why it's a bug, and provide the corrected code.`;case"add_tests":return`Write comprehensive unit tests for the following ${e.language} code ${s}:${t}

Cover happy paths, edge cases, and error cases.`;case"add_docs":return`Add documentation comments to the following ${e.language} code ${s}:${t}

Use the appropriate doc format for the language (JSDoc, docstrings, etc).`;default:return`Review the following ${e.language} code ${s}:${t}`}}function W(c,e){if(c.selection.isEmpty)return null;let t=c.document,s=c.selection,n=t.getText(s),i=pt.relative(e,t.uri.fsPath),a=s.start.line+1,o=s.end.line+1;return{code:n,language:t.languageId,filePath:i,lineStart:a,lineEnd:o}}var K=w(require("vscode")),Yt=new Set(["typescript","javascript","typescriptreact","javascriptreact","python","go","rust","java","c","cpp","csharp","php","ruby","swift","kotlin","scala","lua","r","dart"]);function Zt(c){let e=c.toLowerCase();return e==="typescript"||e==="javascript"||e==="ts"||e==="js"?/^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?class\s+\w+/:e==="python"||e==="py"?/^\s*def\s+\w+|^\s*class\s+\w+/:e==="go"?/^\s*func\s+\w+/:e==="rust"||e==="rs"?/^\s*(pub\s+)?fn\s+\w+|^\s*(pub\s+)?struct\s+\w+/:Yt.has(e)?/^\s*(function|class|def|func|fn)\s+\w+/:null}var ve=class{provideCodeLenses(e,t){if(!K.workspace.getConfiguration("ollamaCopilot").get("codeLensEnabled",!0))return[];let n=Zt(e.languageId);if(!n)return[];let i=[],a=e.getText().split(/\r?\n/);for(let o=0;o<a.length;o++)if(n.test(a[o]??"")){let r=new K.Range(o,0,o,(a[o]??"").length);i.push(new K.CodeLens(r,{title:"$(sparkle) Ollama",command:"ollamaCopilot.codeLensAction",arguments:[e.uri,o]}))}return i}resolveCodeLens(e,t){return e}};var D=w(require("vscode")),te=class{static{this.providedCodeActionKinds=[D.CodeActionKind.QuickFix]}provideCodeActions(e,t,s,n){let i=s.diagnostics.filter(a=>a.severity===D.DiagnosticSeverity.Error||a.severity===D.DiagnosticSeverity.Warning);return i.length?i.map(a=>{let o=a.severity===D.DiagnosticSeverity.Error?"error":"warning",r=new D.CodeAction(`Fix ${o} with Ollama: ${a.message.slice(0,60)}${a.message.length>60?"\u2026":""}`,D.CodeActionKind.QuickFix);return r.diagnostics=[a],r.isPreferred=!1,r.command={command:"ollamaCopilot.fixDiagnostic",title:"Fix with Ollama",arguments:[e,a]},r}):[]}};var T=w(require("vscode")),ye=class{constructor(e){this._item=T.window.createStatusBarItem(T.StatusBarAlignment.Left,90),this._item.command="workbench.actions.view.problems",e.subscriptions.push(this._item),this._update(),e.subscriptions.push(T.languages.onDidChangeDiagnostics(()=>this._update())),this._item.show()}_update(){let e=0,t=0;for(let[,s]of T.languages.getDiagnostics())for(let n of s)n.severity===T.DiagnosticSeverity.Error&&e++,n.severity===T.DiagnosticSeverity.Warning&&t++;this._item.text=`$(error) ${e}  $(warning) ${t}`,this._item.tooltip=`${e} error(s), ${t} warning(s) \u2014 click to open Problems`,this._item.color=e>0?new T.ThemeColor("statusBarItem.errorForeground"):t>0?new T.ThemeColor("statusBarItem.warningForeground"):void 0}};var be=w(require("vscode")),mt=w(require("path")),ut=10;function ht(c,e,t){let s=mt.relative(t,c.uri.fsPath),n=e.severity===be.DiagnosticSeverity.Error?"Error":"Warning",i=e.range.start.line,a=Math.max(0,i-ut),o=Math.min(c.lineCount-1,i+ut),r=new be.Range(a,0,o,c.lineAt(o).text.length),l=c.getText(r),p=e.source?` [${e.source}]`:"",u=e.code?` (${typeof e.code=="object"?e.code.value:e.code})`:"";return`Fix the following ${n.toLowerCase()} in ${s} at line ${i+1}:

**${n}${p}${u}:** ${e.message}

Here is the surrounding code (lines ${a+1}-${o+1}):

\`\`\`${c.languageId}
${l}
\`\`\`

Provide the corrected code and a brief explanation of the fix.`}var I=w(require("fs")),Ae=w(require("path")),es="session-index.json",gt=200,ft=20,we=class{constructor(e){this._storageDir=e.globalStorageUri.fsPath,I.mkdirSync(this._storageDir,{recursive:!0}),this._index=this._loadIndex()}_indexPath(){return Ae.join(this._storageDir,es)}_loadIndex(){try{let e=I.readFileSync(this._indexPath(),"utf8");return JSON.parse(e)}catch{return{sessions:[],activeSessionId:null}}}_saveIndex(){I.writeFileSync(this._indexPath(),JSON.stringify(this._index,null,2),"utf8")}_sessionPath(e){return Ae.join(this._storageDir,`session-${e}.json`)}createSession(e){let t=Date.now().toString(36)+Math.random().toString(36).slice(2,6),s=Date.now(),n=`Session ${new Date(s).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:!1})}`,i={id:t,name:e??n,createdAt:s,updatedAt:s,messages:[]};if(this._writeSession(i),this._index.sessions.unshift({id:t,name:i.name,updatedAt:s}),this._index.sessions.length>ft){let a=this._index.sessions.splice(ft);for(let o of a)try{I.unlinkSync(this._sessionPath(o.id))}catch{}}return this._index.activeSessionId=t,this._saveIndex(),i}loadSession(e){try{let t=I.readFileSync(this._sessionPath(e),"utf8");return JSON.parse(t)}catch{return null}}_writeSession(e){I.writeFileSync(this._sessionPath(e.id),JSON.stringify(e,null,2),"utf8")}appendMessage(e,t){try{let s=this.loadSession(e);if(!s)return;s.messages.push(t),s.messages.length>gt&&(s.messages=s.messages.slice(s.messages.length-gt)),s.updatedAt=Date.now(),this._writeSession(s);let n=this._index.sessions.find(i=>i.id===e);n&&(n.updatedAt=s.updatedAt),this._saveIndex()}catch{}}deleteSession(e){try{I.unlinkSync(this._sessionPath(e))}catch{}this._index.sessions=this._index.sessions.filter(t=>t.id!==e),this._index.activeSessionId===e&&(this._index.activeSessionId=this._index.sessions[0]?.id??null),this._saveIndex()}renameSession(e,t){let s=this.loadSession(e);if(!s)return;s.name=t,this._writeSession(s);let n=this._index.sessions.find(i=>i.id===e);n&&(n.name=t),this._saveIndex()}clearMessages(e){let t=this.loadSession(e);t&&(t.messages=[],t.updatedAt=Date.now(),this._writeSession(t))}getIndex(){return this._index}getActiveSessionId(){return this._index.activeSessionId}setActiveSession(e){this._index.activeSessionId=e,this._saveIndex()}getOrCreateActiveSession(){let e=this._index.activeSessionId;if(e){let t=this.loadSession(e);if(t)return t}return this.createSession()}exportSession(e){let t=this.loadSession(e);if(!t)return"";let s=[`# ${t.name}
`];for(let n of t.messages){let i=new Date(n.timestamp).toLocaleTimeString();s.push(`**${n.role==="user"?"You":"Ollama"}** (${i}):

${n.content}
`)}return s.join(`
---

`)}};var X=w(require("vscode"));var xe=class{constructor(e){this._item=X.window.createStatusBarItem(X.StatusBarAlignment.Left,85),this._item.command="ollamaCopilot.askGitStatus",e.subscriptions.push(this._item),this._update(),this._timer=setInterval(()=>this._update(),3e4),e.subscriptions.push(X.workspace.onDidSaveTextDocument(()=>this._update())),e.subscriptions.push({dispose:()=>{this._timer&&clearInterval(this._timer)}}),this._item.show()}_update(){let e=Ne(),t=e.dirtyCount>0?` $(pencil)${e.dirtyCount}`:"";this._item.text=`$(git-branch) ${e.branch}${t}`,this._item.tooltip=e.dirtyCount>0?`${e.dirtyCount} uncommitted change(s) \u2014 click to ask Ollama`:`Branch: ${e.branch} \u2014 click to ask Ollama`}};var G,M,H,se,$e;async function ts(c){let e=new ie;H=new me,H.startWatching(),c.subscriptions.push({dispose:()=>H.dispose()}),se=new ge(c.globalStorageUri),$e=new fe(c.globalStorageUri),await se.init(),await $e.init(),c.subscriptions.push({dispose:()=>{se.save()}}),G=d.window.createStatusBarItem(d.StatusBarAlignment.Right,100),ne(e),G.command="ollamaCopilot.openChat",G.show(),c.subscriptions.push(G),M=new Q(c.extensionUri,e,H,se,$e),c.subscriptions.push(d.window.registerWebviewViewProvider(Q.viewType,M,{webviewOptions:{retainContextWhenHidden:!0}}));let t=new we(c);M.setHistoryStore(t);let s=d.workspace.getConfiguration("ollamaCopilot").get("model","llama3"),n=new re(e,s);c.subscriptions.push(d.languages.registerInlineCompletionItemProvider({pattern:"**"},n)),new ae(c),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.toggleCompletions",async()=>{let o=d.workspace.getConfiguration("ollamaCopilot"),r=o.get("inlineCompletionsEnabled",!0);await o.update("inlineCompletionsEnabled",!r,d.ConfigurationTarget.Global),d.window.showInformationMessage(`Ollama inline completions ${r?"disabled":"enabled"}.`)})),c.subscriptions.push(d.languages.registerCodeActionsProvider("*",new te,{providedCodeActionKinds:te.providedCodeActionKinds})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.fixDiagnostic",async(o,r)=>{let l=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",p=ht(o,r,l);await M.sendQuickAction(p)})),new ye(c),new xe(c),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.askGitStatus",async()=>{await M.sendQuickAction("Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise.")})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.newSession",async()=>{let o=await d.window.showInputBox({prompt:"Session name (leave blank for default)",placeHolder:"My debugging session"});if(o===void 0)return;let r=t.createSession(o||void 0);M.switchSession(r)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.switchSession",async()=>{let o=t.getIndex();if(!o.sessions.length){d.window.showInformationMessage("No saved sessions.");return}let r=o.sessions.map(u=>({label:u.name,description:new Date(u.updatedAt).toLocaleString(),id:u.id})),l=await d.window.showQuickPick(r,{placeHolder:"Select a session"});if(!l)return;let p=t.loadSession(l.id);p&&(t.setActiveSession(l.id),M.switchSession(p))})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.clearSession",async()=>{let o=t.getActiveSessionId();!o||await d.window.showWarningMessage("Clear all messages in this session?","Yes","Cancel")!=="Yes"||(t.clearMessages(o),M.clearWebviewMessages())})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.exportSession",async()=>{let o=t.getActiveSessionId();if(!o)return;let r=t.exportSession(o),l=await d.workspace.openTextDocument({content:r,language:"markdown"});await d.window.showTextDocument(l)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.openChat",()=>{d.commands.executeCommand("ollamaCopilot.chatView.focus")})),c.subscriptions.push(d.languages.registerCodeLensProvider("*",new ve)),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.explain",async()=>{let o=d.window.activeTextEditor;if(!o)return;let r=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",l=W(o,r);if(!l){d.window.showInformationMessage("Select some code first.");return}let p=z("explain",l);await M.sendQuickAction(p)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.refactor",async()=>{let o=d.window.activeTextEditor;if(!o)return;let r=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",l=W(o,r);if(!l){d.window.showInformationMessage("Select some code first.");return}let p=z("refactor",l);await M.sendQuickAction(p)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.fix",async()=>{let o=d.window.activeTextEditor;if(!o)return;let r=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",l=W(o,r);if(!l){d.window.showInformationMessage("Select some code first.");return}let p=z("fix",l);await M.sendQuickAction(p)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.add_tests",async()=>{let o=d.window.activeTextEditor;if(!o)return;let r=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",l=W(o,r);if(!l){d.window.showInformationMessage("Select some code first.");return}let p=z("add_tests",l);await M.sendQuickAction(p)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.add_docs",async()=>{let o=d.window.activeTextEditor;if(!o)return;let r=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",l=W(o,r);if(!l){d.window.showInformationMessage("Select some code first.");return}let p=z("add_docs",l);await M.sendQuickAction(p)})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.codeLensAction",async(o,r)=>{let l=await d.workspace.openTextDocument(o),p=l.getText().split(/\r?\n/),u=(p[r]??"").match(/^(\s*)/)?.[1]?.length??0,m=r,v=Math.min(r+80,p.length);for(let N=r+1;N<v;N++){let Re=p[N]??"";if(Re.trim().length>0&&(Re.match(/^(\s*)/)?.[1]?.length??0)<=u){m=N-1;break}m=N}let y=Math.min(m,p.length-1),h=(p[y]??"").length,b=new d.Range(r,0,y,h),g=await d.window.showTextDocument(l,{selection:b,preserveFocus:!1});g.revealRange(b);let x=d.workspace.workspaceFolders?.[0]?.uri.fsPath??"",f=W(g,x);if(!f)return;let _=[{label:"$(symbol-misc) Explain",detail:"explain"},{label:"$(tools) Refactor",detail:"refactor"},{label:"$(bug) Fix Bug",detail:"fix"},{label:"$(beaker) Add Tests",detail:"add_tests"},{label:"$(book) Add Docs",detail:"add_docs"}],Ie=await d.window.showQuickPick(_,{placeHolder:"Ollama: Choose action"});if(Ie?.detail){let N=z(Ie.detail,f);await M.sendQuickAction(N)}}));let i=[["ollamaCopilot.explainCode","/explain"],["ollamaCopilot.refactorCode","/refactor"],["ollamaCopilot.fixCode","/fix"],["ollamaCopilot.generateDocs","/docs"],["ollamaCopilot.reviewCode","/review"],["ollamaCopilot.optimizeCode","/optimize"],["ollamaCopilot.writeTests","/test"],["ollamaCopilot.addTypes","/types"]];for(let[o,r]of i)c.subscriptions.push(d.commands.registerCommand(o,()=>ss(r)));c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.editFile",async()=>{let o=d.window.activeTextEditor,r=await d.window.showInputBox({prompt:"Describe the changes to make to this file",placeHolder:"e.g. Add error handling to all async functions"});if(!r)return;let l=o?o.document.getText():"";M.sendToChat(`/edit ${r}`,l),d.commands.executeCommand("ollamaCopilot.chatView.focus")})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.planFeature",async()=>{let o=await d.window.showInputBox({prompt:"Describe the feature to plan",placeHolder:"e.g. Add user authentication with JWT"});o&&(M.sendToChat(`/plan ${o}`),d.commands.executeCommand("ollamaCopilot.chatView.focus"))})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.runCommand",async()=>{let o=await d.window.showInputBox({prompt:"Terminal command to run",placeHolder:"e.g. npm test"});o&&(M.sendToChat(`/run ${o}`),d.commands.executeCommand("ollamaCopilot.chatView.focus"))})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.selectModel",async()=>{e.refreshConfig();let o=[];try{o=(await e.listModels()).map(m=>({name:m.name}))}catch{}let r=new Set(o.map(u=>u.name)),l=[...o.map(u=>({label:`$(check) ${u.name}`,description:"Installed",detail:u.name})),{label:"$(package) Available to pull",kind:d.QuickPickItemKind.Separator},..._e.filter(u=>!r.has(u.name)).map(u=>({label:u.label,description:u.category,detail:u.name}))],p=await d.window.showQuickPick(l,{matchOnDescription:!0,matchOnDetail:!0,placeHolder:"Select or pull an Ollama model"});if(p?.detail){let u=p.detail;r.has(u)||await vt(e,u),await d.workspace.getConfiguration("ollamaCopilot").update("model",u,d.ConfigurationTarget.Global),ne(e,u)}})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.clearMemory",async()=>{await d.window.showWarningMessage("Clear all agent memory (core, recall, archival)? This cannot be undone.","Clear","Cancel")==="Clear"&&(await se.clearAll(),d.window.showInformationMessage("Ollama Copilot: Memory cleared."))})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.viewMemory",()=>{d.commands.executeCommand("ollamaCopilot.chatView.focus")})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.reindexWorkspace",async()=>{try{await d.window.withProgress({location:d.ProgressLocation.Notification,title:"Ollama Copilot: Indexing workspace",cancellable:!1},async r=>{await H.indexAll((l,p)=>{r.report({message:p!=null?`${l} (${p} files)`:l})})});let o=H.status;d.window.showInformationMessage(`Ollama Copilot: ${o.chunkCount} chunks indexed.`)}catch(o){d.window.showErrorMessage(`Re-index failed: ${o instanceof Error?o.message:String(o)}`)}})),c.subscriptions.push(d.commands.registerCommand("ollamaCopilot.pullModel",async()=>{let o=_e.map(p=>({label:p.label,description:p.category,detail:p.name})),r=await d.window.showQuickPick(o,{matchOnDescription:!0,placeHolder:"Select model to pull from Ollama registry"});if(!r?.detail)return;let l=r.detail;await vt(e,l),await d.workspace.getConfiguration("ollamaCopilot").update("model",l,d.ConfigurationTarget.Global),ne(e,l)})),d.workspace.getConfiguration("ollamaCopilot").get("ragEnabled",!0)&&d.workspace.workspaceFolders?.length&&d.window.withProgress({location:d.ProgressLocation.Window,title:"Ollama Copilot: Indexing workspace",cancellable:!1},async o=>{try{await H.indexAll((r,l)=>{o.report({message:l!=null?`Indexing... (${l} files)`:r})})}catch{}}),e.isAvailable().then(o=>{if(!o)d.window.showWarningMessage("Ollama Copilot: Ollama server not found. Install Ollama and run `ollama serve`.","Get Ollama").then(r=>{r==="Get Ollama"&&d.env.openExternal(d.Uri.parse("https://ollama.com"))});else{let r=d.workspace.getConfiguration("ollamaCopilot").get("model","");ne(e,r)}}),c.subscriptions.push(d.workspace.onDidChangeConfiguration(o=>{if(o.affectsConfiguration("ollamaCopilot.model")){let r=d.workspace.getConfiguration("ollamaCopilot").get("model","");ne(e,r),n.updateModel(r||"llama3")}}))}function ss(c){let e=d.window.activeTextEditor;if(!e||e.selection.isEmpty){d.window.showWarningMessage("Select some code first, then use this command.");return}let t=e.document.getText(e.selection);M.sendToChat(c,t),d.commands.executeCommand("ollamaCopilot.chatView.focus")}async function vt(c,e){try{await d.window.withProgress({location:d.ProgressLocation.Notification,title:`Pulling ${e}`,cancellable:!1},async t=>{await c.pullModel(e,s=>t.report({message:s}))}),d.window.showInformationMessage(`Ollama: ${e} ready!`)}catch(t){d.window.showErrorMessage(`Pull failed: ${t instanceof Error?t.message:String(t)}`)}}function ne(c,e){let t=e||d.workspace.getConfiguration("ollamaCopilot").get("model","");G.text=t?`$(sparkle) Ollama: ${t}`:"$(sparkle) Ollama",G.tooltip="Ollama Copilot \u2014 click to open chat"}function ns(){}0&&(module.exports={activate,deactivate});
