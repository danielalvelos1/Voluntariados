document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    if(email) {
        // Simulação simples de login
        alert('Login efetuado com sucesso!');
        window.location.href = 'dashboard.html';
    }
});