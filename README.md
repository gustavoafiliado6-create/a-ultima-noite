# A Última Noite

Primeira versão explorável de um jogo de terror 3D em primeira pessoa para navegador. Você está em uma floresta isolada durante a noite. Explore livremente: nesta etapa não há inimigo, coleta, inventário ou condição de vitória.

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

As caixas e os móveis são apenas cenário: **não são os cinco objetos de uma futura fase**. Não existem monstro, perseguição, inventário nem final de vitória.

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

**Validação desta entrega:** os 11 testes automatizados e a compilação de produção passaram. A lanterna também tem teste de alternância, vínculo à câmera e qualidade das sombras. A inspeção visual/interativa no navegador automatizado não pôde ser concluída, pois esse ambiente bloqueou o acesso ao servidor local (`ERR_BLOCKED_BY_CLIENT`). Portanto, desempenho real da GPU, aparência final, captura do mouse e áudio devem ser confirmados no navegador do jogador; o build não substitui esse teste.

### Checklist manual

1. Abrir o jogo e entrar; confirmar que o mouse controla a visão e não sai da janela.
2. Andar/correr e verificar que paredes, troncos e móveis impedem passagem.
3. Entrar na casa pela porta central e alcançar os cômodos dos fundos.
4. Ir pela trilha esquerda até o galpão e entrar.
5. Ir pela trilha direita, subir a escada da casa na árvore, entrar e descer.
6. Usar F duas vezes: o feixe e o indicador devem apagar e acender.
7. Pressionar Esc, retomar e trocar de aba: não deve haver movimento involuntário.
8. Testar som desligado e qualidade Leve.

## Decisões e limites da base

- HTML, CSS, JavaScript ES Modules e Three.js; Vite serve e empacota os arquivos.
- Colisão simples: cilindro vertical do jogador contra caixas/cilindros estáticos, com filtragem por altura e pequenos passos para evitar atravessar paredes. Não é uma simulação física completa.
- Árvores e vegetação usam instâncias para reduzir chamadas de desenho.
- Mundo e alterações se reiniciam ao recarregar; não há salvamento de progresso.
- Não há pulo, agachamento, controles de toque ou carregamento de modelos externos nesta versão.
- API de diagnóstico somente no desenvolvimento: `window.__gameDebug()` retorna uma cópia do estado, sem permitir alterar o jogador. Não é incluída no build de produção.
- Se o mouse for bloqueado em um iframe, abra o jogo em uma aba própria. Se WebGL falhar, habilite aceleração de hardware. Se perder o contexto gráfico, recarregue.

O código foi separado para que os sistemas futuros possam ser adicionados sem reescrever controles, mundo e atmosfera.
