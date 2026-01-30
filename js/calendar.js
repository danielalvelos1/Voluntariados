// Lightweight calendar helper for projetos.html
// Fills inputs with class 'calendario-input' and provides marcarTurno()

document.addEventListener('DOMContentLoaded', () => {
    // If there are no datetime inputs, nothing else to do
    const inputs = document.querySelectorAll('.calendario-input');
    if (!inputs.length) return;

    // For each input, set a sensible default (next full hour)
    inputs.forEach(input => {
        if (!input.value) {
            const now = new Date();
            now.setMinutes(0, 0, 0);
            now.setHours(now.getHours() + 1);
            // format to yyyy-MM-ddThh:mm
            const pad = n => n.toString().padStart(2, '0');
            const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            input.value = local;
        }

        // Optional: prevent past dates being selected
        const minDate = new Date();
        minDate.setMinutes(0,0,0);
        const pad = n => n.toString().padStart(2, '0');
        input.min = `${minDate.getFullYear()}-${pad(minDate.getMonth()+1)}-${pad(minDate.getDate())}T${pad(minDate.getHours())}:${pad(minDate.getMinutes())}`;
    });
});

function marcarTurno(nomeProjeto, dataEscolhida) {
    // If a date string was not provided, try to find an inline input first,
    // then fall back to any `.calendario-input` on the page.
    let chosen = dataEscolhida && dataEscolhida.trim() ? dataEscolhida : '';

    if (!chosen) {
        const inline = document.querySelector('.calendario-input-inline');
        if (inline && inline.value) chosen = inline.value;
    }

    if (!chosen) {
        const inputs = document.querySelectorAll('.calendario-input');
        inputs.forEach(input => {
            if (!chosen && input.value) chosen = input.value;
        });
    }

    if (!chosen) {
        alert("Por favor, selecione um horário primeiro.");
        return;
    }

    const selected = new Date(chosen);
    if (isNaN(selected.getTime())) {
        alert('Formato de data/hora inválido.');
        return;
    }

    alert(`Confirmado! Estás inscrito no projeto: ${nomeProjeto} para o dia ${selected.toLocaleString()}`);
    // Redirect to dashboard after confirmation
    window.location.href = 'dashboard.html';
}

// Expose function to global scope (in case module wrappers are used)
window.marcarTurno = marcarTurno;