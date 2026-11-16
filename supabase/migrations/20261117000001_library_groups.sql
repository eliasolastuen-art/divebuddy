-- Bibliotek: område (Vatten/Land) → grupp → övning, bild på övning,
-- mallar per klubb. Se PLAN-bibliotek.md.

-- ── Bild på övning ─────────────────────────────────────────────────────────
alter table library_items add column if not exists image_path text;

-- ── Grupper ────────────────────────────────────────────────────────────────
update categories set name = trim(name) where name <> trim(name);

insert into categories (name, block_category, sort_order)
select v.name, 'land', 0 from (values ('Styrka'), ('Stretch'), ('Redskap')) v(name)
where not exists (select 1 from categories c where c.name = v.name and c.block_category = 'land');

update categories set block_category = 'land' where name in ('Längor', 'Lekar');

-- Ordning: vatten 100–Fall, därefter land Styrka, Längor, Stretch, Lekar, Redskap
update categories c set sort_order = o.ord
from (values ('100', 0), ('200', 1), ('300', 2), ('400', 3), ('Skruvar', 4), ('Armsving', 5), ('Fall', 6),
             ('Styrka', 10), ('Längor', 11), ('Stretch', 12), ('Lekar', 13), ('Redskap', 14)) o(name, ord)
where c.name = o.name;

-- ── Fördelning av övningar (PLAN-bibliotek.md avsnitt 3) ───────────────────
create temp table _cat as select id, name from categories;

update library_items set category_id = (select id from _cat where name = 'Fall')
where name = 'Fall bakåt i rak stil' and category_id = (select id from _cat where name = '100');

update library_items set archived = true
where name = 'hej 1' and category_id = (select id from _cat where name = '100');

update library_items set category_id = (select id from _cat where name = 'Lekar')
where category_id = (select id from _cat where name = 'Uppvärmning')
   or (category_id is null and name in ('springa', 'indian smyg', 'Elefantgång', 'Bygga tak'));

update library_items set category_id = (select id from _cat where name = 'Stretch')
where category_id is null and name in ('Sparka pik', 'Warmup - Stretch');

update library_items set category_id = (select id from _cat where name = 'Redskap')
where category_id is null and name = 'Dryland - Jump Training';

-- Tomma grupper som inte är övningsgrupper
delete from categories c
where c.name in ('Uppvärmning', 'stadsmtchen')
  and not exists (select 1 from library_items li where li.category_id = c.id);

drop table _cat;

-- ── Mallar per klubb (grupp valfri) ────────────────────────────────────────
alter table training_templates add column if not exists club_id uuid references clubs(id) on delete cascade;
alter table block_templates add column if not exists club_id uuid references clubs(id) on delete cascade;

update training_templates t set club_id = g.club_id from groups g where g.id = t.group_id and t.club_id is null;
update block_templates t set club_id = g.club_id from groups g where g.id = t.group_id and t.club_id is null;

alter table training_templates alter column club_id set default get_my_club_id();
alter table block_templates alter column club_id set default get_my_club_id();

drop policy "Club members can view templates" on training_templates;
drop policy "Coach and admin can manage templates" on training_templates;
create policy "Club members can view templates" on training_templates for select
  using (club_id = get_my_club_id());
create policy "Coach and admin can manage templates" on training_templates for all
  using (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')));

drop policy "Club members can view block templates" on block_templates;
drop policy "Coach and admin can manage block templates" on block_templates;
create policy "Club members can view block templates" on block_templates for select
  using (club_id = get_my_club_id());
create policy "Coach and admin can manage block templates" on block_templates for all
  using (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')))
  with check (club_id = get_my_club_id() and (has_role('coach') or has_role('admin')));

drop policy "Club members can view template blocks" on training_template_blocks;
drop policy "Coach and admin can manage template blocks" on training_template_blocks;
create policy "Club members can view template blocks" on training_template_blocks for select
  using (training_template_id in (select id from training_templates where club_id = get_my_club_id()));
create policy "Coach and admin can manage template blocks" on training_template_blocks for all
  using (training_template_id in (select id from training_templates where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')))
  with check (training_template_id in (select id from training_templates where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')));

drop policy "Club members can view template items" on training_template_items;
drop policy "Coach and admin can manage template items" on training_template_items;
create policy "Club members can view template items" on training_template_items for select
  using (block_id in (select b.id from training_template_blocks b
                      join training_templates t on t.id = b.training_template_id
                      where t.club_id = get_my_club_id()));
create policy "Coach and admin can manage template items" on training_template_items for all
  using (block_id in (select b.id from training_template_blocks b
                      join training_templates t on t.id = b.training_template_id
                      where t.club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')))
  with check (block_id in (select b.id from training_template_blocks b
                      join training_templates t on t.id = b.training_template_id
                      where t.club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')));

drop policy "Club members can view block template items" on block_template_items;
drop policy "Coach and admin can manage block template items" on block_template_items;
create policy "Club members can view block template items" on block_template_items for select
  using (template_id in (select id from block_templates where club_id = get_my_club_id()));
create policy "Coach and admin can manage block template items" on block_template_items for all
  using (template_id in (select id from block_templates where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')))
  with check (template_id in (select id from block_templates where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')));

-- ── Bildlagring ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', false)
on conflict (id) do nothing;

create policy "Exercise images: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
create policy "Exercise images: staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
create policy "Exercise images: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
create policy "Exercise images: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-images' and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
