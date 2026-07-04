// ===================== NAVEGAÇÃO =====================

function mostrarTela(id){
    document.querySelectorAll(".tela").forEach(t => {
        t.classList.remove("ativa");
    });
    document.getElementById(id).classList.add("ativa");
}

function abrirCadastro(){ mostrarTela("cadastro"); }
function abrirLogin(){ mostrarTela("login"); }
function abrirHome(){ mostrarTela("home"); }
function voltarHome(){ mostrarTela("home"); }
function abrirBemVindo() { mostrarTela("bemvindo"); }
function abrirAulas() { mostrarTela("aulas"); }
function abrirMinhaRotina() { mostrarTela("minha-rotina"); }

// ===================== CADASTRO E LOGIN =====================

async function cadastrar(){
    const email = document.getElementById("email_cad").value;
    const senha = document.getElementById("senha_cad").value;
    const nome = document.getElementById("nome_cad").value;
    const idade = Number(document.getElementById("idade_cad").value);

    const dados = { email, senha, nome, idade };

    const resposta = await fetch("https://focovest-backend.onrender.com/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados )
    });

    const json = await resposta.json();
    alert(json.msg);

    if(json.msg === "Usuário cadastrado"){
        abrirLogin();
    }
}

async function entrar(){
    const email = document.getElementById("email_log").value;
    const senha = document.getElementById("senha_log").value;

    const dados = { email, senha };

    const resposta = await fetch("https://focovest-backend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados )
    });

    const json = await resposta.json();

    console.log(json);

    if(json.success){

    localStorage.setItem("usuario_id", json.usuario_id);
    localStorage.setItem("nome", json.nome);

    await carregarAnotacoes();
    await carregarCompromissos();

    abrirBemVindo();

} else {
    alert(json.msg);
}
}

// ===================== MINHA ROTINA (TABS) =====================

function setupRotinaTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativa'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('ativa'));
            
            btn.classList.add('ativa');
            const tabId = 'tab-' + btn.dataset.tab;
            document.getElementById(tabId).classList.add('ativa');
        };
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

    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay) {
                // Vazio
            } else if (date > daysInMonth) {
                // Vazio
            } else {
                cell.textContent = date;
                const d = date;
                
                // Hoje
                if (d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
                    cell.classList.add('today');
                }
                
                // Selecionado
                if (d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
                    cell.classList.add('selected');
                }
                
                cell.onclick = () => {
                    selectedDate = new Date(year, month, d);
                    renderCalendar();
                    atualizarCompromissos();
                };
                date++;
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
        if (date > daysInMonth) break;
    }
}

// ===================== COMPROMISSO =====================

async function carregarCompromissos() {
    const usuario_id = localStorage.getItem("usuario_id");
    if (!usuario_id) return;

    try {
        const resposta = await fetch(
            `https://focovest-backend.onrender.com/compromisso/${usuario_id}`
        );
        const json = await resposta.json();

        compromissos = {};
        json.forEach(c => {
            const dataFormatada = c.data; // backend já retorna "AAAA-MM-DD"
            if (!compromissos[dataFormatada]) compromissos[dataFormatada] = [];
            compromissos[dataFormatada].push({ id: c.id, titulo: c.descricao });
        });

        atualizarCompromissos();
    } catch (error) {
        console.error("Erro ao carregar compromissos:", error);
    }
}

function atualizarCompromissos() {
    const dataFormatada = formatarData(selectedDate);
    const tarefasList = document.querySelector('.tarefas-list');
    tarefasList.innerHTML = '';
    
    if (compromissos[dataFormatada]) {
        compromissos[dataFormatada].forEach(t => {
            const div = document.createElement('div');
            div.className = 'tarefa-item';
            div.innerHTML = `
                <span>${t.titulo}</span>
                <button class="btn-deletar-tarefa" onclick="deletarCompromisso(${t.id})">×</button>
            `;
            tarefasList.appendChild(div);
        });
    } else {
        tarefasList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">Nenhum compromisso</p>';
    }
}

