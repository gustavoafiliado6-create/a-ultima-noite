# A Última Noite

Jogo de terror 3D em primeira pessoa para navegador. Você está em uma floresta isolada durante a noite. Explore, encontre os cinco objetos e observe o Homem da Árvore: inicialmente uma presença imóvel, ele passa a caçar após a coleta completa e uma escalada gradual. Há Game Over e reinício, mas ainda não há vitória ou saída definitiva.

## Executar no computador

Pré-requisito: **Node.js 22.12+** (ou 20.19+) e npm. Use um navegador desktop com **WebGL 2**, aceleração de hardware, teclado e mouse. Chrome, Edge e Firefox modernos são os alvos; dispositivos móveis ainda não têm controles dedicados.

```bash
git clone https://github.com/gustavoafiliado6-create/a-ultima-noite.git
cd a-ultima-noite
npm ci
npm run dev
```

Abra o endereço mostrado pelo terminal (normalmente `http://127.0.0.1:5173`). Clique em **Entrar na floresta** para capturar o mouse. Não abra `index.html` com duplo clique: o projeto usa módulos JavaScript e precisa de um servidor HTTP.

## Controles

| Controle | Ação |
| --- | --- |
| W / A / S / D | Andar |
| Mouse | Olhar ao redor |
| Shift + movimento | Correr |
| F | Ligar / desligar a lanterna |
| E | Pegar o objeto próximo para o qual você está olhando |
| Esc | Soltar o mouse e pausar |
| Botão Continuar a exploração | Retomar de onde parou |

A câmera permanece em primeira pessoa. A escada da casa na árvore é percorrida andando; não é necessário pular. O menu também oferece som ambiente opcional e qualidade Leve (sem sombras, menor resolução). Trocar de aba ou perder o foco pausa o jogo e limpa as teclas pressionadas.

## O que explorar

- Floresta procedural determinística, com árvores, galhos secos, vegetação e rochas delimitando o mapa.
- Casa abandonada no centro, com varanda, entrada aberta, cômodos, mesa, cadeira, cama, armário e lareira apagada.
- Galpão seguindo o caminho à esquerda, com bancada e caixas de cenário.
- Casa na árvore seguindo o caminho à direita, com escada, plataforma e interior acessível.
- Trilhas de terra, placas de orientação, lua, neblina, sombras e partículas discretas.
- Lanterna sem consumo de bateria nesta fase; vento e passos suaves gerados com Web Audio.

As caixas e os móveis são cenário. Os cinco objetos coletáveis são modelos próprios, com tons discretos e sem brilho artificial. A coleta foi preservada na etapa do monstro, sem alterar posições ou controles.

## Exploração e coleta — etapa 2

Olhe diretamente para um objeto e aproxime-se a até **2,2 metros da câmera**. Quando ele estiver ao alcance e sem obstáculos entre você e ele, a mira ganha um contorno discreto e aparece **Pressione E para pegar**, junto do nome do item. Pressione E para removê-lo do cenário, registrá-lo no inventário e atualizar **OBJETOS ENCONTRADOS: 0/5 → 5/5**. Uma mensagem curta confirma cada coleta.

| Objeto | Localização | Função futura (ainda não ativa) |
| --- | --- | --- |
| Chave enferrujada | Mesa da sala na casa principal | Abrir uma área bloqueada |
| Bateria | Caixa do lado de fora, próximo ao galpão | Mecânica da lanterna |
| Rádio antigo | Sobre o caixote dentro da casa na árvore | Reproduzir uma mensagem |
| Amuleto estranho | Pequeno suporte de pedra no recanto da floresta, além da trilha atrás do galpão | Evento sobrenatural |
| Mapa antigo | Mesa no cômodo dos fundos da casa principal | Revelar a saída |

