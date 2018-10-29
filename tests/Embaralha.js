

// let texto = "Business\nBANCO DO BRASIL\nRG\nGuia de Recolhimento Nº Pedido 2018041990451703\nPoder Judiciário - Tribunal de Justiça\nFundo Especial de Despesa - FEDTJ\nNome\nCPF\nCNPJ\nFIDC NÃO PADRONIZADOS NPL1\n09.263.012/0001-83\nN° do processo\nUnidade\nCEP\n0044739-49.2010.8.26\n5a VARA CÍVEL\n01311-920\nEndereço\nCódigo\nAv. Paulista, 1111 - Bairro: Bela Vista - São Paulo/SP\n120-1\nHistórico\nValor\nFundo de Investimento em Direitos Creditórios Não Padronizados NPL1 x AR Comercio e Treinamento\n27,45\nEmpresarial LTDA - Nº Processo: 0044739-49.2010.8.26.0506 - 5a Vara Cível - Comarca: Ribeirão\nTotal\nPreto/SP\n27,45\nO Tribunal de justiça não se responsabiliza pela qualidade da cópia extraída de peça pouco legível.\nImportante: evitem amassar, dobrar ou perfurar as contas, para não danificar o código de barras.\nMod. 0.70.731-4 - Out/17 - SISBB 17284 - feso\n1° Via - Unidade geradora do serviço, 2 via - Contribuinte e 3° via - Banco\n868700000003 274551174001 | 112010926305 120001837037\nCorte aqui\n"

let texto = "Código\nAv. Paulista, 1111 - Bairro: Bela Vista - São Paulo/SP\n120-1\nHistórico\nValor\nFundo de Investimento em Direitos Creditórios Não Padronizados NPL1 x AR Comercio e Treinamento\n27,45\nEmpresarial LTDA - Nº Processo: 0044739-49.2010.8.26.0506 - 5a Vara Cível - Comarca: Ribeirão\nTotal\nPreto/SP\n27,45\nO Tribunal de justiça não se responsabiliza pela qualidade da cópia extraída de peça pouco legível.\nImportante: evitem amassar, dobrar ou perfurar as contas, para não danificar o código de barras.\nMod. 0.70.731-4 - Out/17 - SISBB 17284 - feso\n1° Via - Unidade geradora do serviço, 2 via - Contribuinte e 3° via - Banco\n868700000003 274551174001 | 112010926305 120001837037\nCorte aqui\n"


let arrayTexto = texto.split(/\n/g)
let arrayNewTexto = []
let lastIndexShuffle = 0

arrayTexto.forEach((lineData, lineIndex) => {

    let mod = lineIndex % 2

    // console.log(lineData)
    // console.log(mod)
    // console.log('=============================')

    // if(mod == 0 && lineIndex != (lastIndexShuffle + 1) && lineIndex != (lastIndexShuffle + 2)){
    //     arrayNewTexto.push(arrayTexto[lineIndex])
    //     arrayNewTexto.push(arrayTexto[lineIndex + 2])
    //     lastIndexShuffle = lineIndex
    // }
    // else if(mod == 1){

    // }

    arrayNewTexto.push(arrayTexto[lastIndexShuffle])
    arrayNewTexto.push(arrayTexto[lastIndexShuffle + 1])
    lastIndexShuffle = lineIndex + 1

})

console.log(arrayTexto)
console.log(arrayNewTexto)