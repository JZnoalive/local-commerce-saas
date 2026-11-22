create or replace function public.decrement_stock_batch(p_items jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
  v_prod_id uuid;
  v_qty int;
  v_current_stock int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Items inválidos para descontar inventario';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_prod_id := (item->>'id')::uuid;
    v_qty := greatest(0, coalesce((item->>'qty')::int, 0));

    if v_qty <= 0 then
      continue;
    end if;

    select stock_quantity into v_current_stock
    from public.products
    where id = v_prod_id
    for update;

    if not found then
      raise exception 'Producto no encontrado: %', v_prod_id;
    end if;

    if v_current_stock < v_qty then
      raise exception 'Stock insuficiente para el producto % (disponible: %, pedido: %)',
        v_prod_id, v_current_stock, v_qty;
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_prod_id;
  end loop;
end;
$$;

create or replace function public.restore_stock_batch(p_items jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
  v_prod_id uuid;
  v_qty int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return;
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_prod_id := (item->>'id')::uuid;
    v_qty := greatest(0, coalesce((item->>'qty')::int, 0));

    if v_qty <= 0 then
      continue;
    end if;

    update public.products
    set stock_quantity = coalesce(stock_quantity, 0) + v_qty
    where id = v_prod_id;
  end loop;
end;
$$;