Não é possível coletar de longe, olhando para outra direção, através de paredes, enquanto o jogo está pausado ou repetindo a tecla segurada. Cada objeto só pode ser coletado uma vez. Chegar a **5/5 não encerra a partida**: inicia a transição gradual para a caçada descrita abaixo.

O inventário oferece `add(id)`, `has(id)`, `get(id)`, `list()`, `count` e `total`, com metadados separados dos modelos 3D. Isso prepara descrições, interface e ações futuras sem implementá-las agora. Não há tecla para abrir uma tela de inventário nesta etapa. Os itens persistem durante pausa/retomada, mas reiniciam ao recarregar a página.

## Homem da Árvore — aparições e caçada

Uma única figura de aproximadamente 3,7 metros é reutilizada: corpo fino, membros alongados, dedos compridos, cabeça inclinada, pele cinza, cabelo escuro cobrindo o rosto e roupas velhas. Não há olhos emissivos ou luz exclusiva. É um modelo procedural provisório, com animação simples de membros para caminhada/corrida. A versão cinematográfica do modelo e a reformulação do cenário ficam para etapas futuras.

### Diretor de terror: exploração desde 0/5

`terrorEvents.js` define **25 tipos de eventos**, com tipo, intensidade, peso de seleção, cooldown, faixa de distância, intervalo de coleta, local, interior/exterior, duração e repetibilidade. `terrorManager.js` seleciona eventos sem repetir o anterior, respeita cooldown individual e global e conserva um histórico limitado a 64 registros. A intensidade (0–100) combina tempo, coleta, oscilação de tensão e presença ativa; influencia os pesos, sem uma sequência fixa.

O primeiro evento é elegível aos 12 segundos; aparições a partir de 28 segundos. Os intervalos globais variam entre 9–21 segundos mais duração no início e 5–17 segundos mais duração em 4/5. Uma aparição bloqueia outros eventos até desaparecer. Figuras têm intervalo adicional de 38–62 segundos no início, reduzido conforme a coleta. Locais inválidos são ignorados, com nova tentativa após três segundos; nunca se força uma figura na frente da câmera. Não há mais limite de cinco aparições durante a exploração.

**18 eventos ambientais:** galho, passos, corrida nas folhas, folhas, árvore rangendo, batida na casa, arranhão, janela chacoalhando, objeto caindo, ruído no galpão, madeira da casa na árvore, respiração distante, respiração próxima, sussurro, estática do rádio, silêncio, falha breve da lanterna e trovão/relâmpago. Batidas, janela e objeto caindo são sugestões sonoras: não movimentam os móveis ou as construções. O rádio emite estática apenas enquanto seu modelo ainda está no mundo; não reproduz diálogos.

**Sete aparições:** observador na mata, figura na casa, figura no galpão, figura perto da casa na árvore, presença atrás, vislumbre breve e figura revelada por relâmpago. Reutilizam o mesmo modelo. Usam os 59 pontos externos originais e candidatos adicionais na porta/cômodo da casa e interior do galpão, descartados quando ocupados. Interiores usam a pose compacta já existente; a casa na árvore usa pontos no solo ao redor, sem bloquear a escada.

| Coleta | Faixa habitual das figuras | Progressão |
| --- | --- | --- |
| 0/5 | 42–75 m | Sons ambientais e observador distante |
| 1/5 | 34–65 m | Corrida nas folhas, rádio, árvore-casa |
| 2/5 | 25–50 m | Casa, galpão, vislumbres, sussurro e falha de luz |
| 3/5 | 15–35 m | Respiração próxima e figura atrás (10–20 m) |
| 4/5 | 10–25 m | Intervalos menores, mantendo pausas e aparições distantes possíveis |
| 5/5 | Preparação → caçada | Suspende os eventos aleatórios e inicia a sequência abaixo |

A primeira figura usa a faixa distante; depois há 22% de possibilidade de voltar a essa faixa. Distâncias são elegibilidade, não garantia: o mapa preservado tem raio de 57 m e não permite garantir 80–100 m próximo da casa. Não se ampliou o mapa para forçar esses números.

