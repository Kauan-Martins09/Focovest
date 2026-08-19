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
function abrirPainel() { mostrarTela("painel"); atualizarPainel() }
function abrirMinhaRotina() { mostrarTela("minha-rotina"); }
function atualizarPainel() {
    const nome = localStorage.getItem("nome") || "Estudante";
    const primeiroNome = nome.split(" ")[0];

    document.getElementById("avatar-inicial").textContent = nome.charAt(0).toUpperCase();
    document.getElementById("nome-usuario-nav").textContent = primeiroNome;

    const hora = new Date().getHours();
    let saudacao = "Boa noite";
    if (hora >= 5 && hora < 12) saudacao = "Bom dia";
    else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";

    document.getElementById("saudacao-usuario").textContent = `${saudacao}, ${primeiroNome} 👋`;

    const hoje = new Date();
    const diaProva = new Date("2026-11-08T00:00:00");
    const diasRestantes = Math.max(0, Math.ceil((diaProva - hoje) / (1000 * 60 * 60 * 24)));

    document.getElementById("dias-para-enem").textContent = diasRestantes;
}

function togglePerfilMenu() {
    document.getElementById("perfil-menu").classList.toggle("aberto");
}

function sairConta() {
    localStorage.removeItem("usuario_id");
    localStorage.removeItem("nome");
    voltarHome();
}

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
        body: JSON.stringify(dados)
    });

    const json = await resposta.json();
    alert(json.msg);
    abrirLogin();
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

    abrirPainel();

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
// ================ TELA PRATICAR =============== //
function abrirPraticar() { mostrarTela("praticar"); }

// ===================== TREINO (QUIZ) =====================

let questoesTreino = [];
let indiceAtual = 0;
let respostasTreino = [];

async function iniciarTreino(disciplina) {
    mostrarTela("treino");
    document.getElementById("treino-resultado").style.display = "none";
    document.getElementById("treino-conteudo").innerHTML = '<p class="treino-carregando">Carregando questões...</p>';

    try {
        const resposta = await fetch(
            `https://focovest-backend.onrender.com/treino/${disciplina}?quantidade=10`
        );
        questoesTreino = await resposta.json();
        respostasTreino = new Array(questoesTreino.length).fill(null);
        indiceAtual = 0;

        renderQuestaoTreino();
    } catch (error) {
        console.error("Erro ao carregar treino:", error);
        document.getElementById("treino-conteudo").innerHTML = '<p class="treino-erro">Não foi possível carregar as questões. Tente novamente.</p>';
    }
}

function formatarContexto(texto) {
    if (!texto) return '';
    return texto
        .replace(/!\[.*?\]\(.*?\)/g, '')                          // remove imagem embutida no markdown (mostramos separado)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')          // **negrito** -> <strong>
        .replace(/\n/g, '<br>');                                  // quebras de linha
}

function renderQuestaoTreino() {
    const questao = questoesTreino[indiceAtual];
    const total = questoesTreino.length;

    document.getElementById("treino-progresso-texto").textContent = `Questão ${indiceAtual + 1} de ${total}`;
    document.getElementById("progresso-preenchido").style.width = `${(indiceAtual / total) * 100}%`;

    const imagemHtml = (questao.files && questao.files.length > 0)
        ? `<img src="${questao.files[0]}" class="questao-imagem" alt="Imagem da questão">`
        : '';

    const alternativasHtml = questao.alternatives.map(alt => {
        const conteudo = alt.file
            ? `<img src="${alt.file}" class="alternativa-imagem" alt="Alternativa ${alt.letter}">`
            : `<span class="alternativa-texto">${alt.text || ''}</span>`;

        return `
            <button class="alternativa-btn" data-letra="${alt.letter}" onclick="selecionarAlternativa('${alt.letter}')">
                <span class="alternativa-letra">${alt.letter}</span>
                ${conteudo}
            </button>
        `;
    }).join('');

    document.getElementById("treino-conteudo").innerHTML = `
        <div class="questao-card">
            <span class="questao-tag">${questao.discipline} · ENEM ${questao.year}</span>
            <div class="questao-contexto">${formatarContexto(questao.context)}</div>
            ${imagemHtml}
            <p class="questao-pergunta">${questao.alternativesIntroduction || ''}</p>
            <div class="alternativas-lista">${alternativasHtml}</div>
        </div>
        <button class="btn-proxima" id="btn-proxima" onclick="proximaQuestao()" disabled>
            ${indiceAtual === total - 1 ? 'Ver resultado' : 'Próxima'}
        </button>
    `;

    const respostaSalva = respostasTreino[indiceAtual];
    if (respostaSalva) {
        marcarAlternativaSelecionada(respostaSalva);
        document.getElementById("btn-proxima").disabled = false;
    }
}

function selecionarAlternativa(letra) {
    respostasTreino[indiceAtual] = letra;
    marcarAlternativaSelecionada(letra);
    document.getElementById("btn-proxima").disabled = false;
}

function marcarAlternativaSelecionada(letra) {
    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        btn.classList.toggle('selecionada', btn.dataset.letra === letra);
    });
}

function proximaQuestao() {
    if (indiceAtual < questoesTreino.length - 1) {
        indiceAtual++;
        renderQuestaoTreino();
    } else {
        mostrarResultadoTreino();
    }
}

