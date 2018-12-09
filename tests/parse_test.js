

var normalizeDate = function(dateString){

    let temp = dateString.trim()
    temp = temp.replace(/[^0-9]/g, '');

    let len = temp.length
    let _date = ''
    let parseDate = ''

    if(len == 8){
        _date = temp[0] + temp[1] + '/' + temp[2] + temp[3] + '/' + temp[4] + temp[5] + temp[6] + temp[7]

        parseDate = Date.parse(_date)

        if(!isNaN(parseDate)){
            return _date
        }
        else{
            _date = temp[2] + temp[3] + '/' + temp[0] + temp[1] + '/' + temp[4] + temp[5] + temp[6] + temp[7]

            parseDate = Date.parse(_date)

            if(!isNaN(parseDate)){
                return _date
            }
            else{
                return null
            }
        }

    }
    else if(len == 7){

        _date = temp[0] + '/' + temp[1] + temp[2] + '/' + temp[3] + temp[4] + temp[5] + temp[6]

        parseDate = Date.parse(_date)

        if(!isNaN(parseDate)){
            return _date
        }
        else{
            _date = temp[0] + temp[1] + '/' + temp[2] + '/' +  temp[3] + temp[4] + temp[5] + temp[6]
            
            if(!isNaN(parseDate)){
                return _date
            }
            else{
                
                _date2 = temp[2] + '/' +  temp[3] +  temp[0] + '/' +  temp[1] + temp[4] + temp[5] + temp[6]

                parseDate = Date.parse(_date)

                if(!isNaN(parseDate)){
                    return _date
                }
                else{

                    _date = temp[2] + temp[3] + '/' + temp[0] + '/' +  temp[1] + temp[4] + temp[5] + temp[6]

                    parseDate = Date.parse(_date)

                    if(!isNaN(parseDate)){
                        return _date
                    }
                    else{
                        return null
                    }

                }

            }
        }


    }
    else if(len == 6){

        _date = temp[0] + temp[1] + '/' + temp[2] + temp[3] + '/' + temp[4] + temp[5]

        parseDate = Date.parse(_date)

        if(!isNaN(parseDate)){
            return _date
        }
        else{
            _date = temp[0] + '/' + temp[1] + '/' + temp[2] + temp[3] + temp[4] + temp[5]
            
            if(!isNaN(parseDate)){
                return _date
            }
            else{
                
                _date2 = temp[2] + temp[3] + '/' + temp[0] + temp[1] + '/' + temp[4] + temp[5]

                parseDate = Date.parse(_date)

                if(!isNaN(parseDate)){
                    return _date
                }
                else{

                    _date = temp[2] + '/' + temp[3] + '/' + temp[0] + temp[1] + temp[4] + temp[5]

                    parseDate = Date.parse(_date)

                    if(!isNaN(parseDate)){
                        return _date
                    }
                    else{
                        return null
                    }

                }

            }
        }
    }

}

function normalizeOCRValue(valueString){

    let _newValue = valueString

    let posComma = _newValue.indexOf(',')
    let posDot = _newValue.indexOf('.')
  
    if(posComma < posDot){
      _newValue = _newValue.replace(',', '').replace('.', ',')
    }
    else if(_newValue.indexOf(',') == -1){
      _newValue = _newValue.replace('.', ',')
    }
  
    return _newValue
}

let _valor = normalizeOCRValue('200.25')

console.log(_valor)