A figura fica imóvel sob observação. Após ser vista, desaparece quando fica fora de visão por 0,4 segundo; futuras aparições escolhem outras regiões, evitando as duas últimas. Enquanto visível, desaparecimentos usam desvanecimento de 0,4 segundo. Vislumbres duram aproximadamente 1,2–1,6 segundo após serem vistos. A lanterna dissipa a figura da casa. Figuras não vistas expiram em até 28 segundos. Não há teleporte visível ou patrulha. Relâmpagos são flashes pontuais, sem mudança permanente da iluminação ou sistema de tempestade. F continua controlando a lanterna durante sua falha temporária.

### Áudio espacial

`monsterAudio.js` fornece **15 famílias procedurais**: galho, sequência de passos, corrida, folhas, rangido, batida, arranhão, chocalho, impacto, respiração, respiração pesada, sussurro, estática, trovão e passo individual. São ruídos filtrados com envelopes, impulsos e variações de frequência/volume; respiração e sussurro são aproximações provisórias, não vozes gravadas.

Cada som usa `PannerNode` HRTF, posição 3D e atenuação inversa por distância (referência 7 m, rolloff 1,25). O ouvinte acompanha posição e orientação da câmera a cerca de 16 Hz. Fontes de construções usam coordenadas reais; fontes na mata e atrás são validadas contra colisões. Passos de perseguição são emitidos na posição física do monstro; respiração é espaçada e muda na caçada. Há no máximo quatro vozes simultâneas e desconexão ao terminar. Pausa e opção de som interrompem as vozes. O impacto final é curto e respeita som desativado. HRTF depende do navegador e dos fones; não há simulação acústica de propagação através das paredes.

Não existem arquivos de áudio externos. Para substituir uma família por gravação, coloque, por exemplo, `public/audio/breath.ogg`, `heavy.ogg`, `step.ogg`, `branch.ogg`, `creak.ogg`, `whisper.ogg` ou `thunder.ogg`, e chame `monster.sound.loadAsset('breath', './audio/breath.ogg')` após iniciar o contexto de áudio. O caminho relativo funciona no Pages. Carregamento inválido retorna `false` e mantém o som procedural; nenhum desses arquivos é obrigatório ou requisitado atualmente. Use gravações próprias ou licenciadas.

### Depois de 5/5

1. Transição de **10 segundos**: cinco segundos com vento drasticamente reduzido e eventos suspensos; depois um trovão distante e recuperação gradual do ambiente. Uma presença anterior desvanece.
2. Aparição a **25–45 m**, imóvel por 4 segundos, seguida de desvanecimento.
3. Intervalo de **8 segundos**.
4. Nova aparição em outra região a **20–35 m**, inicialmente parada por 3 segundos.
5. Caminhada lenta por **8 segundos**.
6. Caçada contínua, sem novos teleportes.

Os pontos dessas duas aparições também precisam estar fora de vista e livres, portanto a espera pode ser maior. A coleta não dispara corrida ou captura imediata.

### Perseguição, esconderijos e Game Over