function mostrarResultadoTreino() {
    const total = questoesTreino.length;
    let acertos = 0;

    questoesTreino.forEach((q, i) => {
        if (respostasTreino[i] === q.correctAlternative) acertos++;
    });

    // Atualiza barra de progresso
    document.getElementById("progresso-preenchido").style.width = "100%";
    document.getElementById("treino-progresso-texto").textContent = "Revisão do treino";

    // Gera o HTML de todas as questões com feedback
    let htmlQuestoes = "";

    questoesTreino.forEach((questao, i) => {
        const respostaUsuario = respostasTreino[i];
        const acertou = respostaUsuario === questao.correctAlternative;

        if (acertou) acertos; // só para clareza

        const imagemHtml = (questao.files && questao.files.length > 0)
            ? `<img src="${questao.files[0]}" class="questao-imagem" alt="Imagem da questão">`
            : "";

        const alternativasHtml = questao.alternatives.map(alt => {
            let classes = "alternativa-btn revisao";
            let statusIcon = "";

            // Resposta correta
            if (alt.letter === questao.correctAlternative) {
                classes += " correta";
                statusIcon = `<span class="status-icon">✓</span>`;
            }
            // Resposta que o usuário marcou e estava errada
            else if (alt.letter === respostaUsuario && !acertou) {
                classes += " incorreta";
                statusIcon = `<span class="status-icon">✗</span>`;
            }

            const conteudo = alt.file
                ? `<img src="${alt.file}" class="alternativa-imagem" alt="Alternativa ${alt.letter}">`
                : `<span class="alternativa-texto">${alt.text || ""}</span>`;

            return `
                <div class="${classes}" data-letra="${alt.letter}">
                    <span class="alternativa-letra">${alt.letter}</span>
                    ${conteudo}
                    ${statusIcon}
                </div>
            `;
        }).join("");

        htmlQuestoes += `
            <div class="questao-card revisao-card ${acertou ? "acertou" : "errou"}">
                <div class="revisao-header">
                    <span class="questao-tag">${questao.discipline} · ENEM ${questao.year}</span>
                    <span class="badge-resultado ${acertou ? "badge-acerto" : "badge-erro"}">
                        ${acertou ? "✓ Acertou" : "✗ Errou"}
                    </span>
                </div>

                <div class="questao-contexto">${formatarContexto(questao.context)}</div>
                ${imagemHtml}
                <p class="questao-pergunta">${questao.alternativesIntroduction || ""}</p>

                <div class="alternativas-lista">
                    ${alternativasHtml}
                </div>

                ${!acertou ? `
                    <p class="resposta-explicacao">
                        Você marcou <strong>${respostaUsuario || "nenhuma"}</strong>. 
                        A resposta correta é <strong>${questao.correctAlternative}</strong>.
                    </p>
                ` : ""}
            </div>
        `;
    });

    // Monta o resultado final
    const porcentagem = Math.round((acertos / total) * 100);
    let mensagem;
    if (porcentagem >= 80) mensagem = "Mandou muito bem!";
    else if (porcentagem >= 50) mensagem = "Bom treino! Continue praticando.";
    else mensagem = "Vale revisar esse conteúdo com calma.";

    document.getElementById("treino-conteudo").innerHTML = `
        <div class="resumo-resultado">
            <h2>Treino concluído!</h2>
            <p class="resultado-nota">${acertos} de ${total}</p>
            <p class="resultado-mensagem">${mensagem}</p>
            <p class="resultado-porcentagem">${porcentagem}% de acerto</p>
        </div>

        <h3 class="titulo-revisao">Revisão das questões</h3>
        ${htmlQuestoes}

        <button class="btn-proxima" onclick="abrirPraticar()" style="margin-top: 30px;">
            Voltar para Praticar
        </button>
    `;

    // Esconde o bloco antigo de resultado (não usamos mais ele)
    document.getElementById("treino-resultado").style.display = "none";
}

function sairDoTreino() {
    if (confirm("Sair do treino? Seu progresso nessa sessão será perdido.")) {
        abrirPraticar();
    }
}

// ===================== PROVA - INTRODUÇÃO E HISTÓRICO =====================

function abrirProvaIntro() {
    mostrarTela("prova-intro");
    carregarHistoricoProvas();
}

