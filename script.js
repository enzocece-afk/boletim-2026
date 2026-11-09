// Configuração fixa do aluno
const CONFIG_ALUNO = {
  turma: "8B",
  numeroChamada: 11,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// PIN mantido somente em memória durante a sessão ativa
let pinSessao = "";

// Dados brutos das disciplinas do 8º Ano (Dados locais de fallback)
let dadosDisciplinas = [
  { disciplina: "Língua Portuguesa", tri1: 82, tri2: "7,8", tri3: 85, faltas: [2, 1, 1] },
  { disciplina: "Matemática", tri1: 52, tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências", tri1: "8,1", tri2: 76, tri3: 8.0, faltas: [1, 2, 0] },
  { disciplina: "História", tri1: 7.0, tri2: 84, tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia", tri1: 68, tri2: 7.3, tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 86, tri2: "8,1", tri3: 8.7, faltas: [1, 0, 0] },
  { disciplina: "Arte", tri1: 9.0, tri2: 92, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 95, tri2: 9.0, tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 88, tri2: 9.1, tri3: 93, faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira", tri1: 74, tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado", tri1: 8.0, tri2: 83, tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura", tri1: 62, tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 48, tri2: 5.6, tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais", tri1: 58, tri2: "6,2", tri3: 6.4, faltas: [1, 1, 1] }
];

// Nota demonstrativa de frequência fixa
const FREQUENCIA_DEMONSTRATIVA = "92%";

// Função para normalizar qualquer formato de nota para a escala de 0 a 10 (Dados antigos)
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === "string") {
    valor = valor.replace(",", ".");
  }

  let numero = Number(valor);

  if (isNaN(numero)) {
    return null;
  }

  if (numero > 10 && numero <= 100) {
    numero = numero / 10;
  }

  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  return null;
}

// Função para formatar exibição da nota na tabela
function formatarExibicaoNota(nota) {
  if (nota === null || nota === undefined) {
    return "—";
  }
  return Number(nota).toFixed(1).replace(".", ",");
}

// Fazer login na API do professor
async function fazerLogin() {
  const campoPin = document.getElementById("campo-pin");
  const msgElement = document.getElementById("mensagem-login");
  const btnEntrar = document.getElementById("btn-entrar");

  const pinDigitado = campoPin.value.trim();
  if (!pinDigitado) return;

  msgElement.style.color = "#8e24aa";
  msgElement.textContent = "Conectando...";
  btnEntrar.disabled = true;

  try {
    const response = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (response.status === 401) {
      msgElement.style.color = "#c62828";
      msgElement.textContent = "Turma, chamada ou PIN inválidos.";
      btnEntrar.disabled = false;
      return;
    }

    if (response.status === 429) {
      msgElement.style.color = "#c62828";
      msgElement.textContent = "Muitas tentativas. Aguarde um minuto e tente novamente.";
      btnEntrar.disabled = false;
      return;
    }

    if (!response.ok) {
      msgElement.style.color = "#c62828";
      msgElement.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
      btnEntrar.disabled = false;
      return;
    }

    const resultado = await response.json();

    // PIN correto: guarda na sessão e limpa o campo no DOM
    pinSessao = pinDigitado;
    campoPin.value = "";
    msgElement.textContent = "";

    // Trata os dados recebidos da API
    if (resultado.dados && Array.isArray(resultado.dados.disciplinas) && resultado.dados.disciplinas.length > 0) {
      dadosDisciplinas = resultado.dados.disciplinas;
    }

    // Oculta área de login e exibe o boletim
    document.getElementById("area-login").style.display = "none";
    document.getElementById("conteudo-boletim").style.display = "block";

    carregarBoletim();

  } catch (error) {
    msgElement.style.color = "#c62828";
    msgElement.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  } finally {
    btnEntrar.disabled = false;
  }
}

// Função principal que processa os dados e preenche o HTML
function carregarBoletim() {
  const tabelaCorpo = document.getElementById("tabela-corpo");
  tabelaCorpo.innerHTML = "";

  let somaMediasGerais = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let qtdBomDesempenho = 0;
  let qtdAtencao = 0;

  dadosDisciplinas.forEach((item) => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    let totalFaltasDisciplina = 0;
    if (Array.isArray(item.faltas)) {
      totalFaltasDisciplina = item.faltas.reduce((acc, f) => acc + (Number(f) || 0), 0);
    }
    totalFaltasGeral += totalFaltasDisciplina;

    const notasValidas = [n1, n2, n3].filter((n) => n !== null);
    let media = null;
    let situacaoTexto = "Nota ainda não disponível";
    let situacaoClasse = "situacao-indisponivel";

    if (notasValidas.length > 0) {
      const soma = notasValidas.reduce((acc, val) => acc + val, 0);
      media = soma / notasValidas.length;

      somaMediasGerais += media;
      qtdDisciplinasComMedia++;

      if (media >= 6.0) {
        situacaoTexto = "Bom desempenho";
        situacaoClasse = "situacao-bom";
        qtdBomDesempenho++;
      } else {
        situacaoTexto = "Atenção";
        situacaoClasse = "situacao-atencao";
        qtdAtencao++;
      }
    }

    const tr = document.createElement("tr");

    const tdDisc = document.createElement("td");
    const strongDisc = document.createElement("strong");
    strongDisc.textContent = item.disciplina;
    tdDisc.appendChild(strongDisc);

    const tdN1 = document.createElement("td");
    tdN1.textContent = formatarExibicaoNota(n1);

    const tdN2 = document.createElement("td");
    tdN2.textContent = formatarExibicaoNota(n2);

    const tdN3 = document.createElement("td");
    tdN3.textContent = formatarExibicaoNota(n3);

    const tdMedia = document.createElement("td");
    const strongMedia = document.createElement("strong");
    strongMedia.textContent = media !== null ? formatarExibicaoNota(media) : "—";
    tdMedia.appendChild(strongMedia);

    const tdFaltas = document.createElement("td");
    tdFaltas.textContent = totalFaltasDisciplina;

    const tdSituacao = document.createElement("td");
    tdSituacao.className = situacaoClasse;
    tdSituacao.textContent = situacaoTexto;

    tr.appendChild(tdDisc);
    tr.appendChild(tdN1);
    tr.appendChild(tdN2);
    tr.appendChild(tdN3);
    tr.appendChild(tdMedia);
    tr.appendChild(tdFaltas);
    tr.appendChild(tdSituacao);

    tabelaCorpo.appendChild(tr);
  });

  const mediaGeralCalculada = qtdDisciplinasComMedia > 0 
    ? (somaMediasGerais / qtdDisciplinasComMedia).toFixed(1).replace(".", ",") 
    : "—";

  document.getElementById("media-geral").textContent = mediaGeralCalculada;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("bom-desempenho").textContent = qtdBomDesempenho;
  document.getElementById("atencao").textContent = qtdAtencao;
}

