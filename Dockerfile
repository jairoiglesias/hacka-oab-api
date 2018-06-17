#
# Tesseract 4 OCR Runtime Environment - Docker Container
#

# Versao Modificada para subir juntamente a biblioteca do Graphics Imagic para converter PDF para Imagens

FROM ubuntu:16.04

RUN apt-get update && apt-get install -y software-properties-common && add-apt-repository -y ppa:alex-p/tesseract-ocr
RUN apt-get update && apt-get install -y tesseract-ocr-por 
RUN apt-get update && apt-get install graphicsmagick -y 
RUN apt-get update && apt-get install imagemagick -y
RUN apt-get update && apt-get install libpng-dev -y && apt-get install zlib1g-dev -y && apt-get install libjasper-dev -y && apt-get install libjasper1 -y
RUN apt-get install -y nodejs npm

RUN update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10

ENV HOME=/home/app

WORKDIR $HOME

COPY . $HOME

RUN npm install

EXPOSE 3001

# CMD ["node", "bin/www"]