// Simple client-side messaging system (localStorage)
// Data model:
// conversations: [{id, title, participants:[names], lastTimestamp}]
// messages: [{id, convoId, senderRole, senderName, text, ts, favorite, deleted}]

(function(){
    const LS_CONV = 'app_conversations';
    const LS_MSGS = 'app_messages';

    function uid(prefix='id'){return prefix + '_' + Date.now() + '_' + Math.floor(Math.random()*1000)}

    function readJSON(k){ try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(e){ return []; } }
    function writeJSON(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

    function getConvos(){ return readJSON(LS_CONV); }
    function getMsgs(){ return readJSON(LS_MSGS); }

    function saveConvos(c){ writeJSON(LS_CONV,c); }
    function saveMsgs(m){ writeJSON(LS_MSGS,m); }

    function renderConvoList(){
        const list = document.getElementById('convoList');
        if(!list) return;
        const convos = getConvos();
        list.innerHTML = '';
        convos.forEach(c => {
            const msgs = getMsgs().filter(m=>m.convoId===c.id && !m.deleted);
            const last = msgs.sort((a,b)=>b.ts-a.ts)[0];
            const snippet = last ? (last.text.length>64? last.text.slice(0,64)+'...': last.text) : '';
            const unread = msgs.filter(m=>!m.read && !isMe(m)).length;

            const el = document.createElement('div');
            el.className = 'convo-item';
            el.dataset.id = c.id;
            el.innerHTML = `
                <div class="convo-avatar">${escapeHtml((c.title||'?').slice(0,2).toUpperCase())}</div>
                <div class="convo-body">
                    <div class="convo-title">${escapeHtml(c.title)}</div>
                    <div class="convo-snippet">${escapeHtml(snippet)}</div>
                </div>
                <div class="convo-right">
                    <div class="convo-time">${last? new Date(last.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}</div>
                    ${unread? `<div class="unread-count">${unread}</div>` : ''}
                </div>`;
            el.onclick = ()=> openConvo(c.id);
            list.appendChild(el);
        });
    }

    function openConvo(id){
        const convos = getConvos();
        const convo = convos.find(x=>x.id===id);
        const panel = document.getElementById('messagesPanel');
        if(!convo || !panel) return;
        // mark active
        document.querySelectorAll('.convo-item').forEach(i=>i.classList.remove('active'));
        const node = document.querySelector(`.convo-item[data-id="${id}"]`);
        if(node) node.classList.add('active');

        // render messages
        const msgs = getMsgs().filter(m=>m.convoId===id && !m.deleted).sort((a,b)=>a.ts-b.ts);
        const win = document.getElementById('messagesWindow');
        win.innerHTML = '';
        msgs.forEach(m=>{
            const msg = document.createElement('div');
            msg.className = 'message' + (isMe(m)?' me':'');
            const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${m.senderName} • ${new Date(m.ts).toLocaleString()}`;
            const body = document.createElement('div'); body.className='body'; body.textContent = m.text;
            const actions = document.createElement('div'); actions.className='message-actions';
            const fav = document.createElement('button'); fav.className='fav-btn'; fav.title='Favoritar'; fav.innerHTML = m.favorite? '★':'☆';
            fav.onclick = ()=>{ toggleFavorite(m.id); openConvo(id); };
            const del = document.createElement('button'); del.className='del-btn'; del.title='Apagar'; del.textContent='🗑️';
            del.onclick = ()=>{ deleteMessage(m.id); openConvo(id); };
            actions.appendChild(fav); actions.appendChild(del);
            msg.appendChild(meta); msg.appendChild(body); msg.appendChild(actions);
            win.appendChild(msg);
        });
        // set current convo id on send area
        const sendBtn = document.getElementById('sendBtn');
        if(sendBtn) sendBtn.dataset.convo = id;
        // scroll to bottom
        win.scrollTop = win.scrollHeight;

        // mark messages as read for this convo (messages not sent by me)
        const msgs = getMsgs();
        let changed = false;
        msgs.forEach(m=>{
            if(m.convoId===id && !m.read && !isMe(m) && !m.deleted){ m.read = true; changed = true; }
        });
        if(changed){ saveMsgs(msgs); if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge==='function') window.siteHelpers.updateMessageBadge(); }
    }

    function isMe(msg){
        const role = localStorage.getItem('userRole') || '';
        return msg.senderRole === role;
    }

    function toggleFavorite(msgId){
        const msgs = getMsgs();
        const m = msgs.find(x=>x.id===msgId); if(!m) return;
        m.favorite = !m.favorite; saveMsgs(msgs);
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    function deleteMessage(msgId){
        const msgs = getMsgs();
        const m = msgs.find(x=>x.id===msgId); if(!m) return;
        // soft delete
        m.deleted = true; saveMsgs(msgs);
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    function sendMessage(convoId, text){
        if(!text || !text.trim()) return alert('Escreva uma mensagem.');
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName') || (role==='organization' ? 'Org' : 'Voluntário');
        if(!role) return alert('Inicie sessão para enviar mensagens.');
        const msgs = getMsgs();
        const m = { id: uid('m'), convoId, senderRole: role, senderName: name, text: text.trim(), ts: Date.now(), favorite:false, deleted:false };
        msgs.push(m); saveMsgs(msgs);
        // update convo lastTimestamp
        const convos = getConvos();
        const c = convos.find(x=>x.id===convoId);
        if(c){ c.lastTimestamp = Date.now(); saveConvos(convos); }
        renderConvoList();
        openConvo(convoId);
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    function createConvo(title, participants){
        const convos = getConvos();
        const c = { id: uid('c'), title: title || ('Conversa ' + (convos.length+1)), participants: participants || [], lastTimestamp: Date.now() };
        convos.unshift(c); saveConvos(convos); renderConvoList(); openConvo(c.id);
    }

    function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

    // UI bindings
    document.addEventListener('DOMContentLoaded', function(){
        const list = document.getElementById('convoList');
        if(!list) return;
        renderConvoList();

        document.getElementById('newConvoBtn').onclick = function(e){
            showOrgChooser(e.currentTarget);
        };

        function showOrgChooser(button){
            // remove existing chooser
            document.querySelectorAll('.convo-chooser-panel').forEach(n=>n.remove());
            const panel = document.createElement('div'); panel.className='convo-chooser-panel';

            // gather organizations from localStorage (fallbacks)
            let orgs = [];
            try{
                const od = JSON.parse(localStorage.getItem('orgData')||'null');
                if(od){ if(Array.isArray(od)) orgs = orgs.concat(od); else if(od.name) orgs.push(od); else if(typeof od === 'string') orgs.push({name:od}); }
            }catch(e){}
            try{ const many = JSON.parse(localStorage.getItem('organizations')||'[]'); if(Array.isArray(many)) orgs = orgs.concat(many); }catch(e){}
            // fallback demo list
            if(orgs.length===0){ orgs = [{name:'Organização Exemplo'},{name:'Abrigo Animal'},{name:'Centro Educativo'}]; }

            const ul = document.createElement('ul');
            orgs.forEach(o=>{
                const name = (o && (o.name || o.orgName || o.title)) || String(o);
                const li = document.createElement('li'); li.textContent = name;
                li.onclick = function(){ createConvo(name, [name]); panel.remove(); };
                ul.appendChild(li);
            });
            // other input
            const other = document.createElement('div'); other.className='other';
            const input = document.createElement('input'); input.placeholder='Outra organização';
            const add = document.createElement('button'); add.textContent='Criar';
            add.onclick = function(){ const v = input.value && input.value.trim(); if(!v) return; createConvo(v,[v]); panel.remove(); };
            other.appendChild(input); other.appendChild(add);

            panel.appendChild(ul); panel.appendChild(other);

            // position near button
            const wrapper = button.closest('.convo-search') || document.body;
            wrapper.appendChild(panel);

            // close on outside click
            function onDoc(e){ if(!panel.contains(e.target) && e.target !== button){ panel.remove(); document.removeEventListener('click',onDoc); } }
            setTimeout(()=>document.addEventListener('click', onDoc), 10);
            input.focus();
        }

        const send = document.getElementById('sendBtn');
        if(send){
            send.onclick = function(){
                const txt = document.getElementById('msgInput').value;
                const convoId = send.dataset.convo;
                if(!convoId) return alert('Selecione uma conversa.');
                sendMessage(convoId, txt);
                document.getElementById('msgInput').value = '';
            };
        }

        // preload demo convo if none
        if(getConvos().length===0){ createConvo('Organização Exemplo', ['Organização Exemplo']);
            // add sample message
            const msgs = getMsgs(); msgs.push({id:uid('m'), convoId: getConvos()[0].id, senderRole:'organization', senderName:'Org Exemplo', text:'Olá! Bem-vindo — como podemos ajudar?', ts:Date.now()-60000, favorite:false, deleted:false}); saveMsgs(msgs);
            renderConvoList(); openConvo(getConvos()[0].id);
        } else {
            // open first convo
            const c = getConvos()[0]; if(c) openConvo(c.id);
        }
    });

    // Expose some functions for console/debug
    window._msgs = { getConvos, getMsgs, createConvo, sendMessage, deleteMessage, toggleFavorite };
})();
