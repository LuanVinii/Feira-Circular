-- Insere categorias e alimentos de referência para habilitar novas publicações.

insert into public.categories (name, active)
values ('Frutas', true), ('Verduras', true), ('Legumes', true), ('Grãos e cereais', true)
on conflict (name) do nothing;

insert into public.foods (name, category_id, active)
select seed.food_name, c.id, true
from (values
  ('Frutas', 'Abacate'), ('Frutas', 'Abacaxi'), ('Frutas', 'Banana'), ('Frutas', 'Laranja'),
  ('Frutas', 'Limão'), ('Frutas', 'Maçã'), ('Frutas', 'Mamão'), ('Frutas', 'Manga'),
  ('Frutas', 'Melancia'), ('Frutas', 'Uva'),
  ('Verduras', 'Alface'), ('Verduras', 'Couve'), ('Verduras', 'Espinafre'), ('Verduras', 'Repolho'),
  ('Legumes', 'Abóbora'), ('Legumes', 'Batata'), ('Legumes', 'Beterraba'), ('Legumes', 'Cebola'),
  ('Legumes', 'Cenoura'), ('Legumes', 'Chuchu'), ('Legumes', 'Pimentão'), ('Legumes', 'Tomate'),
  ('Grãos e cereais', 'Arroz'), ('Grãos e cereais', 'Aveia'), ('Grãos e cereais', 'Feijão'), ('Grãos e cereais', 'Milho')
) as seed(category_name, food_name)
join public.categories c on c.name = seed.category_name
on conflict (category_id, name) do nothing;
