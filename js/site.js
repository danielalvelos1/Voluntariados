/* Shared JS helpers: auth dropdown, role handling, logout */
(function(){
  function hideDashboardUnlessOrg(){
    try{
      const role = localStorage.getItem('userRole');
      // only show dashboard link when userRole is 'organization'
      if(role !== 'organization'){
        document.querySelectorAll('a[href="dashboard.html"]').forEach(a=>{
          const li = a.closest('li'); if(li) li.style.display='none'; else a.style.display='none';
        });
      }
    }catch(e){/* ignore */}
  }

  function setupAuthToggle(){
    const toggle = document.getElementById('authToggle');
    const menu = document.getElementById('authMenu');
    if(!toggle || !menu) return;
    // ensure menu starts hidden
    if (!menu.style.display) menu.style.display = 'none';

    // toggle menu on button click
    toggle.addEventListener('click', function(e){
      e.stopPropagation();
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.style.display = expanded ? 'none' : 'block';
    });

    // close when clicking outside
    document.addEventListener('click', function(e){
      if (!menu.contains(e.target) && !toggle.contains(e.target)){
        menu.style.display = 'none';
        toggle.setAttribute('aria-expanded','false');
      }
    });

    // close with Escape
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ menu.style.display='none'; toggle.setAttribute('aria-expanded','false'); }});
  }

  function logout(){
    try{ localStorage.removeItem('userName'); localStorage.removeItem('userRole'); }catch(e){}
    window.location.href = 'index.html';
  }

  function updateMessageBadge(){
    try{
      const role = localStorage.getItem('userRole');
      const raw = localStorage.getItem('app_messages');
      if(!raw) return setBadge(0);
      const msgs = JSON.parse(raw);
      const count = msgs.filter(m => !m.deleted && m.senderRole !== role).length;
      setBadge(count);
    }catch(e){ setBadge(0); }
  }

  function setBadge(n){
    document.querySelectorAll('.msg-badge').forEach(el=>{
      if(!n) el.style.display='none'; else { el.style.display='inline-block'; el.textContent = n>99? '99+': String(n); }
    });
  }

  window.siteHelpers = { hideDashboardUnlessOrg, setupAuthToggle, logout, updateMessageBadge };

  document.addEventListener('DOMContentLoaded', function(){
    hideDashboardUnlessOrg();
    setupAuthToggle();
    updateMessageBadge();
    // attach logout handlers on any element with class .logout-btn
    document.querySelectorAll('.logout-btn, .logout-icon').forEach(btn=>{
      btn.addEventListener('click', function(e){ e.preventDefault(); logout(); });
    });
  });

})();