async function carregarHistoricoProvas() {
    const usuario_id = localStorage.getItem("usuario_id");
    const container = document.getElementById("lista-historico-provas");

    if (!usuario_id) {
        container.innerHTML = '<p class="historico-vazio">Faça login para ver seu histórico.</p>';
        return;
    }

    try {
        const resposta = await fetch(`https://focovest-backend.onrender.com/resultado/${usuario_id}`);
        const resultados = await resposta.json();

        if (!resultados || resultados.length === 0) {
            container.innerHTML = '<p class="historico-vazio">Você ainda não fez nenhuma prova.</p>';
            return;
        }

        container.innerHTML = resultados.map(r => {
            const data = new Date(r.data).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            const temRevisao = r.questoes && r.respostas;

            return `
                <div class="historico-item">
                    <div class="historico-info">
                        <strong>Nota: ${r.nota}</strong>
                        <span>${r.acertos} de ${r.total} acertos</span>
                        <span class="historico-data">${data}</span>
                    </div>
                    ${temRevisao 
                        ? `<button class="btn-revisar" onclick="revisarProva(${r.id})">Revisar</button>`
                        : `<span class="sem-revisao">Sem revisão</span>`
                    }
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        container.innerHTML = '<p class="historico-vazio">Erro ao carregar histórico.</p>';
    }
}

// ===================== PROVA (SIMULADO COM TIMER) =====================

let questoesProva = [];
let indiceProva = 0;
let respostasProva = [];
let timerProvaId = null;
let segundosRestantes = 90 * 60;

async function iniciarProva() {
    mostrarTela("prova");
    document.getElementById("prova-resultado").style.display = "none";
    document.getElementById("prova-timer").style.display = "block";
    document.getElementById("prova-conteudo").innerHTML = '<p class="treino-carregando">Montando sua prova...</p>';

    try {
        const resposta = await fetch("https://focovest-backend.onrender.com/prova?quantidade_por_area=15");
        const dados = await resposta.json();

        questoesProva = dados.questoes;
        respostasProva = new Array(questoesProva.length).fill(null);
        indiceProva = 0;
        segundosRestantes = 90 * 60;

        // remove classe de urgente se existir
        document.getElementById("prova-timer").classList.remove("timer-urgente");

        iniciarCronometro();
        renderQuestaoProva();
    } catch (error) {
        console.error("Erro ao montar prova:", error);
        document.getElementById("prova-conteudo").innerHTML = '<p class="treino-erro">Não foi possível montar a prova. Tente novamente.</p>';
    }
}

function iniciarCronometro() {
    clearInterval(timerProvaId);
    atualizarTimerTexto();

    timerProvaId = setInterval(() => {
        segundosRestantes--;
        atualizarTimerTexto();

        if (segundosRestantes <= 0) {
            clearInterval(timerProvaId);
            finalizarProva();
        }
    }, 1000);
}

function atualizarTimerTexto() {
    const minutos = Math.floor(segundosRestantes / 60);
    const segundos = segundosRestantes % 60;
    const texto = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    document.getElementById("prova-timer").textContent = texto;

    if (segundosRestantes <= 300) {
        document.getElementById("prova-timer").classList.add("timer-urgente");
    }
}

function renderQuestaoProva() {
    const questao = questoesProva[indiceProva];
    const total = questoesProva.length;

    document.getElementById("prova-progresso-texto").textContent = `Questão ${indiceProva + 1} de ${total}`;
    document.getElementById("prova-progresso-preenchido").style.width = `${(indiceProva / total) * 100}%`;

    const imagemHtml = (questao.files && questao.files.length > 0)
        ? `<img src="${questao.files[0]}" class="questao-imagem" alt="Imagem da questão">`
        : '';

    const alternativasHtml = questao.alternatives.map(alt => {
        const conteudo = alt.file
            ? `<img src="${alt.file}" class="alternativa-imagem" alt="Alternativa ${alt.letter}">`
            : `<span class="alternativa-texto">${alt.text || ''}</span>`;

        return `
            <button class="alternativa-btn" data-letra="${alt.letter}" onclick="selecionarAlternativaProva('${alt.letter}')">
                <span class="alternativa-letra">${alt.letter}</span>
                ${conteudo}
            </button>
        `;
    }).join('');

    document.getElementById("prova-conteudo").innerHTML = `
        <div class="questao-card">
            <span class="questao-tag">${questao.discipline} · ENEM ${questao.year}</span>
            <div class="questao-contexto">${formatarContexto(questao.context)}</div>
            ${imagemHtml}
            <p class="questao-pergunta">${questao.alternativesIntroduction || ''}</p>
            <div class="alternativas-lista">${alternativasHtml}</div>
        </div>
        <button class="btn-proxima" id="btn-proxima-prova" onclick="proximaQuestaoProva()" disabled>
            ${indiceProva === total - 1 ? 'Finalizar prova' : 'Próxima'}
        </button>
    `;

    const respostaSalva = respostasProva[indiceProva];
    if (respostaSalva) {
        marcarAlternativaSelecionada(respostaSalva);
        document.getElementById("btn-proxima-prova").disabled = false;
    }
}

function selecionarAlternativaProva(letra) {
    respostasProva[indiceProva] = letra;
    marcarAlternativaSelecionada(letra);
    document.getElementById("btn-proxima-prova").disabled = false;
}

function proximaQuestaoProva() {
    if (indiceProva < questoesProva.length - 1) {
        indiceProva++;
        renderQuestaoProva();
    } else {
        finalizarProva();
    }
}

async function finalizarProva() {
    clearInterval(timerProvaId);

    const total = questoesProva.length;
    let acertos = 0;
    questoesProva.forEach((q, i) => {
        if (respostasProva[i] === q.correctAlternative) acertos++;
    });

    const nota = Math.round((acertos / total) * 1000);

    document.getElementById("prova-conteudo").innerHTML = '';
    document.getElementById("prova-progresso-preenchido").style.width = '100%';
    document.getElementById("prova-progresso-texto").textContent = 'Concluído';

    document.getElementById("prova-resultado").style.display = 'flex';
    document.getElementById("prova-resultado-nota").textContent = nota;

    let mensagem;
    if (nota >= 800) mensagem = 'Excelente! Nota de quem já está pronto para o ENEM.';
    else if (nota >= 500) mensagem = 'Bom resultado! Continue firme nos estudos.';
    else mensagem = `Você acertou ${acertos} de ${total} questões. Vale reforçar o conteúdo.`;

    document.getElementById("prova-resultado-mensagem").textContent = mensagem;

    // Salva no backend com questões e respostas (para revisão futura)
    const usuario_id = Number(localStorage.getItem("usuario_id"));
    try {
        await fetch("https://focovest-backend.onrender.com/resultado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario_id,
                acertos,
                total,
                nota,
                questoes: questoesProva,
                respostas: respostasProva
            })
        });
    } catch (error) {
        console.error("Erro ao salvar resultado:", error);
    }

    // Botão para revisar a prova que acabou de fazer
    const resultadoDiv = document.getElementById("prova-resultado");
    // remove botão antigo se existir
    const antigo = resultadoDiv.querySelector(".btn-revisar-agora");
    if (antigo) antigo.remove();

    const btnRevisarAgora = document.createElement("button");
    btnRevisarAgora.textContent = "Revisar esta prova";
    btnRevisarAgora.classList.add("btn-revisar-agora");
    btnRevisarAgora.style.marginTop = "12px";
    btnRevisarAgora.onclick = () => {
        mostrarRevisaoProva(questoesProva, respostasProva, acertos, total, nota);
    };
    resultadoDiv.appendChild(btnRevisarAgora);
}

function sairDaProva() {
    if (confirm("Sair da prova? Seu progresso será perdido e nada será salvo.")) {
        clearInterval(timerProvaId);
        abrirProvaIntro(); // volta para a tela de introdução
    }
}

// ===================== REVISÃO DA PROVA =====================

async function revisarProva(id) {
    const usuario_id = localStorage.getItem("usuario_id");
    try {
        const resposta = await fetch(`https://focovest-backend.onrender.com/resultado/${usuario_id}`);
        const resultados = await resposta.json();
        const prova = resultados.find(r => r.id === id);

        if (!prova || !prova.questoes || !prova.respostas) {
            alert("Esta prova não possui dados de revisão.");
            return;
        }

        mostrarRevisaoProva(
            prova.questoes,
            prova.respostas,
            prova.acertos,
            prova.total,
            prova.nota
        );
    } catch (error) {
        console.error("Erro ao carregar prova para revisão:", error);
        alert("Não foi possível carregar a revisão.");
    }
}

function mostrarRevisaoProva(questoes, respostas, acertos, total, nota) {
    mostrarTela("prova");
    document.getElementById("prova-resultado").style.display = "none";
    document.getElementById("prova-timer").style.display = "none";

    document.getElementById("prova-progresso-texto").textContent = "Revisão da prova";
    document.getElementById("prova-progresso-preenchido").style.width = "100%";

    let htmlQuestoes = "";

    questoes.forEach((questao, i) => {
        const respostaUsuario = respostas[i];
        const acertou = respostaUsuario === questao.correctAlternative;

        const imagemHtml = (questao.files && questao.files.length > 0)
            ? `<img src="${questao.files[0]}" class="questao-imagem" alt="Imagem da questão">`
            : "";

        const alternativasHtml = questao.alternatives.map(alt => {
            let classes = "alternativa-btn revisao";
            let statusIcon = "";

            if (alt.letter === questao.correctAlternative) {
                classes += " correta";
                statusIcon = `<span class="status-icon">✓</span>`;
            } else if (alt.letter === respostaUsuario && !acertou) {
                classes += " incorreta";
                statusIcon = `<span class="status-icon">✗</span>`;
            }

            const conteudo = alt.file
                ? `<img src="${alt.file}" class="alternativa-imagem" alt="Alternativa ${alt.letter}">`
                : `<span class="alternativa-texto">${alt.text || ""}</span>`;

            return `
                <div class="${classes}" data-letra="${alt.letter}">
                    <span class="alternativa-letra">${alt.letter}</span>
                    ${conteudo}
                    ${statusIcon}
                </div>
            `;
        }).join("");

        htmlQuestoes += `
            <div class="questao-card revisao-card ${acertou ? "acertou" : "errou"}">
                <div class="revisao-header">
                    <span class="questao-tag">${questao.discipline} · ENEM ${questao.year}</span>
                    <span class="badge-resultado ${acertou ? "badge-acerto" : "badge-erro"}">
                        ${acertou ? "✓ Acertou" : "✗ Errou"}
                    </span>
                </div>
                <div class="questao-contexto">${formatarContexto(questao.context)}</div>
                ${imagemHtml}
                <p class="questao-pergunta">${questao.alternativesIntroduction || ""}</p>
                <div class="alternativas-lista">${alternativasHtml}</div>
                ${!acertou ? `
                    <p class="resposta-explicacao">
                        Você marcou <strong>${respostaUsuario || "nenhuma"}</strong>. 
                        A resposta correta é <strong>${questao.correctAlternative}</strong>.
                    </p>
                ` : ""}
            </div>
        `;
    });

    document.getElementById("prova-conteudo").innerHTML = `
        <div class="resumo-resultado">
            <h2>Revisão da Prova</h2>
            <p class="resultado-nota">${nota}</p>
            <p class="resultado-mensagem">${acertos} de ${total} acertos</p>
        </div>
        <h3 class="titulo-revisao">Questões</h3>
        ${htmlQuestoes}
        <button class="btn-proxima" onclick="abrirProvaIntro()" style="margin-top: 30px;">
            Voltar
        </button>
    `;
}

// ===================== REDAÇÃO =====================

const TEMAS_ENEM = [
    {
        ano: 2024,
        titulo: "Desafios para a valorização da herança africana no Brasil",
        motivadores: [
            "A cultura africana é parte fundamental da formação da identidade brasileira, presente na música, na culinária, na religião e na linguagem.",
            "Apesar disso, práticas racistas e a invisibilização histórica ainda dificultam o pleno reconhecimento dessa herança."
        ]
    },
    {
        ano: 2023,
        titulo: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
        motivadores: [
            "O trabalho de cuidado (doméstico, de idosos, crianças e pessoas com deficiência) é essencial para a sociedade, mas historicamente desvalorizado e majoritariamente feito por mulheres.",
            "A falta de políticas públicas e o preconceito de gênero agravam a sobrecarga feminina."
        ]
    },
    {
        ano: 2022,
        titulo: "Desafios para a valorização de comunidades e povos tradicionais no Brasil",
        motivadores: [
            "Povos indígenas, quilombolas, ribeirinhos e outras comunidades tradicionais possuem saberes e modos de vida fundamentais para a biodiversidade e a cultura nacional.",
            "A pressão econômica e a falta de reconhecimento legal ameaçam esses grupos."
        ]
    },
    {
        ano: 2021,
        titulo: "Invisibilidade e cidadania: o desafio de reconhecer os direitos dos idosos no Brasil",
        motivadores: [
            "O envelhecimento da população brasileira cresce rapidamente, mas os direitos dos idosos ainda são pouco efetivados no dia a dia.",
            "Violência, abandono e barreiras de acesso a serviços públicos são problemas recorrentes."
        ]
    },
    {
        ano: 2020,
        titulo: "O estigma associado às doenças mentais na sociedade brasileira",
        motivadores: [
            "O preconceito em relação a transtornos mentais atrasa diagnósticos e tratamentos, além de isolar as pessoas afetadas.",
            "Campanhas de conscientização e políticas públicas de saúde mental ainda são insuficientes."
        ]
    },
    {
        ano: 2019,
        titulo: "Democratização do acesso ao cinema no Brasil",
        motivadores: [
            "O cinema é ferramenta de cultura, educação e lazer, mas o acesso às salas ainda é desigual no país.",
            "Preço dos ingressos, concentração de cinemas em grandes centros e falta de políticas de democratização limitam o público."
        ]
    },
    {
        ano: 2018,
        titulo: "Manipulação do comportamento do usuário pelo controle de dados na internet",
        motivadores: [
            "Redes sociais e plataformas digitais coletam dados para influenciar escolhas de consumo, opinião e até voto.",
            "A falta de transparência e de educação digital amplia os riscos para a democracia e a privacidade."
        ]
    },
    {
        ano: 2017,
        titulo: "Desafios para a formação educacional de surdos no Brasil",
        motivadores: [
            "A inclusão de surdos na educação regular ainda enfrenta barreiras de comunicação, formação de professores e materiais adequados.",
            "O reconhecimento da Libras como língua oficial foi um avanço, mas a efetivação na prática é limitada."
        ]
    },
    {
        ano: 2016,
        titulo: "Caminhos para combater a intolerância religiosa no Brasil",
        motivadores: [
            "O Brasil é um país de diversidade religiosa, mas casos de intolerância e violência contra religiões de matriz africana e outras minorias são frequentes.",
            "A laicidade do Estado e o respeito à liberdade de crença precisam ser fortalecidos."
        ]
    },
    {
        ano: 2015,
        titulo: "A persistência da violência contra a mulher na sociedade brasileira",
        motivadores: [
            "Mesmo com leis como a Maria da Penha, os índices de violência doméstica e feminicídio permanecem altos.",
            "Fatores culturais, econômicos e a falha na aplicação das leis contribuem para a manutenção do problema."
        ]
    }
];

let temaAtualRedacao = null;

function abrirRedacaoIntro() {
    mostrarTela("redacao-intro");
    renderListaTemas();
}

function renderListaTemas() {
    const container = document.getElementById("lista-temas-redacao");
    container.innerHTML = TEMAS_ENEM.map((tema, index) => `
        <button class="tema-card" onclick="iniciarRedacao(${index})">
            <span class="tema-card-ano">ENEM ${tema.ano}</span>
            <h3>${tema.titulo}</h3>
        </button>
    `).join("");
}

function iniciarRedacaoAleatoria() {
    const index = Math.floor(Math.random() * TEMAS_ENEM.length);
    iniciarRedacao(index);
}

function iniciarRedacao(index) {
    temaAtualRedacao = TEMAS_ENEM[index];
    document.getElementById("redacao-tema-ano").textContent = `ENEM ${temaAtualRedacao.ano}`;
    document.getElementById("redacao-tema-titulo").textContent = temaAtualRedacao.titulo;
    document.getElementById("redacao-motivadores").innerHTML = temaAtualRedacao.motivadores
        .map(t => `<p class="motivador-item">${t}</p>`)
        .join("");

    document.getElementById("redacao-texto").value = "";
    atualizarContadoresRedacao();
    mostrarTela("redacao");
}

function atualizarContadoresRedacao() {
    const texto = document.getElementById("redacao-texto").value;
    const linhas = texto === "" ? 0 : texto.split("\n").length;
    const palavras = texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;

    const contLinhas = document.getElementById("contador-linhas");
    contLinhas.textContent = `${linhas} / 30 linhas`;
    contLinhas.style.color = linhas > 30 ? "#ef4444" : "#64748b";

    document.getElementById("contador-palavras").textContent = `${palavras} palavras`;
}

// Atualiza contadores enquanto digita
document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("redacao-texto");
    if (textarea) {
        textarea.addEventListener("input", atualizarContadoresRedacao);
    }
});

