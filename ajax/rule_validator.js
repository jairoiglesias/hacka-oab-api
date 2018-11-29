const Cloudant = require('@cloudant/cloudant');
const { post } = require('axios')
const { promisify } = require('util')

let rp = require('request-promise').defaults({simple : false})

const VALIDATOR_URL = 'https://dokia-rules.mybluemix.net/api/validator'

// const ID_RULE = "90ad561435df4489b29e9fa8b4540315"

let MOCK_SOLICITACAO = {"id_solicitacao_cliente":"56098356","carteira":"Santander NPL1","origem":"A","agencia_fornecedor":"Ferreira e Chagas Advogados","devedor":"DEOCLECIO APARECIDO PARAIZO","nro_operacao_sistema":"33537205","nro_operacao":"620334073010263","setor":"PCJ","tipo":"GASTO","autorizacao":"","nro_despesa":"","data_gasto":"2018-02-07","tipo_gasto":"NC_Correios","moeda":"R$","valor":"19.70","status_pagamento":"Carregado","data_aprovacao":"2018-03-20","id_juizo":"","id_reclamo":"\r\n","cnpj":"11111111111","razao_social":"santander"}

const cloudant = Cloudant({
  "username": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix",
  "password": "e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641",
  "host": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com",
  "port": 443,
  "url": "https://96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix:e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641@96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com"
})

let ruleIDMap = [
  {id: '4bbe53e2dbb349a9b341e3baba0754ae', ruleName: 'NC_Correios'},
  {id: '17ac8fab76f84ea18ac7019271127438', ruleName: 'DIF. CORREIOS + C/ PETICAO + S/ PROT.'},
  {id: '5da71fcbd04c4a7696d4b4f1793dadfe', ruleName: 'DIF. CORREIOS + S/PETICAO'},
  {id: '8c4d261fb4454ff9a9e45c2fc84b13e0', ruleName: 'DIF. CORREIOS + C/ PETICAO + PROTOCOLADA'}
]

const TIPO_GASTO = 'NC_Correios'
const DOC_NAME = 'petição'

let ruleDataStorage = []
const TIMEOUT = 60000

// Recupera o ID de regra efetuando parse dos valores contidos no WKS/NLU e dadosSolicitacao

function getRuleIDDefinition(wksResponse, dadosSolicitacao, ocrData, authMecan){

  if(dadosSolicitacao.tipo_gasto == TIPO_GASTO){
    return ruleIDMap.filter(item => item.ruleName == TIPO_GASTO)[0]
  }
  else{

    let peticaoExiste = ocrData.filter((ocrItem) => {
      return ocrItem.name == DOC_NAME
    })

    if(peticaoExiste.length == 0){
      return ruleIDMap.filter(item => item.ruleName == 'DIF. CORREIOS + S/PETICAO')[0]
    }
    else{
      if(authMecan){
        return ruleIDMap.filter(item => item.ruleName == 'DIF. CORREIOS + C/ PETICAO + PROTOCOLADA')[0]
      }
      else{
        return ruleIDMap.filter(item => item.ruleName == 'DIF. CORREIOS + C/ PETICAO + S/ PROT.')[0]
      }
    }

  }

}

function getRulesData(){

  console.log('Populando array de regras')

  let url = 'https://dokia-rules.mybluemix.net/api/field/all'

  // Efetua o download do PDF
  let requestOptions = {
    method: 'GET',
    resolveWithFullResponse: true,
    uri: url,
    rejectUnauthorized: false
  }

  rp(requestOptions).then((response) => {

    ruleDataStorage = eval(response.body)

    setTimeout(() => {
      getRulesData()
    }, TIMEOUT)

  })

}

getRulesData()

