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
function abrirRedacao() { mostrarTela("redacao"); }
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

// ===================== INICIALIZAÇÃO =====================

window.onload = async () => {
    setupRotinaTabs();
    setupCalendar();
};