async function adicionarCompromisso() {
    const input = document.querySelector('.add-tarefa input');
    const titulo = input.value.trim();
    if (!titulo) return;

    const usuario_id = Number(localStorage.getItem("usuario_id"));
    const dataFormatada = formatarData(selectedDate);

    const dados = {
        usuario_id: usuario_id,
        data: dataFormatada,
        descricao: titulo
    };

    try {
        const resposta = await fetch("https://focovest-backend.onrender.com/compromisso", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        const json = await resposta.json();
        console.log(json);

        input.value = '';
        await carregarCompromissos();
    } catch (error) {
        console.error("Erro ao salvar compromisso:", error);
        alert("Não foi possível conectar ao servidor.");
    }
}

async function deletarCompromisso(id) {
    if (!confirm("Tem certeza que deseja excluir este compromisso?")) return;

    try {
        const resposta = await fetch(`https://focovest-backend.onrender.com/compromisso/${id}`, {
            method: "DELETE"
        });

        if (resposta.ok) {
            await carregarCompromissos();
        } else {
            alert("Erro ao excluir o compromisso no servidor.");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Não foi possível conectar ao servidor.");
    }
}

function setupCalendar() {
    document.getElementById('prev-month').onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    };
    document.getElementById('next-month').onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    };
    document.querySelector('.btn-add').onclick = adicionarCompromisso;
    
    renderCalendar();
    carregarCompromissos();
}


// ===================== ANOTAÇÕES =====================

let anotacoes = [];

async function salvarAnotacao() {
    const titulo = document.getElementById('anotacao-titulo').value.trim();
    const texto = document.getElementById('anotacao-texto').value.trim();
    const usuario_id = Number(localStorage.getItem("usuario_id"));
    
    if (!titulo || !texto) { alert("Preencha tudo!"); return; }

    const dados = {
        usuario_id: usuario_id,
        titulo: titulo,
        conteudo: texto
    }

    const resposta = await
    fetch("https://focovest-backend.onrender.com/anotacao", {
        method: "POST",
        headers: {
            "Content-type":"application/json"
        },
        body:JSON.stringify(dados)
    });

    const json = await resposta.json();
    console.log(json);

    document.getElementById('anotacao-titulo').value = '';
    document.getElementById('anotacao-texto').value = '';

    await carregarAnotacoes();
}

async function carregarAnotacoes() {
    const usuario_id = localStorage.getItem("usuario_id");

    console.log("Carregando anotações do usuário:", usuario_id)

    const resposta = await fetch(
        `https://focovest-backend.onrender.com/anotacao/${usuario_id}`
    );

    const json = await resposta.json();

    anotacoes = json.map(a => ({
        id: a.id,
        titulo: a.titulo,
        texto: a.conteudo
    }))

    renderAnotacoes();
}

function renderAnotacoes() {
    const lista = document.getElementById('lista-anotacoes');
    
    lista.innerHTML = anotacoes.map(a => `
        <div class="anotacao-card" onclick="abrirAnotacao(${a.id})" style="cursor: pointer;">
            <h4>${a.titulo}</h4>
            <p>${a.texto}</p>
            <button class="btn-deletar" onclick="deletarAnotacao(event, ${a.id})">×</button>
        </div>
    `).join('');
}

async function deletarAnotacao(event, id) {
    // Impede que o clique no "X" ative o clique do card de abrir
    event.stopPropagation(); 

    if (confirm("Tem certeza que deseja excluir esta anotação?")) {
        try {
            const resposta = await fetch(`https://focovest-backend.onrender.com/anotacao/${id}`, {
                method: "DELETE"
            });

            if (resposta.ok) {
                anotacoes = anotacoes.filter(a => a.id !== id);
                renderAnotacoes();
            } else {
                alert("Erro ao excluir a anotação no servidor.");
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            alert("Não foi possível conectar ao servidor.");
        }
    }
    
}

function abrirAnotacao(id) {
    const anotacaoSelecionada = anotacoes.find(a => a.id === id);
    
    if (anotacaoSelecionada) {
        document.getElementById('anotacao-titulo').value = anotacaoSelecionada.titulo;
        document.getElementById('anotacao-texto').value = anotacaoSelecionada.texto;
    }
}

// ===================== INICIALIZAÇÃO =====================

window.onload = async () => {
    setupRotinaTabs();
    setupCalendar();
};
