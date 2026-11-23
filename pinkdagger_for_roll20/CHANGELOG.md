# Changelog

Todas as mudanças relevantes do **PinkDagger for Roll20** ficam registradas aqui, da versão mais nova para a mais antiga.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/). As seções de cada versão são: **Novidades**, **Melhorias**, **Correções** e **Outros**.

## [0.6.0] - não lançada

### Novidades
- **Calculadora de Combate:** clique com o botão direito no ícone da extensão para planejar encontros com os Pontos de Batalha do livro.
- **Atualização com um clique (Windows):** clique com o botão direito no ícone da extensão > **Verificar atualizações**. A janela mostra a versão instalada, a mais recente e as novidades. Com o auxiliar instalado (`updater\instalar.bat`, uma vez só), o botão **Atualizar agora** baixa a última release do GitHub, substitui os arquivos e recarrega a extensão; depois é só dar F5 no Roll20.
- **GM Roll:** novo botão **GM Roll** ao lado da ⚙️ na ficha. Ligado (em rosa), todas as rolagens feitas pela aba PinkDagger daquela ficha vão fechadas só para o mestre, como um `/w gm`, falando como o personagem. Fica salvo por ficha, no seu navegador, e não afeta outras pessoas que usam a mesma ficha. Fichas em pop-out sem a janela do Roll20 aberta não mostram o botão.

### Correções
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