function processRuleValidator(wksResponse, dadosSolicitacao, ocrData, authMecan){

  return new Promise((resolve, reject) => {

    const dokia = cloudant.db.use('dokia-validator')

    console.log('['+arguments.callee.name+'] Processando ...')
    console.log('==============================================')
    
    // Normaliza os dados de solicitação se necessário

    let _dadosSolicitacao = ''

    if(dadosSolicitacao == undefined){
      console.log('dadosSolicitacao nao recebidos ... Usando MOCK !!!')
      _dadosSolicitacao = MOCK_SOLICITACAO
    }
    else{
      console.log('dadosSolicitacao recebidos com sucesso !!!')
      _dadosSolicitacao = (typeof dadosSolicitacao == 'object') ? dadosSolicitacao : JSON.parse(dadosSolicitacao)
    }

    // console.log('+++++++++++++++++++++++++++++++++++++=')
    // console.log(_dadosSolicitacao)
    // console.log('==============================================')
    
    // Recupera dados do Cloudant
    promisify(dokia.view)('field', 'field-view').then((resultView)=>{

      if(wksResponse == undefined) {
        console.log('Nao existem entidades para validacao de regra')
        resolve()
        return
      }

      let inputs = []

      let promiseParseCloudant = new Promise((resolve, reject) => {

        let tamDadosSolicitacao = Object.keys(_dadosSolicitacao).length
        let tamWks = wksResponse.length

        resultView.rows.forEach(({value}, index) => {

          // Recupera os ID de regra referentes aos dados de solicitação

          let promiseDadosSolicitacao = new Promise((resolve, reject) => {

            Object.keys(_dadosSolicitacao).forEach((solicData, solicIndex) => {

              // console.log(solicData)
              // console.log(value.title)
              // console.log('############################')
              
              if(String(solicData) == String(value.title)){

                console.log('------------------------------')
                console.log('achou item')
                console.log(solicData)
                console.log(value)
                console.log('------------------------------')

                inputs.push({
                  idField: value._id,
                  value: _dadosSolicitacao[solicData]
                })

              }

              // console.log('==========')
              // console.log(tamDadosSolicitacao)
              // console.log(solicIndex)
              // console.log('==========')

              if(tamDadosSolicitacao == (solicIndex + 1)){
                
                resolve()
              }

            })

          })
          
          let promiseWks = new Promise((resolve, reject) => {

            wksResponse.forEach((wksData, wksIndex) => {

              if(wksData != undefined){

                let entities = wksData.entities

                if(entities){
                  
                  const [dbItem] = entities.filter(({type}) => type === value.title)
                  
                  if (dbItem){
                    const text = dbItem.text;
  
                    inputs.push({
                      idField: value._id,
                      value: text
                    })
      
                  }

                }

              }

              // console.log('==========')
              // console.log(tamWks)
              // console.log(wksIndex)
              // console.log('==========')

              if(tamWks == (wksIndex + 1)){
                
                resolve()
              }
              
            })

          })

          let promiseAuthMechan = new Promise((resolve, reject) => {

            if(authMecan == true){

              if(value.title == 'autenticacao_mecanica'){
                
                inputs.push({
                  idField: value._id,
                  value: ""
                })
  
                resolve()
  
              }
            }
            else{
              resolve()
            }


          })

          Promise.all([promiseDadosSolicitacao, promiseWks, promiseAuthMechan]).then(() => {
            resolve()
          })

        })

      })

      promiseParseCloudant.then(() => {

        console.log('Promises de regras de validacao resolvidas com sucesso!')

        // Recupera o ID da regra
        let rule = getRuleIDDefinition(wksResponse, _dadosSolicitacao, ocrData, authMecan)

        const data = {
          idRule: rule.id, 
          inputs: inputs
        }

        console.log('Parametros do EndPoint de Validacao de Regras!')
        console.log(data)
        console.log('****************')
        
        post(VALIDATOR_URL, data).then((response) => {
          
          console.log('response ruleValidator')
          console.log(response.data)

          // return response;

          let resp = {
            validationData: response.data,
            ruleName: rule.ruleName
          }

          resolve(resp)

        }).catch((error) => {
          
          console.log('==============================================')
          console.log('Erro na requisicao da validacao de regras')
          console.log(error.response.status)
          console.log(error)
          console.log('==============================================')
          resolve()

        })


      })


    })

  })

}

