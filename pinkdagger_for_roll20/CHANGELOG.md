# Changelog

Todas as mudanças relevantes do **PinkDagger for Roll20** ficam registradas aqui, da versão mais nova para a mais antiga.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/). As seções de cada versão são: **Novidades**, **Melhorias**, **Correções** e **Outros**.

## [0.6.0] - 2026-11-23

### Novidades
- **Calculadora de Combate:** clique com o botão direito no ícone da extensão para planejar encontros com os Pontos de Batalha do livro.
- **Atualização com um clique (Windows):** clique com o botão direito no ícone da extensão > **Verificar atualizações**. A janela mostra a versão instalada, a mais recente e as novidades. Com o auxiliar instalado (`updater\instalar.bat`, uma vez só), o botão **Atualizar agora** baixa a última release do GitHub, substitui os arquivos e recarrega a extensão; depois é só dar F5 no Roll20.
- **GM Roll:** novo botão **GM Roll** ao lado da ⚙️ na ficha. Ligado (em rosa), todas as rolagens feitas pela aba PinkDagger daquela ficha vão fechadas só para o mestre, como um `/w gm`, falando como o personagem. Fica salvo por ficha, no seu navegador, e não afeta outras pessoas que usam a mesma ficha. Fichas em pop-out sem a janela do Roll20 aberta não mostram o botão.
- **Visualização Oficial:** nova opção em ⚙️ > **Visualização da ficha** que mostra a ficha de Personagem no estilo da ficha digital oficial de Daggerheart: nome com Comunidade, Ancestralidade, Classe e Subclasse, escudos de Evasão, Armadura e Nível, atributos em flâmulas com as ações de cada um, e três colunas com Vida e Fadiga (com os limiares de dano), Armas Ativas (com a Proficiência, e o dano com a fórmula em cima e o tipo embaixo, como "2d6+3 / MÁGICO") e Esperança com Experiências. Embaixo ficam as abas **Efeitos e Características** (Cartas de Domínio, Classe, Subclasse, Esperança e Herança), **Equipamento**, **Detalhes** (Passando de Nível e Outros Macros) e **Textos**. Em **Equipamento**, o dinheiro vira uma barra de **Ouro** com moedas para os punhados, saquinhos para as bolsas e um baú: clique numa moeda ou saquinho para marcar até ele (clicar no último marcado desmarca). O **+** passa 10 punhados para 1 bolsa e 10 bolsas para 1 baú, e o **−** faz o caminho inverso, quebrando uma bolsa ou um baú quando precisa. O inventário continua sendo uma caixa de texto livre. Tudo continua clicável para rolar, editar e marcar recursos como na visualização de sempre. Os botões −/+ de Evasão e limiares aparecem ao passar o mouse. Em fichas mais estreitas (como fixada no canto da tela), as três colunas ficam mais compactas e continuam lado a lado; Esperança e Experiências só descem para baixo quando a ficha fica bem estreita. Fichas de Companheiro e NPC continuam na visualização Clássica.
- **Importar personagem de PDF:** na tela de configurar ficha nova, o card de Personagem ganhou o botão **📄 Importar de PDF**. Escolha o PDF da ficha oficial preenchível do Daggerheart (em inglês) e a ficha mostra um resumo (nome, classe, nível e quantos itens serão criados); em **Importar e Preencher**, ela cria sozinha os atributos, Nível, Proficiência, Evasão, limiares, Vida, Fadiga, Armadura, Esperança, ouro, domínios, experiências, armas ativas (com atributo, alcance e dano), Classe, Subclasse (com o atributo de conjuração), habilidade de Esperança, Ancestralidade, Comunidade, cartas de domínio, inventário (com a armadura e as armas guardadas) e os textos da página de detalhes na aba **Textos**. O nome do personagem também é preenchido se a ficha estiver sem nome. As cartas de domínio entram com **Nível 0** e todas no loadout: troque o nível pelo ✏️ e mova para a Reserva as que estiverem guardadas. Só funciona em ficha vazia, e só com o PDF preenchível (não com versões impressas ou escaneadas).
- **Domínios do personagem:** a ficha mostra os dois domínios do personagem. Nas visualizações Clássica e Simplificada eles ficam no topo, como "Domínios: Arcano & Meia-Noite", ao lado de Nível e Proficiência. Na Oficial ficam ao lado do escudo de Nível, embaixo de um estandarte (ex.: "ARCANO & MEIA-NOITE"), como na ficha oficial. Eles vêm dos atributos `Dominio1` e `Dominio2` (também valem `Domínio 1`, `dominio_1`...). Sem domínios configurados aparece um botão **+**; clicar nele, ou nos nomes, abre uma caixa para escrever os dois separados por `&` (ex.: `Arcano & Meia-Noite`), e a ficha cria os atributos que faltarem. Esses atributos não aparecem em Recursos Personalizados. Em fichas estreitas (como fixada no canto), o topo agora quebra em linhas em vez de empurrar os botões ⚙️ e 📌 para fora.
- **Contadores nas cartas:** Cartas de Domínio, Classe, Subclasse, Esperança, Ancestralidade e Comunidade podem ter contadores (fichas, usos, cargas...). Crie em ✏️ > **Contadores** > **+ Adicionar Contador**, com nome e máximo. No card aparece uma caixinha `− 2/3 FICHAS +` (nas visualizações Clássica e Oficial) que vai de 0 até o máximo; clicar nela não rola a carta. O valor fica salvo na própria macro, como `{{Fichas=2/3}}`, então acompanha a carta quando ela vai para a Reserva ou muda de nome, e aparece na rolagem do chat. No modo Simplificado, os contadores aparecem no card que abre ao passar o mouse.
- **Imagens e GIFs nas cartas:** o ✏️ das Cartas de Domínio, Classe, Subclasse, Esperança, Ancestralidade, Comunidade e Habilidades de NPC ganhou o campo **Link da imagem ou GIF**, com prévia. O link vai no fim da descrição no formato `[x](link)`, que o chat do Roll20 mostra como imagem ao usar a carta. Na ficha, o link some do texto e a imagem aparece no card: como fundo atrás do nome na visualização Oficial e como faixa abaixo do nome na Clássica. Cartas que já tinham `[x](link)` escrito na descrição passam a mostrar a imagem sem precisar editar. Deixar o campo vazio tira a imagem.
- **Regras em negrito nas cartas:** o texto das Cartas de Domínio, Classe, Subclasse, Esperança, Herança, Armas e Habilidades de NPC e Companheiro destaca em negrito, sozinho, os trechos de regra: gastar, marcar, limpar ou ganhar recursos (ex.: "Gaste 1 Ponto de Esperança", "marcar 1 PF", "Marque um número qualquer de Pontos de Fadiga", "gastar até 3 Pontos de Esperança", "Limpe 1d4 PF"), testes e rolagens (ex.: "teste de conjuração (15)", "teste de Instinto", "teste de reação de Agilidade", "rolagem de ataque"), dados (ex.: "1d20+3", "2d6"), vantagem e desvantagem, dano mágico e físico, e alcances depois de "até" ou "alcance" (ex.: "a até **Longe**"). Também funciona com cartas em inglês ("Spend 3 Hope", "Mark a Stress", "Spellcast Roll", "within **Far** range"). Só muda o que aparece na ficha: a macro e o chat continuam com o texto original.