// Controles do Painel de Edição
function abrirEdicao() {
  const painel = document.getElementById("painel-edicao");
  const tabelaEdicaoCorpo = document.getElementById("tabela-edicao-corpo");
  const msgEdicao = document.getElementById("mensagem-edicao");
  msgEdicao.textContent = "";
  tabelaEdicaoCorpo.innerHTML = "";

  dadosDisciplinas.forEach((item, index) => {
    const f1 = (item.faltas && item.faltas[0] !== undefined) ? item.faltas[0] : 0;
    const f2 = (item.faltas && item.faltas[1] !== undefined) ? item.faltas[1] : 0;
    const f3 = (item.faltas && item.faltas[2] !== undefined) ? item.faltas[2] : 0;

    const formatarInputNota = (v) => {
      const n = normalizarNota(v);
      return n !== null ? String(n).replace(".", ",") : "";
    };

    const tr = document.createElement("tr");

    const tdDisc = document.createElement("td");
    const strongDisc = document.createElement("strong");
    strongDisc.textContent = item.disciplina;
    tdDisc.appendChild(strongDisc);

    tr.appendChild(tdDisc);

    // Campos de Notas
    tr.appendChild(criarTdInput(`n1_${index}`, formatarInputNota(item.tri1), "Ex: 7,5"));
    tr.appendChild(criarTdInput(`n2_${index}`, formatarInputNota(item.tri2), "Ex: 8.2"));
    tr.appendChild(criarTdInput(`n3_${index}`, formatarInputNota(item.tri3), "Ex: 10"));

    // Campos de Faltas
    tr.appendChild(criarTdInput(`f1_${index}`, f1, "0"));
    tr.appendChild(criarTdInput(`f2_${index}`, f2, "0"));
    tr.appendChild(criarTdInput(`f3_${index}`, f3, "0"));

    tabelaEdicaoCorpo.appendChild(tr);
  });

  painel.style.display = "block";
  painel.scrollIntoView({ behavior: "smooth" });
}