function processRuleValidatorV2(wksResponse, dadosSolicitacao, ocrData, authMecan){

  return new Promise((resolve, reject) => {

    console.log('['+arguments.callee.name+'] Processando ...')
    console.log('==============================================')
    
    // Normaliza os dados de solicitação se necessário

    let _dadosSolicitacao = ''

    if(dadosSolicitacao == undefined){
      console.log('dadosSolicitacao nao recebidos ... Usando MOCK !!!')
      _dadosSolicitacao = MOCK_SOLICITACAO
    }
    else{
      console.log('dadosSolicitacao recebidos com sucesso !!!')
      _dadosSolicitacao = (typeof dadosSolicitacao == 'object') ? dadosSolicitacao : JSON.parse(dadosSolicitacao)
    }

    let inputs = []
    let promiseParseCloudant = new Promise((resolve, reject) => {

      let tamDadosSolicitacao = Object.keys(_dadosSolicitacao).length
      let tamWks = wksResponse.length

      console.log(ruleDataStorage)
      console.log(typeof ruleDataStorage)

      ruleDataStorage.forEach((value, index) => {

        // Recupera os ID de regra referentes aos dados de solicitação

        let promiseDadosSolicitacao = new Promise((resolve, reject) => {

          Object.keys(_dadosSolicitacao).forEach((solicData, solicIndex) => {

            // console.log(solicData)
            // console.log(value.title)
            // console.log('############################')
            
            if(String(solicData) == String(value.title)){

              console.log('------------------------------')
              console.log('achou item')
              console.log(solicData)
              console.log(value)
              console.log('------------------------------')

              inputs.push({
                idField: value._id,
                value: _dadosSolicitacao[solicData]
              })

            }

            // console.log('==========')
            // console.log(tamDadosSolicitacao)
            // console.log(solicIndex)
            // console.log('==========')

            if(tamDadosSolicitacao == (solicIndex + 1)){
              
              resolve()
            }

          })

        })
        

        let promiseWks = new Promise((resolve, reject) => {

          wksResponse.forEach((wksData, wksIndex) => {

            if(wksData != undefined){

              let entities = wksData.entities

              if(entities){
                
                const [dbItem] = entities.filter(({type}) => type === value.title)
                
                if (dbItem){
                  const text = dbItem.text;

                  inputs.push({
                    idField: value._id,
                    value: text
                  })
    
                }

              }

            }

            // console.log('==========')
            // console.log(tamWks)
            // console.log(wksIndex)
            // console.log('==========')

            if(tamWks == (wksIndex + 1)){
              
              resolve()
            }
            
          })

        })

        let promiseAuthMechan = new Promise((resolve, reject) => {

          if(authMecan == true){

            if(value.title == 'autenticacao_mecanica'){
              
              inputs.push({
                idField: value._id,
                value: ""
              })

              resolve()

            }
          }
          else{
            resolve()
          }


        })

        Promise.all([promiseDadosSolicitacao, promiseWks, promiseAuthMechan]).then(() => {
          resolve()
        })

      })

    })

    promiseParseCloudant.then(() => {

      console.log('Promises de regras de validacao resolvidas com sucesso!')

      // Recupera o ID da regra
      let rule = getRuleIDDefinition(wksResponse, _dadosSolicitacao, ocrData, authMecan)

      const data = {
        idRule: rule.id, 
        inputs: inputs
      }

      console.log('Parametros do EndPoint de Validacao de Regras!')
      console.log(data)
      console.log('****************')
      
      post(VALIDATOR_URL, data).then((response) => {
        
        console.log('response ruleValidator')
        console.log(response.data)

        // return response;

        let resp = {
          validationData: response.data,
          ruleName: rule.ruleName
        }

        resolve(resp)

      }).catch((error) => {
        
        console.log('==============================================')
        console.log('Erro na requisicao da validacao de regras')
        console.log(error.response.status)
        console.log(error)
        console.log('==============================================')
        resolve()

      })


    })

  })

}