### Melhorias
- O menu ⚙️ agora se chama **Visualização da ficha** e tem três opções: **Clássico** (o antigo "Detalhado"), **Simplificado** e **Oficial**. Quem já usava Detalhado ou Simplificado continua com a mesma escolha.
- **Alcance das armas:** o ✏️ da arma ganhou o campo **Alcance**, com sugestões (Corpo a Corpo, Muito Próximo, Próximo, Longe, Muito Longe) e espaço para escrever outro. O alcance aparece no card da arma (em azul, ao lado do atributo, na visualização Clássica; embaixo do nome, na Oficial) e também na rolagem do chat. Armas novas já vêm com Alcance "Corpo a Corpo". Deixar o campo vazio tira o alcance da arma.
- **Renomear armas:** o ✏️ da arma ganhou o campo **Nome da Arma**. O nome novo aparece no card, no título da rolagem no chat e no nome da macro em **Atributos e Habilidades** (mantendo o prefixo `wea_`). Se já existir outra macro com o nome novo, a ficha avisa e mantém o nome antigo da macro, como já acontece com as cartas.

### Correções
- Cartas com mais de um campo sem nome na macro (ex.: `{{texto}} {{outro texto}}`) mostravam só o último no card; agora os textos aparecem juntos.
- O texto do **Inventário** e das caixas da aba **Textos** podia se perder: ele só era salvo ao sair da caixa, então fechar a ficha, dar F5, trocar de janela ou ter a ficha redesenhada com o cursor ainda nela descartava o que foi escrito. Agora o texto é salvo 1 segundo depois de parar de digitar, e também antes de a ficha ser redesenhada e quando a janela é fechada.
- Textos do Inventário com caracteres como `&amp;` ou `<` eram alterados quando a ficha era redesenhada.
- Mudar o nome de uma carta (Domínio, Ancestralidade, Comunidade, Classe, Subclasse, Esperança ou Habilidade de PNJ) pela ficha não mudava o nome da macro em **Atributos e Habilidades**. Agora a macro é renomeada junto, mantendo o prefixo (ex.: `dom_`); se já existir outra macro com o nome novo, a ficha avisa e mantém o nome antigo. ([#3](https://github.com/LaertNeto/PinkDagger/issues/3))
- Com a ficha fixada no canto da tela (ou qualquer ficha estreita), as Experiências ficavam espremidas. Agora Defesas e Experiências ficam uma embaixo da outra, e em fichas bem estreitas cada experiência ocupa uma linha. ([#2](https://github.com/LaertNeto/PinkDagger/issues/2))

### Outros
- Novas permissões: `contextMenus` (menu do ícone da extensão) e `nativeMessaging` (conversa com o auxiliar de atualização).

## [0.5.0] - 2026-11-02

### Novidades
- **Ficha de Companheiro Animal:** novo tipo de ficha com Proficiência, Evasão, Fadiga, ataque, Experiências e Habilidades.
- **Aba Textos:** a ficha agora tem as abas "Ficha" e "Textos", onde você pode criar caixas de texto livres para anotações. O tamanho de cada caixa fica salvo por personagem.
- **Fichas de Mestre editáveis:** nome, bônus, alcance, dano e tipo de dano do ataque de NPC agora podem ser editados direto na ficha, assim como as habilidades.
- **Abertura automática na aba PinkDagger:** fichas já configuradas abrem direto na aba PinkDagger. Fichas de outros sistemas continuam na aba nativa.
- **Página de configurações da extensão:** permite ligar ou desligar a abertura automática, que vem ligada por padrão.
- **Recursos ajustáveis pela ficha:** Vida, Fadiga, Armadura e Esperança agora têm botões de − e +.

### Melhorias
- **Atributos principais em qualquer ficha:** em fichas não totalmente adaptadas, rolar um atributo sem macro cria a macro e faz a rolagem.
- **Seleção de tipo de ficha:** as fichas de Companheiro e Medo agora ficam em "Outros tipos de ficha".
- **Carregamento mais rápido:** novas fichas abertas são detectadas em menos tempo.

### Correções
- Valores como dinheiro e defesas deixavam de ser salvos depois que o Roll20 recriava a linha do atributo.
- Caixas de seleção em cards com vários campos podiam marcar a opção errada.
- O ajuste de posição da ficha fixada continuava rodando depois de desafixar a ficha.

### Outros
- README com guia de instalação, uso, atualização e solução de problemas.
- Licença MIT adicionada.
- Metadados para Firefox adicionados ao manifest (versão mínima 128).
- Nova permissão `storage`, usada para guardar as configurações da extensão.

## [0.4.0] - 2026-10-26

### Novidades
- **Ficha de Medo (para o mestre):** novo tipo de ficha, `pinkdagger_fear`, criado pelo atributo de mesmo nome. Mostra o Medo atual com botões − e + e uma fileira de bolinhas (de 0 até o máximo do atributo, ou 12). Cada clique manda o valor antigo e o novo no chat, e as macros `Menos-Medo` e `Mais-Medo` são criadas automaticamente.
- **Fixar ficha na tela (dock):** o botão 📌 fixa a ficha no canto inferior direito mostrando só a tela PinkDagger. O tamanho pode ser ajustado pela alça e fica salvo; duplo clique na alça volta ao padrão. Só uma ficha fica fixada por vez.
- **Reserva de Cartas de Domínio:** novo prefixo de macro `vau_`. O botão 🗃️ abre a Reserva, com as cartas ativas de um lado e as reservadas do outro; clique numa carta para mudá-la de lado.
- **Configurações e visualização simplificada:** o botão ⚙️ abre o menu de configurações, com os modos **Detalhado** e **Simplificado** (lista compacta com o card completo ao passar o mouse).

### Melhorias
- O título da aba mostra o nome do personagem, ex.: **Azmon (PinkDagger)**.
- As experiências da ficha de personagem aparecem 2 por linha.
- A aba PinkDagger só aparece para quem tem permissão de editar a ficha, com o Roll20 em português ou em inglês.

### Correções
- Botões de + e − (Medo, moedas, evasão e limiares) às vezes não salvavam o valor no Roll20.
- Redimensionar a ficha fixada continuava depois de soltar o botão do mouse.

## [0.3.0] - 2026-10-22

### Novidades
- Melhorias para o mestre, incluindo o importador de PNJs a partir do texto copiado do PDF.

## [0.2.0] - 2026-10-17

### Outros
- Código reorganizado em módulos (`src/`) e ícones da extensão adicionados.

## [0.1.0] - 2026-10-17

- Primeira versão: aba PinkDagger nas fichas de Daggerheart do Roll20.