function criarTdInput(id, valor, placeholder) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.className = "input-edicao";
  input.value = valor !== null && valor !== undefined ? valor : "";
  input.placeholder = placeholder;
  td.appendChild(input);
  return td;
}

function fecharEdicao() {
  document.getElementById("painel-edicao").style.display = "none";
}

// Validação estrita para as notas editadas
function validarNotaEditada(str) {
  if (str === null || str === undefined) return { valida: true, valor: null };
  const s = String(str).trim();
  if (s === "") return { valida: true, valor: null };

  const normalizada = s.replace(",", ".");
  const num = Number(normalizada);

  if (isNaN(num)) return { valida: false, valor: null };
  if (num < 0 || num > 10) return { valida: false, valor: null };

  return { valida: true, valor: num };
}

// Validação estrita para as faltas editadas
function validarFaltaEditada(str) {
  if (str === null || str === undefined) return { valida: false, valor: null };
  const s = String(str).trim();
  if (s === "") return { valida: false, valor: null };

  if (!/^\d+$/.test(s)) return { valida: false, valor: null };

  const num = Number(s);
  if (isNaN(num) || num < 0) return { valida: false, valor: null };

  return { valida: true, valor: num };
}

// Salvar as alterações feitas no editor
async function salvarAlteracoes() {
  const msgEdicao = document.getElementById("mensagem-edicao");
  const btnSalvar = document.getElementById("btn-salvar");
  let temErro = false;

  msgEdicao.textContent = "";

  const novasDisciplinas = [];

  for (let i = 0; i < dadosDisciplinas.length; i++) {
    const inputN1 = document.getElementById(`n1_${i}`);
    const inputN2 = document.getElementById(`n2_${i}`);
    const inputN3 = document.getElementById(`n3_${i}`);
    const inputF1 = document.getElementById(`f1_${i}`);
    const inputF2 = document.getElementById(`f2_${i}`);
    const inputF3 = document.getElementById(`f3_${i}`);

    [inputN1, inputN2, inputN3, inputF1, inputF2, inputF3].forEach(el => el.classList.remove("invalido"));

    const resN1 = validarNotaEditada(inputN1.value);
    if (!resN1.valida) { inputN1.classList.add("invalido"); temErro = true; }

    const resN2 = validarNotaEditada(inputN2.value);
    if (!resN2.valida) { inputN2.classList.add("invalido"); temErro = true; }

    const resN3 = validarNotaEditada(inputN3.value);
    if (!resN3.valida) { inputN3.classList.add("invalido"); temErro = true; }

    const resF1 = validarFaltaEditada(inputF1.value);
    if (!resF1.valida) { inputF1.classList.add("invalido"); temErro = true; }

    const resF2 = validarFaltaEditada(inputF2.value);
    if (!resF2.valida) { inputF2.classList.add("invalido"); temErro = true; }

    const resF3 = validarFaltaEditada(inputF3.value);
    if (!resF3.valida) { inputF3.classList.add("invalido"); temErro = true; }

    if (!temErro) {
      novasDisciplinas.push({
        disciplina: dadosDisciplinas[i].disciplina,
        tri1: resN1.valor,
        tri2: resN2.valor,
        tri3: resN3.valor,
        faltas: [resF1.valor, resF2.valor, resF3.valor]
      });
    }
  }

  if (temErro) {
    msgEdicao.style.color = "#c62828";
    msgEdicao.textContent = "Verifique os campos destacados em vermelho. Notas devem ser entre 0 e 10 e faltas devem ser números inteiros.";
    return;
  }

  msgEdicao.style.color = "#8e24aa";
  msgEdicao.textContent = "Salvando...";
  btnSalvar.disabled = true;

  try {
    const response = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: novasDisciplinas
        }
      })
    });

    if (!response.ok) {
      msgEdicao.style.color = "#c62828";
      msgEdicao.textContent = "Não foi possível salvar as alterações no servidor. Tente novamente.";
      btnSalvar.disabled = false;
      return;
    }

    dadosDisciplinas = novasDisciplinas;
    carregarBoletim();

    msgEdicao.style.color = "#2e7d32";
    msgEdicao.textContent = "Dados salvos com sucesso!";

    setTimeout(() => {
      fecharEdicao();
    }, 1500);

  } catch (error) {
    msgEdicao.style.color = "#c62828";
    msgEdicao.textContent = "Falha ao conectar com o servidor. Tente novamente.";
  } finally {
    btnSalvar.disabled = false;
  }
}