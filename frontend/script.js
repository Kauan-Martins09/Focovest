function mostrarTela(id){
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    document.getElementById(id).classList.add("ativa");
}

function abrirCadastro(){ mostrarTela("cadastro"); }
function abrirLogin(){ mostrarTela("login"); }
function abrirHome(){ mostrarTela("home"); }
function voltarHome(){ mostrarTela("home"); }

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados )
    });
    const json = await resposta.json();
    if (json.msg === "usuario cadastrado"){
        alert("Usuário cadastrado com sucesso!");
        abrirLogin();
    } else { alert(json.msg || "Erro no cadastro"); }
}

/* LOGIN */
async function entrar(){
    const dados = {
        email: document.getElementById("email_log").value,
        senha: document.getElementById("senha_log").value
    };
    const resposta = await fetch("https://focovest-backend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados )
    });
    const json = await resposta.json();
    if(json.success){ abrirBemVindo(); } else { alert(json.msg); }
}

function abrirBemVindo() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('bemvindo').classList.add('ativa');
}

function abrirMinhaRotina() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('minha-rotina').classList.add('ativa');
}

function abrirAulas() {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById('aulas').classList.add('ativa');
}

// ===================== MINHA ROTINA =====================

function setupRotinaTabs() {
    const buttons = document.querySelectorAll('#minha-rotina .tab-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');
            document.querySelectorAll('#minha-rotina .tab-content').forEach(c => c.classList.remove('ativa'));
            document.getElementById('tab-' + btn.getAttribute('data-tab')).classList.add('ativa');
        });
    });
}

// ===================== CALENDÁRIO =====================

let currentDate = new Date(); // Começa no mês atual
let selectedDate = new Date(); // Começa no dia atual
let compromissos = {};

function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${ano}-${mes}-${dia}`;
}

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
                // Preenche o final do calendário com dias do próximo mês
            } else {
                cell.textContent = date;
                
                const hoje = new Date();
                if (date === hoje.getDate() && month === hoje.getMonth() && year === hoje.getFullYear()) {
                    cell.classList.add('today');
                }
                
                if (date === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
                    cell.classList.add('selected');
                }
                
                const d = date;
                cell.addEventListener('click', () => {
                    selectedDate = new Date(year, month, d);
                    renderCalendar();
                    atualizarCompromissos();
                });
                
                date++;
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
        if (date > daysInMonth) break;
    }
}

function atualizarCompromissos() {
    const dataFormatada = formatarData(selectedDate);
    const h3 = document.querySelector('.side-panel h3');
    h3.textContent = `Compromissos - ${selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`;
    
    const tarefasList = document.querySelector('.tarefas-list');
    tarefasList.innerHTML = '';
    
    if (compromissos[dataFormatada] && compromissos[dataFormatada].length > 0) {
        compromissos[dataFormatada].forEach((tarefa) => {
            const div = document.createElement('div');
            div.className = 'tarefa-item';
            div.innerHTML = `
                <input type="checkbox" ${tarefa.concluida ? 'checked' : ''}>
                <span>${tarefa.titulo}</span>
                <span class="tag ${tarefa.prioridade}">${tarefa.prioridade === 'importante' ? 'Importante' : 'Normal'}</span>
            `;
            tarefasList.appendChild(div);
        });
    } else {
        tarefasList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">Nenhum compromisso neste dia</p>';
    }
}

function adicionarCompromisso() {
    const input = document.querySelector('.add-tarefa input');
    const titulo = input.value.trim();
    
    if (!titulo) {
        alert("Digite uma tarefa!");
        return;
    }

    const dataFormatada = formatarData(selectedDate);
    
    if (!compromissos[dataFormatada]) {
        compromissos[dataFormatada] = [];
    }

    compromissos[dataFormatada].push({
        titulo: titulo,
        prioridade: 'normal',
        concluida: false
    });

    input.value = '';
    atualizarCompromissos();
}

function setupCalendar() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.querySelector('.btn-add').addEventListener('click', adicionarCompromisso);
    
    document.querySelector('.add-tarefa input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarCompromisso();
    });

    renderCalendar();
    atualizarCompromissos();
}


// ANOTAÇÕES
let anotacoes = [];
function salvarAnotacao() {
    const titulo = document.getElementById('anotacao-titulo').value;
    const texto = document.getElementById('anotacao-texto').value;
    if(!titulo || !texto) return alert("Preencha tudo!");

    anotacoes.unshift({ id: Date.now(), titulo, texto, data: new Date() });
    document.getElementById('anotacao-titulo').value = '';
    document.getElementById('anotacao-texto').value = '';
    renderAnotacoes();
}

function renderAnotacoes() {
    const lista = document.getElementById('lista-anotacoes');
    lista.innerHTML = '';
    anotacoes.forEach(a => {
        const card = document.createElement('div');
        card.className = 'anotacao-card';
        card.innerHTML = `
            <div class="anotacao-header">
                <h4>${a.titulo}</h4>
                <button class="btn-deletar" onclick="deletarAnotacao(${a.id})">×</button>
            </div>
            <p>${a.texto}</p>
            <small>${a.data.toLocaleDateString('pt-BR')}</small>
        `;
        lista.appendChild(card);
    });
}

function deletarAnotacao(id) {
    anotacoes = anotacoes.filter(a => a.id !== id);
    renderAnotacoes();
}

// Inicializa tudo quando a página carregar completamente
window.onload = () => {
    // Inicializa as abas
    if(typeof setupRotinaTabs === 'function') setupRotinaTabs();
    
    // Inicializa o calendário e os botões de navegação/adicionar
    if(typeof setupCalendar === 'function') setupCalendar();
    
    // Inicializa as anotações
    if(typeof renderAnotacoes === 'function') renderAnotacoes();
    
    // Forçar a primeira renderização do calendário
    if(typeof renderCalendar === 'function') renderCalendar();
};
