create policy "Authenticated users can view active products"
on public.products
for select
to authenticated
using (status = 'actif');

create policy "Authenticated users can view active categories"
on public.categories
for select
to authenticated
using (status = 'actif');
