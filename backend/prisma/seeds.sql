-- Seed de dados iniciais para testes (Proxi)

-- Criar usuários
INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo, foto_url)
VALUES
  ('João Silva', 'joao@example.com', 'hash123', '11999990001', 'CLIENTE', null),
  ('Maria Oliveira', 'maria@example.com', 'hash456', '11999990002', 'PRESTADOR', null),
  ('Admin Master', 'admin@example.com', 'adminhash', '11999990003', 'ADMIN', null);

-- Prestador vinculado à Maria
INSERT INTO prestadores (id, bio, nota_media, qtd_avaliacoes, verificado)
VALUES ((SELECT id FROM usuarios WHERE email='maria@example.com'), 'Chaveiro com 10 anos de experiência', 4.8, 20, true);

-- Serviços ofertados pelo prestador
INSERT INTO servicos (prestador_id, titulo, descricao, categoria, preco_base, status)
VALUES
  ((SELECT id FROM prestadores WHERE id=(SELECT id FROM usuarios WHERE email='maria@example.com')),
   'Troca de fechadura', 'Serviço de troca de fechadura residencial ou comercial.', 'Chaveiro', 150.00, 'ATIVO'),
  ((SELECT id FROM prestadores WHERE id=(SELECT id FROM usuarios WHERE email='maria@example.com')),
   'Abertura de portas', 'Abertura de portas trancadas sem danos.', 'Chaveiro', 120.00, 'ATIVO');

-- Endereço do cliente João
INSERT INTO addresses (user_id, label, street, number, neighborhood, city, state, cep, location, is_default)
VALUES
  ((SELECT id FROM usuarios WHERE email='joao@example.com'), 'Casa',
   'Rua das Flores', '123', 'Jardim Brasil', 'São Paulo', 'SP', '01001-000',
   ST_GeogFromText('SRID=4326;POINT(-46.633309 -23.550520)'), true);

-- Endereço do prestador Maria
INSERT INTO addresses (user_id, label, street, number, neighborhood, city, state, cep, location, is_default)
VALUES
  ((SELECT id FROM usuarios WHERE email='maria@example.com'), 'Oficina',
   'Av. Central', '456', 'Centro', 'São Paulo', 'SP', '01002-000',
   ST_GeogFromText('SRID=4326;POINT(-46.640000 -23.545000)'), true);

-- Pedido feito pelo cliente João para o serviço "Troca de fechadura"
INSERT INTO pedidos (cliente_id, servico_id, status, preco_final)
VALUES
  ((SELECT id FROM usuarios WHERE email='joao@example.com'),
   (SELECT id FROM servicos WHERE titulo='Troca de fechadura'),
   'PENDENTE', 150.00);

-- Snapshot de endereço do pedido
INSERT INTO order_addresses (order_id, street, number, neighborhood, city, state, cep, location)
VALUES
  ((SELECT id FROM pedidos LIMIT 1), 'Rua das Flores', '123', 'Jardim Brasil', 'São Paulo', 'SP', '01001-000',
   ST_GeogFromText('SRID=4326;POINT(-46.633309 -23.550520)'));

-- Pagamento do pedido (pendente)
INSERT INTO pagamentos (pedido_id, metodo, status, valor)
VALUES
  ((SELECT id FROM pedidos LIMIT 1), 'PIX', 'PENDENTE', 150.00);
