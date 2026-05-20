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