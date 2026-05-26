function mostrarTela(id){

    document.querySelectorAll(".tela").forEach(t => {
        t.classList.remove("ativa");
    });

    document.getElementById(id).classList.add("ativa");
}

function abrirCadastro(){
    mostrarTela("cadastro");
}

function abrirLogin(){
    mostrarTela("login");
}

function abrirHome(){
    mostrarTela("home");
}

function voltarHome(){
    mostrarTela("home");
}

/* CADASTRO */

async function cadastrar(){

    const dados = {
        email: document.getElementById("email_cad").value,
        senha: document.getElementById("senha_cad").value,
        nome: document.getElementById("nome_cad").value,
        idade: Number(document.getElementById("idade_cad").value)
    };

    const resposta = await fetch("https://focovest-backend.onrender.com/cadastro", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

    console.log("STATUS:", resposta.status);

    const text = await resposta.text();
    console.log("RESPOSTA BRUTA:", text);

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        alert("Backend não retornou JSON válido");
        return;
    }

    if (json.msg === "Usuário cadastrado"){
        alert(json.msg);
        abrirLogin();
    } else {
        alert(json.msg || "Erro no cadastro");
    }
}

/* LOGIN */

async function entrar(){

    const dados = {

        email: document.getElementById("email_log").value,

        senha: document.getElementById("senha_log").value
    };

    const resposta = await fetch("https://focovest-backend.onrender.com/login", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    const json = await resposta.json();

    if(json.success){
        abrirBemVindo()

    }else{

        alert(json.msg);
    }
}

// ==================== FUNÇÕES DA NOVA TELA ====================

function abrirBemVindo() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('bemvindo').classList.add('ativa');
}

// Clique nos 6 botões
document.addEventListener('DOMContentLoaded', () => {
    const cardButtons = document.querySelectorAll('.card-btn');
    
    cardButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            
            switch(action) {
                case 'aulas':
                    alert('📚 Abrindo Aulas...');
                    break;
                case 'rotina':
                    alert('📅 Criando sua Rotina de Estudos...');
                    break;
                case 'inscricoes':
                    alert('📝 Abrindo Inscrições...');
                    break;
                case 'simulador':
                    alert('📊 Abrindo Simulador de Notas...');
                    break;
                case 'provas':
                    alert('🚌 Consultando locais de prova...');
                    break;
                case 'rota':
                    alert('🗺️ Calculando rota de prova...');
                    break;
            }
        });
    });
});

function abrirAulas() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('aulas').classList.add('ativa');
}

function abrirMinhaRotina() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('minha-rotina').classList.add('ativa');
}

// ===================== MINHA ROTINA =====================

// Troca de abas
function setupRotinaTabs() {
    const buttons = document.querySelectorAll('#minha-rotina .tab-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');

            document.querySelectorAll('#minha-rotina .tab-content').forEach(content => {
                content.classList.remove('ativa');
            });

            const tab = btn.getAttribute('data-tab');
            document.getElementById('tab-' + tab).classList.add('ativa');
        });
    });
}

// Calendário
let currentDate = new Date(2026, 4, 1);

function renderCalendar() {
    const monthYear = document.getElementById('month-year');
    const calendarBody = document.getElementById('calendar-body');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    calendarBody.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let date = 1;
    let prevMonthDate = daysInPrevMonth - firstDay + 1;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');

            if (i === 0 && j < firstDay) {
                cell.textContent = prevMonthDate++;
                cell.classList.add('other-month');
            } else if (date > daysInMonth) {
                cell.textContent = date - daysInMonth;
                cell.classList.add('other-month');
                date++;
            } else {
                cell.textContent = date;
                if (date === 9) cell.classList.add('today');
                date++;
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
}

// Navegação do calendário
function setupCalendar() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
}

// Salvar Anotação
function salvarAnotacao() {
    const titulo = document.getElementById('anotacao-titulo').value;
    const texto = document.getElementById('anotacao-texto').value;
    
    if (!titulo || !texto) {
        alert("Preencha título e texto!");
        return;
    }

    const lista = document.getElementById('lista-anotacoes');
    const card = document.createElement('div');
    card.className = 'anotacao-card';
    card.innerHTML = `
        <h4>${titulo}</h4>
        <p>${texto}</p>
        <small>${new Date().toLocaleDateString('pt-BR')}</small>
    `;
    lista.appendChild(card);

    // Limpa os campos
    document.getElementById('anotacao-titulo').value = '';
    document.getElementById('anotacao-texto').value = '';
}

// Inicializa tudo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    setupRotinaTabs();
    setupCalendar();
});