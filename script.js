// AQUI VOCÊ COLOCA A URL DO SEU WEB APP DO APPS SCRIPT
// VOCÊ VAI OBTER ESTA URL DEPOIS DE IMPLANTAR O APPS SCRIPT NA FASE 2
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyylWWuuNtlWvfjKa9GbanBd5_QIVE6x_OonCXWIcXt-MHJaNOc7EWNc0c_DVCNB39n/exec'; 

document.addEventListener('DOMContentLoaded', () => {
    const gerarItensBtn = document.getElementById('gerarItensBtn');
    const salvarPdfBtn = document.getElementById('salvarPdfBtn');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const totalPrevistoElement = document.getElementById('totalPrevisto');

    // Mapeamento das colunas para facilitar a coleta de dados da tabela
    const COL_MAP = {
        'DESPESA': 0, 'CATEGORIA': 1, 'SUBCATEGORIA': 2, 'FORNECEDOR': 3,
        'UNIDADE DE MEDIDA': 4, 'QUANTIDADE PREVISTA': 5, 'VALOR UNITÁRIO': 6,
        'VALOR PREVISTO': 7
    };

    // Função para calcular o total da tabela
    function calculateTotal() {
        let total = 0;
        const rows = itemsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const valorPrevistoCell = row.cells[COL_MAP['VALOR PREVISTO']];
            if (valorPrevistoCell) {
                const inputValue = valorPrevistoCell.querySelector('input') ? valorPrevistoCell.querySelector('input').value : valorPrevistoCell.textContent;
                const value = parseFloat(inputValue.replace('R$', '').replace(',', '.').trim());
                if (!isNaN(value)) {
                    total += value;
                }
            }
        });
        totalPrevistoElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Adiciona listeners para recalcular o total ao alterar campos de valor
    function addInputListenersToTable() {
        itemsTableBody.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.addEventListener('input', calculateTotal);
        });
    }


    // Evento do botão "Analisar Briefing"
    gerarItensBtn.addEventListener('click', async () => {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        salvarPdfBtn.style.display = 'none';
        itemsTableBody.innerHTML = ''; // Limpa tabela anterior

        const briefingData = {
            'Tipo de Evento:': document.getElementById('tipoEvento').value,
            'Cliente:': document.getElementById('cliente').value,
            'Local do Evento:': document.getElementById('localEvento').value,
            'Número de Pessoas:': document.getElementById('numPessoas').value,
            'Detalhes Adicionais:': document.getElementById('detalhesAdicionais').value,
        };

        try {
            const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Importante para evitar CORS no Apps Script Web App
                headers: {
                    'Content-Type': 'text/plain', // Apps Script web apps usually expect text/plain or application/x-www-form-urlencoded
                },
                body: JSON.stringify({ action: 'generateItems', briefing: briefingData }),
            });

            // Como 'no-cors' impede acesso ao corpo da resposta, precisamos de um truque ou de um Web App configurado para CORS
            // Para o MVP, a melhor forma é o Apps Script retornar 200 e tratar o erro internamente.
            // OU: Configurar o Apps Script para retornar um JSONP (mais complexo) ou uma redireção.
            // A abordagem mais simples com no-cors: o Apps Script precisa fazer o alert direto ou você tem que checar os logs.
            // O Ideal é ter um CORS Policy no Apps Script, mas para MVP, vamos tentar simplificar.

            // REVISÃO: Apps Script web apps precisam ser configurados para aceitar CORS se a origem for diferente (Vercel).
            // A forma mais fácil é o Apps Script retornar diretamente o JSON e ter CORS headers.
            // Let's assume Apps Script handles CORS by setting Content-Type to JSON and allowing origin.

            // Novo fetch (com headers corretos e espera de JSON)
            const realResponse = await fetch(APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'generateItems', briefing: briefingData }),
            });

            const result = await realResponse.json();

            if (result.success) {
                result.items.forEach(item => {
                    const row = itemsTableBody.insertRow();
                    row.insertCell().textContent = item.despesa;
                    row.insertCell().textContent = item.categoria;
                    row.insertCell().textContent = item.subcategoria;
                    row.insertCell().innerHTML = `<input type="text" value="">`; // Fornecedor manual
                    row.insertCell().textContent = item.unidadeMedida;
                    row.insertCell().innerHTML = `<input type="number" value="${item.quantidadePrevista}">`; // QTD editável
                    row.insertCell().innerHTML = `<input type="number" step="0.01" value="">`; // Valor Unitário manual
                    row.insertCell().innerHTML = `<input type="number" step="0.01" value="">`; // Valor Previsto manual
                });
                addInputListenersToTable(); // Adiciona listeners para novos inputs
                calculateTotal(); // Calcula total inicial
                salvarPdfBtn.style.display = 'block';
                errorMessage.style.display = 'none';
            } else {
                errorMessage.textContent = `Erro da IA: ${result.message}`;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao chamar Apps Script:', error);
            errorMessage.textContent = `Erro de conexão: ${error.message}. Verifique a URL do Web App ou os logs do Apps Script.`;
            errorMessage.style.display = 'block';
        } finally {
            loadingMessage.style.display = 'none';
        }
    });

    // Evento do botão "Salvar Proposta como PDF"
    salvarPdfBtn.addEventListener('click', async () => {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';

        const finalItems = [];
        const rows = itemsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const item = {};
            item.despesa = row.cells[COL_MAP['DESPESA']].textContent;
            item.categoria = row.cells[COL_MAP['CATEGORIA']].textContent;
            item.subcategoria = row.cells[COL_MAP['SUBCATEGORIA']].textContent;
            item.fornecedor = row.cells[COL_MAP['FORNECEDOR']].querySelector('input').value;
            item.unidadeMedida = row.cells[COL_MAP['UNIDADE DE MEDIDA']].textContent;
            item.quantidadePrevista = parseFloat(row.cells[COL_MAP['QUANTIDADE PREVISTA']].querySelector('input').value);
            item.valorUnitario = parseFloat(row.cells[COL_MAP['VALOR UNITÁRIO']].querySelector('input').value);
            item.valorPrevisto = parseFloat(row.cells[COL_MAP['VALOR PREVISTO']].querySelector('input').value);

            finalItems.push(item);
        });

        const finalPropostaData = {
            briefing: { // Reenvia o briefing para o nome do PDF
                'Tipo de Evento:': document.getElementById('tipoEvento').value,
                'Cliente:': document.getElementById('cliente').value,
                'Nome Evento:': document.getElementById('tipoEvento').value + ' ' + document.getElementById('localEvento').value // Um nome composto para o PDF
            },
            items: finalItems
        };

        try {
            const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'generatePdf', finalPropostaData: finalPropostaData }),
            });

            const result = await response.json();

            if (result.success && result.pdfUrl) {
                alert('PDF gerado com sucesso! Clique em OK para abrir o PDF.');
                window.open(result.pdfUrl, '_blank'); // Abre o PDF em nova aba
            } else {
                errorMessage.textContent = `Erro ao gerar PDF: ${result.message}`;
                errorMessage.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro ao chamar Apps Script para PDF:', error);
            errorMessage.textContent = `Erro de conexão ao gerar PDF: ${error.message}.`;
            errorMessage.style.display = 'block';
        } finally {
            loadingMessage.style.display = 'none';
        }
    });
});