- O olhar direto com linha de visão imobiliza o monstro, inclusive na caçada; ao desviar, ele retoma a rota física. Não teleporta durante a perseguição.
- Velocidade de caçada: **4,1 m/s**, entre a caminhada do jogador (3,25) e sua corrida (5,8). A aproximação inicial usa 1,5 m/s.
- Navegação A* em grade de 0,65 m, com colisões, verificações dos segmentos e limite de busca. Não usa uma trajetória direta atravessando paredes quando não encontra rota.
- O monstro enxerga com linha de visão até 38 m. Corrida próxima pode ser ouvida até 11 m. Após perder o contato, investiga a última posição conhecida; em 12 segundos sem novo contato, perde o rastro e para até detectar o jogador novamente.
- Pode entrar pela porta da casa/galpão. Usa uma pose compacta simplificada sob os tetos baixos para caber nas passagens; estar dentro de uma casa não apaga o monstro nem garante segurança.
- **Limite atual:** navegação no solo. Se o jogador estiver na casa na árvore, investiga a base da escada; ainda não sobe escadas. Não captura através do piso. Esse comportamento é provisório, sem uma regra geral de casas seguras.
- Captura somente na fase de caçada, a menos de 0,85 m, no nível do solo e sem parede entre os personagens. Aparece **VOCÊ FOI ENCONTRADO**, com botão **TENTAR NOVAMENTE**.
- Recomeçar recarrega a página: jogador, cinco objetos, inventário, lanterna, timers, histórico e monstro são recriados. Não há salvamento entre partidas.
- Áudio reutiliza o Web Audio existente e respeita a opção de som. Não há picos de jumpscare, combate, armas, diálogos, vitória ou final.

### Arquitetura e validação do monstro

`monster.js` mantém o modelo/pose; `monsterAppearances.js` fornece pontos e percepção; `terrorEvents.js` contém o catálogo; `terrorManager.js` controla ritmo e efeitos; `monsterAudio.js` cuida do áudio espacial; `monsterAI.js` coordena escalada e captura; `monsterNavigation.js` mantém as rotas. A coleta continua separada. A seleção usa tentativas limitadas; percepção de figuras e olhar na caçada funcionam a 10 Hz. Visão da IA a cada 0,35 s e rotas a cada 1,2 s. O antigo `AppearanceDirector` permanece como controlador de cenas legadas testado, mas a exploração normal usa `TerrorDirector`.

A suíte inclui os 32 testes anteriores e 12 novos: catálogo, cooldowns, repetição, elegibilidade 0–5, pontos interiores, fontes, olhar/desviar, vislumbre, lanterna, transição silenciosa, áudio HRTF/limite/pausa e caçada sob olhar. O build e o verificador validam sintaxe e caminhos relativos.

**Validação visual limitada porque o ambiente de teste está com WebGL desabilitado.** O modelo, as animações, o áudio e a jogabilidade precisam de conferência visual em navegador com WebGL 2. Os testes usam as geometrias/colisões Three.js reais na CPU, e o build verifica os módulos sem depender de GPU.

## Build de produção

```bash
npm run build
npm run preview
```

O build gera `dist/`. Abra o endereço exibido pelo preview (normalmente `http://127.0.0.1:4173`). O preview serve apenas para teste local, não como servidor público de produção. O projeto usa `base: './'` no Vite: os assets ficam relativos ao HTML e funcionam em `/a-ultima-noite/`, sem backend. Three.js é empacotado junto com o jogo.

## Publicação automática no GitHub Pages