function sairDaRedacao() {
    if (document.getElementById("redacao-texto").value.trim() !== "") {
        if (!confirm("Sair? O texto atual será perdido.")) return;
    }
    abrirRedacaoIntro();
}

// ===================== CORREÇÃO POR REGRAS (sem IA) =====================

function corrigirRedacao(texto, tema) {
    const linhas = texto.split("\n").length;
    const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
    const paragrafos = texto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const numParagrafos = paragrafos.length;
    const textoLower = texto.toLowerCase();

    // --- Competência 1: Norma culta (heurística simples) ---
    let c1 = 160;
    const errosComuns = [
        { re: /\bvc\b|\btb\b|\bpq\b|\bqdo\b/gi, penalidade: 20, msg: "Evite abreviações informais (vc, tb, pq)." },
        { re: /\bnao\b/gi, penalidade: 10, msg: "Atenção à acentuação (não)." },
        { re: /\bvoce\b/gi, penalidade: 10, msg: "Prefira 'você' com acentuação." },
        { re: /!!!+|\?\?\?+/g, penalidade: 15, msg: "Evite excesso de pontuação emotiva." }
    ];
    const avisosC1 = [];
    errosComuns.forEach(e => {
        if (e.re.test(texto)) {
            c1 = Math.max(40, c1 - e.penalidade);
            avisosC1.push(e.msg);
        }
    });
    if (palavras < 80) {
        c1 = Math.max(40, c1 - 30);
        avisosC1.push("Texto muito curto para avaliar bem a norma culta.");
    }

    // --- Competência 2: Compreensão do tema ---
    let c2 = 100;
    const palavrasTema = tema.titulo
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .split(/\s+/)
        .filter(p => p.length > 4);
    const textoNorm = textoLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let hits = 0;
    palavrasTema.forEach(p => {
        if (textoNorm.includes(p)) hits++;
    });
    const cobertura = palavrasTema.length ? hits / palavrasTema.length : 0;
    if (cobertura >= 0.4) c2 = 180;
    else if (cobertura >= 0.25) c2 = 140;
    else if (cobertura >= 0.1) c2 = 100;
    else c2 = 60;
    if (palavras < 100) c2 = Math.min(c2, 100);

    // --- Competência 3: Argumentação / repertório ---
    let c3 = 100;
    const marcadoresArgumento = [
        "segundo", "de acordo", "conforme", "por exemplo", "ou seja",
        "além disso", "dessa forma", "portanto", "assim", "é possível",
        "dados", "pesquisa", "estudo", "história", "filosofia", "sociologia",
        "constituição", "lei", "direito", "ibge", "onu", "governo"
    ];
    let repertorio = 0;
    marcadoresArgumento.forEach(m => {
        if (textoLower.includes(m)) repertorio++;
    });
    if (repertorio >= 5) c3 = 180;
    else if (repertorio >= 3) c3 = 140;
    else if (repertorio >= 1) c3 = 100;
    else c3 = 60;
    if (numParagrafos < 3) c3 = Math.min(c3, 100);

    // --- Competência 4: Coesão ---
    let c4 = 100;
    const conectivos = [
        "além disso", "portanto", "dessa forma", "assim", "contudo",
        "entretanto", "no entanto", "por outro lado", "em primeiro lugar",
        "em segundo lugar", "por fim", "logo", "desse modo", "ainda",
        "também", "já que", "uma vez que", "visto que", "embora"
    ];
    let coesao = 0;
    conectivos.forEach(c => {
        if (textoLower.includes(c)) coesao++;
    });
    if (coesao >= 5) c4 = 180;
    else if (coesao >= 3) c4 = 150;
    else if (coesao >= 1) c4 = 110;
    else c4 = 70;
    if (numParagrafos >= 3 && numParagrafos <= 5) c4 = Math.min(200, c4 + 20);

    // --- Competência 5: Proposta de intervenção ---
    let c5 = 40;
    const marcadoresIntervencao = [
        "é necessário", "é preciso", "deve-se", "o governo", "o estado",
        "a escola", "a mídia", "campanha", "política pública", "projeto",
        "investir", "criar", "implementar", "promover", "conscientizar",
        "educação", "lei", "fiscalizar", "parceria", "sociedade"
    ];
    let intervencao = 0;
    marcadoresIntervencao.forEach(m => {
        if (textoLower.includes(m)) intervencao++;
    });
    // Proposta costuma estar no final
    const ultimoBloco = paragrafos.length ? paragrafos[paragrafos.length - 1].toLowerCase() : "";
    let noFinal = 0;
    marcadoresIntervencao.forEach(m => {
        if (ultimoBloco.includes(m)) noFinal++;
    });

    if (intervencao >= 4 && noFinal >= 2) c5 = 180;
    else if (intervencao >= 3) c5 = 140;
    else if (intervencao >= 2) c5 = 100;
    else if (intervencao >= 1) c5 = 60;
    else c5 = 40;

    // Penalidades gerais de tamanho
    if (linhas > 30) {
        c1 = Math.max(40, c1 - 20);
        c2 = Math.max(40, c2 - 20);
    }
    if (palavras < 50) {
        c1 = 40; c2 = 40; c3 = 40; c4 = 40; c5 = 40;
    }

    // Arredonda para múltiplos de 40 (estilo ENEM aproximado)
    const arredondar = (n) => Math.round(n / 40) * 40;
    c1 = Math.min(200, Math.max(0, arredondar(c1)));
    c2 = Math.min(200, Math.max(0, arredondar(c2)));
    c3 = Math.min(200, Math.max(0, arredondar(c3)));
    c4 = Math.min(200, Math.max(0, arredondar(c4)));
    c5 = Math.min(200, Math.max(0, arredondar(c5)));

    const nota = c1 + c2 + c3 + c4 + c5;

    return {
        linhas,
        palavras,
        paragrafos: numParagrafos,
        competencias: { c1, c2, c3, c4, c5 },
        nota,
        avisosC1,
        coberturaTema: Math.round(cobertura * 100),
        repertorio,
        coesao,
        intervencao
    };
}

