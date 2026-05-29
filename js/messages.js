// Messaging system with Firebase Firestore storage and local fallback
// Data model:
// conversations: [{id, title, participants:[names], lastTimestamp}]
// messages: [{id, convoId, senderRole, senderName, text, ts, favorite, deleted, read}]

(function(){
    const LS_CONV = 'app_conversations';
    const LS_MSGS = 'app_messages';
    const firebaseEnabled = !!window.firebaseEnabled && !!window.firebaseDb;

    function uid(prefix='id'){ return prefix + '_' + Date.now() + '_' + Math.floor(Math.random()*1000); }

    function readJSON(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return []; } }
    function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

    function getConvosLocal(){ return readJSON(LS_CONV); }
    function getMsgsLocal(){ return readJSON(LS_MSGS); }
    function saveConvosLocal(convos){ writeJSON(LS_CONV, convos); }
    function saveMsgsLocal(msgs){ writeJSON(LS_MSGS, msgs); }

    async function cloudGetConvos(){
        if(!firebaseEnabled) return [];
        try{
            const snapshot = await window.firebaseDb.collection('conversations').orderBy('lastTimestamp','desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }catch(e){ console.warn('cloudGetConvos error', e); return []; }
    }

    async function cloudGetMsgs(convoId){
        if(!firebaseEnabled) return [];
        try{
            const snapshot = await window.firebaseDb.collection('messages').where('convoId','==', convoId).orderBy('ts','asc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }catch(e){ console.warn('cloudGetMsgs error', e); return []; }
    }

    async function cloudGetAllMsgs(){
        if(!firebaseEnabled) return [];
        try{
            const snapshot = await window.firebaseDb.collection('messages').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }catch(e){ console.warn('cloudGetAllMsgs error', e); return []; }
    }

    async function cloudSaveConvo(convo){
        if(!firebaseEnabled) return;
        try{ await window.firebaseDb.collection('conversations').doc(convo.id).set(convo, { merge:true }); }catch(e){ console.warn('cloudSaveConvo error', e); }
    }

    async function cloudSaveMsg(msg){
        if(!firebaseEnabled) return;
        try{ await window.firebaseDb.collection('messages').doc(msg.id).set(msg); }catch(e){ console.warn('cloudSaveMsg error', e); }
    }

    async function cloudUpdateMsg(msgId, data){
        if(!firebaseEnabled) return;
        try{ await window.firebaseDb.collection('messages').doc(msgId).update(data); }catch(e){ console.warn('cloudUpdateMsg error', e); }
    }

    async function cloudMarkRead(convoId){
        if(!firebaseEnabled) return;
        try{
            const role = localStorage.getItem('userRole');
            const snapshot = await window.firebaseDb.collection('messages').where('convoId','==', convoId).where('read','==', false).get();
            if(snapshot.empty) return;
            const batch = window.firebaseDb.batch();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if(data.senderRole !== role){ batch.update(doc.ref, { read:true }); }
            });
            await batch.commit();
        }catch(e){ console.warn('cloudMarkRead error', e); }
    }

    async function getConvos(){ return firebaseEnabled ? await cloudGetConvos() : getConvosLocal(); }
    async function getMsgs(convoId){ return firebaseEnabled ? await cloudGetMsgs(convoId) : getMsgsLocal().filter(m=>m.convoId===convoId); }
    async function getAllMsgs(){ return firebaseEnabled ? await cloudGetAllMsgs() : getMsgsLocal(); }

    function saveConvos(convos){ saveConvosLocal(convos); if(firebaseEnabled){ convos.forEach(cloudSaveConvo); } }
    function saveMsgs(msgs){ saveMsgsLocal(msgs); if(firebaseEnabled){ msgs.forEach(cloudSaveMsg); } }

    async function renderConvoList(filterText){
        const list = document.getElementById('convoList');
        if(!list) return;
        const convos = (await getConvos()).slice().sort((a,b)=> (b.lastTimestamp||0) - (a.lastTimestamp||0));
        const allMessages = await getAllMsgs();
        list.innerHTML = '';
        const filter = (filterText || '').trim().toLowerCase();
        const visible = convos.filter(c => {
            if(!filter) return true;
            const title = (c.title || '').toLowerCase();
            const participants = (c.participants || []).join(' ').toLowerCase();
            return title.includes(filter) || participants.includes(filter);
        });

        visible.forEach(c => {
            const msgs = allMessages.filter(m=>m.convoId===c.id && !m.deleted);
            const last = msgs.slice().sort((a,b)=>b.ts-a.ts)[0];
            const snippet = last ? (last.text.length > 64 ? last.text.slice(0,64) + '...' : last.text) : 'Inicie a conversa com uma mensagem.';
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
                    <div class="convo-time">${last ? new Date(last.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</div>
                    ${unread ? `<div class="unread-count">${unread}</div>` : ''}
                </div>`;
            el.onclick = ()=> openConvo(c.id);
            list.appendChild(el);
        });

        if(!list.childNodes.length){
            const empty = document.createElement('div');
            empty.className = 'convo-empty';
            empty.textContent = 'Nenhuma conversa encontrada.';
            list.appendChild(empty);
        }
    }

    async function openConvo(id){
        const convos = await getConvos();
        const convo = convos.find(x=>x.id===id);
        const panel = document.getElementById('messagesPanel');
        if(!convo || !panel) return;
        document.querySelectorAll('.convo-item').forEach(i=>i.classList.remove('active'));
        const node = document.querySelector(`.convo-item[data-id="${id}"]`);
        if(node) node.classList.add('active');

        const favEnabled = (document.getElementById('favListBtn')||{}).dataset?.enabled === '1';
        const msgs = (await getMsgs(id)).filter(m=>!m.deleted).sort((a,b)=>a.ts-b.ts);
        renderMessages(id, favEnabled ? msgs.filter(m=>m.favorite) : msgs);

        const avatar = document.getElementById('panelAvatar');
        const title = document.getElementById('panelTitle');
        const sub = document.getElementById('panelSub');
        if(avatar) avatar.textContent = (convo.title || '?').slice(0,2).toUpperCase();
        if(title) title.textContent = convo.title || 'Conversa';
        if(sub) sub.textContent = (convo.participants && convo.participants.length)
            ? `Com ${convo.participants.join(', ')}`
            : 'Conversa ativa';
        const sendBtn = document.getElementById('sendBtn');
        if(sendBtn){ sendBtn.dataset.convo = id; sendBtn.disabled = false; }

        if(!firebaseEnabled){
            const msgsAll = getMsgsLocal();
            let changed = false;
            msgsAll.forEach(m=>{
                if(m.convoId===id && !m.read && !isMe(m) && !m.deleted){ m.read = true; changed = true; }
            });
            if(changed){ saveMsgsLocal(msgsAll); if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge==='function') window.siteHelpers.updateMessageBadge(); }
        } else {
            await cloudMarkRead(id);
            if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge==='function') window.siteHelpers.updateMessageBadge();
        }
    }

    function isMe(msg){
        const role = localStorage.getItem('userRole') || '';
        return msg.senderRole === role;
    }

    async function toggleFavorite(msgId){
        const msgsLocal = getMsgsLocal();
        const m = msgsLocal.find(x=>x.id===msgId);
        if(!m) return;
        m.favorite = !m.favorite;
        saveMsgsLocal(msgsLocal);
        if(firebaseEnabled){ await cloudUpdateMsg(msgId, { favorite:m.favorite }); }
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    async function deleteMessage(msgId){
        if(firebaseEnabled){ await cloudUpdateMsg(msgId, { deleted:true }); }
        const msgsLocal = getMsgsLocal();
        const m = msgsLocal.find(x=>x.id===msgId);
        if(m){ m.deleted = true; saveMsgsLocal(msgsLocal); }
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    async function sendMessage(convoId, text){
        if(!text || !text.trim()){
            if(window.siteHelpers && typeof window.siteHelpers.showToast === 'function') return window.siteHelpers.showToast('Escreva uma mensagem.', {kind:'error'});
            return alert('Escreva uma mensagem.');
        }
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName') || (role==='organization' ? 'Org' : 'Voluntário');
        if(!role){
            if(window.siteHelpers && typeof window.siteHelpers.showToast === 'function') return window.siteHelpers.showToast('Inicie sessão para enviar mensagens.', {kind:'error'});
            return alert('Inicie sessão para enviar mensagens.');
        }
        const msgsLocal = getMsgsLocal();
        const m = { id: uid('m'), convoId, senderRole: role, senderName: name, text: text.trim(), ts: Date.now(), favorite:false, deleted:false, read:true };
        msgsLocal.push(m);
        saveMsgsLocal(msgsLocal);
        if(firebaseEnabled){ await cloudSaveMsg(m); }

        const convosLocal = getConvosLocal();
        const c = convosLocal.find(x=>x.id===convoId);
        if(c){ c.lastTimestamp = Date.now(); saveConvosLocal(convosLocal); if(firebaseEnabled){ await cloudSaveConvo(c); } }

        await renderConvoList();
        await openConvo(convoId);
        if(window.siteHelpers && typeof window.siteHelpers.showToast === 'function') window.siteHelpers.showToast('Mensagem enviada', {duration:1200});
        if(window.siteHelpers && typeof window.siteHelpers.updateMessageBadge === 'function') window.siteHelpers.updateMessageBadge();
    }

    async function createConvo(title, participants){
        const convosLocal = getConvosLocal();
        const participantsList = Array.isArray(participants) ? participants : [participants];
        const c = { id: uid('c'), title: title || ('Conversa ' + (convosLocal.length+1)), participants: participantsList, lastTimestamp: Date.now() };
        convosLocal.unshift(c);
        saveConvosLocal(convosLocal);
        if(firebaseEnabled){ await cloudSaveConvo(c); }
        await renderConvoList();
        await openConvo(c.id);
    }

    async function setFavoritesMode(enabled){
        const btn = document.getElementById('favListBtn');
        if(btn){ btn.dataset.enabled = enabled ? '1' : '0'; btn.classList.toggle('active', enabled); }
        const convoId = (document.getElementById('sendBtn')||{}).dataset?.convo;
        if(convoId){
            const msgs = (await getMsgs(convoId)).filter(m=>!m.deleted).sort((a,b)=>a.ts-b.ts);
            const filtered = enabled ? msgs.filter(m=>m.favorite) : msgs;
            renderMessages(convoId, filtered);
        }
    }

    async function renderMessages(convoId, msgs){
        const win = document.getElementById('messagesWindow');
        if(!win) return;
        win.innerHTML = '';
        msgs.forEach(m=>{
            const msg = document.createElement('div');
            msg.className = 'message' + (isMe(m)?' me':'');
            const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${m.senderName} • ${new Date(m.ts).toLocaleString()}`;
            const body = document.createElement('div'); body.className='body'; body.textContent = m.text;
            const actions = document.createElement('div'); actions.className='message-actions';
            const fav = document.createElement('button'); fav.className='fav-btn'; fav.title='Favoritar'; fav.innerHTML = m.favorite? '★':'☆';
            fav.onclick = async ()=>{ await toggleFavorite(m.id); await refreshConvo(convoId); };
            const del = document.createElement('button'); del.className='del-btn'; del.title='Apagar'; del.textContent='🗑';
            del.onclick = async ()=>{ await deleteMessage(m.id); await refreshConvo(convoId); };
            actions.appendChild(fav); actions.appendChild(del);
            msg.appendChild(meta); msg.appendChild(body); msg.appendChild(actions);
            win.appendChild(msg);
        });
        win.scrollTop = win.scrollHeight;
    }

    async function refreshConvo(convoId){
        const favEnabled = (document.getElementById('favListBtn')||{}).dataset?.enabled === '1';
        const msgs = (await getMsgs(convoId)).filter(m=>!m.deleted).sort((a,b)=>a.ts-b.ts);
        renderMessages(convoId, favEnabled ? msgs.filter(m=>m.favorite) : msgs);
    }

    function escapeHtml(s){ return (s+'').replace(/[&<>'\"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

    document.addEventListener('DOMContentLoaded', async function(){
        const list = document.getElementById('convoList');
        if(!list) return;
        await renderConvoList();

        document.getElementById('newConvoBtn').onclick = async function(e){ await showOrgChooser(e.currentTarget); };

        function showOrgChooser(button){
            document.querySelectorAll('.convo-chooser-panel').forEach(n=>n.remove());
            const panel = document.createElement('div'); panel.className='convo-chooser-panel';

            let orgs = [];
            try{
                const od = JSON.parse(localStorage.getItem('orgData')||'null');
                if(od){ if(Array.isArray(od)) orgs = orgs.concat(od); else if(od.name) orgs.push(od); else if(typeof od === 'string') orgs.push({name:od}); }
            }catch(e){}
            try{ const many = JSON.parse(localStorage.getItem('organizations')||'[]'); if(Array.isArray(many)) orgs = orgs.concat(many); }catch(e){}
            if(orgs.length===0){ orgs = [{name:'Organização Exemplo'},{name:'Abrigo Animal'},{name:'Centro Educativo'}]; }

            const ul = document.createElement('ul');
            orgs.forEach(o=>{
                const name = (o && (o.name || o.orgName || o.title)) || String(o);
                const li = document.createElement('li'); li.textContent = name;
                li.onclick = async function(){ await createConvo(name, [name]); panel.remove(); };
                ul.appendChild(li);
            });

            const other = document.createElement('div'); other.className='other';
            const input = document.createElement('input'); input.placeholder='Outra organização';
            const add = document.createElement('button'); add.textContent='Criar';
            add.onclick = async function(){ const v = input.value && input.value.trim(); if(!v) return; await createConvo(v,[v]); panel.remove(); };
            other.appendChild(input); other.appendChild(add);

            panel.appendChild(ul); panel.appendChild(other);
            const wrapper = button.closest('.convo-search') || document.body;
            wrapper.appendChild(panel);
            function onDoc(e){ if(!panel.contains(e.target) && e.target !== button){ panel.remove(); document.removeEventListener('click',onDoc); } }
            setTimeout(()=>document.addEventListener('click', onDoc), 10);
            input.focus();
        }

        const send = document.getElementById('sendBtn');
        const msgInput = document.getElementById('msgInput');
        if(send){
            send.onclick = async function(){
                const txt = msgInput.value;
                const convoId = send.dataset.convo;
                if(!convoId){
                    if(window.siteHelpers && typeof window.siteHelpers.showToast === 'function') return window.siteHelpers.showToast('Selecione uma conversa.', {kind:'error'});
                    return alert('Selecione uma conversa.');
                }
                await sendMessage(convoId, txt);
                msgInput.value = '';
                msgInput.focus();
            };
        }

        if(msgInput){
            msgInput.addEventListener('keydown', function(e){
                if(e.key === 'Enter' && !e.shiftKey){
                    e.preventDefault();
                    if(send && !send.disabled) send.click();
                }
            });
        }

        const favBtn = document.getElementById('favListBtn');
        if(favBtn){
            favBtn.onclick = async function(){
                const enabled = favBtn.dataset.enabled === '1';
                await setFavoritesMode(!enabled);
            };
        }

        const search = document.getElementById('convoSearch');
        if(search){
            search.addEventListener('input', async function(){ await renderConvoList(search.value); });
        }

        const convos = await getConvos();
        if(convos.length === 0){
            const initialConvos = [
                { id: uid('c'), title: 'Organização Exemplo', participants: ['Organização Exemplo'], lastTimestamp: Date.now() - 60000 },
                { id: uid('c'), title: 'Abrigo Animal', participants: ['Abrigo Animal'], lastTimestamp: Date.now() - 180000 }
            ];
            saveConvosLocal(initialConvos);
            if(firebaseEnabled){ initialConvos.forEach(cloudSaveConvo); }
            const msgs = [
                { id: uid('m'), convoId: initialConvos[0].id, senderRole: 'organization', senderName: 'Org Exemplo', text: 'Olá! Bem-vindo — como podemos ajudar? Tem disponibilidade para a reunião de voluntariado desta semana?', ts: Date.now() - 54000, favorite:false, deleted:false, read:false },
                { id: uid('m'), convoId: initialConvos[1].id, senderRole: 'organization', senderName: 'Abrigo Animal', text: 'Estamos a organizar uma campanha de adoção. Pode ajudar a coordenar ações no próximo sábado?', ts: Date.now() - 175000, favorite:false, deleted:false, read:false }
            ];
            saveMsgsLocal(msgs);
            if(firebaseEnabled){ msgs.forEach(cloudSaveMsg); }
            await renderConvoList();
            await openConvo(initialConvos[0].id);
        } else {
            await openConvo(convos[0].id);
        }
    });

    window._msgs = { getConvos, getMsgs, createConvo, sendMessage, deleteMessage, toggleFavorite };
})();