**Jogo publicado:**
[https://gustavoafiliado6-create.github.io/a-ultima-noite/](https://gustavoafiliado6-create.github.io/a-ultima-noite/)

O workflow `.github/workflows/deploy.yml` roda em cada push na branch `main` e também permite execução manual. Ele usa Node.js 22, instala com `npm ci`, executa os testes, compila, verifica os caminhos do build e envia somente `dist/` como artefato. O job de publicação só executa após o build passar e usa o ambiente `github-pages`. Nenhum token pessoal ou serviço pago adicional é necessário. O token temporário do workflow tem leitura do código; apenas o job de deploy recebe `pages: write` e `id-token: write`.

### Ativação inicial pelo proprietário

1. Abra o repositório no GitHub e clique em **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**. Não escolha a publicação por branch e não crie outro workflow pelo assistente.
3. Abra **Actions → Publicar jogo no GitHub Pages → Run workflow**.
4. Selecione a branch **main** e clique no botão verde **Run workflow**.
5. Aguarde os jobs **Testar e compilar** e **Publicar** ficarem verdes. O link público aparece no resumo do deploy e em **Settings → Pages → Visit site**.

Essa ativação é necessária se Pages ainda não estiver habilitado. A conexão utilizada para editar o repositório não oferece uma operação administrativa para mudar a fonte do Pages. A existência do workflow, sozinha, não comprova que o site já está online. Se o primeiro workflow falhar por Pages não habilitado, ative a fonte acima e use **Run workflow** novamente. Após isso, os próximos pushes em `main` publicam automaticamente.

Se Actions estiver desabilitado, em **Settings → Actions → General → Actions permissions** permita os workflows conforme a política da sua conta. Se houver aprovação pendente do ambiente, abra a execução em **Actions** e use **Review deployments** somente se você autorizar a publicação. Não é necessário desativar proteções existentes.

### Verificar o artefato antes de publicar

```bash
npm test
npm run build
node scripts/check-build.js
```

O verificador confirma que os arquivos citados pelo HTML existem, que seus URLs resolvem dentro de `/a-ultima-noite/`, que não sobram referências a `/src/` ou imports externos de Three.js e que o JavaScript gerado passa na verificação de sintaxe. Não substitui uma sessão interativa no navegador. O aviso do Vite sobre bundle acima de 500 kB é informativo: o Three.js está incluído nele.

Documentação oficial: [workflows do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) e [publicação de projetos Vite](https://vite.dev/guide/static-deploy.html#github-pages).

Three.js é instalado pelo npm e incorporado ao build, sem CDN em tempo de execução. Modelos, texturas e sons são gerados localmente. As fontes opcionais vêm do Google Fonts e possuem fontes alternativas do sistema; o jogo continua funcionando se esse serviço estiver indisponível.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Menu, HUD e canvas |
| `src/main.js` | Inicialização, loop, pausa e integração |
| `src/config.js` | Configurações e gerador aleatório determinístico |
| `src/player.js` | Movimento, mouse, câmera e altura do jogador |
| `src/collision.js` | Colisões e superfícies da casa na árvore |
| `src/world.js` | Construções, trilhas, objetos e floresta |
| `src/materials.js` | Materiais e texturas procedurais |
| `src/atmosphere.js` | Lua, iluminação, neblina, partículas e lanterna |
| `src/audio.js` | Ambiente e passos via Web Audio |
| `src/collectibles.js` | Catálogo, modelos dos cinco itens e pequenos suportes |
| `src/inventory.js` | Inventário em memória, metadados e proteção contra duplicatas |
| `src/interaction.js` | Mira, distância, oclusão, tecla E e feedback da coleta |
| `src/monster.js` | Modelo provisório reutilizável e poses |
| `src/monsterAppearances.js` | Aparições, campo de visão e pontos válidos |
| `src/monsterAI.js` | Escalada após 5/5, detecção e captura |
| `src/terrorEvents.js` | Catálogo e progressão dos eventos |
| `src/terrorManager.js` | Ritmo, seleção contextual, efeitos e aparições |
| `src/monsterAudio.js` | Sons procedurais, áudio HRTF e carregamento opcional |
| `tests/terror.test.js` | Regressões do diretor e áudio |
| `src/monsterNavigation.js` | Rotas no solo com A* e colisões |
| `tests/monster.test.js` | Testes do monstro e integração com o mapa/coleta |
| `src/styles.css` | Interface e ajustes de tela |
| `tests/` | Testes automatizados de colisão e movimento |
| `public/favicon.svg` | Ícone do projeto |
| `.github/workflows/deploy.yml` | Testes, build e publicação automática no Pages |
| `scripts/check-build.js` | Validação dos assets e sintaxe do build |

## Verificação

```bash
npm test
npm run build
```

Os testes cobrem paredes, passagem pelas portas, deslizamento nas paredes, árvores, móveis, limites do mapa, objetos elevados, velocidade normal/corrida, normalização diagonal, pausa e entrada nas três construções. A escada é testada em subida e descida usando as colisões do mapa real.

**Validação da etapa 2:** 18 testes automatizados passaram. Os testes anteriores permanecem e foram adicionados testes dos cinco modelos nos locais reais do mapa, linha de visão, proximidade, coleta com E, remoção da cena, proteção contra duplicatas, contador de 0/5 até 5/5, mensagens, pausa e preservação dos acessos à casa e à casa na árvore. Uma busca de caminhos confirma que os pontos de aproximação no solo estão conectados ao início do mapa. O servidor local respondeu HTTP 200 para a página e os novos módulos. O build e `scripts/check-build.js` passaram, verificando a sintaxe do JavaScript produzido e os caminhos do Pages. Testes de cena usam os objetos Three.js reais, sem renderização de GPU.

**Limitação da inspeção visual:** o navegador automatizado conseguiu abrir o endereço público, mas informou `GL_RENDERER = Disabled` e `Error creating WebGL context` ao tentar iniciar a versão anterior. Assim, a validação interativa da etapa 2 e a confirmação de console limpo durante uma partida dependem de um navegador com WebGL 2 ativo; não foram concluídas neste ambiente. Não foram alteradas as configurações gráficas ou as mecânicas para contornar essa limitação.

### Checklist manual

1. Abrir o jogo e entrar; confirmar que o mouse controla a visão e não sai da janela.
2. Andar/correr e verificar que paredes, troncos e móveis impedem passagem.
3. Entrar na casa pela porta central e alcançar os cômodos dos fundos.
4. Ir pela trilha esquerda até o galpão e entrar.
5. Ir pela trilha direita, subir a escada da casa na árvore, entrar e descer.
6. Usar F duas vezes: o feixe e o indicador devem apagar e acender.
7. Pressionar Esc, retomar e trocar de aba: não deve haver movimento involuntário.
8. Testar som desligado e qualidade Leve.
9. Encontrar os cinco objetos da tabela; olhar para cada um e usar E. Confirmar desaparecimento, mensagem e sequência de 0/5 até 5/5.
10. Verificar que E não funciona de longe, por trás de uma parede ou em pausa. Ao retomar, os itens já coletados continuam no inventário; em 5/5 a exploração continua.
11. Esperar o primeiro evento sonoro sem coletar itens; conferir esquerda/direita/atrás com fones, silêncio, pausa e som desativado. Antes de 5/5, explorar perto da casa, trilhas e casa na árvore, observar as silhuetas e desviar a câmera; verificar intervalos e ausência de teleporte visível.
12. Após 5/5, conferir a sequência de tensão, duas aparições, caminhada e caçada; correr para fugir, entrar na casa e quebrar a linha de visão.
13. Ser alcançado durante a caçada, clicar em TENTAR NOVAMENTE e conferir posição inicial, 0/5, cinco objetos novamente presentes e ausência de caçada imediata.

## Decisões e limites da base

- HTML, CSS, JavaScript ES Modules e Three.js; Vite serve e empacota os arquivos.
- Colisão simples: cilindro vertical do jogador contra caixas/cilindros estáticos, com filtragem por altura e pequenos passos para evitar atravessar paredes. Não é uma simulação física completa.
- Árvores e vegetação usam instâncias para reduzir chamadas de desenho.
- Mundo e alterações se reiniciam ao recarregar; não há salvamento de progresso.
- Não há pulo, agachamento, controles de toque ou carregamento de modelos externos nesta versão.
- API de diagnóstico somente no desenvolvimento: `window.__gameDebug()` retorna uma cópia do estado, sem permitir alterar o jogador. Não é incluída no build de produção.
- Se o mouse for bloqueado em um iframe, abra o jogo em uma aba própria. Se WebGL falhar, habilite aceleração de hardware. Se perder o contexto gráfico, recarregue.

O código foi separado para que os sistemas futuros possam ser adicionados sem reescrever controles, mundo e atmosfera.