function RuleValidator(){

  this.execute = function(wksResponse, dadosSolicitacao, ocrData, authMecan){

    return new Promise((resolve, reject) => {
  
      console.log('['+arguments.callee.name+'] Processando ...')
      console.log('==============================================')
      
      // Normaliza os dados de solicitação se necessário
  
      let _dadosSolicitacao = ''
  
      if(dadosSolicitacao == undefined){
        console.log('dadosSolicitacao nao recebidos ... Usando MOCK !!!')
        _dadosSolicitacao = MOCK_SOLICITACAO
      }
      else{
        console.log('dadosSolicitacao recebidos com sucesso !!!')
        _dadosSolicitacao = (typeof dadosSolicitacao == 'object') ? dadosSolicitacao : JSON.parse(dadosSolicitacao)
      }
  
      let inputs = []
      let promiseParseCloudant = new Promise((resolve, reject) => {
  
        let tamDadosSolicitacao = Object.keys(_dadosSolicitacao).length
        let tamWks = wksResponse.length
  
        console.log(ruleDataStorage)
        console.log(typeof ruleDataStorage)
  
        ruleDataStorage.forEach((value, index) => {
  
          // Recupera os ID de regra referentes aos dados de solicitação
  
          let promiseDadosSolicitacao = new Promise((resolve, reject) => {
  
            Object.keys(_dadosSolicitacao).forEach((solicData, solicIndex) => {
  
              // console.log(solicData)
              // console.log(value.title)
              // console.log('############################')
              
              if(String(solicData) == String(value.title)){
  
                console.log('------------------------------')
                console.log('achou item')
                console.log(solicData)
                console.log(value)
                console.log('------------------------------')
  
                inputs.push({
                  idField: value._id,
                  value: _dadosSolicitacao[solicData]
                })
  
              }
  
              // console.log('==========')
              // console.log(tamDadosSolicitacao)
              // console.log(solicIndex)
              // console.log('==========')
  
              if(tamDadosSolicitacao == (solicIndex + 1)){
                
                resolve()
              }
  
            })
  
          })
          
  
          let promiseWks = new Promise((resolve, reject) => {
  
            wksResponse.forEach((wksData, wksIndex) => {
  
              if(wksData != undefined){
  
                let entities = wksData.entities
  
                if(entities){
                  
                  const [dbItem] = entities.filter(({type}) => type === value.title)
                  
                  if (dbItem){
                    const text = dbItem.text;
  
                    inputs.push({
                      idField: value._id,
                      value: text
                    })
      
                  }
  
                }
  
              }
  
              // console.log('==========')
              // console.log(tamWks)
              // console.log(wksIndex)
              // console.log('==========')
  
              if(tamWks == (wksIndex + 1)){
                
                resolve()
              }
              
            })
  
          })
  
          let promiseAuthMechan = new Promise((resolve, reject) => {
  
            if(authMecan == true){
  
              if(value.title == 'autenticacao_mecanica'){
                
                inputs.push({
                  idField: value._id,
                  value: ""
                })
  
                resolve()
  
              }
            }
            else{
              resolve()
            }
  
  
          })
  
          Promise.all([promiseDadosSolicitacao, promiseWks, promiseAuthMechan]).then(() => {
            resolve()
          })
  
        })
  
      })
  
      promiseParseCloudant.then(() => {
  
        console.log('Promises de regras de validacao resolvidas com sucesso!')
  
        // Recupera o ID da regra
        let rule = getRuleIDDefinition(wksResponse, _dadosSolicitacao, ocrData, authMecan)
  
        const data = {
          idRule: rule.id, 
          inputs: inputs
        }
  
        console.log('Parametros do EndPoint de Validacao de Regras!')
        console.log(data)
        console.log('****************')

        let requestOptions = {
          method: 'POST',
          uri: VALIDATOR_URL,
          body: data,
          json: true
        }
        
        // post(VALIDATOR_URL, data).then((response) => {

        rp(requestOptions).then((response) => {
          
          console.log('response ruleValidator')
          console.log(response.body)
  
          // return response;
  
          let resp = {
            validationData: response.body,
            ruleName: rule.ruleName
          }
          
          resolve(resp)
  
        }).catch((error) => {
          
          console.log('==============================================')
          console.log('Erro na requisicao da validacao de regras')
          console.log(error.response.status)
          console.log(error)
          console.log('==============================================')
          resolve()
  
        })
  
  
      })
  
    })

  }

}

module.exports = {
  processRuleValidator,
  processRuleValidatorV2,
  RuleValidator
}