cd ~/Proyectos/local-commerce-saas
cat << 'EOF' > supabase/seed.sql
WITH inserted_businesses AS (
    INSERT INTO businesses (owner_id, name, slug, category, phone_whatsapp, address, delivery_fee)
    VALUES 
        ('00000000-0000-0000-0000-000000000001', 'Droguería San José 24/7', 'drogueria-san-jose', 'Farmacia', '573001112233', 'Calle Principal #10-24, Centro', 3000),
        ('00000000-0000-0000-0000-000000000001', 'Burgers & Salchipapas El Parque', 'burgers-el-parque', 'Comida Rápida', '573004445566', 'Parque Principal Local 3', 4000)
    RETURNING id, slug
)
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
SELECT 
    b.id,
    d.day_num,
    CASE WHEN b.slug = 'drogueria-san-jose' THEN '07:00:00'::TIME ELSE '16:00:00'::TIME END,
    CASE WHEN b.slug = 'drogueria-san-jose' THEN '22:00:00'::TIME ELSE '23:30:00'::TIME END,
    FALSE
FROM inserted_businesses b
CROSS JOIN generate_series(0, 6) AS d(day_num);

INSERT INTO products (business_id, name, description, price, stock_quantity)
SELECT id, 'Acetaminofén 500mg (Caja x 10)', 'Analgésico y antipirético para dolor de cabeza y fiebre', 4500, 25
FROM businesses WHERE slug = 'drogueria-san-jose';

INSERT INTO products (business_id, name, description, price, stock_quantity)
SELECT id, 'Suero Oral Pedialyte 500ml', 'Hidratación rápida sabor manzana', 11000, 12
FROM businesses WHERE slug = 'drogueria-san-jose';

INSERT INTO products (business_id, name, description, price, stock_quantity)
SELECT id, 'Hamburguesa Artesanal Doble', 'Carne 100% res, queso cheddar, tocineta y papas a la francesa', 22000, 15
FROM businesses WHERE slug = 'burgers-el-parque';

INSERT INTO products (business_id, name, description, price, stock_quantity)
SELECT id, 'Salchipapa Especial para 2', 'Papa criolla, salchicha ranchera, pollo desmechado y salsa de la casa', 26000, 8
FROM businesses WHERE slug = 'burgers-el-parque';
EOF