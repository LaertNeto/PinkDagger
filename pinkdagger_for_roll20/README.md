# 🗡️ PinkDagger for Roll20

[![Versão](https://img.shields.io/badge/vers%C3%A3o-0.3.0-E85D9E.svg)](https://github.com/LaertNeto/PinkDagger)
[![Manifest](https://img.shields.io/badge/manifest-v3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Compatibilidade](https://img.shields.io/badge/compatibilidade-Chromium%20(Chrome%20%7C%20Edge%20%7C%20Brave)-success.svg)](#-instalação-e-configuração-em-navegadores-chromium)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-yellow.svg)](LICENSE)

Interface customizada, interativa e moderna para fichas e PNJs de **Daggerheart** diretamente no **Roll20**.

---

## 📖 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Por que o PinkDagger foi criado?](#-por-que-o-pinkdagger-foi-criado)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Instalação e Configuração em Navegadores Chromium](#-instalação-e-configuração-em-navegadores-chromium)
  - [Google Chrome](#1-google-chrome)
  - [Microsoft Edge](#2-microsoft-edge)
  - [Brave Browser, Opera e outros baseados em Chromium](#3-brave-browser-opera-e-outros-baseados-em-chromium)
- [Como Utilizar no Roll20](#-como-utilizar-no-roll20)
- [Como Atualizar a Extensão](#-como-atualizar-a-extensão)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Solução de Problemas](#-solução-de-problemas)
- [Licença](#-licença)
- [Avisos Legais](#-avisos-legais)

---

## 🎯 Sobre o Projeto

O **PinkDagger for Roll20** é uma extensão de navegador (Manifest V3) desenvolvida para enriquecer a experiência de jogo do sistema de RPG **Daggerheart** (criado pela Darrington Press) dentro do Roll20.

A extensão adiciona automaticamente uma nova aba chamada **PinkDagger** à janela de qualquer personagem ou PNJ (NPC) no Roll20, transformando a manipulação de dados — que antes era feita através de listas cruas de atributos — em uma ficha visual estilizada, responsiva e pronta para o combate e a interpretação.

---

## 💡 Por que o PinkDagger foi criado?

Jogar novos sistemas de RPG em mesas virtuais (VTTRPGs) como o Roll20 frequentemente esbarra em algumas limitações:

1. **Ausência de Fichas Prontas ou Oficiais**: Sistemas recentes como *Daggerheart* muitas vezes não contam com fichas oficiais ou completas no Roll20 acessíveis para todos.
2. **Dependência de Contas Pagas (Roll20 Pro)**: Para usar fichas customizadas desenvolvidas pela comunidade nativamente no Roll20, o criador da mesa necessita de uma assinatura *Pro*. O PinkDagger contorna essa barreira, funcionando perfeitamente em **qualquer conta gratuita**.
3. **Fadiga de Gestão para Jogadores e Mestres**:
   - Preencher e controlar manualmente contadores como Vida, Fadiga, Armadura e Esperança na aba genérica de *Attributes & Abilities* é demorado, confuso e sujeito a erros no calor da sessão.
   - Criar blocos de estatísticas de monstros e PNJs manualmente exige copiar atributo por atributo.
4. **Agilidade nas Rolagens**: Daggerheart possui mecânicas dinâmicas de dados e limiares de dano. Ter botões de ação e macros integrados que já enviam as rolagens formatadas diretamente para o chat do Roll20 acelera o ritmo do jogo.

O PinkDagger resolve esses problemas injetando uma camada de interface rica e inteligente que **sincroniza em tempo real com os atributos nativos do Roll20** (`Attributes & Abilities`). Isso significa que todas as alterações ficam salvas de forma persistente na sua campanha, sem risco de perda de dados.

---

## ✨ Principais Funcionalidades

- **Aba Nativa PinkDagger**: Inserida ao lado das abas padrões (*Bio & Info* e *Attributes & Abilities*) de cada ficha.
- **Painel Completo de Personagem (PJ)**:
  - Visualização e alteração de Atributos: *Agilidade, Força, Acuidade, Instinto, Presença e Conhecimento*.
  - Trackers visuais com botões de incremento/decremento para *Vida*, *Fadiga*, *Armadura* e *Esperança*.
  - Controle de Moedas/Dinheiro (Punhado, Bolsa, Baú).
  - Gestão de Cartas de Domínio, Ancestralidade, Comunidade, Subclasse e Experiências.
  - Inventário e gerenciamento de Armas com botões de rolagem de ataque e dano integrados ao chat.
- **Ferramentas Exclusivas para o Mestre (PNJs / Adversários)**:
  - **Importador Automático de PDF**: Copie o texto de um PNJ do livro de regras ou aventura em PDF e cole no PinkDagger. O parser reconhece automaticamente nome, tipo, dificuldade, limiares, vida, fadiga, ataques, experiências e habilidades!
  - Edição ágil de fichas de monstros e aliados sem sair da tela do jogo.
- **Sincronização Bidirecional**: As alterações feitas na interface do PinkDagger são refletidas instantaneamente nos atributos do Roll20 e vice-versa.

---

## 🚀 Instalação e Configuração em Navegadores Chromium

Como o PinkDagger é distribuído como código aberto, a instalação é feita de forma simples e rápida através do **Modo do Desenvolvedor** em qualquer navegador baseado em Chromium.

### Pré-requisito: Obter os Arquivos

1. Faça o clone ou baixe este repositório no seu computador:
   - Se usa Git:
     ```bash
     git clone https://github.com/LaertNeto/PinkDagger.git
     ```
   - Ou baixe o arquivo `.zip` pelo GitHub e extraia os arquivos em uma pasta de sua preferência.
2. Certifique-se de que a pasta contém o arquivo `manifest.json`.

---

### 1. Google Chrome

1. Abra o Google Chrome.
2. Na barra de endereços, digite:
   ```text
   chrome://extensions
   ```
   e pressione <kbd>Enter</kbd> (ou acesse o menu de três pontos no canto superior direito > **Extensões** > **Gerenciar extensões**).
3. No canto superior direito da página, ative a chave **Modo do desenvolvedor** (*Developer mode*).
4. No canto superior esquerdo, clique no botão **Carregar sem compactação** (*Load unpacked*).
5. Na janela do gerenciador de arquivos, selecione a pasta do projeto (onde está localizado o arquivo `manifest.json`).
6. Pronto! A extensão **PinkDagger for Roll20** aparecerá na sua lista de extensões ativas.

---

### 2. Microsoft Edge

1. Abra o Microsoft Edge.
2. Na barra de endereços, digite:
   ```text
   edge://extensions
   ```
   e pressione <kbd>Enter</kbd> (ou acesse o menu de três pontos > **Extensões** > **Gerenciar extensões**).
3. Na barra lateral esquerda (ou na parte superior), ative a opção **Modo de desenvolvedor** (*Developer mode*).
4. Clique no botão **Carregar descompactada** (*Load unpacked*).
5. Selecione a pasta onde se encontra o arquivo `manifest.json` do PinkDagger.
6. A extensão estará instalada e pronta para o uso.

---

### 3. Brave Browser, Opera e outros baseados em Chromium

- **Brave Browser**:
  1. Acesse `brave://extensions`.
  2. Ative a opção **Modo do desenvolvedor** no canto superior direito.
  3. Clique em **Carregar sem compactação** e selecione a pasta da extensão.
- **Opera / Opera GX**:
  1. Acesse `opera://extensions`.
  2. Ative o **Modo do desenvolvedor** no canto superior direito.
  3. Clique em **Carregar extensão descompactada** e escolha a pasta do projeto.
- **Vivaldi**:
  1. Acesse `vivaldi://extensions`.
  2. Habilite o **Modo do desenvolvedor** e clique em **Carregar descompactada**.

> 💡 **Dica:** Para fixar o ícone do PinkDagger na barra de ferramentas do seu navegador, clique no ícone de "quebra-cabeça" (Extensões) ao lado da barra de endereços e clique no alfinete/fixador correspondente ao PinkDagger.

---

## 🎲 Como Utilizar no Roll20

1. Abra sua mesa de RPG no Roll20 normalmente (`https://app.roll20.net/editor/` ou `https://app.roll20.net/editor`).
2. Abra o painel do **Diário** (*Journal*) e abra a ficha de qualquer personagem ou PNJ existente (ou crie um novo personagem).
3. Observe que, além das abas padrão (**Bio & Info** e **Attributes & Abilities**), agora existe uma aba destacada em rosa com o nome **PinkDagger**.
4. Clique na aba **PinkDagger** para abrir a ficha interativa:
   - Se for um novo personagem, preencha os dados e atributos; eles serão automaticamente criados na aba de atributos.
   - Se for um PNJ/Mestre, utilize as ferramentas de criação rápida ou o importador de texto do livro.
5. Ao rolar testes, ataques ou habilidades, o comando de rolagem correspondente será enviado diretamente ao chat do Roll20 com o template visual adequado.

---

## 🔄 Como Atualizar a Extensão

Sempre que houver atualizações no repositório (novas versões ou correções de bugs):

1. Atualize a sua pasta local:
   ```bash
   git pull
   ```
   *(ou baixe os novos arquivos e substitua na mesma pasta)*.
2. Abra a página de extensões do seu navegador:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Localize o card do **PinkDagger for Roll20**.
4. Clique no ícone de **Recarregar** (ícone circular com seta 🔄).
5. Recarregue a página da sua mesa do Roll20 (<kbd>F5</kbd> ou <kbd>Ctrl</kbd> + <kbd>F5</kbd>).

---

## 🛠️ Solução de Problemas

- **A aba PinkDagger não aparece na ficha do Roll20:**
  1. Verifique se a extensão está ativada na página de extensões do navegador (`chrome://extensions` ou `edge://extensions`).
  2. Recarregue a página do Roll20 pressionando <kbd>Ctrl</kbd> + <kbd>F5</kbd>.
  3. Verifique se você está na página de jogo com a URL correta (`https://app.roll20.net/editor*`).
  4. Caso tenha acabado de atualizar os arquivos, recarregue a extensão no navegador antes de atualizar o Roll20.
- **A ficha abre em uma janela externa separada (pop-out):**
  - O Roll20 permite abrir fichas em pop-outs. O script tenta detectar frames e janelas filhas; caso encontre instabilidades, use a ficha integrada à janela principal do Roll20.
- **Erros de caracteres ao importar texto de PDF:**
  - O `npcParser.js` possui tratamento nativo para ligaduras de PDF (ex: "fi", "fl", "ffi") e caracteres especiais. Caso algum texto específico apresente formatação inesperada, revise o bloco copiado antes de confirmar a importação.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.

---

## 📜 Avisos Legais

- **Daggerheart** é marca registrada e criação de **Darrington Press, LLC**.
- **Roll20** é marca registrada da **The Orr Group, LLC**.
- Este é um projeto não-oficial mantido pela comunidade de jogadores, sem afiliação direta com a Darrington Press ou com o Roll20. Desenvolvido de fãs para fãs.