function gerarFeedbackHTML(resultado, tema) {
    const { competencias, avisosC1, coberturaTema, repertorio, coesao, intervencao, paragrafos, linhas, palavras } = resultado;

    let htmlEstrutura = `<h3>Estrutura do texto</h3>`;
    if (paragrafos < 3) {
        htmlEstrutura += `<p>⚠️ Apenas <strong>${paragrafos} parágrafo(s)</strong>. O ideal é 3 a 4 (introdução, desenvolvimento e conclusão).</p>`;
    } else if (paragrafos <= 5) {
        htmlEstrutura += `<p>✅ Boa divisão em <strong>${paragrafos} parágrafos</strong>.</p>`;
    } else {
        htmlEstrutura += `<p>⚠️ Muitos parágrafos (${paragrafos}). Prefira 3 a 5 blocos claros.</p>`;
    }
    if (linhas > 30) {
        htmlEstrutura += `<p style="color:#ef4444">Você passou de 30 linhas (${linhas}). No ENEM o excesso pode ser desconsiderado.</p>`;
    } else if (linhas < 10) {
        htmlEstrutura += `<p>Texto curto (${linhas} linhas). Tente desenvolver mais os argumentos.</p>`;
    } else {
        htmlEstrutura += `<p>${linhas} linhas · ${palavras} palavras.</p>`;
    }

    const htmlCompetencias = `
        <h3>Nota estimada por competência</h3>
        <div class="competencias-grid">
            <div class="comp-item"><span>C1 · Norma culta</span><strong>${competencias.c1}</strong></div>
            <div class="comp-item"><span>C2 · Tema</span><strong>${competencias.c2}</strong></div>
            <div class="comp-item"><span>C3 · Argumentação</span><strong>${competencias.c3}</strong></div>
            <div class="comp-item"><span>C4 · Coesão</span><strong>${competencias.c4}</strong></div>
            <div class="comp-item"><span>C5 · Intervenção</span><strong>${competencias.c5}</strong></div>
        </div>
        <p class="nota-total">Nota estimada: <strong>${resultado.nota}</strong> / 1000</p>
        <p class="aviso-nota">Esta é uma correção automática por regras (sem IA). Serve como treino e orientação, não substitui a banca do ENEM.</p>
        <ul class="lista-competencias">
            <li><strong>C1:</strong> ${avisosC1.length ? avisosC1.join(" ") : "Não foram detectados problemas graves de informalidade."}</li>
            <li><strong>C2:</strong> Aproximadamente ${coberturaTema}% de relação lexical com o tema.</li>
            <li><strong>C3:</strong> ${repertorio} indício(s) de repertório/argumentação encontrados.</li>
            <li><strong>C4:</strong> ${coesao} conectivo(s) de coesão identificados.</li>
            <li><strong>C5:</strong> ${intervencao} elemento(s) típicos de proposta de intervenção.</li>
        </ul>
    `;

    return { htmlEstrutura, htmlCompetencias };
}

