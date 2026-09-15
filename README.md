# A Última Noite

Jogo de terror 3D em primeira pessoa para navegador. Você está em uma floresta isolada durante a noite. A segunda etapa adiciona exploração e coleta de cinco objetos, com inventário em memória. Ainda não há inimigo ou condição de vitória.

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

As caixas e os móveis são cenário. Os cinco objetos coletáveis são modelos próprios, com tons discretos e sem brilho artificial. Não existem monstro, perseguição, sustos, Game Over ou final de vitória.

## Exploração e coleta — etapa 2

Olhe diretamente para um objeto e aproxime-se a até **2,2 metros da câmera**. Quando ele estiver ao alcance e sem obstáculos entre você e ele, a mira ganha um contorno discreto e aparece **Pressione E para pegar**, junto do nome do item. Pressione E para removê-lo do cenário, registrá-lo no inventário e atualizar **OBJETOS ENCONTRADOS: 0/5 → 5/5**. Uma mensagem curta confirma cada coleta.

| Objeto | Localização | Função futura (ainda não ativa) |
| --- | --- | --- |
| Chave enferrujada | Mesa da sala na casa principal | Abrir uma área bloqueada |
| Bateria | Caixa do lado de fora, próximo ao galpão | Mecânica da lanterna |
| Rádio antigo | Sobre o caixote dentro da casa na árvore | Reproduzir uma mensagem |
| Amuleto estranho | Pequeno suporte de pedra no recanto da floresta, além da trilha atrás do galpão | Evento sobrenatural |
| Mapa antigo | Mesa no cômodo dos fundos da casa principal | Revelar a saída |

Não é possível coletar de longe, olhando para outra direção, através de paredes, enquanto o jogo está pausado ou repetindo a tecla segurada. Cada objeto só pode ser coletado uma vez. Chegar a **5/5 não encerra a partida**: você continua explorando.

O inventário oferece `add(id)`, `has(id)`, `get(id)`, `list()`, `count` e `total`, com metadados separados dos modelos 3D. Isso prepara descrições, interface e ações futuras sem implementá-las agora. Não há tecla para abrir uma tela de inventário nesta etapa. Os itens persistem durante pausa/retomada, mas reiniciam ao recarregar a página.

## Build de produção

```bash
npm run build
npm run preview
```

O build gera `dist/`. Abra o endereço exibido pelo preview (normalmente `http://127.0.0.1:4173`). O preview serve apenas para teste local, não como servidor público de produção. O projeto usa `base: './'` no Vite: os assets ficam relativos ao HTML e funcionam em `/a-ultima-noite/`, sem backend. Three.js é empacotado junto com o jogo.

## Publicação automática no GitHub Pages

**Endereço previsto após a primeira publicação bem-sucedida:**
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

## Decisões e limites da base

- HTML, CSS, JavaScript ES Modules e Three.js; Vite serve e empacota os arquivos.
- Colisão simples: cilindro vertical do jogador contra caixas/cilindros estáticos, com filtragem por altura e pequenos passos para evitar atravessar paredes. Não é uma simulação física completa.
- Árvores e vegetação usam instâncias para reduzir chamadas de desenho.
- Mundo e alterações se reiniciam ao recarregar; não há salvamento de progresso.
- Não há pulo, agachamento, controles de toque ou carregamento de modelos externos nesta versão.
- API de diagnóstico somente no desenvolvimento: `window.__gameDebug()` retorna uma cópia do estado, sem permitir alterar o jogador. Não é incluída no build de produção.
- Se o mouse for bloqueado em um iframe, abra o jogo em uma aba própria. Se WebGL falhar, habilite aceleração de hardware. Se perder o contexto gráfico, recarregue.

O código foi separado para que os sistemas futuros possam ser adicionados sem reescrever controles, mundo e atmosfera.
