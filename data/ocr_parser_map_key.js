let documentWordKeys = [
    {
        name: 'guia',
        mapKeys: [
            {
                keys: ['guia', 'número', 'documento', 'banco', 'valor', 'total', '´processo', 'vencimento', 'agência', 'código', 'pagador', 'autentica'],
                percAcc: 90
            },
            {
                keys: ['guia', 'recolhimento', 'pedido', 'nome', 'cpf', 'rg', 'processo', 'valor', 'total', 'código'],
                percAcc: 90
            },
            {
                keys: ['guia', 'processo', 'valor', 'total', 'código', 'autentica', 'número', 'série', 'emissão', 'desarquivamento'],
                percAcc: 90
            },
            {
                keys: ['guia', 'número', 'documento', 'banco', 'valor', 'vencimento', 'agência', 'código', 'pagador', 'autentica'],
                percAcc: 90
            },
            {
                keys: ['guia', 'recolhimento', 'autentica', 'valor', 'processo', 'natureza', 'juizo', 'comarca', 'receita'],
                percAcc: 90
            },
            {
                keys: ['guia', 'requerente', 'autentica', 'valor', 'processo', 'natureza', 'comarca', 'arrecadação'],
                percAcc: 90
            }
        ]
    },
    {
        name: 'comprovante',
        mapKeys: [
            {
                keys: ['comprovante', 'banco', 'valor', 'barras', 'autentica', 'total'],
                percAcc: 90
            },{
                keys: ['comprovante', 'data', 'transação', 'autentica', 'valor', 'agência'],
                percAcc: 90
            },
            {
                keys: ['comprovante', 'data', 'chave', 'segurança', 'vencimento', 'valor'],
                percAcc: 90
            },
            {
                keys: ['comprovante', 'banco', 'valor', 'barras', 'autentica', 'conta'],
                percAcc: 90
            },
            {
                keys: ['comprovante', 'correios', 'valor', 'cep', 'destino', 'caixa'],
                percAcc: 90
            },
            {
                keys: ['valor', 'cep', 'operador', 'postagem', 'peso', 'dimensoes', 'preco', 'comprovante', 'cliente'],
                percAcc: 60
            },
            {
                keys: ['valor', 'cep', 'operador', 'postagem', 'peso', 'objeto', 'contrato', 'atendimento', 'cidade'],
                percAcc: 60
            },
            {
                keys: ['comprovante', 'bradesco', 'barras', 'pagador', 'sacador', 'data', 'transação', 'valor', 'autentica', 'multa', 'juros', 'agência'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'petição',
        mapKeys: [
            {
                keys: ['ação', 'execução', 'autos', 'deferimento', 'requerer'],
                percAcc: 80
            },
            {
                keys: ['ação', 'execução', 'processo', 'deferimento', 'requerer'],
                percAcc: 80
            },
            {
                keys: ['face', 'processo', 'deferimento', 'requerer', 'despacho'],
                percAcc: 80
            },
            {
                keys: ['face', 'processo', 'extinguir', 'ação', 'resolução', 'abandono'],
                percAcc: 80
            },
            {
                keys: ['ação', 'monitoria', 'processo', 'autos', 'requerer'],
                percAcc: 80
            },
            {
                keys: ['ação', 'apreensão', 'processo', 'autos', 'requerer'],
                percAcc: 80
            },
            {
                keys: ['move', 'desfavor', 'processo', 'autos', 'requerer', 'deferimento', 'oab'],
                percAcc: 70
            },
            {
                keys: ['ativos', 'processo', 'autos', 'requerer', 'deferimento', 'penhora', 'oab'],
                percAcc: 70
            },
            {
                keys: ['paradeiro', 'processo', 'requer', 'deferimento', 'bacenjud', 'oab'],
                percAcc: 70
            }
        ]
    },
    {
        name: 'print tj',
        mapKeys: [
            {
                keys: ['comarca', 'orgão', 'vara', 'processo', 'advogado', 'data', 'disponibilização', 'inclusão', 'http'],
                percAcc: 80
            },
            {
                keys: ['processo', 'polo', 'fase', 'valor', 'http', 'eventos', 'navegação', 'arquivo'],
                percAcc: 80
            },
            {
                keys: ['processo', 'partes', 'movimentações', 'valor', 'http', 'data', 'foro'],
                percAcc: 80
            },
            {
                keys: ['processo', 'partes', 'movimenta', 'executado', 'exequente', 'http', 'consulta'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'determinação judicial',
        mapKeys: [
            {
                keys: ['processo', 'exequente', 'executado', 'intimação', 'valor', 'causa', 'classe', 'assunto'],
                percAcc: 80
            }
        ]
    }
]

module.exports = documentWordKeys