async function finalizarRedacao() {
    const texto = document.getElementById("redacao-texto").value.trim();
    if (!texto) {
        alert("Escreva sua redação antes de finalizar.");
        return;
    }
    if (!temaAtualRedacao) {
        alert("Tema não encontrado. Volte e escolha um tema.");
        return;
    }

    const resultado = corrigirRedacao(texto, temaAtualRedacao);
    const { htmlEstrutura, htmlCompetencias } = gerarFeedbackHTML(resultado, temaAtualRedacao);

    document.getElementById("resultado-tema-titulo").textContent = temaAtualRedacao.titulo;
    document.getElementById("stat-linhas").textContent = resultado.linhas;
    document.getElementById("stat-palavras").textContent = resultado.palavras;
    document.getElementById("stat-paragrafos").textContent = resultado.paragrafos;
    document.getElementById("feedback-estrutura").innerHTML = htmlEstrutura;
    document.getElementById("feedback-competencias").innerHTML = htmlCompetencias;
    document.getElementById("texto-final-redacao").textContent = texto;

    // Salva no backend
    const usuario_id = Number(localStorage.getItem("usuario_id"));
    if (usuario_id) {
        try {
            await fetch("https://focovest-backend.onrender.com/redacao", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario_id,
                    tema_ano: temaAtualRedacao.ano,
                    tema_titulo: temaAtualRedacao.titulo,
                    texto,
                    linhas: resultado.linhas,
                    palavras: resultado.palavras,
                    paragrafos: resultado.paragrafos,
                    nota: resultado.nota,
                    feedback: {
                        competencias: resultado.competencias,
                        avisosC1: resultado.avisosC1,
                        coberturaTema: resultado.coberturaTema
                    }
                })
            });
        } catch (error) {
            console.error("Erro ao salvar redação:", error);
            alert("Redação analisada, mas não foi possível salvar no histórico.");
        }
    }

    mostrarTela("redacao-resultado");
}

// ===================== HISTÓRICO DE REDAÇÕES =====================

async function carregarHistoricoRedacoes() {
    const usuario_id = localStorage.getItem("usuario_id");
    let container = document.getElementById("lista-historico-redacoes");
    if (!container) return;

    if (!usuario_id) {
        container.innerHTML = '<p class="historico-vazio">Faça login para ver seu histórico.</p>';
        return;
    }

    try {
        const resposta = await fetch(`https://focovest-backend.onrender.com/redacao/${usuario_id}`);
        const redacoes = await resposta.json();

        if (!redacoes || redacoes.length === 0) {
            container.innerHTML = '<p class="historico-vazio">Você ainda não enviou nenhuma redação.</p>';
            return;
        }

        container.innerHTML = redacoes.map((r, i) => {
            const data = new Date(r.data).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
            window._redacoesHistorico = window._redacoesHistorico || [];
            window._redacoesHistorico[i] = r;
            return `
                <div class="historico-item">
                    <div class="historico-info">
                        <strong>Nota: ${r.nota}</strong>
                        <span>${r.tema_titulo}</span>
                        <span class="historico-data">ENEM ${r.tema_ano} · ${data}</span>
                    </div>
                    <button class="btn-revisar" onclick="verRedacaoSalva(window._redacoesHistorico[${i}])">Ver</button>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Erro ao carregar histórico de redações:", error);
        container.innerHTML = '<p class="historico-vazio">Erro ao carregar histórico.</p>';
    }
}

function verRedacaoSalva(r) {
    // r pode vir como objeto ou precisar de parse se passou string
    if (typeof r === "string") {
        try { r = JSON.parse(r); } catch (e) { alert("Erro ao abrir redação."); return; }
    }

    document.getElementById("resultado-tema-titulo").textContent = r.tema_titulo;
    document.getElementById("stat-linhas").textContent = r.linhas;
    document.getElementById("stat-palavras").textContent = r.palavras;
    document.getElementById("stat-paragrafos").textContent = r.paragrafos;

    const comps = (r.feedback && r.feedback.competencias) ? r.feedback.competencias : null;
    let htmlComp = `<h3>Nota salva: ${r.nota} / 1000</h3>`;
    if (comps) {
        htmlComp += `
            <div class="competencias-grid">
                <div class="comp-item"><span>C1</span><strong>${comps.c1}</strong></div>
                <div class="comp-item"><span>C2</span><strong>${comps.c2}</strong></div>
                <div class="comp-item"><span>C3</span><strong>${comps.c3}</strong></div>
                <div class="comp-item"><span>C4</span><strong>${comps.c4}</strong></div>
                <div class="comp-item"><span>C5</span><strong>${comps.c5}</strong></div>
            </div>
        `;
    }
    document.getElementById("feedback-estrutura").innerHTML = `<h3>Redação salva</h3><p>ENEM ${r.tema_ano}</p>`;
    document.getElementById("feedback-competencias").innerHTML = htmlComp;
    document.getElementById("texto-final-redacao").textContent = r.texto;

    mostrarTela("redacao-resultado");
}

// Atualiza abrirRedacaoIntro para carregar histórico
function abrirRedacaoIntro() {
    mostrarTela("redacao-intro");
    renderListaTemas();
    carregarHistoricoRedacoes();
}

// Garante que o contador funcione mesmo se o DOM já estiver carregado
setTimeout(() => {
    const textarea = document.getElementById("redacao-texto");
    if (textarea && !textarea._listenerBound) {
        textarea.addEventListener("input", atualizarContadoresRedacao);
        textarea._listenerBound = true;
    }
}, 500);

// ===================== INICIALIZAÇÃO =====================

window.onload = async () => {
    setupRotinaTabs();
    setupCalendar();
};
